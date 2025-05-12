import { NextApiResponse } from 'next';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Product from '@/lib/models/Product'; // Assuming IProduct is exported or part of Product
import {
  ProductUpdateSchema,
  ProductUpdateInput,
} from '@/lib/validators/productValidators';
import {
  withAdminAuth,
  NextApiRequestWithAdmin,
} from '@/lib/middleware/authMiddleware';
import slugify from 'slugify'; // For manual slug regeneration check if needed

async function handler(
  req: NextApiRequestWithAdmin,
  res: NextApiResponse
) {
  const { productId } = req.query;

  if (!productId || typeof productId !== 'string' || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Invalid Product ID format.' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        console.log(`Attempting to find product with ID: "${productId}" (Type: ${typeof productId})`); // <-- ADD THIS
        const product = await Product.findById(productId);

        if (!product) {
          return res.status(404).json({ message: 'Product not found.' });
        }
        return res.status(200).json({ product });
      } catch (error) {
        console.error('Get Product Error:', error);
        return res
          .status(500)
          .json({ message: 'Internal Server Error fetching product.' });
      }

    case 'PUT':
      try {
        const validatedData = ProductUpdateSchema.parse(req.body as ProductUpdateInput);

        if (Object.keys(validatedData).length === 0) {
            return res.status(400).json({ message: 'No update data provided.' });
        }

        const productToUpdate = await Product.findById(productId);

        if (!productToUpdate) {
          return res.status(404).json({ message: 'Product not found.' });
        }

        // Handle slug update logic
        let newSlug;
        if (validatedData.name && !validatedData.slug && productToUpdate.name !== validatedData.name) {
          // If name changes and no specific slug is provided, regenerate slug
          // The pre-save hook will also do this, but checking here can pre-empt conflicts
          newSlug = slugify(validatedData.name, { lower: true, strict: true, replacement: '-' });
        } else if (validatedData.slug) {
          // If a slug is explicitly provided in the update
          newSlug = validatedData.slug;
        }

        if (newSlug && newSlug !== productToUpdate.slug) {
          const existingProductWithNewSlug = await Product.findOne({
            slug: newSlug,
            _id: { $ne: productId }, // Exclude the current product
          });
          if (existingProductWithNewSlug) {
            return res
              .status(409)
              .json({ message: 'A product with this slug already exists. Please choose a different name or manually set a unique slug.' });
          }
          productToUpdate.slug = newSlug; // Set the new slug if it's unique or being auto-generated
        }

        // Apply other updates
        if (validatedData.name) productToUpdate.name = validatedData.name;
        if (validatedData.description) productToUpdate.description = validatedData.description;
        if (validatedData.price !== undefined) productToUpdate.price = validatedData.price; // Price in cents
        if (validatedData.stockQuantity !== undefined) productToUpdate.stockQuantity = validatedData.stockQuantity;
        if (validatedData.images) productToUpdate.images = validatedData.images;
        if (validatedData.scentProfile) productToUpdate.scentProfile = validatedData.scentProfile;
        if (validatedData.benefits) productToUpdate.benefits = validatedData.benefits;
        if (validatedData.usageInstructions) productToUpdate.usageInstructions = validatedData.usageInstructions;
        if (validatedData.ingredients) productToUpdate.ingredients = validatedData.ingredients;
        if (validatedData.isActive !== undefined) productToUpdate.isActive = validatedData.isActive;


        const updatedProduct = await productToUpdate.save();

        return res.status(200).json({
          message: 'Product updated successfully.',
          product: updatedProduct,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          return res
            .status(400)
            .json({ message: 'Validation failed.', errors: error.errors });
        }
        if (error instanceof Error && (error as any).code === 11000 && (error as any).keyPattern?.slug) {
            return res.status(409).json({ message: 'A product with the generated or provided slug already exists.' });
        }
        console.error('Update Product Error:', error);
        return res
          .status(500)
          .json({ message: 'Internal Server Error updating product.' });
      }

    case 'DELETE': // Soft delete
      try {
        const productToDeactivate = await Product.findById(productId);

        if (!productToDeactivate) {
          return res.status(404).json({ message: 'Product not found.' });
        }

        if (!productToDeactivate.isActive) {
            return res.status(400).json({ message: 'Product is already inactive.' });
        }

        productToDeactivate.isActive = false;
        const deactivatedProduct = await productToDeactivate.save();

        return res
          .status(200)
          .json({ message: 'Product deactivated successfully.', product: deactivatedProduct });
      } catch (error) {
        console.error('Deactivate Product Error:', error);
        return res
          .status(500)
          .json({ message: 'Internal Server Error deactivating product.' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed` });
  }
}

export default withAdminAuth(handler);