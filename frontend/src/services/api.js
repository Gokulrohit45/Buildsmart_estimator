// ============================================================
// BuildSmart AI Estimator — API Service Layer
// All API calls route through this file to Flask backend
// ============================================================

const BASE_URL = 'http://localhost:5000';

// ── Token helpers ────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('bs_token');
}

function getAuthHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Base request wrapper ─────────────────────────────────────
async function request(method, path, body = null) {
  const options = {
    method,
    headers: getAuthHeaders(),
  };
  if (body !== null) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, options);
  const json = await res.json().catch(() => ({ error: 'Invalid server response' }));
  if (!res.ok) {
    if (res.status === 401) {
      clearAuthSession();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw new Error(json.error || json.message || `Request failed: ${res.status}`);
  }
  // Auto-unwrap the { success, data } envelope used by Flask routes
  return json.data !== undefined ? json.data : json;
}


// ── Auth API ─────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    request('POST', '/api/auth/login', { email, password }),

  register: (payload) =>
    request('POST', '/api/auth/register', payload),

  me: () => request('GET', '/api/auth/me'),
};

// ── Projects API ─────────────────────────────────────────────
export const projectsAPI = {
  list: () => request('GET', '/api/projects'),

  get: (id) => request('GET', `/api/projects/${id}`),

  create: (payload) => request('POST', '/api/projects', payload),

  delete: (id) => request('DELETE', `/api/projects/${id}`),
};

// ── Estimates API ────────────────────────────────────────────
export const estimatesAPI = {
  generate: (params) => request('POST', '/api/estimates/generate', params),

  byProject: (projectId) => request('GET', `/api/estimates/project/${projectId}`),

  get: (estimateId) => request('GET', `/api/estimates/${estimateId}`),
};

// ── Admin API ────────────────────────────────────────────────
export const adminAPI = {
  // Users
  getUsers: () => request('GET', '/api/admin/users'),
  approveUser: (id) => request('PUT', `/api/admin/users/${id}/approve`),
  blockUser: (id) => request('PUT', `/api/admin/users/${id}/block`),
  createAdmin: (payload) => request('POST', '/api/admin/create-admin', payload),
  changePassword: (id, password) => request('PUT', `/api/admin/users/${id}/change-password`, { password }),


  // Rates
  getRates: (city = '') =>
    request('GET', `/api/admin/rates${city ? `?city=${encodeURIComponent(city)}` : ''}`),
  addRate: (payload) => request('POST', '/api/admin/rates', payload),
  updateRate: (id, payload) => request('PUT', `/api/admin/rates/${id}`, payload),
  deleteRate: (id) => request('DELETE', `/api/admin/rates/${id}`),

  // Settings
  getSettings: () => request('GET', '/api/admin/settings'),
  updateSetting: (key, value) => request('PUT', `/api/admin/settings/${key}`, { value }),
  getCityIndexes: () => request('GET', '/api/admin/city-indexes'),
  updateCityIndex: (city, costIndex, state = 'India') => request('PUT', `/api/admin/city-indexes/${encodeURIComponent(city)}`, { cost_index: costIndex, state }),

  // Analytics
  getAnalytics: () => request('GET', '/api/admin/analytics'),
};

// ── Auth state helpers used across pages ─────────────────────
export function saveAuthSession(token, user) {
  localStorage.setItem('bs_token', token);
  localStorage.setItem('bs_user', JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem('bs_token');
  localStorage.removeItem('bs_user');
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('bs_user') || 'null');
  } catch {
    return null;
  }
}

export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}
