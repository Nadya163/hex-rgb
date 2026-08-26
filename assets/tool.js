/* hex-rgb.ru — tool.js */

// ─────────────────────────────────────────────────────────────────
// COLOR CONVERSION
// ─────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return null;
  const n = parseInt(hex, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1/3) * 255)
  };
}

function rgbToCmyk(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round((1 - r - k) / (1 - k) * 100),
    m: Math.round((1 - g - k) / (1 - k) * 100),
    y: Math.round((1 - b - k) / (1 - k) * 100),
    k: Math.round(k * 100)
  };
}

function cmykToRgb(c, m, y, k) {
  c /= 100; m /= 100; y /= 100; k /= 100;
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k))
  };
}

// ─────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────

var CFG = window.PAGE_CONFIG || {};
var mockupType = CFG.mockupType || 'shop';

var roles = ['accent', 'bg', 'surface', 'text'];
var roleLabels = { accent: 'Акцент', bg: 'Фон', surface: 'Поверхность', text: 'Текст' };
var roleCssVars = { accent: '--m-accent', bg: '--m-bg', surface: '--m-surface', text: '--m-text' };

var defaultColors = CFG.defaultColors || {
  accent:  '#6366f1',
  bg:      '#ffffff',
  surface: '#f1f5f9',
  text:    '#1e293b'
};

var palette = Object.assign({}, defaultColors);
var activeRole = 'accent';
var updating = false;

// ─────────────────────────────────────────────────────────────────
// MOCKUP TEMPLATES
// ─────────────────────────────────────────────────────────────────

var MOCKUPS = {
  shop: `
    <div class="mock-shop-header">
      <div class="mock-logo"><div class="mock-logo-dot"></div>МойМагазин</div>
      <div class="mock-nav-items"><span>Каталог</span><span>Акции</span><span>О нас</span></div>
      <div class="mock-cart">🛍</div>
    </div>
    <div class="mock-hero">
      <div class="mock-hero-text">
        <h2>Новая коллекция</h2>
        <p>Стиль на каждый день</p>
      </div>
      <button class="mock-btn">Смотреть</button>
    </div>
    <div class="mock-products">
      <div class="mock-card"><div class="mock-card-img"></div><div class="mock-card-body"><div class="mock-card-name">Товар первый</div><div class="mock-card-price">1 200 ₽</div><button class="mock-card-btn">В корзину</button></div></div>
      <div class="mock-card"><div class="mock-card-img"></div><div class="mock-card-body"><div class="mock-card-name">Товар второй</div><div class="mock-card-price">890 ₽</div><button class="mock-card-btn">В корзину</button></div></div>
      <div class="mock-card"><div class="mock-card-img"></div><div class="mock-card-body"><div class="mock-card-name">Товар третий</div><div class="mock-card-price">2 100 ₽</div><button class="mock-card-btn">В корзину</button></div></div>
    </div>
    <div class="mock-footer">© МойМагазин 2024 · Доставка по всей России</div>
  `,
  blog: `
    <div class="mock-blog-header">
      <div class="mock-logo"><div class="mock-logo-dot"></div>МойБлог</div>
      <div class="mock-nav-items"><span>Статьи</span><span>Темы</span><span>О нас</span></div>
    </div>
    <div class="mock-featured">
      <div class="mock-featured-img"></div>
      <span class="mock-tag">Главное</span>
      <h2>Заголовок главной статьи</h2>
      <p>Краткое описание статьи — о чём она и почему её стоит прочитать прямо сейчас.</p>
    </div>
    <div class="mock-articles">
      <div class="mock-article-card"><div class="mock-article-img"></div><div class="mock-article-body"><div class="mock-article-title">Статья о дизайне</div><div class="mock-article-date">12 авг 2024</div></div></div>
      <div class="mock-article-card"><div class="mock-article-img"></div><div class="mock-article-body"><div class="mock-article-title">Цвет и эмоции</div><div class="mock-article-date">10 авг 2024</div></div></div>
      <div class="mock-article-card"><div class="mock-article-img"></div><div class="mock-article-body"><div class="mock-article-title">Типографика</div><div class="mock-article-date">8 авг 2024</div></div></div>
    </div>
    <div class="mock-footer">© МойБлог 2024</div>
  `,
  landing: `
    <div class="mock-land-header">
      <div class="mock-logo"><div class="mock-logo-dot" style="background:var(--m-accent)"></div>Продукт</div>
      <button class="mock-btn" style="font-size:10px;padding:5px 12px">Войти</button>
    </div>
    <div class="mock-hero-land">
      <h2>Лучший инструмент для вашего бизнеса</h2>
      <p>Автоматизируйте задачи, экономьте время, растите быстрее</p>
      <button class="mock-btn-land">Попробовать бесплатно →</button>
    </div>
    <div class="mock-features">
      <div class="mock-feature"><div class="mock-feature-icon"></div><div class="mock-feature-title">Быстро</div><div class="mock-feature-desc">Результат за секунды</div></div>
      <div class="mock-feature"><div class="mock-feature-icon"></div><div class="mock-feature-title">Удобно</div><div class="mock-feature-desc">Интуитивный интерфейс</div></div>
      <div class="mock-feature"><div class="mock-feature-icon"></div><div class="mock-feature-title">Надёжно</div><div class="mock-feature-desc">Данные защищены</div></div>
    </div>
    <div class="mock-cta">
      <h3>Готовы начать?</h3>
      <button class="mock-btn">Зарегистрироваться</button>
    </div>
  `,
  dashboard: `
    <div class="mock-dash">
      <div class="mock-sidebar">
        <div class="mock-sidebar-logo">⬡ Dash</div>
        <div class="mock-nav-item active"><span class="mock-nav-dot"></span>Главная</div>
        <div class="mock-nav-item"><span class="mock-nav-dot"></span>Аналитика</div>
        <div class="mock-nav-item"><span class="mock-nav-dot"></span>Продажи</div>
        <div class="mock-nav-item"><span class="mock-nav-dot"></span>Клиенты</div>
        <div class="mock-nav-item"><span class="mock-nav-dot"></span>Настройки</div>
      </div>
      <div class="mock-dash-main">
        <div class="mock-dash-title">Дашборд — август 2024</div>
        <div class="mock-stats">
          <div class="mock-stat"><div class="mock-stat-val">1 248</div><div class="mock-stat-label">Заказы</div></div>
          <div class="mock-stat"><div class="mock-stat-val">94%</div><div class="mock-stat-label">Довольны</div></div>
          <div class="mock-stat"><div class="mock-stat-val">↑ 12%</div><div class="mock-stat-label">Рост</div></div>
        </div>
        <div class="mock-chart-area">
          <div class="mock-bar" style="height:40%"></div>
          <div class="mock-bar" style="height:65%"></div>
          <div class="mock-bar" style="height:50%"></div>
          <div class="mock-bar" style="height:80%"></div>
          <div class="mock-bar" style="height:60%"></div>
          <div class="mock-bar" style="height:90%"></div>
          <div class="mock-bar" style="height:70%"></div>
        </div>
      </div>
    </div>
  `
};

// ─────────────────────────────────────────────────────────────────
// APPLY COLOR TO MOCKUP
// ─────────────────────────────────────────────────────────────────

function applyPalette() {
  var el = document.querySelector('.mockup');
  if (!el) return;
  roles.forEach(function(role) {
    el.style.setProperty(roleCssVars[role], palette[role]);
  });
  // update role dots
  roles.forEach(function(role) {
    var dot = document.querySelector('.role-btn[data-role="' + role + '"] .role-dot');
    if (dot) dot.style.background = palette[role];
  });
}

// ─────────────────────────────────────────────────────────────────
// UPDATE INPUTS FROM HEX
// ─────────────────────────────────────────────────────────────────

function updateInputsFromHex(hex) {
  var rgb = hexToRgb(hex);
  if (!rgb) return;
  updating = true;

  var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  var cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

  // HEX
  var hexInput = document.getElementById('inp-hex');
  if (hexInput && document.activeElement !== hexInput) hexInput.value = hex.toUpperCase();

  // RGB
  setVal('inp-r', rgb.r);
  setVal('inp-g', rgb.g);
  setVal('inp-b', rgb.b);

  // HSL
  setVal('inp-h', hsl.h);
  setVal('inp-s', hsl.s);
  setVal('inp-l', hsl.l);

  // CMYK
  setVal('inp-c', cmyk.c);
  setVal('inp-m', cmyk.m);
  setVal('inp-y', cmyk.y);
  setVal('inp-k', cmyk.k);

  // swatch
  var sc = document.querySelector('.swatch-color');
  if (sc) sc.style.background = hex;

  updating = false;
}

function setVal(id, val) {
  var el = document.getElementById(id);
  if (el && document.activeElement !== el) el.value = val;
}

// ─────────────────────────────────────────────────────────────────
// SET COLOR FOR ACTIVE ROLE
// ─────────────────────────────────────────────────────────────────

function setRoleColor(hex) {
  palette[activeRole] = hex;
  updateInputsFromHex(hex);
  applyPalette();
}

// ─────────────────────────────────────────────────────────────────
// COPY
// ─────────────────────────────────────────────────────────────────

function copyText(text, btn) {
  navigator.clipboard.writeText(text).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
  });
  var orig = btn.textContent;
  btn.textContent = 'Скопировано!';
  btn.classList.add('copied');
  setTimeout(function() { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
}

// ─────────────────────────────────────────────────────────────────
// MOCKUP TABS
// ─────────────────────────────────────────────────────────────────

function switchMockup(type) {
  mockupType = type;
  var el = document.querySelector('.mockup');
  if (el) {
    el.innerHTML = MOCKUPS[type] || '';
    applyPalette();
  }
  document.querySelectorAll('.mock-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.mock === type);
  });
}

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {

  // render mockup
  var mockEl = document.querySelector('.mockup');
  if (mockEl) {
    mockEl.innerHTML = MOCKUPS[mockupType] || MOCKUPS.shop;
  }

  // role buttons
  document.querySelectorAll('.role-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      activeRole = this.dataset.role;
      document.querySelectorAll('.role-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      updateInputsFromHex(palette[activeRole]);
    });
  });

  // mockup tabs
  document.querySelectorAll('.mock-tab').forEach(function(tab) {
    tab.addEventListener('click', function() { switchMockup(this.dataset.mock); });
  });

  // ── HEX input ──
  document.getElementById('inp-hex').addEventListener('input', function() {
    if (updating) return;
    var v = this.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    var rgb = hexToRgb(v);
    if (rgb) setRoleColor(v.length <= 7 ? v : '#' + v.slice(1,7));
  });

  // ── RGB inputs ──
  ['r','g','b'].forEach(function(ch) {
    document.getElementById('inp-' + ch).addEventListener('input', function() {
      if (updating) return;
      var r = parseInt(document.getElementById('inp-r').value) || 0;
      var g = parseInt(document.getElementById('inp-g').value) || 0;
      var b = parseInt(document.getElementById('inp-b').value) || 0;
      setRoleColor(rgbToHex(r, g, b));
    });
  });

  // ── HSL inputs ──
  ['h','s','l'].forEach(function(ch) {
    document.getElementById('inp-' + ch).addEventListener('input', function() {
      if (updating) return;
      var h = parseInt(document.getElementById('inp-h').value) || 0;
      var s = parseInt(document.getElementById('inp-s').value) || 0;
      var l = parseInt(document.getElementById('inp-l').value) || 0;
      var rgb = hslToRgb(h, s, l);
      setRoleColor(rgbToHex(rgb.r, rgb.g, rgb.b));
    });
  });

  // ── CMYK inputs ──
  ['c','m','y','k'].forEach(function(ch) {
    document.getElementById('inp-' + ch).addEventListener('input', function() {
      if (updating) return;
      var c = parseInt(document.getElementById('inp-c').value) || 0;
      var m = parseInt(document.getElementById('inp-m').value) || 0;
      var y = parseInt(document.getElementById('inp-y').value) || 0;
      var k = parseInt(document.getElementById('inp-k').value) || 0;
      var rgb = cmykToRgb(c, m, y, k);
      setRoleColor(rgbToHex(rgb.r, rgb.g, rgb.b));
    });
  });

  // copy buttons
  document.getElementById('copy-hex').addEventListener('click', function() {
    copyText(document.getElementById('inp-hex').value, this);
  });
  document.getElementById('copy-rgb').addEventListener('click', function() {
    var r = document.getElementById('inp-r').value;
    var g = document.getElementById('inp-g').value;
    var b = document.getElementById('inp-b').value;
    copyText('rgb(' + r + ', ' + g + ', ' + b + ')', this);
  });
  document.getElementById('copy-hsl').addEventListener('click', function() {
    var h = document.getElementById('inp-h').value;
    var s = document.getElementById('inp-s').value;
    var l = document.getElementById('inp-l').value;
    copyText('hsl(' + h + ', ' + s + '%, ' + l + '%)', this);
  });
  document.getElementById('copy-cmyk').addEventListener('click', function() {
    var c = document.getElementById('inp-c').value;
    var m = document.getElementById('inp-m').value;
    var y = document.getElementById('inp-y').value;
    var k = document.getElementById('inp-k').value;
    copyText('cmyk(' + c + '%, ' + m + '%, ' + y + '%, ' + k + '%)', this);
  });

  // init with default accent color
  updateInputsFromHex(palette[activeRole]);
  applyPalette();
});
