const API_BASE = window.ENV_API_URL || 'http://localhost:8000/api';

axios.defaults.baseURL = API_BASE;
axios.defaults.headers.common['Content-Type'] = 'application/json';

axios.interceptors.request.use(cfg => {
  const token = localStorage.getItem('adminToken');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

axios.interceptors.response.use(
  response => response,
  err => {
    if (err.response?.status === 401) {
      console.warn('Unauthorized request bypassed for testing');
    }
    return Promise.reject(err);
  }
);

const api = {
  get: async (path, config = {}) => (await axios.get(path, config)).data,
  post: async (path, body, config = {}) => (await axios.post(path, body, config)).data,
  put: async (path, body, config = {}) => (await axios.put(path, body, config)).data,
  patch: async (path, body, config = {}) => (await axios.patch(path, body, config)).data,
  del: async (path, config = {}) => (await axios.delete(path, config)).data,
};
