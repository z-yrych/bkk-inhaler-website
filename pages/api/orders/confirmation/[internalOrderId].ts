import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Order, { IOrder } from '@/lib/models/Order'; // Import your IOrder interface

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { internalOrderId } = req.query;

  if (!internalOrderId || typeof internalOrderId !== 'string' || !mongoose.Types.ObjectId.isValid(internalOrderId)) {
    return res.status(400).json({ message: 'Valid Internal Order ID is required in the URL path.' });
  }

  try {
    await dbConnect();

    // Select only the fields needed for the confirmation page
    // Avoid sending sensitive payment details or extensive admin notes here.
    const order: Partial<IOrder> | null = await Order.findById(internalOrderId)
      .select(
        'orderId customerDetails.firstName customerDetails.email orderItems.name orderItems.quantity orderItems.priceAtPurchase orderItems.image totalAmount orderStatus createdAt'
      );
      // Note: If orderItems.productId was populated and you wanted product slug/name from there:
      // .populate({
      //   path: 'orderItems.productId',
      //   select: 'name slug images' // example fields from Product model
      // });


    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Optional: You might want to check if the order status is appropriate
    // (e.g., PAYMENT_CONFIRMED or PROCESSING) before returning details,
    // but since the user was redirected by PayMongo to success, it's likely confirmed.
    // The webhook is the source of truth for the *actual* status update.
    // This endpoint just provides data for the UI.

    // If you populated productId, the structure of orderItems would change.
    // For the .select() above, orderItems will be an array of objects like:
    // { name: 'Product Name', quantity: 2, priceAtPurchase: 1000, image: 'url' }

    return res.status(200).json({ order });

  } catch (error) {
    console.error(`Error fetching order confirmation (ID: ${internalOrderId}):`, error);
    return res.status(500).json({ message: 'Internal Server Error fetching order details.' });
  }
}