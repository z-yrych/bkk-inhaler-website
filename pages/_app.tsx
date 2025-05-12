// pages/_app.tsx
import '@/styles/globals.css'; // Your Tailwind base styles including @tailwind directives
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/layout/Navbar'; // Your PUBLIC Navbar
import { useRouter } from 'next/router';
import React from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isAdminRoute = router.pathname.startsWith('/admin');

  return (
    <AuthProvider>
      <CartProvider>
        {!isAdminRoute && <Navbar />} {/* Conditionally render public Navbar */}
        {/* If the public Navbar is fixed/sticky and adds top padding to `main`,
          that padding also needs to be conditional or handled within individual page layouts.
          For admin routes, AdminLayout will manage its own full-page layout.
          For public routes, if Navbar is fixed, the content below needs padding.
        */}
        <main className={!isAdminRoute ? "pt-16" : ""}> {/* Conditionally add padding for public Navbar */}
          <Component {...pageProps} />
        </main>
      </CartProvider>
    </AuthProvider>
  );
}

export default MyApp;
