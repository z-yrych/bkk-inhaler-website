// pages/api/webhooks/paymongo.ts
import { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
// Writable might not be explicitly needed if getRawBody is self-contained with Buffer usage
// import { Writable } from 'stream';
import dbConnect from "@/lib/dbConnect";
import Order, { IOrder } from "@/lib/models/Order"; // Assuming OrderStatusEnum is part of IOrder or Order model, or import separately
import Product from "@/lib/models/Product";
import { sendOrderConfirmationEmail } from "@/lib/utils/emailSender";
// import { sendOrderConfirmationEmail } from '@/lib/utils/emailSender'; // Future implementation

const PAYMONGO_WEBHOOK_SECRET_KEY = process.env.PAYMONGO_WEBHOOK_SECRET_KEY;

// Configuration to disable Next.js's default body parser for this route
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to read the raw body from the request stream
async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", (err) => reject(err as Error)); // Cast err to Error
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ message: `Method ${req.method} Not Allowed` });
  }

  if (!PAYMONGO_WEBHOOK_SECRET_KEY) {
    console.error("CRITICAL: PayMongo Webhook Secret Key not configured.");
    // This is a server misconfiguration. Don't send 200 to PayMongo for this.
    return res
      .status(500)
      .json({ message: "Webhook secret key misconfiguration on server." });
  }

  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req);
  } catch (error) {
    console.error("Error getting raw body for webhook:", error);
    return res.status(500).json({ message: "Error processing request body." });
  }

  // Verify PayMongo Signature
  const signatureHeader = req.headers["paymongo-signature"] as string;
  if (!signatureHeader) {
    console.warn("Webhook received without Paymongo-Signature header.");
    return res.status(400).json({ message: "Missing signature." });
  }

  try {
    const parts = signatureHeader.split(",");
    const timestampPart = parts.find((part) => part.startsWith("t="));
    const signaturePart = parts.find(
      (part) =>
        part.startsWith("s=") ||
        part.startsWith("v1=") ||
        part.startsWith("te=")
    );

    if (!timestampPart || !signaturePart) {
      console.warn("Malformed Paymongo-Signature header:", signatureHeader);
      return res.status(400).json({ message: "Malformed signature header." });
    }

    const timestamp = timestampPart.substring(2);
    const providedSignature = signaturePart.substring(
      signaturePart.indexOf("=") + 1
    );

    const signedPayload = `${timestamp}.${rawBody.toString("utf-8")}`;
    const expectedSignature = crypto
      .createHmac("sha256", PAYMONGO_WEBHOOK_SECRET_KEY)
      .update(signedPayload)
      .digest("hex");

    // Use crypto.timingSafeEqual for comparing signatures to prevent timing attacks
    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(providedSignature, "hex")
      )
    ) {
      console.warn("Invalid Paymongo signature.");
      return res.status(403).json({ message: "Invalid signature." });
    }
  } catch (error) {
    console.error("Signature verification process error:", error);
    return res.status(400).json({ message: "Signature verification failed." });
  }

  // Signature is valid, parse the event
  let event;
  try {
    event = JSON.parse(rawBody.toString("utf-8"));
  } catch (parseError) {
    console.error("Webhook payload parsing error:", parseError);
    return res.status(400).json({ message: "Invalid JSON payload." });
  }

  const eventId = event.data?.id;
  const eventType = event.data?.attributes?.type;
  const eventResource = event.data?.attributes?.data; // This often contains the primary object (e.g., payment, checkout_session)

  console.log(
    `Received PayMongo event: Type: ${eventType}, Event ID: ${eventId}`
  );

  // Handle the event
  try {
    await dbConnect();

    // Ensure eventResource and its attributes are available
    if (!eventResource || !eventResource.attributes) {
      console.error(
        `Webhook Error: Missing event resource data for event ID: ${eventId}, Type: ${eventType}`
      );
      // Still send 200 to acknowledge, but we can't process this event.
      return res
        .status(200)
        .json({ received: true, message: "Event data missing or malformed." });
    }

    switch (eventType) {
      case "checkout_session.payment.paid":
        console.log(`Processing ${eventType} for Event ID: ${eventId}`);

        // Safely access nested properties
        const checkoutSessionAttributes = eventResource.attributes;
        const metadata = checkoutSessionAttributes.metadata;
        const internalOrderId = metadata?.internal_order_id; // From your /api/orders metadata
        const paymongoCheckoutSessionId = eventResource.id; // This is the checkout session ID (cs_xxx)

        // Extract payment intent details (paths might need adjustment based on actual payload)
        const paymentIntentData = checkoutSessionAttributes.payment_intent;
        const paymongoPaymentIntentId = paymentIntentData?.id;
        const paymentDetailsFromIntent =
          paymentIntentData?.attributes?.payments?.[0]?.attributes; // Example path to payment details
        const paymentMethodUsed =
          paymentDetailsFromIntent?.source?.type ||
          paymentIntentData?.attributes?.payment_method_options?.card?.brand || // if card
          "unknown";
        const paymentSucceededAt =
          paymentIntentData?.attributes?.paid_at ||
          checkoutSessionAttributes.paid_at ||
          event.data.attributes.updated_at;

        if (!internalOrderId) {
          console.error(
            `Webhook Error: internal_order_id missing from metadata for ${eventType}, Event ID: ${eventId}`
          );
          break;
        }

        const order: IOrder | null = await Order.findById(internalOrderId);

        if (!order) {
          console.error(
            `Webhook Error: Order with internal ID ${internalOrderId} not found for ${eventType}, Event ID: ${eventId}`
          );
          break;
        }

        if (
          order.orderStatus === "PAYMENT_CONFIRMED" ||
          order.paymentDetails?.status === "paid"
        ) {
          console.log(
            `Order ${order.orderId} (Internal: ${internalOrderId}) already processed as paid. Event ID: ${eventId}`
          );
          break;
        }

        if (order.orderStatus !== "PENDING_PAYMENT") {
          console.warn(
            `Order ${order.orderId} (Internal: ${internalOrderId}) not in PENDING_PAYMENT (current: ${order.orderStatus}). Proceeding with payment update. Event ID: ${eventId}`
          );
        }

        order.orderStatus = "PAYMENT_CONFIRMED"; // Use direct string or your OrderStatusEnum
        order.paymentDetails = {
          ...order.paymentDetails,
          paymongoCheckoutId:
            paymongoCheckoutSessionId ||
            order.paymentDetails?.paymongoCheckoutId,
          paymongoPaymentId:
            paymongoPaymentIntentId || order.paymentDetails?.paymongoPaymentId,
          paymentMethod: paymentMethodUsed,
          paymentDate: paymentSucceededAt
            ? new Date(paymentSucceededAt * 1000)
            : new Date(),
          status: "paid",
        };

        // Decrement stock
        for (const item of order.orderItems) {
          try {
            const product = await Product.findById(item.productId);
            if (product) {
              const newStock = product.stockQuantity - item.quantity;
              await Product.updateOne(
                { _id: item.productId },
                { $set: { stockQuantity: Math.max(0, newStock) } } // Ensure stock doesn't go below 0
              );
              if (newStock < 0) {
                console.warn(
                  `Stock for product ${item.productId} (Order: ${order.orderId}) went negative. Set to 0.`
                );
              }
            } else {
              console.error(
                `Product ${item.productId} not found during stock decrement for order ${order.orderId}.`
              );
            }
          } catch (stockError) {
            console.error(
              `Error decrementing stock for product ${item.productId} in order ${order.orderId}:`,
              stockError
            );
          }
        }

        await order.save();
        console.log(
          `Order ${order.orderId} (Internal ID: ${internalOrderId}) updated to PAYMENT_CONFIRMED.`
        );

        try {
          const emailSent = await sendOrderConfirmationEmail(order);
          if (emailSent) {
            console.log(
              `Order confirmation email sent successfully for order ${
                order.orderId
              }. Preview (if Ethereal): ${
                typeof emailSent === "string" ? emailSent : "N/A"
              }`
            );
          } else {
            console.error(
              `Failed to send order confirmation email for order ${order.orderId}.`
            );
            // You might want to add this to a retry queue or admin notification system
          }
        } catch (emailError) {
          console.error(
            `Error during email sending process for order ${order.orderId}:`,
            emailError
          );
          // Don't let email failure break the webhook response to PayMongo
        }
        break;

      case "payment.failed":
        console.log(`Processing ${eventType} for Event ID: ${eventId}`);
        const paymentFailedAttributes = eventResource.attributes;
        const failedPaymentIntentId =
          paymentFailedAttributes?.payment_intent_id;
        const failureCode = paymentFailedAttributes?.failed_code;
        const failureMessage = paymentFailedAttributes?.failed_message;

        if (failedPaymentIntentId) {
          // Try to find the order using the payment_intent_id
          // This assumes you stored this ID in 'paymentDetails.paymongoPaymentId'
          // during the checkout_session.payment.paid event or when creating the checkout session.
          const failedOrder: IOrder | null = await Order.findOne({
            "paymentDetails.paymongoPaymentId": failedPaymentIntentId,
          });

          if (failedOrder) {
            if (failedOrder.orderStatus === "PENDING_PAYMENT") {
              failedOrder.orderStatus = "PAYMENT_FAILED";
              failedOrder.paymentDetails = {
                ...failedOrder.paymentDetails,
                status: "failed",
                // You might want to add a specific field for failure_code/message
                // failureCode: failureCode,
                // failureMessage: failureMessage,
              };
              if (failureMessage) {
                failedOrder.notes = `Payment failed: ${failureMessage} (Code: ${
                  failureCode || "N/A"
                }. PayMongo Payment ID: ${eventResource.id})`;
              } else {
                failedOrder.notes = `Payment failed. (Code: ${
                  failureCode || "N/A"
                }. PayMongo Payment ID: ${eventResource.id})`;
              }
              await failedOrder.save();
              console.log(
                `Order ${failedOrder.orderId} (Internal: ${failedOrder.id}) marked as PAYMENT_FAILED via PaymentIntentID: ${failedPaymentIntentId}.`
              );
            } else {
              console.log(
                `Order ${failedOrder.orderId} (Internal: ${failedOrder.id}) not in PENDING_PAYMENT (current: ${failedOrder.orderStatus}). No action taken for payment.failed event.`
              );
            }
          } else {
            // Fallback: If order not found by payment_intent_id, perhaps log more details or try another correlation ID if available.
            // This could happen if the payment_intent_id was never stored, or if this payment.failed event
            // is for a payment attempt not linked via a payment intent you previously recorded.
            console.error(
              `Webhook Error: Order not found using payment_intent_id ${failedPaymentIntentId} for payment.failed event, Event ID: ${eventId}.`
            );
            console.log(
              "Full payment.failed event data for inspection if order not found by PI_ID:",
              JSON.stringify(eventResource, null, 2)
            );
          }
        } else {
          console.error(
            `Webhook Error: payment_intent_id missing from payment.failed event, Event ID: ${eventId}. Cannot reliably link to order.`
          );
          console.log(
            "Full payment.failed event data for inspection if PI_ID is missing:",
            JSON.stringify(eventResource, null, 2)
          );
        }
        break;

      default:
        console.log(`Unhandled event type: ${eventType}. Event ID: ${eventId}`);
    }

    res.status(200).json({ received: true, message: "Webhook processed." });
  } catch (processingError) {
    console.error(
      `Webhook event processing error for Event ID ${eventId}, Type: ${eventType}:`,
      processingError
    );
    res.status(200).json({
      received: true,
      error: "Internal processing error encountered.",
    });
  }
}
