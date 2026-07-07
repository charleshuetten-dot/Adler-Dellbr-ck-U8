/* Kompaktierte Feldspieler-Kriterien: 37 statt 48. Gestrichen (Overlaps, nirgends
   in Algorithmen/Fazit referenziert): m_t1, m_t4, m_k5, m_p1, m_p3, m_p4,
   t_auftreten, m_m1, m_m4, m_m8, m_m9. Deren Aspekte wurden in die Hilfetexte
   verbleibender Kriterien integriert. DIMS_TW bleibt unverändert. */
const DIMS_FELD=[
{id:"tech",label:"Technik & Ball",icon:"ti-ball-football",col:"#1a56db",w:0.28,
 tier:[
  {n:"t_ball",l:"Ballkontrolle",h:"Im Spielbetrieb unter Gegnerdruck",opts:[
    {v:1,t:"Verspringt",d:"Annahme und erste Mitnahme noch unsicher"},
    {v:2,t:"Kontrolliert",d:"Stabiles Dribbling im freien Raum, verliert Ball selten"},
    {v:3,t:"Klebefuß",d:"Enger Kontakt auch direkt unter Gegnerdruck – intuitiv"}
  ]},
  {n:"t_pass",l:"Passspiel & Mitspieler-Sicht",h:"Qualität, Schärfe, Präzision, bewusstes Abspielen",opts:[
    {v:1,t:"Wegschlagen",d:"Kein Mitspieler-Blick, unkontrolliertes Befreien"},
    {v:2,t:"Gezielt",d:"Flache, bewusste Pässe – Mitspieler wird erkannt"},
    {v:3,t:"Spielmacher",d:"Sieht Mitspieler im Raum – spielt präzise und mit Timing"}
  ]},
  {n:"t_dribble",l:"Dribbling & Finte",h:"1gg1-Mut, Kreativität, Lösungsfindung – auch in engen Räumen",opts:[
    {v:1,t:"Geradeaus",d:"Keine Richtungswechsel, kein Täuschungsversuch"},
    {v:2,t:"Variabel",d:"Tempowechsel, Außenrist, einfache Richtungswechsel"},
    {v:3,t:"Straßenkicker",d:"Erfindet eigene Lösungen, traut sich Finten im 1gg1 zu"}
  ]}
 ],
 mx:[
  {n:"m_t2",l:"Schwacher Fuß",h:"Grundnutzung im echten Spielbetrieb"},
  {n:"m_t3",l:"Erste Ballmitnahme",h:"Vorwärts gerichtet, kontrolliert"},
  {n:"m_t5",l:"Torschuss-Mut",h:"Entschlossenheit vor dem Tor – kein Zögern"},
  {n:"m_t6",l:"Offensiv-1gg1",h:"Durchsetzung gegen Verteidiger"},
  {n:"m_t7",l:"Defensiv-Zweikampf & Körpereinsatz",h:"Timing, Mut, Robustheit, Fairness"}
 ]
},
{id:"raute",label:"Rauten-IQ & Taktik",icon:"ti-chess",col:"#7c3aed",w:0.22,
 tier:[
  {n:"t_raum",l:"Raumverständnis (Adler/Igel)",h:"Klumpen vs. Feld-groß-machen – Kernthema U9",opts:[
    {v:1,t:"Balljäger",d:"Klumpen – orientiert sich nur am Ball, kennt weder Adler- noch Igel-Form"},
    {v:2,t:"Auf Zuruf",d:"Reagiert auf 'Adler!' (breit) bzw. 'Igel!' (eng) wenn Trainer es ansagt"},
    {v:3,t:"Eigenständig",d:"Wechselt selbstständig zwischen Adler (breit/offensiv) und Igel (eng/defensiv)"}
  ]},
  {n:"t_rolle",l:"Rollenverständnis",h:"Position in der 4+1 Raute kennen und halten",opts:[
    {v:1,t:"Freestyle",d:"Keine feste Rolle erkennbar – wechselt unkontrolliert"},
    {v:2,t:"Mit Kommando",d:"Hält seine Rauten-Rolle nach Traineranweisung"},
    {v:3,t:"Eigenverantwortlich",d:"Übernimmt Rolle selbstständig, liest Spielsituation"}
  ]},
  {n:"t_umschalt",l:"Umschalt-Instinkt",h:"Offensiv ↔ Defensiv – Kernthema U9",opts:[
    {v:1,t:"Träge",d:"Reagiert auf Ballverlust/-gewinn nicht aktiv – bleibt stehen"},
    {v:2,t:"Reaktiv",d:"Schaltet auf direktes Trainerkommando um"},
    {v:3,t:"Antizipativ",d:"Erkennt Umschaltmoment früh – instinktives Gegenpressing"}
  ]}
 ],
 mx:[
  {n:"m_k1",l:"Freiläufe vor Ballerhalt",h:"Antizipation und Timing"},
  {n:"m_k2",l:"Defensiv-Positionierung",h:"Aufpasser-Rolle, Restverteidigung absichern"},
  {n:"m_k3",l:"Offensiv-Laufwege",h:"Flitzer/Jäger – Tiefenläufe in Schnittstellen"},
  {n:"m_k4",l:"Solo vs. Abspiel",h:"Entscheidungsqualität in der konkreten Situation"},
  {n:"m_k6",l:"Pressing-Instinkt",h:"Aktives Anlaufen nach Ballverlust"}
 ]
},
{id:"phys",label:"Physis & Motorik",icon:"ti-run",col:"#d97706",w:0.2,
 tier:[
  {n:"t_speed",l:"Antritt & Tempo",h:"Sprint 10m – Reaktionsschnelligkeit",opts:[
    {v:1,t:"Gemächlich",d:"Deutlich langsamer als Altersgruppe"},
    {v:2,t:"Altersgerecht",d:"Durchschnittlicher Antritt für U9"},
    {v:3,t:"Blitzschnell",d:"Klar überdurchschnittlich – entscheidende Waffe im 1gg1"}
  ]},
  {n:"t_koord",l:"Koordination & Motorik",h:"Bewegungsqualität, Gleichgewicht (auch bei Körperkontakt), Wendigkeit",opts:[
    {v:1,t:"Unsicher",d:"Stolpert, Richtungswechsel noch schwierig"},
    {v:2,t:"Solide",d:"Altersgerechte Grundkoordination"},
    {v:3,t:"Athletisch",d:"Überdurchschnittlich – elegante Richtungswechsel, sicheres Gleichgewicht"}
  ]},
  {n:"t_einsatz",l:"Laufbereitschaft",h:"Energie und Aktivität über das gesamte Training – auch Laufarbeit ohne Ball",opts:[
    {v:1,t:"Passiv",d:"Zieht sich aus Laufduellen heraus – wartet auf den Ball"},
    {v:2,t:"Stabil",d:"Regelmäßige, verlässliche Laufarbeit"},
    {v:3,t:"Ausdauermotor",d:"Immer anspielbar und anlaufend – höchste Aktivität"}
  ]}
 ],
 mx:[
  {n:"m_p2",l:"Beweglichkeit & Wendigkeit",h:"Richtungswechsel mit und ohne Ball"},
  {n:"m_p5",l:"Leistungskurve Training",h:"Hält Niveau bis zum Trainingsende"}
 ]
},
{id:"mental",label:"Mentalität & Charakter",icon:"ti-brain",col:"#059669",w:0.19,
 tier:[
  {n:"t_fokus",l:"Fokus & Konzentration",h:"Im Training – bei Erklärungen, Wartezeiten, Übergängen",opts:[
    {v:1,t:"Abgelenkt",d:"Verliert schnell den Fokus – spielt, quatscht, schaut woanders hin"},
    {v:2,t:"Stabil",d:"Folgt Erklärungen, bleibt bei der Sache mit gelegentlichen Aussetzern"},
    {v:3,t:"Hochkonzentriert",d:"Volle Aufmerksamkeit – nimmt jeden Impuls sofort auf"}
  ]},
  {n:"t_resil",l:"Resilienz",h:"Umgang mit Fehlern, Niederlagen, schwierigen Phasen",opts:[
    {v:1,t:"Bricht ein",d:"Fehler blockieren das Weiterspielen – Kopf hängt sofort"},
    {v:2,t:"Erholt sich",d:"Braucht kurz, findet dann wieder zurück"},
    {v:3,t:"Unerschütterlich",d:"Nutzt Fehler als Antrieb – wird danach stärker"}
  ]},
  {n:"t_sozial",l:"Soziale Einstellung & Auftreten",h:"Augenhöhe, Respekt (auch ggü. Schwächeren), Miteinander – im Spiel, in Pausen, in der Kabine",opts:[
    {v:1,t:"Außenseiter",d:"Isoliert sich oder zeigt Überlegenheitsgefühl – auf Augenhöhe schwierig"},
    {v:2,t:"Integriert",d:"Spielt fair zusammen, akzeptiert alle Mitspieler"},
    {v:3,t:"Echte Einheit",d:"Fördert Zusammenhalt aktiv – niemand bleibt außen vor"}
  ]},
  {n:"t_team",l:"Teamgeist & Kommunikation",h:"Interaktion, Ansagen, Mitspieler fördern",opts:[
    {v:1,t:"Einzelkämpfer",d:"Kaum Interaktion, feuert nicht an, fordert Ball nur für sich"},
    {v:2,t:"Teamplayer",d:"Spielt freiwillig ab, kommuniziert, unterstützt"},
    {v:3,t:"Anführer",d:"Reißt Team mit, motiviert nach Rückschlägen aktiv"}
  ]},
  {n:"t_lern",l:"Coachability",h:"Umsetzung von Trainer-Impulsen im Spielbetrieb",opts:[
    {v:1,t:"Braucht Zeit",d:"Fehler wiederholt sich trotz mehrfacher Ansprache"},
    {v:2,t:"Regelmäßig",d:"Lernt mit mehrfacher Wiederholung zuverlässig"},
    {v:3,t:"Blitzlernend",d:"Ein Hinweis genügt – sofortige Umsetzung im nächsten Spielzug"}
  ]},
  {n:"t_selbstvertrauen",l:"Selbstvertrauen unter Druck",h:"Verhalten mit Ball unter Druck – traut sich eigene Entscheidungen ohne Trainerbestätigung zu",opts:[
    {v:1,t:"Zögert",d:"Weicht Druck aus, gibt Ball schnell ab, meidet riskante Situationen"},
    {v:2,t:"Stabil",d:"Spielt sicher in normalen Situationen, bei hohem Druck etwas zurückhaltend"},
    {v:3,t:"Sucht die Situation",d:"Hohes Selbstvertrauen – sucht Druck aktiv, traut sich alles zu"}
  ]}
 ],
 mx:[
  {n:"m_m2",l:"Frustrationstoleranz & Auftreten nach Misserfolg",h:"Bei eigenem Fehler, Gegentor, Niederlage – inkl. Körpersprache danach"},
  {n:"m_m3",l:"Spielfreude & Eigenmotivation",h:"Kommt mit Energie, fragt nach mehr, hat Spaß"},
  {n:"m_m5",l:"Kommunikation auf dem Feld",h:"Ruft an, zeigt sich, fordert Ball, lobt Mitspieler"},
  {n:"m_m6",l:"Körpersprache im Spiel",h:"Aufrechte Haltung, Präsenz, Ausstrahlung"},
  {n:"m_m7",l:"Umgang mit Kritik",h:"Reaktion wenn Trainer korrigiert – Hinweis annehmen und umsetzen"}
 ]
},
{id:"entw",label:"Entwicklungspotenzial",icon:"ti-trending-up",col:"#0e7490",w:0.11,
 tier:[
  {n:"t_neug",l:"Eigeninitiative & Neugier",h:"Engagement über das Training hinaus",opts:[
    {v:1,t:"Passiv",d:"Entwicklung nur im strukturierten Training sichtbar"},
    {v:2,t:"Interessiert",d:"Fragt nach Übungen, probiert Sachen selbst"},
    {v:3,t:"Fußball-Junkie",d:"Kickt privat, kommt mit eigenen Ideen"}
  ]},
  {n:"t_devt",l:"Entwicklungstempo",h:"Fortschritt seit letzter Bewertung / Saisonstart",opts:[
    {v:1,t:"Stagnation",d:"Kaum sichtbarer Fortschritt trotz regelmäßigem Training"},
    {v:2,t:"Kontinuierlich",d:"Altersgerechter, stetiger Fortschritt"},
    {v:3,t:"Sprung",d:"Deutlicher Schritt nach vorne – übertrifft Erwartungen klar"}
  ]}
 ],
 mx:[
  {n:"m_e1",l:"Regelverständnis Funino/4+1",h:"Kennt und hält die Grundregeln"},
  {n:"m_e2",l:"Transferleistung",h:"Gelerntes in neuen Situationen anwenden"},
  {n:"m_e3",l:"Kreativität & Problemlösung",h:"Erfindet eigene spielerische Lösungen"}
 ]
}
];
