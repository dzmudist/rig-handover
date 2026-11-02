// Saves /digest/<night> as one self-contained HTML file. Usage: tsx scripts/save-preview.tsx <night> <out.html>
// The banner shows LANE_MARKER from the environment; unset it for the clean copy (ADR 0003).
import { writeFileSync } from 'node:fs';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const [night, out] = process.argv.slice(2);
if (!night || !out) {
  console.error('usage: tsx scripts/save-preview.tsx <night> <out.html>');
  process.exit(2);
}
const res = await createApp(loadConfig()).request(`/digest/${night}`);
if (res.status !== 200) {
  console.error(`/digest/${night} answered ${res.status}`);
  process.exit(1);
}
writeFileSync(out, await res.text());
console.log(`saved ${out}`);
