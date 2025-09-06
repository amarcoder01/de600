/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server-side rendering settings for Render
  output: 'standalone', // Use standalone output for better deployment
  trailingSlash: true, // Enable for better compatibility
  
  // Build configuration
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  // Experimental features
  experimental: {
    esmExternals: false,
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
    
    config.externals = config.externals || [];
    config.externals.push({
      'pdf-parse': 'commonjs pdf-parse',
    });
    
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