/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Anciennes URLs du site statique → nouvelles routes
      { source: '/index.html', destination: '/', permanent: false },
      { source: '/chambres.html', destination: '/chambres', permanent: false },
      { source: '/restaurant.html', destination: '/restaurant', permanent: false },
      { source: '/bar.html', destination: '/bar', permanent: false },
      // Les QR codes déjà imprimés pointent vers commander.html?c=... :
      // la redirection conserve automatiquement le paramètre ?c
      { source: '/commander.html', destination: '/commander', permanent: false },
      // Ancien espace admin
      { source: '/admin.html', destination: '/admin', permanent: false },
      { source: '/admin-login.html', destination: '/admin/login', permanent: false },
    ];
  },
};

export default nextConfig;
