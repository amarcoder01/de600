/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server-side rendering settings for Render
  output: 'standalone', // Use standalone output for better deployment
  trailingSlash: true, // Enable for better compatibility
  
  // Completely disable static generation to prevent Html import issues
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  // Disable static optimization completely
  experimental: {
    esmExternals: false,
    // Force all pages to be dynamic
    staticPageGenerationTimeout: 0,
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
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  distDir: '.next',
  swcMinify: true,
  
  // Custom webpack configuration
  webpack: (config, { isServer }) => {
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
    
    // Aggressively disable static generation
    if (isServer) {
      config.optimization = config.optimization || {}
      config.optimization.splitChunks = false
      config.optimization.minimize = false
      
      // Remove static generation plugins
      config.plugins = config.plugins || []
      config.plugins = config.plugins.filter(plugin => {
        return !plugin.constructor.name.includes('Static') && 
               !plugin.constructor.name.includes('StaticGeneration') &&
               !plugin.constructor.name.includes('StaticOptimization')
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