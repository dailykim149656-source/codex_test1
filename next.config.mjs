/** @type {import('next').NextConfig} */
const hasGoogleAuth = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: hasGoogleAuth ? "true" : "false",
  },
};

export default nextConfig;
