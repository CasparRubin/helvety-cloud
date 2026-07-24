import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@helvety-cloud/crypto",
    "@helvety-cloud/api-contract",
    "@helvety-cloud/db",
  ],
};

export default nextConfig;
