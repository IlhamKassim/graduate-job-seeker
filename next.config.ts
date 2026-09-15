import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Static export was dropped so waitlist and events can POST to Route Handlers.
 * trailingSlash stays so existing /shortlist/ links keep working.
 */
const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  typedRoutes: false,
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
