import { NextApiResponse } from "next";
import { ZodError } from "zod";
import dbConnect from "@/lib/dbConnect";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import {
  withAdminAuth,
  NextApiRequestWithAdmin,
} from "@/lib/middleware/authMiddleware";
import {
  ListOrdersQuerySchema,
  ListOrdersQueryInput,
} from "@/lib/validators/adminOrderValidators";

type MongooseSortOrder = 1 | -1 | "asc" | "desc";

async function handler(req: NextApiRequestWithAdmin, res: NextApiResponse) {
  await dbConnect();

  switch (req.method) {
    case "GET":
      try {
        // Validate query parameters
        const queryParams = ListOrdersQuerySchema.parse(req.query);
        const { page, limit, sortBy, sortOrder, status, orderId, email } =
          queryParams;

        const skip = (page - 1) * limit;

        // Build query filter
        const filter: any = {}; // mongoose.FilterQuery<IOrder> = {};
        if (status) {
          filter.orderStatus = status;
        }
        if (orderId) {
          // Assuming orderId is unique and you want an exact match
          filter.orderId = { $regex: new RegExp(`^${orderId.trim()}$`, "i") }; // Case-insensitive exact match
        }
        if (email) {
          filter["customerDetails.email"] = {
            $regex: new RegExp(`^${email.trim()}$`, "i"),
          }; // Case-insensitive exact match
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
            model: Product,
            select: "name images slug",
          })
          .sort(sortOptions)
          .skip(skip)
          .limit(limit);

        const totalOrders = await Order.countDocuments(filter);

        return res.status(200).json({
          message: "Orders fetched successfully.",
          orders,
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({
            message: "Invalid query parameters.",
            errors: error.errors,
          });
        }
        console.error("Admin List Orders Error:", error);
        return res
          .status(500)
          .json({ message: "Internal Server Error fetching orders." });
      }

    // POST for creating orders via admin panel can be added here if needed in the future.
    // For now, assuming orders are primarily customer-generated.

    default:
      res.setHeader("Allow", ["GET"]); // Only GET is implemented for now
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed on this route.` });
  }
}



export default withAdminAuth(handler); // Secure this route for admins only
