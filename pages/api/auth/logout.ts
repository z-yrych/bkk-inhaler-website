// pages/api/auth/logout.ts
import { NextApiRequest, NextApiResponse } from 'next';

async function logoutHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // For stateless JWTs, logout is primarily a client-side operation (clearing the token).
  // The server doesn't need to do much unless implementing a token blacklist.
  // This endpoint can simply acknowledge the request.

  // Optionally, you could add cookie clearing here if tokens were stored in HttpOnly cookies.
  // res.setHeader('Set-Cookie', 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict');

  return res.status(200).json({ message: 'Logout successful.' });
}

// Decide if logout needs to be protected.
// If protected, it ensures an active session exists to be "logged out".
// If not protected, any client can hit this endpoint.
// For simplicity and given it's mainly client-side, making it unprotected is often fine.
// export default withAdminAuth(logoutHandler); // If you want to protect it
export default logoutHandler; // Unprotected