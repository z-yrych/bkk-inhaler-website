import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Product from '@/lib/models/Product'; // Assuming IProduct is part of Product.ts or imported separately

// Define a type for sort order if you want to be strict
type SortOrder = 'asc' | 'desc' | 1 | -1;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    await dbConnect();

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12; // Default to 12 products per page
    const skip = (page - 1) * limit;

    // Sorting parameters
    const sortBy = (req.query.sortBy as string) || 'createdAt'; // Default sort by creation date
    const sortOrderQuery = (req.query.sortOrder as string)?.toLowerCase() || 'desc'; // Default to descending
    const sortOrder: SortOrder = sortOrderQuery === 'asc' ? 1 : -1;

    // Build sort object
    const sortOptions: { [key: string]: SortOrder } = {};
    // Basic validation for sortBy field to prevent arbitrary field sorting if needed
    // For now, we'll allow common fields; you might want to restrict this to indexed fields
    if (['name', 'price', 'createdAt', 'updatedAt'].includes(sortBy)) {
      sortOptions[sortBy] = sortOrder;
    } else {
      sortOptions['createdAt'] = -1; // Default sort if sortBy is invalid
    }

    // Fetch active products with pagination and sorting
    const products = await Product.find({ isActive: true })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // Get total count of active products for pagination info
    const totalActiveProducts = await Product.countDocuments({ isActive: true });

    if (!products) { // Should return empty array if no products, not null
        return res.status(200).json({
            message: 'No active products found.',
            products: [],
            currentPage: page,
            totalPages: 0,
            totalProducts: 0,
        });
    }

    return res.status(200).json({
      message: 'Active products fetched successfully.',
      products,
      currentPage: page,
      totalPages: Math.ceil(totalActiveProducts / limit),
      totalProducts: totalActiveProducts,
    });

  } catch (error) {
    console.error('List Public Products Error:', error);
    // In a production app, you might want to avoid sending back detailed error messages
    return res
      .status(500)
      .json({ message: 'Internal Server Error fetching products.' });
  }

  
}

