/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['mysql2'],
    serverActions: { bodySizeLimit: '50mb' },
  },
}

export default nextConfig
