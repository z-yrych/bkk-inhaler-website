// pages/api/admin/orders/index.ts
import { NextApiResponse } from "next";
import { ZodError } from "zod";
import mongoose from "mongoose"; // Import mongoose for FilterQuery type
import dbConnect from "@/lib/dbConnect";
import Order, { IOrder } from "@/lib/models/Order"; // Assuming IOrder is your Mongoose document interface
import Product from "@/lib/models/Product";
import {
  withAdminAuth,
  NextApiRequestWithAdmin,
} from "@/lib/middleware/authMiddleware";
import { ListOrdersQuerySchema } from "@/lib/validators/adminOrderValidators";
// FIXED: Removed ListOrdersQueryInput as it's not explicitly used; type is inferred by Zod.
// import { ListOrdersQuerySchema, ListOrdersQueryInput } from "@/lib/validators/adminOrderValidators";

type MongooseSortOrder = 1 | -1 | "asc" | "desc";

async function handler(req: NextApiRequestWithAdmin, res: NextApiResponse) {
  await dbConnect();

  switch (req.method) {
    case "GET":
      try {
        // Validate query parameters. The type of queryParams will be inferred by Zod.
        const queryParams = ListOrdersQuerySchema.parse(req.query);
        const { page, limit, sortBy, sortOrder, status, orderId, email } =
          queryParams;

        const skip = (page - 1) * limit;

        // Build query filter
        // FIXED: Error at 31:23 - Provided a more specific type for filter
        const filter: mongoose.FilterQuery<IOrder> = {};
        if (status) {
          filter.orderStatus = status;
        }
        if (orderId) {
          filter.orderId = { $regex: new RegExp(`^${orderId.trim()}$`, "i") };
        }
        if (email) {
          filter["customerDetails.email"] = {
            $regex: new RegExp(`^${email.trim()}$`, "i"),
          };
        }

        // Build sort object
        const sortOptions: { [key: string]: MongooseSortOrder } = {};
        const allowedSortByFields = [
          "createdAt",
          "updatedAt",
          "totalAmount",
          "orderStatus",
          "orderId",
        ];
        if (allowedSortByFields.includes(sortBy)) {
          sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
        } else {
          sortOptions["createdAt"] = -1; // Default sort
        }

        const orders = await Order.find(filter)
          .populate({
            path: "orderItems.productId",
            model: Product, // Explicitly stating model for clarity, ref in schema is also used
            select: "name images slug price stockQuantity", // Added price and stockQuantity
          })
          .sort(sortOptions)
          .skip(skip)
          .limit(limit);

        const totalOrders = await Order.countDocuments(filter);

        return res.status(200).json({
          message: "Orders fetched successfully.",
          orders,
          currentPage: page,
          // Ensure totalPages is at least 1 if totalOrders > 0, or 0 if no orders
          totalPages: totalOrders > 0 ? Math.ceil(totalOrders / limit) : 0,
          totalOrders,
        });
      } catch (error) {
        // FIXED: Typed error in catch block
        if (error instanceof ZodError) {
          return res.status(400).json({
            message: "Invalid query parameters.",
            errors: error.errors,
          });
        }
        console.error("Admin List Orders Error:", error);
        if (error instanceof Error) {
          return res
            .status(500)
            .json({
              message:
                error.message || "Internal Server Error fetching orders.",
            });
        }
        return res
          .status(500)
          .json({
            message:
              "An unexpected internal Server Error occurred fetching orders.",
          });
      }

    default:
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed on this route.` });
  }
}

export default withAdminAuth(handler);
