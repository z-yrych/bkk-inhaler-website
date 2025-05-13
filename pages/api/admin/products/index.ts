// pages/api/admin/products/index.ts
import { NextApiResponse } from "next";
import { ZodError } from "zod";
import dbConnect from "@/lib/dbConnect";
import Product from "@/lib/models/Product"; // Assuming IProduct is part of Product.ts or imported separately
import {
  ProductCreationSchema,
  // ProductCreationInput, // This type is inferred by Zod's parse, direct use might be optional
} from "@/lib/validators/productValidators";
import {
  withAdminAuth,
  NextApiRequestWithAdmin,
} from "@/lib/middleware/authMiddleware";

// Define a type for Mongoose duplicate key errors for more specific type checking
interface MongooseDuplicateKeyError extends Error {
  // Ensure this Error is the built-in Error
  code?: number;
  keyPattern?: { [key: string]: number };
  keyValue?: { [key: string]: unknown };
}



async function handler(req: NextApiRequestWithAdmin, res: NextApiResponse) {
  await dbConnect();

  switch (req.method) {
    case "POST":
      try {
        const validatedData = ProductCreationSchema.parse(req.body);

        const newProduct = new Product({
          ...validatedData,
        });

        await newProduct.save();

        return res.status(201).json({
          message: "Product created successfully.",
          product: newProduct, // Mongoose toJSON should handle what's sent
        });
      } catch (error) {
        // error is unknown by default
        if (error instanceof ZodError) {
          return res
            .status(400)
            .json({ message: "Validation failed.", errors: error.errors });
        }
        // FIXED: Errors at 49:49 and 49:82 - Safer check for Mongoose duplicate key error
        if (error instanceof Error) {
          // Check if it's an Error instance first
          const mongooseError = error as MongooseDuplicateKeyError; // Then cast to your more specific type
          if (mongooseError.code === 11000 && mongooseError.keyPattern?.slug) {
            return res.status(409).json({
              message:
                "A product with a similar name resulting in a duplicate slug already exists. Please try a slightly different name.",
            });
          }
          console.error("Product Creation Error:", error);
          return res
            .status(500)
            .json({
              message:
                error.message || "Internal Server Error creating product.",
            });
        }
        // Fallback for non-Error types
        console.error("Product Creation Error (unknown type):", error);
        return res
          .status(500)
          .json({
            message:
              "An unexpected Internal Server Error occurred creating product.",
          });
      }

    case "GET":
      try {
        // Basic GET without pagination/sorting for admin (as per original user code for this file)
        // You can add ListProductsQuerySchema validation here if you add query params
        const products = await Product.find({}).sort({ createdAt: -1 });

        // If you implement pagination for admin product list:
        // const queryParams = ListProductsQuerySchema.parse(req.query); // Example
        // const { page, limit, sortBy, sortOrder } = queryParams;
        // const skip = (page - 1) * limit;
        // const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        // const products = await Product.find({}) /* add filters if any */
        //   .sort(sortOptions)
        //   .skip(skip)
        //   .limit(limit);
        // const totalProducts = await Product.countDocuments({});
        // return res.status(200).json({
        //   message: "Products fetched successfully.",
        //   products,
        //   currentPage: page,
        //   totalPages: Math.ceil(totalProducts / limit),
        //   totalProducts,
        // });

        return res.status(200).json({ products }); // Simplified response based on original code
      } catch (error) {
        // error is unknown
        console.error("List Admin Products Error:", error);
        if (error instanceof Error) {
          return res
            .status(500)
            .json({
              message:
                error.message || "Internal Server Error fetching products.",
            });
        }
        return res
          .status(500)
          .json({
            message:
              "An unexpected Internal Server Error occurred fetching products.",
          });
      }

    default:
      res.setHeader("Allow", ["GET", "POST"]);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed` });
  }
}

export default withAdminAuth(handler);
