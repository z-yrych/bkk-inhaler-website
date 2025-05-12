// components/layout/AdminLayout.tsx
import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth'; // Your auth hook
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings, // Example icon
} from 'lucide-react'; // Using lucide-react for icons

interface AdminLayoutProps {
  children: ReactNode;
  pageTitle?: string; // Optional title for the <Head> and header
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, pageTitle = "Admin Panel" }) => {
  const { adminUser, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to open

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/products', label: 'Products', icon: ShoppingBag },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    // Add more admin navigation items here
    // { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <>
      <Head>
        <title>{pageTitle} - InhalerStore Admin</title>
      </Head>
      <div className="flex h-screen bg-gray-100 font-sans">
        {/* Sidebar */}
        <aside
          className={`transition-all duration-300 ease-in-out bg-gray-800 text-gray-100 flex flex-col
                      ${sidebarOpen ? 'w-64' : 'w-20'} `}
        >
          <div className={`flex items-center justify-between p-4 h-16 border-b border-gray-700 ${sidebarOpen ? '' : 'justify-center'}`}>
            {sidebarOpen && (
              <Link href="/admin" legacyBehavior>
                <a className="text-xl font-bold text-white hover:text-blue-300">Admin Panel</a>
              </Link>
            )}
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          <nav className="flex-grow mt-5 space-y-1">
            {navItems.map((item) => {
              const isActive = router.pathname === item.href || (item.href !== '/admin' && router.pathname.startsWith(item.href));
              return (
                <Link key={item.label} href={item.href} legacyBehavior>
                  <a
                    className={`flex items-center py-2.5 px-4 rounded-md mx-2 transition-colors duration-200
                                ${sidebarOpen ? '' : 'justify-center'}
                                ${isActive
                                  ? 'bg-blue-600 text-white shadow-lg'
                                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                    title={item.label} // Show full label on hover when collapsed
                  >
                    <item.icon size={20} className={`${sidebarOpen ? 'mr-3' : ''} flex-shrink-0`} />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </a>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-700 mt-auto">
            {sidebarOpen && adminUser && (
              <div className="text-sm text-gray-400 mb-2 truncate">
                Logged in as: {adminUser.firstName} {adminUser.lastName}
              </div>
            )}
            <button
              onClick={logout}
              className={`w-full flex items-center py-2.5 px-4 rounded-md transition-colors duration-200 bg-red-600 hover:bg-red-700 text-white
                          ${sidebarOpen ? '' : 'justify-center'}`}
              title="Logout"
            >
              <LogOut size={20} className={`${sidebarOpen ? 'mr-3' : ''} flex-shrink-0`} />
              {sidebarOpen && <span className="truncate">Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header (Optional, could be part of individual pages or a simpler one here) */}
          <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 border-b">
            <h1 className="text-xl font-semibold text-gray-700">{pageTitle}</h1>
            {/* You can add user profile dropdown or notifications here */}
            {adminUser && (
                <div className="text-sm text-gray-600">
                    Welcome, {adminUser.firstName}!
                </div>
            )}
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminLayout;
