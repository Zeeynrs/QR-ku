(function () {
  'use strict';

  // Kapasitas maksimum mode byte (versi 40) per level koreksi error.
  var BYTE_LIMITS = { L: 2953, M: 2331, Q: 1663, H: 1273 };
  var MAX_MARGIN = 10;
  var STANDARD_MARGIN = 4; // zona tenang yang disarankan standar QR

  var encoder = new TextEncoder();
  var $ = function (id) { return document.getElementById(id); };

  var el = {
    text: $('text'), size: $('size'), sizeValue: $('size-value'), margin: $('margin'),
    ecl: $('ecl'), fg: $('fg'), bg: $('bg'), fgHex: $('fg-hex'), bgHex: $('bg-hex'),
    error: $('error'), placeholder: $('placeholder'), canvas: $('preview'),
    downloadPng: $('download-png'), downloadSvg: $('download-svg'),
    finding: $('ready-finding'), contrast: $('ready-contrast'), contrastPill: $('ready-contrast-pill'),
    version: $('ready-version'), pixels: $('ready-pixels'),
    marginValue: $('ready-margin'), marginPill: $('ready-margin-pill'),
    capPercent: $('capacity-percent'), capBar: $('capacity-bar'), capFill: $('capacity-fill'),
    capUsed: $('capacity-used'), capLimit: $('capacity-limit'),
    presets: Array.prototype.slice.call(document.querySelectorAll('.preset'))
  };

  var current = null; // hasil valid terakhir, null jika kosong atau gagal

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function fmt(n) { return n.toLocaleString('id-ID'); }

  function luminance(hex) {
    var c = [1, 3, 5].map(function (i) {
      var v = parseInt(hex.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function setPill(node, kind, label) {
    node.hidden = !label;
    node.className = 'pill' + (kind ? ' pill-' + kind : '');
    node.textContent = label || '';
  }

  function showError(message) {
    el.error.textContent = message || '';
    el.error.hidden = !message;
  }

  function buildQr(text, ecl) {
    var qr = qrcode(0, ecl); // 0 = versi dipilih otomatis
    qr.addData(text, 'Byte');
    qr.make();
    return qr;
  }

  function layout(qr, size, margin) {
    var modules = qr.getModuleCount() + margin * 2;
    var cell = Math.max(1, Math.floor(size / modules));
    return { modules: modules, cell: cell, px: modules * cell };
  }

  function drawCanvas(qr, opts) {
    var l = layout(qr, opts.size, opts.margin);
    var n = qr.getModuleCount();
    el.canvas.width = l.px;
    el.canvas.height = l.px;
    var ctx = el.canvas.getContext('2d');
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, l.px, l.px);
    ctx.fillStyle = opts.fg;
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((c + opts.margin) * l.cell, (r + opts.margin) * l.cell, l.cell, l.cell);
        }
      }
    }
    return l;
  }

  function buildSvg(qr, opts) {
    var n = qr.getModuleCount();
    var m = opts.margin;
    var total = n + m * 2;
    var px = layout(qr, opts.size, m).px;
    var path = [];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) path.push('M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z');
      }
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" ' +
      'viewBox="0 0 ' + total + ' ' + total + '" shape-rendering="crispEdges">' +
      '<rect width="' + total + '" height="' + total + '" fill="' + opts.bg + '"/>' +
      '<path fill="' + opts.fg + '" d="' + path.join('') + '"/></svg>';
  }

  function setPreview(visible, message) {
    el.canvas.hidden = !visible;
    el.placeholder.hidden = visible;
    if (message) el.placeholder.textContent = message;
    el.downloadPng.disabled = !visible;
    el.downloadSvg.disabled = !visible;
  }

  function updateCapacity(bytes, limit) {
    var ratio = limit ? bytes / limit : 0;
    var percent = Math.round(ratio * 100);
    el.capPercent.textContent = percent + '%';
    el.capFill.style.width = clamp(ratio * 100, 0, 100) + '%';
    el.capFill.classList.toggle('is-over', bytes > limit);
    el.capBar.setAttribute('aria-valuenow', String(clamp(percent, 0, 100)));
    el.capUsed.textContent = fmt(bytes) + ' byte';
    el.capLimit.textContent = fmt(limit) + ' byte';
  }

  function updateColors(fg, bg) {
    el.fgHex.textContent = fg;
    el.bgHex.textContent = bg;
    el.presets.forEach(function (preset) {
      var match = preset.getAttribute('data-fg') === fg && preset.getAttribute('data-bg') === bg;
      preset.setAttribute('aria-pressed', match ? 'true' : 'false');
    });
    var lf = luminance(fg);
    var lb = luminance(bg);
    var ratio = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
    var inverted = lf > lb;
    el.contrast.textContent = ratio.toFixed(1).replace('.', ',') + ' : 1';
    if (ratio < 2.5) setPill(el.contrastPill, 'negative', 'Terlalu rendah');
    else if (ratio < 4.5) setPill(el.contrastPill, 'warning', 'Rendah');
    else if (inverted) setPill(el.contrastPill, 'warning', 'Terbalik');
    else setPill(el.contrastPill, 'positive', 'Baik');
    return { ratio: ratio, inverted: inverted };
  }

  function setFinding(kind, text) {
    el.finding.className = 'finding' + (kind ? ' is-' + kind : '');
    el.finding.textContent = text;
  }

  function clearReadiness() {
    el.version.textContent = '-';
    el.pixels.textContent = '-';
  }

  function render() {
    var text = el.text.value;
    var ecl = el.ecl.value;
    var size = parseInt(el.size.value, 10);
    var margin = clamp(parseInt(el.margin.value, 10) || 0, 0, MAX_MARGIN);
    var fg = el.fg.value;
    var bg = el.bg.value;
    var limit = BYTE_LIMITS[ecl];
    var bytes = encoder.encode(text).length;
    var qr;

    el.sizeValue.textContent = size + ' px';
    updateCapacity(bytes, limit);
    var colors = updateColors(fg, bg);

    el.marginValue.textContent = margin + ' modul';
    if (margin >= STANDARD_MARGIN) setPill(el.marginPill, 'positive', 'Sesuai standar');
    else setPill(el.marginPill, 'warning', 'Di bawah 4');

    current = null;

    if (!text) {
      showError('');
      clearReadiness();
      setFinding('', 'Belum ada isi.');
      setPreview(false, 'Isi link atau teks untuk melihat QR.');
      return;
    }
    if (bytes > limit) {
      showError('Isi terlalu panjang untuk koreksi error ini. Kurangi isi atau pilih koreksi yang lebih rendah.');
      clearReadiness();
      setFinding('negative', 'Isi melebihi kapasitas QR.');
      setPreview(false, 'Isi terlalu panjang.');
      return;
    }
    try {
      qr = buildQr(text, ecl);
    } catch (err) {
      showError('Gagal membuat QR code: ' + err.message);
      clearReadiness();
      setFinding('negative', 'QR tidak bisa dibuat.');
      setPreview(false, 'QR tidak bisa dibuat.');
      return;
    }

    showError('');
    current = { qr: qr, opts: { size: size, margin: margin, fg: fg, bg: bg } };
    var l = drawCanvas(qr, current.opts);
    var n = qr.getModuleCount();

    el.version.textContent = ((n - 17) / 4) + ' (' + n + ' × ' + n + ' modul)';
    el.pixels.textContent = fmt(l.px) + ' × ' + fmt(l.px) + ' px';
    setPreview(true);

    if (colors.ratio < 2.5) setFinding('negative', 'Kontras terlalu rendah, QR kemungkinan gagal dipindai.');
    else if (colors.ratio < 4.5) setFinding('warning', 'Kontras rendah, sebagian kamera sulit membacanya.');
    else if (colors.inverted) setFinding('warning', 'QR terang di latar gelap gagal di sebagian pemindai.');
    else if (margin < STANDARD_MARGIN) setFinding('warning', 'Margin di bawah 4 modul, beri ruang kosong saat mencetak.');
    else setFinding('', 'Siap dipindai.');
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  el.downloadPng.addEventListener('click', function () {
    if (!current) return;
    el.canvas.toBlob(function (blob) { if (blob) download(blob, 'qrcode.png'); }, 'image/png');
  });

  el.downloadSvg.addEventListener('click', function () {
    if (!current) return;
    download(new Blob([buildSvg(current.qr, current.opts)], { type: 'image/svg+xml' }), 'qrcode.svg');
  });

  [el.text, el.size, el.margin, el.ecl, el.fg, el.bg].forEach(function (node) {
    node.addEventListener('input', render);
    node.addEventListener('change', render);
  });

  el.presets.forEach(function (preset) {
    preset.addEventListener('click', function () {
      el.fg.value = preset.getAttribute('data-fg');
      el.bg.value = preset.getAttribute('data-bg');
      render();
    });
  });

  // Contoh awal terpilih semua saat pertama kali difokus, supaya langsung tergantikan saat mengetik.
  el.text.addEventListener('focus', function () { el.text.select(); }, { once: true });

  render();
})();
