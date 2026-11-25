/* 注册对象页：方块 / 物品 / 实体 / 状态效果 / 药水 / 属性 */
(function () {
  const objects = window.MC_OBJECTS || {};
  const meta = window.MC_META || {};
  const tabsEl = document.getElementById('kindTabs');
  const tbody = document.getElementById('objRows');
  const thead = document.getElementById('objHead');
  const countLine = document.getElementById('objCount');
  const moreBtn = document.getElementById('objMore');
  const search = document.getElementById('oq');
  const langSel = document.getElementById('langSelect');

  const KINDS = [
    { key: 'blocks', label: '方块' },
    { key: 'items', label: '物品' },
    { key: 'entities', label: '实体' },
    { key: 'effects', label: '状态效果' },
    { key: 'potions', label: '药水' },
    { key: 'attributes', label: '属性' }
  ];
  const DEFS = {
    blocks: {
      cols: [
        { k: 'id', t: '注册 ID', mono: true },
        { k: 'cls', t: '实现类', mono: true },
        { k: 'hardness', t: '硬度', num: true },
        { k: 'resistance', t: '抗爆', num: true },
        { k: 'light', t: '亮度', num: true },
        { k: 'toolRequired', t: '需正确工具', fmt: function (o) { return o.toolRequired ? '是' : '否'; } }
      ]
    },
    items: {
      cols: [
        { k: 'id', t: '注册 ID', mono: true },
        { k: 'cls', t: '实现类', mono: true }
      ]
    },
    entities: {
      cols: [
        { k: 'id', t: '注册 ID', mono: true },
        { k: 'cls', t: '实现类', mono: true },
        { k: 'category', t: '类别' },
        { k: 'health', t: '生命', num: true, val: function (o) { return o.attributes && o.attributes['minecraft:max_health']; } },
        { k: 'size', t: '尺寸', val: function (o) { return o.width + ' × ' + o.height; } }
      ]
    },
    effects: {
      cols: [
        { k: 'id', t: '注册 ID', mono: true },
        { k: 'cls', t: '实现类', mono: true },
        { k: 'category', t: '类别' },
        { k: 'color', t: '颜色', val: function (o) { return '#' + o.color.toString(16).padStart(6, '0'); } },
        { k: 'instant', t: '瞬发', val: function (o) { return o.instant ? '是' : '否'; } }
      ]
    },
    potions: {
      cols: [
        { k: 'id', t: '注册 ID', mono: true },
        { k: 'name', t: '基础名' },
        { k: 'effects', t: '效果', val: function (o) { return MC.objectStat('potions', o); } }
      ]
    },
    attributes: {
      cols: [
        { k: 'id', t: '注册 ID', mono: true },
        { k: 'cls', t: '实现类', mono: true },
        { k: 'default', t: '默认值', num: true },
        { k: 'range', t: '范围', val: function (o) { return o.min == null ? '—' : o.min + ' ~ ' + o.max; } }
      ]
    }
  };

  Object.keys(DEFS).forEach(function (k) {
    DEFS[k].cols.splice(1, 0, { k: 'name', t: '名称', val: function (o) { return MC.nameOf(o); } });
  });

  const state = {
    kind: MC.param('kind') || 'blocks',
    q: (MC.param('q') || '').toLowerCase(),
    sort: MC.param('sort') || '',
    dir: MC.param('dir') === 'desc' ? -1 : 1,
    limit: 180,
    selected: MC.param('id') || ''
  };
  if (!DEFS[state.kind]) state.kind = 'blocks';
  search.value = state.q;
  if (langSel) {
    langSel.innerHTML = (MC.langs || []).map(function (l) {
      return '<option value="' + MC.esc(l.code) + '">' + MC.esc(l.name) + ' · ' + MC.esc(l.code) + '</option>';
    }).join('');
    langSel.value = MC.lang;
    langSel.addEventListener('change', function () {
      MC.loadLang(langSel.value).catch(function () { MC.toast('语言包加载失败'); });
    });
  }

  function list() {
    const def = DEFS[state.kind];
    let arr = objects[state.kind] || [];
    if (state.q) {
      arr = arr.filter(function (o) {
        const names = MC.nameOf(o) || '';
        const hay = (o.id + ' ' + (o.cls || '') + ' ' + (o.category || '') + ' ' + (o.name || '') + ' ' + names + ' ' + MC.objectStat(state.kind, o)).toLowerCase();
        return hay.indexOf(state.q) >= 0;
      });
    }
    const col = def.cols.find(function (c) { return c.k === state.sort; });
    if (col) {
      arr = arr.slice().sort(function (a, b) {
        const va = col.val ? col.val(a) : a[col.k];
        const vb = col.val ? col.val(b) : b[col.k];
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * state.dir;
        return String(va == null ? '' : va).localeCompare(String(vb == null ? '' : vb)) * state.dir;
      });
    }
    return arr;
  }

  function renderTabs() {
    tabsEl.innerHTML = KINDS.map(function (k) {
      return '<button class="kind-tab ' + (k.key === state.kind ? 'on' : '') + '" data-kind="' + k.key + '">' +
        k.label + '<span class="c">' + MC.fmt((objects[k.key] || []).length) + '</span></button>';
    }).join('');
    tabsEl.querySelectorAll('[data-kind]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.kind = b.getAttribute('data-kind');
        state.sort = '';
        state.dir = 1;
        state.limit = 180;
        state.selected = '';
        MC.setParams({ kind: state.kind, sort: '', dir: '', id: '' });
        render();
      });
    });
  }

  function renderHead() {
    const def = DEFS[state.kind];
    thead.innerHTML = '<tr>' + def.cols.map(function (c) {
      const arrow = state.sort === c.k ? (state.dir > 0 ? ' ↑' : ' ↓') : '';
      return '<th class="' + (c.num ? 'num ' : '') + 'sortable" data-sort="' + c.k + '">' + c.t + arrow + '</th>';
    }).join('') + '</tr>';
    thead.querySelectorAll('[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        const k = th.getAttribute('data-sort');
        if (state.sort === k) state.dir = -state.dir;
        else { state.sort = k; state.dir = 1; }
        MC.setParams({ sort: state.sort, dir: state.dir > 0 ? 'asc' : 'desc' });
        renderTable();
      });
    });
  }

  function renderTable() {
    const def = DEFS[state.kind];
    const arr = list();
    const shown = arr.slice(0, state.limit);
    if (!shown.length) {
      tbody.innerHTML = MC.empty(def.cols.length, '没有匹配的对象');
      moreBtn.style.display = 'none';
      countLine.innerHTML = '<span>匹配 0</span><span></span>';
      return;
    }
    tbody.innerHTML = shown.map(function (o) {
      const cells = def.cols.map(function (c) {
        const raw = c.fmt ? c.fmt(o) : (c.val ? c.val(o) : o[c.k]);
        const v = raw == null || raw === '' ? '—' : MC.esc(raw);
        return '<td data-label="' + MC.esc(c.t) + '" class="' + (c.mono ? 'mono' : '') + (c.num ? ' num' : '') + '">' + v + '</td>';
      }).join('');
      return '<tr data-id="' + MC.esc(o.id) + '" class="' + (state.selected === o.id ? 'sel' : '') + '">' + cells + '</tr>';
    }).join('');
    tbody.querySelectorAll('tr[data-id]').forEach(function (tr) {
      tr.addEventListener('click', function () { select(tr.getAttribute('data-id')); });
    });
    moreBtn.style.display = arr.length > state.limit ? '' : 'none';
    countLine.innerHTML = '<span>匹配 ' + MC.fmt(arr.length) + ' / ' + MC.fmt((objects[state.kind] || []).length) + '</span><span>已显示 ' + MC.fmt(shown.length) + '</span>';
  }

  function findObj(kind, id) {
    return (objects[kind] || []).find(function (o) { return o.id === id; });
  }

  function select(id) {
    const o = findObj(state.kind, id);
    if (!o) return;
    state.selected = id;
    MC.setParams({ id: id });
    tbody.querySelectorAll('tr[data-id]').forEach(function (tr) {
      tr.classList.toggle('sel', tr.getAttribute('data-id') === id);
    });
    MC.drawer.open(detailHtml(o));
  }

  function detailHtml(o) {
    let body = '<div class="detail">' +
      '<div class="chips"><span class="badge solid">' + MC.esc((KINDS.find(function (k) { return k.key === state.kind; }) || {}).label || state.kind) + '</span></div>' +
      '<div class="fq">' + (MC.nameOf(o) ? MC.esc(MC.nameOf(o)) + '<span class="pkg">' + MC.esc(o.id) + '</span>' : MC.esc(o.id)) + '</div>' +
      '<div class="kv">';
    if (o.cls) body += MC.detailRow('实现类', '<a href="classes.html?class=' + encodeURIComponent(o.cls) + '">' + MC.esc(o.cls) + '</a>');
    if (state.kind === 'blocks') {
      body += MC.detailRow('硬度', o.hardness == null ? '—' : o.hardness) +
        MC.detailRow('抗爆', o.resistance == null ? '—' : o.resistance) +
        MC.detailRow('亮度', o.light) +
        MC.detailRow('需正确工具', o.toolRequired ? '是' : '否') +
        MC.detailRow('空气', o.air ? '是' : '否') +
        MC.detailRow('液体', o.liquid ? '是' : '否');
    } else if (state.kind === 'items') {
      body += MC.detailRow('说明', '堆叠/耐久等组件数值要等数据包加载后绑定');
    } else if (state.kind === 'entities') {
      const hp = o.attributes && o.attributes['minecraft:max_health'];
      body += MC.detailRow('类别', o.category) +
        MC.detailRow('生命', hp == null ? '—' : hp) +
        MC.detailRow('尺寸', o.width + ' × ' + o.height) +
        MC.detailRow('眼高', o.eyeHeight) +
        MC.detailRow('抗火', o.fireImmune ? '是' : '否') +
        MC.detailRow('可召唤', o.summonable ? '是' : '否');
    } else if (state.kind === 'effects') {
      body += MC.detailRow('类别', o.category) +
        MC.detailRow('颜色', '#' + o.color.toString(16).padStart(6, '0')) +
        MC.detailRow('瞬发', o.instant ? '是' : '否') +
        MC.detailRow('有益', o.beneficial ? '是' : '否');
    } else if (state.kind === 'potions') {
      body += MC.detailRow('基础名', o.name);
    } else if (state.kind === 'attributes') {
      body += MC.detailRow('默认值', o.default) +
        (o.min != null ? MC.detailRow('范围', o.min + ' ~ ' + o.max) : '');
    }
    body += '</div>';

    if (state.kind === 'entities' && o.attributes) {
      const rows = Object.keys(o.attributes).sort().map(function (k) {
        return '<div class="reg-item"><div class="rid">' + MC.esc(k.replace('minecraft:', '')) + '</div><div class="rs">' + o.attributes[k] + '</div></div>';
      }).join('');
      body += '<h3>默认属性 · ' + Object.keys(o.attributes).length + '</h3>' + rows;
    }
    if (state.kind === 'potions') {
      const rows = (o.effects || []).map(function (f) {
        return '<div class="reg-item"><div class="rid">' + MC.esc(f.effect) + '</div><div class="rs">' +
          f.duration + ' tick · 等级 ' + (f.amplifier + 1) + '</div></div>';
      }).join('') || '<div class="hint">无效果</div>';
      body += '<h3>效果</h3>' + rows;
    }
    body += '<div class="actions">' +
      (o.cls ? '<a class="btn" href="classes.html?class=' + encodeURIComponent(o.cls) + '">查看实现类</a>' : '') +
      '<button class="btn ghost" data-copy="' + MC.esc(o.id) + '">复制 ID</button>' +
      '</div></div>';
    return body;
  }

  search.addEventListener('input', MC.debounce(function () {
    state.q = search.value.trim().toLowerCase();
    state.limit = 180;
    MC.setParams({ q: state.q });
    renderTable();
  }, 100));
  MC.searchShortcut(search);

  moreBtn.addEventListener('click', function () {
    state.limit += 200;
    renderTable();
  });

  document.getElementById('drawerBody').addEventListener('click', function (e) {
    const copy = e.target.closest('[data-copy]');
    if (copy) MC.copy(copy.getAttribute('data-copy'));
  });

  window.addEventListener('mc-lang-change', function () {
    if (langSel) langSel.value = MC.lang;
    renderHead();
    renderTable();
    if (state.selected && document.getElementById('drawer').classList.contains('on')) {
      const o = findObj(state.kind, state.selected);
      if (o) MC.drawer.open(detailHtml(o));
    }
  });

  function render() {
    renderTabs();
    renderHead();
    renderTable();
  }

  render();
  if (state.selected) {
    const o = findObj(state.kind, state.selected);
    if (o) MC.drawer.open(detailHtml(o));
  }
})();
