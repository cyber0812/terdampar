import {chromium} from 'playwright'; import fs from 'fs';
// usage: node play.mjs <scenario.mjs> [w h qs]
const [,,sc,w='1280',h='720',qs='q=med&auto=1&nointro=1&manual=1']=process.argv;
const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader',...(process.env.CHROME_ARGS?process.env.CHROME_ARGS.split(' '):[])]});
const open=async(q=qs,ctxOpt={viewport:{width:+w,height:+h}})=>{const ctx=await b.newContext(ctxOpt);const p=await ctx.newPage();p.on('console',m=>{const t=m.text();if(/GPU stall|swiftshader|Automatic fallback|has been deprecated|Multiple instances/i.test(t))return;if(m.type()==='error'||m.type()==='warning'||t.startsWith('LOG'))console.log('['+m.type()+']',t.slice(0,600))});p.on('pageerror',e=>console.log('PAGEERR',e.stack?.slice(0,700)||e.message));await p.goto('http://127.0.0.1:8098/?'+q);return p};
const wait=(p)=>p.waitForFunction('window.__g&&window.__g.started',null,{timeout:200000});
const m=await import(process.cwd()+'/'+sc);await m.default({open,wait,browser:b});await b.close();
