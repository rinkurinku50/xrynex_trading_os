import { execFileSync } from 'node:child_process';

function getBuildTimestamp() {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIMESTAMP: getBuildTimestamp(),
  },
  serverExternalPackages: ['tesseract.js', '@tesseract.js-data/eng', 'tesseract.js-core'],
  outputFileTracingIncludes: {
    '/api/calendar-screenshot': [
      './node_modules/tesseract.js/**/*',
      './node_modules/tesseract.js-core/**/*',
      './node_modules/@tesseract.js-data/eng/4.0.0_best_int/**/*',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }
    ]
  }
};
export default nextConfig;
