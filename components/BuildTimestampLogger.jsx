'use client';

import { useEffect } from 'react';

let hasLoggedBuildTimestamp = false;

export default function BuildTimestampLogger() {
  useEffect(() => {
    if (hasLoggedBuildTimestamp) return;
    hasLoggedBuildTimestamp = true;

    const timestamp = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(process.env.NEXT_PUBLIC_BUILD_TIMESTAMP))
      .replace(',', '')
      .toUpperCase();

    console.info(`Build Timestamp: ${timestamp}`);
  }, []);

  return null;
}