const Toast = {
  show(message, type = 'info', duration) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const autoDismiss = duration ?? (type === 'error' ? 0 : type === 'warn' ? 5000 : 3000);
    const icon = type === 'success' ? 'check-circle-2' : type === 'error' ? 'circle-x' : 'triangle-alert';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.innerHTML = `
      <div class="toast-icon"><i data-lucide="${icon}" style="width:16px;height:16px"></i></div>
      <div class="toast-content">${Toast.escape(message)}</div>
      <button type="button" class="toast-close" aria-label="Close notification">
        <i data-lucide="x" style="width:14px;height:14px"></i>
      </button>
    `;

    const close = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 180);
    };

    toast.querySelector('.toast-close').addEventListener('click', close);
    container.appendChild(toast);

    if (typeof lucide !== 'undefined') lucide.createIcons();
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

    if (autoDismiss > 0) {
      setTimeout(close, autoDismiss);
    }
  },

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  success(message) {
    Toast.show(message, 'success', 3000);
  },

  error(message) {
    Toast.show(message, 'error', 0);
  },

  info(message) {
    Toast.show(message, 'info', 3000);
  },

  warn(message) {
    Toast.show(message, 'warn', 5000);
  }
};
