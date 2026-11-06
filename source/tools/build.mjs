import {createRequire} from 'module'; const require=createRequire(import.meta.url); const esbuild=require('esbuild'); import path from 'path';
const root=path.resolve(import.meta.dirname,'..');
const alias={'three/addons':root+'/node_modules/three/examples/jsm','three':root+'/node_modules/three/build/three.module.js'};
const entries=process.argv.slice(2);
await esbuild.build({entryPoints:entries.length?entries.map(e=>root+'/client/'+e+'.js'):[root+'/client/main.js'],bundle:true,format:'esm',outfile:root+'/public/'+(entries[0]==='lookdev'||entries[0]==='lookdev2'?entries[0]:'game')+'.js',minify:process.env.MIN==='1',sourcemap:false,target:'es2022',alias,logLevel:'warning'});
