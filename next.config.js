/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: 'https', hostname: 'vuyjiqkmglcemnruiwnx.supabase.co' }],
  },
};

module.exports = nextConfig;
