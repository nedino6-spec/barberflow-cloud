export const getToken = () => localStorage.getItem('token');
export const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getServerUrl = () => {
  const hostname = window.location.hostname;
  
  // Se estiver acessando do próprio PC local, NUNCA usar URL salva, sempre forçar localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${window.location.protocol}//${hostname}:3001`;
  }

  const saved = localStorage.getItem('server_url');
  if (saved) return saved;

  if (hostname.startsWith('192.168.')) {
    return `${window.location.protocol}//${hostname}:3001`;
  } else {
    // Se for um link público ou outro, usa o endereço atual do navegador
    let url = `${window.location.protocol}//${window.location.hostname}`;
    if (window.location.port && window.location.port !== '80' && window.location.port !== '443') {
        url += `:${window.location.port}`;
    }
    return url;
  }
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



