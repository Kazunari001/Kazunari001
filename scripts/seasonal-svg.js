const fs = require('fs');
const path = require('path');

const emoji = process.argv[2] || '\u2744\uFE0F';
const label = process.argv[3] || 'Season';
const candidates = [
  'profile-3d-contrib/profile-season-animate.svg',
  'profile-3d-contrib/profile-night-rainbow.svg',
  'profile-3d-contrib/profile-green-animate.svg'
];
const outputPath = 'profile-3d-contrib/profile-seasonal-emoji.svg';
const inputPath = candidates.find((p) => fs.existsSync(p));
const targetDir = 'profile-3d-contrib';
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getSvgSize(svg) {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const widthMatch = svg.match(/width="([\d.]+)"/i);
  const heightMatch = svg.match(/height="([\d.]+)"/i);
  return {
    width: widthMatch ? Number(widthMatch[1]) : 1000,
    height: heightMatch ? Number(heightMatch[1]) : 200
  };
}

function buildMonthAxis(svg, id) {
  const points = [];
  const transformRegex = /<g transform="translate\(([\d.]+)\s+([\d.]+)\)">[\s\S]{0,280}?class="cont-top-p\d+-\d+"/g;
  let match;
  while ((match = transformRegex.exec(svg)) !== null) {
    points.push({ x: Number(match[1]), y: Number(match[2]) });
  }

  if (points.length < 30) {
    const { width, height } = getSvgSize(svg);
    const y = Math.max(14, height - 8);
    const startX = 35;
    const endX = Math.max(startX + 11, width - 35);
    const step = (endX - startX) / 11;
    const labels = monthLabels
      .map((m, i) => `<text x="${(startX + step * i).toFixed(1)}" y="${y.toFixed(1)}" class="month-label">${m}</text>`)
      .join('');
    return `<g id="${id}">${labels}</g>`;
  }

  const bottomByX = new Map();
  for (const p of points) {
    const k = Math.round(p.x);
    const prev = bottomByX.get(k);
    if (prev === undefined || p.y > prev) {
      bottomByX.set(k, p.y);
    }
  }

  const xs = Array.from(bottomByX.keys()).sort((a, b) => a - b);
  if (xs.length < 2) {
    return '';
  }

  const startX = xs[0] + 9;
  const endX = xs[xs.length - 1] + 9;
  const startY = bottomByX.get(xs[0]) + 22;
  const endY = bottomByX.get(xs[xs.length - 1]) + 22;
  const labels = monthLabels
    .map((m, i) => {
      const t = i / 11;
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="month-label">${m}</text>`;
    })
    .join('');

  return `<g id="${id}"><line x1="${startX.toFixed(1)}" y1="${startY.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" class="month-axis-line" />${labels}</g>`;
}

function stripOldMonthAxis(svg) {
  return svg
    .replace(/<g id="month-axis-labels">[\s\S]*?<\/g>/g, '')
    .replace(/<g id="month-labels">[\s\S]*?<\/g>/g, '');
}

function injectMonthAxis(svg) {
  if (!svg.includes('</svg>')) {
    return svg;
  }

  const styleLine = '.month-label { font: 700 10px "Segoe UI", "Noto Sans", sans-serif; fill: #8b949e; text-anchor: middle; dominant-baseline: middle; } .month-axis-line { stroke: #6e7681; stroke-width: 1.2px; stroke-dasharray: 4 3; opacity: 0.8; }';
  let out = stripOldMonthAxis(svg);

  if (out.includes('<defs>')) {
    out = out.replace('<defs>', `<defs><style>${styleLine}</style>`);
  } else {
    out = out.replace(/<svg([^>]*)>/i, `<svg$1><defs><style>${styleLine}</style></defs>`);
  }

  return out.replace('</svg>', `${buildMonthAxis(out, 'month-axis-labels')}</svg>`);
}

if (!inputPath) {
  throw new Error(`Input SVG not found. Checked: ${candidates.join(', ')}`);
}

const src = fs.readFileSync(inputPath, 'utf8');
const defs = [
  '<defs>',
  '  <style>',
  '    .season-label { font: 700 20px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif; fill: #ffffff; }',
  '    .season-sub { font: 600 13px "Segoe UI", "Noto Sans", sans-serif; fill: #e6edf3; }',
  '    .month-label { font: 700 10px "Segoe UI", "Noto Sans", sans-serif; fill: #8b949e; text-anchor: middle; dominant-baseline: middle; }',
  '    .month-axis-line { stroke: #6e7681; stroke-width: 1.2px; stroke-dasharray: 4 3; opacity: 0.8; }',
  '  </style>',
  '</defs>',
  `<g transform="translate(16,34)"><rect x="0" y="-18" width="300" height="44" rx="10" fill="#0d1117" opacity="0.80"/><text x="14" y="2" class="season-label">${emoji} ${emoji} ${emoji}</text><text x="14" y="18" class="season-sub">${label}</text></g>`,
  buildMonthAxis(src, 'month-axis-labels')
].join('');

const out = src.includes('</svg>') ? src.replace('</svg>', `${defs}</svg>`) : src + defs;
fs.writeFileSync(outputPath, out, 'utf8');

if (fs.existsSync(targetDir)) {
  const graphFiles = fs.readdirSync(targetDir)
    .filter((name) => name.endsWith('.svg') && name.startsWith('profile-'))
    .map((name) => path.join(targetDir, name));

  for (const filePath of graphFiles) {
    const original = fs.readFileSync(filePath, 'utf8');
    const withAxis = injectMonthAxis(original);
    if (withAxis !== original) {
      fs.writeFileSync(filePath, withAxis, 'utf8');
    }
  }
}
