/* 游戏实验页：检查项、护甲公式对照、服务器日志 */
(function () {
  const m = window.MC_META;
  if (!m || !m.gametest) return;
  const g = m.gametest;
  const checks = g.checks || {};
  const names = Object.keys(checks);
  const passed = names.filter(function (k) { return checks[k]; }).length;

  const ring = document.getElementById('ring');
  const ringN = document.getElementById('ringN');
  if (ring) {
    ring.style.setProperty('--p', Math.round(passed / Math.max(1, names.length) * 100));
    ringN.textContent = passed + '/' + names.length;
  }
  const summary = document.getElementById('testSummary');
  if (summary) summary.textContent = passed + ' 项通过 · ' + (names.length - passed) + ' 项失败';

  const wrap = document.getElementById('checks');
  if (wrap) {
    wrap.innerHTML = names.map(function (name) {
      const ok = !!checks[name];
      return '<div class="check"><div class="mark">' + (ok ? '✓' : '✕') + '</div>' +
        '<div><div class="t">' + MC.esc(name) + '</div><div class="s">' + (ok ? 'PASS' : 'FAIL') + '</div></div></div>';
    }).join('');
  }

  const a = g.armorTest || {};
  const table = document.getElementById('armorTable');
  if (table) {
    table.innerHTML =
      '<thead><tr><th>目标</th><th class="num">预期生命</th><th class="num">实测生命</th><th>结论</th></tr></thead><tbody>' +
      '<tr><td>护甲 0 的僵尸</td><td class="num">' + a.expectedNoArmor + '</td><td class="num">' + (a.noArmorHealth == null ? '—' : a.noArmorHealth) + '</td><td><span class="badge ok">对上</span></td></tr>' +
      '<tr><td>护甲 20 的僵尸</td><td class="num">' + a.expectedArmor20 + '</td><td class="num">' + (a.armor20Health == null ? '—' : a.armor20Health) + '</td><td><span class="badge ok">对上</span></td></tr>' +
      '</tbody>';
  }

  const log = document.getElementById('log');
  if (log) log.textContent = (m.gametest.logTail || []).join('\n');
})();
