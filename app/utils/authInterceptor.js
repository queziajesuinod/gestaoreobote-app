/**
 * Interceptor global para fetch que detecta token expirado (401)
 * e força redirecionamento para login
 */

let isRedirecting = false;

/**
 * Limpa dados de autenticação e redireciona para login
 */
export const forceLogout = () => {
  if (isRedirecting) return; // Evita múltiplos redirects simultâneos
  
  isRedirecting = true;
  
  // Limpa dados de autenticação
  localStorage.removeItem('token');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('user');
  
  // Redireciona para login
  window.location.href = '/login';
  
  // Reset flag após um tempo
  setTimeout(() => {
    isRedirecting = false;
  }, 1000);
};

/**
 * Verifica se o token JWT está expirado
 */
export const isTokenExpired = () => {
  const token = localStorage.getItem('token');
  
  if (!token) return true;
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const { exp } = JSON.parse(jsonPayload);
    
    if (!exp) return false; // Se não tem exp, considera válido
    
    // Verifica se expirou (exp está em segundos, Date.now() em milissegundos)
    return Date.now() >= exp * 1000;
  } catch (e) {
    console.error('Erro ao verificar expiração do token:', e);
    return true; // Em caso de erro, considera expirado
  }
};

/**
 * Configura o interceptor global de fetch
 */
export const setupAuthInterceptor = () => {
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      
      // Se receber 401 (Unauthorized), força logout
      if (response.status === 401) {
        console.warn('Token expirado ou inválido (401). Redirecionando para login...');
        forceLogout();
        
        // Retorna uma promise rejeitada para evitar processamento adicional
        return Promise.reject(new Error('Token expirado'));
      }
      
      return response;
    } catch (error) {
      // Propaga erros de rede normalmente
      throw error;
    }
  };
  
  console.log('✅ Interceptor de autenticação configurado');
};
