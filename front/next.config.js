/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removido o rewrite - agora usamos rotas API explícitas em app/api/
  // Se precisar de outras rotas proxy, adicione rotas específicas em app/api/
};

module.exports = nextConfig;
