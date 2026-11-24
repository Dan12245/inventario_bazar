/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: [
    "machinery-prefers-guide-host.trycloudflare.com",
  ],
};

export default nextConfig;
