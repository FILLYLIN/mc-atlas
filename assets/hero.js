/* mc·atlas 首页：草方块 → 类名
 * 滚动驱动：方块升入画面 → 旋转 → 裂成小方块 → 散开并浮出真实类名。
 * 纯 canvas 2D + 手写透视投影，不依赖任何外部库，file:// 直接可用。 */
(() => {
  const stage = document.querySelector('.atlas-stage');
  const canvas = document.getElementById('atlas-canvas');
  if (!stage || !canvas) return;
  const ctx = canvas.getContext('2d');
  const NAMES = (window.MC_ATLAS_HERO_NAMES || []).slice(0, 30);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lead = null;

  const VOX = 4;                       // 4×4×4 的小方块
  const voxels = [];
  for (let x = 0; x < VOX; x++) {
    for (let y = 0; y < VOX; y++) {
      for (let z = 0; z < VOX; z++) {
        const t = x * 31 + y * 17 + z * 43 + 7;
        const a = ((t * 13) % 360) / 360 * Math.PI * 2;
        const b = ((t * 29) % 360) / 360 * Math.PI;
        voxels.push({
          x: x - (VOX - 1) / 2,
          y: y - (VOX - 1) / 2,
          z: z - (VOX - 1) / 2,
          grass: y === VOX - 1,
          dir: [Math.cos(a) * (0.5 + 0.5 * Math.sin(b)), Math.cos(b) * 0.7, Math.sin(a) * (0.5 + 0.5 * Math.sin(b))],
          seed: ((t * 37) % 100) / 100
        });
      }
    }
  }

  const FACES = [
    { n: [0, 1, 0], v: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], shade: 1.00 }, // 上
    { n: [0, -1, 0], v: [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]], shade: 0.42 }, // 下
    { n: [1, 0, 0], v: [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]], shade: 0.78 },
    { n: [-1, 0, 0], v: [[0, 0, 1], [0, 0, 0], [0, 1, 0], [0, 1, 1]], shade: 0.62 },
    { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.70 },
    { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.55 }
  ];

  const GRASS = [[124, 227, 176], [104, 205, 156], [92, 190, 143]];
  const DIRT = [[138, 96, 63], [122, 84, 54], [150, 106, 70]];

  let W = 0, H = 0, DPR = 1;
  let pSmooth = 0;
  let layout = null;

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
    const cols = W < 720 ? 2 : 3;
    const rows = Math.min(Math.ceil(NAMES.length / cols), 10);
    const fs = clamp(Math.round(W / (cols * 13)), 11, 20);
    const colW = Math.min(W * 0.78 / cols, 340);
    layout = { cols, rows, fs, colW, totalW: colW * cols, x0: W / 2 - (colW * cols) / 2, y0: H / 2 - (rows * fs * 2.1) / 2 };
  }

  function rotPoint([x, y, z], yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x1 = x * cy - z * sy;
    const z1 = x * sy + z * cy;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const y1 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    return [x1, y1, z2];
  }

  function project([x, y, z], scale, cx, cy) {
    const f = 6.2;
    const k = f / (f + z * 0.55);
    return [cx + x * scale * k, cy - y * scale * k, k];
  }

  function draw(p) {
    ctx.clearRect(0, 0, W, H);
    const enter = ease(seg(p, 0, 0.2));
    const explode = ease(seg(p, 0.42, 0.78));
    const textA = ease(seg(p, 0.58, 0.86));

    const yaw = -0.5 + ease(p) * 4.2;
    const pitch = 0.42 + Math.sin(p * Math.PI) * 0.34;

    const scale = Math.min(W, H) * (0.062 + 0.03 * enter) * (1 - 0.35 * explode);
    const cx = W / 2;
    const cy = H * 0.5 + (1 - enter) * Math.min(H * 0.30, 220) - explode * H * 0.04;

    const polys = [];
    for (const v of voxels) {
      const s = (0.5 - 0.18 * explode) * (1 - 0.55 * textA);
      const push = explode * (1 - textA * 0.85);
      const px = v.x + v.dir[0] * push * 3.2 + v.seed * 0.2;
      const py = v.y + v.dir[1] * push * 2.6;
      const pz = v.z + v.dir[2] * push * 3.2;
      const palette = v.grass ? GRASS : DIRT;
      const base = palette[Math.floor(v.seed * palette.length) % palette.length];

      for (const f of FACES) {
        const nr = rotPoint(f.n, yaw, pitch);
        if (nr[2] > 0.02) continue; // 背面剔除（相机在 -z 方向）
        const pts = [];
        let zsum = 0;
        for (const c of f.v) {
          const local = [px + (c[0] - 0.5) * s * 2, py + (c[1] - 0.5) * s * 2, pz + (c[2] - 0.5) * s * 2];
          const r = rotPoint(local, yaw, pitch);
          const pr = project(r, scale, cx, cy);
          pts.push(pr);
          zsum += r[2];
        }
        const sh = f.shade * (0.82 + 0.32 * (1 - explode * 0.5));
        polys.push({
          z: zsum / 4,
          pts,
          color: `rgb(${Math.round(base[0] * sh)},${Math.round(base[1] * sh)},${Math.round(base[2] * sh)})`,
          alpha: 1 - 0.94 * textA
        });
      }
    }

    polys.sort((a, b) => b.z - a.z); // 远 → 近，先画远的
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

    // 类名
    if (textA > 0.01 && layout) {
      const { cols, rows, fs, colW, x0, y0 } = layout;
      ctx.font = `500 ${fs}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textBaseline = 'middle';
      for (let i = 0; i < Math.min(NAMES.length, cols * rows); i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const stagger = clamp((textA - r * 0.035 - c * 0.02) * 2.2);
        if (stagger <= 0.01) continue;
        const x = x0 + c * colW + (1 - stagger) * 14;
        const y = y0 + r * fs * 2.1;
        ctx.globalAlpha = stagger * 0.9;
        ctx.fillStyle = 'rgba(124,227,176,0.95)';
        ctx.fillText(NAMES[i], x, y);
        ctx.globalAlpha = stagger * 0.35;
        ctx.fillStyle = 'rgba(160,255,220,0.7)';
        ctx.fillRect(x - 10, y - 1, 4, 2);
      }
      ctx.globalAlpha = 1;
    }

    const cap = 1 - seg(p, 0.03, 0.2);
    if (cap > 0.01) {
      const fs = clamp(W / 52, 13, 20);
      ctx.globalAlpha = cap * 0.92;
      ctx.fillStyle = 'rgba(233,243,236,0.95)';
      ctx.font = `600 ${fs}px ` + '"Segoe UI Variable Display","Segoe UI","Microsoft YaHei UI",system-ui,sans-serif';
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

  const textA = () => ease(seg(pSmooth, 0.58, 0.86));

  let raf = 0;
  function frame() {
    const rect = stage.getBoundingClientRect();
    const span = Math.max(stage.offsetHeight - window.innerHeight, 1);
    const raw = clamp(-rect.top / span);
    const forced = parseFloat((location.hash.match(/p=([\d.]+)/) || [])[1]);
    const target = Number.isFinite(forced) ? clamp(forced) : raw;
    pSmooth += (target - pSmooth) * (reduce || Number.isFinite(forced) ? 1 : 0.14);
    draw(reduce ? 0.92 : pSmooth);
    stage.classList.toggle('done', target > 0.04);
    if (lead) lead.style.opacity = '0';
    stage.classList.toggle('texted', textA() > 0.55);
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  frame();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { cancelAnimationFrame(raf); frame(); }
  });
})();
