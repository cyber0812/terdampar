import fs from 'fs'; import path from 'path'; import {createRequire} from 'module'; import {execSync} from 'child_process';
const require=createRequire(import.meta.url); const esbuild=require('esbuild'); const root=path.resolve(import.meta.dirname,'..'), D=root+'/dist/Terdampar';
fs.rmSync(root+'/dist',{recursive:true,force:true}); fs.mkdirSync(D+'/public',{recursive:true});
const alias={'three/addons':root+'/node_modules/three/examples/jsm','three':root+'/node_modules/three/build/three.module.js'};
await esbuild.build({entryPoints:[root+'/client/main.js'],bundle:true,format:'esm',outfile:D+'/public/game.js',minify:true,target:'es2022',alias,logLevel:'warning'});
await esbuild.build({entryPoints:[root+'/server/index.js'],bundle:true,platform:'node',format:'cjs',outfile:D+'/server.cjs',minify:false,external:['bufferutil','utf-8-validate'],logLevel:'error',define:{'import.meta.url':'""'}});
for(const f of ['index.html','style.css'])fs.copyFileSync(root+'/public/'+f,D+'/public/'+f);
fs.cpSync(root+'/public/world',D+'/public/world',{recursive:true}); fs.cpSync(root+'/public/assets',D+'/public/assets',{recursive:true});
const keep=new Set(['stone_fire_pit.glb','wooden_crate_01.glb','wooden_barrels_01.glb','treasure_chest.glb','dutch_ship_medium.glb']); for(const f of fs.readdirSync(D+'/public/assets/props'))if(!keep.has(f))fs.rmSync(D+'/public/assets/props/'+f);
for(const f of ['rock2.jpg','rock2_n.jpg'])fs.rmSync(D+'/public/assets/tex/'+f,{force:true});
fs.mkdirSync(D+'/source',{recursive:true}); for(const d of ['client','server','shared','tools'])fs.cpSync(root+'/'+d,D+'/source/'+d,{recursive:true,filter:s=>!/preview|lookdev/.test(s)});
fs.writeFileSync(D+'/Mulai-Windows.bat','@echo off\r\ntitle Terdampar Server\r\ncd /d "%~dp0"\r\nwhere node >nul 2>nul\r\nif errorlevel 1 (\r\n  echo Node.js belum terpasang. Download dari https://nodejs.org lalu jalankan lagi.\r\n  pause\r\n  exit /b\r\n)\r\nstart "" /b cmd /c "timeout /t 2 >nul & start http://localhost:3000"\r\nnode server.cjs\r\npause\r\n');
fs.writeFileSync(D+'/Mulai-Mac.command','#!/bin/bash\ncd "$(dirname "$0")"\nif ! command -v node >/dev/null; then echo "Node.js belum terpasang. Download dari https://nodejs.org"; read; exit 1; fi\n(sleep 1; open http://localhost:3000) &\nnode server.cjs\n',{mode:0o755});
fs.writeFileSync(D+'/Mulai-Linux.sh','#!/bin/bash\ncd "$(dirname "$0")"\nnode server.cjs\n',{mode:0o755});
fs.writeFileSync(D+'/BACA-DULU.txt',`TERDAMPAR - game survival 3D multiplayer

CARA JALANIN
1. Pasang Node.js (versi 18 ke atas) dari https://nodejs.org
2. Windows: klik dua kali Mulai-Windows.bat
   Mac: klik dua kali Mulai-Mac.command (kalau diblokir: klik kanan > Open)
3. Browser kebuka di http://localhost:3000. Klik Buat Room Baru.
4. Di jendela server ada alamat http://192.168.x.x:3000.
   HP atau teman yang satu WiFi buka alamat itu, masukin KODE room, klik Gabung.
   Kalau Windows nanya firewall, klik Allow.

MAIN SAMA TEMAN BEDA JARINGAN
Server jalan di laptop kamu, jadi teman di luar WiFi butuh tunnel. Paling gampang:
- Tailscale: pasang di laptop dan di device teman, lalu buka alamat Tailscale laptop + :3000
- ngrok: jalankan "ngrok http 3000", bagikan link https-nya

KONTROL PC
WASD gerak, Shift lari, Spasi lompat, Ctrl jongkok, E interaksi, Klik kiri pukul/tebang/nambang (tahan buat tarik busur),
V ganti kamera first/third person, Tab tas, C craft, B bangun, M peta, J misi, 1-7 pilih item, G letakkan muatan, R putar bangunan,
X bongkar (pegang palu), H klakson, Enter chat, Esc menu.

ALUR GAME
Pungut ranting, batu, serat > craft tali > kapak dan beliung batu > api unggun > rumah > meja kerja dan tungku >
tambang bijih besi di gunung > bengkel dan mobil > cari 6 bagian pesawat (lihat Peta) > angkut pakai mobil >
pasang di bangkai pesawat > isi 3 jerigen bensin > semua naik > terbang.

PROGRESS
Tersimpan otomatis di folder saves. Room yang sama bisa dibuka lagi pakai kode yang sama.
Jangan pindah browser kalau mau tas dan posisi kamu tetap, karena identitas pemain tersimpan di browser.

GRAFIK
Pilih Rendah/Sedang/Tinggi di layar awal atau menu Esc. Game otomatis menurunkan resolusi kalau FPS jatuh.
`.replace(/\n/g,'\r\n'));
fs.writeFileSync(D+'/CREDITS.txt',`Aset 3D dan tekstur (CC0, domain publik):
- Quaternius (quaternius.com): Universal Base Characters, Modular Character Outfits, Universal Animation Library 1 dan 2, Stylized Nature MegaKit, Ultimate Animated Animal Pack
- Poly Haven (polyhaven.com): tekstur tanah, kayu, batu, dan beberapa properti
Kalau suka, dukung Quaternius di patreon.com/quaternius.

Font: Nunito (SIL Open Font License, lihat public/assets/fonts/OFL.txt)
Kode pihak ketiga: three.js (MIT), ws (MIT)
Rumah, mobil, pesawat, pohon kelapa, efek, dan suara dibuat lewat kode khusus untuk game ini.
`.replace(/\n/g,'\r\n'));
execSync(`cd ${root}/dist && zip -q -r -9 Terdampar.zip Terdampar`); console.log('zip MB',(fs.statSync(root+'/dist/Terdampar.zip').size/1e6).toFixed(1));
