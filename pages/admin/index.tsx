// pages/admin/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head'; // Added Head
import withAdminAuth, { AdminAuthProps } from '@/components/auth/withAdminAuth';
import AdminLayout from '@/components/layout/AdminLayout';
import { AlertTriangle, RefreshCw, ShoppingCart, Package, CheckCircle, Users, PackageX, Clock, ShoppingBag } from 'lucide-react'; // More icons

// Define the structure for the stats we expect from the API
interface DashboardStatsData {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
}

const AdminDashboardContent: React.FC<AdminAuthProps> = ({ adminUser }) => {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken'); // Or from useAuth().token
      if (!token) {
        throw new Error("Authentication token not found.");
      }
      const res = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch dashboard stats (status: ${res.status})`);
      }
      const data: DashboardStatsData = await res.json();
      setStats(data);
    } catch (err: any) {
      console.error("Error fetching dashboard stats:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminUser) { // Ensure adminUser is loaded (from withAdminAuth)
      fetchDashboardStats();
    }
  }, [adminUser, fetchDashboardStats]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="ml-3 text-lg text-gray-600">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-red-50 border border-red-200 rounded-lg">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-lg text-red-700">Error loading dashboard: {error}</p>
        <button 
          onClick={fetchDashboardStats}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Try Reload
        </button>
      </div>
    );
  }

  if (!stats) {
    return <p className="p-6 text-center text-gray-500">No dashboard data available.</p>;
  }

  // Define StatCard component for reusability
  const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; iconColorClass?: string }> = 
    ({ title, value, icon: Icon, iconColorClass = "text-blue-500" }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-opacity-20 ${iconColorClass.replace('text-', 'bg-').replace('-500', '-100')}`}>
          <Icon size={28} className={iconColorClass} />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <Head>
        {/* AdminLayout handles the main title, this can be for specific meta if needed */}
        <meta name="description" content="Admin dashboard overview for InhalerStore." />
      </Head>
      <h2 className="text-3xl font-semibold text-gray-800 mb-6">
        Dashboard Overview
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Welcome back, <span className="font-medium">{adminUser.firstName}</span>! Here's what's happening with your store.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Product Stats */}
        <StatCard title="Total Products" value={stats.totalProducts} icon={ShoppingBag} iconColorClass="text-purple-500" />
        <StatCard title="Active Products" value={stats.activeProducts} icon={Package} iconColorClass="text-green-500" />
        <StatCard title="Inactive Products" value={stats.inactiveProducts} icon={PackageX} iconColorClass="text-gray-500" />
        
        {/* Spacer or different category */}
        <div className="lg:col-span-1 hidden xl:block"></div> 

        {/* Order Stats */}
        <StatCard title="Total Orders" value={stats.totalOrders} icon={ShoppingCart} iconColorClass="text-indigo-500" />
        <StatCard title="Pending Payment" value={stats.pendingOrders} icon={Clock} iconColorClass="text-yellow-500" />
        <StatCard title="Confirmed Orders" value={stats.confirmedOrders} icon={CheckCircle} iconColorClass="text-teal-500" />
        <StatCard title="Processing Orders" value={stats.processingOrders} icon={RefreshCw} iconColorClass="text-sky-500" />
        <StatCard title="Shipped Orders" value={stats.shippedOrders} icon={Users} iconColorClass="text-pink-500" /> {/* Users icon is placeholder, find better shipping icon */}
        <StatCard title="Delivered Orders" value={stats.deliveredOrders} icon={CheckCircle} iconColorClass="text-emerald-500" />


        {/* Add more StatCards for other data like users, revenue (once calculated) */}
      </div>

      {/* Placeholder for recent orders list or charts */}
      <div className="mt-10 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Future Enhancements</h3>
        <p className="text-gray-600">
          This area can be used to display recent orders, sales charts, low stock alerts, or quick links to common tasks.
        </p>
      </div>
    </div>
  );
};

const AdminDashboardPageWithLayout: React.FC<AdminAuthProps> = (props) => (
  <AdminLayout pageTitle="Admin Dashboard">
    <AdminDashboardContent {...props} />
  </AdminLayout>
);

export default withAdminAuth(AdminDashboardPageWithLayout);
