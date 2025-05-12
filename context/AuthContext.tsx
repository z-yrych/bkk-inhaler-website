// context/AuthContext.tsx
import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { useRouter } from 'next/router';
import { IAdminUserData } from '@/types/userTypes'; // Your admin user type (adjust path if needed)

interface AuthContextType {
  adminUser: IAdminUserData | null;
  token: string | null;
  isLoading: boolean;
  login: (newToken: string, newAdminUser: IAdminUserData) => Promise<void>; // Made login async for potential post-login actions
  logout: () => void;
  setTokenAndUser: (newToken: string | null, newAdminUser: IAdminUserData | null) => void; // Helper for direct setting
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<IAdminUserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true to check initial auth state
  const router = useRouter();

  const fetchAdminProfile = useCallback(async (currentToken: string) => {
    if (!currentToken) {
        setAdminUser(null);
        setToken(null);
        localStorage.removeItem('adminToken');
        setIsLoading(false);
        return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setAdminUser(data.user);
          setToken(currentToken); // Ensure token state is also set
        } else {
          throw new Error('User data not found in /api/auth/me response');
        }
      } else {
        console.error('Failed to fetch admin profile, status:', res.status);
        // Token might be invalid or expired
        localStorage.removeItem('adminToken');
        setToken(null);
        setAdminUser(null);
      }
    } catch (error) {
      console.error('Error verifying token or fetching admin profile:', error);
      localStorage.removeItem('adminToken');
      setToken(null);
      setAdminUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect to load token and user on initial app load or token change
  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
      fetchAdminProfile(storedToken);
    } else {
      setIsLoading(false); // No token found, not loading
    }
  }, [fetchAdminProfile]); // Rerun if fetchAdminProfile identity changes (it shouldn't due to useCallback)

  const login = async (newToken: string, newAdminUser: IAdminUserData) => {
    console.log("AuthContext: login called with token:", newToken, "user:", newAdminUser);
    localStorage.setItem('adminToken', newToken);
    setToken(newToken);
    setAdminUser(newAdminUser);
    setIsLoading(false); // Ensure loading is false after login
    console.log("AuthContext: state updated, attempting redirect to /admin");
    await router.push('/admin'); // Redirect to admin dashboard after login
  };

  const logout = useCallback(async () => {
    const currentToken = localStorage.getItem('adminToken'); // Get token for API call
    if (currentToken) {
        try {
            // Optional: Call an API endpoint to invalidate token server-side
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
        } catch (error) {
            console.error("Error calling server logout:", error);
            // Proceed with client-side logout anyway
        }
    }
    localStorage.removeItem('adminToken');
    setToken(null);
    setAdminUser(null);
    setIsLoading(false);
    await router.push('/admin/login'); // Redirect to login page
  }, [router]);

  const setTokenAndUser = (newToken: string | null, newAdminUser: IAdminUserData | null) => {
    setToken(newToken);
    setAdminUser(newAdminUser);
    if (newToken) {
      localStorage.setItem('adminToken', newToken);
    } else {
      localStorage.removeItem('adminToken');
    }
  };

  return (
    <AuthContext.Provider value={{ adminUser, token, isLoading, login, logout, setTokenAndUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// This is the custom hook that components will use to access the context
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};