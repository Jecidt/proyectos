import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow better-sqlite3 and puppeteer native modules to run server-side
  serverExternalPackages: ["better-sqlite3", "puppeteer"],
};

export default nextConfig;
