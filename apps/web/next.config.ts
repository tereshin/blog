import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@blog/ui', '@blog/i18n'],
  agentRules: false,
};

export default nextConfig;
