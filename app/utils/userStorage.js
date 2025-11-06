import dummyContents from 'dan-api/dummy/dummyContents';

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (error) {
    console.error('Erro ao recuperar usuário do armazenamento local:', error);
    return {};
  }
};

export const setStoredUser = (user) => {
  try {
    const payload = user || {};
    localStorage.setItem('user', JSON.stringify(payload));
    if (dummyContents && typeof dummyContents === 'object') {
      dummyContents.user = payload;
    }
    window.dispatchEvent(new CustomEvent('app:user-updated', { detail: payload }));
  } catch (error) {
    console.error('Erro ao salvar usuário no armazenamento local:', error);
  }
};

export default {
  getStoredUser,
  setStoredUser
};
