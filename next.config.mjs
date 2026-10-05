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
  serverExternalPackages: ['tesseract.js', '@tesseract.js-data/eng'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }
    ]
  }
};
export default nextConfig;
