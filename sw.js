const CACHE="u9i-adler-v133";
const PRECACHE=[
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./core.js",
  "./engine.js",
  "./views.js",
  "./quiz.js",
  "./matchday.js",
  "./boot.js",
  "./logo.png",
  "./icon-trainer.png",
  "./icon-quiz.png",
  "./manifest-trainer.json",
  "./manifest-quiz.json",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
];

// Font-Dateien aus den precachten CSS-Dateien extrahieren und mitcachen,
// damit Schrift + Icons auch beim allerersten Offline-Start funktionieren.
async function precacheFonts(cache){
  const cssUrls=PRECACHE.filter(u=>u.endsWith(".css")||u.includes("fonts.googleapis"));
  for(const cssUrl of cssUrls){
    try{
      const res=await fetch(cssUrl);
      if(!res.ok)continue;
      const css=await res.text();
      const urls=[...css.matchAll(/url\((['"]?)(https?:\/\/[^)'"]+)\1\)/g)].map(m=>m[2]);
      await Promise.all([...new Set(urls)].map(async u=>{
        try{
          const fr=await fetch(u,{mode:"cors"});
          if(fr.ok)await cache.put(u,fr);
        }catch(e){/* einzelne Fontdatei optional */}
      }));
    }catch(e){/* CSS optional */}
  }
}

self.addEventListener("install",e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(PRECACHE).then(()=>precacheFonts(c)))
      .then(()=>self.skipWaiting())
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
  if(url.includes("supabase.co"))return;
  if(e.request.method!=="GET")return;

  e.respondWith((async()=>{
    // ignoreSearch: "./?quiz" (installierte Quiz-App) matcht den Precache von "./"
    const cached=await caches.match(e.request,{ignoreSearch:true});
    const fetchPromise=fetch(e.request).then(res=>{
      if(res.ok){
        const clone=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
      }
      return res;
    }).catch(()=>null);

    if(cached)return cached;
    const net=await fetchPromise;
    if(net)return net;

    // Offline-Fallback fuer Navigationen: immer die App-Shell liefern
    if(e.request.mode==="navigate"){
      const shell=await caches.match("./index.html",{ignoreSearch:true});
      if(shell)return shell;
    }
    return new Response("Offline",{status:503,statusText:"Offline"});
  })());
});
