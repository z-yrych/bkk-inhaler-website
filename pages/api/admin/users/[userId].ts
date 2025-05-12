import { NextApiResponse } from 'next';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import User, { IUser } from '@/lib/models/User';
import {
  AdminUserUpdateSchema,
  AdminUserUpdateInput,
} from '@/lib/validators/adminUserValidators';
import {
  withAdminAuth,
  NextApiRequestWithAdmin,
} from '@/lib/middleware/authMiddleware';

async function handler(
  req: NextApiRequestWithAdmin,
  res: NextApiResponse
) {
  const { userId } = req.query;

  console.log('Received raw userId from query:', userId); // <-- ADD THIS LINE
  console.log('Type of userId:', typeof userId);  

  if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid User ID format.' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const adminUser = await User.findOne({ _id: userId, role: 'ADMIN' });
        // Password exclusion is handled by the User model's toJSON transform

        if (!adminUser) {
          return res.status(404).json({ message: 'Admin user not found.' });
        }
        return res.status(200).json({ user: adminUser });
      } catch (error) {
        console.error('Get Admin User Error:', error);
        return res
          .status(500)
          .json({ message: 'Internal Server Error fetching admin user.' });
      }

    case 'PUT':
      try {
        const validatedData = AdminUserUpdateSchema.parse(req.body as AdminUserUpdateInput);

        // Ensure there's something to update
        if (Object.keys(validatedData).length === 0) {
            return res.status(400).json({ message: 'No update data provided.' });
        }

        const adminUserToUpdate = await User.findOne({ _id: userId, role: 'ADMIN' });

        if (!adminUserToUpdate) {
          return res.status(404).json({ message: 'Admin user not found.' });
        }

        // If email is being changed, check for conflicts
        if (validatedData.email && validatedData.email.toLowerCase() !== adminUserToUpdate.email) {
          const existingUserWithNewEmail = await User.findOne({
            email: validatedData.email.toLowerCase(),
            _id: { $ne: userId }, // Exclude the current user from the check
          });
          if (existingUserWithNewEmail) {
            return res
              .status(409)
              .json({ message: 'This email is already in use by another user.' });
          }
          adminUserToUpdate.email = validatedData.email.toLowerCase();
        }

        if (validatedData.firstName) adminUserToUpdate.firstName = validatedData.firstName;
        if (validatedData.lastName) adminUserToUpdate.lastName = validatedData.lastName;

        // If password is provided in the validated data, it means it should be updated.
        // The pre-save hook in the User model will hash it.
        if (validatedData.password) {
          adminUserToUpdate.password = validatedData.password;
        }

        const updatedAdminUser = await adminUserToUpdate.save();
        // Password exclusion is handled by the User model's toJSON transform

        return res.status(200).json({
          message: 'Admin user updated successfully.',
          user: updatedAdminUser,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          return res
            .status(400)
            .json({ message: 'Validation failed.', errors: error.errors });
        }
        if (error instanceof Error && (error as any).code === 11000 && (error as any).keyPattern?.email) {
            return res.status(409).json({ message: 'This email is already in use by another user (database constraint).' });
        }
        console.error('Update Admin User Error:', error);
        return res
          .status(500)
          .json({ message: 'Internal Server Error updating admin user.' });
      }

    case 'DELETE':
      try {
        // Prevent admin from deleting themselves
        if (req.adminUser && req.adminUser.id === userId) {
          return res
            .status(403)
            .json({ message: 'Admins cannot delete their own account.' });
        }

        const result = await User.deleteOne({ _id: userId, role: 'ADMIN' });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'Admin user not found or already deleted.' });
        }

        return res
          .status(200)
          .json({ message: 'Admin user deleted successfully.' });
          // Alternatively, return 204 No Content with no body:
          // return res.status(204).end();
      } catch (error) {
        console.error('Delete Admin User Error:', error);
        return res
          .status(500)
          .json({ message: 'Internal Server Error deleting admin user.' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed` });
  }
}

export default withAdminAuth(handler);