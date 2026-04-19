(function () {
  if (!localStorage.getItem('adminToken')) {
    window.location.replace('/login.html');
  }
})();
