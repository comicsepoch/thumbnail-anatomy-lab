import type { NextConfig } from "next";

// When GITHUB_PAGES=true (set by scripts/build-gh-pages.sh) this produces a
// fully static export suitable for GitHub Pages, served from a project path
// like https://<user>.github.io/thumbnail-anatomy-lab/. In every other case
// (local dev, Vercel, etc.) the app builds normally with its API routes.
const isGithubPages = process.env.GITHUB_PAGES === "true";
const repoName = "thumbnail-anatomy-lab";

const nextConfig: NextConfig = {
  ...(isGithubPages
    ? {
        output: "export",
        basePath: `/${repoName}`,
        assetPrefix: `/${repoName}/`,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
