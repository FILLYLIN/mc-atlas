/* mc·atlas 首页：草方块 → 类名 → 爆炸清场
 * 滚动驱动：方块升入 → 旋转 → 裂开 → 类名从方块里散落归位 → 爆炸清掉，交回页面。
 * 纯 canvas 2D + 手写透视投影，无外部依赖，file:// 直接可用。 */
(() => {
  const stage = document.querySelector('.atlas-stage');
  const canvas = document.getElementById('atlas-canvas');
  if (!stage || !canvas) return;
  const ctx = canvas.getContext('2d');
  const NAMES = (window.MC_ATLAS_HERO_NAMES || []).slice(0, 30);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const VOX = 4;
  const voxels = [];
  for (let x = 0; x < VOX; x++) {
    for (let y = 0; y < VOX; y++) {
      for (let z = 0; z < VOX; z++) {
        const t = x * 31 + y * 17 + z * 43 + 7;
        const a = ((t * 13) % 360) / 360 * Math.PI * 2;
        const b = ((t * 29) % 360) / 360 * Math.PI;
        voxels.push({
          x: x - (VOX - 1) / 2, y: y - (VOX - 1) / 2, z: z - (VOX - 1) / 2,
          grass: y === VOX - 1,
          dir: [Math.cos(a) * (0.5 + 0.5 * Math.sin(b)), Math.cos(b) * 0.7, Math.sin(a) * (0.5 + 0.5 * Math.sin(b))],
          seed: ((t * 37) % 100) / 100
        });
      }
    }
  }

  const FACES = [
    { n: [0, 1, 0], v: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], shade: 1.00 },
    { n: [0, -1, 0], v: [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]], shade: 0.42 },
    { n: [1, 0, 0], v: [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]], shade: 0.78 },
    { n: [-1, 0, 0], v: [[0, 0, 1], [0, 0, 0], [0, 1, 0], [0, 1, 1]], shade: 0.62 },
    { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.70 },
    { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.55 }
  ];
  const GRASS = [[124, 227, 176], [104, 205, 156], [92, 190, 143]];
  const DIRT = [[138, 96, 63], [122, 84, 54], [150, 106, 70]];
  const SPARKS = Array.from({ length: 90 }, () => {
    const a = Math.random() * Math.PI * 2;
    const b = Math.random() * Math.PI;
    return {
      d: [Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b)],
      v: 0.55 + Math.random() * 1.5,
      s: Math.random() * 0.9 + 0.4,
      c: Math.random() < 0.65 ? '124,227,176' : '255,214,160'
    };
  });

  let W = 0, H = 0, DPR = 1, pSmooth = 0, layout = null;

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => t * t * (3 - 2 * t);

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildLayout();
  }

  function buildLayout() {
    const fs = clamp(Math.round(W / 34), 12, 24);
    const n = Math.max(NAMES.length, 1);
    const items = NAMES.map((name, i) => {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.42;
      return {
        name,
        ang: a,
        up: 0.28 + ((i * 37) % 100) / 100 * 0.85,   // 每个名字飞出的时机略有差异
        spin: (((i * 53) % 100) / 100 - 0.5) * 0.6
      };
    });
    layout = { fs, items, halfW: Math.min(W, H) * 0.62, halfH: Math.min(W, H) * 0.5 };
  }

  function rotPoint([x, y, z], yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x1 = x * cy - z * sy;
    const z1 = x * sy + z * cy;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
  }

  function project([x, y, z], scale, cx, cy) {
    const f = 6.2;
    const k = f / (f + z * 0.55);
    return [cx + x * scale * k, cy - y * scale * k, k];
  }

  function draw(p) {
    ctx.clearRect(0, 0, W, H);
    const enter = ease(seg(p, 0, 0.18));
    const split = ease(seg(p, 0.3, 0.52));     // 裂开
    const textT = seg(p, 0.40, 0.95);          // 类名穿越（一直飞到爆炸）
    const burst = seg(p, 0.8, 0.94);           // 爆炸
    const gone = seg(p, 0.92, 0.99);

    const yaw = -0.5 + ease(p) * 4.4;
    const pitch = 0.42 + Math.sin(p * Math.PI) * 0.34;
    const scale = Math.min(W, H) * (0.062 + 0.03 * enter) * (1 - 0.32 * split);
    const cx = W / 2;
    const cy = H * 0.5 + (1 - enter) * Math.min(H * 0.30, 220) - split * H * 0.02;

    // 爆炸冲击：整体闪白
    if (burst > 0) {
      const a = burst * (1 - gone) * 0.55;
      ctx.fillStyle = `rgba(190,255,225,${a * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (gone >= 0.999) return;

    const polys = [];
    for (const v of voxels) {
      const s = (0.5 - 0.16 * split) * (1 - 0.45 * textT) * (1 - 0.5 * burst);
      const push = split * (1 - burst * 0.2) + textT * 1.5;
      const blast = burst * v.seed;
      const px = v.x + v.dir[0] * push * 3.0 + v.dir[0] * blast * 6;
      const py = v.y + v.dir[1] * push * 2.4 + v.dir[1] * blast * 5;
      const pz = v.z + v.dir[2] * push * 3.0 + v.dir[2] * blast * 6;
      const palette = v.grass ? GRASS : DIRT;
      const base = palette[Math.floor(v.seed * palette.length) % palette.length];
      for (const f of FACES) {
        const nr = rotPoint(f.n, yaw, pitch);
        if (nr[2] > 0.02) continue;
        const pts = [];
        let zsum = 0;
        for (const c of f.v) {
          const local = [px + (c[0] - 0.5) * s * 2, py + (c[1] - 0.5) * s * 2, pz + (c[2] - 0.5) * s * 2];
          const r = rotPoint(local, yaw, pitch);
          const pr = project(r, scale, cx, cy);
          pts.push(pr); zsum += r[2];
        }
        const sh = f.shade * (0.82 + 0.32 * (1 - split * 0.5));
        polys.push({
          z: zsum / 4, pts,
          color: `rgb(${Math.round(base[0] * sh)},${Math.round(base[1] * sh)},${Math.round(base[2] * sh)})`,
          alpha: (1 - 0.88 * clamp(textT * 1.7)) * (1 - burst)
        });
      }
    }
    polys.sort((a, b) => b.z - a.z);
    for (const poly of polys) {
      if (poly.alpha <= 0.02) continue;
      ctx.globalAlpha = poly.alpha;
      ctx.beginPath();
      ctx.moveTo(poly.pts[0][0], poly.pts[0][1]);
      for (let i = 1; i < poly.pts.length; i++) ctx.lineTo(poly.pts[i][0], poly.pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = poly.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 爆炸火花
    if (burst > 0 && burst < 1) {
      const r = Math.min(W, H) * 0.5 * burst;
      for (const sp of SPARKS) {
        const d = sp.v * r * 1.5;
        const x = cx + sp.d[0] * d;
        const y = cy - sp.d[1] * d;
        ctx.globalAlpha = (1 - burst) * 0.9;
        ctx.fillStyle = `rgba(${sp.c},0.95)`;
        const sz = sp.s * (1 - burst * 0.5) * 3;
        ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
    }

    // 类名：从方块里喷出，向镜头飞过，带拉伸与残影
    if (textT > 0.002 && burst < 0.999) {
      const { fs, items, halfW, halfH } = layout;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const it of items) {
        let t = (textT - 0.16 * it.up) / 0.84;
        if (t <= 0) continue;
        t = Math.min(t, 1.6);
        const r = 0.05 + Math.pow(t, 1.72) * 2.15;
        const ang = it.ang + it.spin * 0.4 + t * 0.55;
        const rad = fs * (0.5 + r * 1.9);
        const x = cx + Math.cos(ang) * halfW * r;
        const y = cy + Math.sin(ang) * halfH * r;
        const fadeIn = clamp(t * 6);
        const fadeOut = 1 - clamp((r - 1.05) / 0.55);
        const a = fadeIn * fadeOut * (1 - seg(burst, 0, 0.45));
        if (a <= 0.01) continue;
        ctx.save();
        ctx.translate(x, y);
        const sy = 1 + r * 0.55;
        ctx.scale(rad / fs, (rad / fs) * sy);
        // 残影：同色略淡，沿径向靠前一点
        for (let g = 2; g >= 1; g--) {
          ctx.globalAlpha = a * (0.1 * (3 - g)) ;
          ctx.fillStyle = 'rgba(124,227,176,0.9)';
          ctx.fillText(it.name, 0, g * 2.2);
        }
        ctx.globalAlpha = a * 0.95;
        ctx.fillStyle = 'rgba(206,255,232,0.96)';
        ctx.fillText(it.name, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'start';
    }

    // 开场文案
    const cap = 1 - seg(p, 0.04, 0.16);
    if (cap > 0.01) {
      const fs = clamp(W / 52, 13, 20);
      ctx.globalAlpha = cap * 0.92;
      ctx.fillStyle = 'rgba(233,243,236,0.95)';
      ctx.font = `600 ${fs}px "Segoe UI Variable Display","Segoe UI","Microsoft YaHei UI",system-ui,sans-serif`;
      ctx.textBaseline = 'alphabetic';
      const x = Math.max(26, W * 0.045);
      const y = H - Math.max(46, H * 0.09);
      ctx.fillText('一个草方块，拆成一座索引', x, y);
      ctx.globalAlpha = cap * 0.75;
      ctx.fillStyle = 'rgba(124,227,176,0.9)';
      ctx.fillText('↑', x, y - fs * 1.9);
      ctx.globalAlpha = 1;
    }
  }

  const hint = stage.querySelector('.atlas-hint');
  let raf = 0;
  function frame() {
    const rect = stage.getBoundingClientRect();
    const span = Math.max(stage.offsetHeight - window.innerHeight, 1);
    const raw = clamp(-rect.top / span);
    const forced = parseFloat((location.hash.match(/p=([\d.]+)/) || [])[1]);
    const target = Number.isFinite(forced) ? clamp(forced) : raw;
    pSmooth += (target - pSmooth) * (reduce || Number.isFinite(forced) ? 1 : 0.14);
    draw(reduce ? 0.75 : pSmooth);
    if (hint) hint.style.opacity = pSmooth > 0.03 || reduce ? '0' : '1';
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  frame();

  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) frame();
  });
})();
