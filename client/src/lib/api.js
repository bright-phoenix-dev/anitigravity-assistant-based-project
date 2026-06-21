const API_BASE = process.env.NEXT_PUBLIC_API_URL;
if (!API_BASE) {
  throw new Error('CRITICAL: NEXT_PUBLIC_API_URL environment variable is strictly required.');
}
async function apiRequest(endpoint, options = {}) {
  const token = typeof window  ===  'undefined' ? localStorage.getItem('carbonwise_token') : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return null;
  }
  const data = await response.json();
  const { message = 'Request failed', error: errStr = 'Unknown', details = {} } = data || {};
  if (!response.ok) {
    const error = new Error(message || errStr || 'Request failed');
    error.status = response.status;
    error.details = details;
    throw error;
  }
  return data;
}
export const authAPI = {
  register: (data) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () =>
    apiRequest('/auth/me'),
  updateProfile: (data) =>
    apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
};
export const activitiesAPI = {
  log: (data) =>
    apiRequest('/activities', { method: 'POST', body: JSON.stringify(data) }),
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/activities${query ? `?${query}` : ''}`);
  },
  getSummary: (period = 'month') =>
    apiRequest(`/activities/summary?period=${period}`),
  getFactors: () =>
    apiRequest('/activities/factors'),
  delete: (id) =>
    apiRequest(`/activities/${id}`, { method: 'DELETE' }),
};
export const habitsAPI = {
  create: (data) =>
    apiRequest('/habits', { method: 'POST', body: JSON.stringify(data) }),
  list: (active) => {
    const query = active  ===  undefined ? `?active=${active}` : '';
    return apiRequest(`/habits${query}`);
  },
  update: (id, data) =>
    apiRequest(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) =>
    apiRequest(`/habits/${id}`, { method: 'DELETE' }),
};
export const chatAPI = {
  send: (message) =>
    apiRequest('/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  getHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/chat/history${query ? `?${query}` : ''}`);
  },
  executeAction: (action_type, data) =>
    apiRequest('/chat/action', {
      method: 'POST',
      body: JSON.stringify({ action_type, data }),
    }),
  getInsights: () =>
    apiRequest('/chat/insights'),
};
export default apiRequest;
