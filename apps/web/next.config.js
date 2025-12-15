/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@shuguridan/shared'],
  // Railway/Docker deployment optimization
  output: 'standalone',
  // Experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['react-markdown', 'prism-react-renderer'],
  },
}

module.exports = nextConfig
