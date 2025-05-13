import React, { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import withAdminAuth, { AdminAuthProps } from "@/components/auth/withAdminAuth";
import {
  IOrderData,
  OrderStatusType,
  OrderStatusEnumArray,
} from "@/types/OrderTypes"; // Adjust path if needed

interface OrderApiResponse {
  message?: string;
  order?: IOrderData; // API returns IOrderData from types/orderTypes.ts
  errors?: ApiErrorDetail[]; // FIXED: More specific type for errors
}

interface UpdateStatusApiResponse {
  message: string;
  order?: IOrderData; // API returns IOrderData
  errors?: ApiErrorDetail[]; // FIXED: More specific type for errors
}

// Type for API error objects (e.g., from Zod validation on backend)
interface ApiErrorDetail {
    message: string;
    path?: (string | number)[]; // Zod errors have a path
    // Add other potential error properties
}

const AdminOrderDetailPage: React.FC<AdminAuthProps> = ({ adminUser }) => {
  const router = useRouter();
  const { mongoOrderId } = router.query; // Get the order ID from the URL query

  const [order, setOrder] = useState<IOrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<OrderStatusType | "">(
    ""
  );
  const [adminNote, setAdminNote] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    if (!mongoOrderId || typeof mongoOrderId !== "string") {
      setError("Order ID is missing or invalid.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("adminToken"); // Or from useAuth()
      const res = await fetch(`/api/admin/orders/${mongoOrderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data: OrderApiResponse = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message || `Failed to fetch order details: ${res.statusText}`
        );
      }
      if (data.order) {
        setOrder(data.order);
        setSelectedStatus(data.order.orderStatus); // Initialize dropdown with current status
      } else {
        setError("Order not found or data missing.");
      }
    } catch (err) {
      // FIXED: Type check for err
      if (err instanceof Error) {
        console.error("Error fetching order details:", err);
        setError(err.message);
      } else {
        console.error("Unknown error fetching order details:", err);
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [mongoOrderId]);

  useEffect(() => {
    if (mongoOrderId && adminUser) {
      // Fetch only if mongoOrderId is available and user is authenticated
      fetchOrderDetails();
    }
  }, [mongoOrderId, adminUser, fetchOrderDetails]);

  const handleStatusUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStatus || !order) {
      setUpdateError("Please select a valid status.");
      return;
    }
    if (selectedStatus === order.orderStatus && !adminNote.trim()) {
      setUpdateError(
        "No changes detected (status is the same and no new note)."
      );
      return;
    }

    setIsUpdatingStatus(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/admin/orders/${mongoOrderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: selectedStatus,
          adminNote: adminNote.trim(),
        }),
      });

      const data: UpdateStatusApiResponse = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            data.errors?.map((err) => err.message).join(", ") ||
            "Failed to update order status."
        );
      }

      setOrder(data.order || null); // Update local order state with response
      if (data.order) setSelectedStatus(data.order.orderStatus); // Re-sync selectedStatus
      setAdminNote(""); // Clear note input
      setUpdateSuccess(data.message || "Order status updated successfully!");
      // Optionally, refetch or just update state
      // fetchOrderDetails(); // Could refetch, but updating state directly is faster
    } catch (err) {
      // FIXED: Type check for err
      if (err instanceof Error) {
        setUpdateError(err.message);
      } else {
        setUpdateError("An unexpected error occurred while updating status.");
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Helper to format date
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Helper to format currency (from cents)
  const formatCurrency = (amountInCents: number | undefined) => {
    if (amountInCents === undefined) return "N/A";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amountInCents / 100);
  };

  const formatStatus = (status: OrderStatusType | undefined) => {
    if (!status) return "N/A";
    return status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char: string) => char.toUpperCase());
  };

  if (isLoading)
    return <div style={pageCenterStyle}>Loading order details...</div>;
  if (error)
    return (
      <div style={{ ...pageCenterStyle, color: "red" }}>
        Error: {error}.{" "}
        <Link href="/admin/orders" legacyBehavior>
          <a>Back to orders</a>
        </Link>
      </div>
    );
  if (!order)
    return (
      <div style={pageCenterStyle}>
        Order not found.{" "}
        <Link href="/admin/orders" legacyBehavior>
          <a>Back to orders</a>
        </Link>
      </div>
    );

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <Head>
        <title>Admin - Order Details #{order.orderId}</title>
      </Head>

      <div style={{ marginBottom: "20px" }}>
        <Link href="/admin/orders" legacyBehavior>
          <a style={{ textDecoration: "none", color: "#0070f3" }}>
            &larr; Back to All Orders
          </a>
        </Link>
      </div>

      <h1>Order Details: #{order.orderId}</h1>
      <p>
        <strong>Internal ID:</strong> {order._id}
      </p>
      <p>
        <strong>Date Placed:</strong> {formatDate(order.createdAt)}
      </p>
      <p>
        <strong>Last Updated:</strong> {formatDate(order.updatedAt)}
      </p>
      <p>
        <strong>Current Status:</strong>{" "}
        <span
          style={{
            fontWeight: "bold",
            color: getStatusColor(order.orderStatus),
          }}
        >
          {formatStatus(order.orderStatus)}
        </span>
      </p>
      <p>
        <strong>Total Amount:</strong> {formatCurrency(order.totalAmount)}
      </p>

      <div style={sectionStyle}>
        <h2>Customer Details</h2>
        <p>
          <strong>Name:</strong> {order.customerDetails.firstName}{" "}
          {order.customerDetails.lastName}
        </p>
        <p>
          <strong>Email:</strong> {order.customerDetails.email}
        </p>
        <p>
          <strong>Phone:</strong> {order.customerDetails.phone || "N/A"}
        </p>
        <h3>Shipping Address</h3>
        <address style={{ whiteSpace: "pre-line" }}>
          {order.customerDetails.shippingAddress.street}
          <br />
          Brgy. {order.customerDetails.shippingAddress.barangay},{" "}
          {order.customerDetails.shippingAddress.city}
          <br />
          {order.customerDetails.shippingAddress.province},{" "}
          {order.customerDetails.shippingAddress.postalCode}
          <br />
          {order.customerDetails.shippingAddress.country}
        </address>
      </div>

      <div style={sectionStyle}>
        <h2>Order Items</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={tableCellStyle}>Product</th>
              <th style={tableCellStyle}>SKU/ID</th>
              <th style={tableCellStyle}>Quantity</th>
              <th style={tableCellStyle}>Price at Purchase</th>
              <th style={tableCellStyle}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {order.orderItems.map((item, index) => (
              <tr
                key={item.productId?.toString() || index}
                style={{ borderBottom: "1px solid #eee" }}
              >
                {" "}
                {/* Use productId if available and stringified, else index */}
                <td style={tableCellStyle}>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: "50px",
                        height: "50px",
                        marginRight: "10px",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  {item.name}
                </td>
                <td style={tableCellStyle}>
                  <small>{item.productId?.toString()}</small>
                </td>
                <td style={{ ...tableCellStyle, textAlign: "center" }}>
                  {item.quantity}
                </td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>
                  {formatCurrency(item.priceAtPurchase)}
                </td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>
                  {formatCurrency(item.priceAtPurchase * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={sectionStyle}>
        <h2>Payment Details</h2>
        <p>
          <strong>PayMongo Checkout ID:</strong>{" "}
          {order.paymentDetails?.paymongoCheckoutId || "N/A"}
        </p>
        <p>
          <strong>PayMongo Payment Intent ID:</strong>{" "}
          {order.paymentDetails?.paymongoPaymentIntentId || "N/A"}
        </p>
        <p>
          <strong>PayMongo Payment ID:</strong>{" "}
          {order.paymentDetails?.paymongoPaymentId || "N/A"}
        </p>
        <p>
          <strong>Payment Method:</strong>{" "}
          {order.paymentDetails?.paymentMethod || "N/A"}
        </p>
        <p>
          <strong>Payment Date:</strong>{" "}
          {formatDate(order.paymentDetails?.paymentDate)}
        </p>
        <p>
          <strong>Gateway Status:</strong>{" "}
          {order.paymentDetails?.status || "N/A"}
        </p>
      </div>

      <div style={sectionStyle}>
        <h2>Update Order Status</h2>
        <form onSubmit={handleStatusUpdate}>
          <div>
            <label htmlFor="status" style={{ marginRight: "10px" }}>
              New Status:
            </label>
            <select
              id="status"
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as OrderStatusType)
              }
              required
              style={{ padding: "8px", marginRight: "10px" }}
            >
              {OrderStatusEnumArray.map((statusValue) => (
                <option key={statusValue} value={statusValue}>
                  {formatStatus(statusValue)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: "10px" }}>
            <label htmlFor="adminNote">Admin Note (optional):</label>
            <textarea
              id="adminNote"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "8px",
                marginTop: "5px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              placeholder="Add a note about this status change..."
            />
          </div>
          <button
            type="submit"
            disabled={
              isUpdatingStatus ||
              (selectedStatus === order.orderStatus && !adminNote.trim())
            }
            style={{
              marginTop: "15px",
              padding: "10px 20px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {isUpdatingStatus ? "Updating..." : "Update Status"}
          </button>
        </form>
        {updateError && (
          <p style={{ color: "red", marginTop: "10px" }}>
            Error: {updateError}
          </p>
        )}
        {updateSuccess && (
          <p style={{ color: "green", marginTop: "10px" }}>{updateSuccess}</p>
        )}
      </div>

      {order.adminNotes && (
        <div style={sectionStyle}>
          <h2>Admin Notes Log</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              backgroundColor: "#f9f9f9",
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #eee",
            }}
          >
            {order.adminNotes}
          </pre>
        </div>
      )}
    </div>
  );
};

// Basic styles (can be moved to CSS module or styled components)
const pageCenterStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "80vh",
  flexDirection: "column",
};
const sectionStyle: React.CSSProperties = {
  marginBottom: "30px",
  paddingBottom: "20px",
  borderBottom: "1px solid #eee",
};
const tableCellStyle: React.CSSProperties = {
  padding: "8px",
  border: "1px solid #ddd",
  textAlign: "left",
  verticalAlign: "top",
};

const getStatusColor = (status: OrderStatusType) => {
  switch (status) {
    case "PENDING_PAYMENT":
      return "#ffc107"; // Yellow
    case "PAYMENT_CONFIRMED":
      return "#28a745"; // Green
    case "PROCESSING":
      return "#17a2b8"; // Info Blue
    case "SHIPPED_LOCAL":
      return "#007bff"; // Primary Blue
    case "DELIVERED":
      return "#20c997"; // Teal
    case "PAYMENT_FAILED":
      return "#dc3545"; // Red
    case "CANCELLED_BY_ADMIN":
    case "CANCELLED_BY_CUSTOMER":
      return "#6c757d"; // Grey
    case "REFUNDED":
      return "#fd7e14"; // Orange
    default:
      return "#333";
  }
};

export default withAdminAuth(AdminOrderDetailPage);
