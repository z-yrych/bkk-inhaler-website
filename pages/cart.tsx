// pages/cart.tsx
import React, { useState, FormEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCart } from "@/context/CartContext"; // Or from '@/hooks/useCart'
import {
  CreateOrderSchema,
  ShippingAddressInput,
} from "@/lib/validators/orderValidators"; // Adjust path
import { z } from "zod";

type CheckoutFormData = {
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: ShippingAddressInput;
};

const formatCurrency = (amountInCents: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amountInCents / 100);
};

const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, updateItemQuantity, getCartTotal } =
    useCart();
  const router = useRouter(); // Not used in this snippet, but good to have if needed later
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: "",
    email: "",
    phone: "",
    shippingAddress: {
      street: "",
      barangay: "",
      cityMunicipality: "",
      province: "",
      postalCode: "",
    },
  });
  const [formErrors, setFormErrors] = useState<z.ZodIssue[] | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity >= 0) {
      updateItemQuantity(productId, newQuantity);
    }
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length > 0) {
      setIsCheckingOut(true);
      setCheckoutError(null); // Clear previous checkout errors
      setFormErrors(null); // Clear previous form errors
    } else {
      alert("Your cart is empty!");
    }
  };

  const handleFormInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        [name]: value,
      },
    }));
  };

  const handleSubmitOrder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors(null);
    setCheckoutError(null);
    setIsSubmittingOrder(true);

    const orderPayload = {
      ...formData,
      orderItems: cartItems.map((item) => ({
        productId: item.product._id,
        quantity: item.quantity,
      })),
    };

    const customerInfoSchema = CreateOrderSchema.pick({
      fullName: true,
      email: true,
      phone: true,
      shippingAddress: true,
    });

    const validationResult = customerInfoSchema.safeParse(formData);

    if (!validationResult.success) {
      setFormErrors(validationResult.error.issues);
      setIsSubmittingOrder(false);
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create order.");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Checkout URL not received from server.");
      }
    } catch (err: any) {
      setCheckoutError(err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const totalAmount = getCartTotal();

  if (cartItems.length === 0 && !isCheckingOut) {
    return (
      <div className="container mx-auto text-center py-20 px-4 min-h-[calc(100vh-8rem)] flex flex-col justify-center items-center">
        {" "}
        {/* Adjust min-height if navbar height changes */}
        <Head>
          <title>Your Shopping Cart - InhalerStore</title>
        </Head>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-24 w-24 text-gray-300 mb-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h1 className="text-3xl font-semibold mb-4 text-gray-700">
          Your Shopping Cart is Empty
        </h1>
        <p className="text-gray-500 mb-8">
          Looks like you haven't added anything to your cart yet.
        </p>
        <Link href="/products" legacyBehavior>
          <a className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-lg shadow-md">
            Start Shopping!
          </a>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 font-sans min-h-[calc(100vh-8rem)]">
      {" "}
      {/* Adjust min-height if navbar height changes */}
      <Head>
        <title>
          {isCheckingOut ? "Checkout" : "Your Shopping Cart"} - InhalerStore
        </title>
      </Head>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-8 border-b border-gray-200 pb-4">
        {isCheckingOut ? "Checkout Details" : "Your Shopping Cart"}
      </h1>
      {!isCheckingOut ? (
        <>
          <div className="space-y-6">
            {cartItems.map((item) => (
              <div
                key={item.product._id}
                className="flex flex-col sm:flex-row items-center p-4 sm:p-6 gap-4 sm:gap-6 bg-white border border-gray-200 rounded-xl shadow-lg"
              >
                <img
                  src={item.product.images[0] || "/placeholder-image.jpg"}
                  alt={item.product.name}
                  className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border border-gray-100"
                />
                <div className="flex-grow text-center sm:text-left">
                  <Link href={`/products/${item.product.slug}`} legacyBehavior>
                    <a className="text-lg md:text-xl font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                      {item.product.name}
                    </a>
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatCurrency(item.product.price)} each
                  </p>
                </div>
                <div className="flex items-center space-x-2 my-2 sm:my-0">
                  <label
                    htmlFor={`quantity-${item.product._id}`}
                    className="sr-only"
                  >
                    Quantity for {item.product.name}
                  </label>
                  <input
                    type="number"
                    id={`quantity-${item.product._id}`}
                    min="0"
                    max={item.product.stockQuantity}
                    value={item.quantity}
                    onChange={(e) =>
                      handleQuantityChange(
                        item.product._id,
                        parseInt(e.target.value)
                      )
                    }
                    className="w-16 p-2 border border-gray-300 rounded-md text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-md sm:text-lg font-semibold text-gray-800 w-28 text-right">
                  {formatCurrency(item.product.price * item.quantity)}
                </p>
                <button
                  onClick={() => removeFromCart(item.product._id)}
                  className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label={`Remove ${item.product.name} from cart`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200">
            <div className="flex justify-end items-center mb-6">
              <p className="text-2xl font-bold text-gray-800">
                Total: {formatCurrency(totalAmount)}
              </p>
            </div>
            <button
              onClick={handleProceedToCheckout}
              className="w-full py-4 px-6 bg-green-500 text-white font-semibold text-lg rounded-lg hover:bg-green-600 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={cartItems.length === 0}
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      ) : (
        // Checkout Form
        <div className="mt-8 max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-gray-200">
          <form onSubmit={handleSubmitOrder} className="space-y-6">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                id="fullName"
                value={formData.fullName}
                onChange={handleFormInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {formErrors?.find((err) => err.path.includes("fullName")) && (
                <p className="mt-1 text-xs text-red-600">
                  {
                    formErrors.find((err) => err.path.includes("fullName"))
                      ?.message
                  }
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleFormInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {formErrors?.find((err) => err.path.includes("email")) && (
                <p className="mt-1 text-xs text-red-600">
                  {
                    formErrors.find((err) => err.path.includes("email"))
                      ?.message
                  }
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleFormInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="09xxxxxxxxx or +639xxxxxxxxx"
              />
              {formErrors?.find((err) => err.path.includes("phone")) && (
                <p className="mt-1 text-xs text-red-600">
                  {
                    formErrors.find((err) => err.path.includes("phone"))
                      ?.message
                  }
                </p>
              )}
            </div>

            <h3 className="text-xl font-semibold text-gray-900 pt-6 border-t border-gray-200 mt-8">
              Shipping Address
            </h3>

            <div>
              <label
                htmlFor="street"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Street Address, Building, Unit No.
              </label>
              <input
                type="text"
                name="street"
                id="street"
                value={formData.shippingAddress.street}
                onChange={handleAddressInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {formErrors?.find((err) => err.path.includes("street")) && (
                <p className="mt-1 text-xs text-red-600">
                  {
                    formErrors.find((err) => err.path.includes("street"))
                      ?.message
                  }
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="barangay"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Barangay
                </label>
                <input
                  type="text"
                  name="barangay"
                  id="barangay"
                  value={formData.shippingAddress.barangay}
                  onChange={handleAddressInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {formErrors?.find((err) => err.path.includes("barangay")) && (
                  <p className="mt-1 text-xs text-red-600">
                    {
                      formErrors.find((err) => err.path.includes("barangay"))
                        ?.message
                    }
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="cityMunicipality"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  City / Municipality
                </label>
                <input
                  type="text"
                  name="cityMunicipality"
                  id="cityMunicipality"
                  value={formData.shippingAddress.cityMunicipality}
                  onChange={handleAddressInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {formErrors?.find((err) =>
                  err.path.includes("cityMunicipality")
                ) && (
                  <p className="mt-1 text-xs text-red-600">
                    {
                      formErrors.find((err) =>
                        err.path.includes("cityMunicipality")
                      )?.message
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="province"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Province
                </label>
                <input
                  type="text"
                  name="province"
                  id="province"
                  value={formData.shippingAddress.province}
                  onChange={handleAddressInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {formErrors?.find((err) => err.path.includes("province")) && (
                  <p className="mt-1 text-xs text-red-600">
                    {
                      formErrors.find((err) => err.path.includes("province"))
                        ?.message
                    }
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="postalCode"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postalCode"
                  id="postalCode"
                  value={formData.shippingAddress.postalCode}
                  onChange={handleAddressInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  pattern="\d{4}"
                  title="Should be 4 digits"
                />
                {formErrors?.find((err) => err.path.includes("postalCode")) && (
                  <p className="mt-1 text-xs text-red-600">
                    {
                      formErrors.find((err) => err.path.includes("postalCode"))
                        ?.message
                    }
                  </p>
                )}
              </div>
            </div>

            {checkoutError && (
              <p className="mt-4 p-3 bg-red-100 text-red-700 text-sm rounded-md">
                Error: {checkoutError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row-reverse gap-3 pt-6 border-t border-gray-200 mt-8">
              <button
                type="submit"
                className="w-full sm:w-auto py-3 px-6 bg-blue-600 text-white font-semibold text-lg rounded-lg hover:bg-blue-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
                disabled={isSubmittingOrder}
              >
                {isSubmittingOrder
                  ? "Processing..."
                  : "Place Order & Proceed to Payment"}
              </button>
              <button
                type="button"
                onClick={() => setIsCheckingOut(false)}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Back to Cart
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CartPage;
