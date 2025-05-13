// pages/admin/products/new.tsx
import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import withAdminAuth, { AdminAuthProps } from "@/components/auth/withAdminAuth";
import AdminLayout from "@/components/layout/AdminLayout"; // Import AdminLayout
import ProductForm from "@/components/admin/ProductForm"; // ProductFormProps is not needed here if only ProductForm is used
import { IProductData } from "@/types/productTypes";
import { ChevronLeft, CheckCircle, AlertCircle } from "lucide-react";

// Define a more specific type for API errors (e.g., Zod issues from backend)
interface ApiErrorDetail {
  message: string;
  path?: (string | number)[];
}

interface ProductCreateApiResponse {
  message: string;
  product: IProductData; // Expect the created product back
  errors?: ApiErrorDetail[];
}

// Content component for the "Create Product" page
const CreateProductPageContent: React.FC<AdminAuthProps> = ({
}) => {
  // FIXED: adminUser prefixed with _ if not used
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleCreateProduct = async (data: Partial<IProductData>) => {
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result: ProductCreateApiResponse = await response.json();

      if (!response.ok) {
        // FIXED: Error at 39:87 - Typed 'e' in map
        const errorMessage =
          result.message ||
          (result.errors
            ? result.errors.map((e: ApiErrorDetail) => e.message).join(", ")
            : "Failed to create product.");
        throw new Error(errorMessage);
      }

      setFormSuccess(
        `Product "${result.product.name}" created successfully! Redirecting...`
      );
      setTimeout(() => {
        router.push(`/admin/products/${result.product._id}`); // Redirect to edit page of the new product
      }, 2000);
    } catch (error) {
      // FIXED: Error at 50:21 - Typed error
      console.error("Error creating product:", error);
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError(
          "An unexpected error occurred while creating the product."
        );
      }
      setIsSubmitting(false);
    }
    // No setIsSubmitting(false) here if redirecting successfully, to keep button disabled
  };

  const initialProductData: Partial<IProductData> = {
    isActive: true,
    images: [""],
    name: "", // Initialize all fields ProductForm might expect if not truly optional
    description: "",
    price: 0, // Represented as cents, ProductForm will handle display conversion
    stockQuantity: 0,
    scentProfile: [],
    benefits: [],
    usageInstructions: "",
    ingredients: [],
  };

  return (
    <>
      <Head>
        {/* AdminLayout sets a general title, this can be for specific meta if needed */}
        <meta
          name="description"
          content="Create a new product for InhalerStore."
        />
      </Head>

      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800">
          Create New Product
        </h2>
        <Link href="/admin/products" legacyBehavior>
          <a className="text-sm text-blue-600 hover:underline flex items-center">
            <ChevronLeft size={18} className="mr-1" /> Back to Product List
          </a>
        </Link>
      </div>

      {formSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-300 text-green-700 rounded-lg flex items-center">
          <CheckCircle size={20} className="mr-2 text-green-600" />
          {formSuccess}
        </div>
      )}
      {formError && ( // Display general form error from API/submission logic
        <div className="mb-4 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg flex items-center">
          <AlertCircle size={20} className="mr-2 text-red-600" />
          {formError}
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-gray-200">
        <ProductForm
          // initialData is passed to pre-fill parts of the form, like isActive
          initialData={initialProductData}
          onSubmit={handleCreateProduct}
          isSubmitting={isSubmitting}
          submitButtonText="Create Product"
          // ProductForm will display its own field-specific Zod errors.
          // formError prop here is for errors from the submission process itself (e.g., API errors).
          // If ProductForm also has a prop to display a general error, you can use formError for that too.
        />
      </div>
    </>
  );
};

// Wrapper component that uses the AdminLayout
const CreateProductPageWithLayout: React.FC<AdminAuthProps> = (props) => {
  return (
    <AdminLayout pageTitle="Create New Product">
      <CreateProductPageContent {...props} />
    </AdminLayout>
  );
};

export default withAdminAuth(CreateProductPageWithLayout);
