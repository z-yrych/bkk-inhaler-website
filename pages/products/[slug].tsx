// pages/products/[slug].tsx
import React, { useState, useEffect } from "react";
import { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link"; // Using new Link behavior (no legacyBehavior)
import NextImage from "next/image"; // Using NextImage alias
import { IProductData } from "@/types/productTypes"; // Ensure path is correct
import { useCart } from "@/context/CartContext"; // Ensure path is correct

interface ProductDetailPageProps {
  product: IProductData | null;
  error?: string;
  initialSlug?: string; // Slug passed from getServerSideProps for debugging
}

const formatCurrency = (amountInCents: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amountInCents / 100);
};

const ProductDetailPage: NextPage<ProductDetailPageProps> = ({
  product,
  error,
  initialSlug,
}) => {
  const router = useRouter();
  const { slug: slugFromQuery } = router.query; // Current slug from client-side router

  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [addedToCartMessage, setAddedToCartMessage] = useState("");
  const [mainImage, setMainImage] = useState("");

  // This state helps manage the display if GSSP is still running or if props are not yet available.
  // It's true if GSSP didn't immediately provide a product or an error (e.g., during initial client-side render before hydration).
  const [isLoadingPageData, setIsLoadingPageData] = useState(
    !product && !error
  );

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[slug].tsx COMPONENT mount/update (${timestamp})`);
    console.log(`  Initial Slug (from GSSP props): "${initialSlug}"`);
    console.log(`  Router Query Slug (client-side): "${slugFromQuery}"`);
    console.log("  Product Prop:", product);
    console.log("  Error Prop:", error);

    if (product?.images?.[0]) {
      setMainImage(product.images[0]);
    } else if (product) {
      // Product exists but might not have images
      setMainImage("/placeholder-image.jpg"); // Default placeholder
    }

    // If product or error is received from props, we are no longer in the "initial loading of page data" state.
    if (product || error) {
      setIsLoadingPageData(false);
    }
  }, [product, error, initialSlug, slugFromQuery]);

  if (router.isFallback) {
    // This is for pages using getStaticPaths with fallback: true or 'blocking'
    // Not directly applicable here since we're using getServerSideProps, but good for completeness.
    console.log(
      "[slug].tsx COMPONENT - Router is fallback, rendering fallback loading state."
    );
    return (
      <div className="flex justify-center items-center min-h-screen text-xl">
        Loading (Fallback)...
      </div>
    );
  }

  if (isLoadingPageData && !router.isFallback) {
    // This might show briefly if GSSP is slow or if props aren't immediately available.
    console.log(
      "[slug].tsx COMPONENT - Initial page data is loading (isLoadingPageData is true)."
    );
    return (
      <div className="flex justify-center items-center min-h-screen text-xl text-gray-600">
        Loading Product Details...
      </div>
    );
  }

  if (error) {
    console.error(
      `[slug].tsx COMPONENT - Rendering error state passed from GSSP: "${error}"`
    );
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4 text-red-600">
        <p className="text-2xl font-semibold mb-3">
          Oops! Something went wrong.
        </p>
        <p className="text-lg mb-6">Error: {error}</p>
        <Link
          href="/products"
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          &larr; Back to Products
        </Link>
      </div>
    );
  }

  if (!product) {
    // This condition is hit if GSSP returned { notFound: true } or { props: { product: null } } without an error message.
    console.log(
      `[slug].tsx COMPONENT - Product prop is null/undefined. Rendering "Product not found." Attempted slug (GSSP): "${initialSlug}", Router query slug: "${slugFromQuery}"`
    );
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
        <p className="text-2xl font-semibold text-gray-700 mb-4">
          Product Not Found
        </p>
        <p className="text-md text-gray-500 mb-6">
          The product you are looking for with slug &quot;
          {initialSlug || slugFromQuery || "unknown"}&quot; does not exist or is
          unavailable.
        </p>
        <Link
          href="/products"
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          &larr; Back to Products
        </Link>
      </div>
    );
  }

  // If we reach here, product data is available.
  console.log(
    `[slug].tsx COMPONENT - Rendering product details for: "${product.name}" (Slug: ${product.slug})`
  );

  const handleAddToCart = () => {
    if (quantity > 0) {
      addToCart(product, quantity);
      setAddedToCartMessage(`${quantity} x ${product.name} added to cart!`);
      setTimeout(() => setAddedToCartMessage(""), 3000);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newQuantity = parseInt(e.target.value, 10);
    if (isNaN(newQuantity) || newQuantity < 1) {
      newQuantity = 1;
    } else if (newQuantity > product.stockQuantity) {
      newQuantity = product.stockQuantity;
    }
    setQuantity(newQuantity);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Assuming Navbar is globally in _app.tsx and main has pt-16 */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Head>
          <title>{product.name} - InhalerStore</title>
          <meta
            name="description"
            content={product.description.substring(0, 160)}
          />
        </Head>

        <nav className="mb-6 text-sm">
          <Link
            href="/products"
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            &larr; Back to All Products
          </Link>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start bg-white p-6 sm:p-8 rounded-xl shadow-xl">
          {/* Image Gallery Section */}
          <div className="flex flex-col items-center">
            <div className="w-full h-80 md:h-96 lg:h-[500px] flex justify-center items-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200 mb-4">
              <NextImage
                src={mainImage || "/placeholder-image.jpg"}
                alt={product.name}
                width={500}
                height={500}
                className="max-w-full max-h-full w-auto h-auto object-contain"
                priority // Mark LCP image as priority
              />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex flex-wrap justify-center p-2 space-x-2">
                {product.images.map((imgUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setMainImage(imgUrl)}
                    onMouseEnter={() => setMainImage(imgUrl)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-md border-2 p-0.5 focus:outline-none transition-all duration-150 ease-in-out
                                ${
                                  mainImage === imgUrl
                                    ? "border-blue-500 ring-2 ring-blue-300"
                                    : "border-gray-300 hover:border-blue-400"
                                }`}
                  >
                    <NextImage
                      src={imgUrl}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover rounded-sm"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details Section */}
          <div className="flex flex-col space-y-5">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 leading-tight">
              {product.name}
            </h1>
            <p className="text-3xl font-semibold text-blue-600">
              {formatCurrency(product.price)}
            </p>

            <div className="text-sm">
              <p
                className={`font-semibold ${
                  product.stockQuantity > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {product.stockQuantity > 0
                  ? `${
                      product.stockQuantity > 10
                        ? "In Stock"
                        : `Only ${product.stockQuantity} left!`
                    }`
                  : "Out of Stock"}
              </p>
            </div>

            {product.stockQuantity > 0 && (
              <div className="flex items-center space-x-3 pt-2 pb-2">
                <label htmlFor="quantity" className="font-medium text-gray-700">
                  Quantity:
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  min="1"
                  max={product.stockQuantity}
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="w-20 p-2 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-green-300 transform hover:scale-105"
                >
                  Add to Cart
                </button>
              </div>
            )}
            {addedToCartMessage && (
              <p className="text-green-600 mt-2 text-sm">
                {addedToCartMessage}
              </p>
            )}

            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">
                  Description
                </h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>

              {product.scentProfile && product.scentProfile.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">
                    Scent Profile
                  </h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {product.scentProfile.map((scent, i) => (
                      <li key={i}>{scent}</li>
                    ))}
                  </ul>
                </div>
              )}
              {product.benefits && product.benefits.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">
                    Benefits
                  </h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {product.benefits.map((benefit, i) => (
                      <li key={i}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}
              {product.usageInstructions && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">
                    Usage Instructions
                  </h3>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {product.usageInstructions}
                  </p>
                </div>
              )}
              {product.ingredients && product.ingredients.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">
                    Ingredients
                  </h3>
                  <p className="text-gray-600">
                    {product.ingredients.join(", ")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center py-10 mt-10 border-t border-gray-200 bg-gray-100">
        <p className="text-gray-600">
          &copy; {new Date().getFullYear()} InhalerStore. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps<
  ProductDetailPageProps
> = async (context) => {
  const { slug } = context.params || {}; // slug from the URL path
  const timestamp = new Date().toLocaleTimeString();
  console.log(
    `[slug].tsx GSSP (${timestamp}): Received slug in context.params: "${slug}"`
  );

  if (!slug || typeof slug !== "string") {
    console.log(
      `[slug].tsx GSSP (${timestamp}): Slug is missing or not a string from context.params, returning notFound.`
    );
    return { notFound: true };
  }

  try {
    // Fetch data from your internal API endpoint
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const fetchUrl = `${appUrl}/api/products/${slug}`; // API endpoint uses the slug
    console.log(
      `[slug].tsx GSSP (${timestamp}): Fetching from URL: ${fetchUrl}`
    );

    const res = await fetch(fetchUrl);
    console.log(
      `[slug].tsx GSSP (${timestamp}): API response status for slug "${slug}": ${res.status}`
    );

    if (!res.ok) {
      if (res.status === 404) {
        console.log(
          `[slug].tsx GSSP (${timestamp}): API returned 404 for slug "${slug}", returning notFound from GSSP.`
        );
        return { notFound: true };
      }
      // Try to parse error message from API if not 404
      const errorData = await res
        .json()
        .catch(() => ({
          message: `API request failed with status ${res.status}`,
        }));
      console.error(
        `[slug].tsx GSSP (${timestamp}): API error for slug "${slug}":`,
        errorData
      );
      return {
        props: {
          product: null,
          error:
            errorData.message ||
            `Failed to load product. API status: ${res.status}`,
          initialSlug: slug, // Pass the slug that was attempted
        },
      };
    }

    // Define a type for the expected API response from /api/products/[slug]
    interface ApiProductResponse {
      product?: IProductData;
      message?: string;
    }
    const data: ApiProductResponse = await res.json();
    console.log(
      `[slug].tsx GSSP (${timestamp}): API response data for slug "${slug}": ${
        data && data.product
          ? "Product data received"
          : "No product in data object"
      }`
    );

    if (!data || !data.product) {
      console.warn(
        `[slug].tsx GSSP (${timestamp}): Product data object not found in API response for slug: "${slug}". Full API response data:`,
        data
      );
      return { notFound: true };
    }

    console.log(
      `[slug].tsx GSSP (${timestamp}): Successfully fetched product "${data.product.name}" for slug "${slug}". Passing to props.`
    );
    return {
      props: {
        product: data.product,
        initialSlug: slug, // Pass the slug that was successfully used for fetching
      },
    };
  } catch (error) {
    // Catch errors from the fetch call itself or other GSSP logic
    console.error(
      `[slug].tsx GSSP (${timestamp}): Catch block error during GSSP for slug "${slug}":`,
      error
    );
    let errorMessage =
      "An unexpected server error occurred while preparing product page.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      props: {
        product: null,
        error: `Server error: ${errorMessage}`,
        initialSlug: slug,
      },
    };
  }
};

export default ProductDetailPage;
