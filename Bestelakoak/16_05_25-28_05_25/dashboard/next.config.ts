import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  // Disable caching in development
  generateEtags: false,
  poweredByHeader: false,
  
  // Custom headers to prevent caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
  
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@services': path.resolve(__dirname, '../services'),
    };
    
    // Disable caching in development
    if (dev) {
      config.cache = false;
    }
    
    return config;
  },
};

export default nextConfig;
