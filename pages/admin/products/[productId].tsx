import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import withAdminAuth, { AdminAuthProps } from "@/components/auth/withAdminAuth";
import ProductForm from "@/components/admin/ProductForm";
import { IProductData } from "@/types/productTypes";

interface ApiErrorDetail {
  message: string;
  path?: (string | number)[]; // Example for Zod-like errors
  // Add other potential error properties
}

// No ProductEditPageProps needed from GSSP anymore, AdminAuthProps is sufficient
const EditProductPage: React.FC<AdminAuthProps> = ({ adminUser }) => {
  const router = useRouter();
  const { productId } = router.query; // Get productId from URL

  const [product, setProduct] = useState<IProductData | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For fetching product data
  const [error, setError] = useState<string | null>(null); // For fetching error

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!productId || typeof productId !== "string") {
      setError("Product ID missing or invalid in URL.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        // This should ideally be caught by withAdminAuth redirecting to login
        throw new Error("Authentication required.");
      }
      const res = await fetch(`/api/admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json(); // Define ProductApiResponse if needed
      if (!res.ok) {
        throw new Error(
          data.message || `Failed to fetch product: ${res.statusText}`
        );
      }
      if (data.product) {
        setProduct(data.product);
      } else {
        setError("Product not found or data missing.");
      }
    } catch (err) {
      // FIXED: Error at 48:19
      console.error("Error fetching product for edit:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred while fetching the product.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId && adminUser) {
      // Fetch only when productId is available and admin is authenticated
      fetchProduct();
    }
  }, [productId, adminUser, fetchProduct]);

  const handleUpdateProduct = async (data: Partial<IProductData>) => {
    // ... your existing handleUpdateProduct logic ...
    // It will use the productId from router.query
    if (!productId || typeof productId !== "string") {
      setFormError("Product ID is missing. Cannot update.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) throw new Error("Authentication token not found.");

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      interface ProductUpdateApiResponse {
        // This interface is local to this function scope
        message: string;
        product: IProductData;
        errors?: ApiErrorDetail[]; // Use ApiErrorDetail here too
      }

      const result: ProductUpdateApiResponse = await response.json();

      if (!response.ok) {
        // FIXED: Error at 87:91 - Typed 'e' in map (using ApiErrorDetail)
        const errorMessage =
          result.message ||
          (result.errors
            ? result.errors.map((e: ApiErrorDetail) => e.message).join(", ")
            : "Failed to update product.");
        throw new Error(errorMessage);
      }
      setFormSuccess(`Product "${result.product.name}" updated successfully!`);
      setProduct(result.product);
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (error) {
      // FIXED: Error at 94:21
      console.error("Error updating product:", error);
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError(
          "An unexpected error occurred while updating the product."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!adminUser) return <p>Authenticating...</p>; // Should be handled by HOC redirect
  if (isLoading)
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading product data...
      </div>
    );
  if (error)
    return (
      <div style={{ padding: "20px", color: "red", textAlign: "center" }}>
        Error: {error}{" "}
        <Link href="/admin/products" legacyBehavior>
          <a>&larr; Back to Product List</a>
        </Link>
      </div>
    );
  if (!product)
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Product not found.{" "}
        <Link href="/admin/products" legacyBehavior>
          <a>&larr; Back to Product List</a>
        </Link>
      </div>
    );

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "800px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <Head>
        <title>Admin - Edit Product: {product?.name || "Product"}</title>
      </Head>
      <div style={{ marginBottom: "20px" }}>
        <Link href="/admin/products" legacyBehavior>
          <a style={{ textDecoration: "none", color: "#0070f3" }}>
            &larr; Back to Product List
          </a>
        </Link>
      </div>
      <h1>Edit Product: {product.name}</h1>
      <p>
        <small>Product ID: {product._id}</small>
      </p>
      {formSuccess && <p style={{ color: "green" /* ... */ }}>{formSuccess}</p>}
      <ProductForm
        initialData={product} // Pass the fetched product as initialData
        onSubmit={handleUpdateProduct}
        isSubmitting={isSubmitting}
        submitButtonText="Update Product"
        formError={formError}
      />
    </div>
  );
};

export default withAdminAuth(EditProductPage);
