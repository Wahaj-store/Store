type Entry={count:number;reset:number};
const store=new Map<string,Entry>();
export function rateLimit(key:string,limit=8,windowMs=10*60*1000){const now=Date.now();const e=store.get(key);if(!e||e.reset<=now){store.set(key,{count:1,reset:now+windowMs});return {ok:true,remaining:limit-1};}e.count++;return {ok:e.count<=limit,remaining:Math.max(0,limit-e.count),reset:e.reset};}
export function getClientKey(req:Request){return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';}
