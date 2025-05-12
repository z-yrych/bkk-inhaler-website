// hooks/useAuth.ts
import { useAuthContext } from '@/context/AuthContext'; // Adjust path if your AuthContext.tsx is elsewhere

// Re-exporting useAuthContext as useAuth for conventional hook naming
export const useAuth = () => {
  return useAuthContext();
};

// You can also directly export it if you prefer:
// export { useAuthContext as useAuth } from '@/context/AuthContext';