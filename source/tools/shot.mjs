import {chromium} from 'playwright';
const [,,out,qs='',w='1280',h='720',page0='lookdev.html']=process.argv;
const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:+w,height:+h}});
p.on('console',m=>{const t=m.text();if(!/GPU stall|swiftshader|Automatic fallback/i.test(t))console.log(t.slice(0,1500))});p.on('pageerror',e=>console.log('PAGEERR',e.message.slice(0,500)));
await p.goto(`http://127.0.0.1:8098/${page0}?${qs}`);
await p.waitForFunction('window.DONE===1',{timeout:230000});await p.screenshot({path:out});await b.close();
