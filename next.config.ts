import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  // Fix the deprecated option
  serverExternalPackages: ['ssh2', 'ws'],
  
  // Configure webpack for better WebSocket handling
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Optimize server-side WebSocket handling
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      })
      
      // Add polling configuration for file watching
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    
    // Resolve WebSocket-related modules
    config.resolve = config.resolve || {}
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      fs: false,
    }
    
    return config
  },

  // Headers for WebSocket support
  async headers() {
    return [
      {
        source: '/api/terminal/:path*',
        headers: [
          {
            key: 'Connection',
            value: 'upgrade',
          },
          {
            key: 'Upgrade',
            value: 'websocket',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache',
          },
        ],
      },
    ]
  },
}

export default nextConfig;
