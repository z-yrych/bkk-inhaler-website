// pages/api/auth/login.ts
import { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import jwt, { SignOptions } from "jsonwebtoken";
import {
  AdminLoginSchema,
  AdminLoginInput,
} from "@/lib/validators/adminAuthValidators";
import { ZodError } from "zod";

// This string will be used for expiresIn, and we'll assert its type later.
const JWT_EXPIRES_IN_STRING: string = process.env.JWT_EXPIRES_IN || "1d"; // Default to '1 day'

if (!process.env.JWT_SECRET) {
  console.error(
    "FATAL ERROR: JWT_SECRET environment variable is not defined. Application will not function correctly."
  );
  // Consider throwing an error here to prevent startup if critical,
  // though the handler check provides runtime safety.
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ message: `Method ${req.method} Not Allowed` });
  }

  const currentJwtSecret = process.env.JWT_SECRET;

  if (!currentJwtSecret) {
    console.error(
      "Login attempt failed: JWT_SECRET is not configured for this request."
    );
    return res.status(500).json({
      message:
        "Server authentication configuration error (JWT Secret missing).",
    });
  }

  try {
    await dbConnect();

    const validatedData = AdminLoginSchema.parse(req.body as AdminLoginInput);

    const adminUser = await User.findOne({
      email: validatedData.email,
      role: "ADMIN",
    }).select("+password");

    if (!adminUser) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordMatch = await adminUser.comparePassword(
      validatedData.password
    );
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const tokenPayload = {
      userId: String(adminUser._id), // Ensure userId is a string in the payload
      role: adminUser.role,
      email: adminUser.email,
    };

    const signOptions: SignOptions = {
      // We know JWT_EXPIRES_IN_STRING will be like "1d", "7h", etc.,
      // which is a valid format for the 'ms' library used by jsonwebtoken.
      // We use 'as any' to satisfy TypeScript's strictness for ms.StringValue
      // when our variable is typed as a generic 'string'.
      expiresIn: JWT_EXPIRES_IN_STRING as any,
    };

    const token = jwt.sign(tokenPayload, currentJwtSecret, signOptions);

    const userResponse = {
      id: adminUser._id,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      email: adminUser.email,
      role: adminUser.role,
    };

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: userResponse,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res
        .status(400)
        .json({ message: "Validation failed.", errors: error.errors });
    }
    console.error("Admin Login Error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(500).json({ message: `JWT Error: ${error.message}` });
    }
    return res
      .status(500)
      .json({ message: "Internal Server Error during admin login." });
  }
}
