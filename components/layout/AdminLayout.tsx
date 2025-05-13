// components/layout/AdminLayout.tsx
import React, { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "@/hooks/useAuth"; // Your auth hook
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  LogOut,
  ChevronLeft,
  ChevronRight,
  // Settings, // FIXED: Removed unused import
  Menu,
  X,
} from "lucide-react";

export interface AdminLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  pageTitle = "Admin Panel",
}) => {
  const { adminUser, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: ShoppingBag },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    // Example: Uncomment and ensure 'Users' icon is imported and used if you add this link
    // { href: '/admin/users', label: 'Admin Users', icon: Users },
    // { href: '/admin/settings', label: 'Settings', icon: Settings }, // If you add this, re-import Settings icon
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const commonLinkClasses =
    "flex items-center py-2.5 px-4 rounded-md mx-2 transition-colors duration-200";
  const activeLinkClasses = "bg-blue-600 text-white shadow-lg";
  const inactiveLinkClasses =
    "text-gray-300 hover:bg-gray-700 hover:text-white";
  const collapsedIconOnlyClasses = "justify-center";

  const SidebarContent = () => (
    <>
      <div
        className={`flex items-center justify-between p-4 h-16 border-b border-gray-700 ${
          sidebarOpen ? "" : "justify-center"
        }`}
      >
        {sidebarOpen && (
          <Link
            href="/admin"
            className="text-xl font-bold text-white hover:text-blue-300 truncate"
          >
            Admin Panel
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-1 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white ${
            !sidebarOpen && !mobileMenuOpen ? "mx-auto" : ""
          } hidden md:block`}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <nav className="flex-grow mt-5 space-y-1">
        {navItems.map((item) => {
          // Ensure item.icon is a valid component before rendering
          if (!item.icon) return null;
          const IconComponent = item.icon;
          const isActive =
            router.pathname === item.href ||
            (item.href !== "/admin" && router.pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={`${commonLinkClasses} ${
                sidebarOpen ? "" : collapsedIconOnlyClasses
              } ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
            >
              <IconComponent
                size={20}
                className={`${sidebarOpen ? "mr-3" : ""} flex-shrink-0`}
              />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700 mt-auto">
        {sidebarOpen && adminUser && (
          <div className="text-sm text-gray-400 mb-2 truncate">
            {adminUser.firstName} {adminUser.lastName}
          </div>
        )}
        <button
          onClick={logout}
          className={`w-full flex items-center py-2.5 px-4 rounded-md transition-colors duration-200 bg-red-600 hover:bg-red-700 text-white
                      ${sidebarOpen ? "" : collapsedIconOnlyClasses}`}
          title="Logout"
        >
          <LogOut
            size={20}
            className={`${sidebarOpen ? "mr-3" : ""} flex-shrink-0`}
          />
          {sidebarOpen && <span className="truncate">Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      <Head>
        <title>{pageTitle} - InhalerStore Admin</title>
      </Head>
      <div className="flex h-screen bg-gray-100 font-sans">
        {/* Desktop Sidebar */}
        <aside
          className={`transition-all duration-300 ease-in-out bg-gray-800 text-gray-100 flex-col
                      ${sidebarOpen ? "w-64" : "w-20"} hidden md:flex`}
        >
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <aside className="w-64 bg-gray-800 text-gray-100 flex flex-col">
              <SidebarContent />
            </aside>
            <div
              className="flex-1 bg-black opacity-50"
              onClick={toggleMobileMenu}
            ></div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow-md h-16 flex items-center justify-between px-4 sm:px-6 border-b z-30">
            <div className="flex items-center">
              <button
                onClick={toggleMobileMenu}
                className="md:hidden mr-3 p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-label="Open sidebar"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-xl font-semibold text-gray-700 ml-2 sm:ml-0">
                {pageTitle}
              </h1>
            </div>
            {adminUser && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 hidden sm:block">
                  Welcome,{" "}
                  <span className="font-medium">{adminUser.firstName}</span>!
                </span>
                <button
                  onClick={logout}
                  className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </header>

          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminLayout;
