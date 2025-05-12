// pages/api/admin/stats/index.ts
import { NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Product from '@/lib/models/Product';
import Order from '@/lib/models/Order';
import {
  withAdminAuth,
  NextApiRequestWithAdmin,
} from '@/lib/middleware/authMiddleware';

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  // Add more stats as needed, e.g., totalRevenue (requires aggregation)
}

async function handler(
  req: NextApiRequestWithAdmin,
  res: NextApiResponse<DashboardStats | { message: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    await dbConnect();

    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const inactiveProducts = totalProducts - activeProducts;

    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'PENDING_PAYMENT' });
    const confirmedOrders = await Order.countDocuments({ orderStatus: 'PAYMENT_CONFIRMED' });
    const processingOrders = await Order.countDocuments({ orderStatus: 'PROCESSING' });
    const shippedOrders = await Order.countDocuments({ orderStatus: 'SHIPPED_LOCAL' }); // Or include SHIPPED_INTERNATIONAL
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'DELIVERED' });


    const stats: DashboardStats = {
      totalProducts,
      activeProducts,
      inactiveProducts,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
    };

    return res.status(200).json(stats);

  } catch (error) {
    console.error('Admin Dashboard Stats API Error:', error);
    return res.status(500).json({ message: 'Internal Server Error fetching dashboard stats.' });
  }
}

export default withAdminAuth(handler); // Secure this endpoint
