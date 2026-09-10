# Alte Adresse der U9-Team-App

Dieses Repo enthält **keine App**. Es hält nur die alte GitHub-Pages-Adresse am Leben.

Die App liegt seit dem 10.09.2026 unter:

**https://sv-adler-dellbrueck.github.io/u9-app/**
(Repo: `SV-Adler-Dellbrueck/u9-app`)

## Warum es das hier gibt

GitHub leitet nach einem Umzug zwar Repo-Links weiter, **Pages-Adressen aber nicht**.
Alle bis dahin verschickten Turnier-, Ticker-, Einladungs- und Kind-Links zeigten auf
`charleshuetten-dot.github.io/Adler-Dellbr-ck-U8/…` und wären tot gewesen.

## Was die drei Dateien tun

| Datei | Aufgabe |
|---|---|
| `index.html` | leitet die Wurzel weiter |
| `404.html` | fängt **jeden anderen Pfad** ab – also auch `/trainer/` und `/eltern/`, die installierten Apps auf den Eltern-Handys |
| `sw.js` | schaltet den alten Service Worker ab |

Der Fragezeichen- **und** der Rautenteil werden mitgenommen. Daran hängt alles:
`?turnier=…&code=…`, `?ticker=…`, `?kind=…`, `?handover#h=…`.

### Die Falle, gegen die `sw.js` gebaut ist

Wer die App schon einmal geöffnet hatte, trug auf dieser Adresse einen Service Worker.
Der beantwortete Seitenaufrufe **aus seinem Cache** – die Weiterleitung wäre nie geladen
worden, und Eltern hätten weiter die eingefrorene alte App gesehen, ohne Fehlermeldung.
Der Browser holt das Skript aber von selbst neu (spätestens nach 24 Stunden); dann räumt
diese Fassung die Caches ab, meldet sich ab und schickt offene Tabs neu los.

**Nicht löschen.** Solange irgendwo noch alte Links kursieren, muss das hier stehen bleiben.
