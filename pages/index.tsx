// pages/index.tsx
import React from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image"; // Using Next.js Image component for optimization
import { GetServerSideProps, NextPage } from "next";
import { IProductData } from "@/types/productTypes"; // Your plain product data type

// Placeholder data for benefits - this can remain hardcoded or also be fetched if needed
const benefits = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 text-emerald-500 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.663 17h4.673M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 9V6.75M9 9H6.75m2.25 0L5.25 5.25M15 9V6.75M15 9h2.25m-2.25 0l2.25-2.25M9 15v2.25M9 15H6.75m2.25 0l-2.25 2.25m6-2.25v2.25m0-2.25h2.25M15 15l2.25 2.25"
        />
      </svg>
    ),
    title: "Natural Aromatherapy",
    description:
      "Experience the power of pure essential oils for your mind and body.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 text-emerald-500 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    title: "Pocket-Sized Wellness",
    description:
      "Your personal wellness companion, ready whenever you need it.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 text-emerald-500 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    title: "Instant Mood Boost",
    description:
      "Quickly shift your state of mind, from calm to energized, naturally.",
  },
];

const formatCurrency = (amountInCents: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amountInCents / 100);
};

interface HomePageProps {
  featuredProducts: IProductData[];
  error?: string;
}

const HomePage: NextPage<HomePageProps> = ({ featuredProducts, error }) => {
  if (error) {
    console.error("Error loading featured products on homepage:", error);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 font-sans text-gray-800">
      <Head>
        <title>InhalerStore - Natural Aromatherapy On The Go</title>
        <meta
          name="description"
          content="Discover premium scented inhalers for relaxation, focus, and energy. Crafted with natural essential oils."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <section
        className="relative py-20 sm:py-32 lg:py-40 bg-cover bg-center"
        style={{ backgroundImage: "url('/1.jpg')" }}
      >
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            Breathe In Wellness, Exhale Stress.
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-200 mb-10 max-w-3xl mx-auto">
            Discover our handcrafted scented inhalers, made with pure essential
            oils to elevate your everyday moments.
          </p>
          <Link href="/products" legacyBehavior>
            <a className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-10 rounded-lg text-lg transition-transform duration-300 ease-in-out transform hover:scale-105 shadow-lg">
              Shop All Inhalers
            </a>
          </Link>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            Experience the Difference
          </h2>
          {/* FIXED: Error at 140:67 - Unescaped apostrophe */}
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            Our inhalers are more than just a pleasant scent; they&apos;re a
            tool for enhancing your well-being, naturally.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-gray-50 p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex justify-center items-center">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            Our Popular Blends
          </h2>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            Crafted with care, loved by our customers. Find your new favorite.
          </p>
          {error && (
            <p className="text-red-500">
              Could not load featured products at this time. Error: {error}
            </p>
          )}
          {!error && featuredProducts && featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map((product) => (
                <div
                  key={product._id}
                  className="bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out flex flex-col overflow-hidden group text-left"
                >
                  <Link href={`/products/${product.slug}`} legacyBehavior>
                    <a className="block">
                      <div className="w-full h-64 overflow-hidden">
                        <Image
                          src={product.images[0] || "/placeholder-image.jpg"}
                          alt={product.name}
                          width={400}
                          height={300}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-emerald-600 transition-colors duration-300 min-h-[3em] leading-tight">
                          {product.name}
                        </h3>
                        <p className="text-md font-bold text-emerald-500 my-2">
                          {formatCurrency(product.price)}
                        </p>
                        <p className="text-sm text-gray-600 mb-4 leading-relaxed flex-grow">
                          {product.description.substring(0, 120) +
                            (product.description.length > 120 ? "..." : "")}
                        </p>
                      </div>
                    </a>
                  </Link>
                  <div className="p-6 pt-0 mt-auto">
                    <Link href={`/products/${product.slug}`} legacyBehavior>
                      <a className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-emerald-300 transform hover:scale-105">
                        View Details
                      </a>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !error && (
              <p>No featured products to display right now. Check back soon!</p>
            )
          )}
          <div className="mt-16">
            <Link href="/products" legacyBehavior>
              <a className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-lg text-lg transition-transform duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                Explore All Products
              </a>
            </Link>
          </div>
        </div>
      </section>

      {/* Call to Action / About Snippet */}
      <section className="py-16 sm:py-20 bg-teal-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Elevate Your Senses?
          </h2>
          <p className="text-lg sm:text-xl mb-10 max-w-3xl mx-auto">
            At InhalerStore, we believe in the power of nature to enhance your
            daily life. Each inhaler is thoughtfully blended to provide a pure,
            potent, and portable aromatherapy experience.
          </p>
          <div className="space-x-4">
            <Link href="/products" legacyBehavior>
              <a className="bg-white hover:bg-gray-100 text-teal-600 font-bold py-3 px-8 rounded-lg text-md transition-colors duration-300 ease-in-out shadow-md">
                Shop Now
              </a>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

// Fetch featured products server-side
export const getServerSideProps: GetServerSideProps<HomePageProps> = async (
) => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(
      `${appUrl}/api/products?limit=3&sortBy=createdAt&sortOrder=desc`
    );

    if (!res.ok) {
      return {
        props: {
          featuredProducts: [],
          error: `Failed to load featured products (status: ${res.status})`,
        },
      };
    }

    // Define a type for the expected API response data
    interface ApiProductsResponse {
      products: IProductData[];
      // include other fields like currentPage, totalPages if your API sends them
      message?: string;
    }
    const data: ApiProductsResponse = await res.json();

    if (!data.products) {
      return {
        props: {
          featuredProducts: [],
          error: "No products found in API response.",
        },
      };
    }

    return {
      props: {
        featuredProducts: data.products,
      },
    };
  } catch (error) {
    // FIXED: Error at 303:19 - Typed error
    console.error("Error in getServerSideProps for homepage:", error);
    if (error instanceof Error) {
      return {
        props: {
          featuredProducts: [],
          error:
            error.message ||
            "Could not fetch featured products. Please try again later.",
        },
      };
    }
    return {
      props: {
        featuredProducts: [],
        error: "An unknown error occurred while fetching featured products.",
      },
    };
  }
};

export default HomePage;
