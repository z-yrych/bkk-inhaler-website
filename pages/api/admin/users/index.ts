import { NextApiResponse } from 'next';
import { ZodError } from 'zod';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/User'; // Assuming IUser includes necessary fields
import {
  AdminRegistrationSchema,
  AdminRegistrationInput,
} from '@/lib/validators/adminAuthValidators';
import {
  withAdminAuth,
  NextApiRequestWithAdmin,
} from '@/lib/middleware/authMiddleware';

interface MongooseDuplicateKeyError extends Error { // Ensure this Error is the built-in Error
    code?: number;
    keyPattern?: { [key: string]: number };
    keyValue?: { [key: string]: unknown };
}

async function handler(
  req: NextApiRequestWithAdmin,
  res: NextApiResponse
) {
  await dbConnect();

  switch (req.method) {
    case 'POST':
      try {
        // The user making the request (req.adminUser) is already authenticated as an admin by withAdminAuth
        // req.adminUser can be used for logging or authorization checks if needed, e.g., only super-admins can create other admins.
        // For now, any admin can create another admin.

        const validatedData = AdminRegistrationSchema.parse(req.body as AdminRegistrationInput);

        const existingUser = await User.findOne({
          email: validatedData.email.toLowerCase(), // Ensure consistent email check
        });

        if (existingUser) {
          return res
            .status(409)
            .json({ message: 'Admin user with this email already exists.' });
        }

        // Password will be hashed by the pre-save hook in the User model
        const newUser = new User({
          ...validatedData,
          email: validatedData.email.toLowerCase(), // Store email in lowercase
          role: 'ADMIN', // Explicitly set role, though schema defaults it
        });

        await newUser.save();

        // Exclude password from the response object.
        // The User model's toJSON method should handle this, but being explicit is fine.
        const userResponse = {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          fullName: newUser.fullName, // If you have virtuals like fullName
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
        };

        return res
          .status(201)
          .json({ message: 'Admin user created successfully.', user: userResponse });
      } catch (error) {
        if (error instanceof ZodError) {
          return res
            .status(400)
            .json({ message: 'Validation failed.', errors: error.errors });
        }
        // Handle Mongoose duplicate key error for email specifically if not caught by findOne
        if (error instanceof Error && (error as MongooseDuplicateKeyError).code === 11000 && (error as MongooseDuplicateKeyError).keyPattern?.email) {
            return res.status(409).json({ message: 'Admin user with this email already exists (database constraint).' });
        }
        console.error('Admin User Creation Error:', error);
        return res
          .status(500)
          .json({ message: 'Internal Server Error creating admin user.' });
      }

    case 'GET':
      try {
        // Fetch all admin users.
        // The User model's toJSON transform should handle password exclusion.
        // If not, explicitly use .select('-password')
        const admins = await User.find({ role: 'ADMIN' }).sort({ createdAt: -1 }); // Sort by newest first

        // The toJSON transform in your User model should strip the password.
        // If you want to be absolutely sure or transform further:
        // const adminList = admins.map(admin => ({
        //   id: admin._id,
        //   firstName: admin.firstName,
        //   lastName: admin.lastName,
        //   fullName: admin.fullName,
        //   email: admin.email,
        //   role: admin.role,
        //   createdAt: admin.createdAt,
        //   updatedAt: admin.updatedAt,
        // }));

        return res.status(200).json({ admins });
      } catch (error) {
        console.error('List Admin Users Error:', error);
        return res
          .status(500)
          .json({ message: 'Internal Server Error fetching admin users.' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed` });
  }
}

export default withAdminAuth(handler); // Protect both GET and POST