import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// Define the base Next.js configuration
const baseConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  allowedDevOrigins: [
    'aams-logistics.kerd2sy.com',
    '*.kerd2sy.com',
    'localhost:3001',
    'localhost:3000',
    'localhost'
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.slingacademy.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'clerk.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'aams-logistics.kerd2sy.com',
        port: ''
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8081'
      }
    ]
  },
  transpilePackages: ['geist'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  async rewrites() {
    const apiHost = process.env.API_HOST || 'http://localhost:8081';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiHost}/api/v1/:path*`
      },
      {
        source: '/uploads/:path*',
        destination: `${apiHost}/uploads/:path*`
      }
    ];
  }
};

let configWithPlugins = baseConfig;

// Conditionally enable Sentry configuration only when credentials are provided
if (
  !process.env.NEXT_PUBLIC_SENTRY_DISABLED &&
  Boolean(process.env.SENTRY_AUTH_TOKEN) &&
  Boolean(process.env.NEXT_PUBLIC_SENTRY_ORG)
) {
  configWithPlugins = withSentryConfig(configWithPlugins, {
    org: process.env.NEXT_PUBLIC_SENTRY_ORG,
    project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    tunnelRoute: '/monitoring',

    // Disable Sentry telemetry
    telemetry: false,

    // Sentry v10: moved under webpack namespace
    webpack: {
      reactComponentAnnotation: {
        enabled: true
      },
      treeshake: {
        removeDebugLogging: true
      }
    },

    sourcemaps: {
      disable: false
    }
  });
}

const nextConfig = configWithPlugins;
export default nextConfig;
