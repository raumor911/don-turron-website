import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const cli=process.env.LIGHTHOUSE_CLI;
fs.mkdirSync('tests/performance',{recursive:true});
const cases=[['before','http://127.0.0.1:8128/'],['after','http://127.0.0.1:8127/']];
const results={};
for(const [label,url] of cases){
  results[label]=[];
  for(let i=1;i<=3;i++){
    const output=`tests/performance/${label}-${i}.json`;
    execFileSync(process.execPath,[cli,url,'--chrome-flags=--headless --no-sandbox','--only-categories=performance','--output=json','--output-path='+output,'--quiet'],{stdio:'inherit'});
    const r=JSON.parse(fs.readFileSync(output));
    if(r.runtimeError)throw new Error(JSON.stringify(r.runtimeError));
    const a=r.audits;
    results[label].push({score:r.categories.performance.score*100,lcp:a['largest-contentful-paint'].numericValue,fcp:a['first-contentful-paint'].numericValue,cls:a['cumulative-layout-shift'].numericValue,tbt:a['total-blocking-time'].numericValue,bytes:a['total-byte-weight'].numericValue});
  }
}
const median=key=>Object.fromEntries(Object.entries(results).map(([label,r])=>[label,r.map(x=>x[key]).sort((a,b)=>a-b)[1]]));
const summary={method:'Lighthouse default mobile simulated Slow 4G; 3 cold runs per local HTTP source; same runner, no CDN',baseline:'b358c90b6c50cdf5dd818d082e6f3a2683aecff1',results,median:Object.fromEntries(['score','lcp','fcp','cls','tbt','bytes'].map(k=>[k,median(k)]))};
fs.writeFileSync('tests/performance/summary.json',JSON.stringify(summary,null,2)+'\n');
console.log('DT_MOBILE_METRICS '+JSON.stringify(summary));
if(summary.median.lcp.after>summary.median.lcp.before+100)throw new Error('Mobile LCP regression');
