/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Node server runtime and prevent static export on Render
  output: 'standalone',
  // Default to fully dynamic to avoid build-time prerender of API routes/pages
  experimental: {
    // keep other experimental defaults if any in Next
  },
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
  webpack: (config) => {
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
    
    return config;
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  // Server-side rendering settings for Render
  output: 'standalone', // Use standalone output for better deployment
  trailingSlash: true, // Enable for better compatibility
  // Completely disable static generation to prevent React Context issues
  experimental: {
    esmExternals: false,
  },
  // Disable static optimization completely
  distDir: '.next',
  // Disable all static optimization
  swcMinify: true,
  // Custom webpack configuration to disable static generation
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Disable static generation on server side
      config.optimization = config.optimization || {}
      config.optimization.splitChunks = false
    }
    return config
  },
  // Environment variables are handled by Next.js automatically
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