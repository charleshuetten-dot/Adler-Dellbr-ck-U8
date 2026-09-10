/* Selbstabschaltung des alten Service Workers.
   WARUM DAS NOETIG IST: Wer die App schon einmal geoeffnet hat, hat auf der ALTEN
   Adresse einen Service Worker installiert. Der beantwortet Seitenaufrufe aus seinem
   Cache – die Weiterleitungs-Seite wuerde also nie geladen, und Eltern saehen weiter
   die eingefrorene alte App, ohne dass irgendwo etwas Rotes erscheint.
   Der Browser holt das Skript unter derselben Adresse aber regelmaessig neu (spaetestens
   nach 24 Stunden). Dann uebernimmt dieser hier, raeumt alle Caches ab, meldet sich ab
   und schickt alle offenen Tabs neu los – wo sie auf die Weiterleitung treffen. */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil((async function () {
    const ks = await caches.keys();
    await Promise.all(ks.map(k => caches.delete(k)));
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: "window" });
    cs.forEach(c => c.navigate(c.url));
  })());
});
/* Nichts mehr aus dem Cache beantworten – ab jetzt geht alles ans Netz. */
self.addEventListener("fetch", function (e) { e.respondWith(fetch(e.request)); });
