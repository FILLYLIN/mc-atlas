/* 方法页：版本表与运行时基线 */
(function () {
  const m = window.MC_META;
  if (!m) return;

  const vt = document.getElementById('versionTable');
  if (vt) {
    const rows = (m.versions || []).map(function (v) {
      const s = v.stats || {};
      const current = v.version === m.version;
      return '<tr><td class="mono" data-label="版本">' + MC.esc(v.version) + '</td>' +
        '<td class="num" data-label="java 文件">' + (s.javaFiles ? MC.fmt(s.javaFiles) : '—') + '</td>' +
        '<td class="num" data-label="类型">' + (s.classes ? MC.fmt(s.classes) : '—') + '</td>' +
        '<td class="num" data-label="方法">' + (s.methods ? MC.fmt(s.methods) : '—') + '</td>' +
        '<td class="num" data-label="包">' + (s.packages ? MC.fmt(s.packages) : '—') + '</td>' +
        '<td data-label="状态">' + (v.version === m.version ? '<span class="badge ok">运行时数据源</span>' : (v.runtime ? '<span class="badge common">运行时</span>' : '<span class="badge">仅静态</span>')) + '</td></tr>';
    }).join('');
    vt.innerHTML = '<thead><tr><th>版本</th><th class="num">java 文件</th><th class="num">类型</th><th class="num">方法</th><th class="num">包</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody>';
  }

  const bt = document.getElementById('baselineTable');
  if (bt) {
    const c = m.runtime.counts;
    const rows = [
      ['内置注册表', m.runtime.builtinRegistries + ' 个 / ' + MC.fmt(m.runtime.builtinEntriesTotal) + ' 条'],
      ['方块', MC.fmt(c.blocks)],
      ['物品', MC.fmt(c.items)],
      ['实体', MC.fmt(c.entities)],
      ['状态效果', MC.fmt(c.effects)],
      ['药水', MC.fmt(c.potions)],
      ['属性', MC.fmt(c.attributes)],
      ['有注册对象的类', '491 个，覆盖 3,145 个对象']
    ];
    bt.innerHTML = rows.map(function (r) {
      return '<div class="reg-item"><div class="rid">' + MC.esc(r[0]) + '</div><div class="rs">' + MC.esc(r[1]) + '</div></div>';
    }).join('');
  }
})();
