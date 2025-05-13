// pages/checkout/success.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext"; // Or from '@/hooks/useCart'


// Simplified interface for what the confirmation API might return for display
// This defines the structure of each item within the orderItems array for display purposes
interface DisplayOrderItem {
  name: string;
  quantity: number;
  priceAtPurchase: number;
}

interface OrderConfirmationDisplayData {
  orderId: string;
  customerDetails?: {
    firstName?: string;
  };
  orderItems: DisplayOrderItem[]; // Use the specific DisplayOrderItem type
  totalAmount: number;
}

// Type for the raw order item data coming from the API, before mapping
// This should match the structure of items within data.order.orderItems
interface ApiOrderItem {
  name: string;
  quantity: number;
  priceAtPurchase: number;
  // Add other fields if they exist on the item from the API
  image?: string;
  productId?:
    | string
    | { _id: string; name: string /* ... other populated fields */ };
}

const formatCurrency = (amountInCents: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amountInCents / 100);
};

const CheckoutSuccessPage: React.FC = () => {
  const router = useRouter();
  const { order_id_internal } = router.query;
  const { clearCart, cartItems } = useCart();

  const [orderDetails, setOrderDetails] =
    useState<OrderConfirmationDisplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order_id_internal && (cartItems?.length || 0) > 0) {
      console.log("Clearing cart on success page entry...");
      clearCart();
    }
  }, [order_id_internal, clearCart, cartItems]);

  useEffect(() => {
    if (order_id_internal && typeof order_id_internal === "string") {
      setIsLoading(true);
      fetch(`/api/orders/confirmation/${order_id_internal}`)
        .then((res) => {
          if (!res.ok) {
            return res.json().then((errData) => {
              // errData is likely { message: string }
              throw new Error(
                errData.message ||
                  "Failed to fetch order details for confirmation."
              );
            });
          }
          return res.json();
        })
        .then((data) => {
          // data is likely { order: YourFullOrderDataTypeFromApi }
          if (data.order) {
            // FIXED: Error at 68:60 - Typed 'item' in map
            const displayData: OrderConfirmationDisplayData = {
              orderId: data.order.orderId,
              customerDetails: {
                firstName: data.order.customerDetails?.firstName,
              },
              orderItems: data.order.orderItems.map((item: ApiOrderItem) => ({
                // Use ApiOrderItem type
                name: item.name,
                quantity: item.quantity,
                priceAtPurchase: item.priceAtPurchase,
              })),
              totalAmount: data.order.totalAmount,
            };
            setOrderDetails(displayData);
          } else {
            setError(
              "Could not retrieve order confirmation details at this time."
            );
          }
        })
        .catch((err) => {
          // err is unknown
          console.error("Error fetching order confirmation details:", err);
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError(
              "An unexpected error occurred while fetching order details."
            );
          }
        })
        .finally(() => setIsLoading(false));
    } else if (router.isReady && !order_id_internal) {
      setError(
        "Order confirmation ID missing. Your payment was likely successful; please check your email."
      );
      setIsLoading(false);
    }
  }, [order_id_internal, router.isReady]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 p-4 sm:p-6 lg:p-8 font-sans text-gray-800">
      <Head>
        <title>Order Confirmed - InhalerStore</title>
      </Head>
      <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl max-w-xl w-full text-center">
        <div className="mx-auto flex items-center justify-center h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-green-100 mb-6">
          <svg
            className="h-10 w-10 sm:h-12 sm:w-12 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-4">
          Order Confirmed!
        </h1>

        {isLoading && (
          <p className="text-gray-600 my-6 animate-pulse">
            Loading your order summary...
          </p>
        )}

        {!isLoading && error && !orderDetails && (
          <>
            <p className="text-lg text-gray-700 my-4">
              Thank you for your purchase! Your payment was successful.
            </p>
            <p className="text-gray-500 text-sm">
              {/* Using template literal for the string to avoid issues with apostrophes */}
              {`We encountered an issue displaying the full order summary here: `}
              <span className="italic">{error}</span>
            </p>
            <p className="text-gray-500 text-sm mt-2">
              However, your order is being processed. You will receive an email
              confirmation shortly with all the details.
            </p>
          </>
        )}

        {!isLoading && orderDetails && (
          <>
            <p className="text-lg text-gray-700 my-4">
              Thank you,{" "}
              {orderDetails.customerDetails?.firstName || "Valued Customer"}!
              Your order has been successfully placed.
            </p>
            <div className="text-left my-6 p-4 sm:p-6 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <h3 className="text-xl font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-3">
                Order Summary: #{orderDetails.orderId}
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {orderDetails.orderItems.map(
                  (
                    item: DisplayOrderItem,
                    index: number // Typed item here
                  ) => (
                    <li
                      key={index}
                      className="flex justify-between items-center pb-2 border-b border-gray-100 last:border-b-0"
                    >
                      <div>
                        <span className="font-medium text-gray-700">
                          {item.name}
                        </span>
                        <span className="text-xs text-gray-500 block">
                          Qty: {item.quantity}
                        </span>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(item.priceAtPurchase * item.quantity)}
                      </span>
                    </li>
                  )
                )}
              </ul>
              <p className="text-md font-bold text-gray-800 text-right mt-4 pt-3 border-t border-gray-300">
                Total: {formatCurrency(orderDetails.totalAmount)}
              </p>
            </div>
            {/* FIXED: Error at 182:17 - Unescaped apostrophe */}
            <p className="text-gray-600 text-sm mt-4">
              A confirmation email with your full order details has been sent to
              your email address. We&apos;ll notify you again once your order is
              shipped.
            </p>
          </>
        )}

        {!isLoading &&
          !error &&
          !orderDetails &&
          !router.query.order_id_internal &&
          router.isReady && (
            <p className="text-lg text-gray-700 my-4">
              Thank you for your purchase! Your payment was successful and your
              order is being processed. You will receive an email confirmation
              shortly.
            </p>
          )}

        <div className="mt-10">
          <Link href="/products" legacyBehavior>
            <a className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-150 ease-in-out shadow-md hover:shadow-lg text-base">
              Continue Shopping
            </a>
          </Link>
        </div>
      </div>
      <footer className="text-center py-8 mt-auto">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} InhalerStore. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default CheckoutSuccessPage;
