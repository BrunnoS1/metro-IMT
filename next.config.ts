import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: [process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME + '.s3.' + process.env.NEXT_PUBLIC_AWS_REGION + '.amazonaws.com'],
  },
};

export default nextConfig;