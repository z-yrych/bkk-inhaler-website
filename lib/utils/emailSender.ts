// lib/utils/emailSender.ts
import nodemailer from "nodemailer";
import { IOrder, OrderStatus } from "@/lib/models/Order"; // Import your IOrder and OrderStatusType interfaces

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string; // Optional plain text version
}

// Function to format currency (from cents to PHP string)
function formatCurrency(amountInCents: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amountInCents / 100);
}

// --- HTML Email Template Generators ---

// Base styling for emails
const baseEmailStyle = `
  font-family: Arial, Helvetica, sans-serif; 
  line-height: 1.6; 
  color: #333; 
  max-width: 600px; 
  margin: 20px auto; 
  border: 1px solid #ddd; 
  padding: 20px;
`;
const headerStyle = `
  text-align: center; 
  margin-bottom: 20px; 
  padding-bottom: 15px; 
  border-bottom: 2px solid #4CAF50;
`;
const h1Style = `color: #4CAF50; margin: 0; font-size: 24px;`;
const h2Style = `color: #34495e; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px; font-size: 20px;`;
const pStyle = `margin: 10px 0;`;
const footerStyle = `
  text-align: center; 
  margin-top: 30px; 
  padding-top: 15px; 
  border-top: 1px solid #eee; 
  font-size: 0.9em; 
  color: #7f8c8d;
`;

// 1. Order Confirmation (You already have this, ensure it uses base styles for consistency)
function generateOrderConfirmationHTML(order: IOrder): string {
  const itemsHTML = order.orderItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">${
        item.name
      }</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${
        item.quantity
      }</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(
        item.priceAtPurchase
      )}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(
        item.priceAtPurchase * item.quantity
      )}</td>
    </tr>
  `
    )
    .join("");
  const shipping = order.customerDetails.shippingAddress;
  const customerName =
    order.customerDetails.fullName ||
    `${order.customerDetails.firstName} ${order.customerDetails.lastName}`;
  const cityField =
    shipping.city || (shipping as any).cityMunicipality || "N/A";

  return `
    <div style="${baseEmailStyle}">
      <header style="${headerStyle}">
        <h1 style="${h1Style}">Thank You for Your Order!</h1>
      </header>
      <p style="${pStyle}">Hi ${customerName},</p>
      <p style="${pStyle}">We're excited to let you know that your order #${
    order.orderId
  } has been confirmed and is being processed.</p>
      <h2 style="${h2Style}">Order Summary</h2>
      <p style="${pStyle}"><strong>Order ID:</strong> ${order.orderId}</p>
      <p style="${pStyle}"><strong>Order Date:</strong> ${new Date(
    order.createdAt
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead><tr style="background-color: #ecf0f1;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Quantity</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Unit Price</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
        </tr></thead>
        <tbody>${itemsHTML}</tbody>
        <tfoot><tr>
            <td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Grand Total:</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(
              order.totalAmount
            )}</td>
        </tr></tfoot>
      </table>
      <h2 style="${h2Style}">Shipping Address</h2>
      <address style="margin: 5px 0; font-style: normal; white-space: pre-line;">
        ${customerName}<br>
        ${shipping.street}<br>
        Brgy. ${shipping.barangay}, ${cityField}<br>
        ${shipping.province}, ${shipping.postalCode}<br>
        Philippines
      </address>
      <p style="${pStyle}"><strong>Phone:</strong> ${
    order.customerDetails.phone || "N/A"
  }</p>
      <p style="${pStyle}">We'll notify you once your order has shipped. If you have any questions, feel free to contact us at [Your Support Email Address] or reply to this email.</p>
      <footer style="${footerStyle}">
        <p>Thank you for shopping with InhalerStore!</p>
        <p>[Your Website URL] | [Your Contact Number (Optional)]</p>
      </footer>
    </div>
  `;
}

// 2. Order Processing Template
function generateOrderProcessingHTML(order: IOrder): string {
  const customerName =
    order.customerDetails.fullName ||
    `${order.customerDetails.firstName} ${order.customerDetails.lastName}`;
  return `
    <div style="${baseEmailStyle}">
      <header style="${headerStyle}"><h1 style="${h1Style}">Your Order is Being Processed!</h1></header>
      <p style="${pStyle}">Hi ${customerName},</p>
      <p style="${pStyle}">Great news! We've started processing your order #${order.orderId}.</p>
      <p style="${pStyle}">We're carefully preparing your items and will notify you as soon as it's shipped. You can expect your items to be dispatched within [X-Y business days/hours].</p>
      <p style="${pStyle}">You can view your order details here: [Link to Order Tracking or Account Page - if available]</p>
      <p style="${pStyle}">If you have any questions, please don't hesitate to contact us.</p>
      <footer style="${footerStyle}"><p>Thanks for your patience,<br>The InhalerStore Team</p></footer>
    </div>
  `;
}

// 3. Order Shipped Template
function generateOrderShippedHTML(
  order: IOrder,
  trackingNumber?: string,
  courier?: string
): string {
  const customerName =
    order.customerDetails.fullName ||
    `${order.customerDetails.firstName} ${order.customerDetails.lastName}`;
  let trackingInfoHTML = '<p style="${pStyle}">Your order is on its way!</p>';
  if (trackingNumber && courier) {
    trackingInfoHTML = `
      <p style="${pStyle}">Your order #${order.orderId} has been shipped via ${courier}!</p>
      <p style="${pStyle}">Your tracking number is: <strong>${trackingNumber}</strong></p>
      <p style="${pStyle}">You can track your package here: [Link to Courier Tracking Page, potentially with trackingNumber appended, e.g., https://courier.example.com/track?id=${trackingNumber}]</p>
    `;
  } else if (courier) {
    trackingInfoHTML = `<p style="${pStyle}">Your order #${order.orderId} has been shipped via ${courier}!</p>`;
  }

  return `
    <div style="${baseEmailStyle}">
      <header style="${headerStyle}"><h1 style="${h1Style}">Your Order Has Shipped!</h1></header>
      <p style="${pStyle}">Hi ${customerName},</p>
      ${trackingInfoHTML}
      <p style="${pStyle}">Please allow some time for the tracking information to update. Your estimated delivery date is [Your Estimated Delivery Info, if available].</p>
      <h3 style="${h2Style}">Shipping To:</h3>
      <address style="margin: 5px 0; font-style: normal; white-space: pre-line;">
        ${order.customerDetails.shippingAddress.street}<br>
        Brgy. ${order.customerDetails.shippingAddress.barangay}, ${
    order.customerDetails.shippingAddress.city ||
    (order.customerDetails.shippingAddress as any).cityMunicipality
  }<br>
        ${order.customerDetails.shippingAddress.province}, ${
    order.customerDetails.shippingAddress.postalCode
  }
      </address>
      <footer style="${footerStyle}"><p>Thanks for choosing InhalerStore!</p></footer>
    </div>
  `;
}

