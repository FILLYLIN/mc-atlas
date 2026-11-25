/* 首页：用 meta 填数字与角色分布 */
(function () {
  const m = window.MC_META;
  if (!m) return;
  const counts = m.runtime.counts;
  const objects = Object.keys(counts).reduce(function (a, k) { return a + counts[k]; }, 0);
  const checks = Object.values(m.gametest.checks || {});
  const passed = checks.filter(Boolean).length;

  const values = {
    types: m.stats.classes,
    roles: m.roleStats.length,
    objects: objects,
    tests: passed + '/' + checks.length
  };
  document.querySelectorAll('[data-stat]').forEach(function (el) {
    const k = el.getAttribute('data-stat');
    if (values[k] != null) el.textContent = typeof values[k] === 'number' ? MC.fmt(values[k]) : values[k];
  });
  document.querySelectorAll('[data-sub]').forEach(function (el) {
    const k = el.getAttribute('data-sub');
    if (k === 'types') el.textContent = '顶层 ' + MC.fmt(m.stats.topLevelClasses) + ' · ' + MC.fmt(m.stats.packages) + ' 个包';
    if (k === 'roles') el.textContent = '491 个类被注册表直接认领';
    if (k === 'objects') el.textContent = m.runtime.builtinRegistries + ' 个内置注册表 · ' + MC.fmt(m.runtime.builtinEntriesTotal) + ' 条';
    if (k === 'tests') el.textContent = '红石 / 爆炸 / 护甲';
  });

  const bars = document.getElementById('roleBars');
  if (bars) {
    const top = m.roleStats.slice().sort(function (a, b) { return b.classes - a.classes; }).slice(0, 12);
    const max = top.length ? top[0].classes : 1;
    bars.innerHTML = top.map(function (s, i) {
      return '<div class="bar-row">' +
        '<div class="name" title="' + MC.esc(s.role) + '">' + MC.esc(s.role) + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + Math.max(2, Math.round(s.classes / max * 100)) + '%;animation-delay:' + (i * 40) + 'ms"></div></div>' +
        '<div class="n">' + MC.fmt(s.classes) + '</div>' +
        '</div>';
    }).join('');
  }
})();
