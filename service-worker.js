const CACHE='focus-reader-ipad-v3';
const LOCAL=['./','./index.html','./manifest.webmanifest','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'];
const LIBS=[
'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.min.mjs',
'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs',
'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(async c=>{
 await c.addAll(LOCAL); await Promise.allSettled(LIBS.map(u=>c.add(u))); return self.skipWaiting();
})));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{
   const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{}); return r;
 }).catch(()=>e.request.mode==='navigate'?caches.match('./index.html'):Promise.reject())));
});
