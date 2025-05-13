// lib/models/User.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password?: string; // Optional in interface due to 'select: false', but required in schema
  firstName: string;
  lastName: string;
  role: 'ADMIN'; // For MVP, only ADMIN role is relevant for this User model
  fullName: string; // Virtual
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Interface for User model statics (if any, though not used in this basic version)
// FIXED: Error 17:18 - Added eslint-disable for no-empty-object-type
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IUserModel extends Model<IUser> {}

const UserSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, 'Please enter a valid email address.'],
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      select: false,
      minlength: [8, 'Password must be at least 8 characters long.'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required.'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required.'],
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ['ADMIN'],
        message: '{VALUE} is not a supported role. Only ADMIN is allowed.',
      },
      default: 'ADMIN',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        // ret.id = ret._id; // Mongoose 'id' virtual handles this
        // delete ret._id; // Not needed if 'id' virtual is used
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        // ret.id = ret._id;
        // delete ret._id;
        return ret;
      },
    },
  }
);

UserSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) { // error is unknown by default
    // Pass error to the next middleware/error handler
    // Ensure the error is cast or handled as an Error type for next()
    if (error instanceof Error) {
        next(error);
    } else {
        next(new Error('An unknown error occurred during password hashing.'));
    }
  }
});

UserSchema.methods.comparePassword = function (candidatePassword: string): Promise<boolean> {
  if (!this.password && this.isNew) {
      return Promise.resolve(false);
  }
  return bcrypt.compare(candidatePassword, this.password || '');
};

const User = (mongoose.models.User as IUserModel) || mongoose.model<IUser, IUserModel>('User', UserSchema);

export default User;
