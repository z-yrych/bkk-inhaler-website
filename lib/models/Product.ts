import mongoose, { Schema, Document, Model } from 'mongoose';
import slugify from 'slugify';

export interface IProduct extends Document {
  name: string;
  slug: string; // URL-friendly, unique
  description: string;
  price: number; // In cents
  stockQuantity: number;
  images: string[]; // Array of URLs
  scentProfile: string[];
  benefits: string[];
  usageInstructions: string;
  ingredients: string[];
  isActive: boolean; // For soft deletes/visibility
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductModel extends Model<IProduct> {}

const ProductSchema = new Schema<IProduct, IProductModel>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required.'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters.'],
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      // Slug will be auto-generated if not provided
    },
    description: {
      type: String,
      required: [true, 'Product description is required.'],
      trim: true,
    },
    price: { // Stored in cents
      type: Number,
      required: [true, 'Product price is required.'],
      min: [0, 'Price cannot be negative.'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for price (cents).',
      },
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required.'],
      min: [0, 'Stock quantity cannot be negative.'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for stock quantity.',
      },
    },
    images: { // Array of image URLs
      type: [String],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0 && v.every(url => typeof url === 'string' && url.startsWith('http')),
        message: 'At least one product image URL (starting with http) is required.',
      },
      required: [true, 'At least one product image is required.'],
    },
    scentProfile: {
      type: [String],
      default: [],
    },
    benefits: {
      type: [String],
      default: [],
    },
    usageInstructions: {
      type: String,
      trim: true,
      default: '',
    },
    ingredients: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true, // Products are active by default
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        // ret.id = ret._id;
        // delete ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        // ret.id = ret._id;
        // delete ret._id;
        return ret;
      },
    },
  }
);

// Pre-save hook to generate slug from name if slug is not present or name is modified
ProductSchema.pre<IProduct>('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true, replacement: '-' });
  }
  next();
});

// Indexing for faster queries on name and slug
ProductSchema.index({ name: 'text', slug: 1 }); // Text index for name searching, regular index for slug

const Product = (mongoose.models.Product as IProductModel) || mongoose.model<IProduct, IProductModel>('Product', ProductSchema);

export default Product; 