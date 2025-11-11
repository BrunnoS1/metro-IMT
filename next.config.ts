import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: `${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com`,
        port: '',
        pathname: '/obras/**',
      },
    ],
  },
  // Rewrite requests to prevent Turbopack from rewriting WASM URLs
  async rewrites() {
    return [
      {
        source: '/_next/static/chunks/web-ifc.wasm',
        destination: '/web-ifc.wasm',
      },
      {
        source: '/_next/static/chunks/web-ifc-mt.wasm',
        destination: '/web-ifc-mt.wasm',
      },
    ];
  },
  webpack: (config: any) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },
};

export default nextConfig;