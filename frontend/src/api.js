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
  
  // URL Pública Permanente (Túnel)
  const PUBLIC_URL = 'https://barberflow-elite-nedino.loca.lt';

  // Se estiver acessando via APK (hostname localhost no WebView), preferir a URL salva ou a Pública
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const saved = localStorage.getItem('server_url');
    if (saved) return saved;
    // Se não tiver salva, e estiver no PC (porta 3000 ou 5173 costumam ser dev), usa local:3001
    if (window.location.port === '3000' || window.location.port === '5173') {
        return `http://${hostname}:3001`;
    }
    // Caso contrário (APK), usa a URL pública
    return PUBLIC_URL;
  }

  const saved = localStorage.getItem('server_url');
  if (saved) return saved;

  if (hostname.startsWith('192.168.')) {
    return `${window.location.protocol}//${hostname}:3001`;
  } else {
    return `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
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



