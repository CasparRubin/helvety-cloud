import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@helvety-cloud/crypto",
    "@helvety-cloud/api-contract",
    "@helvety-cloud/db",
  ],
};

export default withNextIntl(nextConfig);
