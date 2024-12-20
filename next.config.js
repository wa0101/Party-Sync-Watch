/** @type {import('next').NextConfig} */
const nextConfig = {
  // we need this for render.com deployment
  output: 'standalone',
  
  // allow uploads from our backend
  images: {
    domains: ['localhost'].concat(
      process.env.RENDER_EXTERNAL_URL 
        ? [new URL(process.env.RENDER_EXTERNAL_URL).hostname]
        : ['party-sync-watch.onrender.com']
    ),
  },

  // ignore websocket warnings
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /node_modules\/ws\/lib\// }
    ]
    return config
  }
}

module.exports = nextConfig 