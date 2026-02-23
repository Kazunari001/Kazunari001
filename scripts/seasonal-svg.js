const fs = require('fs');

const emoji = process.argv[2] || '❄️';
const label = process.argv[3] || 'Season';
const candidates = [
  'profile-3d-contrib/profile-season-animate.svg',
  'profile-3d-contrib/profile-night-rainbow.svg',
  'profile-3d-contrib/profile-green-animate.svg'
];
const outputPath = 'profile-3d-contrib/profile-seasonal-emoji.svg';
const inputPath = candidates.find((p) => fs.existsSync(p));
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

if (!inputPath) {
  throw new Error(`Input SVG not found. Checked: ${candidates.join(', ')}`);
}

const src = fs.readFileSync(inputPath, 'utf8');
const { width, height } = getSvgSize(src);
const monthY = Math.max(14, height - 8);
const monthStartX = 35;
const monthEndX = Math.max(monthStartX + 11, width - 35);
const monthStep = (monthEndX - monthStartX) / 11;
const months = monthLabels
  .map((m, i) => `<text x="${(monthStartX + monthStep * i).toFixed(1)}" y="${monthY.toFixed(1)}" class="month-label">${m}</text>`)
  .join('');

const defs = [
  '<defs>',
  '  <style>',
  '    .season-label { font: 700 20px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif; fill: #ffffff; }',
  '    .season-sub { font: 600 13px "Segoe UI", "Noto Sans", sans-serif; fill: #e6edf3; }',
  '    .month-label { font: 600 10px "Segoe UI", "Noto Sans", sans-serif; fill: #8b949e; text-anchor: middle; }',
  '  </style>',
  '</defs>',
  `<g transform="translate(16,34)"><rect x="0" y="-18" width="300" height="44" rx="10" fill="#0d1117" opacity="0.80"/><text x="14" y="2" class="season-label">${emoji} ${emoji} ${emoji}</text><text x="14" y="18" class="season-sub">${label}</text></g>`,
  `<g id="month-labels">${months}</g>`
].join('');

const out = src.includes('</svg>') ? src.replace('</svg>', `${defs}</svg>`) : src + defs;
fs.writeFileSync(outputPath, out, 'utf8');
