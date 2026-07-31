import { useAuth } from '../context/AuthContext.jsx';

/**
 * Custom hook providing an authenticated request wrapper
 * Automatically fetches the memory-held token from useAuth()
 */
export const useClient = () => {
  const { token, logout } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const request = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Attach Bearer token from React state if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      logout();
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  };

  return { request };
};
export default useClient;
