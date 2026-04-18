(function () {
  const token = localStorage.getItem('adminToken');
  if (!token) window.location.replace('/login.html');
})();
