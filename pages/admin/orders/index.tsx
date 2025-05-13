// pages/admin/orders/index.tsx
import React, { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head"; // Still useful for page-specific meta tags if AdminLayout's Head is more generic
import withAdminAuth, { AdminAuthProps } from "@/components/auth/withAdminAuth";
import AdminLayout from "@/components/layout/AdminLayout"; // Your AdminLayout
import {
  IOrderData,
  OrderStatusType,
  OrderStatusEnumArray,
} from "@/types/OrderTypes"; // Adjust path if needed

// Define a type for the API response structure for orders list
interface ApiErrorDetail {
  message: string;
  path?: (string | number)[];
  // Add other potential error properties if your API returns them
}

// Define a type for the API response structure for orders list
interface OrdersApiResponse {
  message?: string;
  orders: IOrderData[];
  currentPage: number;
  totalPages: number;
  totalOrders: number;
  errors?: ApiErrorDetail[]; // FIXED: More specific type for errors array
}

// This component contains the actual content of the orders page
const AdminOrdersContent: React.FC<AdminAuthProps> = ({ adminUser }) => {
  const router = useRouter();
  const [orders, setOrders] = useState<IOrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [limit, setLimit] = useState(10);

  // Sorting state
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filtering state
  const [statusFilter, setStatusFilter] = useState<OrderStatusType | "">("");
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");

  const fetchOrders = useCallback(
    async (
      pageToLoad: number,
      limitToLoad: number,
      currentSortBy: string,
      currentSortOrder: string,
      currentStatusFilter: string,
      currentOrderIdFilter: string,
      currentEmailFilter: string
    ) => {
      setIsLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      queryParams.append("page", pageToLoad.toString());
      queryParams.append("limit", limitToLoad.toString());
      queryParams.append("sortBy", currentSortBy);
      queryParams.append("sortOrder", currentSortOrder);
      if (currentStatusFilter)
        queryParams.append("status", currentStatusFilter);
      if (currentOrderIdFilter.trim())
        queryParams.append("orderId", currentOrderIdFilter.trim());
      if (currentEmailFilter.trim())
        queryParams.append("email", currentEmailFilter.trim());

      try {
        const token = localStorage.getItem("adminToken"); // Or from useAuth().token
        const res = await fetch(`/api/admin/orders?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: OrdersApiResponse = await res.json();
        if (!res.ok) {
          const errorMsg =
            data.message ||
            (data.errors
              ? data.errors.map((e: ApiErrorDetail) => e.message).join(", ") // FIXED: Typed 'e'
              : `Failed to fetch orders: ${res.statusText}`);
          throw new Error(errorMsg);
        }

        if (data.orders) {
          setOrders(data.orders);
          setCurrentPage(data.currentPage > 0 ? data.currentPage : 1);
          setTotalPages(
            data.totalPages > 0
              ? data.totalPages
              : data.totalOrders === 0
              ? 0
              : 1
          );
          setTotalOrders(data.totalOrders || 0);
        } else if (data.errors) {
          console.error(
            "Query parameter validation error from API:",
            data.errors
          );
          setError(
            `Invalid query parameters: ${data.errors
              .map(
                (e: ApiErrorDetail) =>
                  `${e.path?.join(".") || "general"}: ${e.message}`
              ) // FIXED: Typed 'e'
              .join(", ")}`
          );
          setOrders([]);
        }
      } catch (err) {
        // FIXED: Changed from err: any
        console.error("Error in fetchOrders:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred while fetching orders.");
        }
        setOrders([]); // Clear orders on error
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (adminUser && router.isReady) {
      const pageFromQuery = router.query.page
        ? parseInt(router.query.page as string)
        : NaN;
      const limitFromQuery = router.query.limit
        ? parseInt(router.query.limit as string)
        : NaN;
      const sortByFromQuery = (router.query.sortBy as string) || "createdAt";
      const sortOrderFromQuery =
        (router.query.sortOrder as "asc" | "desc") || "desc";
      const statusFromQuery =
        (router.query.status as OrderStatusType | "") || "";
      const orderIdFromQuery = (router.query.orderId as string) || "";
      const emailFromQuery = (router.query.email as string) || "";

      const targetPage =
        !isNaN(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : 1;
      const targetLimit =
        !isNaN(limitFromQuery) && limitFromQuery > 0 ? limitFromQuery : 10;

      // Update state based on URL query parameters for consistency on load/refresh
      setCurrentPage(targetPage);
      setLimit(targetLimit);
      setSortBy(sortByFromQuery);
      setSortOrder(sortOrderFromQuery);
      setStatusFilter(statusFromQuery);
      setOrderIdFilter(orderIdFromQuery);
      setEmailFilter(emailFromQuery);

      fetchOrders(
        targetPage,
        targetLimit,
        sortByFromQuery,
        sortOrderFromQuery,
        statusFromQuery,
        orderIdFromQuery,
        emailFromQuery
      );
    }
  }, [adminUser, router.isReady, router.query, fetchOrders]); // Depend on router.query as a whole

  const updateRouterQuery = (newParams: Record<string, string | number>) => {
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, ...newParams },
      },
      undefined,
      { shallow: true }
    );
    // useEffect listening to router.query will trigger fetchOrders
  };

  const handlePageChange = (newPage: number) => {
    if (
      newPage > 0 &&
      (newPage <= totalPages || totalPages === 0) &&
      newPage !== currentPage
    ) {
      updateRouterQuery({ page: newPage });
    }
  };

  const handleSortChange = (newSortBy: string) => {
    const newSortOrder =
      sortBy === newSortBy && sortOrder === "desc" ? "asc" : "desc";
    updateRouterQuery({ sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
  };

  const handleLimitChange = (newLimit: number) => {
    if (newLimit > 0 && newLimit !== limit) {
      updateRouterQuery({ limit: newLimit, page: 1 });
    }
  };

  const handleFilterSubmit = (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    updateRouterQuery({
      status: statusFilter,
      orderId: orderIdFilter,
      email: emailFilter,
      page: 1,
    });
  };

  const clearFilters = () => {
    setStatusFilter("");
    setOrderIdFilter("");
    setEmailFilter("");
    updateRouterQuery({ status: "", orderId: "", email: "", page: 1 });
  };

  const formatDate = (dateString: string | Date) =>
    new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  const formatCurrency = (amountInCents: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amountInCents / 100);
  const formatStatus = (status: OrderStatusType) =>
    status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());

  if (isLoading && orders.length === 0 && !error)
    return (
      <p className="p-6 text-center text-gray-600 animate-pulse">
        Loading orders...
      </p>
    );
  if (error)
    return <p className="p-6 text-center text-red-600">Error: {error}</p>;

  return (
    <>
      {" "}
      {/* This is the content that goes into AdminLayout's {children} */}
      <Head>
        {/* AdminLayout sets a general title, but page-specific elements can be added here */}
        <meta
          name="description"
          content="Manage all customer orders for InhalerStore."
        />
      </Head>
      {/* Filter Section */}
      <form
        onSubmit={handleFilterSubmit}
        className="mb-6 p-4 bg-white rounded-lg shadow"
      >
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          Filter Orders
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label
              htmlFor="statusFilter"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as OrderStatusType | "")
              }
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Statuses</option>
              {OrderStatusEnumArray.map((statusVal) => (
                <option key={statusVal} value={statusVal}>
                  {formatStatus(statusVal)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="orderIdFilter"
              className="block text-sm font-medium text-gray-700"
            >
              Order ID
            </label>
            <input
              type="text"
              id="orderIdFilter"
              value={orderIdFilter}
              onChange={(e) => setOrderIdFilter(e.target.value)}
              placeholder="Enter Order ID"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="emailFilter"
              className="block text-sm font-medium text-gray-700"
            >
              Customer Email
            </label>
            <input
              type="email"
              id="emailFilter"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              placeholder="Enter Customer Email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex items-end space-x-2">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Clear
            </button>
          </div>
        </div>
      </form>
      {isLoading && orders.length > 0 && (
        <p className="text-center py-4 text-gray-600">Refreshing orders...</p>
      )}
      {!isLoading && orders.length === 0 && !error && (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">
            No orders found matching your criteria.
          </p>
        </div>
      )}
      {orders.length > 0 && (
        <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Add onClick for sorting */}
                <th
                  onClick={() => handleSortChange("orderId")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Order ID{" "}
                  {sortBy === "orderId" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th
                  onClick={() => handleSortChange("createdAt")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Date{" "}
                  {sortBy === "createdAt" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th
                  onClick={() => handleSortChange("totalAmount")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Total{" "}
                  {sortBy === "totalAmount" &&
                    (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th
                  onClick={() => handleSortChange("orderStatus")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Status{" "}
                  {sortBy === "orderStatus" &&
                    (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr
                  key={order._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.orderId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="font-medium text-gray-900">
                      {order.customerDetails.firstName}{" "}
                      {order.customerDetails.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.customerDetails.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                                     ${
                                       order.orderStatus ===
                                         "PAYMENT_CONFIRMED" ||
                                       order.orderStatus === "DELIVERED"
                                         ? "bg-green-100 text-green-800"
                                         : order.orderStatus ===
                                           "PENDING_PAYMENT"
                                         ? "bg-yellow-100 text-yellow-800"
                                         : order.orderStatus === "PROCESSING" ||
                                           order.orderStatus === "SHIPPED_LOCAL"
                                         ? "bg-blue-100 text-blue-800"
                                         : "bg-red-100 text-red-800"
                                     }`}
                    >
                      {formatStatus(order.orderStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href={`/admin/orders/${order._id}`} legacyBehavior>
                      <a className="text-indigo-600 hover:text-indigo-900 hover:underline">
                        View/Edit
                      </a>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 0 && orders.length > 0 && (
        <div className="py-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
          <div className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of{" "}
            <span className="font-medium">
              {totalPages === 0 ? 1 : totalPages}
            </span>
            <span className="hidden sm:inline">
              {" "}
              | Total Orders: <span className="font-medium">{totalOrders}</span>
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {/* Optional: Page number buttons */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={
                currentPage === totalPages || isLoading || totalPages === 0
              }
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div>
            <select
              value={limit}
              onChange={(e) => handleLimitChange(parseInt(e.target.value))}
              className="text-sm p-1.5 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            >
              {[5, 10, 20, 50].map((l) => (
                <option key={l} value={l}>
                  {l} per page
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </>
  );
};

// This is the new component that will be the default export for the page
const AdminOrdersPageWithLayout: React.FC<AdminAuthProps> = (props) => {
  return (
    // AdminLayout provides the sidebar, admin header, and main content area structure
    <AdminLayout pageTitle="Manage Customer Orders">
      <AdminOrdersContent {...props} /> {/* The actual page content */}
    </AdminLayout>
  );
};

export default withAdminAuth(AdminOrdersPageWithLayout);
