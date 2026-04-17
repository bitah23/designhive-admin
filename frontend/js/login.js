(function () {
  if (localStorage.getItem('adminToken')) window.location.href = '/dashboard.html';
})();

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  errEl.style.display = 'none';

  try {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('adminToken', data.token);
    window.location.href = '/dashboard.html';
  } catch (err) {
    errEl.textContent = err.message || 'Invalid email or password';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Sign In';
  }
});
