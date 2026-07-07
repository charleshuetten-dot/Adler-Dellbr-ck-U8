const TQ_SCENARIOS=[
// ══════ Block 1: Grundlagen der Raute (Szenarien 1–10) ══════
{
  title:"Grundstellung der Raute",
  desc:"Anstoß für den Gegner! Stellt eure Raute auf.",
  task:"Bringe alle Feldspieler in die richtige Raute-Grundstellung!",
  hint:"Aufpasser zentral hinten, Flitzer auf den Seiten, Jäger in der Spitze.",
  ball:{from:{x:50,y:50},to:{x:50,y:50}},
  opps:[{x:48,y:48,label:"Gegner"},{x:52,y:52,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:40,y:55,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:50,y:65,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:55,y:37,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:30,y:45,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:70,r:12},
    "Flitzer L":{x:25,y:48,r:15},
    "Flitzer R":{x:75,y:48,r:15},
    "Jäger":{x:50,y:30,r:14}
  },
  explain:{
    correct:"⚽ Genau! Aufpasser vor dem TW, Flitzer breit, Jäger vorne – das ist die Raute!",
    wrong:"Tipp: Aufpasser = zentral hinter der Mittellinie. Flitzer L = links, Flitzer R = rechts auf Höhe Mittellinie. Jäger = vorne in der Spitze."
  }
},
{
  title:"Raute nach links verschieben",
  desc:"Der Gegner hat den Ball und spielt auf seine rechte Seite (eure linke). Der Ball wandert nach links!",
  task:"Verschiebe die komplette Raute nach links – aber halte die Form!",
  hint:"Die Raute bewegt sich wie ein Block. Alle verschieben sich gleichmäßig zur Ballseite.",
  ball:{from:{x:50,y:40},to:{x:20,y:35}},
  opps:[{x:25,y:30,label:"Gegner",to:{x:20,y:35}},{x:50,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:57,y:71,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:38,y:54,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:79,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:54,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:35,y:68,r:14},
    "Flitzer L":{x:18,y:45,r:14},
    "Flitzer R":{x:55,y:50,r:16},
    "Jäger":{x:32,y:32,r:14}
  },
  explain:{
    correct:"👏 Perfekt! Die Raute verschiebt als Block nach links – Abstände bleiben gleich!",
    wrong:"Tipp: ALLE verschieben sich nach links, nicht nur einer. Flitzer R muss zur Mitte kommen. Die Raute-Form bleibt erhalten, nur der Ort ändert sich."
  }
},
{
  title:"Raute nach rechts verschieben",
  desc:"Der Ball wandert jetzt auf die rechte Seite! Ein Gegner dribbelt dort nach vorne.",
  task:"Verschiebe die Raute nach rechts!",
  hint:"Spiegelverkehrt zum Linksverschieben. Flitzer L rückt zur Mitte, Flitzer R geht raus.",
  ball:{from:{x:50,y:40},to:{x:80,y:35}},
  opps:[{x:75,y:35,label:"Gegner",to:{x:80,y:35}},{x:60,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:43,y:71,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:21,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:62,y:54,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:46,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:65,y:68,r:14},
    "Flitzer L":{x:45,y:50,r:16},
    "Flitzer R":{x:82,y:45,r:14},
    "Jäger":{x:68,y:32,r:14}
  },
  explain:{
    correct:"💪 Stark! Raute verschiebt nach rechts – Flitzer L kommt zur Mitte!",
    wrong:"Tipp: Alles spiegelverkehrt. Flitzer L muss zur Mitte kommen, Flitzer R presst, Aufpasser und Jäger verschieben nach rechts."
  }
},
{
  title:"Ball zum rechten Flitzer",
  desc:"Euer Team hat den Ball. Der Aufpasser spielt einen Pass zum rechten Flitzer.",
  task:"Wohin bewegen sich die anderen Spieler? Verschiebe Flitzer L, Aufpasser und Jäger!",
  hint:"Denk an ADLER – Feld groß machen! Der Jäger orientiert sich Richtung Tor.",
  ball:{from:{x:50,y:72},to:{x:80,y:48}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:83,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:59,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:80,y:48,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:46,y:40,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:55,y:62,r:15},
    "Flitzer L":{x:25,y:38,r:15},
    "Jäger":{x:60,y:22,r:15}
  },
  explain:{
    correct:"⚽ Perfekt! Flitzer L hält die Breite, Aufpasser sichert ab, Jäger geht zum Tor!",
    wrong:"💡 Flitzer L bleibt breit, Aufpasser schiebt nach, Jäger geht Richtung Tor!"
  }
},
{
  title:"Gegner spielt nach rechts",
  desc:"Der Gegner hat den Ball und spielt ihn auf seine rechte Seite (eure linke!).",
  task:"Schaltet auf IGEL um! Wohin muss die Raute verschieben? Bewege alle Feldspieler!",
  hint:"IGEL = eng zusammenziehen, Richtung Ball verschieben. Nicht klumpen – Abstände halten!",
  ball:{from:{x:50,y:50},to:{x:20,y:35}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:59,y:75,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:10,y:54,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:80,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:25,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:38,y:68,r:14},
    "Flitzer L":{x:25,y:45,r:10},
    "Flitzer R":{x:55,y:50,r:16},
    "Jäger":{x:35,y:35,r:10}
  },
  explain:{
    correct:"💪 Stark! Alle verschieben zur Ballseite – so geht IGEL!",
    wrong:"💡 Bei IGEL verschiebt sich die GANZE Raute Richtung Ball!"
  }
},
{
  title:"Raute kompakt nach vorne",
  desc:"Ihr führt 1:0! Der Gegner hat den Abstoß. Jetzt wollt ihr pressen!",
  task:"Schiebe die ganze Raute kompakt nach vorne – Pressing!",
  hint:"Die Abstände bleiben eng, aber alles verschiebt sich Richtung gegnerisches Tor. Auch der Aufpasser rückt weit auf.",
  ball:{from:{x:50,y:15},to:{x:50,y:15}},
  opps:[{x:50,y:10,label:"Geg. TW"},{x:40,y:18,label:"Gegner"},{x:60,y:18,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:70,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:75,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:48,r:14},
    "Flitzer L":{x:28,y:28,r:14},
    "Flitzer R":{x:72,y:28,r:14},
    "Jäger":{x:50,y:15,r:12}
  },
  explain:{
    correct:"🔥 Super Pressing! Raute in der gegnerischen Hälfte – eng und mit Druck!",
    wrong:"Tipp: ALLE rücken weit auf. Jäger geht bis fast an den gegnerischen TW. Flitzer auf Höhe der gegnerischen Abwehr. Aufpasser mindestens bis Mittellinie."
  }
},
{
  title:"Raute kompakt nach hinten",
  desc:"Der Gegner hat starke Stürmer! Ihr zieht euch zurück und verteidigt kompakt.",
  task:"Ziehe die Raute tief in die eigene Hälfte – aber halte die Form!",
  hint:"Tief stehen heißt nicht klumpen! Die Raute bleibt, nur alles ist näher am eigenen Tor.",
  ball:{from:{x:50,y:35},to:{x:50,y:35}},
  opps:[{x:30,y:30,label:"Gegner"},{x:70,y:30,label:"Gegner"},{x:50,y:20,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:58,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:23,y:40,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:77,y:40,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:78,r:12},
    "Flitzer L":{x:28,y:62,r:15},
    "Flitzer R":{x:72,y:62,r:15},
    "Jäger":{x:50,y:50,r:14}
  },
  explain:{
    correct:"🛡️ Gut! Raute steht tief – Jäger auf Mittellinie, Aufpasser sichert nah am TW!",
    wrong:"Tipp: Alle zurückziehen, aber die Raute-Form bewahren. Jäger geht auf Mittellinie zurück, Flitzer in eigene Hälfte, Aufpasser nah am Strafraum."
  }
},
{
  title:"Dreieck bilden",
  desc:"Beim Ballbesitz brauchen wir immer zwei Anspielstationen! Das nennt man ein Dreieck.",
  task:"Schiebe Flitzer L und Jäger so, dass sie mit dem Aufpasser ein Dreieck bilden!",
  hint:"Dreieck = nicht alle auf einer Linie stehen!",
  ball:{from:{x:50,y:65},to:{x:50,y:65}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:50,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:75,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:47,y:28,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:25,y:50,r:15},
    "Jäger":{x:65,y:42,r:15}
  },
  explain:{
    correct:"Perfektes Dreieck! Der Aufpasser hat immer zwei Optionen. So behält ihr den Ball!",
    wrong:"Tipp: Nicht alle auf einer Linie! Flitzer L links, Jäger rechts versetzt – dann bilden alle drei ein Dreieck."
  }
},
{
  title:"Freilaufen für den Pass",
  desc:"Aufpasser hat den Ball. Jäger steht direkt beim Gegner – so kommt kein Pass an!",
  task:"Schiebe Jäger weg vom Gegner in den freien Raum! 🏃",
  hint:"Lauf dahin wo KEIN Gegner steht – dann kann der Pass ankommen!",
  ball:{from:{x:48,y:55},to:{x:48,y:55}},
  opps:[{x:40,y:28,label:"Gegner"},{x:55,y:32,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:48,y:55,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:48,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:48,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:16,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:50,y:38,r:14}
  },
  explain:{
    correct:"⚽ Super! Im freien Raum kann der Pass ankommen – gut freigelaufen!",
    wrong:"💡 Lauf weg vom Gegner in den freien Raum – dort kann der Ball hin!"
  }
},
{
  title:"Positionswechsel",
  desc:"Aufpasser rückt nach vorne! Wer übernimmt seinen Platz?",
  task:"Schiebe Flitzer L zur Aufpasser-Position – keine Lücke lassen!",
  hint:"Wenn einer rausläuft, muss ein anderer nachrücken!",
  ball:{from:{x:50,y:55},to:{x:50,y:55}},
  anim:[{role:"Aufpasser",to:{x:50,y:40}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:58,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:28,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:38,y:62,r:14}
  },
  explain:{
    correct:"Klug! Flitzer L füllt die Lücke – die Raute bleibt kompakt!",
    wrong:"Tipp: Wenn Aufpasser nach vorne läuft, muss Flitzer L in die Mitte einrücken!"
  }
},
// ══════ Block 2: ADLER & IGEL (Szenarien 11–20) ══════
{
  title:"ADLER aktivieren – Feld groß machen",
  desc:"Euer Aufpasser hat den Ball gewonnen! Sofort ADLER – das Feld groß machen!",
  task:"Bringe alle in die ADLER-Formation. Breit und tief!",
  hint:"ADLER = offensiv. Flitzer maximal breit, Jäger ganz vorne, Aufpasser zentral als Absicherung.",
  ball:{from:{x:50,y:65},to:{x:50,y:65}},
  anim:[{role:"Aufpasser",to:{x:50,y:65}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:62,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:35,y:52,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:60,y:55,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:48,y:38,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:12,y:40,r:16},
    "Flitzer R":{x:88,y:40,r:16},
    "Jäger":{x:50,y:18,r:14}
  },
  explain:{
    correct:"🦅 ADLER perfekt! Feld maximal groß – Flitzer breit, Jäger vorne!",
    wrong:"Tipp: ADLER = Maximum breit! Flitzer L ganz links an die Linie, Flitzer R ganz rechts. Jäger ganz vorne Richtung gegnerisches Tor."
  }
},
{
  title:"ADLER – Aufpasser spielt auf Flitzer L",
  desc:"Der Aufpasser passt nach links auf Flitzer L. Der Ball fliegt!",
  task:"Flitzer L hat den Ball – wie reagieren die anderen? Verschiebe Jäger und Flitzer R!",
  hint:"Jäger bietet sich für die Flanke an. Flitzer R rückt etwas ein – Absicherung dahinter!",
  ball:{from:{x:50,y:65},to:{x:15,y:38}},
  opps:[{x:25,y:35,label:"Gegner"},{x:50,y:30,label:"Gegner"},{x:75,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:56,y:71,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:38,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:85,y:40,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:59,y:31,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:40,y:55,r:14},
    "Flitzer R":{x:65,y:30,r:16},
    "Jäger":{x:45,y:14,r:14}
  },
  explain:{
    correct:"⚽ Super! Jäger zum Tor, Flitzer R zum zweiten Pfosten, Aufpasser sichert ab!",
    wrong:"Tipp: Jäger muss Richtung Tor laufen – da kommt die Flanke hin! Flitzer R geht leicht nach innen. Aufpasser bleibt dahinter als Absicherung."
  }
},
{
  title:"ADLER – Flitzer L dribbelt nach vorne",
  desc:"Flitzer L hat seinen Gegenspieler ausgespielt und dribbelt in Richtung Tor!",
  task:"Flitzer L dribbelt – wo positionieren sich die anderen für den Abschluss?",
  hint:"Jäger zum nahen Pfosten, Flitzer R zum fernen Pfosten. Aufpasser sichert!",
  ball:{from:{x:15,y:38},to:{x:18,y:22}},
  opps:[{x:35,y:20,label:"Gegner"},{x:55,y:18,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  anim:[{role:"Flitzer L",to:{x:18,y:22}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:43,y:63,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:38,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:65,y:36,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:54,y:25,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:35,y:42,r:14},
    "Flitzer R":{x:65,y:12,r:16},
    "Jäger":{x:40,y:8,r:14}
  },
  explain:{
    correct:"👏 Perfekt! Jäger nah, Flitzer R fern, Aufpasser sichert dahinter!",
    wrong:"Tipp: Jäger = naher Pfosten (dort kommt die Flanke zuerst an). Flitzer R = ferner Pfosten. Aufpasser hält Abstand und sichert gegen Konter."
  }
},
{
  title:"ADLER – Spielverlagerung",
  desc:"Flitzer L hat den Ball, aber links ist alles zugestellt. Der Aufpasser ruft: 'Verlagern!'",
  task:"Flitzer L passt zurück auf den Aufpasser. Wohin bewegt sich Flitzer R?",
  hint:"Spielverlagerung = Ball schnell auf die andere Seite! Flitzer R muss anspielbar sein.",
  ball:{from:{x:15,y:38},to:{x:50,y:60}},
  opps:[{x:20,y:30,label:"Gegner"},{x:18,y:42,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:12,y:30,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:61,y:35,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:33,y:16,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:20,y:50,r:14},
    "Flitzer R":{x:85,y:35,r:16},
    "Jäger":{x:55,y:20,r:14}
  },
  explain:{
    correct:"👍 Toll! Flitzer R geht breit – Verlagerung! Jäger verschiebt zur Ballseite.",
    wrong:"Tipp: Flitzer R muss BREIT gehen um die Verlagerung zu empfangen – raus an die rechte Seite! Flitzer L lässt sich auf seiner Seite fallen."
  }
},
{
  title:"ADLER – Konter über rechts",
  desc:"Der Aufpasser hat verlagert! Flitzer R hat jetzt den Ball auf der rechten Seite – viel Platz!",
  task:"Flitzer R dribbelt – wie unterstützt das Team den Angriff über rechts?",
  hint:"Jäger geht zum Tor, Flitzer L rückt zur Mitte als zweite Welle.",
  ball:{from:{x:50,y:60},to:{x:85,y:35}},
  opps:[{x:70,y:30,label:"Gegner",to:{x:78,y:32}},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:46,y:65,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:50,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:85,y:35,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:60,y:48,r:14},
    "Flitzer L":{x:40,y:25,r:16},
    "Jäger":{x:60,y:10,r:14}
  },
  explain:{
    correct:"⚡ Klasse! Jäger zum Tor, Flitzer L rückt ein – 3 Anspielstationen!",
    wrong:"Tipp: Jäger Richtung Tor! Flitzer L nicht links stehen bleiben – einrücken zur Mitte für die zweite Welle. Aufpasser zur Ballseite verschieben und absichern."
  }
},
{
  title:"IGEL aktivieren – eng zusammen!",
  desc:"Der Gegner hat den Ball im Mittelfeld. Zeit für den IGEL – eng zusammenziehen!",
  task:"Bringe alle in die IGEL-Formation. Kompakt, enge Abstände!",
  hint:"IGEL = defensiv. Alle nah zusammen, Zwischenräume zu. Nicht breit stehen!",
  ball:{from:{x:50,y:40},to:{x:50,y:40}},
  opps:[{x:30,y:32,label:"Gegner"},{x:70,y:32,label:"Gegner"},{x:50,y:20,label:"Gegner"},{x:50,y:40,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:88,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:85,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:22,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:68,r:12},
    "Flitzer L":{x:35,y:52,r:14},
    "Flitzer R":{x:65,y:52,r:14},
    "Jäger":{x:50,y:40,r:12}
  },
  explain:{
    correct:"🦔 Igel perfekt! Alle eng zusammen – der Gegner findet keinen Raum!",
    wrong:"Tipp: IGEL = eng! Flitzer L und Flitzer R müssen zur Mitte kommen. Jäger lässt sich zurückfallen. Die Zwischenräume müssen geschlossen werden."
  }
},
{
  title:"IGEL – Gegner greift links an",
  desc:"Ein Gegenspieler dribbelt auf eurer linken Seite nach vorne!",
  task:"Verschiebe den IGEL zur Ballseite – links!",
  hint:"Flitzer L presst, Rest verschiebt. Aber: Nicht alle zum Ball! Absicherung dahinter!",
  ball:{from:{x:50,y:40},to:{x:20,y:35}},
  opps:[{x:50,y:40,label:"Gegner",to:{x:20,y:35}},{x:60,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:59,y:70,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:35,y:52,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:72,y:52,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:40,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:38,y:65,r:14},
    "Flitzer L":{x:20,y:40,r:10},
    "Flitzer R":{x:50,y:52,r:14},
    "Jäger":{x:34,y:38,r:10}
  },
  explain:{
    correct:"✅ Richtig! Flitzer L presst, Aufpasser sichert dahinter – kein Loch in der Mitte!",
    wrong:"Tipp: Flitzer L geht DIREKT auf den Ball. Aufpasser dahinter als Absicherung. Flitzer R kommt zur Mitte, Jäger nach links. Keiner bleibt auf der ballfernen Seite!"
  }
},
{
  title:"IGEL – Gegner wechselt die Seite",
  desc:"Der Gegner hat schnell auf rechts verlagert! Sein Spieler dribbelt rechts nach vorne.",
  task:"Schnell! Verschiebe den IGEL jetzt nach rechts!",
  hint:"Die Raute muss als Block zur neuen Ballseite. Flitzer R presst jetzt!",
  ball:{from:{x:20,y:35},to:{x:80,y:32}},
  opps:[{x:20,y:35,label:"Gegner",to:{x:80,y:32}},{x:55,y:20,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:38,y:65,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:40,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:50,y:52,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:32,y:38,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:62,y:65,r:14},
    "Flitzer L":{x:50,y:50,r:14},
    "Flitzer R":{x:78,y:38,r:10},
    "Jäger":{x:65,y:35,r:10}
  },
  explain:{
    correct:"⚡ Blitzschnell verschoben! Raute rechts – Flitzer R presst den Ball!",
    wrong:"Tipp: Wenn der Ball die Seite wechselt, ALLE sofort nachschieben! Flitzer R übernimmt das Pressing, Flitzer L kommt zur Mitte. Der Block verschiebt sich komplett."
  }
},
{
  title:"IGEL – Durchbruch verhindern",
  desc:"Ein Gegenspieler hat sich durchgespielt und ist auf dem Weg zum Tor! Notfall!",
  task:"Sichere den Strafraum! Alle zurück – aber nicht klumpen!",
  hint:"Aufpasser deckt den Durchbruchspieler. Flitzer sichern die Seiten. Jäger fällt zurück.",
  ball:{from:{x:50,y:40},to:{x:45,y:55}},
  opps:[{x:50,y:40,label:"Gegner",to:{x:45,y:55}},{x:25,y:45,label:"Gegner"},{x:70,y:42,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:56,y:56,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:36,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:64,y:46,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:40,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:48,y:72,r:10},
    "Flitzer L":{x:32,y:68,r:12},
    "Flitzer R":{x:68,y:68,r:14},
    "Jäger":{x:48,y:58,r:10}
  },
  explain:{
    correct:"🛡️ Gut gesichert! Jäger verzögert, die anderen bilden eine Kette!",
    wrong:"Tipp: Im Notfall alle zurück, aber NICHT auf einem Haufen! Jäger verzögert, Aufpasser sichert Mitte, Flitzer decken die Seiten vor dem Strafraum ab."
  }
},
{
  title:"IGEL – Eckstoß gegen uns",
  desc:"Der Gegner hat einen Eckstoß! Die Flanke kommt von rechts ins Zentrum.",
  task:"Positioniere die Raute zur Eckstoß-Verteidigung!",
  hint:"Alle im und um den Strafraum. Jeder deckt einen Raum, keinen Gegenspieler.",
  ball:{from:{x:95,y:5},to:{x:55,y:78}},
  opps:[{x:45,y:78,label:"Gegner"},{x:55,y:82,label:"Gegner"},{x:40,y:85,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:51,y:66,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:75,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:47,y:84,r:10},
    "Flitzer L":{x:33,y:79,r:10},
    "Flitzer R":{x:61,y:79,r:10},
    "Jäger":{x:49,y:70,r:10}
  },
  explain:{
    correct:"🛡️ Gut verteidigt! Alle verteilt – kein Gegner steht frei!",
    wrong:"Tipp: Bei Eckstoß ALLE in den Strafraum! Nicht draußen stehen bleiben. Verteilt euch im Strafraum – vorderer Pfosten, Mitte, hinterer Pfosten, Rückraum."
  }
},
// ══════ Block 3: Umschalten & Pressing (Szenarien 21–30) ══════
{
  title:"Ballgewinn! Umschalten",
  desc:"Euer Aufpasser gewinnt den Ball im Mittelfeld! Schnelles Umschalten von IGEL auf ADLER!",
  task:"Schalte sofort auf ADLER um – wohin sprinten die Spieler?",
  hint:"Umschalten = sofort breit machen! Flitzer auf die Außenbahnen, Jäger ab in die Spitze!",
  ball:{from:{x:45,y:65},to:{x:50,y:60}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:35,y:55,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:55,y:55,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:45,y:42,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:15,y:38,r:16},
    "Flitzer R":{x:85,y:38,r:16},
    "Jäger":{x:50,y:20,r:15}
  },
  explain:{
    correct:"⚡ Blitzschnell umgeschaltet! Breit machen – ADLER-Moment!",
    wrong:"💡 Nach Ballgewinn sofort ADLER! Flitzer breit raus, Jäger in die Spitze!"
  }
},
{
  title:"Umschalten: Ballgewinn links!",
  desc:"Flitzer L gewinnt das 1gg1 und erobert den Ball auf der linken Seite!",
  task:"Sofort umschalten auf ADLER! Wohin sprinten die Mitspieler?",
  hint:"Nach Ballgewinn: Feld sofort groß machen. Flitzer R raus, Jäger tief, Aufpasser nachrücken.",
  ball:{from:{x:22,y:45},to:{x:22,y:45}},
  opps:[{x:25,y:48,label:"Gegner"},{x:50,y:30,label:"Gegner"},{x:60,y:40,label:"Gegner"}],
  anim:[{role:"Flitzer L",to:{x:22,y:45}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:34,y:79,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:45,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:55,y:52,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:35,y:38,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:40,y:58,r:14},
    "Flitzer R":{x:85,y:38,r:16},
    "Jäger":{x:45,y:18,r:14}
  },
  explain:{
    correct:"⚡ Schnell umgeschaltet! Flitzer R breit rechts, Jäger in die Spitze!",
    wrong:"Tipp: Bei Ballgewinn SOFORT breit machen! Flitzer R muss raus an die Seitenlinie. Jäger sprintet in die Spitze. Nicht warten – SCHNELLIGKEIT zählt!"
  }
},
{
  title:"Umschalten: Ballgewinn Mitte",
  desc:"Der Aufpasser fängt einen Pass im Zentrum ab! Jetzt schnell nach vorne!",
  task:"Aufpasser hat den Ball in der Mitte. Zeige die Laufwege beim Umschalten!",
  hint:"Alle Optionen schaffen: Links breit, rechts breit, vorne tief!",
  ball:{from:{x:50,y:60},to:{x:50,y:60}},
  opps:[{x:55,y:55,label:"Gegner",to:{x:55,y:50}},{x:40,y:40,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:35,y:52,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:60,y:55,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:42,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:12,y:38,r:16},
    "Flitzer R":{x:88,y:38,r:16},
    "Jäger":{x:50,y:18,r:14}
  },
  explain:{
    correct:"⚡ Blitz-Umschalten! Flitzer breit, Jäger tief – 3 Optionen!",
    wrong:"Tipp: Nach Ballgewinn in der Mitte habt ihr ALLE Optionen. Flitzer müssen sofort BREIT gehen. Jäger sofort in die TIEFE. Nicht stehen bleiben!"
  }
},
{
  title:"Umschalten: Ballverlust vorne!",
  desc:"Euer Jäger verliert den Ball im Angriff! Der Gegner kontert sofort!",
  task:"Sofort zurückschalten auf IGEL! Alle zurückfallen und kompakt werden!",
  hint:"Jäger = erster Verteidiger! Flitzer zurück zur Mitte, Aufpasser absichern!",
  ball:{from:{x:50,y:18},to:{x:50,y:30}},
  opps:[{x:45,y:22,label:"Gegner",to:{x:50,y:30}},{x:30,y:35,label:"Gegner"},{x:70,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:46,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:38,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:85,y:38,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:16,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:68,r:14},
    "Flitzer L":{x:35,y:52,r:16},
    "Flitzer R":{x:65,y:52,r:16},
    "Jäger":{x:50,y:38,r:14}
  },
  explain:{
    correct:"🦔 Schnell reagiert! Jäger verzögert, Flitzer zur Mitte – IGEL!",
    wrong:"Tipp: Jäger NICHT stehen bleiben – er ist jetzt der ERSTE VERTEIDIGER! Flitzer von den Seiten zur Mitte. Aufpasser sofort tief zurück. IGEL formen!"
  }
},
{
  title:"Umschalten: Ballverlust Mitte",
  desc:"Der Aufpasser verliert den Ball bei einem Fehlpass! Der Gegner schaltet um!",
  task:"Aufpasser hat den Ball verloren – wie reagiert die Mannschaft?",
  hint:"Aufpasser: Sofort Gegenpressing! Rest: Zurückfallen und Räume schließen!",
  ball:{from:{x:50,y:60},to:{x:55,y:50}},
  opps:[{x:55,y:55,label:"Gegner",to:{x:55,y:50}},{x:30,y:35,label:"Gegner"},{x:75,y:40,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:72,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:42,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:80,y:42,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:25,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:52,y:55,r:10},
    "Flitzer L":{x:35,y:55,r:14},
    "Flitzer R":{x:65,y:55,r:10},
    "Jäger":{x:50,y:42,r:10}
  },
  explain:{
    correct:"💪 Gut! Aufpasser macht Gegenpressing – Flitzer schließen Passwege!",
    wrong:"Tipp: Der Aufpasser muss SOFORT den Ballführer attackieren (Gegenpressing). Rest: Passwege schließen und kompakt werden."
  }
},
{
  title:"Umschalten: Doppel-Wechsel",
  desc:"Ballgewinn – schnell Adler – aber sofort wieder Ballverlust! Zurück zum IGEL!",
  task:"Ihr hattet gerade erst umgeschaltet, jetzt wieder zurück! Schnelles Denken!",
  hint:"Konzentration! Aus der ADLER-Position sofort zurück in den IGEL!",
  ball:{from:{x:40,y:30},to:{x:45,y:38}},
  opps:[{x:40,y:35,label:"Gegner",to:{x:45,y:38}},{x:65,y:30,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:46,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:12,y:38,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:88,y:38,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:18,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:68,r:14},
    "Flitzer L":{x:35,y:52,r:12},
    "Flitzer R":{x:65,y:52,r:16},
    "Jäger":{x:48,y:42,r:12}
  },
  explain:{
    correct:"🦅➡️🦔 Super! Von ADLER sofort zurück in IGEL – top Umschalten!",
    wrong:"Tipp: Die Flitzer müssen REIN zur Mitte – aus der breiten ADLER-Position eng zusammen. Jäger lässt sich zurückfallen. Aufpasser tief zurück."
  }
},
{
  title:"Pressing-Falle",
  desc:"Der Gegner baut hinten auf. Euer Jäger startet das Pressing!",
  task:"Wie läuft das Team-Pressing? Verschiebe alle nach vorne!",
  hint:"Jäger presst den Ballführenden. Flitzer schneiden Passwege ab. Aufpasser rückt nach.",
  ball:{from:{x:50,y:20},to:{x:50,y:20}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:24,y:51,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:76,y:51,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:48,r:14},
    "Flitzer L":{x:30,y:30,r:14},
    "Flitzer R":{x:70,y:30,r:14},
    "Jäger":{x:50,y:18,r:12}
  },
  explain:{
    correct:"💪 Starkes Pressing! Jäger presst, alle schieben kompakt nach!",
    wrong:"💡 IGEL nach vorne schieben! Jäger presst, Rest rückt mit hoch!"
  }
},
{
  title:"Pressing: Jäger leitet ein",
  desc:"Der gegnerische Torwart hat den Ball. Euer Jäger startet das Pressing!",
  task:"Wie unterstützen die Mitspieler den Jäger? Alle nachrücken!",
  hint:"Der Jäger lenkt den Gegner auf eine Seite. Flitzer und Aufpasser rücken nach.",
  ball:{from:{x:50,y:8},to:{x:50,y:8}},
  opps:[{x:50,y:8,label:"Geg. TW"},{x:30,y:15,label:"Gegner"},{x:70,y:15,label:"Gegner"},{x:50,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:65,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:24,y:50,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:76,y:50,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:45,r:14},
    "Flitzer L":{x:28,y:28,r:14},
    "Flitzer R":{x:72,y:28,r:14},
    "Jäger":{x:50,y:12,r:12}
  },
  explain:{
    correct:"🔥 Starkes Pressing! Jäger presst TW, Flitzer rücken auf die Verteidiger!",
    wrong:"Tipp: Pressing ist TEAMARBEIT! Jäger allein reicht nicht. Flitzer müssen auf die Verteidiger gehen, Aufpasser nachrücken."
  }
},
{
  title:"Pressing: Jäger lenkt nach links",
  desc:"Der Jäger hat den gegnerischen TW nach links gelenkt! Der TW passt zu seinem rechten Verteidiger.",
  task:"Pressing-Falle zuschnappen! Flitzer L muss pressen!",
  hint:"Flitzer L attackiert den Ballführer. Jäger schneidet den Rückpass ab. Flitzer R und Aufpasser rücken nach.",
  ball:{from:{x:50,y:8},to:{x:28,y:15}},
  opps:[{x:50,y:8,label:"Geg. TW"},{x:28,y:15,label:"Gegner"},{x:70,y:15,label:"Gegner"},{x:50,y:25,label:"Gegner"}],
  anim:[{role:"Jäger",to:{x:42,y:12}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:53,y:51,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:31,y:39,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:72,y:28,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:12,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:45,y:35,r:10},
    "Flitzer L":{x:25,y:18,r:14},
    "Flitzer R":{x:55,y:25,r:10}
  },
  explain:{
    correct:"🪤 Die Falle schnappt zu! Flitzer L presst, Jäger schneidet den Pass ab!",
    wrong:"Tipp: Flitzer L muss AGGRESSIV auf den Ballführer. Flitzer R verschiebt zur Mitte und deckt den Passweg. Aufpasser rückt als Absicherung nach."
  }
},
{
  title:"Pressing: Gegner spielt sich raus",
  desc:"Mist! Der Gegner hat euer Pressing überspielt und ist im Mittelfeld am Ball!",
  task:"Das Pressing ist gescheitert – schnell zurück! Formiert den IGEL!",
  hint:"Wenn Pressing scheitert: Sofort zurück und kompakt werden. Nicht weiterjagen!",
  ball:{from:{x:28,y:15},to:{x:50,y:38}},
  opps:[{x:28,y:15,label:"Gegner",to:{x:50,y:38}},{x:30,y:30,label:"Gegner"},{x:70,y:30,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:35,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:18,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:55,y:25,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:42,y:12,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:62,r:14},
    "Flitzer L":{x:35,y:50,r:14},
    "Flitzer R":{x:65,y:50,r:14},
    "Jäger":{x:50,y:42,r:14}
  },
  explain:{
    correct:"🦔 Richtig! Pressing überspielt? Sofort zurück und IGEL bilden!",
    wrong:"Tipp: NICHT dem Ball nachjagen! Alle zurück in die eigene Hälfte und IGEL formieren. Jäger verzögert, Rest baut die Raute wieder auf."
  }
},
// ══════ Block 4: Spielaufbau (Szenarien 31–40) ══════
{
  title:"Abstoß vom Torwart",
  desc:"Euer Torwart hat den Ball nach einer Parade. Er will schnell das Spiel eröffnen!",
  task:"Biete Anspielstationen! Wohin bewegen sich alle Feldspieler?",
  hint:"ADLER-Form! Aufpasser bietet sich kurz an – rechts oder links vom TW. Flitzer breit, Jäger tief!",
  ball:{from:{x:50,y:90},to:{x:50,y:90}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:47,y:58,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:38,y:56,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:62,y:56,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:48,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":[{x:35,y:78,r:14},{x:65,y:78,r:14},{x:50,y:78,r:12}],
    "Flitzer L":{x:15,y:50,r:16},
    "Flitzer R":{x:85,y:50,r:16},
    "Jäger":{x:50,y:25,r:15}
  },
  explain:{
    correct:"⚽ Super! Aufpasser kurz anspielbar, Flitzer breit, Jäger tief – perfekte Anspieloptionen!",
    wrong:"💡 Aufpasser KURZ rechts oder links vom TW, Flitzer BREIT, Jäger in die TIEFE!"
  }
},
{
  title:"Spielaufbau: TW kurz auf Aufpasser",
  desc:"Euer Torwart hat den Ball nach einer Parade. Er will kurz auf den Aufpasser spielen.",
  task:"Aufpasser bietet sich an. Wo stehen die anderen, um Optionen zu geben?",
  hint:"Kurzer Aufbau: Aufpasser kommt nah zum TW. Flitzer gehen breit, Jäger macht Tiefe.",
  ball:{from:{x:50,y:90},to:{x:48,y:78}},
  opps:[{x:50,y:30,label:"Gegner"},{x:35,y:40,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:54,y:59,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:35,y:55,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:65,y:55,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:47,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":[{x:48,y:78,r:12},{x:35,y:78,r:14},{x:65,y:78,r:14}],
    "Flitzer L":{x:15,y:48,r:16},
    "Flitzer R":{x:85,y:48,r:16},
    "Jäger":{x:50,y:25,r:14}
  },
  explain:{
    correct:"⚽ Perfekt! TW hat 4 Anspielstationen – Aufpasser kurz anspielbar, Flitzer breit, Jäger tief!",
    wrong:"Tipp: Aufpasser kommt NAH zum TW (rechts oder links). Flitzer BREIT. Jäger TIEF."
  }
},
{
  title:"Spielaufbau: Aufpasser dreht auf",
  desc:"Der Aufpasser hat den Ball vom TW bekommen und dreht sich auf. Er schaut nach vorne.",
  task:"Der Aufpasser hat Platz! Wohin bewegen sich die Mitspieler?",
  hint:"Aufpasser schaut nach vorne – jetzt Räume öffnen! Flitzer breit, Jäger zwischen den Gegnern.",
  ball:{from:{x:48,y:78},to:{x:50,y:68}},
  opps:[{x:50,y:30,label:"Gegner"},{x:35,y:40,label:"Gegner",to:{x:40,y:45}}],
  anim:[{role:"Aufpasser",to:{x:50,y:68}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:48,y:78,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:19,y:61,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:81,y:61,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:40,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:12,y:38,r:16},
    "Flitzer R":{x:88,y:38,r:16},
    "Jäger":{x:50,y:18,r:14}
  },
  explain:{
    correct:"🦅 Exzellent! Aufpasser dreht sich – Flitzer breit, Jäger tief!",
    wrong:"Tipp: Wenn der Aufpasser Platz hat: Flitzer NOCH breiter nach vorne. Jäger geht TIEF in den Raum. Optionen schaffen!"
  }
},
{
  title:"Spielaufbau: Aufpasser spielt lang",
  desc:"Der Aufpasser sieht den Jäger frei und spielt einen langen Ball nach vorne!",
  task:"Der Ball fliegt zum Jäger – wie reagieren die Flitzer?",
  hint:"Wenn der Ball lang geht, müssen die Flitzer sprinten, um den Jäger zu unterstützen!",
  ball:{from:{x:50,y:68},to:{x:50,y:22}},
  opps:[{x:45,y:20,label:"Gegner"},{x:55,y:18,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:72,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:12,y:38,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:88,y:38,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:22,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:50,r:14},
    "Flitzer L":{x:20,y:18,r:16},
    "Flitzer R":{x:80,y:18,r:16}
  },
  explain:{
    correct:"⚡ Klasse! Flitzer sprinten hoch – zu viert im Angriff!",
    wrong:"Tipp: Langer Ball = Flitzer SPRINTEN! Sie müssen schnell zum Jäger, um Überzahl zu schaffen. Aufpasser rückt in den Mittelkreis."
  }
},
{
  title:"Spielaufbau: Aufpasser unter Druck",
  desc:"Der Aufpasser bekommt den Ball, aber ein Gegner presst ihn sofort! Kein Platz nach vorne!",
  task:"Aufpasser ist unter Druck – welche Optionen hat er?",
  hint:"Unter Druck: Zurück zum TW ist immer eine Option! Oder Flitzer L/Flitzer R kommen kurz.",
  ball:{from:{x:50,y:90},to:{x:48,y:75}},
  opps:[{x:50,y:35,label:"Gegner",to:{x:49,y:68}},{x:35,y:40,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:48,y:75,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:13,y:44,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:87,y:44,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:16,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:25,y:65,r:16},
    "Flitzer R":{x:75,y:65,r:16},
    "Jäger":{x:50,y:38,r:14}
  },
  explain:{
    correct:"👍 Gut gelöst! Flitzer kommen kurz als Hilfe – oder Rückpass zum TW!",
    wrong:"Tipp: Wenn der Aufpasser unter Druck steht, müssen die Flitzer kurz kommen und helfen! Nicht breit stehen bleiben – KURZ anbieten!"
  }
},
{
  title:"Spielaufbau: Verlagerung über den TW",
  desc:"Flitzer L hat den Ball, aber links ist alles dicht. Er spielt zurück zum TW, der soll verlagern!",
  task:"Der TW bekommt den Rückpass. Wie positioniert sich das Team für die Verlagerung nach rechts?",
  hint:"Bei Verlagerung über TW: Flitzer R breit rechts, Aufpasser kommt kurz, Jäger bleibt vorne.",
  ball:{from:{x:15,y:38},to:{x:50,y:88}},
  opps:[{x:18,y:35,label:"Gegner"},{x:20,y:45,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:38,y:54,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:38,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:64,y:46,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:33,y:22,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":[{x:55,y:75,r:14},{x:45,y:75,r:14}],
    "Flitzer L":{x:30,y:52,r:14},
    "Flitzer R":{x:88,y:42,r:16},
    "Jäger":{x:55,y:22,r:14}
  },
  explain:{
    correct:"🦅 Super Verlagerung! Flitzer R breit rechts – dort ist der Raum!",
    wrong:"Tipp: Bei Verlagerung über TW muss Flitzer R breit rechts gehen. Aufpasser bietet sich als kurze Option. Flitzer L fällt zurück, Jäger bleibt vorne."
  }
},
{
  title:"Spielaufbau lesen",
  desc:"TW hat den Ball. Aufpasser und Flitzer L bieten sich an – wer ist besser?",
  task:"Schiebe Aufpasser in die bessere, sicherere Position!",
  hint:"Der sicherste Pass gewinnt!",
  ball:{from:{x:50,y:92},to:{x:50,y:80}},
  opps:[{x:22,y:68,label:"Gegner"},{x:20,y:55,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:33,y:68,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:62,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":[{x:50,y:80,r:13},{x:62,y:80,r:14},{x:65,y:78,r:14}]
  },
  explain:{
    correct:"Aufpasser kurz und anspielbar – weg von den Gegnern, super Position!",
    wrong:"Tipp: Aufpasser weg von den Gegnern links – kurz rechts oder zentral anbieten!"
  }
},
{
  title:"Rückpass zum TW",
  desc:"Alle Wege nach vorne sind versperrt. Was tun?",
  task:"Spiele sicher zurück! Schiebe Aufpasser in die Rückpass-Position!",
  hint:"Rückpass ist keine Niederlage – es ist klug!",
  ball:{from:{x:45,y:65},to:{x:50,y:88}},
  opps:[{x:55,y:60,label:"Gegner"},{x:40,y:55,label:"Gegner"},{x:48,y:72,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:43,y:60,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:80,r:13}
  },
  explain:{
    correct:"Klug! Sicherer Rückpass statt Risiko – Ballerhalt ist wichtiger!",
    wrong:"Tipp: Wenn kein Weg nach vorne frei ist, gehe zurück zum TW. Neustart ist besser als Ballverlust!"
  }
},
{
  title:"Ball halten – sicherer Pass",
  desc:"Ihr habt den Ball! Kein Stress – spielt sicher!",
  task:"Bewege Flitzer L in eine sichere Position zum Anspielen!",
  hint:"Freier Raum suchen und sichtbar sein – kein Gegner in der Passlinie!",
  ball:{from:{x:50,y:72},to:{x:18,y:52}},
  opps:[{x:25,y:55,label:"Gegner"},{x:40,y:60,label:"Gegner"},{x:60,y:58,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:72,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:38,y:61,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:52,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:18,y:52,r:14}
  },
  explain:{
    correct:"Gut! Flitzer L hat sich in den freien Raum bewegt – jetzt kann der Aufpasser sicher anspielen!",
    wrong:"Tipp: Flitzer L muss weg von den Gegnern! In den freien Raum, wo der Pass sicher ankommt."
  }
},
{
  title:"Kurzpass-Kombinationen",
  desc:"Der Gegner presst! Mit schnellen kurzen Pässen kommt ihr raus!",
  task:"Schiebe Aufpasser und Flitzer L in kurze Dreiecks-Positionen!",
  hint:"Kurze Pässe, schnelle Bewegung, Dreieck bilden!",
  ball:{from:{x:50,y:72},to:{x:50,y:72}},
  opps:[{x:48,y:68,label:"Gegner"},{x:58,y:65,label:"Gegner"},{x:38,y:70,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:59,y:65,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:42,y:78,r:13},
    "Flitzer L":{x:30,y:65,r:14}
  },
  explain:{
    correct:"Wunderbares Dreieck! Mit Kurzpassspiel kommt ihr aus dem Pressing raus!",
    wrong:"Tipp: Aufpasser zurück und seitlich, Flitzer L kurz anbieten – zusammen ein Dreieck bilden."
  }
},
// ══════ Block 5: Flügel & Konter (Szenarien 41–50) ══════
{
  title:"Flügelspiel: Flitzer L am Ball – Breite halten",
  desc:"Flitzer L hat den Ball auf der linken Seite. Er schaut nach vorne.",
  task:"Flitzer L hat den Ball – wie positionieren sich die anderen?",
  hint:"Aufpasser sichert schräg dahinter. Flitzer R hält die Breite auf der anderen Seite!",
  ball:{from:{x:50,y:65},to:{x:15,y:40}},
  opps:[{x:22,y:38,label:"Gegner"},{x:50,y:20,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:53,y:67,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:40,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:66,y:55,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:59,y:29,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:35,y:55,r:14},
    "Flitzer R":{x:80,y:35,r:16},
    "Jäger":{x:42,y:15,r:14}
  },
  explain:{
    correct:"👏 Perfekt! Aufpasser sichert dahinter, Flitzer R breit – Jäger zum Tor!",
    wrong:"Tipp: Flitzer R NICHT nach links kommen – er hält die Breite rechts! Aufpasser schräg hinter Flitzer L als Absicherung. Jäger Richtung Tor."
  }
},
{
  title:"Flügelspiel: Flitzer L gewinnt das 1gg1",
  desc:"Flitzer L hat seinen Gegenspieler geschlagen und hat jetzt freie Bahn Richtung Grundlinie!",
  task:"Flitzer L ist durch – wo müssen die anderen stehen für die Flanke?",
  hint:"Bei Flanke: Jäger naher Pfosten, Flitzer R ferner Pfosten, Aufpasser Strafraumkante!",
  ball:{from:{x:15,y:40},to:{x:12,y:18}},
  opps:[{x:40,y:15,label:"Gegner"},{x:60,y:15,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  anim:[{role:"Flitzer L",to:{x:12,y:18}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:35,y:55,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:40,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:80,y:35,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:45,y:27,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:40,y:28,r:14},
    "Flitzer R":{x:68,y:10,r:16},
    "Jäger":{x:40,y:8,r:12}
  },
  explain:{
    correct:"⚽ Top! Jäger nah, Flitzer R fern – bereit für die Flanke!",
    wrong:"Tipp: Flankenregel: Jäger = naher Pfosten. Flitzer R = ferner Pfosten (er läuft rein!). Aufpasser = Rückraum/Strafraumkante für zweite Bälle."
  }
},
{
  title:"Flügelspiel: Flanke kommt!",
  desc:"Flitzer L flankt von der Grundlinie! Der Ball fliegt in den Strafraum!",
  task:"Die Flanke ist in der Luft! Zeige, wo sich Jäger und Flitzer R zum Ball bewegen!",
  hint:"Timing und Laufweg entscheidend. Jäger geht vor den Verteidiger, Flitzer R kommt von hinten.",
  ball:{from:{x:12,y:18},to:{x:45,y:10}},
  opps:[{x:42,y:12,label:"Gegner"},{x:55,y:12,label:"Gegner"},{x:50,y:6,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:40,y:28,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:12,y:18,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:73,y:11,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:26,y:15,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer R":{x:55,y:8,r:10},
    "Jäger":{x:42,y:7,r:10}
  },
  explain:{
    correct:"⏱️ Perfektes Timing! Jäger vor den Verteidiger, Flitzer R zum fernen Pfosten!",
    wrong:"Tipp: Jäger muss VOR seinen Gegenspieler laufen. Flitzer R startet seinen Lauf vom fernen Pfosten – er hat den Vorteil, weil er den Ball kommen sieht."
  }
},
{
  title:"Flügelspiel: Flitzer R zieht nach innen",
  desc:"Flitzer R hat den Ball rechts, aber der Weg nach außen ist zu. Er dribbelt nach innen!",
  task:"Flitzer R zieht nach innen – wie schaffen die anderen Platz?",
  hint:"Wenn einer einrückt, muss ein anderer den Raum auf der Seite besetzen!",
  ball:{from:{x:85,y:40},to:{x:60,y:35}},
  opps:[{x:55,y:30,label:"Gegner"},{x:40,y:25,label:"Gegner"}],
  anim:[{role:"Flitzer R",to:{x:60,y:35}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:48,y:66,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:16,y:50,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:85,y:40,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:59,y:29,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:65,y:52,r:14},
    "Flitzer L":{x:20,y:28,r:14},
    "Jäger":{x:45,y:12,r:14}
  },
  explain:{
    correct:"👍 Gut! Flitzer L hält die Breite, Jäger zum Tor – Aufpasser sichert!",
    wrong:"Tipp: Wenn Flitzer R nach innen dribbelt: Flitzer L bleibt breit! Jäger macht Platz Richtung Tor. Aufpasser sichert die verlassene rechte Seite."
  }
},
{
  title:"Flügelspiel: Seitenüberladung",
  desc:"Euer Plan: Alle auf eine Seite! Flitzer L, Aufpasser und Jäger attackieren links!",
  task:"Schaffe eine Überzahl auf der linken Seite!",
  hint:"Aufpasser rückt zur Seite mit, Jäger kommt kurz. Flitzer R hält die Restbreite!",
  ball:{from:{x:15,y:40},to:{x:15,y:40}},
  opps:[{x:25,y:35,label:"Gegner"},{x:55,y:30,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:40,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:91,y:50,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:20,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:28,y:50,r:14},
    "Flitzer R":{x:70,y:35,r:18},
    "Jäger":{x:30,y:22,r:14}
  },
  explain:{
    correct:"💪 Überzahl links! 3 gegen 1 – Flitzer R hält die Breite für die Verlagerung!",
    wrong:"Tipp: Aufpasser muss zur Ballseite kommen. Jäger lässt sich zur linken Seite fallen. Flitzer R bleibt rechts als Verlagerungsoption – nicht alle nach links!"
  }
},
{
  title:"Konter: Schneller Gegenstoß!",
  desc:"Ballgewinn! Der Gegner steht hoch – viel Platz zum Kontern! 4 gegen 3!",
  task:"Konter einleiten! Aufpasser hat den Ball – wohin laufen die anderen?",
  hint:"Konter = Tempo! Gerade Linie zum Tor. Flitzer sprinten in den Raum hinter der Abwehr!",
  ball:{from:{x:50,y:60},to:{x:50,y:60}},
  opps:[{x:35,y:25,label:"Gegner"},{x:55,y:22,label:"Gegner"},{x:70,y:28,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:30,y:52,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:65,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:15,y:22,r:16},
    "Flitzer R":{x:82,y:22,r:16},
    "Jäger":{x:50,y:15,r:14}
  },
  explain:{
    correct:"⚡ Traumkonter! Flitzer sprinten breit in die Tiefe – 4 gegen 3!",
    wrong:"Tipp: Bei Konter = TEMPO! Flitzer sofort breit in die Tiefe, Jäger zentral Richtung Tor. Nicht warten – der Raum ist jetzt da, gleich schließt er sich!"
  }
},
{
  title:"Konter: 2 gegen 1",
  desc:"Jäger hat den Ball und dribbelt aufs Tor! Nur noch ein Verteidiger! Flitzer R sprintet mit!",
  task:"2 gegen 1! Wo muss Flitzer R laufen, um anspielbar zu sein?",
  hint:"Beim 2gg1: Der freie Spieler läuft auf die andere Seite des Verteidigers!",
  ball:{from:{x:50,y:30},to:{x:48,y:22}},
  opps:[{x:50,y:18,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  anim:[{role:"Jäger",to:{x:48,y:22}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:50,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:25,y:38,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:72,y:34,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:48,y:22,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer R":{x:62,y:15,r:14}
  },
  explain:{
    correct:"👏 Perfekt! Flitzer R kreuzt – der Verteidiger muss sich entscheiden!",
    wrong:"Tipp: Beim 2gg1 NICHT hinter dem Verteidiger laufen! Flitzer R muss auf die ANDERE Seite – dann kann der Verteidiger nicht beide gleichzeitig decken."
  }
},
{
  title:"Konter: 3 gegen 2",
  desc:"Schneller Konter! Jäger, Flitzer L und Flitzer R gegen 2 Verteidiger! Aufpasser hat den Ball und spielt lang.",
  task:"Wie positionieren sich die drei Angreifer optimal gegen 2 Verteidiger?",
  hint:"Dreieck bilden! Einer zentral, zwei breit – maximale Breite macht es für 2 Verteidiger unmöglich.",
  ball:{from:{x:50,y:55},to:{x:50,y:30}},
  opps:[{x:40,y:20,label:"Gegner"},{x:60,y:20,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:55,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:30,y:42,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:70,y:42,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:34,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:18,y:18,r:16},
    "Flitzer R":{x:82,y:18,r:16},
    "Jäger":{x:50,y:14,r:12}
  },
  explain:{
    correct:"🦅 Überragend! Dreieck nach vorne – 3 Angreifer mit Breite gegen 2!",
    wrong:"Tipp: Breite ist der Schlüssel! Die 2 Verteidiger stehen zentral – also Flitzer GANZ BREIT raus. Jäger zentral dazwischen. So entsteht immer Überzahl."
  }
},
{
  title:"Konter: Konter absichern",
  desc:"Euer Konter läuft! Jäger und Flitzer sind vorne. Aber was macht der Aufpasser?",
  task:"Die drei Angreifer sind vorne. Wo muss der Aufpasser stehen?",
  hint:"Nie alle nach vorne! Aufpasser sichert ab – falls der Konter scheitert.",
  ball:{from:{x:50,y:55},to:{x:50,y:18}},
  opps:[{x:40,y:15,label:"Gegner"},{x:60,y:15,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:64,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:18,y:18,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:82,y:18,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:14,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:42,r:14}
  },
  explain:{
    correct:"🛡️ Genau! Aufpasser rückt nach, bleibt aber HINTER dem Ball – Absicherung!",
    wrong:"Tipp: Aufpasser rückt nach bis circa Mittellinie, aber nie bis in den Angriff! Er ist die VERSICHERUNG gegen den Gegenkonter."
  }
},
{
  title:"Konter: Konter gescheitert – zurück!",
  desc:"Der Konter ist gescheitert! Der Gegner hat den Ball erobert und kontert selbst!",
  task:"Zurück! Baut sofort den IGEL auf!",
  hint:"Sofort kompakt werden. Jäger = erster Verteidiger. Flitzer sprinten zurück zur Mitte!",
  ball:{from:{x:50,y:14},to:{x:50,y:35}},
  opps:[{x:45,y:18,label:"Gegner",to:{x:50,y:35}},{x:30,y:30,label:"Gegner"},{x:70,y:30,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:42,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:18,y:18,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:82,y:18,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:14,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:65,r:14},
    "Flitzer L":{x:35,y:52,r:16},
    "Flitzer R":{x:65,y:52,r:16},
    "Jäger":{x:50,y:40,r:14}
  },
  explain:{
    correct:"🦔 Schnell reagiert! Jäger verzögert, Flitzer zurück – IGEL!",
    wrong:"Tipp: Nicht vorne stehen bleiben! Jäger verzögert, alle anderen SPRINTEN zurück. IGEL formieren – das ist jetzt wichtiger als Angriff!"
  }
},
// ══════ Block 6: Standards & Spielsituationen (Szenarien 51–60) ══════
{
  title:"Standard: Einwurf eigene Hälfte",
  desc:"Einwurf für euch in der eigenen Hälfte, links. Flitzer L wirft ein.",
  task:"Wie bieten sich die Mitspieler zum Einwurf an?",
  hint:"Kurze und lange Option bieten! Aufpasser kurz, Jäger oder Flitzer R als lange Option.",
  ball:{from:{x:0,y:60},to:{x:0,y:60}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:2,y:60,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:84,y:51,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:55,y:33,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:22,y:62,r:14},
    "Flitzer R":{x:60,y:48,r:16},
    "Jäger":{x:35,y:42,r:14}
  },
  explain:{
    correct:"👍 Gut! Aufpasser kurz, Jäger als zweite Option – Flitzer R hält die Breite!",
    wrong:"Tipp: Aufpasser kurz zum Ball (sichere Option). Jäger als lange Option in den Raum. Flitzer R breit rechts bleiben. Nicht alle zum Ball!"
  }
},
{
  title:"Standard: Einwurf gegnerische Hälfte",
  desc:"Einwurf in der gegnerischen Hälfte, rechts. Flitzer R wirft ein.",
  task:"Offensiver Einwurf! Wie positioniert sich das Team?",
  hint:"Nahe am gegnerischen Tor: Jäger zum nahen Pfosten, Flitzer L rückt ein, Aufpasser sichert!",
  ball:{from:{x:100,y:25},to:{x:100,y:25}},
  opps:[{x:40,y:15,label:"Gegner"},{x:60,y:18,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:41,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:98,y:25,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:46,y:23,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:60,y:40,r:14},
    "Flitzer L":{x:35,y:22,r:16},
    "Jäger":{x:65,y:12,r:14}
  },
  explain:{
    correct:"⚽ Offensiv! Jäger zum nahen Pfosten, Flitzer L rückt ein – Aufpasser sichert!",
    wrong:"Tipp: Offensiver Einwurf = wie eine Flanke! Jäger geht zum Strafraum. Flitzer L rückt ein für die zweite Welle. Aufpasser sichert ab."
  }
},
{
  title:"Standard: Freistoß Mittelfeld",
  desc:"Freistoß für euch im Mittelfeld! Aufpasser führt aus.",
  task:"Freistoß aus dem Mittelfeld – wie positioniert sich das Team?",
  hint:"Wie ein normaler Angriff – ADLER! Flitzer breit, Jäger macht Tiefe.",
  ball:{from:{x:50,y:50},to:{x:50,y:50}},
  opps:[{x:50,y:42,label:"Gegner"},{x:35,y:20,label:"Gegner"},{x:65,y:20,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:50,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:30,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:70,y:45,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:12,y:30,r:16},
    "Flitzer R":{x:88,y:30,r:16},
    "Jäger":{x:50,y:15,r:14}
  },
  explain:{
    correct:"🦅 Genau! ADLER-Positionen – Flitzer breit, Jäger tief!",
    wrong:"Tipp: Bei Freistoß = ADLER aufbauen! Flitzer breit raus, Jäger tief. Nutzt die Pause um euch optimal zu positionieren."
  }
},
{
  title:"Standard: Eckstoß für uns",
  desc:"Eckstoß für euch! Flitzer L schießt die Ecke von links.",
  task:"Wie positioniert sich das Team im Strafraum?",
  hint:"Jäger und Flitzer R in den Strafraum! Aufpasser an der Strafraumkante für Abpraller.",
  ball:{from:{x:5,y:5},to:{x:45,y:12}},
  opps:[{x:42,y:10,label:"Gegner"},{x:55,y:12,label:"Gegner"},{x:50,y:6,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:40,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:5,y:5,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:70,y:25,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:54,y:24,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:22,r:10},
    "Flitzer R":{x:58,y:10,r:10},
    "Jäger":{x:42,y:8,r:12}
  },
  explain:{
    correct:"⚽ Super aufgestellt! Drei Ziele für die Flanke – nah, fern, Rückraum!",
    wrong:"Tipp: Jäger = naher Pfosten. Flitzer R = ferner Pfosten. Aufpasser = Rückraum/Strafraumkante. So habt ihr drei Optionen für die Ecke!"
  }
},
{
  title:"Standard: Abstoß gegen uns",
  desc:"Gegnerischer Abstoß! Der TW des Gegners schießt lang!",
  task:"Wie stellt sich die Raute auf den langen Abstoß ein?",
  hint:"Aufpasser sichert den Luftraum. Flitzer stehen nicht zu weit vorne – Abpraller sichern!",
  ball:{from:{x:50,y:8},to:{x:50,y:42}},
  opps:[{x:50,y:8,label:"Geg. TW"},{x:45,y:35,label:"Gegner"},{x:55,y:38,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:80,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:13,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:87,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:16,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:58,r:14},
    "Flitzer L":{x:35,y:48,r:14},
    "Flitzer R":{x:65,y:48,r:14},
    "Jäger":{x:50,y:38,r:14}
  },
  explain:{
    correct:"Gut! Raute steht kompakt im Mittelfeld. Aufpasser gewinnt den Kopfball oder sichert den zweiten Ball. Flitzer bereit für Abpraller.",
    wrong:"Tipp: Bei langem Abstoß: IGEL in der Mitte! Aufpasser sichert den Luftraum. Nicht zu weit vorne oder hinten – Mittelfeld kontrollieren!"
  }
},
{
  title:"Spiel: Rückstand – offensiver werden!",
  desc:"Ihr liegt 0:1 zurück! Noch 5 Minuten. Der Trainer ruft: 'Alles nach vorne!'",
  task:"Maximaler Angriff! Wie stellt sich die Raute offensiv auf?",
  hint:"Auch der Aufpasser rückt weit auf. Risiko eingehen! TW steht höher.",
  ball:{from:{x:50,y:65},to:{x:50,y:65}},
  opps:[{x:40,y:20,label:"Gegner"},{x:60,y:20,label:"Gegner"},{x:50,y:35,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:65,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:75,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:34,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:42,r:14},
    "Flitzer L":{x:12,y:25,r:16},
    "Flitzer R":{x:88,y:25,r:16},
    "Jäger":{x:50,y:12,r:14}
  },
  explain:{
    correct:"Voller Angriff! Aufpasser rückt bis Mittellinie auf. Flitzer ganz tief und breit. Jäger nah am Tor. Riskant – aber bei Rückstand nötig!",
    wrong:"Tipp: Bei Rückstand: Aufpasser muss HOCH stehen (Mittellinie). Flitzer extrem breit UND tief. Jäger fast auf Höhe des TW. Maximum Druck!"
  }
},
{
  title:"Spiel: Führung verteidigen",
  desc:"Ihr führt 2:1! Noch 3 Minuten. Der Trainer sagt: 'Sicher spielen!'",
  task:"Sichert die Führung! Kompakt und tief stehen!",
  hint:"IGEL-Modus! Tief stehen, Räume eng machen, nichts riskieren.",
  ball:{from:{x:50,y:35},to:{x:50,y:35}},
  opps:[{x:30,y:25,label:"Gegner"},{x:70,y:25,label:"Gegner"},{x:50,y:15,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:75,y:45,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:78,r:12},
    "Flitzer L":{x:32,y:65,r:14},
    "Flitzer R":{x:68,y:65,r:14},
    "Jäger":{x:50,y:52,r:14}
  },
  explain:{
    correct:"Sicher! Tief und kompakt. Die Raute steht in der eigenen Hälfte. Jäger fällt bis Mittellinie zurück. Kein Risiko – sicher ins Ziel!",
    wrong:"Tipp: Führung verteidigen = TIEF stehen! Jäger auf Mittellinie, Flitzer in eigener Hälfte, Aufpasser nah am Strafraum. Kompakt und geduldig!"
  }
},
{
  title:"Spiel: Gegner mit schnellem Stürmer",
  desc:"Der Gegner hat einen superschnellen Stürmer! Er steht links und wartet auf lange Bälle.",
  task:"Wie stellt sich die Raute auf diesen schnellen Gegner ein?",
  hint:"Nicht zu hoch stehen! Aufpasser muss auf der Seite des schnellen Stürmers absichern.",
  ball:{from:{x:50,y:35},to:{x:50,y:35}},
  opps:[{x:20,y:25,label:"Gegner"},{x:50,y:35,label:"Gegner"},{x:65,y:30,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:59,y:63,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:28,y:59,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:87,y:46,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:61,y:23,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:38,y:68,r:14},
    "Flitzer L":{x:22,y:38,r:14},
    "Flitzer R":{x:65,y:50,r:14},
    "Jäger":{x:42,y:35,r:14}
  },
  explain:{
    correct:"Clever! Aufpasser steht etwas links versetzt, um den schnellen Stürmer abzusichern. Flitzer L steht tiefer und enger. Die Raute ist auf den Schnellen ausgerichtet.",
    wrong:"Tipp: Gegen einen schnellen Stürmer: Aufpasser zur Seite des Schnellen! Flitzer L tiefer als normal. Nie dem Schnellen zu viel Raum hinter euch geben!"
  }
},
{
  title:"Spiel: Überzahl nutzen – 5 gegen 4",
  desc:"Ein Gegenspieler hat Rot bekommen! Ihr spielt 5 gegen 4! Nutzt die Überzahl!",
  task:"Wie nutzt ihr den Vorteil? Positioniert euch!",
  hint:"Überzahl = immer einen mehr! Spielt über die breite Seite, wo der Gegner fehlt.",
  ball:{from:{x:50,y:65},to:{x:50,y:65}},
  opps:[{x:35,y:25,label:"Gegner"},{x:65,y:25,label:"Gegner"},{x:50,y:15,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:30,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:70,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:37,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:10,y:30,r:16},
    "Flitzer R":{x:90,y:30,r:16},
    "Jäger":{x:50,y:15,r:14}
  },
  explain:{
    correct:"Perfekt! Maximal breit spielen! Der Gegner hat einen weniger und kann die Breite nicht abdecken. Flitzer ganz raus, Jäger tief – irgendwo ist immer einer frei!",
    wrong:"Tipp: Bei Überzahl = BREITE! Flitzer ganz an die Seitenlinien. Der Gegner kann mit 4 Spielern nicht die ganze Breite verteidigen. Nutzt den Raum!"
  }
},
{
  title:"Spiel: Unterzahl – 4 gegen 5",
  desc:"Einer eurer Spieler hat sich verletzt! Ihr spielt 4 gegen 5 (3 Feldspieler + TW).",
  task:"Wie verteidigt ihr mit einem Spieler weniger? Wer fehlt am wenigsten?",
  hint:"In Unterzahl: Igel noch enger! Mitte schließen, Seiten aufgeben wenn nötig.",
  ball:{from:{x:50,y:35},to:{x:50,y:35}},
  opps:[{x:20,y:25,label:"Gegner"},{x:80,y:25,label:"Gegner"},{x:50,y:20,label:"Gegner"},{x:40,y:35,label:"Gegner"},{x:60,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:55,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:26,y:46,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:74,y:46,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:75,r:12},
    "Flitzer L":{x:38,y:62,r:12},
    "Flitzer R":{x:62,y:62,r:12},
    "Jäger":{x:50,y:50,r:12}
  },
  explain:{
    correct:"Clever! In Unterzahl super eng stehen. Die Mitte zuziehen – das ist der gefährlichste Bereich. Lieber die Seiten frei lassen als die Mitte öffnen.",
    wrong:"Tipp: Unterzahl = MITTE SCHLIESSEN! Alle eng zusammen. Der Gegner soll über außen spielen müssen – da sind die Winkel schlechter."
  }
},
// ══════ Block 7: Torwartspiel (Szenarien 61–70) ══════
{
  title:"TW kurz anbieten",
  desc:"Dein Torwart hat den Ball! Der Aufpasser bietet sich kurz an.",
  task:"Schiebe den Aufpasser in die richtige Position für den kurzen Pass!",
  hint:"Der Aufpasser muss sich seitlich herausbewegen – nicht direkt vor dem TW stehen!",
  ball:{from:{x:50,y:92},to:{x:50,y:92}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:56,y:73,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:75,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:35,y:80,r:14}
  },
  explain:{
    correct:"Super! Der Aufpasser bietet sich seitlich an – so hat der TW eine klare Passlinie!",
    wrong:"Tipp: Der Aufpasser darf nicht direkt vor dem TW stehen. Seitlich anbieten!"
  }
},
{
  title:"TW – Ball flach rausspielen",
  desc:"Euer TW hat den Ball und will flach zum Aufpasser spielen. Kein weiter Schlag!",
  task:"Wo muss der Aufpasser stehen, damit der TW sicher anspielt?",
  hint:"Nicht zu weit weg! Keine Gegner dazwischen.",
  ball:{from:{x:50,y:92},to:{x:38,y:80}},
  opps:[{x:42,y:78,label:"Gegner"},{x:58,y:75,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:53,y:65,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:52,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:80,y:52,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:38,y:80,r:13}
  },
  explain:{
    correct:"Genau! Nah und seitlich, keine Gegner in der Passlinie. So kann der TW sicher rausspielen!",
    wrong:"Tipp: Aufpasser muss sich in die freie Seite bewegen, wo kein Gegner den Pass abfangen kann."
  }
},
{
  title:"TW kommt heraus!",
  desc:"Ein hoher Ball fliegt in den Strafraum! Darf dein TW herauskommen?",
  task:"Schiebe den TW dahin, wo er den Ball sicher fangen kann!",
  hint:"Mutig rauslaufen – aber nicht zu weit raus!",
  ball:{from:{x:30,y:40},to:{x:40,y:75}},
  opps:[{x:35,y:72,label:"Gegner"},{x:55,y:70,label:"Gegner"}],
  start:[
    {name:"TW",x:53,y:95,cls:"tb-tw",role:"TW",locked:false},
    {name:"Aufpasser",x:48,y:78,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:58,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:58,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:40,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "TW":{x:42,y:80,r:12}
  },
  explain:{
    correct:"Mutig und richtig! Der TW läuft den Ball an und fängt ihn – bevor der Gegner rankommt!",
    wrong:"Tipp: Der TW soll mutig rauslaufen, aber nur bis dorthin, wo er den Ball sicher nehmen kann."
  }
},
{
  title:"TW bleibt in der Mitte",
  desc:"Euer TW steht zu weit rechts. Wo gehört er hin?",
  task:"Stelle den TW in die beste Position im Tor!",
  hint:"Der TW steht immer in der Mitte des Tores!",
  ball:{from:{x:50,y:92},to:{x:50,y:92}},
  opps:[{x:40,y:30,label:"Gegner"},{x:65,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:68,y:92,cls:"tb-tw",role:"TW",locked:false},
    {name:"Aufpasser",x:50,y:75,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "TW":{x:50,y:92,r:10}
  },
  explain:{
    correct:"Perfekt! In der Tormitte kann der TW nach beiden Seiten gleich gut reagieren!",
    wrong:"Tipp: Immer in die Tormitte! Sonst kann der Gegner leicht in die freie Ecke schießen."
  }
},
{
  title:"TW – Anweisungen geben",
  desc:"Der Gegner greift an! Dein TW sieht alles und muss den Aufpasser dirigieren!",
  task:"Schiebe Aufpasser in die beste Absicherungsposition!",
  hint:"Der TW 'sieht' alles – er ruft dem Aufpasser wo er hinlaufen soll!",
  ball:{from:{x:30,y:30},to:{x:30,y:30}},
  opps:[{x:28,y:28,label:"Gegner"},{x:45,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:55,y:74,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:48,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:75,y:52,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:35,y:65,r:14}
  },
  explain:{
    correct:"Toll! Der TW hat gerufen und der Aufpasser ist rechtzeitig zur Ballseite gelaufen!",
    wrong:"Tipp: Der TW ruft 'Auf links!' – Aufpasser muss schräg zur Ballseite laufen und absichern."
  }
},
{
  title:"TW – Sicheres Fangen",
  desc:"Der Gegner schießt! Dein TW muss den Ball sicher fangen.",
  task:"Schiebe den TW genau in die Schusslinie – Körper hinter den Ball!",
  hint:"Körper hinter den Ball, Hände vorne!",
  ball:{from:{x:35,y:30},to:{x:50,y:88}},
  opps:[{x:35,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:69,y:95,cls:"tb-tw",role:"TW",locked:false},
    {name:"Aufpasser",x:50,y:75,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "TW":{x:50,y:90,r:11}
  },
  explain:{
    correct:"Sehr gut! Genau in die Schusslinie gestellt – Körper hinter den Ball!",
    wrong:"Tipp: Der TW muss sich genau in die Schusslinie stellen. So fängt er den Ball sicher."
  }
},
{
  title:"TW – Abwurf zum Aufpasser",
  desc:"Dein TW hat den Ball gefangen! Jetzt schnell zum Aufpasser abwerfen.",
  task:"Wo bietet sich der Aufpasser am besten für den Abwurf an?",
  hint:"Abwurf = kurzer, sicherer Pass mit der Hand. Aufpasser soll frei und nah sein!",
  ball:{from:{x:50,y:90},to:{x:35,y:78}},
  opps:[{x:52,y:78,label:"Gegner"},{x:40,y:72,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:57,y:74,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:35,y:78,r:14}
  },
  explain:{
    correct:"Klasse! In die freie Zone angeboten – kein Gegner in der Nähe. Perfekter Abwurf!",
    wrong:"Tipp: Der Aufpasser muss weg von den Gegnern! In die freie Seite anbieten."
  }
},
{
  title:"TW – Flanke klären",
  desc:"Von links kommt eine hohe Flanke! Kommt der TW raus oder bleibt er?",
  task:"Schiebe den TW richtig – raus zur Flanke!",
  hint:"Wenn kein Gegner direkt am Ball ist, kommt der TW mutig raus!",
  ball:{from:{x:10,y:45},to:{x:35,y:78}},
  opps:[{x:55,y:75,label:"Gegner"},{x:45,y:80,label:"Gegner"}],
  start:[
    {name:"TW",x:54,y:95,cls:"tb-tw",role:"TW",locked:false},
    {name:"Aufpasser",x:50,y:78,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "TW":{x:38,y:82,r:13}
  },
  explain:{
    correct:"Mutig! Raus zur Flanke und den Ball fangen, bevor der Gegner köpfen kann!",
    wrong:"Tipp: Bei hohen Flanken mutig rauslaufen! Nicht auf der Linie warten."
  }
},
{
  title:"TW – Nach Parade aufbauen",
  desc:"Super Parade! Jetzt schnell und klug aufbauen.",
  task:"Schiebe Aufpasser und Flitzer R frei – der TW braucht Optionen!",
  hint:"Nach einer Parade: tief Luft holen, besten Mitspieler anlaufen, kurz anbieten!",
  ball:{from:{x:50,y:92},to:{x:50,y:92}},
  opps:[{x:55,y:78,label:"Gegner"},{x:50,y:72,label:"Gegner"},{x:60,y:65,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:56,y:73,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:77,y:45,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:35,y:80,r:14},
    "Flitzer R":{x:80,y:68,r:15}
  },
  explain:{
    correct:"Toll! Aufpasser links frei, Flitzer R rechts außen – zwei gute Optionen weg von den Gegnern!",
    wrong:"Tipp: Aufpasser und Flitzer R weg von den Gegnern anbieten! Links und rechts in die freien Räume."
  }
},
{
  title:"TW – Kurz oder weit spielen?",
  desc:"Dein TW hat den Ball. Vorne steht der Jäger frei – aber es ist weit!",
  task:"Biete Aufpasser kurz an – kurz und sicher ist fast immer besser!",
  hint:"Kurz und sicher schlägt weit und unsicher!",
  ball:{from:{x:50,y:92},to:{x:50,y:78}},
  opps:[{x:50,y:45,label:"Gegner"},{x:40,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:58,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:28,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:78,r:12}
  },
  explain:{
    correct:"Richtig! Kurzes Aufbauspiel ist sicherer – der Ball bleibt im Team!",
    wrong:"Tipp: Der weite Ball ist riskant. Aufpasser kurz anbieten und ruhig aufbauen!"
  }
},
// ══════ Block 8: Ballbesitz & Geduld (Szenarien 71–80) ══════
{
  title:"Geduld – nicht hetzen!",
  desc:"Drei Gegner sind in der Nähe. Trotzdem: kein Stress, geduldig bleiben!",
  task:"Schiebe alle Mitspieler in freie Räume – dann findet ihr die Lücke!",
  hint:"Erst schauen, dann spielen. Nicht einfach weghauen!",
  ball:{from:{x:50,y:68},to:{x:50,y:68}},
  opps:[{x:48,y:60,label:"Gegner"},{x:60,y:58,label:"Gegner"},{x:38,y:55,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:38,y:58,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:62,y:57,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:51,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:15,y:50,r:16},
    "Flitzer R":{x:85,y:50,r:16},
    "Jäger":{x:50,y:28,r:15}
  },
  explain:{
    correct:"Alle in freie Räume – der Aufpasser hat drei gute Optionen. Kein Stress!",
    wrong:"Tipp: Flitzer maximal breit, Jäger in die Tiefe. Dann hat der Aufpasser Optionen."
  }
},
{
  title:"Tempo rausnehmen",
  desc:"Ihr führt 2:0 und habt noch 5 Minuten! Jetzt Ball halten!",
  task:"Schiebe alle in sichere, tiefe Positionen!",
  hint:"Führung halten = Ball behalten. Tief stehen, kurze Pässe!",
  ball:{from:{x:50,y:72},to:{x:50,y:72}},
  opps:[{x:50,y:45,label:"Gegner"},{x:35,y:55,label:"Gegner"},{x:65,y:55,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:52,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:40,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:80,y:40,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:28,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:72,r:12},
    "Flitzer L":{x:25,y:62,r:14},
    "Flitzer R":{x:75,y:62,r:14},
    "Jäger":{x:50,y:52,r:14}
  },
  explain:{
    correct:"Kluge Entscheidung! Alle tief, enge Abstände, kurze Pässe – die Führung wird gehalten!",
    wrong:"Tipp: Bei Führung tief stehen! Alle zurückkommen, kurze sichere Pässe."
  }
},
{
  title:"Tempo des Spiels lesen",
  desc:"Alle sind müde. Was ist jetzt klug?",
  task:"Schiebe alle in eine ruhige, kompakte Ballhalte-Formation!",
  hint:"Müde = Tempo rausnehmen, Ball halten, Kräfte sparen!",
  ball:{from:{x:50,y:65},to:{x:50,y:65}},
  opps:[{x:48,y:45,label:"Gegner"},{x:35,y:52,label:"Gegner"},{x:62,y:50,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:10,y:42,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:90,y:42,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:22,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:28,y:55,r:15},
    "Flitzer R":{x:72,y:55,r:15},
    "Jäger":{x:50,y:48,r:14}
  },
  explain:{
    correct:"Gut gedacht! Enger zusammen, kurze Pässe – Spielintelligenz!",
    wrong:"Tipp: Nicht sprinten! Alle näherkommen, Feld kleiner, Ball zirkulieren."
  }
},
{
  title:"Überzahl schaffen",
  desc:"Rechts stehen Flitzer R und ein Gegner. Bring den Jäger dazu – 2 gegen 1!",
  task:"Schiebe Jäger auf rechts für die Überzahl!",
  hint:"Überzahl = mehr Spieler als Gegner auf einer Seite!",
  ball:{from:{x:78,y:48},to:{x:78,y:48}},
  opps:[{x:72,y:42,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:48,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:48,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:46,y:29,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:68,y:35,r:15}
  },
  explain:{
    correct:"Überzahl! 2 gegen 1 – einer kommt immer durch!",
    wrong:"Tipp: Jäger muss auf die Ballseite kommen. 2 gegen 1 = Überlegenheit!"
  }
},
{
  title:"Spiel verlagern",
  desc:"Links ist alles eng! Die rechte Seite ist frei.",
  task:"Verlagere das Spiel – schiebe Flitzer R maximal breit auf rechts!",
  hint:"Wenn links eng ist, spiele nach rechts! Verlagerung bringt Raum!",
  ball:{from:{x:22,y:45},to:{x:80,y:45}},
  opps:[{x:18,y:40,label:"Gegner"},{x:30,y:48,label:"Gegner"},{x:25,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:40,y:62,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:45,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:60,y:49,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer R":{x:82,y:45,r:14}
  },
  explain:{
    correct:"Klasse Verlagerung! Flitzer R breit rechts, viel Platz!",
    wrong:"Tipp: Flitzer R muss so weit rechts wie möglich – maximal breit, weg von den Gegnern."
  }
},
{
  title:"Ball in die Tiefe",
  desc:"Der Gegner steht hoch – dahinter ist viel Platz!",
  task:"Schiebe Jäger in den freien Raum hinter die Gegner!",
  hint:"Jäger läuft in die Tiefe – der Pass kommt in den Raum vor ihm!",
  ball:{from:{x:45,y:65},to:{x:52,y:25}},
  opps:[{x:40,y:35,label:"Gegner"},{x:55,y:38,label:"Gegner"},{x:30,y:40,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:44,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:52,y:22,r:14}
  },
  explain:{
    correct:"Super Tiefenläufer! Jäger sprintet hinter die Gegner-Abwehr!",
    wrong:"Tipp: Jäger muss tief laufen – hinter alle Gegner in den freien Raum!"
  }
},
{
  title:"Ballbesitz nach Einwurf",
  desc:"Einwurf für euch! Wie behaltet ihr den Ball direkt danach?",
  task:"Schiebe Flitzer L in eine gute Position zum Einwurf!",
  hint:"Mindestens zwei Anspielstationen! Einer kurz, einer weiter!",
  ball:{from:{x:2,y:45},to:{x:18,y:45}},
  opps:[{x:22,y:42,label:"Gegner"},{x:18,y:52,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:40,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:18,y:45,r:14}
  },
  explain:{
    correct:"Gut angeboten! Nah genug zum Einwurf, mit Platz dahinter. Annehmen, drehen, weiterverbinden!",
    wrong:"Tipp: Flitzer L nah genug anbieten, aber nicht direkt beim Gegner."
  }
},
{
  title:"Wann dribbeln, wann passen?",
  desc:"Zwei Gegner kommen auf dich zu. Flitzer R steht frei!",
  task:"Schiebe Jäger ins Dreieck – Passen ist hier besser als Dribbeln!",
  hint:"Wenn ein Mitspieler frei ist – spiele ihn an! Kein Risiko!",
  ball:{from:{x:45,y:55},to:{x:80,y:50}},
  opps:[{x:40,y:48,label:"Gegner"},{x:52,y:50,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:55,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:20,y:48,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:80,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:42,y:28,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:62,y:38,r:14}
  },
  explain:{
    correct:"Klug! Flitzer R ist frei – der Pass ist sicherer als Dribbeln gegen zwei!",
    wrong:"Tipp: Gegen zwei Gegner zu dribbeln ist zu riskant. Passen und Jäger ins Dreieck!"
  }
},
{
  title:"Ball sichern – Körper einsetzen",
  desc:"Der Pass kommt! Wie nimmst du ihn an, damit der Gegner nicht klaut?",
  task:"Schiebe Flitzer L in die beste Annahme-Position – Körper zwischen Ball und Gegner!",
  hint:"Erster Kontakt: Ball zum sicheren Fuß, Körper abschirmen!",
  ball:{from:{x:50,y:72},to:{x:22,y:50}},
  opps:[{x:25,y:48,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:72,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:70,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:22,y:50,r:12}
  },
  explain:{
    correct:"Super! Körper zwischen Ball und Gegner – so kann keiner klauen!",
    wrong:"Tipp: So drehen, dass der Körper den Gegner abschirmt. Ball nach innen annehmen."
  }
},
{
  title:"Vorausdenken – nach dem Pass",
  desc:"Aufpasser spielt zu Flitzer R. Aber wo läuft er danach hin?",
  task:"Schiebe Aufpasser nach dem Pass in eine neue Position – nie stehen bleiben!",
  hint:"Nach dem Pass immer weiterlaufen – in den freien Raum!",
  ball:{from:{x:50,y:68},to:{x:80,y:50}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:47,y:70,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:80,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:65,y:58,r:14}
  },
  explain:{
    correct:"Super! Nach dem Pass in den freien Raum für den Rückpass!",
    wrong:"Tipp: Nach dem Pass immer in den freien Raum laufen und sich wieder anbieten!"
  }
},
// ══════ Block 9: Verteidigen als Team (Szenarien 81–90) ══════
{
  title:"Helfen im Zweikampf",
  desc:"Der Gegner hat den Ball am Rand! Flitzer L ist alleine – hilf ihm!",
  task:"Schiebe Jäger dazu – zusammen seid ihr stärker! 💪",
  hint:"Wenn ein Mitspieler alleine gegen den Gegner kämpft, lauf hin und hilf!",
  ball:{from:{x:15,y:38},to:{x:15,y:38}},
  opps:[{x:15,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:48,y:70,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:15,y:42,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:48,y:28,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:22,y:32,r:14}
  },
  explain:{
    correct:"💪 Stark! Zu zweit den Ball erobern – echtes Teamwork!",
    wrong:"💡 Lauf zum Mitspieler und hilf ihm – zusammen seid ihr stärker!"
  }
},
{
  title:"1gg1 auf links",
  desc:"Der Gegner dribbelt auf eurer linken Seite! Flitzer L ist im 1gg1.",
  task:"Wie sichert die Raute ab? Verschiebe Aufpasser, Flitzer R und Jäger!",
  hint:"Einer presst, die anderen sichern ab. Nicht alle zum Ball laufen – einer bleibt immer dahinter!",
  ball:{from:{x:20,y:45},to:{x:20,y:45}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:53,y:74,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:45,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:80,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:25,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:35,y:62,r:14},
    "Flitzer R":{x:55,y:52,r:16},
    "Jäger":{x:35,y:38,r:14}
  },
  explain:{
    correct:"👏 Klasse! Aufpasser sichert dahinter, Flitzer R zur Mitte – Überzahl!",
    wrong:"💡 Aufpasser SCHRÄG DAHINTER absichern, Flitzer R zur Mitte verschieben!"
  }
},
{
  title:"Absichern hinter dem Zweikampf",
  desc:"Flitzer R kämpft! Wer sichert hinter ihm ab?",
  task:"Schiebe Aufpasser in die Absicherungs-Position!",
  hint:"Einer kämpft, einer steht dahinter bereit!",
  ball:{from:{x:78,y:42},to:{x:78,y:42}},
  opps:[{x:80,y:38,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:46,y:72,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:42,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:65,y:62,r:14}
  },
  explain:{
    correct:"Perfekte Absicherung! Schräg hinter Flitzer R – bereit bei Ballverlust!",
    wrong:"Tipp: SCHRÄG DAHINTER stehen, nicht neben Flitzer R. So kann er sofort eingreifen."
  }
},
{
  title:"Passweg zustellen",
  desc:"Der Gegner will den Ball nach links spielen. Stell dich in den Weg!",
  task:"Schiebe Flitzer L zwischen die zwei Gegner – blockiere den Pass! 🚧",
  hint:"Stell dich so hin, dass der Ball nicht zum anderen Gegner kommen kann!",
  ball:{from:{x:55,y:30},to:{x:55,y:30}},
  opps:[{x:55,y:28,label:"Gegner"},{x:22,y:38,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:20,y:50,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:72,y:38,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:35,y:32,r:14}
  },
  explain:{
    correct:"🚧 Super! Der Pass kommt nicht durch – du stehst genau richtig!",
    wrong:"💡 Stell dich zwischen die beiden Gegner, dann kann der Ball nicht durchkommen!"
  }
},
{
  title:"Flügel abschneiden",
  desc:"Der Gegner dribbelt links und will nach innen ziehen!",
  task:"Schiebe Flitzer L so, dass der Gegner nur nach außen kann!",
  hint:"Innen ist gefährlicher als außen – Weg nach innen sperren!",
  ball:{from:{x:18,y:32},to:{x:18,y:32}},
  opps:[{x:18,y:28,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:70,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:30,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:25,y:28,r:13}
  },
  explain:{
    correct:"Perfekt! Gegner kann nur nach außen – weg vom Tor!",
    wrong:"Tipp: Flitzer L muss den inneren Weg versperren! Gegner zur Linie drängen."
  }
},
{
  title:"Innenraum schützen",
  desc:"Der Gegner versucht durch die Mitte zu kommen! Mitte zumachen!",
  task:"Schiebe Aufpasser in die Mitte – den zentralen Raum versperren!",
  hint:"Die Mitte ist am gefährlichsten. Die Mitte schützen!",
  ball:{from:{x:50,y:35},to:{x:50,y:35}},
  opps:[{x:50,y:30,label:"Gegner"},{x:40,y:25,label:"Gegner"},{x:60,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:35,y:70,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:52,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:52,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:60,r:13}
  },
  explain:{
    correct:"Gut! Zentral den Weg zum Tor versperren!",
    wrong:"Tipp: Aufpasser muss in die Mitte und den direkten Weg zum Tor versperren."
  }
},
{
  title:"Kompakt verteidigen",
  desc:"Drei Gegner greifen an! Bleibt kompakt – keine Lücken!",
  task:"Schiebe alle eng zusammen!",
  hint:"Kompakt = enge Abstände, keine großen Lücken!",
  ball:{from:{x:50,y:28},to:{x:50,y:28}},
  opps:[{x:30,y:25,label:"Gegner"},{x:50,y:22,label:"Gegner"},{x:70,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:85,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:10,y:50,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:92,y:50,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:21,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:65,r:12},
    "Flitzer L":{x:30,y:52,r:14},
    "Flitzer R":{x:70,y:52,r:14},
    "Jäger":{x:50,y:42,r:13}
  },
  explain:{
    correct:"Kompakte Abwehr! Keine Lücken – der Gegner muss durch eine Wand!",
    wrong:"Tipp: Alle einrücken, eng beieinander – kompakt!"
  }
},
{
  title:"Rückzugslauf",
  desc:"Ball verloren! Schnell zurücklaufen und die Formation herstellen!",
  task:"Schalte um auf IGEL – alle Feldspieler zurück!",
  hint:"Nach Ballverlust sofort zurück! Nie vorne stehen bleiben!",
  ball:{from:{x:50,y:60},to:{x:50,y:40}},
  opps:[{x:50,y:38,label:"Gegner"},{x:35,y:45,label:"Gegner"},{x:65,y:45,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:51,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:16,y:34,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:84,y:34,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:17,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:72,r:13},
    "Flitzer L":{x:25,y:55,r:15},
    "Flitzer R":{x:75,y:55,r:15},
    "Jäger":{x:50,y:40,r:15}
  },
  explain:{
    correct:"Blitzschnell zurück! Die Raute steht zwischen Ball und Tor!",
    wrong:"Tipp: Nach Ballverlust sofort alle zurück – die Raute muss hinter den Ball kommen."
  }
},
{
  title:"Herausschieben aus der Defensive",
  desc:"Der Gegner steht in eurem Strafraum! Aktiv herausschieben!",
  task:"Schiebe Aufpasser mutig auf den Gegner zu – Raum zumachen!",
  hint:"Nicht ängstlich warten – aktiv zum Gegner gehen!",
  ball:{from:{x:50,y:72},to:{x:50,y:72}},
  opps:[{x:50,y:70,label:"Gegner"},{x:38,y:65,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:86,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:62,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:62,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:52,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:66,r:12}
  },
  explain:{
    correct:"Mutig! Kein Raum mehr für den Schuss – aktives Verteidigen!",
    wrong:"Tipp: Nicht stehenbleiben – aktiv auf den Gegner zugehen, Raum zumachen!"
  }
},
{
  title:"Konter verhindern",
  desc:"Ihr habt den Ball – aber passt auf bei Ballverlust! Wer sichert ab?",
  task:"Schiebe Aufpasser zurück zum Absichern!",
  hint:"Einer muss immer absichern wenn andere vorne sind!",
  ball:{from:{x:50,y:42},to:{x:50,y:42}},
  opps:[{x:45,y:38,label:"Gegner"},{x:60,y:30,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:34,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:18,y:32,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:82,y:32,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:18,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:55,r:13}
  },
  explain:{
    correct:"Gut gedacht! Aufpasser bleibt zurück – bei Ballverlust ist er da!",
    wrong:"Tipp: Aufpasser darf nicht mit nach vorne stürmen! Absichern ist seine Hauptaufgabe."
  }
},
// ══════ Block 10: Spielverständnis (Szenarien 91–100) ══════
{
  title:"Kommunizieren – laut rufen!",
  desc:"Flitzer R und Jäger wollen beide den Ball! Wer bekommt ihn?",
  task:"Schiebe Jäger weg – Flitzer R ruft 'Mein Ball!', Jäger weicht aus!",
  hint:"Wer ruft hat Vorrang. Der andere bietet sich woanders an!",
  ball:{from:{x:70,y:40},to:{x:70,y:40}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:68,y:42,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:78,y:44,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:62,y:28,r:15}
  },
  explain:{
    correct:"Kein Durcheinander! Flitzer R nimmt den Ball, Jäger bietet sich im freien Raum an!",
    wrong:"Tipp: Einer muss ausweichen! Jäger bewegt sich weg in den freien Raum."
  }
},
{
  title:"Freien Mitspieler sehen",
  desc:"Um dich stehen Gegner – aber jemand steht FREI!",
  task:"Schiebe Jäger dahin, wo er frei und anspielbar ist!",
  hint:"Immer umschauen – wo ist der Freie?",
  ball:{from:{x:50,y:65},to:{x:50,y:65}},
  opps:[{x:48,y:58,label:"Gegner"},{x:60,y:60,label:"Gegner"},{x:38,y:60,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:41,y:47,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:62,y:38,r:15}
  },
  explain:{
    correct:"Genau! Jäger im freien Raum – jetzt einfach anspielen!",
    wrong:"Tipp: In den Raum laufen wo KEINE Gegner sind – das ist die Lücke!"
  }
},
{
  title:"Räume erkennen",
  desc:"Wo haben die Gegner eine Lücke gelassen?",
  task:"Erkenne den freien Raum und schiebe Flitzer R dorthin!",
  hint:"Freier Raum ist Gold wert! Wo keine Gegner sind, hast du Platz!",
  ball:{from:{x:50,y:60},to:{x:50,y:60}},
  opps:[{x:20,y:35,label:"Gegner"},{x:35,y:30,label:"Gegner"},{x:40,y:45,label:"Gegner"},{x:25,y:50,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:48,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:60,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer R":{x:82,y:38,r:16}
  },
  explain:{
    correct:"Gut erkannt! Rechts ist alles frei – Flitzer R hat viel Platz!",
    wrong:"Tipp: Schau wo KEINE Gegner sind – rechts ist viel Raum!"
  }
},
{
  title:"Gegner-Wechsel lesen",
  desc:"Der Ball wechselt plötzlich von links nach rechts!",
  task:"Reagiere schnell – verschiebe die ganze Raute nach rechts!",
  hint:"Ballbewegung beobachten und die Raute sofort mitnehmen!",
  ball:{from:{x:22,y:35},to:{x:78,y:35}},
  opps:[{x:80,y:30,label:"Gegner"},{x:70,y:38,label:"Gegner"}],
  anim:[{role:"Aufpasser",to:{x:62,y:68}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:38,y:68,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:18,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:55,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:32,y:32,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:62,y:68,r:14},
    "Flitzer L":{x:45,y:50,r:16},
    "Flitzer R":{x:82,y:45,r:14},
    "Jäger":{x:68,y:32,r:14}
  },
  explain:{
    correct:"Blitzschnelle Reaktion! Raute sofort nach rechts verschoben!",
    wrong:"Tipp: Wenn der Ball die Seite wechselt, muss die GANZE Raute mit!"
  }
},
{
  title:"Pressing: Pressing-Auslöser erkennen",
  desc:"Der gegnerische Verteidiger bekommt einen schlechten Pass und muss sich drehen. Jetzt pressen!",
  task:"Erkennt den Pressing-Auslöser! Attackiert den unsicheren Gegner!",
  hint:"Schlechte Ballannahme = Signal zum Pressen! Der nächste Spieler attackiert sofort.",
  ball:{from:{x:60,y:20},to:{x:62,y:22}},
  opps:[{x:62,y:22,label:"Gegner"},{x:40,y:18,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  anim:[{role:"Jäger",to:{x:55,y:25}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:38,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:70,y:42,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:18,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:38,r:14},
    "Flitzer L":{x:38,y:22,r:14},
    "Flitzer R":{x:70,y:22,r:12}
  },
  explain:{
    correct:"🔥 Super gelesen! Schlechte Annahme = sofort drauf – Balleroberung!",
    wrong:"Tipp: Bei schlechter Ballannahme SOFORT pressen! Flitzer R geht zum Ball, Flitzer L deckt den anderen Verteidiger. Aufpasser kommt hoch als Absicherung."
  }
},
{
  title:"Pressing: Seitliches Pressing",
  desc:"Der Gegner spielt den Ball an der Seitenlinie entlang. Flitzer R soll pressen!",
  task:"Flitzer R setzt Pressing an der Seitenlinie. Wie unterstützt das Team?",
  hint:"Die Seitenlinie ist der zusätzliche Verteidiger! Den Gegner dort festnageln!",
  ball:{from:{x:75,y:35},to:{x:82,y:32}},
  opps:[{x:82,y:32,label:"Gegner"},{x:70,y:20,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:46,y:69,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:68,y:49,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:47,y:33,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:60,y:55,r:12},
    "Flitzer L":{x:45,y:48,r:12},
    "Flitzer R":{x:82,y:35,r:12},
    "Jäger":{x:68,y:25,r:14}
  },
  explain:{
    correct:"👏 Klasse! Flitzer R presst an der Linie – Jäger schneidet den Pass ab!",
    wrong:"Tipp: Die Seitenlinie ist euer VERBÜNDETER! Flitzer R drückt den Gegner raus. Jäger deckt den Pass nach vorne ab. Flitzer L und Aufpasser verschieben."
  }
},
{
  title:"Zweikampf gewinnen",
  desc:"Flitzer R läuft auf den Gegner zu! Wie stellt er sich richtig hin?",
  task:"Schiebe Flitzer R halbseitig – den Gegner nach außen drängen!",
  hint:"Halbseitig stellen = leicht versetzt, nicht direkt frontal!",
  ball:{from:{x:72,y:35},to:{x:72,y:35}},
  opps:[{x:72,y:32,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:55,y:51,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:28,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer R":{x:68,y:36,r:12}
  },
  explain:{
    correct:"Klasse! Halbseitig – der Gegner muss nach außen, weg vom Tor!",
    wrong:"Tipp: Nicht frontal, sondern leicht zur Innenseite versetzt aufstellen."
  }
},
{
  title:"Tor vor Augen – Abschluss!",
  desc:"Jäger hat den Ball nahe am Tor – frei!",
  task:"Schiebe Jäger in die beste Schussposition!",
  hint:"Nah am Tor und frei – schieß! Nicht zu lange warten!",
  ball:{from:{x:52,y:25},to:{x:50,y:12}},
  opps:[{x:50,y:5,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:42,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:42,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:54,y:34,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:50,y:14,r:12}
  },
  explain:{
    correct:"Ja! Nah ran und schießen – keine Angst!",
    wrong:"Tipp: Näher ran und abschließen! Frei und nah = Torchance!"
  }
},
{
  title:"Anführer auf dem Platz",
  desc:"Flitzer L steht am falschen Platz – in der Mitte statt auf links!",
  task:"Schiebe Flitzer L auf die richtige Raute-Position!",
  hint:"Jeder hat seinen Platz in der Raute – Mitspieler auch mal hinweisen!",
  ball:{from:{x:50,y:58},to:{x:50,y:58}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:70,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:50,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:28,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:20,y:50,r:14}
  },
  explain:{
    correct:"Genau! Flitzer L gehört links auf die Außenbahn!",
    wrong:"Tipp: Flitzer L steht in der Mitte – das ist der falsche Platz! Ab auf die linke Seite!"
  }
},
{
  title:"Endspurt – alles geben!",
  desc:"Ihr verliert 0:1, nur noch 2 Minuten! Vollangriff!",
  task:"Alle nach vorne! Voller Angriff – auch der Aufpasser!",
  hint:"Wenn ihr unbedingt ein Tor braucht: alle nach vorne!",
  ball:{from:{x:50,y:70},to:{x:50,y:70}},
  opps:[{x:50,y:25,label:"Gegner"},{x:35,y:35,label:"Gegner"},{x:65,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:70,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:45,r:14},
    "Flitzer L":{x:20,y:30,r:15},
    "Flitzer R":{x:80,y:30,r:15},
    "Jäger":{x:50,y:15,r:14}
  },
  explain:{
    correct:"Alles nach vorne! Risiko erlaubt – wir brauchen das Tor!",
    wrong:"Tipp: Letzte Minute = alle nach vorne! Aufpasser rückt auf, Flitzer ganz hoch, Jäger vorne!"
  }
}
];
