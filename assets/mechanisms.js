/* 代码联想页：机制图 + 调用链卡片 + 文章索引 */
(function () {
  const data = window.MC_MECH;
  if (!data) return;
  const byId = {};
  data.articles.forEach(function (a) { byId[a.id] = a; });
  const qInput = document.getElementById('mechSearch');
  let query = '';

  document.getElementById('mechIntro').textContent = data.intro;
  const articleCount = document.getElementById('articleCount');

  function renderGraph() {
    const W = 1160, H = 700, NW = 210, NH = 48;
    const nodes = data.graph.nodes;
    const byNode = {};
    nodes.forEach(function (n) { byNode[n.id] = n; });
    const cx = function (n) { return n.x + NW / 2; };
    const cy = function (n) { return n.y + NH / 2; };
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="机制与代码的调用关系">';
    svg += '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(157,180,167,.55)"/></marker></defs>';
    function port(n, t) {
      const dx = (t.x + NW / 2) - (n.x + NW / 2);
      const dy = (t.y + NH / 2) - (n.y + NH / 2);
      if (Math.abs(dx) >= Math.abs(dy)) {
        return { x: dx > 0 ? n.x + NW : n.x, y: n.y + NH / 2, dir: 'h', sign: Math.sign(dx) };
      }
      return { x: n.x + NW / 2, y: dy > 0 ? n.y + NH : n.y, dir: 'v', sign: Math.sign(dy) };
    }
    for (const e of data.graph.edges) {
      const s = byNode[e.from], t = byNode[e.to];
      if (!s || !t) continue;
      const p1 = port(s, t), p2 = port(t, s);
      const bend = 55;
      const c1x = p1.dir === 'h' ? p1.x + p1.sign * bend : p1.x;
      const c1y = p1.dir === 'v' ? p1.y + p1.sign * bend : p1.y;
      const c2x = p2.dir === 'h' ? p2.x + p2.sign * bend : p2.x;
      const c2y = p2.dir === 'v' ? p2.y + p2.sign * bend : p2.y;
      const path = 'M ' + p1.x + ' ' + p1.y + ' C ' + c1x + ' ' + c1y + ', ' + c2x + ' ' + c2y + ', ' + p2.x + ' ' + p2.y;
      svg += '<path class="gedge" d="' + path + '" marker-end="url(#arrow)"><title>' + MC.esc(e.label || '') + '</title></path>';
    }
    for (const n of nodes) {
      const cls = n.kind === 'mech' ? 'mech' : n.kind === 'engine' ? 'engine' : 'hub';
      const attrs = n.mech ? ' data-mech="' + MC.esc(n.mech) + '"' : (n.cls ? ' data-class="' + MC.esc(n.cls) + '"' : '');
      svg += '<g class="gnode ' + cls + '"' + attrs + ' transform="translate(' + n.x + ',' + n.y + ')">' +
        '<rect width="' + NW + '" height="' + NH + '"/>' +
        '<text class="glabel" x="12" y="20">' + MC.esc(n.label) + '</text>' +
        '<text class="gsub" x="12" y="36">' + MC.esc(n.sub || '') + '</text>' +
        '</g>';
    }
    svg += '</svg>';
    document.getElementById('mechGraph').innerHTML = svg;
    document.querySelectorAll('#mechGraph .gnode').forEach(function (g) {
      g.addEventListener('click', function () {
        const mech = g.getAttribute('data-mech');
        if (mech) {
          query = '';
          if (qInput) qInput.value = '';
          renderCards();
          const el = document.getElementById('mech-' + mech);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        const cls = g.getAttribute('data-class');
        if (cls) location.href = 'classes.html?class=' + encodeURIComponent(cls);
      });
    });
  }

  function cardHtml(m) {
    const chain = (m.chain || []).map(function (s, i) {
      return '<div class="chain-step"><div class="n">' + String(i + 1).padStart(2, '0') + '</div>' +
        '<div class="t">' + MC.esc(s.label) + '</div><div class="d">' + MC.esc(s.detail) + '</div></div>';
    }).join('');
    const codes = (m.code || []).map(function (c) {
      const short = c.cls.split('.').pop() + '.' + c.method;
      const src = c.path ? ' <a class="src" href="' + MC.vscode(c.path, c.line || 0) + '">源码' + (c.line ? ':' + c.line : '') + '</a>' : '';
      return '<div class="code-row"><div class="sig" title="' + MC.esc(c.cls) + '.' + MC.esc(c.method) + '">' +
        '<a href="classes.html?class=' + encodeURIComponent(c.cls) + '"><b>' + MC.esc(short) + '</b></a></div>' +
        '<div class="note">' + MC.esc(c.note || '') + '</div><div>' + src + '</div></div>';
    }).join('');
    const arts = (m.articles || []).map(function (id) {
      const a = byId[id];
      if (!a) return '';
      return '<a class="badge" href="' + MC.esc(a.github) + '" target="_blank" rel="noreferrer">' + MC.esc(a.title) + ' ↗</a>';
    }).join('');
    return '<div class="mech-card" id="mech-' + MC.esc(m.id) + '">' +
      '<div class="chips"><span class="badge ok">机制</span><span class="badge">' + (m.articles || []).length + ' 篇文章</span></div>' +
      '<h3>' + MC.esc(m.title) + '</h3>' +
      '<p class="mech-q">' + MC.esc(m.question) + '</p>' +
      '<p class="mech-summary">' + MC.esc(m.summary) + '</p>' +
      '<div class="chain">' + chain + '</div>' +
      '<div class="code-list">' + codes + '</div>' +
      '<div class="mech-articles">' + arts + '</div>' +
      '</div>';
  }

  function renderCards() {
    const list = (data.mechanisms || []).filter(function (m) {
      if (!query) return true;
      const hay = [m.title, m.question, m.summary, (m.articles || []).map(function (id) { return byId[id] ? byId[id].title : ''; }).join(' '),
        (m.code || []).map(function (c) { return c.cls + ' ' + c.method + ' ' + (c.note || ''); }).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(query) >= 0;
    });
    document.getElementById('mechCards').innerHTML = list.map(cardHtml).join('') ||
      '<div class="empty">没有匹配的机制</div>';
  }

  function renderArticles() {
    const list = (data.articles || []).filter(function (a) {
      if (!query) return true;
      return (a.chapter + ' ' + a.title + ' ' + a.summary).toLowerCase().indexOf(query) >= 0;
    });
    articleCount.textContent = list.length + ' / ' + data.articles.length + ' 篇';
    document.getElementById('articleList').innerHTML = list.map(function (a) {
      return '<a class="article-row" href="' + MC.esc(a.github) + '" target="_blank" rel="noreferrer">' +
        '<div class="ch">' + MC.esc(a.chapter) + '</div>' +
        '<div><div class="tt">' + MC.esc(a.title) + '</div><div class="sm">' + MC.esc(a.summary) + '</div></div>' +
        '<div class="go">' + (a.size ? Math.round(a.size / 1024) + ' KB' : '') + ' ↗</div></a>';
    }).join('') || '<div class="empty">没有匹配的文章</div>';
  }

  if (qInput) {
    qInput.addEventListener('input', MC.debounce(function () {
      query = qInput.value.trim().toLowerCase();
      renderCards();
      renderArticles();
    }, 100));
    MC.searchShortcut(qInput);
  }

  renderGraph();
  renderCards();
  renderArticles();
})();
