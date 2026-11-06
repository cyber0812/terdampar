import fs from 'fs'; import path from 'path'; import {createRequire} from 'module'; import {execSync} from 'child_process';
const require=createRequire(import.meta.url); const esbuild=require('esbuild'); const root=path.resolve(import.meta.dirname,'..'), D=root+'/dist/Catlyn-Terdampar';
fs.rmSync(root+'/dist',{recursive:true,force:true}); fs.mkdirSync(D+'/public',{recursive:true});
const alias={'three/addons':root+'/node_modules/three/examples/jsm','three':root+'/node_modules/three/build/three.module.js'};
await esbuild.build({entryPoints:[root+'/client/main.js'],bundle:true,format:'esm',outfile:D+'/public/game.js',minify:true,target:'es2022',alias,logLevel:'warning'});
await esbuild.build({entryPoints:[root+'/server/index.js'],bundle:true,platform:'node',format:'cjs',outfile:D+'/server.cjs',minify:false,external:['bufferutil','utf-8-validate'],logLevel:'error',define:{'import.meta.url':'""'}});
for(const f of ['index.html','style.css','manifest.webmanifest'])fs.copyFileSync(root+'/public/'+f,D+'/public/'+f); fs.cpSync(root+'/public/icons',D+'/public/icons',{recursive:true});
fs.cpSync(root+'/public/world',D+'/public/world',{recursive:true}); fs.cpSync(root+'/public/assets',D+'/public/assets',{recursive:true});
const keep=new Set(['stone_fire_pit.glb','wooden_crate_01.glb','wooden_barrels_01.glb','treasure_chest.glb','dutch_ship_medium.glb']); for(const f of fs.readdirSync(D+'/public/assets/props'))if(!keep.has(f))fs.rmSync(D+'/public/assets/props/'+f);
for(const f of ['rock2.jpg','rock2_n.jpg'])fs.rmSync(D+'/public/assets/tex/'+f,{force:true});
// lighter textures for phones (served when the phone picks low quality)
const sharp=require('/opt/npm-tools/node_modules/sharp'); const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
for(const f of walk(D+'/public/assets').filter(f=>f.endsWith('.jpg'))){const o=D+'/public/lite'+f.slice((D+'/public').length);fs.mkdirSync(path.dirname(o),{recursive:true});fs.writeFileSync(o,await sharp(f).resize(512,512,{fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer())}
fs.mkdirSync(D+'/source',{recursive:true}); for(const d of ['client','server','shared','tools'])fs.cpSync(root+'/'+d,D+'/source/'+d,{recursive:true,filter:s=>!/preview|lookdev/.test(s)});
const bat=(online)=>'@echo off\r\ntitle Catlyn Terdampar Server\r\ncd /d "%~dp0"\r\nwhere node >nul 2>nul\r\nif errorlevel 1 (\r\n  echo Node.js belum terpasang. Download dari https://nodejs.org lalu jalankan lagi.\r\n  pause\r\n  exit /b\r\n)\r\n'+(online?'set ONLINE=1\r\n':'')+'start "" /b cmd /c "timeout /t 2 >nul & start http://localhost:3000"\r\nnode server.cjs\r\npause\r\n';
fs.writeFileSync(D+'/Main-WiFi-Windows.bat',bat(false)); fs.writeFileSync(D+'/Main-Online-Windows.bat',bat(true));
const mac=(online)=>'#!/bin/bash\ncd "$(dirname "$0")"\nif ! command -v node >/dev/null; then echo "Node.js belum terpasang. Download dari https://nodejs.org"; read; exit 1; fi\n(sleep 2; open http://localhost:3000) &\n'+(online?'ONLINE=1 ':'')+'node server.cjs\n';
fs.writeFileSync(D+'/Main-WiFi-Mac.command',mac(false),{mode:0o755}); fs.writeFileSync(D+'/Main-Online-Mac.command',mac(true),{mode:0o755});
fs.writeFileSync(D+'/Main-Linux.sh','#!/bin/bash\ncd "$(dirname "$0")"\nONLINE=${ONLINE:-1} node server.cjs\n',{mode:0o755});
fs.writeFileSync(D+'/BACA-DULU.txt',`CATLYN TERDAMPAR - game survival 3D multiplayer

SIAPKAN SEKALI
Pasang Node.js (versi 18 ke atas) dari https://nodejs.org di laptop.

MAIN BARENG TEMAN BEDA WIFI (atau beda kota)
1. Windows: klik dua kali Main-Online-Windows.bat
   Mac: klik dua kali Main-Online-Mac.command (kalau diblokir: klik kanan > Open)
2. Pertama kali, laptop download Cloudflare Tunnel (gratis, sekali saja).
3. Di jendela server muncul "LINK BUAT TEMAN", contohnya https://kata-kata-acak.trycloudflare.com
4. Di browser laptop, klik Buat Room Baru. Catat KODE room-nya.
5. Kirim link + kode ke teman. Teman buka link di HP atau laptop, isi KODE, klik Gabung.
   Link dan tombol Salin juga ada di game: menu Pengaturan.
Catatan:
- Laptop harus tetap nyala dan jendela server jangan ditutup selama main.
- Link berubah setiap kali server dijalankan ulang, kirim link baru ke teman.
- Kalau link baru dibuka belum bisa, tunggu 10-20 detik lalu refresh.
- Download awal teman sekitar 50 MB, lebih enak pakai WiFi atau kuota yang cukup.

MAIN BARENG TEMAN SATU WIFI
Klik Main-WiFi-Windows.bat atau Main-WiFi-Mac.command.
Di jendela server ada alamat http://192.168.x.x:3000. Teman yang satu WiFi buka alamat itu.
Kalau Windows nanya firewall, klik Allow.

KONTROL PC
WASD gerak, Shift lari, Spasi lompat, Ctrl jongkok, E interaksi, Klik kiri pukul/tebang/nambang/mancing (tahan buat tarik busur),
V ganti kamera first/third person, Tab tas, C craft, B bangun, M peta, J misi, 1-7 pilih item, G letakkan muatan, R putar bangunan,
X bongkar (pegang palu), H klakson, Enter chat, Esc menu.
Di HP ada joystick dan tombol sentuh.

ALUR GAME
Ikuti panah misi di layar. Garis besarnya: kumpulkan bahan, bikin alat, api unggun, rumah, meja kerja dan tungku,
tambang besi, bengkel dan mobil, cari 6 bagian pesawat, pasang, isi bensin, bertahan dari badai, lalu terbang.
Mulai hari ke-2 serigala menyerang tiap malam: dekati api unggun atau masuk rumah.
Sampingan: mancing, kebun, perahu jukung ke pulau kapal karam, dan 2 gua kristal (lihat Peta).

PROGRESS
Tersimpan otomatis di folder saves. Room yang sama bisa dibuka lagi pakai kode yang sama.
Kalau sebelumnya main pakai zip lama, salin folder saves dari folder lama ke folder ini.
Identitas pemain tersimpan di browser, jadi pakai browser yang sama supaya tas dan posisi tetap.

GRAFIK
Pilih Rendah/Sedang/Tinggi di layar awal atau menu Esc. Game otomatis menurunkan kualitas kalau patah-patah.
`.replace(/\n/g,'\r\n'));
fs.writeFileSync(D+'/CREDITS.txt',`Aset 3D dan tekstur (CC0, domain publik):
- Quaternius (quaternius.com): Universal Base Characters, Modular Character Outfits, Universal Animation Library 1 dan 2, Stylized Nature MegaKit, Ultimate Animated Animal Pack
- Poly Haven (polyhaven.com): tekstur tanah, kayu, batu, dan beberapa properti
Kalau suka, dukung Quaternius di patreon.com/quaternius.

Font: Nunito (SIL Open Font License, lihat public/assets/fonts/OFL.txt)
Kode pihak ketiga: three.js (MIT), ws (MIT)
Rumah, mobil, pesawat, pohon kelapa, efek, dan suara dibuat lewat kode khusus untuk game ini.
`.replace(/\n/g,'\r\n'));
fs.rmSync(root+'/dist/Catlyn-Terdampar.zip',{force:true}); execSync(`cd ${root}/dist && zip -q -r -9 Catlyn-Terdampar.zip Catlyn-Terdampar`); console.log('zip MB',(fs.statSync(root+'/dist/Catlyn-Terdampar.zip').size/1e6).toFixed(1));
