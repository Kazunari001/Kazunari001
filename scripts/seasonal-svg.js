const fs = require('fs');

const emoji = process.argv[2] || '\u2744\uFE0F';
const label = process.argv[3] || 'Season';
const candidates = [
  'profile-3d-contrib/profile-season-animate.svg',
  'profile-3d-contrib/profile-night-rainbow.svg',
  'profile-3d-contrib/profile-green-animate.svg'
];
const output3dPath = 'profile-3d-contrib/profile-seasonal-emoji.svg';
const output2dPath = 'profile-3d-contrib/profile-seasonal-2d.svg';
const inputPath = candidates.find((p) => fs.existsSync(p));
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

if (!inputPath) {
  throw new Error(`Input SVG not found. Checked: ${candidates.join(', ')}`);
}

function parseDateRange(svg) {
  const m = svg.match(/(\d{4}-\d{2}-\d{2})\s*\/\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) {
    return null;
  }
  const start = new Date(`${m[1]}T00:00:00Z`);
  const end = new Date(`${m[2]}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }
  return { start, end, text: `${m[1]} / ${m[2]}` };
}

function addMonthsUtc(date, count) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}

function buildMonthTicks(range, weekCount) {
  if (!range || weekCount < 2) {
    return monthNames.map((name, i) => ({ name, weekIndex: Math.round(((weekCount - 1) * i) / 11) }));
  }

  const ticks = [{ name: monthNames[range.start.getUTCMonth()], weekIndex: 0 }];
  let cursor = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth(), 1));
  if (cursor < range.start) {
    cursor = addMonthsUtc(cursor, 1);
  }

  while (cursor <= range.end) {
    const days = Math.floor((cursor.getTime() - range.start.getTime()) / 86400000);
    const weekIndex = Math.max(0, Math.min(weekCount - 1, Math.floor(days / 7)));
    const prev = ticks[ticks.length - 1];
    if (weekIndex > prev.weekIndex) {
      ticks.push({ name: monthNames[cursor.getUTCMonth()], weekIndex });
    }
    cursor = addMonthsUtc(cursor, 1);
  }

  return ticks;
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extract3dCells(svg) {
  const re = /<g transform="translate\(([\d.]+)\s+([\d.]+)\)">[\s\S]{0,340}?class="cont-top(?:-p\d+)?-(\d+)"/g;
  const cells = [];
  let m;
  while ((m = re.exec(svg)) !== null) {
    cells.push({
      index: cells.length,
      x: Number(m[1]),
      y: Number(m[2]),
      level: Number(m[3])
    });
  }
  return cells;
}

function render2dHeatmap(src) {
  const cells = extract3dCells(src);
  if (cells.length === 0) {
    throw new Error('No 3D cells found in source SVG.');
  }

  const range = parseDateRange(src);
  const rows = 7;
  const grid = new Map();
  let cols = 0;

  if (range) {
    const dayMs = 86400000;
    const totalDays = Math.floor((range.end.getTime() - range.start.getTime()) / dayMs) + 1;
    if (cells.length === totalDays) {
      const startDay = range.start.getUTCDay();
      cols = Math.floor((startDay + totalDays - 1) / 7) + 1;
      for (let i = 0; i < totalDays; i += 1) {
        const date = new Date(range.start.getTime() + i * dayMs);
        const x = Math.floor((startDay + i) / 7);
        const y = date.getUTCDay();
        grid.set(`${x},${y}`, Math.max(0, Math.min(4, cells[i].level)));
      }
    }
  }

  if (cols === 0) {
    const xs = Array.from(new Set(cells.map((c) => Math.round(c.x)))).sort((a, b) => a - b);
    const byX = new Map();
    for (const c of cells) {
      const x = Math.round(c.x);
      if (!byX.has(x)) {
        byX.set(x, []);
      }
      byX.get(x).push(c);
    }
    cols = xs.length;
    for (let ix = 0; ix < xs.length; ix += 1) {
      const x = xs[ix];
      const col = (byX.get(x) || []).slice().sort((a, b) => a.y - b.y).slice(0, rows);
      for (let iy = 0; iy < col.length; iy += 1) {
        grid.set(`${ix},${iy}`, Math.max(0, Math.min(4, col[iy].level)));
      }
    }
  }

  const cell = 14;
  const gap = 4;
  const left = 58;
  const top = 52;
  const gridWidth = cols * (cell + gap) - gap;
  const gridHeight = rows * (cell + gap) - gap;
  const width = left + gridWidth + 40;
  const height = top + gridHeight + 58;
  const palette = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
  const monthTicks = buildMonthTicks(range, cols);

  const rects = [];
  for (let x = 0; x < cols; x += 1) {
    for (let y = 0; y < rows; y += 1) {
      const level = Math.max(0, Math.min(4, grid.get(`${x},${y}`) || 0));
      const px = left + x * (cell + gap);
      const py = top + y * (cell + gap);
      rects.push(`<rect x="${px}" y="${py}" width="${cell}" height="${cell}" rx="2" fill="${palette[level]}" />`);
    }
  }

  const months = monthTicks
    .map((t) => {
      const x = left + t.weekIndex * (cell + gap);
      const y = top - 10;
      return `<text x="${x}" y="${y}" class="month">${t.name}</text>`;
    })
    .join('');
  const weekdays = [
    `<text x="${left - 36}" y="${top + cell - 2}" class="sub">Sun</text>`,
    `<text x="${left - 36}" y="${top + (cell + gap) * 2 + cell - 2}" class="sub">Tue</text>`,
    `<text x="${left - 36}" y="${top + (cell + gap) * 4 + cell - 2}" class="sub">Thu</text>`,
    `<text x="${left - 36}" y="${top + (cell + gap) * 6 + cell - 2}" class="sub">Sat</text>`
  ].join('');

  const period = range ? range.text : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<style>',
    '  .title { font: 700 16px "Segoe UI", "Noto Sans", sans-serif; fill: #24292f; }',
    '  .sub { font: 600 11px "Segoe UI", "Noto Sans", sans-serif; fill: #57606a; }',
    '  .month { font: 600 10px "Segoe UI", "Noto Sans", sans-serif; fill: #57606a; }',
    '</style>',
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />`,
    `<text x="${left}" y="20" class="title">${escapeXml(emoji)} ${escapeXml(label)} 2D</text>`,
    period ? `<text x="${left}" y="34" class="sub">${escapeXml(period)}</text>` : '',
    weekdays,
    ...rects,
    months,
    '</svg>'
  ].join('');
}

function render3dWithBadge(src) {
  const clean = src
    .replace(/<g id="month-axis-labels">[\s\S]*?<\/g>/g, '')
    .replace(/<g id="month-labels">[\s\S]*?<\/g>/g, '');
  const overlay = [
    '<defs>',
    '  <style>',
    '    .season-label { font: 700 20px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif; fill: #ffffff; }',
    '    .season-sub { font: 600 13px "Segoe UI", "Noto Sans", sans-serif; fill: #e6edf3; }',
    '  </style>',
    '</defs>',
    `<g transform="translate(16,34)"><rect x="0" y="-18" width="300" height="44" rx="10" fill="#0d1117" opacity="0.80"/><text x="14" y="2" class="season-label">${escapeXml(emoji)} ${escapeXml(emoji)} ${escapeXml(emoji)}</text><text x="14" y="18" class="season-sub">${escapeXml(label)}</text></g>`
  ].join('');
  return clean.includes('</svg>') ? clean.replace('</svg>', `${overlay}</svg>`) : clean + overlay;
}

const src = fs.readFileSync(inputPath, 'utf8');
fs.writeFileSync(output3dPath, render3dWithBadge(src), 'utf8');
fs.writeFileSync(output2dPath, render2dHeatmap(src), 'utf8');
