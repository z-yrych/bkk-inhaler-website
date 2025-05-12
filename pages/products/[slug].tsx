// pages/products/[slug].tsx
import React, { useState, useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { IProductData } from '@/types/productTypes'; // Your plain product data type
import { useCart } from '@/context/CartContext'; // Or from '@/hooks/useCart'

interface ProductDetailPageProps {
  product: IProductData | null;
  error?: string;
}

const formatCurrency = (amountInCents: number): string => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amountInCents / 100);
};

const ProductDetailPage: NextPage<ProductDetailPageProps> = ({ product, error }) => {
  const router = useRouter();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [addedToCartMessage, setAddedToCartMessage] = useState('');
  
  // Initialize mainImage state AFTER product is confirmed to exist
  const [mainImage, setMainImage] = useState('');
  useEffect(() => {
    if (product?.images?.[0]) {
      setMainImage(product.images[0]);
    } else if (product) { // Product exists but no images
        setMainImage('/placeholder-image.jpg'); // Fallback if product has no images
    }
  }, [product]);


  if (router.isFallback || (!product && !error && !router.isReady)) { // Added !router.isReady for initial undefined slug
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
        <p className="text-xl text-gray-600">Loading product details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4 text-red-600">
        <p className="text-xl mb-4">Error: {error}</p>
        <Link href="/products" legacyBehavior>
          <a className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            &larr; Back to Products
          </a>
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
        <p className="text-xl text-gray-700 mb-4">Product not found.</p>
        <Link href="/products" legacyBehavior>
          <a className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            &larr; Back to Products
          </a>
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (product && quantity > 0) {
      addToCart(product, quantity);
      setAddedToCartMessage(`${quantity} x ${product.name} added to cart!`);
      setTimeout(() => setAddedToCartMessage(''), 3000);
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
      {/* Assuming Navbar is globally in _app.tsx */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Head>
          <title>{product.name} - InhalerStore</title>
          <meta name="description" content={product.description.substring(0, 160)} />
        </Head>

        <nav className="mb-6 text-sm">
          <Link href="/products" legacyBehavior>
            <a className="text-blue-600 hover:text-blue-800 hover:underline transition-colors">&larr; Back to All Products</a>
          </Link>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start bg-white p-6 sm:p-8 rounded-xl shadow-xl">
          {/* Image Gallery Section */}
          <div className="flex flex-col items-center">
            <div className="w-full h-80 md:h-96 lg:h-[500px] flex justify-center items-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200 mb-4">
              <img 
                  src={mainImage} 
                  alt={product.name} 
                  className="max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-300 ease-in-out" // Added transition
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex flex-wrap justify-center p-2 space-x-2">
                {product.images.map((imgUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setMainImage(imgUrl)}
                    onMouseEnter={() => setMainImage(imgUrl)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-md border-2 p-0.5 focus:outline-none transition-all duration-150 ease-in-out
                                ${mainImage === imgUrl ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300 hover:border-blue-400'}`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover rounded-sm"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details Section */}
          <div className="flex flex-col space-y-5">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 leading-tight">{product.name}</h1>
            <p className="text-3xl font-semibold text-blue-600">{formatCurrency(product.price)}</p>
            
            <div className="text-sm">
              <p className={`font-semibold ${product.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stockQuantity > 0 ? `${product.stockQuantity > 10 ? 'In Stock' : `Only ${product.stockQuantity} left!`}` : 'Out of Stock'}
              </p>
            </div>

            {product.stockQuantity > 0 && (
              <div className="flex items-center space-x-3 pt-2 pb-2">
                <label htmlFor="quantity" className="font-medium text-gray-700">Quantity:</label>
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
            {addedToCartMessage && <p className="text-green-600 text-sm -mt-2 mb-2">{addedToCartMessage}</p>}

            {/* Accordion or Tabs for details could be nice here */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Description</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
              </div>

              {product.scentProfile && product.scentProfile.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">Scent Profile</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {product.scentProfile.map((scent, i) => <li key={i}>{scent}</li>)}
                  </ul>
                </div>
              )}

              {product.benefits && product.benefits.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">Benefits</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {product.benefits.map((benefit, i) => <li key={i}>{benefit}</li>)}
                  </ul>
                </div>
              )}
              
              {product.usageInstructions && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">Usage Instructions</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{product.usageInstructions}</p>
                </div>
              )}

              {product.ingredients && product.ingredients.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">Ingredients</h3>
                    <p className="text-gray-600">{product.ingredients.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center py-10 mt-10 border-t border-gray-200 bg-gray-100">
        <p className="text-gray-600">&copy; {new Date().getFullYear()} InhalerStore. All rights reserved.</p>
      </footer>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params || {};

  if (!slug || typeof slug !== 'string') {
    return { notFound: true };
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Ensure this is set
    const res = await fetch(`${appUrl}/api/products/${slug}`);
    
    if (!res.ok) {
      if (res.status === 404) {
        return { notFound: true };
      }
      // Try to parse error message from API
      const errorData = await res.json().catch(() => ({ message: `API responded with status ${res.status}` }));
      console.error(`API error for slug ${slug}:`, errorData);
      return { props: { product: null, error: errorData.message || `Failed to load product (status: ${res.status})` } };
    }

    const data = await res.json();
    if (!data.product) {
        console.warn(`Product data not found in API response for slug: ${slug}`);
        return { notFound: true };
    }

    return {
      props: {
        product: data.product,
      },
    };
  } catch (error: any) {
    console.error(`Error fetching product with slug ${slug} in getServerSideProps:`, error);
    return { props: { product: null, error: 'An unexpected error occurred while loading product data. Please try again later.' } };
  }
};

export default ProductDetailPage;