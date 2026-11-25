/* 类作用页：搜索 / 角色筛选 / 注册对象筛选 / 详情抽屉 */
(function () {
  const roles = window.MC_ROLES || [];
  const meta = window.MC_META || {};
  const roleStats = meta.roleStats || [];
  const rail = document.getElementById('roleRail');
  const tbody = document.getElementById('classRows');
  const countLine = document.getElementById('countLine');
  const moreBtn = document.getElementById('moreBtn');
  const search = document.getElementById('q');
  const layerSeg = document.getElementById('layerSeg');
  const regSwitch = document.getElementById('onlyReg');
  const roleSelect = document.getElementById('roleSelect');
  const total = roles.length;

  const state = {
    q: (MC.param('q') || '').toLowerCase(),
    role: MC.param('role') || '',
    layer: MC.param('layer') || '',
    reg: MC.param('reg') === '1',
    limit: 140,
    selected: MC.param('class') || ''
  };
  search.value = state.q;
  regSwitch.checked = state.reg;

  const KIND = { class: 'class', interface: 'interface', enum: 'enum', record: 'record', annotation: '@interface' };
  const LAYER_ORDER = ['client', 'server', 'common', 'data'];
  const REG_LABEL = { block: '方块', item: '物品', entity: '实体', effect: '状态效果' };

  function matches(r) {
    if (state.role && r.role !== state.role) return false;
    if (state.layer && r.layer !== state.layer) return false;
    if (state.reg && !(r.regs && r.regs.length)) return false;
    if (state.q) {
      const regNames = (r.regs || []).map(function (g) { return MC.nameOfReg(g); }).join(' ');
      const hay = (r.f + ' ' + r.pk + ' ' + r.role + ' ' + regNames).toLowerCase();
      if (hay.indexOf(state.q) < 0) return false;
    }
    return true;
  }

  if (roleSelect) {
    const groups = LAYER_ORDER.map(function (layer) {
      return {
        layer,
        list: roleStats.filter(function (s) { return s.layer === layer; }).sort(function (a, b) { return b.classes - a.classes; })
      };
    }).filter(function (g) { return g.list.length; });
    roleSelect.innerHTML = '<option value="">全部角色（' + MC.fmt(total) + '）</option>' + groups.map(function (g) {
      return '<optgroup label="' + MC.esc(MC.layerLabel[g.layer] || g.layer) + '">' + g.list.map(function (s) {
        return '<option value="' + MC.esc(s.role) + '">' + MC.esc(s.role) + '（' + MC.fmt(s.classes) + '）</option>';
      }).join('') + '</optgroup>';
    }).join('');
    roleSelect.value = state.role;
    roleSelect.addEventListener('change', function () {
      state.role = roleSelect.value;
      state.limit = 140;
      MC.setParams({ role: state.role, class: '' });
      render();
    });
  }

  function renderRail() {
    const totalByLayer = { client: 0, server: 0, common: 0, data: 0 };
    roleStats.forEach(function (s) { totalByLayer[s.layer] = (totalByLayer[s.layer] || 0) + s.classes; });
    let html = '<div class="rail-group">全部</div>' +
      '<div class="rail-item ' + (state.role ? '' : 'on') + '" data-role=""><span>全部角色</span><span class="c">' + MC.fmt(total) + '</span></div>';
    LAYER_ORDER.forEach(function (layer) {
      const list = roleStats.filter(function (s) { return s.layer === layer; })
        .sort(function (a, b) { return b.classes - a.classes; });
      if (!list.length) return;
      html += '<div class="rail-group">' + MC.esc(MC.layerLabel[layer] || layer) + ' · ' + MC.fmt(totalByLayer[layer]) + '</div>';
      html += list.map(function (s) {
        return '<div class="rail-item ' + (state.role === s.role ? 'on' : '') + '" data-role="' + MC.esc(s.role) + '">' +
          '<span>' + MC.esc(s.role) + '</span><span class="c">' + MC.fmt(s.classes) + '</span></div>';
      }).join('');
    });
    rail.innerHTML = html;
    rail.querySelectorAll('[data-role]').forEach(function (el) {
      el.addEventListener('click', function () {
        state.role = el.getAttribute('data-role');
        state.limit = 140;
        MC.setParams({ role: state.role, class: '' });
        render();
      });
    });
    const on = rail.querySelector('.rail-item.on');
    if (on && state.role) on.scrollIntoView({ block: 'nearest' });
  }

  function renderTable() {
    const all = roles.filter(matches);
    const shown = all.slice(0, state.limit);
    if (!shown.length) {
      tbody.innerHTML = MC.empty(4, '没有匹配的类');
      moreBtn.style.display = 'none';
      countLine.innerHTML = '<span>匹配 0 / ' + MC.fmt(total) + '</span><span></span>';
      return;
    }
    tbody.innerHTML = shown.map(function (r) {
      const f = r.f;
      const dot = f.lastIndexOf('.');
      const pkg = dot >= 0 ? f.slice(0, dot) : '';
      const cls = dot >= 0 ? f.slice(dot + 1) : f;
      const regs = r.regs || [];
      return '<tr data-fq="' + MC.esc(f) + '" class="' + (state.selected === f ? 'sel' : '') + '">' +
        '<td class="fq"><span class="pkg">' + MC.esc(pkg ? pkg + '.' : '') + '</span><span class="cls">' + MC.esc(cls) + '</span></td>' +
        '<td>' + MC.roleBadge(r.role, r.layer) + '</td>' +
        '<td class="num">' + (regs.length ? MC.fmt(regs.length) : '<span class="mini">—</span>') + '</td>' +
        '<td class="num">' + MC.fmt(r.n) + '</td>' +
        '</tr>';
    }).join('');
    tbody.querySelectorAll('tr[data-fq]').forEach(function (tr) {
      tr.addEventListener('click', function () { select(tr.getAttribute('data-fq')); });
    });
    moreBtn.style.display = all.length > state.limit ? '' : 'none';
    countLine.innerHTML = '<span>匹配 ' + MC.fmt(all.length) + ' / ' + MC.fmt(total) + '</span><span>已显示 ' + MC.fmt(shown.length) + '</span>';
  }

  function select(fq) {
    state.selected = fq;
    const r = roles.find(function (x) { return x.f === fq; });
    if (!r) return;
    MC.setParams({ class: fq });
    tbody.querySelectorAll('tr[data-fq]').forEach(function (tr) {
      tr.classList.toggle('sel', tr.getAttribute('data-fq') === fq);
    });
    MC.drawer.open(detailHtml(r));
  }

  function detailHtml(r) {
    const f = r.f;
    const dot = f.lastIndexOf('.');
    const pkg = dot >= 0 ? f.slice(0, dot) : '';
    const cls = dot >= 0 ? f.slice(dot + 1) : f;
    const regs = r.regs || [];
    const regHtml = regs.length ? regs.map(function (g) {
      const nm = MC.nameOfReg(g);
      const title = nm ? MC.esc(nm) + ' <span class="hint">' + MC.esc(g.id) + '</span>' : MC.esc(g.id);
      return '<div class="reg-item"><div class="rid">' + title + '</div>' +
        (g.summary ? '<div class="rs">' + MC.esc(g.summary) + '</div>' : '') + '</div>';
    }).join('') : '<div class="hint">没有被内置注册表直接引用；角色标签来自包路径与命名。</div>';
    const more = regs.length > 60 ? '<div class="hint" style="margin-top:8px">还有 ' + (regs.length - 60) + ' 个对象未列出</div>' : '';
    return '<div class="detail">' +
      '<div class="chips">' + MC.roleBadge(r.role, r.layer) + '<span class="badge solid">' + MC.esc(KIND[r.k] || r.k) + '</span></div>' +
      '<div class="fq"><span class="pkg">' + MC.esc(pkg ? pkg + '.' : '') + '</span>' + MC.esc(cls) + '</div>' +
      '<div class="kv">' +
      MC.detailRow('源码', '<a href="' + MC.vscode(r.p, r.l) + '">' + MC.esc(r.p) + ':' + r.l + '</a>') +
      (r.ext ? MC.detailRow('继承', MC.esc(r.ext)) : '') +
      (r.ifc && r.ifc.length ? MC.detailRow('实现', MC.esc(r.ifc.join(', '))) : '') +
      MC.detailRow('成员', MC.fmt(r.n)) +
      MC.detailRow('包', MC.esc(r.pk || '（默认包）')) +
      '</div>' +
      '<h3>游戏内对象 · ' + regs.length + '</h3>' + regHtml + more +
      '<div class="actions">' +
      '<button class="btn" data-copy="' + MC.esc(f) + '">复制类名</button>' +
      '<a class="btn ghost" href="' + MC.vscode(r.p, r.l) + '">VS Code 打开</a>' +
      '</div></div>';
  }

  search.addEventListener('input', MC.debounce(function () {
    state.q = search.value.trim().toLowerCase();
    state.limit = 140;
    MC.setParams({ q: state.q });
    renderTable();
  }, 100));
  MC.searchShortcut(search);

  layerSeg.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.layer = b.getAttribute('data-layer');
      state.limit = 140;
      layerSeg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      MC.setParams({ layer: state.layer });
      render();
    });
    if (b.getAttribute('data-layer') === state.layer) {
      layerSeg.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
    }
  });

  regSwitch.addEventListener('change', function () {
    state.reg = regSwitch.checked;
    state.limit = 140;
    MC.setParams({ reg: state.reg ? '1' : '' });
    render();
  });

  moreBtn.addEventListener('click', function () {
    state.limit += 160;
    renderTable();
  });

  document.getElementById('drawerBody').addEventListener('click', function (e) {
    const copy = e.target.closest('[data-copy]');
    if (copy) MC.copy(copy.getAttribute('data-copy'));
  });

  window.addEventListener('mc-lang-change', function () {
    if (state.selected && document.getElementById('drawer').classList.contains('on')) {
      const r = roles.find(function (x) { return x.f === state.selected; });
      if (r) MC.drawer.open(detailHtml(r));
    }
  });

  function render() {
    renderRail();
    renderTable();
    if (roleSelect) roleSelect.value = state.role;
  }

  render();
  if (state.selected) {
    const r = roles.find(function (x) { return x.f === state.selected; });
    if (r) MC.drawer.open(detailHtml(r));
  }
})();
