import type { NextConfig } from "next";

const HELVETY_COM = "https://helvety.com";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@helvety-cloud/crypto",
    "@helvety-cloud/api-contract",
    "@helvety-cloud/db",
  ],
  async redirects() {
    return [
      {
        source: "/legal",
        destination: `${HELVETY_COM}/impressum`,
        permanent: true,
      },
      {
        source: "/legal/impressum",
        destination: `${HELVETY_COM}/impressum`,
        permanent: true,
      },
      {
        source: "/legal/terms",
        destination: `${HELVETY_COM}/terms`,
        permanent: true,
      },
      {
        source: "/legal/privacy",
        destination: `${HELVETY_COM}/privacy`,
        permanent: true,
      },
      {
        source: "/legal/aup",
        destination: `${HELVETY_COM}/terms`,
        permanent: true,
      },
      {
        source: "/legal/e2ee",
        destination: `${HELVETY_COM}/terms`,
        permanent: true,
      },
      {
        source: "/legal/billing",
        destination: `${HELVETY_COM}/terms`,
        permanent: true,
      },
      {
        source: "/legal/subprocessors",
        destination: `${HELVETY_COM}/privacy`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
