/*
 * Login Google di sisi browser (Google Identity Services).
 * Catatan: token tidak diverifikasi server. Data ini hanya untuk tampilan akun.
 * Hak akses Pro nanti HARUS diverifikasi di server, jangan dari data ini.
 */
(function () {
  'use strict';

  var QRKU = window.QRKU = window.QRKU || {};
  var config = (QRKU.config && QRKU.config.auth) || {};
  var STORAGE_KEY = 'qrku.user';
  var GIS_URL = 'https://accounts.google.com/gsi/client';

  var clientId = (config.googleClientId || '').trim();
  var isHttp = location.protocol === 'http:' || location.protocol === 'https:';
  var listeners = [];
  var gisReady = null;

  function readStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var user = raw ? JSON.parse(raw) : null;
      return user && user.sub ? user : null;
    } catch (err) {
      return null;
    }
  }

  function store(user) {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (err) { /* penyimpanan diblokir: sesi hanya berlaku sampai halaman ditutup */ }
  }

  function decodeJwt(token) {
    var part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    var bin = atob(part + '==='.slice((part.length + 3) % 4));
    var bytes = Uint8Array.from(bin, function (ch) { return ch.charCodeAt(0); });
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function setUser(user) {
    auth.user = user;
    store(user);
    listeners.forEach(function (cb) { cb(user); });
  }

  function handleCredential(response) {
    var claims;
    try {
      claims = decodeJwt(response.credential);
    } catch (err) {
      auth.lastError = 'Respons login tidak bisa dibaca. Coba lagi.';
      listeners.forEach(function (cb) { cb(auth.user); });
      return;
    }
    if (claims.aud !== clientId || !claims.sub || claims.exp * 1000 < Date.now()) {
      auth.lastError = 'Login ditolak karena token tidak valid. Coba lagi.';
      listeners.forEach(function (cb) { cb(auth.user); });
      return;
    }
    auth.lastError = '';
    setUser({ sub: claims.sub, name: claims.name || claims.email || 'Pengguna', email: claims.email || '', picture: claims.picture || '' });
  }

  function loadGis() {
    if (gisReady) return gisReady;
    gisReady = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = GIS_URL;
      s.async = true;
      s.onload = function () {
        try {
          google.accounts.id.initialize({ client_id: clientId, callback: handleCredential, auto_select: false });
          resolve();
        } catch (err) { reject(err); }
      };
      s.onerror = function () { gisReady = null; reject(new Error('Skrip login Google gagal dimuat.')); };
      document.head.appendChild(s);
    });
    return gisReady;
  }

  var auth = QRKU.auth = {
    user: readStored(),
    lastError: '',
    // Login hanya bisa dipakai jika Client ID diisi dan halaman dibuka lewat http(s).
    isConfigured: Boolean(clientId),
    isAvailable: Boolean(clientId) && isHttp,
    onChange: function (cb) { listeners.push(cb); },
    renderButton: function (container) {
      return loadGis().then(function () {
        container.textContent = '';
        google.accounts.id.renderButton(container, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', locale: 'id' });
      });
    },
    signOut: function () {
      if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
      setUser(null);
    }
  };
})();
