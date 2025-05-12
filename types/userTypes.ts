export interface IAdminUserData { // Choose a clear name for the plain data type
    id: string; // or _id: string, matching your API response
    email: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN';
    createdAt?: string | Date; // Optional, depending on what /api/auth/me returns
    updatedAt?: string | Date; // Optional
    // Add any other fields your /api/auth/me returns for the user object
  }