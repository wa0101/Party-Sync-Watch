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

  // handle both app and pages
  experimental: {
    appDir: true,
  }
}

module.exports = nextConfig 