const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API = rawApi.endsWith('/') ? rawApi.slice(0, -1) : rawApi;

if (typeof window !== 'undefined' && import.meta.env.PROD) {
  console.log('🚀zentrix API initialized with:', API);
  if (API.startsWith('http://') && window.location.protocol === 'https:') {
    console.error('❌ Mixed Content Warning: API is using http but frontend is on https. This will likely fail.');
  }
}
