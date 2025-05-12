// pages/track-order.tsx
import React, { useState, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
// Assuming Navbar is globally available via _app.tsx
// import Navbar from '@/components/layout/Navbar'; // If not global

// Define the structure of the order details we expect from the API for display
interface TrackedOrderItem {
  name: string;
  quantity: number;
  priceAtPurchase: number; // in cents
  image?: string;
}

interface TrackedOrderShippingInfo {
  courier?: string;
  trackingNumber?: string;
  shippedDate?: string | Date;
}

interface TrackedOrderData {
  orderId: string;
  status: string; // This will be OrderStatusType
  orderDate: string | Date;
  items: TrackedOrderItem[];
  totalAmount: number; // in cents
  customerFirstName?: string;
  shippingInfo?: TrackedOrderShippingInfo;
}

interface TrackOrderApiResponse {
  message: string;
  order?: TrackedOrderData;
  errors?: any[]; // For Zod errors from backend if any
}

const formatCurrency = (amountInCents: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amountInCents / 100);
};

const formatDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatOrderStatus = (status: string | undefined): string => {
    if (!status) return 'N/A';
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};


const TrackOrderPage: React.FC = () => {
  const [orderIdInput, setOrderIdInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrderData | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setTrackedOrder(null);

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: orderIdInput, email: emailInput }),
      });

      const data: TrackOrderApiResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Failed to track order (status: ${res.status})`);
      }

      if (data.order) {
        setTrackedOrder(data.order);
      } else {
        // This case might not be hit if API returns 404 with a message for "not found"
        setError(data.message || 'Order details not found.');
      }
    } catch (err: any) {
      console.error("Track order error:", err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 font-sans text-gray-800">
      <Head>
        <title>Track Your Order - InhalerStore</title>
        <meta name="description" content="Check the status of your InhalerStore order." />
      </Head>

      {/* Navbar is assumed to be global from _app.tsx */}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <header className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Track Your Order</h1>
          <p className="text-md sm:text-lg text-gray-600 mt-2">
            Enter your Order ID and Email to see the latest updates.
          </p>
        </header>

        <div className="max-w-lg mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="orderIdInput" className="block text-sm font-medium text-gray-700 mb-1">
                Order ID
              </label>
              <input
                type="text"
                id="orderIdInput"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                required
                className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., 20250511-XXXXXX-YYYY"
              />
            </div>
            <div>
              <label htmlFor="emailInput" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="emailInput"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-blue-600 text-white font-semibold text-lg rounded-lg hover:bg-blue-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {isLoading ? 'Tracking...' : 'Track Order'}
            </button>
          </form>
        </div>

        {isLoading && (
          <div className="text-center mt-8">
            <p className="text-lg text-blue-600 animate-pulse">Looking for your order...</p>
          </div>
        )}

        {error && (
          <div className="mt-8 max-w-lg mx-auto p-4 sm:p-6 bg-red-50 border border-red-300 text-red-700 rounded-lg text-center">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {trackedOrder && !isLoading && (
          <div className="mt-10 max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-3">
              Order Status: #{trackedOrder.orderId}
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                <span className="font-medium">Customer:</span> {trackedOrder.customerFirstName || 'Valued Customer'}
              </p>
              <p>
                <span className="font-medium">Order Date:</span> {formatDate(trackedOrder.orderDate)}
              </p>
              <p>
                <span className="font-medium">Current Status:</span>
                <strong className="ml-2 px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700">
                  {formatOrderStatus(trackedOrder.status)}
                </strong>
              </p>
              {trackedOrder.shippingInfo?.trackingNumber && (
                <>
                  <p><span className="font-medium">Courier:</span> {trackedOrder.shippingInfo.courier || 'N/A'}</p>
                  <p><span className="font-medium">Tracking Number:</span> {trackedOrder.shippingInfo.trackingNumber}</p>
                  {trackedOrder.shippingInfo.shippedDate && (
                     <p><span className="font-medium">Shipped Date:</span> {formatDate(trackedOrder.shippingInfo.shippedDate)}</p>
                  )}
                </>
              )}

              <h3 className="text-lg font-medium pt-4 mt-4 border-t">Items:</h3>
              <ul className="space-y-2 text-sm">
                {trackedOrder.items.map((item, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <span>{item.name} (x{item.quantity})</span>
                    {/* Price at purchase not typically shown on public tracking */}
                  </li>
                ))}
              </ul>
              <p className="text-md font-semibold text-right mt-3 pt-3 border-t">
                Total: {formatCurrency(trackedOrder.totalAmount)}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-6 text-center">
              If you have any questions about your order, please contact support with your Order ID.
            </p>
          </div>
        )}
      </div>
      <footer className="text-center py-8 mt-auto bg-gray-100 border-t">
        <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} InhalerStore. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default TrackOrderPage;
