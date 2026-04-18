import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
  transpilePackages: ["react-pdf", "pdfjs-dist"],
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.devtool = false;
    }
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
    };

    // Fix pdfjs-dist Node.js core module resolution issues in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
      };
    }
    
    // Correctly handle pdfjs-dist ESM modules
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules\/pdfjs-dist/,
      type: "javascript/auto",
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
};

export default nextConfig;
