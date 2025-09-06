/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server-side rendering settings for Render
  output: 'standalone', // Use standalone output for better deployment
  trailingSlash: true, // Enable for better compatibility
  
  // Completely disable static generation to prevent Html import issues
  outputFileTracing: false,
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  // Force all pages to be dynamic
  async rewrites() {
    return []
  },
  
  // Images configuration
  images: {
    domains: ['localhost', 'render.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.render.com',
      },
    ],
    unoptimized: true, // For static export compatibility
  },
  
  // Experimental features
  experimental: {
    esmExternals: false,
    // Disable static optimization completely
    staticPageGenerationTimeout: 0,
  },
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  distDir: '.next',
  swcMinify: true,
  
  // Custom webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Handle file system fallbacks
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Handle pdf-parse build issues
    config.module.rules.push({
      test: /\.node$/,
      use: 'raw-loader',
    });
    
    // Ignore test files from pdf-parse
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    config.externals = config.externals || [];
    config.externals.push({
      'pdf-parse': 'commonjs pdf-parse',
    });
    
    // Aggressively disable static generation on server side
    if (isServer) {
      config.optimization = config.optimization || {}
      config.optimization.splitChunks = false
      config.optimization.minimize = false
      
      // Disable static page generation completely
      config.plugins = config.plugins || []
      config.plugins.push(
        new (require('webpack')).DefinePlugin({
          'process.env.NEXT_PHASE': JSON.stringify('phase-production-build'),
          'process.env.NEXT_RUNTIME': JSON.stringify('nodejs'),
        })
      )
      
      // Remove any static generation plugins
      config.plugins = config.plugins.filter(plugin => {
        return !plugin.constructor.name.includes('Static') && 
               !plugin.constructor.name.includes('StaticGeneration')
      })
    }
    
    return config;
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig