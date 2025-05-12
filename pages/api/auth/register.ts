// pages/api/auth/register.ts
import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/User';
import { AdminRegistrationSchema, AdminRegistrationInput } from '@/lib/validators/adminAuthValidators';
import { ZodError } from 'zod';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    await dbConnect();

    const validatedData = AdminRegistrationSchema.parse(req.body as AdminRegistrationInput);

    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return res.status(409).json({ message: 'Admin user with this email already exists.' });
    }

    // Password will be hashed by the pre-save hook in User model
    const newUser = new User({
      ...validatedData,
      role: 'ADMIN', // Explicitly set role, though schema defaults it
    });

    await newUser.save();

    // Exclude password from the response object
    const userResponse = {
      id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return res.status(201).json({ message: 'Admin user registered successfully.', user: userResponse });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation failed.', errors: error.errors });
    }
    if (error instanceof Error && error.message.includes('duplicate key error') && error.message.includes('email')) {
        // Mongoose duplicate key error for email
        return res.status(409).json({ message: 'Admin user with this email already exists (database constraint).' });
    }
    console.error('Admin Registration Error:', error);
    return res.status(500).json({ message: 'Internal Server Error during admin registration.' });
  }
}