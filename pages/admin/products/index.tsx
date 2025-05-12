// pages/admin/products/index.tsx
import React, { useState, useEffect, useCallback, FormEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import withAdminAuth, { AdminAuthProps } from "@/components/auth/withAdminAuth";
import AdminLayout from "@/components/layout/AdminLayout"; // Your AdminLayout
import { IProductData } from "@/types/productTypes"; // Adjust path
import {
  Edit3,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Search,
  RefreshCw,
  ShoppingBag,
} from "lucide-react"; // Icons

interface ProductsApiResponse {
  message?: string;
  products: IProductData[];
  currentPage: number;
  totalPages: number;
  totalProducts: number;
}

interface ProductUpdateResponse {
  message: string;
  product: IProductData;
}

// This component contains the actual content of the products page
const AdminProductsContent: React.FC<AdminAuthProps> = ({ adminUser }) => {
  const router = useRouter();
  const [products, setProducts] = useState<IProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [limit, setLimit] = useState(10);

  // TODO: Add state for sortBy, sortOrder, and actual filter inputs (e.g., productNameFilter)

  const fetchProducts = useCallback(async (page: number, size: number) => {
    setIsLoading(true);
    setError(null);
    console.log(`Fetching products. API Page: ${page}, API Limit: ${size}`);

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: size.toString(),
      // TODO: Add sortBy, sortOrder, filters from state to queryParams
    });

    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("Admin token not found. Please login again.");
      }
      const res = await fetch(`/api/admin/products?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data: ProductsApiResponse = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || `Failed to fetch products (status: ${res.status})`
        );
      }

      setProducts(data.products || []);
      setCurrentPage(data.currentPage > 0 ? data.currentPage : 1);
      setTotalPages(
        data.totalPages > 0 ? data.totalPages : data.totalProducts === 0 ? 0 : 1
      );
      setTotalProducts(data.totalProducts || 0);
    } catch (err: any) {
      console.error("Error in fetchProducts:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminUser && router.isReady) {
      const pageFromQuery = router.query.page
        ? parseInt(router.query.page as string)
        : NaN;
      const limitFromQuery = router.query.limit
        ? parseInt(router.query.limit as string)
        : NaN;
      const targetPage =
        !isNaN(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : 1;
      const targetLimit =
        !isNaN(limitFromQuery) && limitFromQuery > 0 ? limitFromQuery : 10;

      if (currentPage !== targetPage || limit !== targetLimit) {
        setCurrentPage(targetPage);
        setLimit(targetLimit);
      }
      fetchProducts(targetPage, targetLimit);
    }
  }, [
    adminUser,
    router.isReady,
    router.query.page,
    router.query.limit,
    fetchProducts,
    currentPage,
    limit,
  ]);

  const handleToggleActive = async (
    productId: string,
    currentIsActive: boolean
  ) => {
    if (
      !confirm(
        `Are you sure you want to set this product to ${
          currentIsActive ? "Inactive" : "Active"
        }?`
      )
    ) {
      return;
    }
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentIsActive }),
      });
      const result: ProductUpdateResponse = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to update product status.");
      }
      alert(
        `Product "${result.product.name}" status updated successfully to ${
          result.product.isActive ? "Active" : "Inactive"
        }.`
      );
      fetchProducts(currentPage, limit); // Refresh the current page
    } catch (err: any) {
      console.error("Error toggling product active status:", err);
      alert(`Error: ${err.message}`);
    }
  };

  const updateRouterQuery = (newParams: Record<string, string | number>) => {
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, ...newParams },
      },
      undefined,
      { shallow: true }
    );
  };

  const handlePageChange = (newPage: number) => {
    const pageToNavigate = Math.max(1, newPage);
    if (
      pageToNavigate !== currentPage &&
      (pageToNavigate <= totalPages || totalPages === 0)
    ) {
      updateRouterQuery({ page: pageToNavigate });
    }
  };

  const handleLimitChange = (newLimit: number) => {
    if (newLimit > 0 && newLimit !== limit) {
      updateRouterQuery({ limit: newLimit, page: 1 });
    }
  };

  const formatCurrency = (amountInCents: number): string => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amountInCents / 100);
  };

  if (isLoading && products.length === 0 && !error)
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="ml-3 text-lg text-gray-600">Loading products...</p>
      </div>
    );

  if (error)
    return (
      <div className="p-6 text-center bg-red-50 border border-red-200 rounded-lg">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-lg text-red-700">Error: {error}</p>
        <button
          onClick={() => fetchProducts(currentPage, limit)}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Try Reload
        </button>
      </div>
    );

  return (
    <>
      <Head>
        <meta
          name="description"
          content="Manage all products for InhalerStore."
        />
      </Head>

      {/* Top action bar: Title and Add Product Button */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Product Catalog{" "}
          <span className="text-base font-normal text-gray-500">
            ({totalProducts} total)
          </span>
        </h2>
        <Link href="/admin/products/new" legacyBehavior>
          <a className="flex items-center px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <PlusCircle size={20} className="mr-2" />
            Add New Product
          </a>
        </Link>
      </div>

      {/* TODO: Add Filter section here (similar to orders page) */}
      {/* <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Filter Products</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="nameFilter" className="block text-sm font-medium text-gray-700">Name / Slug</label>
            <input type="text" id="nameFilter" placeholder="Search by name or slug" className="mt-1 ..."/>
          </div>
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">Status</label>
            <select id="statusFilter" className="mt-1 ...">
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" className="w-full ... bg-blue-600 ...">Apply</button>
          </div>
        </div>
      </div>
      */}

      {isLoading && products.length > 0 && (
        <div className="text-center py-4 text-gray-600">
          <RefreshCw className="w-5 h-5 inline mr-2 animate-spin" />
          Refreshing products...
        </div>
      )}

      {!isLoading && products.length === 0 && !error && (
        <div className="text-center py-10 bg-white rounded-lg shadow mt-6">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No products found.</p>
          <Link href="/admin/products/new" legacyBehavior>
            <a className="text-blue-600 hover:underline font-medium">
              Create one now!
            </a>
          </Link>
        </div>
      )}

      {products.length > 0 && (
        <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name / Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr
                  key={product._id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <img
                      src={product.images[0] || "/placeholder-image.jpg"}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-md border border-gray-200"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-500">{product.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                    {product.stockQuantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                                     ${
                                       product.isActive
                                         ? "bg-green-100 text-green-800"
                                         : "bg-red-100 text-red-800"
                                     }`}
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/admin/products/${product._id}`}
                        legacyBehavior
                      >
                        <a className="text-indigo-600 hover:text-indigo-900 hover:underline flex items-center">
                          <Edit3 size={16} className="mr-1" /> Edit
                        </a>
                      </Link>
                      <button
                        onClick={() =>
                          handleToggleActive(product._id, product.isActive)
                        }
                        className={`flex items-center font-medium ${
                          product.isActive
                            ? "text-red-600 hover:text-red-900 hover:underline"
                            : "text-green-600 hover:text-green-900 hover:underline"
                        }`}
                        disabled={isLoading}
                      >
                        {product.isActive ? (
                          <ToggleRight
                            size={18}
                            className="mr-1 text-red-500"
                          />
                        ) : (
                          <ToggleLeft
                            size={18}
                            className="mr-1 text-green-500"
                          />
                        )}
                        {product.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 0 && products.length > 0 && (
        <div className="py-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
          <div className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of{" "}
            <span className="font-medium">
              {totalPages === 0 ? 1 : totalPages}
            </span>
            <span className="hidden sm:inline">
              {" "}
              | Total Products:{" "}
              <span className="font-medium">{totalProducts}</span>
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
            <label htmlFor="limitSelect" className="sr-only">
              Items per page
            </label>
            <select
              id="limitSelect"
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
const AdminProductsPageWithLayout: React.FC<AdminAuthProps> = (props) => {
  return (
    <AdminLayout pageTitle="Manage Products">
      <AdminProductsContent {...props} />
    </AdminLayout>
  );
};

export default withAdminAuth(AdminProductsPageWithLayout);
