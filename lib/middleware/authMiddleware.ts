import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import jwt, { JwtPayload } from 'jsonwebtoken';
import dbConnect from '@/lib/dbConnect'; // Assuming absolute path, adjust if needed
import User, { IUser } from '@/lib/models/User'; // Assuming absolute path

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  // Potentially exit or throw a more descriptive startup error if this is critical at module load time
  // For now, routes using this middleware will fail if JWT_SECRET is missing.
}

export interface NextApiRequestWithAdmin extends NextApiRequest {
  adminUser?: IUser; // Add the adminUser property
}

type AdminApiHandler = (
  req: NextApiRequestWithAdmin,
  res: NextApiResponse
) => void | Promise<void>;

export function withAdminAuth(handler: AdminApiHandler): NextApiHandler {
  return async (req: NextApiRequestWithAdmin, res: NextApiResponse) => {
    if (!JWT_SECRET) {
      console.error('Authentication error: JWT_SECRET is not configured.');
      return res.status(500).json({ message: 'Server authentication configuration error.' });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token missing or malformed.' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing.' });
    }

    try {
      await dbConnect();
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

      if (!decoded.userId || decoded.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Invalid token payload or insufficient permissions.' });
      }

      // Fetch user and ensure password is not selected
      const adminUser = await User.findById(decoded.userId).select('-password');

      if (!adminUser) {
        return res.status(401).json({ message: 'Unauthorized: Admin user not found.' });
      }

      if (adminUser.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden: User does not have admin privileges.' });
      }

      req.adminUser = adminUser; // Attach admin user to the request object
      return handler(req, res);

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: `Unauthorized: ${error.message}` });
      }
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: 'Unauthorized: Token expired.' });
      }
      console.error('Admin Auth Middleware Error:', error);
      return res.status(500).json({ message: 'Internal Server Error during authentication.' });
    }
  };
}