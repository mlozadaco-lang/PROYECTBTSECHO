// Archivo: public/assets/js/auth-fallback.js — Propósito: fallback ES5 para auth UI si auth.js no llegó a ejecutarse (por ejemplo, navegador sin soporte de sintaxis moderna).
// IMPORTANTE: este archivo NO reemplaza auth.js; solo actúa si window.__BtsEchoAuthWired no está en true.

(function () {
  function $(id) { return document.getElementById(id); }

  function hasClass(el, cls) {
    if (!el || !el.classList) return false;
    return el.classList.contains(cls);
  }

  function show(el) {
    if (!el || !el.classList) return;
    el.classList.remove('hidden');
  }

  function hide(el) {
    if (!el || !el.classList) return;
    el.classList.add('hidden');
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text == null ? '' : String(text);
  }

  function jsonRequest(method, url, bodyObj, cb) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Accept', 'application/json');
      if (bodyObj != null) xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        var data = null;
        try { data = JSON.parse(xhr.responseText || 'null'); } catch (_) { data = null; }
        cb(null, xhr.status, data);
      };
      xhr.send(bodyObj != null ? JSON.stringify(bodyObj) : null);
    } catch (err) {
      cb(err, 0, null);
    }
  }

  function wireFallback() {
    // If real auth wiring is active, do nothing.
    if (window.__BtsEchoAuthWired === true) return;

    var loginBtn = $('loginBtn');
    var logoutBtn = $('logoutBtn');
    var welcomeBlock = $('welcomeBlock');
    var welcomeUser = $('welcomeUser');

    var authModal = $('authModal');
    var authClose = $('authClose');
    var authLogin = $('authLogin');
    var authEmail = $('authEmail');
    var authPass = $('authPass');
    var authMsg = $('authMessage');

    var registerModal = $('registerModal');
    var openRegister = $('openRegister');
    var closeRegister = $('closeRegister');

    var regName = $('regName');
    var regEmail = $('regEmail');
    var regPass = $('regPass');
    var confirmRegister = $('confirmRegister');
    var registerMsg = $('registerMessage');

    var openForgot = $('openForgot');

    function setHeaderLoggedOut() {
      hide(welcomeBlock);
      setText(welcomeUser, '');
      hide(logoutBtn);
      show(loginBtn);
    }

    function setHeaderLoggedIn(name) {
      setText(welcomeUser, 'Bienvenido, ' + (name || 'Usuario') + ' 💜');
      show(welcomeBlock);
      show(logoutBtn);
      hide(loginBtn);
    }

    function refreshHeader() {
      jsonRequest('GET', '/api/session.php', null, function (_err, _status, data) {
        if (data && data.logged && data.user && data.user.name) {
          setHeaderLoggedIn(data.user.name);
        } else {
          setHeaderLoggedOut();
        }
      });
    }

    if (loginBtn) {
      loginBtn.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        show(authModal);
        setText(authMsg, '');
      });
    }

    if (authClose) {
      authClose.addEventListener('click', function () {
        hide(authModal);
        setText(authMsg, '');
      });
    }

    if (openRegister) {
      openRegister.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        hide(authModal);
        show(registerModal);
        if (registerMsg) setText(registerMsg, '');
      });
    }

    if (closeRegister) {
      closeRegister.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        hide(registerModal);
      });
    }

    if (authLogin) {
      authLogin.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();

        var email = authEmail ? String(authEmail.value || '').trim() : '';
        var pass = authPass ? String(authPass.value || '').trim() : '';

        if (!email || !pass) {
          setText(authMsg, 'Debes ingresar correo y contraseña.');
          return;
        }

        setText(authMsg, 'Procesando...');

        jsonRequest('POST', '/api/login.php', { email: email, password: pass }, function (_err, _status, data) {
          if (data && data.success) {
            try {
              if (data.token) localStorage.setItem('btsecho_auth_token', String(data.token));
            } catch (_) {}
            hide(authModal);
            setText(authMsg, '');
            location.reload();
            return;
          }
          setText(authMsg, (data && data.message) ? data.message : 'No se pudo iniciar sesión.');
        });
      });
    }

    if (confirmRegister) {
      confirmRegister.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();

        var name = regName ? String(regName.value || '').trim() : '';
        var email = regEmail ? String(regEmail.value || '').trim() : '';
        var pass = regPass ? String(regPass.value || '').trim() : '';

        if (!name || !email || !pass) {
          setText(registerMsg, 'Completa todos los campos.');
          return;
        }

        setText(registerMsg, 'Procesando...');

        jsonRequest('POST', '/api/register.php', { name: name, email: email, password: pass }, function (_err, _status, data) {
          setText(registerMsg, (data && data.message) ? data.message : 'No se pudo registrar.');
          if (data && data.success) {
            setTimeout(function () {
              hide(registerModal);
              show(authModal);
            }, 800);
          }
        });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        try { localStorage.removeItem('btsecho_auth_token'); } catch (_) {}
        jsonRequest('POST', '/api/logout.php', null, function () {
          location.reload();
        });
      });
    }

    if (openForgot) {
      openForgot.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        var email = (prompt('Recuperar contraseña\n\nIngresa tu correo:') || '').trim();
        if (!email) return;
        jsonRequest('POST', '/api/forgot-password.php', { email: email }, function (_err, _status, data) {
          alert((data && data.message) ? data.message : 'Solicitud enviada.');
        });
      });
    }

    // Initial header sync
    refreshHeader();
    window.addEventListener('pageshow', refreshHeader);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireFallback);
  } else {
    wireFallback();
  }
})();
