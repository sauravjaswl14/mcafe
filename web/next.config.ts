import type { NextConfig } from 'next';

const config: NextConfig = {
  // Lets the app import ../shared/catalog.ts (the single source of truth)
  experimental: { externalDir: true },
};

export default config;
