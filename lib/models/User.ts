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
export interface IUserModel extends Model<IUser> {}

const UserSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      // Basic email format validation
      match: [/.+@.+\..+/, 'Please enter a valid email address.'],
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      select: false, // Do not return password by default in queries
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
    timestamps: true, // Adds createdAt and updatedAt timestamps
    toJSON: {
      virtuals: true, // Ensure virtuals are included in toJSON output
      transform: (_doc, ret) => {
        delete ret.password; // Remove password hash from JSON responses
        delete ret.__v; // Remove Mongoose version key
        // Optionally, transform _id to id
        // ret.id = ret._id;
        // delete ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true, // Ensure virtuals are included in toObject output
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

// Virtual for fullName
UserSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save hook for password hashing
UserSchema.pre<IUser>('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    // Pass error to the next middleware/error handler
    next(error as Error); // Cast to Error type
  }
});

// Method to compare password for login
UserSchema.methods.comparePassword = function (candidatePassword: string): Promise<boolean> {
  // this.password will be undefined here if 'select: false' is active and
  // the document was fetched without explicitly selecting the password.
  // Ensure password field is selected before calling this method if needed,
  // or fetch the user with password for authentication.
  // However, for a new user or when password is set, this.password is available.
  // For comparison, bcrypt.compare handles the undefined case gracefully if this.password is undefined by returning false.
  if (!this.password && this.isNew) { // Should not happen if password is required
      return Promise.resolve(false);
  }
  // When fetching a user to compare password, ensure to .select('+password')
  return bcrypt.compare(candidatePassword, this.password || '');
};

// Ensure the model is not redefined during hot-reloading
const User = (mongoose.models.User as IUserModel) || mongoose.model<IUser, IUserModel>('User', UserSchema);

export default User;