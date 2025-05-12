// pages/api/admin/orders/[mongoOrderId].ts
import { NextApiResponse } from "next";
import { ZodError } from "zod";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Order, { IOrder, OrderStatus } from "@/lib/models/Order"; // Ensure OrderStatusType is exported
import {
  withAdminAuth,
  NextApiRequestWithAdmin,
} from "@/lib/middleware/authMiddleware";
import {
  UpdateOrderStatusSchema,
  UpdateOrderStatusInput,
} from "@/lib/validators/adminOrderValidators";
import { sendOrderStatusUpdateNotification } from "@/lib/utils/emailSender"; // <-- IMPORT

async function handler(req: NextApiRequestWithAdmin, res: NextApiResponse) {
  const { mongoOrderId } = req.query;

  if (
    !mongoOrderId ||
    typeof mongoOrderId !== "string" ||
    !mongoose.Types.ObjectId.isValid(mongoOrderId)
  ) {
    return res
      .status(400)
      .json({ message: "Valid Order ID (mongoOrderId) is required." });
  }

  await dbConnect();

  switch (req.method) {
    case "GET":
      try {
        const order = await Order.findById(mongoOrderId).populate({
          path: "orderItems.productId",
          select: "name images slug price stockQuantity",
        });

        if (!order) {
          return res.status(404).json({ message: "Order not found." });
        }
        return res.status(200).json({ order });
      } catch (error) {
        console.error(`Admin Get Order Error (ID: ${mongoOrderId}):`, error);
        return res
          .status(500)
          .json({ message: "Internal Server Error fetching order." });
      }

    case "PUT": // For updating order status
      try {
        const validatedData = UpdateOrderStatusSchema.parse(
          req.body as UpdateOrderStatusInput
        );
        const { status: newStatus, adminNote } = validatedData;

        const orderToUpdate = await Order.findById(mongoOrderId);

        if (!orderToUpdate) {
          return res.status(404).json({ message: "Order not found." });
        }

        const oldStatus = orderToUpdate.orderStatus;
        orderToUpdate.orderStatus = newStatus as OrderStatus; // Ensure type compatibility

        if (adminNote && adminNote.trim() !== "") {
          const notePrefix = `[${new Date().toLocaleString("en-US", {
            timeZone: "Asia/Manila",
          })} - Status: ${newStatus}]: `;
          orderToUpdate.adminNotes = orderToUpdate.adminNotes
            ? `${orderToUpdate.adminNotes}\n${notePrefix}${adminNote.trim()}`
            : `${notePrefix}${adminNote.trim()}`;
        }

        const updatedOrder = await orderToUpdate.save();

        // Trigger email notification if the status has actually changed and is significant
        if (newStatus !== oldStatus) {
          // Pass the adminNote which might contain tracking info for 'SHIPPED_LOCAL'
          // or cancellation reason for 'CANCELLED_BY_ADMIN'
          sendOrderStatusUpdateNotification(
            updatedOrder,
            newStatus as OrderStatus,
            adminNote
          )
            .then((sent) => {
              if (sent) {
                console.log(
                  `Status update email (${newStatus}) sent for order ${updatedOrder.orderId}.`
                );
              } else {
                console.error(
                  `Failed to send status update email (${newStatus}) for order ${updatedOrder.orderId}.`
                );
              }
            })
            .catch((emailError) => {
              console.error(
                `Error queueing status update email for order ${updatedOrder.orderId}:`,
                emailError
              );
            });
        }

        return res.status(200).json({
          message: `Order status updated to ${newStatus}.`,
          order: updatedOrder,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          return res
            .status(400)
            .json({ message: "Invalid update data.", errors: error.errors });
        }
        console.error(
          `Admin Update Order Status Error (ID: ${mongoOrderId}):`,
          error
        );
        return res
          .status(500)
          .json({ message: "Internal Server Error updating order status." });
      }

    default:
      res.setHeader("Allow", ["GET", "PUT"]);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed on this route.` });
  }
}

export default withAdminAuth(handler);
