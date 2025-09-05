/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // Force all pages to be server-side rendered - disable static generation completely
  generateStaticParams: false,
  staticPageGenerationTimeout: 0,
  // Disable static optimization completely
  distDir: '.next',
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