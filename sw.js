const CACHE="u8i-adler-v5";
const PRECACHE=[
  "./",
  "./index.html",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
];

self.addEventListener("install",e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",e=>{
  const url=e.request.url;
  if(url.includes("supabase.co")) return;
  if(e.request.method!=="GET") return;

  e.respondWith(
    caches.match(e.request).then(cached=>{
      const fetchPromise=fetch(e.request).then(res=>{
        if(res.ok){
          const clone=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request,clone));
        }
        return res;
      }).catch(()=>cached);
      return cached||fetchPromise;
    })
  );
});
