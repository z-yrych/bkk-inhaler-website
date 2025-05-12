import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import withAdminAuth, { AdminAuthProps } from '@/components/auth/withAdminAuth';
import ProductForm, { ProductFormProps } from '@/components/admin/ProductForm'; // Adjust path if needed
import { IProductData } from '@/types/productTypes'; // For the data type

const CreateProductPage: React.FC<AdminAuthProps> = ({ adminUser }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); // General form error from API
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleCreateProduct = async (data: Partial<IProductData>) => {
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const token = localStorage.getItem('adminToken'); // Or from useAuth().token
      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // result.errors might be an array of Zod issues if backend validation fails after client-side
        const errorMessage = result.message || (result.errors ? result.errors.map((e: any) => e.message).join(', ') : 'Failed to create product.');
        throw new Error(errorMessage);
      }

      setFormSuccess(`Product "${result.product.name}" created successfully! Redirecting...`);
      // Redirect to the product list or the new product's edit page
      setTimeout(() => {
        router.push(`/admin/products/${result.product._id}`); // Redirect to edit page of the new product
        // Or router.push('/admin/products'); // Redirect to product list
      }, 2000);

    } catch (error: any) {
      console.error("Error creating product:", error);
      setFormError(error.message || 'An unexpected error occurred.');
      setIsSubmitting(false); // Ensure button is re-enabled on error
    }
    // No setIsSubmitting(false) here if redirecting, to keep button disabled
  };

  // Initial data for a new product (mostly empty or defaults)
  // The ProductForm itself handles its internal state based on these undefined/empty initial values
  const initialProductData: Partial<IProductData> = {
    isActive: true, // Default new products to active
    images: [''],   // Start with one empty image field in the form
    // Other fields will default to empty strings or initial values within ProductForm
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <Head>
        <title>Admin - Create New Product</title>
      </Head>

      <div style={{ marginBottom: '20px' }}>
        <Link href="/admin/products" legacyBehavior>
          <a style={{ textDecoration: 'none', color: '#0070f3' }}>&larr; Back to Product List</a>
        </Link>
      </div>

      <h1>Create New Product</h1>

      {formSuccess && <p style={{ color: 'green', backgroundColor: '#e6ffed', padding: '10px', border: '1px solid green', borderRadius: '4px' }}>{formSuccess}</p>}
      
      <ProductForm
        // initialData is not strictly needed here if ProductForm defaults to empty/initial states
        // but passing explicit defaults for certain fields like isActive can be good.
        initialData={initialProductData} 
        onSubmit={handleCreateProduct}
        isSubmitting={isSubmitting}
        submitButtonText="Create Product"
        formError={formError} // Pass the general form error to ProductForm
      />
    </div>
  );
};

export default withAdminAuth(CreateProductPage);