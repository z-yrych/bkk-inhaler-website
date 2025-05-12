// pages/api/auth/me.ts
import { NextApiResponse } from 'next';
import { withAdminAuth, NextApiRequestWithAdmin } from '@/lib/middleware/authMiddleware';

// Handler function that now expects the adminUser from the middleware
async function meHandler(req: NextApiRequestWithAdmin, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // req.adminUser is guaranteed to be populated by withAdminAuth if execution reaches here
  // The user object from middleware already has password excluded.
  const adminDetails = req.adminUser!; // Use non-null assertion as middleware ensures it

  return res.status(200).json({
    message: 'Admin details fetched successfully.',
    user: {
        id: adminDetails._id,
        firstName: adminDetails.firstName,
        lastName: adminDetails.lastName,
        email: adminDetails.email,
        role: adminDetails.role,
        createdAt: adminDetails.createdAt,
        updatedAt: adminDetails.updatedAt,
    }
  });
}

// Wrap the handler with the authentication middleware
export default withAdminAuth(meHandler);