import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Evita que Turbopack busque lockfiles fuera del proyecto.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