// 4. Order Delivered Template
function generateOrderDeliveredHTML(order: IOrder): string {
  const customerName =
    order.customerDetails.fullName ||
    `${order.customerDetails.firstName} ${order.customerDetails.lastName}`;
  return `
    <div style="${baseEmailStyle}">
      <header style="${headerStyle}"><h1 style="${h1Style}">Your Order Has Been Delivered!</h1></header>
      <p style="${pStyle}">Hi ${customerName},</p>
      <p style="${pStyle}">Good news! Your order #${order.orderId} has been successfully delivered.</p>
      <p style="${pStyle}">We hope you love your new inhalers! If you have any feedback or questions about your products, please let us know.</p>
      <p style="${pStyle}">Enjoy the benefits of natural aromatherapy!</p>
      <footer style="${footerStyle}"><p>Thank you for your purchase,<br>The InhalerStore Team</p></footer>
    </div>
  `;
}

// 5. Order Cancelled by Admin Template
function generateOrderCancelledByAdminHTML(
  order: IOrder,
  cancellationReason?: string
): string {
  const customerName =
    order.customerDetails.fullName ||
    `${order.customerDetails.firstName} ${order.customerDetails.lastName}`;
  let reasonHTML = "";
  if (cancellationReason) {
    reasonHTML = `<p style="${pStyle}"><strong>Reason for cancellation:</strong> ${cancellationReason}</p>`;
  }
  return `
    <div style="${baseEmailStyle}">
      <header style="${headerStyle}"><h1 style="color: #dc3545; margin:0; font-size: 24px;">Order #${order.orderId} Cancelled</h1></header>
      <p style="${pStyle}">Hi ${customerName},</p>
      <p style="${pStyle}">We're writing to inform you that your order #${order.orderId} has been cancelled by our team.</p>
      ${reasonHTML}
      <p style="${pStyle}">A full refund (if payment was processed) has been initiated and should reflect in your account within [X-Y business days, depending on payment method].</p>
      <p style="${pStyle}">We apologize for any inconvenience this may cause. If you have any questions or would like to place a new order, please contact our support team at [Your Support Email Address].</p>
      <footer style="${footerStyle}"><p>Sincerely,<br>The InhalerStore Team</p></footer>
    </div>
  `;
}

