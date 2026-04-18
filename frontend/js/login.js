(function () {
  // If already logged in, skip to dashboard
  if (localStorage.getItem('adminToken')) {
    const isMock = localStorage.getItem('designhiveMockMode') === '1';
    window.location.href = isMock ? '/dashboard.html?mock=1' : '/dashboard.html';
  }
})();

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signin in...';
  errEl.style.display = 'none';

  try {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('adminToken', data.token);

    const isMock = localStorage.getItem('designhiveMockMode') === '1';
    window.location.href = isMock ? '/dashboard.html?mock=1' : '/dashboard.html';
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'Invalid email or password';
    errEl.textContent = msg;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Sign In';
  }
});
