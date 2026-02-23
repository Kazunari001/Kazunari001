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

if (!inputPath) {
  throw new Error(`Input SVG not found. Checked: ${candidates.join(', ')}`);
}

const src = fs.readFileSync(inputPath, 'utf8');

const defs = [
  '<defs>',
  '  <style>',
  '    .season-label { font: 700 20px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif; fill: #ffffff; }',
  '    .season-sub { font: 600 13px "Segoe UI", "Noto Sans", sans-serif; fill: #e6edf3; }',
  '  </style>',
  '</defs>',
  `<g transform="translate(16,34)"><rect x="0" y="-18" width="300" height="44" rx="10" fill="#0d1117" opacity="0.80"/><text x="14" y="2" class="season-label">${emoji} ${emoji} ${emoji}</text><text x="14" y="18" class="season-sub">${label}</text></g>`
].join('');

const out = src.includes('</svg>') ? src.replace('</svg>', `${defs}</svg>`) : src + defs;
fs.writeFileSync(outputPath, out, 'utf8');
