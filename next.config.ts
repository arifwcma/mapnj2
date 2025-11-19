import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.65', '192.168.1.0/24', '192.168.1.118'],
};

export default nextConfig;
