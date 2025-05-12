// components/layout/Navbar.tsx
import React from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext'; // Or from '@/hooks/useCart'
import { useRouter } from 'next/router'; // To highlight active link

const Navbar: React.FC = () => {
  const { getTotalItems } = useCart();
  const totalCartItems = getTotalItems();
  const router = useRouter();

  const navLinkBaseClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out";
  const activeNavLinkClasses = "bg-blue-600 text-white";
  const inactiveNavLinkClasses = "text-gray-700 hover:bg-gray-100 hover:text-gray-900";

  // Helper to determine if a link is active
  const isLinkActive = (path: string, exact: boolean = true) => {
    if (exact) {
      return router.pathname === path;
    }
    return router.pathname.startsWith(path);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Store Name/Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
              InhalerStore {/* Or your store name */}
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-baseline space-x-4">
            <Link
              href="/"
              className={`${navLinkBaseClasses} ${isLinkActive("/") ? activeNavLinkClasses : inactiveNavLinkClasses}`}
            >
              Home
            </Link>
            <Link
              href="/products"
              className={`${navLinkBaseClasses} ${isLinkActive("/products", false) ? activeNavLinkClasses : inactiveNavLinkClasses}`}
            >
              Products
            </Link>
            <Link
              href="/track-order"
              className={`${navLinkBaseClasses} ${isLinkActive("/track-order") ? activeNavLinkClasses : inactiveNavLinkClasses}`}
            >
              Track Order
            </Link>
            {/* Add other links like About, Contact if needed */}
          </div>

          {/* Right-aligned items: Cart */}
          <div className="flex items-center space-x-4">
            <Link
              href="/cart"
              className={`${navLinkBaseClasses} ${isLinkActive("/cart") ? activeNavLinkClasses : inactiveNavLinkClasses} relative flex items-center`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Cart
              {totalCartItems > 0 && (
                <span className="absolute -top-2 -right-3 ml-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {totalCartItems}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile menu button (placeholder) */}
          <div className="-mr-2 flex md:hidden">
            <button
              type="button"
              className="bg-white p-2 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded="false"
              // onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} // Example state toggle
            >
              <span className="sr-only">Open main menu</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on state (Example structure, would need state management) */}
      {/*
      <div className="md:hidden hidden" id="mobile-menu"> // Add 'hidden' class or manage with state
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link href="/" className={`block ${navLinkBaseClasses} ${isLinkActive("/") ? activeNavLinkClasses : inactiveNavLinkClasses}`}>Home</Link>
          <Link href="/products" className={`block ${navLinkBaseClasses} ${isLinkActive("/products", false) ? activeNavLinkClasses : inactiveNavLinkClasses}`}>Products</Link>
          <Link href="/track-order" className={`block ${navLinkBaseClasses} ${isLinkActive("/track-order") ? activeNavLinkClasses : inactiveNavLinkClasses}`}>Track Order</Link>
          <Link href="/cart" className={`block ${navLinkBaseClasses} ${isLinkActive("/cart") ? activeNavLinkClasses : inactiveNavLinkClasses} relative flex items-center`}>
            // Cart content for mobile
          </Link>
        </div>
      </div>
      */}
    </nav>
  );
};

export default Navbar;
