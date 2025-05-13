// pages/products/index.tsx
import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import NextImage from "next/image"; // Changed from Image to NextImage to avoid potential conflicts
import { IProductData } from "@/types/productTypes"; // Ensure path is correct
import { useCart } from "@/context/CartContext"; // Ensure path is correct

interface ProductsApiResponse {
  products: IProductData[];
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  message?: string; // Added for consistency with other API responses
  errors?: { message: string }[]; // For potential API errors
}

const formatCurrency = (amountInCents: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amountInCents / 100);
};

const ProductsListPage: React.FC = () => {
  const [products, setProducts] = useState<IProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // TODO: Add pagination state (currentPage, totalPages etc.) and handlers if needed

  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          "/api/products?limit=12&page=1&sortBy=createdAt&sortOrder=desc"
        );
        // Type the response data
        const data: ProductsApiResponse = await res.json();

        if (!res.ok) {
          const errorMsg =
            data.message ||
            data.errors?.[0]?.message || // Access first error message if array
            "Failed to fetch products";
          throw new Error(errorMsg);
        }

        setProducts(data.products || []);
        // TODO: Set pagination state here from data (data.currentPage, data.totalPages, etc.)
      } catch (err) {
        // FIXED: Error at 51:21 - Typed err
        console.error("Fetch products error:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred while fetching products.");
        }
        setProducts([]); // Clear products on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <p className="text-xl text-gray-600">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)] text-center">
        <p className="text-xl text-red-600">Error: {error}</p>
        <Link href="/" legacyBehavior>
          <a className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
            Go to Homepage
          </a>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 font-sans">
      <Head>
        <title>Our Products - InhalerStore</title>
        <meta
          name="description"
          content="Browse our collection of high-quality scented inhalers."
        />
      </Head>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-10 pb-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800">
            Our Inhaler Collection
          </h1>
          <p className="text-md sm:text-lg text-gray-600 mt-3">
            Discover your perfect scent and embrace tranquility.
          </p>
        </header>

        {products.length === 0 && !isLoading && (
          <p className="text-center text-gray-500 text-lg py-10">
            No products available at the moment. Please check back soon!
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 xl:gap-8">
          {products.map((product) => (
            <div
              key={product._id}
              className="bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out flex flex-col overflow-hidden group"
            >
              <Link href={`/products/${product.slug}`} legacyBehavior>
                <a className="block">
                  <div className="w-full h-64 overflow-hidden">
                    {/* Using NextImage to address the warning */}
                    <NextImage
                      src={product.images[0] || "/placeholder-image.jpg"}
                      alt={product.name}
                      width={400} // Provide appropriate width
                      height={300} // Provide appropriate height
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-blue-700 transition-colors duration-300 min-h-[3em] leading-tight">
                      {product.name}
                    </h2>
                    <p className="text-lg font-bold text-blue-600 my-2">
                      {formatCurrency(product.price)}
                    </p>
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed flex-grow min-h-[3.6em]">
                      {product.description.substring(0, 90)}
                      {product.description.length > 90 ? "..." : ""}
                    </p>
                  </div>
                </a>
              </Link>
              <div className="p-5 pt-0 mt-auto">
                <button
                  className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-4  ${
                    product.stockQuantity === 0
                      ? "bg-gray-400 cursor-not-allowed focus:ring-gray-300"
                      : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:ring-green-300 transform hover:scale-105"
                  }`}
                  onClick={() => addToCart(product, 1)}
                  disabled={product.stockQuantity === 0}
                >
                  {product.stockQuantity === 0 ? "Out of Stock" : "Add to Cart"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* TODO: Add pagination UI here, styled with Tailwind */}
      </div>

      <footer className="text-center py-10 mt-10 border-t border-gray-200 bg-gray-100">
        <p className="text-gray-600">
          &copy; {new Date().getFullYear()} Your Awesome Inhalers. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
};

export default ProductsListPage;
