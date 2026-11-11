/* Navigasi antar tampilan, dialog akun, slot iklan, dan daftar tunggu Pro. */
(function () {
  'use strict';

  var QRKU = window.QRKU = window.QRKU || {};
  var config = QRKU.config || {};
  var auth = QRKU.auth;
  var $ = function (id) { return document.getElementById(id); };
  var isLocal = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  // Pro belum tersedia, jadi semua pengguna memakai paket Gratis.
  QRKU.plan = { isPro: function () { return false; } };

  /* ---------- Tampilan (hash) ---------- */
  var TITLES = { generator: 'QRku - Generator QR Code Gratis', paket: 'Paket - QRku' };

  function showRoute() {
    var route = location.hash.replace('#', '');
    if (!TITLES[route]) route = 'generator';
    document.querySelectorAll('[data-view]').forEach(function (view) {
      view.hidden = view.getAttribute('data-view') !== route;
    });
    document.querySelectorAll('[data-route]').forEach(function (tab) {
      if (tab.getAttribute('data-route') === route) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    document.title = TITLES[route];
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', showRoute);
  showRoute();

  /* ---------- Akun ---------- */
  var dialog = $('account-dialog');

  function renderAccount() {
    var user = auth && auth.user;
    $('account-label').textContent = user ? user.name.split(' ')[0] : 'Masuk';
    $('account-avatar').hidden = !(user && user.picture);
    if (user && user.picture) $('account-avatar').src = user.picture;

    $('account-signed-in').hidden = !user;
    $('account-signed-out').hidden = Boolean(user);
    $('plan-account').textContent = user ? (user.email || user.name) : 'Belum masuk';

    if (user) {
      $('profile-name').textContent = user.name;
      $('profile-email').textContent = user.email;
      $('profile-avatar').hidden = !user.picture;
      if (user.picture) $('profile-avatar').src = user.picture;
    }
  }

  function setAuthStatus(message) {
    $('auth-status').textContent = message || '';
    $('auth-status').hidden = !message;
  }

  function openAccount() {
    renderAccount();
    if (!(auth && auth.user)) {
      if (auth && auth.isAvailable) {
        setAuthStatus(auth.lastError);
        auth.renderButton($('google-button')).catch(function () {
          setAuthStatus('Tombol login Google gagal dimuat. Periksa koneksi lalu coba lagi.');
        });
      } else {
        setAuthStatus('Login Google belum aktif. Fitur ini sedang disiapkan.');
        $('auth-dev-hint').hidden = !isLocal;
      }
    }
    if (!dialog.open) dialog.showModal();
  }

  $('account-button').addEventListener('click', openAccount);
  $('sign-out').addEventListener('click', function () { auth.signOut(); dialog.close(); });
  $('profile-plans').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(); });

  if (auth) {
    auth.onChange(function (user) {
      renderAccount();
      if (user && dialog.open) dialog.close();
      else if (auth.lastError) setAuthStatus(auth.lastError);
    });
  }
  renderAccount();

  /* ---------- Iklan ---------- */
  var ads = config.ads || {};
  var adsClient = (ads.adsenseClient || '').trim();
  var adsScriptAdded = false;

  function setupAdSlot(slot) {
    var body = slot.querySelector('.ad-body');
    var unitId = ((ads.slots || {})[slot.getAttribute('data-ad-slot')] || '').trim();

    if (QRKU.plan.isPro()) return; // pengguna Pro tidak melihat iklan

    if (adsClient && unitId) {
      if (!adsScriptAdded) {
        var s = document.createElement('script');
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(adsClient);
        document.head.appendChild(s);
        adsScriptAdded = true;
      }
      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', adsClient);
      ins.setAttribute('data-ad-slot', unitId);
      ins.setAttribute('data-ad-format', 'auto');
      ins.setAttribute('data-full-width-responsive', 'true');
      body.appendChild(ins);
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      slot.hidden = false;
    } else if (ads.showPlaceholders) {
      var box = document.createElement('div');
      box.className = 'ad-placeholder';
      box.textContent = 'Posisi iklan. Belum aktif sampai ID AdSense diisi di config.js.';
      body.appendChild(box);
      slot.hidden = false;
    }
  }
  document.querySelectorAll('[data-ad-slot]').forEach(setupAdSlot);

  /* ---------- Daftar tunggu Pro ---------- */
  var pro = config.pro || {};
  var waitlist = $('waitlist-button');
  var waitlistUrl = (pro.waitlistUrl || '').trim();
  var contactEmail = (pro.contactEmail || '').trim();

  function waitlistHref() {
    if (waitlistUrl) return waitlistUrl;
    var user = auth && auth.user;
    var body = 'Halo, saya ingin dikabari saat QRku Pro rilis.' + (user && user.email ? '\n\nEmail saya: ' + user.email : '');
    return 'mailto:' + contactEmail + '?subject=' + encodeURIComponent('Daftar tunggu QRku Pro') + '&body=' + encodeURIComponent(body);
  }

  if (waitlistUrl || contactEmail) {
    waitlist.removeAttribute('aria-disabled');
    waitlist.textContent = 'Gabung daftar tunggu';
    waitlist.href = waitlistHref();
    if (waitlistUrl) { waitlist.target = '_blank'; waitlist.rel = 'noopener'; }
    $('waitlist-note').textContent = waitlistUrl
      ? 'Formulir dibuka di tab baru.'
      : 'Tombol ini membuka aplikasi email dengan pesan yang sudah terisi.';
    if (auth) auth.onChange(function () { waitlist.href = waitlistHref(); });
  } else {
    waitlist.removeAttribute('href');
  }
})();
