(function () {
  const form = document.getElementById('login-form');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const passwordWrap = document.getElementById('password-wrap');
  const passwordToggle = document.getElementById('password-toggle');
  const button = document.getElementById('login-btn');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');

  function redrawIcons() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  function clearErrors() {
    [email, password].forEach(field => field.classList.remove('is-invalid'));
    passwordWrap.classList.remove('is-invalid');
    emailError.textContent = '';
    passwordError.textContent = '';
  }

  function validate() {
    clearErrors();
    let valid = true;

    if (!email.value.trim()) {
      email.classList.add('is-invalid');
      emailError.textContent = 'Email is required.';
      valid = false;
    }

    if (!password.value) {
      passwordWrap.classList.add('is-invalid');
      passwordError.textContent = 'Password is required.';
      valid = false;
    }

    return valid;
  }

  function setLoading(loading) {
    button.disabled = loading;
    button.innerHTML = loading
      ? '<span class="spinner"></span><span>Signing in...</span>'
      : 'Sign In';
  }

  passwordToggle.addEventListener('click', function () {
    const isPassword = password.type === 'password';
    password.type = isPassword ? 'text' : 'password';
    passwordToggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    passwordToggle.innerHTML = isPassword
      ? '<i data-lucide="eye-off" style="width:16px;height:16px"></i>'
      : '<i data-lucide="eye" style="width:16px;height:16px"></i>';
    redrawIcons();
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const data = await api.post('/auth/login', {
        email: email.value.trim(),
        password: password.value
      });

      localStorage.setItem('adminToken', data.token);
      window.location.replace('/dashboard.html');
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Invalid email or password.';
      Toast.error(message);
      setLoading(false);
    }
  });

  email.addEventListener('input', clearErrors);
  password.addEventListener('input', clearErrors);
  redrawIcons();
})();
