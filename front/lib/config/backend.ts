/**
 * Obtém a URL do backend configurada nas variáveis de ambiente
 * Prioriza NEXT_PUBLIC_BACKEND_URL para funcionar tanto no cliente quanto no servidor
 */
export function getBackendUrl(): string {
  // Priorizar NEXT_PUBLIC_BACKEND_URL (funciona em client e server)
  // Fallback para BACKEND_URL (apenas server)
  // Último fallback: localhost para desenvolvimento
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    'http://localhost:3002'
  );
}

/**
 * Obtém a URL completa da API do backend
 */
export function getBackendApiUrl(path: string = ''): string {
  const backendUrl = getBackendUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendUrl}/api${cleanPath}`;
}
