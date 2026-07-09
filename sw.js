const CACHE="u9i-adler-v194";
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
  "./icon-eltern.png",
  "./manifest-trainer.json",
  "./manifest-eltern.json",
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
  // cache:"reload" umgeht den HTTP-Cache des Browsers. Ohne das kann der Precache eine
  // Datei aus dem Browser-Cache uebernehmen (GitHub Pages liefert HTML mit max-age=600)
  // und der neue Service Worker startet mit einer veralteten index.html.
  const frisch=PRECACHE.map(u=>new Request(u,{cache:"reload"}));
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(frisch).then(()=>precacheFonts(c)))
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
  if(url.includes("open-meteo.com"))return; // Wetter: nie cachen (ignoreSearch würde die Datums-Query zerstören)
  if(url.includes("openstreetmap.org"))return; // Geocoding/Adress-Suche: nie cachen (Query-Sicherheit)
  if(e.request.method!=="GET")return;

  /* NETWORK-FIRST fuer die Seite selbst und die Manifeste.
     Vorher galt auch hier cache-first: die HTML-Seite kam aus dem Cache und hing damit
     strukturell eine Version hinterher. Fatal beim Installieren – Chrome liest das
     Manifest aus dem gelieferten HTML, bekam die ALTE Seite (ohne die Manifest-Umschaltung
     im <head>) und hat den Eltern-Zugang als Trainer-App installiert.
     Offline faellt beides sauber auf den Cache zurueck. */
  const istSeite = e.request.mode==="navigate";
  const istManifest = /manifest-[a-z]+\.json$/.test(url);
  if(istSeite||istManifest){
    e.respondWith((async()=>{
      try{
        const net=await fetch(e.request);
        if(net&&net.ok){
          const clone=net.clone();
          // Navigationen unter der App-Shell ablegen (?portal/?quiz sind dieselbe Datei)
          caches.open(CACHE).then(c=>c.put(istSeite?"./index.html":e.request,clone));
        }
        return net;
      }catch(err){
        const cached=await caches.match(istSeite?"./index.html":e.request,{ignoreSearch:istSeite});
        return cached||new Response("Offline",{status:503,statusText:"Offline"});
      }
    })());
    return;
  }

  e.respondWith((async()=>{
    // ignoreSearch: "./?quiz" matcht den Precache von "./"
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
