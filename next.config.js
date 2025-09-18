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
    
    // Exclude working folders from compilation
    config.module.rules.push({
      test: /\.(ts|tsx|js|jsx)$/,
      exclude: [
        /node_modules/,
        /market page working/,
        /backup/,
      ],
    });
    
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com https://charting-library.tradingview.com https://*.tradingview.com; style-src 'self' 'unsafe-inline' https://charting-library.tradingview.com https://*.tradingview.com; img-src 'self' data: https: https://s3.tradingview.com https://*.tradingview.com; font-src 'self' data: https://charting-library.tradingview.com https://*.tradingview.com; connect-src 'self' https: wss: https://data.tradingview.com https://symbol-search.tradingview.com https://*.tradingview.com wss://*.tradingview.com; frame-src 'self' https://s3.tradingview.com https://charting-library.tradingview.com https://*.tradingview.com; child-src https://*.tradingview.com; frame-ancestors 'none';",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'Origin-Agent-Cluster',
            value: '?1',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'X-Download-Options',
            value: 'noopen',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig