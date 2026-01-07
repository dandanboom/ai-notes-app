import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // 开发环境禁用
});

const nextConfig: NextConfig = {
  // 注意：next-pwa 需要 webpack，所以 build 命令使用 --webpack 标志
  // 开发环境默认使用 Turbopack，生产构建使用 Webpack
};

export default withPWA(nextConfig);
