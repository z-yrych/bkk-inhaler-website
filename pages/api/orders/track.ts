// pages/api/orders/track.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { ZodError } from 'zod';
import dbConnect from '@/lib/dbConnect';
import Order, { IOrder } from '@/lib/models/Order'; // Assuming IOrder is your Mongoose document interface
import { TrackOrderSchema, TrackOrderInput } from '@/lib/validators/orderValidators';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    await dbConnect();

    // Validate request body
    const validatedData = TrackOrderSchema.parse(req.body as TrackOrderInput);
    const { orderId, email } = validatedData;

    // Find the order by the custom orderId
    // We need to ensure the email matches for security/privacy
    const order: IOrder | null = await Order.findOne({
      orderId: orderId, // Query by your custom, human-readable orderId
      'customerDetails.email': email.toLowerCase(), // Ensure email matches, case-insensitive
    }).select(
      'orderId orderStatus createdAt orderItems.name orderItems.quantity orderItems.priceAtPurchase orderItems.image totalAmount customerDetails.firstName shippingInfo.courier shippingInfo.trackingNumber shippingInfo.shippedDate'
    ); // Select only non-sensitive fields to return

    if (!order) {
      return res.status(404).json({
        message: 'Order not found, or email does not match. Please check your details and try again.',
      });
    }

    // If order is found and email matched, return the selected details
    return res.status(200).json({
      message: 'Order details fetched successfully.',
      order: {
        orderId: order.orderId,
        status: order.orderStatus,
        orderDate: order.createdAt,
        items: order.orderItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase, // In cents
          image: item.image,
        })),
        totalAmount: order.totalAmount, // In cents
        customerFirstName: order.customerDetails.firstName, // For a personalized message
        // Include shipping info if available and relevant for tracking display
        shippingInfo: order.shippingInfo?.trackingNumber // Only send tracking if it exists
          ? {
              courier: order.shippingInfo.courier,
              trackingNumber: order.shippingInfo.trackingNumber,
              shippedDate: order.shippingInfo.shippedDate,
            }
          : undefined,
      },
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Invalid input.', errors: error.errors });
    }
    console.error('Track Order API Error:', error);
    return res.status(500).json({ message: 'Internal Server Error processing your request.' });
  }
}
