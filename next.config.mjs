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
      './node_modules/bmp-js/index.js',
      './node_modules/bmp-js/lib/**/*.js',
      './node_modules/idb-keyval/**/*',
      './node_modules/is-url/**/*',
      './node_modules/node-fetch/**/*',
      './node_modules/regenerator-runtime/**/*',
      './node_modules/wasm-feature-detect/**/*',
      './node_modules/zlibjs/**/*',
      './node_modules/whatwg-url/**/*',
      './node_modules/tr46/**/*',
      './node_modules/webidl-conversions/**/*',
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
