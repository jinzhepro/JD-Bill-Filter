/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  // 启用 Suspense streaming（Next.js 16 默认启用）
  experimental: {
    ppr: false, // 部分预渲染，关闭以保持兼容性
  },
};

export default nextConfig;
