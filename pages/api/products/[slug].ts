import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Product from '@/lib/models/Product'; // Assuming IProduct is part of Product.ts or imported separately

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ message: 'Product slug is required and must be a string.' });
  }

  try {
    await dbConnect();

    // Find a single product by its slug and ensure it's active
    const product = await Product.findOne({ slug: slug, isActive: true });

    if (!product) {
      return res.status(404).json({ message: `Product with slug "${slug}" not found or is not active.` });
    }

    return res.status(200).json({
      message: 'Product fetched successfully.',
      product,
    });

  } catch (error) {
    console.error(`Error fetching product with slug "${slug}":`, error);
    // In a production app, you might want to avoid sending back detailed error messages
    return res
      .status(500)
      .json({ message: 'Internal Server Error fetching product.' });
  }
}