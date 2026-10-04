import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vercel Image Optimization의 402 제한과 무관하게 원본/서명 URL을 직접 제공한다.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zikneyjidzovvkmflibo.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['recharts', '@tiptap/react', '@tiptap/starter-kit'],
  },
  // 성능 최적화
  poweredByHeader: false,
  compress: true,
  // 보안 헤더
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
};

export default nextConfig;
