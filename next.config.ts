// next.config.mjs (or .js, or .ts if you are using TypeScript for your Next.js config)
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Or your existing reactStrictMode setting
  images: {
    remotePatterns: [
      {
        protocol: "https", // Assuming your images from sample.com are served over HTTPS
        hostname: "sample.com",
        // port: '', // Optional: if specific port
        // pathname: '/some/path/**', // Optional: if specific path pattern
      },
      {
        protocol: "https", // Assuming your images from example.com are served over HTTPS
        hostname: "example.com", // Added the new hostname from the error
        // port: '', // Optional
        // pathname: '/assets/**', // Optional
      },
      // You can add more hostnames here if you use images from other external domains
      // For example, if your product images in the database are full URLs from a CDN:
      {
        protocol: "https",
        hostname: "ph.pinterest.com",
      },
    ],
    // If you were using the older 'domains' configuration (less common now, remotePatterns is preferred):
    // domains: ['sample.com', 'example.com', 'your-cdn-provider.com'],
  },
  // ... any other configurations you have ...
};

export default nextConfig;
