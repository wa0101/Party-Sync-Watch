/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /node_modules\/ws\/lib\// }
    ]
    return config
  }
}

module.exports = nextConfig 