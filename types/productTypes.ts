// types/productTypes.ts
export interface IProductData {
    _id: string; // Or id: string, depending on your API response transform
    name: string;
    slug: string;
    description: string;
    price: number; // In cents
    stockQuantity: number;
    images: string[]; // Array of URLs
    scentProfile?: string[];
    benefits?: string[];
    usageInstructions?: string;
    ingredients?: string[];
    isActive: boolean; // Public API should only return active: true, but good to have
    createdAt: string | Date;
    updatedAt: string | Date;
    // Add any other fields your product API returns
  }