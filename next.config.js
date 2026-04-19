/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'rajyasabha.nic.in',
      },
      {
        protocol: 'https',
        hostname: 'sansad.in',
      },
      {
        protocol: 'https',
        hostname: 'loksabha.nic.in',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Rewrites for clean URLs
  async rewrites() {
    return [];
  },
};

export default nextConfig;
