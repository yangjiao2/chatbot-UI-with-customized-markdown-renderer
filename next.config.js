/** @type {import('next').NextConfig} */
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`

const nextConfig = {
  //todo remove this for prod
  // productionBrowserSourceMaps: true,
  // TODO export is only for static export
  // output: 'export', 
  output: 'standalone',
  // distDir: 'build',
  // reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  webpack(config, { isServer, dev }) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },
  async redirects() {
    return [
      // {
      //   source: '/',
      //   destination: '/bot/scout',
      //   permanent: true,
      // },
      // {
      //   source: '/bot',
      //   destination: '/bot/nvbot',
      //   permanent: true,
      // }
    ]
  },
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)', // Matches all pages
  //       headers: [
  //         {
  //           key: 'Content-Security-Policy',
  //           // value: "frame-ancestors 'self' https://nvidia.sharepoint.com/sites/NVBOT-Test https://nvidia.sharepoint.com/sites/NVINFO-home/ https:"
  //           value: cspHeader.replace(/\n/g, ''),
  //         },
  //       ],
  //     },
  //   ]
  // },
};

module.exports = nextConfig;