// --- Transporter and Sending Logic (mostly same as before) ---
async function getTransporter() {
  if (process.env.NODE_ENV === "production") {
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      console.warn(
        "Production SMTP environment variables not fully set. Email sending might fail."
      );
    }
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: parseInt(process.env.SMTP_PORT || "587") === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    if (
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_PASS ||
      !process.env.EMAIL_HOST ||
      process.env.EMAIL_HOST.toLowerCase() !== "smtp.ethereal.email"
    ) {
      console.warn(
        "Ethereal credentials not fully set or host is not smtp.ethereal.email. Attempting to create new Ethereal account."
      );
      try {
        const testAccount = await nodemailer.createTestAccount();
        console.log(
          "Dynamically created Ethereal account. User:",
          testAccount.user,
          "Pass:",
          testAccount.pass,
          "Host:",
          testAccount.smtp.host
        );
        return nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });
      } catch (etherealError) {
        console.error("Failed to create Ethereal test account:", etherealError);
        throw new Error(
          "Failed to set up email transporter for development (Ethereal)."
        );
      }
    }
    console.log("Using pre-configured Ethereal credentials from .env.local.");
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: parseInt(process.env.EMAIL_PORT || "587") === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
}

export async function sendEmail(
  options: MailOptions
): Promise<string | false | null> {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"InhalerStore" <noreply@yourdomain.com>', // Update your default from
      ...options,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("Email sent (Ethereal)! Preview URL: %s", previewUrl);
      return previewUrl;
    } else if (info.messageId) {
      console.log("Email sent (Production). Message ID: %s", info.messageId);
      return info.messageId;
    } else {
      console.log(
        "Email sent, no preview URL/messageId. Response:",
        info.response
      );
      return info.response || true.toString();
    }
  } catch (error) {
    console.error("Error in sendEmail function:", error);
    return false;
  }
}

// --- Wrapper functions for specific email types ---
export async function sendOrderConfirmationEmail(
  order: IOrder
): Promise<boolean> {
  if (!order.customerDetails.email) {
    console.error(
      `Order ${order.orderId} missing customer email for confirmation.`
    );
    return false;
  }
  const subject = `Order Confirmed: InhalerStore - Order #${order.orderId}`;
  const htmlContent = generateOrderConfirmationHTML(order);
  console.log(
    `Attempting to send order confirmation email to ${order.customerDetails.email} for order ${order.orderId}...`
  );
  const result = await sendEmail({
    to: order.customerDetails.email,
    subject,
    html: htmlContent,
  });
  return !!result;
}

// New function to handle various status update notifications
export async function sendOrderStatusUpdateNotification(
  order: IOrder,
  newStatus: OrderStatus, // Use your OrderStatusType
  adminProvidedNote?: string // Optional note from admin, could be cancellation reason or tracking info
): Promise<boolean> {
  if (!order.customerDetails.email) {
    console.error(
      `Order ${order.orderId} missing customer email for status update.`
    );
    return false;
  }

  let subject = "";
  let htmlContent = "";

  switch (newStatus) {
    case "PROCESSING":
      subject = `Your InhalerStore Order #${order.orderId} is Being Processed`;
      htmlContent = generateOrderProcessingHTML(order);
      break;
    case "SHIPPED_LOCAL":
      // For shipped, you might extract tracking from order.shippingInfo or pass it via adminProvidedNote
      const trackingNumber =
        order.shippingInfo?.trackingNumber ||
        (adminProvidedNote?.includes("Tracking")
          ? adminProvidedNote
          : undefined);
      const courier =
        order.shippingInfo?.courier ||
        (adminProvidedNote?.includes("via") ? adminProvidedNote : undefined);
      subject = `Your InhalerStore Order #${order.orderId} Has Shipped!`;
      htmlContent = generateOrderShippedHTML(order, trackingNumber, courier);
      break;
    case "DELIVERED":
      subject = `Your InhalerStore Order #${order.orderId} Has Been Delivered`;
      htmlContent = generateOrderDeliveredHTML(order);
      break;
    case "CANCELLED_BY_ADMIN":
      subject = `Important Update: Your InhalerStore Order #${order.orderId} Has Been Cancelled`;
      htmlContent = generateOrderCancelledByAdminHTML(order, adminProvidedNote); // Pass adminNote as potential reason
      break;
    // Add cases for other statuses if needed (e.g., PAYMENT_FAILED, REFUNDED)
    // default:
    //   console.log(`No specific email template for order status: ${newStatus}. Not sending email.`);
    //   return true; // Or false if you consider it a failure not to have a template
  }

  if (subject && htmlContent) {
    console.log(
      `Attempting to send status update email (${newStatus}) to ${order.customerDetails.email} for order ${order.orderId}...`
    );
    const result = await sendEmail({
      to: order.customerDetails.email,
      subject,
      html: htmlContent,
    });
    return !!result;
  } else {
    console.log(
      `No email notification configured for status: ${newStatus} for order ${order.orderId}.`
    );
    return true; // Not an error, just no email to send for this status
  }
}
