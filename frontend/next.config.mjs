const backendOrigin = (
  process.env.BACKEND_URL ?? "http://localhost:7000"
).replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      resourceQuery: /raw/,
      type: "asset/source",
    });

    return config;
  },
};

export default nextConfig;
