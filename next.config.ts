import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * The pilot ships as a folder of static files: no database, no auth, no server
 * actions, nothing to run. Directory-style URLs keep it working from a plain
 * static file server without any rewrite rules.
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  typedRoutes: false,
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
