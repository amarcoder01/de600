/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server-side rendering settings for Render
  // output: 'standalone', // Temporarily disabled to fix routing issues
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
  
  // Enhanced security headers
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
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig