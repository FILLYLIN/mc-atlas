/* mc·atlas 共享脚本：主题、导航、抽屉、格式化 */
(function () {
  const M = (window.MC = window.MC || {});
  const rootEl = document.documentElement;

  M.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  M.fmt = function (n) {
    return Number(n || 0).toLocaleString('en-US');
  };
  M.param = function (k) {
    return new URLSearchParams(location.search).get(k) || '';
  };
  M.setParams = function (obj, replace) {
    const u = new URL(location.href);
    Object.keys(obj).forEach(function (k) {
      const v = obj[k];
      if (v === '' || v == null || v === false) u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    });
    history[replace === false ? 'pushState' : 'replaceState']({}, '', u);
  };

  M.toast = function (text) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('on'); }, 1800);
  };

  M.copy = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { M.toast('已复制'); },
        function () { M.toast('复制失败，请手动选择'); }
      );
    } else {
      M.toast('当前环境不支持剪贴板');
    }
  };

  M.vscode = function (p, line) {
    const root = (window.MC_META && window.MC_META.root) || '';
    const path = (root + '/' + p).replace(/\\/g, '/').replace(/\/+/g, '/');
    return 'vscode://file/' + encodeURI(path) + (line ? ':' + line : '');
  };

  M.layerLabel = { client: '客户端', server: '服务端', common: '通用', data: '数据/工具链' };
  M.roleBadge = function (role, layer) {
    return '<span class="badge ' + M.esc(layer || 'common') + '">' + M.esc(role) + '</span>';
  };

  M.detailRow = function (k, v) {
    return '<div class="k">' + M.esc(k) + '</div><div class="v">' + v + '</div>';
  };

  M.objectStat = function (kind, o) {
    if (kind === 'blocks') {
      return '硬度 ' + (o.hardness == null ? '?' : o.hardness) + ' · 抗爆 ' + (o.resistance == null ? '?' : o.resistance) +
        ' · 亮度 ' + o.light + (o.toolRequired ? ' · 需正确工具' : '');
    }
    if (kind === 'items') return '组件数值待数据包加载';
    if (kind === 'entities') {
      const hp = o.attributes && o.attributes['minecraft:max_health'];
      return '生命 ' + (hp == null ? '?' : hp) + ' · ' + o.width + '×' + o.height + ' · ' + o.category;
    }
    if (kind === 'effects') return o.category + ' · #' + o.color.toString(16).padStart(6, '0') + (o.instant ? ' · 瞬发' : '');
    if (kind === 'potions') return (o.effects || []).map(function (f) {
      return f.effect.replace('minecraft:', '') + ' ' + f.duration + 't' + (f.amplifier ? ' ×' + (f.amplifier + 1) : '');
    }).join('，') || '—';
    if (kind === 'attributes') return '默认 ' + o.default + (o.min != null ? ' · ' + o.min + ' ~ ' + o.max : '');
    return '';
  };

  M.empty = function (cols, text) {
    return '<tr><td colspan="' + cols + '"><div class="empty">' + M.esc(text || '没有匹配') + '</div></td></tr>';
  };

  M.debounce = function (fn, ms) {
    let t;
    return function () {
      const args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 120);
    };
  };

  M.searchShortcut = function (input) {
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== input && !/input|textarea/i.test((document.activeElement || {}).tagName || '')) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  };

  /* 名称语言：任意官方语言（只影响注册对象译名） */
  M.langs = (window.MC_META && MC_META.languages) || [];
  M.langNames = window.MC_LANG_NAMES || null;
  M.lang = 'zh_cn';
  try {
    let saved = localStorage.getItem('mc-lang');
    if (saved === 'zh') saved = 'zh_cn';
    if (saved === 'en') saved = 'en_us';
    if (saved && (!M.langs.length || M.langs.some(function (l) { return l.code === saved; }))) M.lang = saved;
  } catch (e) {}
  M._langCache = {};
  M.nameOf = function (o) {
    if (!o || o.ix == null || !M.langNames) return '';
    return M.langNames[o.ix] || '';
  };
  M.nameOfReg = function (g) {
    if (!g || g.ix == null || !M.langNames) return '';
    return M.langNames[g.ix] || '';
  };
  M.loadLang = function (code) {
    if (!code) return Promise.resolve();
    if (M.lang === code && M.langNames) return Promise.resolve();
    if (M._langCache[code]) {
      M.lang = code;
      M.langNames = M._langCache[code];
      try { localStorage.setItem('mc-lang', code); } catch (e) {}
      window.dispatchEvent(new CustomEvent('mc-lang-change', { detail: { lang: code } }));
      return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = 'assets/data/lang/' + code + '.js';
      s.async = true;
      s.onload = function () {
        const names = window.MC_LANG_NAMES || null;
        if (!names) { reject(new Error('语言包为空')); return; }
        M._langCache[code] = names;
        M.lang = code;
        M.langNames = names;
        try { localStorage.setItem('mc-lang', code); } catch (e) {}
        window.dispatchEvent(new CustomEvent('mc-lang-change', { detail: { lang: code } }));
        resolve();
      };
      s.onerror = function () { reject(new Error('语言包加载失败')); };
      document.head.appendChild(s);
    });
  };
  if (M.lang !== 'zh_cn' && window.MC_LANG_NAMES) {
    M.loadLang(M.lang).catch(function () { M.lang = 'zh_cn'; });
  }

  /* 导航高亮 */
  const page = document.body.getAttribute('data-page');
  document.querySelectorAll('.nav a').forEach(function (a) {
    if (a.getAttribute('data-page') === page) a.classList.add('on');
  });

  /* 主题 */
  try {
    const saved = localStorage.getItem('mc-theme');
    if (saved === 'light' || saved === 'dark') rootEl.setAttribute('data-theme', saved);
  } catch (e) {}
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      const next = rootEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      rootEl.setAttribute('data-theme', next);
      themeBtn.textContent = next === 'light' ? '☀' : '◐';
      try { localStorage.setItem('mc-theme', next); } catch (e) {}
    });
    themeBtn.textContent = rootEl.getAttribute('data-theme') === 'light' ? '☀' : '◐';
  }

  /* 抽屉 */
  const drawer = document.getElementById('drawer');
  const drawerBody = document.getElementById('drawerBody');
  M.drawer = {
    open: function (html) {
      if (!drawer) return;
      drawerBody.innerHTML = html;
      drawer.classList.add('on');
      document.body.style.overflow = 'hidden';
      const btn = drawer.querySelector('[data-close]');
      if (btn) btn.focus();
    },
    close: function () {
      if (!drawer) return;
      drawer.classList.remove('on');
      document.body.style.overflow = '';
    }
  };
  if (drawer) {
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) M.drawer.close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('on')) M.drawer.close();
    });
  }
})();
