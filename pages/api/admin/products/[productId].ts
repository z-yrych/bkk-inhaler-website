// pages/api/admin/products/[productId].ts
import { NextApiResponse } from "next";
import { ZodError } from "zod";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Product, { IProduct } from "@/lib/models/Product"; // Assuming IProduct is exported
import {
  ProductUpdateSchema,
  // ProductUpdateInput, // This type is inferred by Zod's parse, direct use might be optional
} from "@/lib/validators/productValidators";
import {
  withAdminAuth,
  NextApiRequestWithAdmin,
} from "@/lib/middleware/authMiddleware";
import slugify from "slugify";

// Define a type for Mongoose duplicate key errors for more specific type checking
interface MongooseDuplicateKeyError extends Error {
  // Ensure this Error is the built-in Error
  code?: number;
  keyPattern?: { [key: string]: number };
  keyValue?: { [key: string]: unknown };
}

async function handler(req: NextApiRequestWithAdmin, res: NextApiResponse) {
  const { productId } = req.query;

  if (
    !productId ||
    typeof productId !== "string" ||
    !mongoose.Types.ObjectId.isValid(productId)
  ) {
    return res.status(400).json({ message: "Invalid Product ID format." });
  }

  await dbConnect();

  switch (req.method) {
    case "GET":
      try {
        const product = await Product.findById(productId);

        if (!product) {
          return res.status(404).json({ message: "Product not found." });
        }
        return res.status(200).json({ product });
      } catch (error) {
        // error is unknown
        console.error("Get Product Error:", error);
        if (error instanceof Error) {
          return res
            .status(500)
            .json({
              message:
                error.message || "Internal Server Error fetching product.",
            });
        }
        return res
          .status(500)
          .json({
            message:
              "An unexpected internal Server Error occurred fetching product.",
          });
      }

    case "PUT":
      try {
        const validatedData = ProductUpdateSchema.parse(req.body);

        if (Object.keys(validatedData).length === 0) {
          return res.status(400).json({ message: "No update data provided." });
        }

        const productToUpdate: IProduct | null = await Product.findById(
          productId
        );

        if (!productToUpdate) {
          return res.status(404).json({ message: "Product not found." });
        }

        // Handle slug update logic separately and first
        if (
          validatedData.name &&
          !validatedData.slug &&
          productToUpdate.name !== validatedData.name
        ) {
          const newGeneratedSlug = slugify(validatedData.name, {
            lower: true,
            strict: true,
            replacement: "-",
          });
          if (newGeneratedSlug !== productToUpdate.slug) {
            const existingProductWithNewSlug = await Product.findOne({
              slug: newGeneratedSlug,
              _id: { $ne: productId },
            });
            if (existingProductWithNewSlug) {
              return res
                .status(409)
                .json({
                  message:
                    "A product with a similar name (resulting in a duplicate slug) already exists. Please adjust the name or manually set a unique slug.",
                });
            }
            productToUpdate.slug = newGeneratedSlug;
          }
        } else if (
          validatedData.slug &&
          validatedData.slug !== productToUpdate.slug
        ) {
          const existingProductWithNewSlug = await Product.findOne({
            slug: validatedData.slug,
            _id: { $ne: productId },
          });
          if (existingProductWithNewSlug) {
            return res
              .status(409)
              .json({
                message:
                  "A product with this slug already exists. Please choose a different slug.",
              });
          }
          productToUpdate.slug = validatedData.slug;
        }

        // Apply other updates explicitly and type-safely
        if (validatedData.name !== undefined) {
          productToUpdate.name = validatedData.name;
        }
        if (validatedData.description !== undefined) {
          productToUpdate.description = validatedData.description;
        }
        if (validatedData.price !== undefined) {
          productToUpdate.price = validatedData.price;
        }
        if (validatedData.stockQuantity !== undefined) {
          productToUpdate.stockQuantity = validatedData.stockQuantity;
        }
        if (validatedData.images !== undefined) {
          productToUpdate.images = validatedData.images;
        }
        if (validatedData.scentProfile !== undefined) {
          productToUpdate.scentProfile = validatedData.scentProfile;
        }
        if (validatedData.benefits !== undefined) {
          productToUpdate.benefits = validatedData.benefits;
        }
        if (validatedData.usageInstructions !== undefined) {
          productToUpdate.usageInstructions = validatedData.usageInstructions;
        }
        if (validatedData.ingredients !== undefined) {
          productToUpdate.ingredients = validatedData.ingredients;
        }
        if (validatedData.isActive !== undefined) {
          productToUpdate.isActive = validatedData.isActive;
        }
        // Note: The 'slug' field is handled above. If validatedData.slug was present
        // and different, it would have been assigned already.

        const updatedProduct = await productToUpdate.save();

        return res.status(200).json({
          message: "Product updated successfully.",
          product: updatedProduct,
        });
      } catch (error) {
        // error is 'unknown' by default
        if (error instanceof ZodError) {
          return res
            .status(400)
            .json({ message: "Validation failed.", errors: error.errors });
        }
        // Safer check for Mongoose duplicate key error
        if (error instanceof Error) {
          const mongooseError = error as MongooseDuplicateKeyError;
          if (mongooseError.code === 11000 && mongooseError.keyPattern?.slug) {
            return res
              .status(409)
              .json({
                message:
                  "A product with the generated or provided slug already exists.",
              });
          }
          console.error("Update Product Error:", error);
          return res
            .status(500)
            .json({
              message:
                error.message || "Internal Server Error updating product.",
            });
        }
        console.error("Update Product Error (unknown type):", error);
        return res
          .status(500)
          .json({
            message:
              "An unexpected internal Server Error occurred updating product.",
          });
      }

    case "DELETE": // Soft delete
      try {
        const productToDeactivate = await Product.findById(productId);

        if (!productToDeactivate) {
          return res.status(404).json({ message: "Product not found." });
        }

        if (!productToDeactivate.isActive) {
          return res
            .status(400)
            .json({ message: "Product is already inactive." });
        }

        productToDeactivate.isActive = false;
        const deactivatedProduct = await productToDeactivate.save();

        return res
          .status(200)
          .json({
            message: "Product deactivated successfully.",
            product: deactivatedProduct,
          });
      } catch (error) {
        // error is unknown
        console.error("Deactivate Product Error:", error);
        if (error instanceof Error) {
          return res
            .status(500)
            .json({
              message:
                error.message || "Internal Server Error deactivating product.",
            });
        }
        return res
          .status(500)
          .json({
            message:
              "An unexpected internal Server Error occurred deactivating product.",
          });
      }

    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed` });
  }
}

export default withAdminAuth(handler);
