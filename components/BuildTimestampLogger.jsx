'use client';

import { useEffect, useRef } from 'react';

export default function BuildTimestampLogger() {
  const hasLoggedBuildTimestamp = useRef(false);

  useEffect(() => {
    if (hasLoggedBuildTimestamp.current) return;
    hasLoggedBuildTimestamp.current = true;

    const timestamp = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
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