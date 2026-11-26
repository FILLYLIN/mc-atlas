/* mc·atlas 固定背景：呼吸点阵 + 随机线段多面体
 * 全站共用，canvas 固定在视口，内容浮在上面。无外部依赖。 */
(() => {
  const canvas = document.getElementById('atlas-backdrop');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, DPR = 1;
  let t = 0;

  const rnd = (a, b) => a + Math.random() * (b - a);

  // 每个多面体：随机面数、每个顶点连若干条随机长度线段
  function makeShape() {
    const nodes = [];
    const count = Math.round(rnd(3, 7));
    for (let i = 0; i < count; i++) {
      nodes.push([rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)]);
    }
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      const links = Math.round(rnd(1, 3));
      for (let k = 0; k < links; k++) {
        const j = Math.floor(rnd(0, nodes.length));
        if (j !== i) edges.push([i, j, rnd(0.5, 1.7)]);
      }
    }
    return {
      nodes, edges,
      x: rnd(0, 1), y: rnd(0, 1),
      r: rnd(46, 132),
      yaw: rnd(0, 6.28), pitch: rnd(-0.7, 0.7),
      vy: rnd(-0.12, 0.12), vp: rnd(-0.2, 0.2),
      dx: rnd(-6, 6), dy: rnd(-5, 5),
      hue: Math.random() < 0.72 ? '124,227,176' : '169,200,255',
      alpha: rnd(0.22, 0.5)
    };
  }

  let shapes = [];
  function reseed() {
    const n = Math.max(5, Math.min(12, Math.round((W * H) / 200000)));
    shapes = Array.from({ length: n }, makeShape);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    reseed();
  }

  function rot(p, yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x1 = p[0] * cy - p[2] * sy;
    const z1 = p[0] * sy + p[2] * cy;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const y1 = p[1] * cp - z1 * sp;
    const z2 = p[1] * sp + z1 * cp;
    return [x1, y1, z2];
  }

  function dotGrid(breath) {
    const gap = W < 720 ? 34 : 46;
    const size = 1 + breath * 0.9;
    ctx.fillStyle = `rgba(124,227,176,${0.16 + breath * 0.16})`;
    const ox = (W % gap) / 2;
    const oy = (H % gap) / 2;
    for (let y = oy; y < H; y += gap) {
      for (let x = ox; x < W; x += gap) {
        const d = Math.hypot((x - W / 2) / W, (y - H / 2) / H);
        const near = Math.max(0, 1 - d * 1.8);
        const a = 0.25 + near * 0.75;
        ctx.globalAlpha = a;
        ctx.fillRect(x, y, size, size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawShape(s) {
    const cx = s.x * W, cy = s.y * H;
    const pts = s.nodes.map((n) => {
      const r = rot(n, s.yaw, s.pitch);
      return [cx + r[0] * s.r, cy + r[1] * s.r, r[2]];
    });
    ctx.strokeStyle = `rgba(${s.hue},${s.alpha})`;
    ctx.lineWidth = 1;
    for (const [i, j, len] of s.edges) {
      const a = pts[i], b = pts[j];
      if (!a || !b) continue;
      const mx = (a[0] + b[0]) / 2 + (b[0] - a[0]) * (len - 1);
      const my = (a[1] + b[1]) / 2 + (b[1] - a[1]) * (len - 1);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(mx, my);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    // 顶点小点
    ctx.fillStyle = `rgba(${s.hue},${s.alpha * 1.6})`;
    for (const p of pts) {
      if (p[2] > 1.2) continue;
      ctx.fillRect(p[0] - 1, p[1] - 1, 2, 2);
    }
  }

  function frame() {
    t += 0.006;
    const breath = (Math.sin(t * 1.15) + 1) / 2;
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.5, H * 0.32, 0, W * 0.5, H * 0.32, Math.max(W, H) * 0.75);
    g.addColorStop(0, `rgba(124,227,176,${0.05 + breath * 0.035})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    dotGrid(breath);
    for (const s of shapes) {
      if (!reduce) {
        s.yaw += 0.0016 * s.vy * 30;
        s.pitch += 0.0012 * s.vp * 30;
        s.x += s.dx * 0.00002;
        s.y += s.dy * 0.00002;
        if (s.x < -0.15) s.x = 1.15; if (s.x > 1.15) s.x = -0.15;
        if (s.y < -0.15) s.y = 1.15; if (s.y > 1.15) s.y = -0.15;
      }
      drawShape(s);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  frame();
})();
