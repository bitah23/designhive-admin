(function () {
  var MOCK_KEY = 'designhiveMockMode';
  var TOKEN_KEY = 'adminToken';
  var params = new URLSearchParams(window.location.search);

  if (params.get('mock') === '0') {
    localStorage.removeItem(MOCK_KEY);
  } else if (params.get('mock') === '1') {
    localStorage.setItem(MOCK_KEY, '1');
  } else {
    // Default to real mode — clear any previously auto-set mock flag
    localStorage.removeItem(MOCK_KEY);
  }

  if (localStorage.getItem(MOCK_KEY) === '1' && !localStorage.getItem(TOKEN_KEY)) {
    var payload = btoa(JSON.stringify({
      id: 'admin-1',
      email: 'admin@designhive.local',
      mock: true
    }));
    localStorage.setItem(TOKEN_KEY, 'mock.' + payload + '.sig');
  }

  if (!localStorage.getItem(TOKEN_KEY)) {
    window.location.replace('/login.html');
  }
})();
