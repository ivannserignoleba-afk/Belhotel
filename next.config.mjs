/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Anciennes URLs du site statique → nouvelles routes
      { source: '/index.html', destination: '/', permanent: false },
      { source: '/chambres.html', destination: '/chambres', permanent: false },
      { source: '/restaurant.html', destination: '/restaurant', permanent: false },
      { source: '/bar.html', destination: '/bar', permanent: false },
      // Espace admin : encore servi par les pages statiques de public/
      { source: '/admin', destination: '/admin.html', permanent: false },
      { source: '/admin/login', destination: '/admin-login.html', permanent: false },
    ];
  },
};

export default nextConfig;
