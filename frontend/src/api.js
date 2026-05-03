export const getToken = () => localStorage.getItem('token');
export const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getServerUrl = () => {
  // 1. Prioridade Máxima: URL salva manualmente (via Configurações do App)
  const saved = localStorage.getItem('server_url');
  if (saved) return saved;

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;

  // 2. Se estiver no PC (Localhost), usa a porta 3001
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:3001`;
  }

  // 3. Se estiver na Nuvem (Railway/Render) ou via Túnel
  // Retorna a URL completa atual (origin)
  if (hostname && hostname !== '') {
    return window.location.origin;
  }

  // 4. Fallback Padrão (Caso nada funcione ou seja um APK sem hostname definido)
  return 'https://barberflow-cloud.up.railway.app'; // URL sugerida para a nuvem
};

export const setServerUrl = (url) => {
  if (url) {
    // Remove barra final se existir
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    localStorage.setItem('server_url', cleanUrl);
  } else {
    localStorage.removeItem('server_url');
  }
};

export const apiFetch = async (url, options = {}, retries = 3) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const baseUrl = getServerUrl();

  try {
    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers
    });
    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`[API] Erro na requisição, tentando novamente... (${retries} restantes)`);
      await new Promise(res => setTimeout(res, 2000));
      return apiFetch(url, options, retries - 1);
    }
    throw error;
  }
};



