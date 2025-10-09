import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true  // Opcional: React Compiler
  },
  images: {
    domains: ['exemplo.com'],
  },
}

export default nextConfig