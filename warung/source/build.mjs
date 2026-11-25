import * as esbuild from 'esbuild';
import fs from 'fs';

const r = await esbuild.build({
  entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: ['safari15', 'chrome90', 'firefox90'],
  write: false, legalComments: 'none', logLevel: 'warning',
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync('src/index.html', 'utf8').replace('<!--SCRIPT-->', () => `<script>${js}</script>`);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
