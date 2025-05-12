// components/auth/withAdminAuth.tsx
import React, { useEffect, ComponentType } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth"; // We'll assume this hook exists or create it next
import { IAdminUserData } from "@/types/userTypes";

// Props that the HOC will inject into the wrapped component
export interface AdminAuthProps {
  adminUser: IAdminUserData; // The HOC ensures this is not null when the component renders
  // You can add other auth-related props like the token or logout function if needed
}

const withAdminAuth = <P extends object>(
  WrappedComponent: ComponentType<P & AdminAuthProps>
) => {
  const WithAdminAuthComponent: React.FC<P> = (props) => {
    const { adminUser, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !adminUser) {
        // If not loading and no admin user (meaning not authenticated or token invalid)
        router.replace("/admin/login"); // Redirect to admin login page
      }
    }, [isLoading, adminUser, router]);

    if (isLoading) {
      // You can render a global loading spinner or a simple message
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          Loading Admin Panel...
        </div>
      );
    }

    if (!adminUser) {
      // This case is primarily for the brief moment before the redirect effect runs,
      // or if the redirect hasn't completed. Showing null or a minimal loader is fine.
      // The useEffect above will handle the redirect.
      return null; // Or a more sophisticated loading/unauthorized screen
    }

    // If authenticated and not loading, render the wrapped component
    // and pass down the adminUser and original props.
    return <WrappedComponent {...(props as P)} adminUser={adminUser} />;
  };

  // Set a display name for easier debugging in React DevTools
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";
  WithAdminAuthComponent.displayName = `WithAdminAuth(${displayName})`;

  return WithAdminAuthComponent;
};

export default withAdminAuth;
