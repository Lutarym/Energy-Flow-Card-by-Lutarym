/**
 * Energy-Flow-Card-by-Lutarym (energy-flow-card-by-lutarym)
 * https://github.com/Lutarym/Energy-Flow-Card-by-Lutarym
 *
 * Copyright (C) 2026 Lutarym (Stephan Fröbe)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const CARD_VERSION = "1.6.0";
const CARD_TAG = "energy-flow-card-by-lutarym";
const EDITOR_TAG = "energy-flow-card-by-lutarym-editor";

/* ------------------------------------------------------------------ *
 *  Farben
 *  Jedes Geraet hat seine eigene, feste Farbe fuer Ring und Symbol, passend
 *  zu dem, was es tut: PV gelb wie die Sonne, Netz blau wie im Energie-
 *  Dashboard von Home Assistant, Akku gruen wie ein voller Ladestand,
 *  Waermepumpe orange fuer Waerme, Wallbox tuerkis fuer E-Mobilitaet,
 *  Wechselrichter silbern, Haus und Verbraucher weiss und hellgrau.
 *
 *  Die Leitungen tragen die Farbe der Quelle, aus der der Strom gerade
 *  stammt: PV gelb, Netz blau, Akku gruen. Laedt etwa das Netz den Akku,
 *  ist der ganze Weg vom Netz bis zum Akku blau. Kommt der Strom aus zwei
 *  Quellen, wechseln sich beide Farben ab.
 * ------------------------------------------------------------------ */
const FARBE = {
  pv: "#FFC107",
  netz: "#3D8BFF",
  akku: "#22E07A",
};

// Eigene Farben der Geraete, die keine Quelle sind.
const GERAET = {
  wr: "#A9B8C9",
  haus: "#FFFFFF",
  wp: "#FF7A1A",
  wallbox: "#00D7D2",
};

// Vorgabe fuer die weiteren Verbraucher, je Verbraucher aenderbar.

/** Farbe aus der Konfiguration: Text wie #RRGGBB oder Liste [r, g, b]. */
function farbeAus(wert, ersatz) {
  if (Array.isArray(wert) && wert.length === 3) return `rgb(${wert.map((x) => Number(x) || 0).join(",")})`;
  if (typeof wert === "string" && wert.trim()) return wert.trim();
  return ersatz;
}

// Strichmuster fuer gemischten Strom: In MISCH_STRICHE Strichen bekommt
// jede Quelle so viele Striche, wie ihrem Anteil entspricht. Eine Quelle
// ab MISCH_MIN Anteil bekommt mindestens einen Strich.
const MISCH_STRICHE = 12;
const MISCH_MIN = 0.03;
// Erst ab dieser Aenderung eines Anteils werden die Striche neu verteilt.
const MISCH_RUHE = 0.06;

/**
 * Ermittelt aus Anteilen [[farbe, watt], ...] die Hauptfarbe und die
 * Anteile aller Quellen, groesste zuerst.
 */
function mischung(anteile) {
  // Die Reihenfolge der Quellen bleibt fest wie uebergeben. Wuerde nach
  // Groesse sortiert, tauschten die Strichspuren bei fast gleichen Anteilen
  // staendig ihre Farben und die Striche sprangen.
  const liste = anteile.filter(([, w]) => w > 0);
  const summe = liste.reduce((a, [, w]) => a + w, 0);
  if (!liste.length) return { haupt: null, teile: [] };
  const groesste = liste.reduce((a, b) => (b[1] > a[1] ? b : a));
  return { haupt: groesste[0], teile: liste.map(([farbe, w]) => ({ farbe, anteil: w / summe })) };
}

/**
 * Verteilt MISCH_STRICHE Striche auf die Quellen, anteilig und gleichmaessig
 * gestreut. Ergebnis: fuer jeden Strich die Nummer der Quelle.
 */
function strichZahlen(teile) {
  const n = MISCH_STRICHE;
  // Jede Quelle mindestens einen Strich, der Rest nach groesstem Rest, so
  // ergibt die Summe immer genau n.
  const roh = teile.map((t) => t.anteil * n);
  const zahl = roh.map((r) => Math.max(1, Math.floor(r)));
  let rest = n - zahl.reduce((a, b) => a + b, 0);
  const nachRest = roh.map((r, k) => ({ k, r: r - Math.floor(r) })).sort((a, b) => b.r - a.r);
  for (let i = 0; rest > 0; i = (i + 1) % nachRest.length, rest--) zahl[nachRest[i].k]++;
  while (rest < 0) {
    const k = zahl.indexOf(Math.max(...zahl));
    zahl[k]--;
    rest++;
  }
  return zahl;
}

function strichFolge(zahl) {
  const stand = zahl.map(() => 0);
  const folge = [];
  const gesamt = zahl.reduce((a, b) => a + b, 0);
  for (let i = 0; i < gesamt; i++) {
    let beste = 0;
    zahl.forEach((z, k) => { stand[k] += z; if (stand[k] > stand[beste]) beste = k; });
    stand[beste] -= gesamt;
    folge.push(beste);
  }
  return folge;
}

/**
 * Strichmuster einer Quelle: In ihren Strichen das normale Muster, sonst
 * Luecke. Beginnt das Muster mit einer Luecke, wird es gedreht, der
 * Versatz gleicht das aus.
 */
function spurMuster(folge, quelle, dash) {
  const periode = dash.reduce((a, b) => a + b, 0);
  const teile = [];
  const luecke = (l) => {
    if (teile.length && teile[teile.length - 1].aus) teile[teile.length - 1].l += l;
    else teile.push({ aus: true, l });
  };
  folge.forEach((q) => {
    if (q === quelle) dash.forEach((l, i) => (i % 2 ? luecke(l) : teile.push({ aus: false, l })));
    else luecke(periode);
  });
  let basis = 0;
  if (teile.length && teile[0].aus) {
    const erste = teile.shift();
    basis = -erste.l;
    luecke(erste.l);
  }
  return { muster: teile.map((t) => t.l.toFixed(2)).join(" "), basis, laenge: periode * folge.length };
}

/* ------------------------------------------------------------------ *
 *  Farbschemas
 *  Hintergrund, Kreise, Leitungen und Schrift. Die Farben der Quellen
 *  (PV gelb, Netz blau, Akku gruen) und der Geraete bleiben in allen
 *  Schemas gleich, damit die Herkunft des Stroms immer gleich aussieht.
 *  "ha" uebernimmt die Farben des aktiven Home Assistant Designs,
 *  "auto" waehlt hell oder dunkel passend zu Home Assistant.
 * ------------------------------------------------------------------ */
const THEMEN = {
  dunkel: {
    bg: "linear-gradient(180deg, #131A24 0%, #0D131B 100%)", text: "#E8EDF4",
    knoten: "#111821", knotenRand: "#2A3445", rohr: "#2E3848", huelle: "#0B1017",
    label: "#D2DAE5", labelBg: "#0F151D", icon: "#55657F", wert: "#FFFFFF", sub: "#C4CEDB",
    aus: "#9AA6B6", kontur: "#0B1017", infoBg: "#0F151D", infoRand: "#2A3445",
    saeule: "#111821", saeuleRand: "#C3D0E0", neutral: "#46536A", haus: "#FFFFFF", verbraucher: "#D5DCE6",
    demoBg: "#16233A", demoRand: "#3E6EA8", demoText: "#B8D0EC",
    hinweisBg: "#2A2313", hinweisRand: "#B07B2E", hinweisText: "#F2DFB0",
  },
  hell: {
    bg: "linear-gradient(180deg, #F8FAFC 0%, #EDF1F6 100%)", text: "#1A2330",
    knoten: "#FFFFFF", knotenRand: "#C9D3DF", rohr: "#C5CFDB", huelle: "#E3E9F0",
    label: "#3A4656", labelBg: "#EDF1F6", icon: "#8A97A8", wert: "#0F1722", sub: "#4A5768",
    aus: "#8A97A8", kontur: "#FFFFFF", infoBg: "#FFFFFF", infoRand: "#C9D3DF",
    saeule: "#FFFFFF", saeuleRand: "#8A97A8", neutral: "#B8C3D0", haus: "#1F2A37", verbraucher: "#5B6B80",
    demoBg: "#E6EFFB", demoRand: "#7FA4D6", demoText: "#24476F",
    hinweisBg: "#FBF1DD", hinweisRand: "#D3A253", hinweisText: "#6A4A12",
  },
  ha: {
    bg: "var(--ha-card-background, var(--card-background-color, #1C1C1C))", text: "var(--primary-text-color)",
    knoten: "var(--ha-card-background, var(--card-background-color, #1C1C1C))", knotenRand: "var(--divider-color)",
    rohr: "var(--divider-color)", huelle: "var(--secondary-background-color, transparent)",
    label: "var(--secondary-text-color)", labelBg: "var(--ha-card-background, var(--card-background-color, #1C1C1C))",
    icon: "var(--secondary-text-color)", wert: "var(--primary-text-color)", sub: "var(--secondary-text-color)",
    aus: "var(--disabled-text-color, var(--secondary-text-color))",
    kontur: "var(--ha-card-background, var(--card-background-color, #1C1C1C))",
    infoBg: "var(--secondary-background-color, transparent)", infoRand: "var(--divider-color)",
    saeule: "var(--ha-card-background, var(--card-background-color, #1C1C1C))", saeuleRand: "var(--secondary-text-color)",
    neutral: "var(--disabled-text-color, #9E9E9E)", haus: "var(--primary-text-color)", verbraucher: "var(--secondary-text-color)",
    demoBg: "var(--secondary-background-color, transparent)", demoRand: "var(--primary-color)", demoText: "var(--primary-text-color)",
    hinweisBg: "var(--secondary-background-color, transparent)", hinweisRand: "var(--warning-color, #FFA600)", hinweisText: "var(--primary-text-color)",
  },
  // Reines Schwarz, gut fuer Wandtablets mit OLED-Anzeige.
  oled: {
    bg: "#000000", text: "#E6E6E6",
    knoten: "#050505", knotenRand: "#1E1E1E", rohr: "#262626", huelle: "#000000",
    label: "#D0D0D0", labelBg: "#000000", icon: "#5A5A5A", wert: "#FFFFFF", sub: "#BDBDBD",
    aus: "#8A8A8A", kontur: "#000000", infoBg: "#050505", infoRand: "#1E1E1E",
    saeule: "#050505", saeuleRand: "#9A9A9A", neutral: "#3A3A3A", haus: "#FFFFFF", verbraucher: "#D5DCE6",
    demoBg: "#0A0F18", demoRand: "#2D4E78", demoText: "#AFC4E0",
    hinweisBg: "#140F05", hinweisRand: "#7A5520", hinweisText: "#EBD3A0",
  },
  // Tiefes Nachtblau, ruhig und kontrastreich.
  mitternacht: {
    bg: "linear-gradient(180deg, #0D1834 0%, #060C1F 100%)", text: "#E3EAF8",
    knoten: "#0E1A38", knotenRand: "#213463", rohr: "#22335C", huelle: "#050A18",
    label: "#C9D6F2", labelBg: "#0A142C", icon: "#5F76A8", wert: "#FFFFFF", sub: "#B8C7E6",
    aus: "#8C9CC0", kontur: "#050A18", infoBg: "#0A142C", infoRand: "#213463",
    saeule: "#0E1A38", saeuleRand: "#AFC1E6", neutral: "#3A4E7E", haus: "#FFFFFF", verbraucher: "#D5DCE6",
    demoBg: "#13234A", demoRand: "#3E6EA8", demoText: "#B8D0EC",
    hinweisBg: "#2A2313", hinweisRand: "#B07B2E", hinweisText: "#F2DFB0",
  },
  // Neutrales Grau ohne Blaustich, passt zu schlichten Dashboards.
  graphit: {
    bg: "linear-gradient(180deg, #2E3033 0%, #242628 100%)", text: "#ECEDEF",
    knoten: "#303235", knotenRand: "#45484D", rohr: "#4A4D52", huelle: "#1C1D1F",
    label: "#DADCDF", labelBg: "#2A2C2F", icon: "#8A8E95", wert: "#FFFFFF", sub: "#C9CCD1",
    aus: "#9EA2A8", kontur: "#1C1D1F", infoBg: "#2A2C2F", infoRand: "#45484D",
    saeule: "#303235", saeuleRand: "#C9CCD1", neutral: "#5A5E64", haus: "#FFFFFF", verbraucher: "#D5DCE6",
    demoBg: "#2F3540", demoRand: "#5A7AA8", demoText: "#C7D5EA",
    hinweisBg: "#3A3222", hinweisRand: "#B07B2E", hinweisText: "#F2DFB0",
  },
};
const THEMA_NAMEN = ["auto", "dunkel", "hell", "ha", "oled", "mitternacht", "graphit"];

/* ------------------------------------------------------------------ *
 *  Zeichenraster, vier Spalten und drei Reihen:
 *    PV        Platz     Platz     Platz
 *    Netz      (frei)    Haus      Platz
 *    Akku      Platz     Platz     Platz
 *  Das Haus steht in der Mitte von sieben Plaetzen fuer Waermepumpe,
 *  Wallbox und die weiteren Verbraucher. PV, Netz und Akku stehen links
 *  davon, zwischen ihnen und dem Haus bleibt der Platz frei, dort laufen
 *  ihre Leitungen. Jeder Kreis hat eine eigene Leitung zum Haus, nichts
 *  kreuzt sich. Die Leitungen beginnen in den Kreismitten, die Kreise
 *  liegen darueber.
 * ------------------------------------------------------------------ */
const G = {
  W: 600,
  W_BREIT: 800,
  H: 520,
  H_KURZ: 340,
  R: 56,
  PV: { x: 100, y: 90 },
  NETZ: { x: 100, y: 260 },
  AKKU: { x: 100, y: 430 },
  HAUS: { x: 520, y: 260 },
};

/** Abstand nebeneinander laufender Leitungen, ueberall gleich. */
const LEITUNG_ABSTAND = 17;
const D = LEITUNG_ABSTAND;

// PV und Akku laufen links durch die Luecke und dann durch den freien
// Platz ins Haus, das Netz gerade von links.
const LEITUNGEN = {
  pv_haus: `M100 90 V 162.5 H 205 V ${260 - D} H 520`,
  netz_haus: "M100 260 H 520",
  akku_haus: `M100 430 V 345 H 205 V ${260 + D} H 520`,
};

/** Die sieben Plaetze rund um das Haus. */
const PLAETZE = {
  links_oben: { x: 310, y: 90 },
  oben: { x: 520, y: 90 },
  rechts_oben: { x: 730, y: 90 },
  rechts: { x: 730, y: 260 },
  rechts_unten: { x: 730, y: 430 },
  unten: { x: 520, y: 430 },
  links_unten: { x: 310, y: 430 },
};
const PLATZ_NAMEN = Object.keys(PLAETZE);

/**
 * Leitung vom Haus zu jedem Platz. Alle Abgaenge am Haus haben den
 * gleichen Abstand: links fuenf (Platz links oben, PV, Netz, Akku,
 * Platz links unten), rechts drei, oben und unten je einer.
 */
const PLATZ_PFAD = {
  oben: "M520 260 V 90",
  unten: "M520 260 V 430",
  rechts: "M520 260 H 730",
  links_oben: `M520 ${260 - 2 * D} H 415 V 90 H 310`,
  links_unten: `M520 ${260 + 2 * D} H 415 V 430 H 310`,
  rechts_oben: `M520 ${260 - D} H 625 V 90 H 730`,
  rechts_unten: `M520 ${260 + D} H 625 V 430 H 730`,
};

/**
 * Infofelder der Abrechnung auf dem freien Platz zwischen Netz und Haus,
 * eines ueber und eines unter den Leitungen von PV, Netz und Akku.
 */
const ABR = { X: 310, OBEN: 192, UNTEN: 328, HOEHE: 52, BREITE_MIN: 148, BREITE_MAX: 176 };
// Abrechnungswerte neu holen nach so vielen Millisekunden.
const ABR_INTERVALL = 10 * 60 * 1000;
const ORTE = { de: "de-DE", en: "en-US", fr: "fr-FR", ja: "ja-JP" };

/** Reihenfolge, in der freie Plaetze an Verbraucher ohne Wunsch gehen. */
const PLATZ_FOLGE = ["links_oben", "links_unten", "rechts_oben", "rechts", "rechts_unten", "oben", "unten"];

/* ------------------------------------------------------------------ *
 *  Kleine Symbole in den Kreisen, 24er Raster um den Nullpunkt
 * ------------------------------------------------------------------ */
const STRAHLEN = Array.from({ length: 8 }, (_, i) => {
  const w = (i * Math.PI) / 4;
  const a = 8.5;
  const b = 12;
  return `M${(Math.cos(w) * a).toFixed(1)} ${(Math.sin(w) * a).toFixed(1)} L${(Math.cos(w) * b).toFixed(1)} ${(Math.sin(w) * b).toFixed(1)}`;
}).join(" ");
const ICON = {
  pv: `<circle r="5"/><g id="pv-strahlen">${`<path d="${STRAHLEN}"/>`}</g>`,
  netz: `<path d="M-6 11 L-2 -10 L2 -10 L6 11 M-2 -10 L0 -13 L2 -10 M-9 -5 H 9 M-7 1 H 7 M-4 -4 L4 6 M4 -4 L-4 6"/>`,
  akku: `<rect x="-6" y="-9" width="12" height="20" rx="2"/><path d="M-2.5 -11.5 H 2.5"/><path id="akku-blitz" d="M1 -5 L-3 1.5 H 1 L-1 7 L3 0.5 H -1 Z" fill="currentColor" stroke="none" opacity="0"/>`,
  haus: `<path d="M-10 -1 L0 -10 L10 -1 M-7 -3 V 10 H 7 V -3"/><path d="M-2 10 V 4 H 2 V 10"/>`,
  wr: `<rect x="-10" y="-10" width="20" height="20" rx="3"/><path d="M-6 1 C -4.5 -4, -1.5 -4, 0 1 S 4.5 6, 6 1"/>`,
  wp: `<g id="wp-rotor">${[0, 120, 240].map((r) => `<path d="M0 0 C 2 -2, 6 -6, 3 -11 C 0 -10, -2 -6, 0 0 Z" fill="currentColor" stroke="none" transform="rotate(${r})"/>`).join("")}</g><circle r="11.5"/>`,
  wb: `<rect x="-7" y="-11" width="14" height="19" rx="3"/><path d="M0 8 V 12" /><path id="wb-blitz" d="M1 -7 L-3 -1 H 1 L-1 5 L3 -1 H -1 Z" fill="currentColor" stroke="none"/>`,
};

// Ersatzlaenge eines Strichmusters, falls ein Stil keine Laenge liefert.
const STRICH_PERIODE = 20;

/* ------------------------------------------------------------------ *
 *  Animationsstile der Leitungen
 *  dash:    Strich und Luecke, ein Durchlauf ist die Summe aller Werte
 *  breite:  Strichstaerke, schein: Breite und Deckkraft der Leuchtspur
 *  tempo:   Faktor auf die Laufgeschwindigkeit
 *  atmen:   die Leuchtspur pulsiert zusaetzlich
 *  zucken:  die Striche flackern unregelmaessig wie Strom
 * ------------------------------------------------------------------ */
const STILE = {
  striche:  { dash: [6, 14],               breite: 3.5, schein: [9, 0.18],  tempo: 1 },
  punkte:   { dash: [0.1, 11],             breite: 5,   schein: [11, 0.16], tempo: 1 },
  perlen:   { dash: [0.1, 26],             breite: 8,   schein: [16, 0.22], tempo: 0.9 },
  lang:     { dash: [16, 10],              breite: 3,   schein: [9, 0.15],  tempo: 1.1 },
  komet:    { dash: [1, 3, 2, 3, 4, 3, 9, 34], breite: 3.5, schein: [10, 0.2], tempo: 1.3 },
  morse:    { dash: [10, 6, 0.1, 6],       breite: 3.5, schein: [9, 0.16],  tempo: 1 },
  lauflicht:{ dash: [26, 150],             breite: 4,   schein: [14, 0.35], tempo: 1.8 },
  neon:     { dash: [6, 14],               breite: 3,   schein: [16, 0.5],  tempo: 1 },
  puls:     { dash: [2, 4],                breite: 2.5, schein: [14, 0.3],  tempo: 0.6, atmen: true },
  blitz:    { dash: [3, 2, 8, 2, 1, 14],   breite: 2.5, schein: [12, 0.35], tempo: 1.6, zucken: true },
};
const STIL_NAMEN = Object.keys(STILE);

/* ------------------------------------------------------------------ *
 *  Texte
 * ------------------------------------------------------------------ */
const SPRACHEN = ["de", "en", "fr", "ja"];
const TEXTE = {
  de: {
    pv: "PV",
    netz: "Netz",
    akku: "Akku",
    haus: "Haus",
    wr: "Wechselrichter",
    wp: "Wärmepumpe",
    wallbox: "Wallbox",
    verbraucher: "Verbraucher",
    aus: "aus",
    nv: "n. v.",
    hinweis: "Noch keine Entitäten zugeordnet. Bitte im Editor zuordnen oder den Demomodus einschalten.",
    demo: "Demomodus: Beispielwerte, keine echten Daten.",
    beschreibung: "Animierte Energieflusskarte mit PV, Netz, Akku, Haus, Wärmepumpe, Wallbox und weiteren Verbrauchern.",
    bezug_seit: "Bezug seit {d}",
    verlauf_laedt: "lädt …",
    verlauf_leer: "Keine Verlaufsdaten vorhanden. Der Sensor braucht eine Statistik (state_class: measurement).",
    verlauf_mittel: "Mittel",
    verlauf_max: "Höchstwert",
    verlauf_energie: "Energie",
    kosten_bis: "Kosten bis heute",
  },
  en: {
    pv: "Solar",
    netz: "Grid",
    akku: "Battery",
    haus: "Home",
    wr: "Inverter",
    wp: "Heat pump",
    wallbox: "Wallbox",
    verbraucher: "Consumers",
    aus: "off",
    nv: "n/a",
    hinweis: "No entities assigned yet. Please assign them in the editor or switch on demo mode.",
    demo: "Demo mode: sample values, no real data.",
    beschreibung: "Animated energy flow card with solar, grid, battery, home, heat pump, wallbox and further consumers.",
    bezug_seit: "Import since {d}",
    verlauf_laedt: "loading …",
    verlauf_leer: "No history available. The sensor needs statistics (state_class: measurement).",
    verlauf_mittel: "Average",
    verlauf_max: "Peak",
    verlauf_energie: "Energy",
    kosten_bis: "Cost to date",
  },
  fr: {
    pv: "Solaire",
    netz: "Réseau",
    akku: "Batterie",
    haus: "Maison",
    wr: "Onduleur",
    wp: "Pompe à chaleur",
    wallbox: "Borne",
    verbraucher: "Consommateurs",
    aus: "arrêt",
    nv: "n/d",
    hinweis: "Aucune entité attribuée. Attribuez-les dans l'éditeur ou activez le mode démo.",
    demo: "Mode démo : valeurs d'exemple, pas de données réelles.",
    beschreibung: "Carte animée du flux d'énergie : solaire, réseau, batterie, maison, pompe à chaleur, borne et autres consommateurs.",
    bezug_seit: "Soutiré depuis {d}",
    verlauf_laedt: "chargement …",
    verlauf_leer: "Aucun historique disponible. Le capteur a besoin de statistiques (state_class: measurement).",
    verlauf_mittel: "Moyenne",
    verlauf_max: "Maximum",
    verlauf_energie: "Énergie",
    kosten_bis: "Coût à ce jour",
  },
  ja: {
    pv: "太陽光",
    netz: "系統",
    akku: "蓄電池",
    haus: "家庭",
    wr: "パワコン",
    wp: "ヒートポンプ",
    wallbox: "EV充電器",
    verbraucher: "その他の機器",
    aus: "オフ",
    nv: "取得不可",
    hinweis: "エンティティが未設定です。エディターで設定するか、デモモードを有効にしてください。",
    demo: "デモモード：サンプル値です。実際のデータではありません。",
    beschreibung: "太陽光、系統、蓄電池、家庭、ヒートポンプ、EV充電器、その他の機器のエネルギーフローを表示するアニメーションカード。",
    bezug_seit: "{d} 以降の買電",
    verlauf_laedt: "読み込み中 …",
    verlauf_leer: "履歴がありません。センサーには統計（state_class: measurement）が必要です。",
    verlauf_mittel: "平均",
    verlauf_max: "最大",
    verlauf_energie: "電力量",
    kosten_bis: "現在までの電気代",
  },
};

/** Sprachen mit Dezimalkomma. */
const KOMMA_SPRACHEN = ["de", "fr"];

/**
 * Ungefaehre Breite eines Namens in Zeichen. Japanische Zeichen sind
 * deutlich breiter als lateinische, sonst waere der Hintergrund zu kurz.
 */
function textBreite(text) {
  let n = 0;
  for (const z of String(text)) n += z.codePointAt(0) >= 0x2e80 ? 1.5 : 1;
  return n;
}

function t(schluessel, sprache) {
  const satz = TEXTE[sprache] || TEXTE.en;
  return satz[schluessel] !== undefined ? satz[schluessel] : TEXTE.en[schluessel] || schluessel;
}

/* ------------------------------------------------------------------ *
 *  Grundeinstellungen
 * ------------------------------------------------------------------ */
const DEFAULT_CONFIG = {
  language: "auto",
  demo: false,
  animate: true,
  // Faktor fuer die Animationsgeschwindigkeit, 1 ist normal.
  animation_speed: 1,
  // Faktor fuer alle Schriften der Karte, 1 ist normal.
  font_scale: 1,
  // Namen ueber und unter den Kreisen anzeigen.
  show_names: true,
  // Farbschema, siehe THEMEN. "auto" folgt Home Assistant hell oder dunkel.
  theme: "dunkel",
  // Aussehen der laufenden Leitungen, siehe STILE.
  animation_style: "striche",
  // Akkusaeule rechts neben dem Fluss.
  battery_bar: true,
  battery_bar_animation: 1,
  battery_bar_percent: true,
  // Breite der Akkusaeule in Prozent ihrer Hoehe.
  battery_bar_width: 22,
  // Kapazitaet des Akkus in kWh, falls keine Entitaet sie liefert.
  battery_capacity_kwh: 0,
  // Leistung, bei der die Striche am schnellsten laufen, in Watt.
  max_power: 10000,
  // Unterhalb dieser Leistung in Watt anzeigen, darueber in kW.
  kw_threshold: 1000,
  // Kleinere Leistungen gelten als Stillstand.
  min_flow: 10,
  grid_invert: false,
  battery_invert: false,
  // Abrechnung: Stichtag (JJJJ-MM-TT), Arbeitspreis in ct/kWh und
  // Grundgebuehr pro Monat. Leer oder 0 heisst: nicht anzeigen.
  billing_date: "",
  price_per_kwh: 0,
  base_fee_month: 0,
  entities: {},
  consumers: [],
};

const MAX_VERBRAUCHER = 7;

/**
 * Sucht alle Leistungssensoren eines Raums: Sensoren, die selbst im Raum
 * stehen, und Sensoren ohne eigenen Raum, deren Geraet im Raum steht.
 * Ausgeblendete, Diagnose- und ausgeschlossene Sensoren fallen weg.
 */
function raumSensorenSuchen(hass, raum, ohne) {
  if (!hass || !hass.entities || !raum) return [];
  const geraete = hass.devices || {};
  const aus = new Set(ohne || []);
  return Object.values(hass.entities).filter((e) => {
    if (!e || !e.entity_id || !e.entity_id.startsWith("sensor.") || aus.has(e.entity_id)) return false;
    if (e.hidden || e.entity_category) return false;
    const imRaum = e.area_id
      ? e.area_id === raum
      : Boolean(e.device_id && geraete[e.device_id] && geraete[e.device_id].area_id === raum);
    if (!imRaum) return false;
    const st = hass.states[e.entity_id];
    if (!st || !st.attributes) return false;
    const einheit = String(st.attributes.unit_of_measurement || "").trim().toLowerCase();
    return st.attributes.device_class === "power" || ["w", "kw", "mw"].includes(einheit);
  }).map((e) => e.entity_id);
}

/**
 * Beginn des laufenden Abrechnungszeitraums. Nur Tag und Monat zaehlen,
 * jedes Jahr an diesem Tag beginnt ein neuer Zeitraum. Liegt der Tag in
 * diesem Jahr noch in der Zukunft, gilt der Tag im Vorjahr. Den 29.02.
 * gibt es nicht jedes Jahr, dann gilt der letzte Tag des Monats.
 */
function abrechnungsBeginn(monat, tag, heute) {
  if (!(monat >= 1 && monat <= 12 && tag >= 1 && tag <= 31)) return null;
  const am = (jahr) => {
    const letzter = new Date(jahr, monat, 0).getDate();
    return new Date(jahr, monat - 1, Math.min(tag, letzter));
  };
  const diesesJahr = am(heute.getFullYear());
  return diesesJahr <= heute ? diesesJahr : am(heute.getFullYear() - 1);
}

/** Leistung eines Zustands in Watt, oder null. */
function wattAus(st) {
  if (!st) return null;
  let v = parseFloat(st.state);
  if (Number.isNaN(v)) return null;
  const einheit = String((st.attributes && st.attributes.unit_of_measurement) || "").trim().toLowerCase();
  if (einheit === "kw") v *= 1000;
  else if (einheit === "mw") v *= 1000000;
  return v;
}

/** Namensfelder und der Text, der ohne eigenen Namen in der Grafik steht. */
const NAME_STANDARD = {
  name_pv: "pv", name_grid: "netz", name_battery: "akku",
  name_home: "haus", name_heatpump: "wp", name_wallbox: "wallbox",
};

/* ------------------------------------------------------------------ *
 *  Hilfsfunktionen
 * ------------------------------------------------------------------ */
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function kuerzen(text, max) {
  const s = String(text || "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Bildet eine Leistung logarithmisch auf 0 bis 1 ab.
 * Kleine Leistungen sollen schon sichtbar laufen, grosse nicht ins
 * Unendliche beschleunigen.
 */
function anteil(w, max) {
  if (!w || w <= 0) return 0;
  const oben = Math.log10(1 + (max || 10000) / 50);
  return clamp(Math.log10(1 + w / 50) / oben, 0, 1);
}

/* ------------------------------------------------------------------ *
 *  Symbole fuer weitere Verbraucher
 *  Eigene, einfache Strichzeichnungen im 24er Raster um den Nullpunkt.
 * ------------------------------------------------------------------ */
const SYMBOLE = {
  steckdose: `<circle r="10"/><circle cx="-3.5" cy="0" r="1.4" fill="currentColor"/><circle cx="3.5" cy="0" r="1.4" fill="currentColor"/>`,
  waschmaschine: `<rect x="-10" y="-11" width="20" height="22" rx="3"/><circle cx="0" cy="2" r="6"/><path d="M-6 -7 H -2"/>`,
  spuelmaschine: `<rect x="-10" y="-11" width="20" height="22" rx="3"/><path d="M-10 -5 H 10 M-5 2 H 5 M-5 6 H 5"/>`,
  herd: `<rect x="-10" y="-11" width="20" height="22" rx="3"/><circle cx="-4.5" cy="-5" r="2.6"/><circle cx="4.5" cy="-5" r="2.6"/><path d="M-6 4 H 6"/>`,
  kuehlschrank: `<rect x="-8" y="-12" width="16" height="24" rx="3"/><path d="M-8 -3 H 8 M-4 -8 V -6 M-4 1 V 5"/>`,
  computer: `<rect x="-11" y="-10" width="22" height="15" rx="2"/><path d="M-4 10 H 4 M0 5 V 10"/>`,
  licht: `<path d="M-6 2 A 7.5 7.5 0 1 1 6 2 C 4 4, 4 6, 4 7 H -4 C -4 6, -4 4, -6 2 Z"/><path d="M-3.5 10 H 3.5"/>`,
  auto: `<path d="M-11 4 V -1 L -7 -7 H 7 L 11 -1 V 4 Z"/><circle cx="-6" cy="5" r="2.5"/><circle cx="6" cy="5" r="2.5"/>`,
};
const SYMBOL_NAMEN = Object.keys(SYMBOLE);

/* ------------------------------------------------------------------ *
 *  Aufteilung der Leistung auf die Leitungen
 *
 *  Gemessen werden nur PV, Netz und Akku. Wer wohin liefert, wird
 *  daraus abgeleitet. Reihenfolge: PV versorgt zuerst das Haus, dann
 *  den Akku, der Rest geht ins Netz. Das Haus bekommt danach Strom aus
 *  dem Akku und erst zuletzt aus dem Netz.
 * ------------------------------------------------------------------ */
function verteile(m) {
  const pv = m.pv || 0;
  const bezug = m.bezug || 0;
  const einsp = m.einspeisung || 0;
  const laden = m.laden || 0;
  const entladen = m.entladen || 0;
  const haus = m.haus || 0;

  const pvHaus = Math.min(pv, haus);
  let restHaus = haus - pvHaus;
  const akkuHaus = Math.min(entladen, restHaus);
  restHaus -= akkuHaus;
  const netzHaus = Math.min(bezug, restHaus);

  let pvRest = pv - pvHaus;
  const pvAkku = Math.min(pvRest, laden);
  pvRest -= pvAkku;
  const pvNetz = Math.min(pvRest, einsp);

  const netzAkku = Math.max(0, Math.min(bezug - netzHaus, laden - pvAkku));
  const akkuNetz = Math.max(0, Math.min(entladen - akkuHaus, einsp - pvNetz));

  return { pvHaus, pvAkku, pvNetz, netzHaus, netzAkku, akkuHaus, akkuNetz };
}

/* ------------------------------------------------------------------ *
 *  Akkusaeule
 *  Uebernommen aus lutarym-battery-card von Lutarym. Gezeichnet wird auf
 *  einer Leinwand, die genau ueber dem Innenraum der Saeule liegt.
 *  Die Bewegungen laufen hier nach Zeit statt nach Bildern, damit sie auf
 *  jedem Geraet gleich schnell sind.
 * ------------------------------------------------------------------ */
const SAEULE_STILE = 13;

function saeuleLerp(a, b, x) { return a + (b - a) * x; }

/** Farbverlauf der Batteriekarte: rot leer, gelb halb, gruen voll. */
function saeuleRGB(p) {
  const r0 = 220, g0 = 30, b0 = 30, r1 = 253, g1 = 216, b1 = 53, r2 = 46, g2 = 125, b2 = 50;
  let r, g, b;
  if (p <= 50) {
    const x = p / 50;
    r = saeuleLerp(r0, r1, x); g = saeuleLerp(g0, g1, x); b = saeuleLerp(b0, b1, x);
  } else {
    const x = (p - 50) / 50;
    r = saeuleLerp(r1, r2, x); g = saeuleLerp(g1, g2, x); b = saeuleLerp(b1, b2, x);
  }
  return [Math.round(r), Math.round(g), Math.round(b)];
}

/**
 * Zeichnet die Fuellung. st haelt Teilchen und Zwischenwerte,
 * k ist die Zahl der vergangenen Bilder bei 60 Bildern je Sekunde.
 */
function saeuleZeichnen(ctx, W, H, pct, t, mode, st, k) {
  const fillH = H * pct / 100;
  if (mode === 5) {
    if (st.anzeige < pct) st.anzeige = Math.min(pct, st.anzeige + 0.5 * k);
    else st.anzeige = pct;
  }
  if (fillH <= 0 && mode !== 5) return;
  const yBase = H - fillH;
  const drift = Math.sin(t) * 4;
  const [r1, g1, b1] = saeuleRGB(Math.max(0, pct - 15 + drift));
  const [r2, g2, b2] = saeuleRGB(Math.min(100, pct + 15 + drift));
  // Groessen der Originalkarte sind fuer etwa 28 px Breite gedacht.
  const m = Math.max(1, W / 28);
  const verlauf = (y) => {
    const g = ctx.createLinearGradient(0, H, 0, y);
    g.addColorStop(0, `rgb(${r1},${g1},${b1})`);
    g.addColorStop(1, `rgb(${r2},${g2},${b2})`);
    return g;
  };
  const voll = () => { ctx.fillStyle = verlauf(yBase); ctx.fillRect(0, yBase, W, fillH); };

  if (mode === 0) {
    voll();
  } else if (mode === 1) {
    const amp = Math.max(2, 5 * (1 - pct / 100)) * m;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 1) {
      const y = yBase + amp * Math.sin(t * 2 + (x / m) * 0.25) + amp * 0.4 * Math.sin(t * 1.5 + (x / m) * 0.4);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = verlauf(yBase); ctx.fill();
  } else if (mode === 2) {
    const pY = yBase + Math.sin(t * 2) * (H * 0.03);
    ctx.fillStyle = verlauf(pY); ctx.fillRect(0, pY, W, H - pY);
  } else if (mode === 3) {
    voll();
    if (Math.random() < 0.08 * k && st.teile.length < 12 * m) {
      st.teile.push({ x: Math.random() * W, y: H, r: (1 + Math.random() * 3) * m, v: (0.3 + Math.random() * 0.5) * m });
    }
    st.teile = st.teile.filter((b) => b.y > yBase);
    for (const b of st.teile) {
      b.y -= b.v * k;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 0.8 * m; ctx.stroke();
    }
  } else if (mode === 4) {
    voll();
    if (Math.random() < 0.15 * k && st.teile.length < 20 * m) {
      st.teile.push({ x: Math.random() * W, y: yBase + Math.random() * fillH, l: 1 });
    }
    st.teile = st.teile.filter((g) => g.l > 0);
    for (const g of st.teile) {
      ctx.beginPath(); ctx.arc(g.x, g.y, 1.5 * m, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${g.l})`; ctx.fill();
      g.l -= 0.04 * k;
    }
  } else if (mode === 5) {
    const dH = H * st.anzeige / 100;
    const dY = H - dH;
    ctx.fillStyle = verlauf(dY); ctx.fillRect(0, dY, W, dH);
  } else if (mode === 6) {
    const a = 0.7 + 0.3 * Math.sin(t * 2);
    const g = ctx.createLinearGradient(0, H, 0, yBase);
    g.addColorStop(0, `rgba(${r1},${g1},${b1},${a})`);
    g.addColorStop(1, `rgba(${r2},${g2},${b2},${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, yBase, W, fillH);
  } else if (mode === 7) {
    voll();
    if (Math.sin(t * 3) > 0.7) {
      ctx.save();
      ctx.translate(W / 2, yBase + fillH * 0.2);
      ctx.fillStyle = "rgba(255,255,180,0.9)";
      ctx.beginPath();
      const z = Math.min(W, fillH) * 0.35;
      ctx.moveTo(z * 0.2, 0); ctx.lineTo(-z * 0.1, z * 0.45);
      ctx.lineTo(z * 0.1, z * 0.45); ctx.lineTo(-z * 0.2, z * 0.9);
      ctx.lineTo(z * 0.35, z * 0.35); ctx.lineTo(z * 0.1, z * 0.35);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  } else if (mode === 8) {
    voll();
    if (Math.random() < 0.2 * k && st.teile.length < 25 * m) {
      st.teile.push({ x: Math.random() * W, y: yBase, v: (1 + Math.random() * 2) * m, len: (3 + Math.random() * 5) * m });
    }
    st.teile = st.teile.filter((r) => r.y < H);
    for (const r of st.teile) {
      r.y += r.v * k;
      ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y + r.len);
      ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = m; ctx.stroke();
    }
  } else if (mode === 9) {
    voll();
    const flH = Math.min(fillH * 0.3, 15 * m);
    const sp = 3 * m;
    for (let x = 0; x < W; x += sp) {
      const fl = flH * (0.5 + 0.5 * Math.sin(t * 4 + (x / m) * 0.5));
      const g = ctx.createLinearGradient(0, yBase, 0, yBase - fl);
      g.addColorStop(0, "rgba(255,100,0,0.8)");
      g.addColorStop(1, "rgba(255,220,0,0)");
      ctx.fillStyle = g; ctx.fillRect(x, yBase - fl, sp, fl);
    }
  } else if (mode === 10) {
    voll();
    const colW = 8 * Math.min(m, 2);
    const cols = Math.floor(W / colW);
    if (st.spalten.length !== cols) {
      st.spalten = Array.from({ length: cols }, () => ({ y: Math.random() * H, v: (0.5 + Math.random()) * m }));
    }
    ctx.font = `${colW - 1}px monospace`;
    ctx.textAlign = "center";
    for (let i = 0; i < cols; i++) {
      const c = st.spalten[i];
      if (c.y < yBase) { c.y = H; continue; }
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(String.fromCharCode(48 + Math.floor(Math.random() * 10)), i * colW + colW / 2, c.y);
      c.y -= c.v * k;
      if (c.y < yBase) c.y = H;
    }
  } else if (mode === 11) {
    voll();
    const sY = yBase + ((t * 30 * m) % Math.max(1, fillH));
    const h = 4 * m;
    const g = ctx.createLinearGradient(0, sY - h, 0, sY + h);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, sY - h, W, 2 * h);
  } else if (mode === 12) {
    const beat = (t % (Math.PI * 2)) / (Math.PI * 2);
    let off = 0;
    if (beat < 0.1) off = Math.sin(beat / 0.1 * Math.PI) * (H * 0.05);
    else if (beat < 0.2) off = -Math.sin((beat - 0.1) / 0.1 * Math.PI) * (H * 0.03);
    const hY = yBase + off;
    ctx.fillStyle = verlauf(hY); ctx.fillRect(0, hY, W, H - hY);
  }
}

/* ================================================================== *
 *  Karte
 * ================================================================== */
class LutarymEnergyFlowCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._built = false;
    this._config = null;
    this._hass = null;
    this._demo = null;
    this._demoTimer = null;

    // Animation
    this._animLoop = null;
    this._animZeit = 0;
    this._fluss = new Map(); // Leitung -> { tempo, versatz, rueck, els, zweit }
    this._dreh = new Map(); // Element -> { gradProSek, winkel }
    this._puls = new Map(); // Element -> { dauer, min, max }
    this._elCache = new Map();
    this._mischStand = new Map(); // Leitung -> zuletzt gezeigte Aufteilung
    this._mischFarben = new Map(); // Leitung -> zuletzt gezeigte Quellen
  }

  /* -------------------- Lebenszyklus -------------------- */

  connectedCallback() {
    if (this._built) this._beobachten();
    if (this._built && !this._animLoop) this._startAnimation();
    if (this._config && this._config.demo) this._demoStart();
  }

  disconnectedCallback() {
    if (this._beobachter) this._beobachter.disconnect();
    if (this._sicht) this._sicht.disconnect();
    if (this._animLoop) cancelAnimationFrame(this._animLoop);
    this._animLoop = null;
    this._demoStopp();
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    // In der Kartenauswahl zeigt die Vorschau Beispielwerte.
    return { demo: true, entities: {}, consumers: [] };
  }

  setConfig(config) {
    if (!config) throw new Error("Keine Konfiguration angegeben.");
    // Home Assistant reicht dieselbe Konfiguration oft mehrfach durch.
    // Ohne Aenderung bleibt die Karte stehen, die Animation laeuft weiter.
    const text = JSON.stringify(config);
    if (this._config && text === this._configText) return;
    this._configText = text;
    this._letzte = null;
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      entities: { ...(config.entities || {}) },
      consumers: Array.isArray(config.consumers)
        ? config.consumers.filter((c) => c && (c.entity || c.area)).slice(0, MAX_VERBRAUCHER)
        : [],
    };
    this._built = false;
    if (this._config.demo) {
      this._demoAufbauen();
      if (this.isConnected) this._demoStart();
    } else {
      this._demo = null;
      this._demoStopp();
    }
    if (this._quelle) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    // Home Assistant ruft dies bei jeder Zustandsaenderung im ganzen System
    // auf. Neu gezeichnet wird nur, wenn sich eine genutzte Entitaet oder
    // die Sprache geaendert hat. Im Demomodus taktet der eigene Zeitgeber.
    if (this._built && (this._config.demo || this._unveraendert(hass))) return;
    this._render();
  }

  /** Alle Entitaeten, die die Karte liest. */
  _genutzteIds() {
    const c = this._config;
    const ids = Object.values(c.entities || {}).filter(Boolean);
    (c.consumers || []).forEach((v) => {
      if (v.entity) ids.push(v.entity);
      else if (v.area) ids.push(...this._raumSensoren(v.area, Array.isArray(v.exclude) ? v.exclude : []));
    });
    return ids;
  }

  /**
   * Vergleicht die Zustandsobjekte der genutzten Entitaeten mit dem letzten
   * Aufruf. Home Assistant erzeugt nur fuer geaenderte Entitaeten neue
   * Objekte, ein Vergleich der Verweise genuegt daher.
   */
  _unveraendert(hass) {
    const alt = this._letzte;
    const neu = this._merke(hass);
    if (!alt || alt.sprache !== neu.sprache || alt.dunkel !== neu.dunkel || alt.refs.length !== neu.refs.length) return false;
    return neu.refs.every((r, i) => r === alt.refs[i]);
  }

  /** Merkt sich die gerade gezeichneten Zustaende fuer den naechsten Vergleich. */
  _merke(hass) {
    const states = (hass && hass.states) || {};
    this._letzte = {
      refs: this._genutzteIds().map((id) => states[id]),
      sprache: hass && hass.language,
      dunkel: hass && hass.themes ? hass.themes.darkMode : undefined,
    };
    return this._letzte;
  }

  /**
   * Hoehe in Einheiten von 50 px fuer das Masonry-Dashboard, geschaetzt
   * aus dem Seitenverhaeltnis der Zeichnung bei einer ueblichen Spalte.
   */
  getCardSize() {
    const b = this._basis && this._basis.vb;
    const verhaeltnis = b && b[2] ? b[3] / b[2] : G.H / G.W;
    return Math.max(4, Math.ceil((480 * verhaeltnis + 20) / 50));
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto", min_rows: 4 };
  }

  get _quelle() {
    return this._config && this._config.demo ? this._demo : this._hass;
  }

  _sp() {
    const gewaehlt = this._config && this._config.language;
    if (gewaehlt && gewaehlt !== "auto" && SPRACHEN.includes(gewaehlt)) return gewaehlt;
    const kurz = String((this._hass && this._hass.language) || "").slice(0, 2).toLowerCase();
    return SPRACHEN.includes(kurz) ? kurz : "en";
  }

  _t(schluessel) {
    return t(schluessel, this._sp());
  }

  /** Gewaehlter Animationsstil, unbekannte Namen fallen auf Striche zurueck. */
  _stil() {
    const name = this._config && this._config.animation_style;
    return STILE[name] || STILE.striche;
  }

  /** Eingestellter Schriftfaktor, begrenzt auf einen lesbaren Bereich. */
  _fs() {
    return clamp(Number(this._config && this._config.font_scale) || 1, 0.7, 1.15);
  }

  /** Eigener Name gewinnt, sonst der Name in der Kartensprache. */
  /** Name des aktiven Farbschemas, "auto" aufgeloest in hell oder dunkel. */
  _themaName() {
    const gewaehlt = this._config && this._config.theme;
    if (gewaehlt === "auto") {
      const t = this._hass && this._hass.themes;
      let dunkel;
      if (t && typeof t.darkMode === "boolean") dunkel = t.darkMode;
      else dunkel = !(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
      return dunkel ? "dunkel" : "hell";
    }
    return THEMEN[gewaehlt] ? gewaehlt : "dunkel";
  }

  _thema() {
    return THEMEN[this._themaName()];
  }

  _name(schluessel, standard) {
    const eigen = this._config && this._config[`name_${schluessel}`];
    // Bewusst leer eingetragen heisst: keine Beschriftung.
    if (eigen === "") return "";
    return eigen ? String(eigen) : this._t(standard || schluessel);
  }

  /* -------------------- Werte lesen -------------------- */

  _id(schluessel) {
    if (this._config.demo) return `demo.${schluessel}`;
    return (this._config.entities && this._config.entities[schluessel]) || "";
  }

  _hat(schluessel) {
    return Boolean(this._id(schluessel));
  }

  _zustand(id) {
    const q = this._quelle;
    if (!id || !q || !q.states) return null;
    return q.states[id] || null;
  }

  /** Leistung in Watt. Einheit kW oder MW wird umgerechnet. */
  _leistungVon(id) {
    const st = this._zustand(id);
    if (!st) return null;
    let v = parseFloat(st.state);
    if (Number.isNaN(v)) return null;
    const einheit = String((st.attributes && st.attributes.unit_of_measurement) || "")
      .trim()
      .toLowerCase();
    if (einheit === "kw") v *= 1000;
    else if (einheit === "mw") v *= 1000000;
    return v;
  }

  _leistung(schluessel) {
    return this._leistungVon(this._id(schluessel));
  }

  _zahl(schluessel) {
    const st = this._zustand(this._id(schluessel));
    if (!st) return null;
    const v = parseFloat(st.state);
    return Number.isNaN(v) ? null : v;
  }

  /** Zustand mit Einheit als Text, fuer die Zusatzzeilen. */
  _text(schluessel) {
    const st = this._zustand(this._id(schluessel));
    if (!st) return "";
    const roh = st.state;
    if (roh === "unknown" || roh === "unavailable") return "--";
    const einheit = (st.attributes && st.attributes.unit_of_measurement) || "";
    const v = parseFloat(roh);
    const zahl = /^-?\d+(?:\.(\d+))?$/.exec(String(roh).trim());
    if (!Number.isNaN(v) && zahl) {
      // So viele Nachkommastellen wie Home Assistant liefert, hoechstens zwei.
      const stellen = Math.min(2, zahl[1] ? zahl[1].length : 0);
      return `${this._zahlText(v, stellen)}${einheit ? ` ${einheit}` : ""}`;
    }
    return `${roh}${einheit ? ` ${einheit}` : ""}`;
  }

  /**
   * Wert eines Verbrauchers als Text. Faellt die Entitaet aus, bleibt
   * der Knoten sichtbar und zeigt "n. v." statt zu verschwinden.
   */
  _verbraucherText(id, w, aktiv) {
    if (w !== null && w !== undefined) return aktiv ? this._wText(w) : this._t("aus");
    return !id || this._zustand(id) ? this._t("nv") : "--";
  }

  /* -------------------- Raeume -------------------- */

  /** Name eines Raums aus Home Assistant. */
  _raumName(raum) {
    const a = this._hass && this._hass.areas && this._hass.areas[raum];
    return (a && a.name) || "";
  }

  /**
   * Alle Leistungssensoren eines Raums: Sensoren, die selbst im Raum
   * stehen, und Sensoren ohne eigenen Raum, deren Geraet im Raum steht.
   * Ausgeschlossene fallen weg. Das Ergebnis wird je Registerstand gemerkt.
   */
  _raumSensoren(raum, ohne) {
    const hass = this._hass;
    if (!hass || !hass.entities) return [];
    const schluessel = `${raum}|${(ohne || []).join(",")}`;
    // Neu suchen nur, wenn sich das Register aendert, nicht bei jedem
    // neuen Messwert.
    if (!this._raumCache || this._raumCache.entities !== hass.entities ||
        this._raumCache.devices !== hass.devices) {
      this._raumCache = { entities: hass.entities, devices: hass.devices, listen: {} };
    }
    const cache = this._raumCache.listen;
    if (cache[schluessel]) return cache[schluessel];
    const liste = raumSensorenSuchen(hass, raum, ohne);
    if (liste.length) cache[schluessel] = liste;
    return liste;
  }

  /**
   * Summe der Leistung eines Raums. Nicht verfuegbare Sensoren fallen weg,
   * gerechnet wird mit den uebrigen. Liefert keiner einen Wert: null.
   */
  _raumLeistung(raum, ohne) {
    let summe = null;
    this._raumSensoren(raum, ohne).forEach((id) => {
      const w = this._leistungVon(id);
      if (w !== null) summe = (summe || 0) + w;
    });
    return summe;
  }

  /**
   * Maximale Kapazitaet des Akkus in kWh. Eine Entitaet gewinnt, etwa
   * capacity_maximum der Fronius-Integration in Wh. Sonst der feste Wert.
   */
  _kapazitaet() {
    const c = this._config;
    if (c.demo) return 25.6;
    const id = c.entities && c.entities.battery_capacity;
    const st = id ? this._zustand(id) : null;
    if (st) {
      const v = parseFloat(st.state);
      if (!Number.isNaN(v) && v > 0) {
        const einheit = String((st.attributes && st.attributes.unit_of_measurement) || "")
          .trim().toLowerCase();
        if (einheit === "wh") return v / 1000;
        if (einheit === "mwh") return v * 1000;
        return v;
      }
    }
    return Number(c.battery_capacity_kwh) || 0;
  }

  _zahlText(v, stellen) {
    const s = Number(v).toFixed(stellen);
    return KOMMA_SPRACHEN.includes(this._sp()) ? s.replace(".", ",") : s;
  }

  /** Leistung als Text, unterhalb der Schwelle in W, darueber in kW. */
  _wText(w) {
    if (w === null || w === undefined || Number.isNaN(w)) return "--";
    const schwelle = Number(this._config.kw_threshold) || 0;
    if (Math.abs(w) < schwelle) return `${Math.round(w)} W`;
    const kw = w / 1000;
    return `${this._zahlText(kw, Math.abs(kw) < 10 ? 2 : 1)} kW`;
  }

  /** Liest alle Messwerte und leitet die Fluesse ab. */
  _messen() {
    const c = this._config;
    const e = c.entities || {};
    const demo = c.demo;

    const hatPv = demo || Boolean(e.pv);
    const hatNetz = demo || Boolean(e.grid || e.grid_import || e.grid_export);
    const hatAkku = demo || Boolean(e.battery || e.battery_charge || e.battery_discharge || e.battery_soc);

    const pvRoh = hatPv ? this._leistung("pv") : null;
    const pv = pvRoh === null ? null : Math.max(0, pvRoh);

    let bezug = null;
    let einspeisung = null;
    if (demo || e.grid) {
      const g = this._leistung("grid");
      if (g !== null) {
        const v = c.grid_invert ? -g : g;
        bezug = Math.max(0, v);
        einspeisung = Math.max(0, -v);
      }
    } else {
      const a = e.grid_import ? this._leistung("grid_import") : null;
      const b = e.grid_export ? this._leistung("grid_export") : null;
      bezug = a === null ? null : Math.abs(a);
      einspeisung = b === null ? null : Math.abs(b);
    }

    let laden = null;
    let entladen = null;
    if (demo || e.battery) {
      const b = this._leistung("battery");
      if (b !== null) {
        const v = c.battery_invert ? -b : b;
        entladen = Math.max(0, v);
        laden = Math.max(0, -v);
      }
    } else {
      const a = e.battery_charge ? this._leistung("battery_charge") : null;
      const b = e.battery_discharge ? this._leistung("battery_discharge") : null;
      laden = a === null ? null : Math.abs(a);
      entladen = b === null ? null : Math.abs(b);
    }

    const soc = hatAkku ? this._zahl("battery_soc") : null;

    // Fuer alles Abgeleitete gilt die Schwelle min_flow: Kleinere Werte
    // zaehlen als Stillstand, damit sich Kleinstwerte nicht zu einem
    // scheinbar aktiven Fluss aufsummieren.
    const schwelle = Number(c.min_flow) || 0;
    const ab = (w) => (w !== null && w > schwelle ? w : 0);
    const gPv = ab(pv);
    const gBezug = ab(bezug);
    const gEinsp = ab(einspeisung);
    const gLaden = ab(laden);
    const gEntladen = ab(entladen);

    // Hausverbrauch: eigene Entitaet gewinnt, sonst aus der Bilanz.
    let haus = null;
    if (!demo && e.home) {
      const h = this._leistung("home");
      haus = h === null ? null : Math.max(0, h);
    } else if (pv !== null || bezug !== null || entladen !== null) {
      haus = Math.max(0, gPv + gBezug + gEntladen - gEinsp - gLaden);
    }

    const wp = demo || e.heatpump ? this._leistung("heatpump") : null;
    const wb = demo || e.wallbox ? this._leistung("wallbox") : null;
    const verbraucher = this._verbraucherListe().map((v) => ({
      ...v,
      w: v.raum ? this._raumLeistung(v.raum, v.ohne) : this._leistungVon(v.id),
    }));

    const fluss = verteile({
      pv: gPv, bezug: gBezug, einspeisung: gEinsp, laden: gLaden, entladen: gEntladen, haus: ab(haus),
    });

    return {
      hatPv, hatNetz, hatAkku,
      pv, bezug, einspeisung, laden, entladen, soc, haus,
      wp, wb, verbraucher, fluss,
    };
  }

  _verbraucherListe() {
    if (this._config.demo) {
      const sp = this._sp();
      return this._demo
        ? this._demo.verbraucher.map((v, i) => ({
          ...v, name: v.name[sp] || v.name.en, farbe: this._thema().verbraucher,
        }))
        : [];
    }
    return (this._config.consumers || []).map((v, i) => ({
      id: v.entity || "",
      raum: v.entity ? "" : v.area || "",
      ohne: Array.isArray(v.exclude) ? v.exclude : v.exclude ? [v.exclude] : [],
      name: v.name || (v.entity ? this._friendly(v.entity) : this._raumName(v.area)) || `${this._t("verbraucher")} ${i + 1}`,
      symbol: SYMBOLE[v.icon] ? v.icon : "steckdose",
      farbe: farbeAus(v.color, this._thema().verbraucher),
      platz: v.position,
    }));
  }

  /**
   * Verteilt Waermepumpe, Wallbox und Verbraucher auf die Plaetze.
   * Zuerst bekommt jeder seinen gewaehlten Platz, dann Waermepumpe und
   * Wallbox ihren Standard oben und unten, der Rest fuellt die freien
   * Plaetze der Reihe nach. Ergebnis: Platzname je Kennung.
   */
  _platzierung() {
    const c = this._config;
    const e = c.entities || {};
    const liste = [];
    if (c.demo || e.heatpump) liste.push({ id: "wp", wunsch: c.heatpump_position, standard: "oben" });
    if (c.demo || e.wallbox) liste.push({ id: "wb", wunsch: c.wallbox_position, standard: "unten" });
    this._verbraucherListe().forEach((v, i) => liste.push({ id: `ex${i}`, wunsch: v.platz }));
    const belegt = new Set();
    const ergebnis = {};
    const nimm = (eintrag, platz) => {
      if (ergebnis[eintrag.id] || !PLAETZE[platz] || belegt.has(platz)) return;
      ergebnis[eintrag.id] = platz;
      belegt.add(platz);
    };
    liste.forEach((x) => nimm(x, x.wunsch));
    liste.forEach((x) => nimm(x, x.standard));
    liste.forEach((x) => {
      const frei = PLATZ_FOLGE.find((p) => !belegt.has(p));
      if (frei) nimm(x, frei);
    });
    return ergebnis;
  }

  _friendly(id) {
    const st = this._zustand(id);
    return (st && st.attributes && st.attributes.friendly_name) || "";
  }

  /* -------------------- Demomodus -------------------- */

  _demoAufbauen() {
    const states = {};
    const setze = (k, w, attrs) => {
      states[`demo.${k}`] = { state: String(w), attributes: { unit_of_measurement: "W", ...(attrs || {}) } };
    };
    ["pv", "grid", "battery", "heatpump", "wallbox", "c0", "c1", "c2", "c3"].forEach((k) => setze(k, 0));
    setze("battery_soc", 62, { unit_of_measurement: "%" });
    setze("pv_secondary", 18.4, { unit_of_measurement: "kWh" });
    setze("wallbox_secondary", 54, { unit_of_measurement: "%" });
    this._demo = {
      states,
      soc: 62,
      verbraucher: [
        { id: "demo.c0", name: { de: "Waschmaschine", en: "Washer", fr: "Lave-linge", ja: "洗濯機" }, symbol: "waschmaschine" },
        { id: "demo.c1", name: { de: "Kühlschrank", en: "Fridge", fr: "Frigo", ja: "冷蔵庫" }, symbol: "kuehlschrank" },
        { id: "demo.c2", name: { de: "Server", en: "Server", fr: "Serveur", ja: "サーバー" }, symbol: "computer" },
        { id: "demo.c3", name: { de: "Licht", en: "Lights", fr: "Lumière", ja: "照明" }, symbol: "licht" },
      ],
    };
    this._demoSchritt();
  }

  /**
   * Erzeugt stimmige Beispielwerte. Ein Tag laeuft in zwei Minuten ab,
   * die Wallbox laedt zeitweise, die Waschmaschine laeuft in Abstaenden.
   */
  _demoSchritt() {
    const d = this._demo;
    if (!d) return;
    const s = Date.now() / 1000;
    const tag = (s % 120) / 120;
    const sonne = Math.max(0, Math.sin((tag - 0.15) * Math.PI / 0.7));
    const rauschen = 0.9 + 0.1 * Math.sin(s * 1.7);
    const pv = Math.round(11200 * sonne * rauschen);

    const wp = Math.round(900 + 700 * Math.sin(s / 9));
    const wb = Math.floor(s / 30) % 3 === 1 ? 11000 : 0;
    const wasch = Math.floor(s / 20) % 2 === 0 ? 2100 : 0;
    const kuehl = 85 + Math.round(10 * Math.sin(s));
    const server = 160;
    const licht = sonne > 0.2 ? 0 : 45;
    const grund = 280;
    const haus = grund + wp + wb + wasch + kuehl + server + licht;

    let laden = 0;
    let entladen = 0;
    let bezug = 0;
    let einsp = 0;
    const ueberschuss = pv - haus;
    if (ueberschuss > 0) {
      laden = d.soc < 100 ? Math.min(ueberschuss, 6000) : 0;
      einsp = ueberschuss - laden;
    } else {
      entladen = d.soc > 8 ? Math.min(-ueberschuss, 6000) : 0;
      bezug = -ueberschuss - entladen;
    }
    d.soc = clamp(d.soc + (laden - entladen) / 25600 * 6, 0, 100);

    const w = (k, v) => { d.states[`demo.${k}`].state = String(v); };
    w("pv", pv);
    w("grid", bezug - einsp);
    w("battery", entladen - laden);
    w("battery_soc", d.soc.toFixed(0));
    w("heatpump", wp);
    w("wallbox", wb);
    w("c0", wasch);
    w("c1", kuehl);
    w("c2", server);
    w("c3", licht);
  }

  _demoStart() {
    if (this._demoTimer || !this._config || !this._config.demo) return;
    this._demoTimer = setInterval(() => {
      this._demoSchritt();
      this._render();
    }, 1500);
  }

  _demoStopp() {
    if (this._demoTimer) clearInterval(this._demoTimer);
    this._demoTimer = null;
  }

  /* -------------------- Aufbau -------------------- */

  _render() {
    if (!this._config || !this._quelle) return;
    const sprache = this._sp();
    const akku = this._zeigtAkku();
    const anzahl = this._verbraucherListe().length;
    const plan = JSON.stringify(this._platzierung());
    const thema = this._themaName();
    if (this._built && (this._gebautMit !== sprache || this._gebautPlan !== plan || this._gebautThema !== thema ||
        this._gebautAkku !== akku || this._gebautEx !== anzahl)) {
      this._built = false;
    }
    if (!this._built) {
      this._build();
      this._built = true;
      this._gebautMit = sprache;
      this._gebautThema = thema;
      this._gebautPlan = plan;
      this._gebautAkku = akku;
      this._gebautEx = anzahl;
    }
    this._update();
    if (!this._config.demo && this._hass) this._merke(this._hass);
  }

  _zeigtAkku() {
    const c = this._config;
    if (c.demo) return true;
    const e = c.entities || {};
    return Boolean(e.battery || e.battery_charge || e.battery_discharge || e.battery_soc);
  }

  _build() {
    if (this._animLoop) cancelAnimationFrame(this._animLoop);
    this._animLoop = null;
    this._fluss.clear();
    this._mischStand.clear();
    this._mischFarben.clear();
    this._dreh.clear();
    this._puls.clear();
    this._elCache.clear();

    const root = document.createElement("div");
    // Die Huelle reicht die Hoehe des Platzes an die Karte weiter.
    root.className = "lef-root";
    root.innerHTML = `
      <style>${this._css()}</style>
      <ha-card class="lef">
        <div class="lef-hint" id="hinweis" hidden></div>
        <div class="lef-demo" id="demo-hinweis" hidden></div>
        <div class="lef-scene">${this._svg()}
          <div class="bat-ueber" id="bat-ueber" hidden>
            <canvas id="bat-leinwand"></canvas>
            <div class="bat-pct" id="bat-pct"></div>
          </div>
        </div>
        <div class="verlauf" id="verlauf" hidden>
          <div class="verlauf-kopf">
            <span class="titel" id="verlauf-titel"></span>
            <button type="button" data-stunden="24" class="aktiv">24 h</button>
            <button type="button" data-stunden="168">7 d</button>
            <button type="button" class="zu" id="verlauf-zu" aria-label="close">×</button>
          </div>
          <div class="verlauf-info" id="verlauf-info"></div>
          <div class="verlauf-flaeche"><svg id="verlauf-svg"></svg>
            <div class="verlauf-text" id="verlauf-text"></div></div>
        </div>
      </ha-card>`;
    this.shadowRoot.replaceChildren(root);
    this._rahmenFuer = null;
    this._saeuleZustand = null;
    this._saeuleStand = null;
    this._saeuleMass = null;
    this._beobachten();
    this._klicks();
    this._startAnimation();
  }

  /**
   * Groesse und Sichtbarkeit verfolgen.
   * Groesse: die Leinwand der Saeule muss mitwandern. Steht der Rahmen noch
   * aus, weil die Karte beim Aufbau unsichtbar war, wird er jetzt gesetzt.
   * Sichtbarkeit: ausserhalb des Bildes ruht die Animation und kostet keine
   * Rechenzeit.
   */
  _beobachten() {
    if (this._beobachter) this._beobachter.disconnect();
    if (this._sicht) this._sicht.disconnect();
    const svg = this.shadowRoot.querySelector("svg");
    const szene = this.shadowRoot.querySelector(".lef-scene");
    if (window.ResizeObserver) {
      this._beobachter = new ResizeObserver(() => {
        // Erst im naechsten Bild anpassen, sonst meldet der Browser eine
        // Schleife, weil die Anpassung selbst die Groesse aendert.
        if (this._lageGeplant) return;
        this._lageGeplant = true;
        requestAnimationFrame(() => {
          this._lageGeplant = false;
          if (!this._rahmenFuer) this._passeRahmen();
          else this._saeuleLage();
        });
      });
      if (svg) this._beobachter.observe(svg);
      if (szene) this._beobachter.observe(szene);
    }
    if (window.IntersectionObserver) {
      this._sicht = new IntersectionObserver((eintraege) => {
        const sichtbar = eintraege.some((e) => e.isIntersecting);
        this._sichtbar = sichtbar;
        if (sichtbar) {
          if (!this._rahmenFuer) this._passeRahmen();
          if (!this._animLoop) this._startAnimation();
        }
      });
      this._sicht.observe(this);
    }
  }

  /** Klick auf eine Baugruppe oeffnet den Detaildialog von Home Assistant. */
  _klicks() {
    const sr = this.shadowRoot;
    const ueber = sr.getElementById("bat-ueber");
    const saeule = sr.getElementById("akku-saeule");
    if (ueber && saeule) ueber.addEventListener("click", () => saeule.dispatchEvent(new Event("click")));
    // Verbraucher, Waermepumpe und Wallbox zeigen beim Klick ihren Verlauf.
    sr.querySelectorAll("[data-verlauf]").forEach((el) => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this._verlaufOeffnen(el.dataset.verlauf, 24);
      });
    });
    const zu = sr.getElementById("verlauf-zu");
    if (zu) zu.addEventListener("click", () => this._verlaufSchliessen());
    sr.querySelectorAll(".verlauf-kopf [data-stunden]").forEach((b) => {
      b.addEventListener("click", () => {
        if (this._verlaufKey) this._verlaufOeffnen(this._verlaufKey, Number(b.dataset.stunden));
      });
    });
    sr.querySelectorAll("[data-entity], [data-entity-id]").forEach((el) => {
      if (el.dataset.verlauf) return;
      el.addEventListener("click", () => {
        if (this._config.demo) return;
        const id = el.dataset.entityId || (el.dataset.entity ? this._id(el.dataset.entity) : "");
        if (!id) return;
        this.dispatchEvent(
          new CustomEvent("hass-more-info", {
            detail: { entityId: id },
            bubbles: true,
            composed: true,
          })
        );
      });
    });
  }

  /* -------------------- Verlauf -------------------- */

  /** Name, Farbe und Sensoren hinter einem Verbraucher, der Waermepumpe oder der Wallbox. */
  _verlaufQuelle(key) {
    const c = this._config;
    if (key === "wp") return { name: this._name("heatpump", "wp"), farbe: GERAET.wp, ids: [this._id("heatpump")] };
    if (key === "wb") return { name: this._name("wallbox"), farbe: GERAET.wallbox, ids: [this._id("wallbox")] };
    const i = Number(String(key).slice(2));
    const v = this._verbraucherListe()[i];
    if (!v) return null;
    const ids = c.demo ? [] : v.raum ? this._raumSensoren(v.raum, v.ohne) : [v.id];
    return { name: v.name, farbe: v.farbe, ids: ids.filter(Boolean) };
  }

  async _verlaufOeffnen(key, stunden) {
    const q = this._verlaufQuelle(key);
    const box = this._el("verlauf");
    if (!q || !box) return;
    this._verlaufKey = key;
    box.hidden = false;
    this.shadowRoot.querySelectorAll(".verlauf-kopf [data-stunden]").forEach((b) => {
      b.classList.toggle("aktiv", Number(b.dataset.stunden) === stunden);
    });
    this._el("verlauf-titel").textContent = q.name;
    this._el("verlauf-info").textContent = "";
    this._el("verlauf-svg").innerHTML = "";
    this._el("verlauf-text").textContent = this._t("verlauf_laedt");
    const anfrage = (this._verlaufAnfrage || 0) + 1;
    this._verlaufAnfrage = anfrage;
    const punkte = await this._verlaufDaten(q.ids, stunden);
    if (anfrage !== this._verlaufAnfrage || box.hidden) return;
    this._verlaufZeichnen(q, punkte, stunden);
  }

  _verlaufSchliessen() {
    const box = this._el("verlauf");
    if (box) box.hidden = true;
    this._verlaufKey = null;
    this._verlaufAnfrage = (this._verlaufAnfrage || 0) + 1;
  }

  /**
   * Holt den Verlauf aus der Statistik von Home Assistant: Mittelwert je
   * 5 Minuten (24 h) oder je Stunde (7 Tage), in Watt. Bei einem Raum
   * werden die Sensoren je Zeitpunkt addiert. Ergebnis: [[ms, watt], ...].
   */
  async _verlaufDaten(ids, stunden) {
    const ende = Date.now();
    const start = ende - stunden * 3600000;
    if (this._config.demo) {
      const schritt = stunden > 24 ? 3600000 : 300000;
      const liste = [];
      for (let t = start; t <= ende; t += schritt) {
        const h = new Date(t).getHours() + new Date(t).getMinutes() / 60;
        liste.push([t, Math.max(0, 400 + 900 * Math.sin((h - 6) / 24 * Math.PI * 2) + 150 * Math.sin(t / 2.3e6))]);
      }
      return liste;
    }
    const hass = this._hass;
    if (!hass || !hass.callWS || !ids.length) return [];
    try {
      const r = await hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: new Date(start).toISOString(),
        end_time: new Date(ende).toISOString(),
        statistic_ids: ids,
        period: stunden > 24 ? "hour" : "5minute",
        types: ["mean"],
        units: { power: "W" },
      });
      const summe = new Map();
      ids.forEach((id) => {
        (r && r[id] ? r[id] : []).forEach((e) => {
          const t = typeof e.start === "number" ? e.start : Date.parse(e.start);
          const w = Number(e.mean);
          if (Number.isNaN(t) || Number.isNaN(w)) return;
          summe.set(t, (summe.get(t) || 0) + w);
        });
      });
      return [...summe.entries()].sort((a, b) => a[0] - b[0]);
    } catch (err) {
      return [];
    }
  }

  _verlaufZeichnen(q, punkte, stunden) {
    const svg = this._el("verlauf-svg");
    const text = this._el("verlauf-text");
    const info = this._el("verlauf-info");
    if (!svg) return;
    if (punkte.length < 2) {
      svg.innerHTML = "";
      text.textContent = this._t("verlauf_leer");
      return;
    }
    text.textContent = "";
    // Zeichnen in der echten Groesse der Flaeche, damit Schrift nicht verzerrt.
    const rahmen = svg.parentElement.getBoundingClientRect();
    const W = Math.max(200, Math.round(rahmen.width));
    const H = Math.max(120, Math.round(rahmen.height));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const L = 46;
    const U = 22;
    const t0 = punkte[0][0];
    const t1 = punkte[punkte.length - 1][0];
    const werte = punkte.map((p) => p[1]);
    const max = Math.max(...werte, 1);
    const oben = max * 1.1;
    const x = (t) => L + ((t - t0) / Math.max(1, t1 - t0)) * (W - L - 6);
    const y = (w) => 6 + (1 - w / oben) * (H - U - 6);
    const linie = punkte.map((p, k) => `${k ? "L" : "M"}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(" ");
    const flaeche = `${linie} L${x(t1).toFixed(1)} ${y(0).toFixed(1)} L${x(t0).toFixed(1)} ${y(0).toFixed(1)} Z`;
    const sp = this._sp();
    const ort = ORTE[sp] || "en-US";
    // Achsen: drei Linien fuer Leistung, Zeitmarken unten.
    let achsen = "";
    [0, 0.5, 1].forEach((a) => {
      const w = max * a;
      achsen += `<line class="verlauf-gitter" x1="${L}" x2="${W - 6}" y1="${y(w).toFixed(1)}" y2="${y(w).toFixed(1)}"/>
        <text class="verlauf-achse" x="${L - 6}" y="${(y(w) + 4).toFixed(1)}" text-anchor="end">${this._wText(w)}</text>`;
    });
    const marken = stunden > 24 ? 7 : 6;
    const fmt = stunden > 24
      ? new Intl.DateTimeFormat(ort, { weekday: "short" })
      : new Intl.DateTimeFormat(ort, { hour: "2-digit", minute: "2-digit" });
    for (let k = 0; k <= marken; k++) {
      const t = t0 + ((t1 - t0) * k) / marken;
      achsen += `<text class="verlauf-achse" x="${x(t).toFixed(1)}" y="${H - 6}" text-anchor="${k === 0 ? "start" : k === marken ? "end" : "middle"}">${fmt.format(new Date(t))}</text>`;
    }
    svg.innerHTML = `
      <defs><linearGradient id="verlauf-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${q.farbe}" stop-opacity="0.45"/>
        <stop offset="1" stop-color="${q.farbe}" stop-opacity="0.03"/></linearGradient></defs>
      ${achsen}
      <path d="${flaeche}" fill="url(#verlauf-grad)" stroke="none"/>
      <path d="${linie}" fill="none" stroke="${q.farbe}" stroke-width="2" stroke-linejoin="round"/>`;
    // Kennzahlen: Mittel, Hoechstwert und Energie im Zeitraum.
    let kwh = 0;
    for (let k = 1; k < punkte.length; k++) {
      kwh += ((punkte[k][0] - punkte[k - 1][0]) / 3600000) * punkte[k - 1][1] / 1000;
    }
    const mittel = werte.reduce((a, b) => a + b, 0) / werte.length;
    const zahl = new Intl.NumberFormat(ort, { maximumFractionDigits: kwh < 10 ? 2 : 1 });
    info.innerHTML = `<span>${escapeHtml(this._t("verlauf_mittel"))} <b>${this._wText(mittel)}</b></span>
      <span>${escapeHtml(this._t("verlauf_max"))} <b>${this._wText(max)}</b></span>
      <span>${escapeHtml(this._t("verlauf_energie"))} <b>${zahl.format(kwh)} kWh</b></span>`;
  }

  _el(id) {
    let el = this._elCache.get(id);
    if (el && el.isConnected) return el;
    el = this.shadowRoot ? this.shadowRoot.getElementById(id) : null;
    if (el) this._elCache.set(id, el);
    return el;
  }

  /* -------------------- Zeichnung -------------------- */

  _defs() {
    return `
      <defs>
        <filter id="glowBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5"/>
        </filter>
      </defs>`;
  }

  /** Leitung mit Mantel, Rohr, Leuchtspur und laufenden Strichen. */
  _leitung(id, d) {
    const pfad = d || LEITUNGEN[id];
    return `
      <g id="ltg-${id}">
        <path class="pipe-shell" d="${pfad}"/>
        <path class="pipe" id="pipe-${id}" d="${pfad}"/>
        <path class="flow-glow" id="fg-${id}" d="${pfad}"/>
        <path class="flow-glow" id="fg2-${id}" d="${pfad}"/>
        <path class="flow-glow" id="fg3-${id}" d="${pfad}"/>
        <path class="flow" id="f-${id}" d="${pfad}"/>
        <path class="flow" id="f2-${id}" d="${pfad}"/>
        <path class="flow" id="f3-${id}" d="${pfad}"/>
      </g>`;
  }

  /**
   * Ein Knoten: Kreis mit Leuchtring, kleinem Symbol und Werten.
   * Alles innen ist relativ zur Kreismitte gezeichnet.
   */
  _knoten({ id, pos, r, label: name, labelUnten, entity, entityId, icon, inhalt, verlauf }) {
    const radius = r || G.R;
    const f = this._fs();
    // Ohne Namen bleibt nur der Kreis, der Rahmen schneidet den Platz weg.
    const label = this._config.show_names === false ? "" : name;
    const ly = labelUnten ? radius + (radius > 40 ? 20 : 14) * f : -(radius + 12);
    return `
      <g class="node" id="dev-${id}" transform="translate(${pos.x} ${pos.y})"
         ${entity ? `data-entity="${entity}"` : ""} ${entityId ? `data-entity-id="${escapeHtml(entityId)}"` : ""}
         ${verlauf ? `data-verlauf="${verlauf}"` : ""}>
        <circle id="glow-${id}" class="node-glow" r="${radius}" opacity="0" filter="url(#glowBlur)"/>
        <circle class="node-bg" r="${radius}"/>
        <circle id="ring-${id}" class="node-ring" r="${radius}"/>
        ${label ? `<rect class="label-bg" x="${-(textBreite(label) * (radius > 40 ? 5.2 : 3.8) * f + 8)}" y="${ly - 13 * f}"
              width="${textBreite(label) * (radius > 40 ? 10.4 : 7.6) * f + 16}" height="${18 * f}" rx="${9 * f}"/>
        <text class="node-label${radius > 40 ? "" : " klein"}" id="${id}-label" y="${ly}" text-anchor="middle">${escapeHtml(label)}</text>` : ""}
        <g class="icon" id="icon-${id}" transform="translate(0 ${radius > 40 ? -30 : -8})${radius > 40 ? "" : " scale(0.75)"}">${icon}</g>
        ${inhalt}
      </g>`;
  }

  /** Werte in einem grossen Knoten: Hauptwert und zwei kleine Zeilen. */
  _werte(id, klasse) {
    // Die Zeilen ruecken mit der Schriftgroesse auseinander.
    const f = this._fs();
    const yWert = (3 + (f - 1) * 6).toFixed(1);
    const yS = (Number(yWert) + 18 * f).toFixed(1);
    const yS2 = (Number(yS) + 15 * f).toFixed(1);
    return `
      <text class="value ${klasse || ""}" id="${id}-v" y="${yWert}" text-anchor="middle">--</text>
      <text class="sub" id="${id}-s" y="${yS}" text-anchor="middle"></text>
      <text class="sub sub2" id="${id}-s2" y="${yS2}" text-anchor="middle"></text>
      <text class="sub sub2" id="${id}-s3" y="${yS2}" text-anchor="middle"></text>`;
  }

  /** Rahmen mit Beschriftung und Wert, Breite passt sich dem Text an. */
  _infoFeld(id, y) {
    return `
      <g id="${id}" class="info" display="none">
        <rect id="${id}-rahmen" class="info-rahmen" x="${ABR.X - ABR.BREITE_MIN / 2}" y="${y - ABR.HOEHE / 2}"
              width="${ABR.BREITE_MIN}" height="${ABR.HOEHE}" rx="12"/>
        <text class="info-titel" id="${id}-titel" x="${ABR.X}" y="${y - 6}" text-anchor="middle"></text>
        <text class="info-wert" id="${id}-wert" x="${ABR.X}" y="${y + 18}" text-anchor="middle"></text>
      </g>`;
  }

  /* -------------------- Abrechnung -------------------- */

  /** Ob Netzbezug seit dem Abrechnungsdatum gezeigt werden soll. */
  _hatAbrechnung() {
    const c = this._config;
    if (c.demo) return true;
    return Boolean(c.entities && c.entities.grid_import_energy && this._abrStart());
  }

  /** Beginn des Abrechnungszeitraums, Mitternacht in Ortszeit, oder null. */
  _abrStart() {
    const c = this._config;
    if (c.demo) return new Date(new Date().getFullYear(), 0, 1);
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(c.billing_date || ""));
    if (!m) return null;
    return abrechnungsBeginn(Number(m[2]), Number(m[3]), new Date());
  }

  /**
   * Aenderung einer Statistik seit start, etwa die kWh eines Zaehlers.
   * Zuerst die Abfrage fuer einen Zeitraum, sonst die Tageswerte summiert.
   */
  async _statistikAenderung(id, start, einheiten) {
    const hass = this._hass;
    if (!hass || !hass.callWS) return null;
    const ende = new Date().toISOString();
    const zusatz = einheiten ? { units: einheiten } : {};
    try {
      const r = await hass.callWS({
        type: "recorder/statistic_during_period", statistic_id: id,
        fixed_period: { start_time: start.toISOString(), end_time: ende }, types: ["change"], ...zusatz,
      });
      if (r && typeof r.change === "number") return r.change;
    } catch (err) {
      // Aeltere Versionen kennen die Abfrage nicht, dann die Tageswerte.
    }
    try {
      const r = await hass.callWS({
        type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: ende,
        statistic_ids: [id], period: "day", types: ["change"], ...zusatz,
      });
      const liste = r && r[id];
      if (Array.isArray(liste) && liste.length) {
        return liste.reduce((a, x) => a + (Number(x.change) || 0), 0);
      }
    } catch (err) {
      // Keine Statistik vorhanden.
    }
    return null;
  }

  /** Holt die Abrechnungswerte, hoechstens alle ABR_INTERVALL. */
  _abrechnungPruefen() {
    const c = this._config;
    if (!this._hatAbrechnung()) { this._abr = null; return; }
    const start = this._abrStart();
    const e = c.entities || {};
    const schluessel = c.demo ? "demo" : [e.grid_import_energy, e.grid_cost || "", start.toISOString()].join("|");
    const jetzt = Date.now();
    if (this._abr && this._abr.schluessel === schluessel &&
        (this._abr.laedt || jetzt - this._abr.zeit < ABR_INTERVALL)) return;
    if (c.demo) {
      this._abr = { schluessel, zeit: jetzt, kwh: 2345.6, kosten: null };
      return;
    }
    const abr = { schluessel, zeit: jetzt, laedt: true, kwh: this._abr ? this._abr.kwh : null,
      kosten: this._abr ? this._abr.kosten : null };
    this._abr = abr;
    Promise.all([
      this._statistikAenderung(e.grid_import_energy, start, { energy: "kWh" }),
      e.grid_cost ? this._statistikAenderung(e.grid_cost, start) : Promise.resolve(null),
    ]).then(([kwh, kosten]) => {
      if (this._abr !== abr) return;
      abr.kwh = kwh;
      abr.kosten = kosten;
      abr.laedt = false;
      abr.zeit = Date.now();
      this._abrechnungZeigen();
    });
  }

  /** Schreibt Netzbezug und Kosten seit dem Abrechnungsdatum in die Felder. */
  _abrechnungZeigen() {
    if (!this._hatAbrechnung() || !this._el("abr-bezug")) return;
    const c = this._config;
    const sp = this._sp();
    const ort = ORTE[sp] || "en-US";
    const start = this._abrStart();
    const abr = this._abr || {};
    const datum = new Intl.DateTimeFormat(ort, { day: "2-digit", month: "2-digit", year: "numeric" }).format(start);
    // Netzbezug
    const kwh = typeof abr.kwh === "number" ? abr.kwh : null;
    this._infoSetzen("abr-bezug", this._t("bezug_seit").replace("{d}", datum),
      kwh === null ? "" : `${new Intl.NumberFormat(ort, { maximumFractionDigits: kwh < 100 ? 1 : 0 }).format(kwh)} kWh`);
    // Kosten: Kosten-Sensor oder kWh mal Arbeitspreis, dazu die Grundgebuehr
    // anteilig fuer die Tage seit dem Abrechnungsdatum.
    const preis = c.demo ? 28 : Number(c.price_per_kwh) || 0;
    const grund = c.demo ? 12 : Number(c.base_fee_month) || 0;
    let arbeit = null;
    if (typeof abr.kosten === "number") arbeit = abr.kosten;
    else if (kwh !== null && preis > 0) arbeit = (kwh * preis) / 100;
    const tage = Math.max(0, (Date.now() - start.getTime()) / 86400000);
    const anteil = grund > 0 ? (grund * 12 * tage) / 365 : 0;
    const summe = arbeit === null && !anteil ? null : (arbeit || 0) + anteil;
    const waehrung = (this._hass && this._hass.config && this._hass.config.currency) || "EUR";
    let text = "";
    if (summe !== null) {
      try {
        text = new Intl.NumberFormat(ort, { style: "currency", currency: waehrung }).format(summe);
      } catch (err) {
        text = `${this._zahlText(summe, 2)} ${waehrung}`;
      }
    }
    this._infoSetzen("abr-kosten", this._t("kosten_bis"), text);
  }

  _infoSetzen(id, titel, wert) {
    this._zeige(id, Boolean(wert));
    if (!wert) return;
    this._setText(`${id}-titel`, titel);
    this._setText(`${id}-wert`, wert);
    // Rahmen an den laengeren Text anpassen.
    const f = this._fs();
    const breite = clamp(Math.max(textBreite(titel) * 6.2, textBreite(wert) * 10.5) * f + 24,
      ABR.BREITE_MIN, ABR.BREITE_MAX);
    const rahmen = this._el(`${id}-rahmen`);
    if (rahmen) {
      rahmen.setAttribute("x", (ABR.X - breite / 2).toFixed(1));
      rahmen.setAttribute("width", breite.toFixed(1));
    }
  }

  /** Ring aus Teilbogen, fuer Akkustand und die Herkunft des Hausstroms. */
  _bogen(id, farbe) {
    return `<circle id="${id}" class="bogen" r="${G.R}" stroke="${farbe}"
              stroke-dasharray="0 ${(2 * Math.PI * G.R).toFixed(1)}" transform="rotate(-90)"/>`;
  }

  _svg() {
    const c = this._config;
    const akku = this._zeigtAkku();
    const ex = this._verbraucherListe();
    const plan = this._platzierung();
    const genutzt = Object.values(plan);
    const breite = genutzt.some((p) => PLAETZE[p].x > G.HAUS.x) ? G.W_BREIT : G.W;
    // Ohne Akku und ohne untere Plaetze endet die Zeichnung unter der Mittelreihe.
    const hoehe = akku || genutzt.some((p) => PLAETZE[p].y > G.HAUS.y) ? G.H : G.H_KURZ;
    const unten = (id) => PLAETZE[plan[id]].y > G.HAUS.y;

    const rundum = `
      ${plan.wp ? this._leitung("bus_wp", PLATZ_PFAD[plan.wp]) : ""}
      ${plan.wb ? this._leitung("bus_wb", PLATZ_PFAD[plan.wb]) : ""}
      ${ex.map((_, i) => (plan[`ex${i}`] ? this._leitung(`ex_l${i}`, PLATZ_PFAD[plan[`ex${i}`]]) : "")).join("")}
      ${plan.wp ? this._knoten({ id: "wp", pos: PLAETZE[plan.wp], labelUnten: unten("wp"),
        label: this._name("heatpump", "wp"), entity: "heatpump", verlauf: "wp",
        icon: ICON.wp, inhalt: this._werte("wp") }) : ""}
      ${plan.wb ? this._knoten({ id: "wb", pos: PLAETZE[plan.wb], labelUnten: unten("wb"),
        label: this._name("wallbox"), entity: "wallbox", verlauf: "wb",
        icon: ICON.wb, inhalt: this._werte("wb") }) : ""}
      ${ex.map((v, i) => (!plan[`ex${i}`] ? "" : this._knoten({
        id: `ex${i}`, labelUnten: unten(`ex${i}`), entityId: c.demo ? "" : v.id, verlauf: `ex${i}`,
        pos: PLAETZE[plan[`ex${i}`]],
        label: kuerzen(v.name, 16),
        icon: SYMBOLE[v.symbol] || SYMBOLE.steckdose,
        inhalt: this._werte(`ex${i}`),
      }))).join("")}`;

    return `
    <svg viewBox="0 0 ${breite} ${hoehe}" class="lef-svg" role="img" aria-label="Energy flow"
         preserveAspectRatio="xMinYMid meet">
      ${this._defs()}
      <g id="fluss-inhalt">
      ${this._leitung("pv_haus")}
      ${this._leitung("akku_haus")}
      ${this._leitung("netz_haus")}
      ${rundum}

      ${this._knoten({ id: "pv", pos: G.PV, label: this._name("pv"), entity: "pv",
        icon: ICON.pv, inhalt: this._werte("pv") })}
      ${this._knoten({ id: "akku", pos: G.AKKU, label: this._name("battery", "akku"), labelUnten: true,
        entity: this._config.entities.battery_soc ? "battery_soc" : "battery",
        icon: ICON.akku, inhalt: `${this._bogen("akku-soc", FARBE.akku)}${this._werte("akku")}` })}
      ${this._knoten({ id: "netz", pos: G.NETZ, label: this._name("grid", "netz"),
        entity: this._config.entities.grid ? "grid" : "grid_import",
        icon: ICON.netz, inhalt: this._werte("netz") })}
      ${this._knoten({ id: "haus", pos: G.HAUS, label: this._name("home", "haus"),
        entity: this._config.entities.home ? "home" : "",
        icon: ICON.haus,
        inhalt: `${this._bogen("seg-pv", FARBE.pv)}${this._bogen("seg-akku", FARBE.akku)}${this._bogen("seg-netz", FARBE.netz)}${this._werte("haus")}` })}
      ${this._hatAbrechnung() ? `${this._infoFeld("abr-bezug", ABR.OBEN)}${this._infoFeld("abr-kosten", ABR.UNTEN)}` : ""}
      </g>
      ${this._zeigtSaeule() ? `
      <g id="akku-saeule" class="saeule" data-entity="${this._config.entities.battery_soc ? "battery_soc" : "battery"}">
        <rect id="saeule-pol" class="saeule-pol" x="0" y="0" width="0" height="0" rx="3"/>
        <rect id="saeule-rahmen" class="saeule-rahmen" x="0" y="0" width="0" height="0" rx="10"/>
        <rect id="saeule-innen" x="0" y="0" width="0" height="0" fill="none"/>
      </g>` : ""}
    </svg>`;
  }

  /* -------------------- Aktualisierung -------------------- */

  _zeige(id, sichtbar) {
    const el = this._el(id);
    if (el) el.setAttribute("display", sichtbar ? "inline" : "none");
  }

  /** Werte im Stillstand blass zeigen. */
  _dimm(id, blass) {
    const el = this._el(id);
    if (el) el.classList.toggle("is-aus", blass);
  }

  _setText(id, text) {
    const el = this._el(id);
    if (el && el.textContent !== text) el.textContent = text;
  }

  /**
   * Schaltet eine Leitung. Positive Leistung laeuft in Pfadrichtung.
   * Kommt der Strom aus mehreren Quellen, bekommt jede Quelle eine eigene
   * Strichspur. Die Striche wechseln anteilig die Farbe: bei 1/6 PV und
   * 5/6 Netz ist etwa jeder sechste Strich gelb.
   */
  _setLeitung(id, w, farbeOderMix, rueck) {
    const c = this._config;
    const mix = typeof farbeOderMix === "string" || !farbeOderMix
      ? { haupt: farbeOderMix, teile: farbeOderMix ? [{ farbe: farbeOderMix, anteil: 1 }] : [] }
      : farbeOderMix;
    const farbe = mix.haupt || this._thema().neutral;
    const aktiv = w !== null && w !== undefined && w > (Number(c.min_flow) || 0);
    const spuren = [this._el(`f-${id}`), this._el(`f2-${id}`), this._el(`f3-${id}`)];
    // Jede Strichspur hat ihren eigenen Schein in ihrer Farbe. So bleibt
    // auch ein kleiner Anteil kraeftig und wird nicht von der Hauptfarbe
    // ueberstrahlt.
    const scheine = [this._el(`fg-${id}`), this._el(`fg2-${id}`), this._el(`fg3-${id}`)];
    const rohr = this._el(`pipe-${id}`);
    if (!spuren[0]) return;
    const dash = this._stil().dash;
    // Quellen unter MISCH_MIN zaehlen nicht mit, der Rest wird neu auf 100 %
    // gerechnet. Sonst schaltete die Leitung bei winzigen Anteilen dauernd
    // zwischen einfarbig und gemischt hin und her.
    // Eine schon gezeigte Quelle bleibt bis zur halben Schwelle sichtbar,
    // eine neue erscheint erst ab der vollen Schwelle.
    const gezeigt = this._mischFarben.get(id) || new Set();
    let teile = (mix.teile || [])
      .filter((t) => t.anteil >= (gezeigt.has(t.farbe) ? MISCH_MIN / 2 : MISCH_MIN)).slice(0, 3);
    this._mischFarben.set(id, new Set(aktiv ? teile.map((t) => t.farbe) : []));
    const summe = teile.reduce((a, t) => a + t.anteil, 0) || 1;
    teile = teile.map((t) => ({ farbe: t.farbe, anteil: t.anteil / summe }));
    const gemischt = aktiv && teile.length > 1;
    // Das Rohr bleibt immer neutral. Die Farben zeigen allein die Striche,
    // damit beim Wechsel zwischen einer und mehreren Quellen keine farbige
    // durchgehende Linie auftaucht und wieder verschwindet.
    if (rohr) {
      rohr.style.stroke = "";
      rohr.classList.remove("is-on");
    }
    const folge = gemischt ? this._stabileFolge(id, teile) : null;
    if (!gemischt) this._mischStand.delete(id);
    const laufend = [];
    spuren.forEach((el, k) => {
      const schein = scheine[k];
      if (!el) return;
      let an = aktiv && (k === 0 || (gemischt && k < teile.length));
      let basis = 0;
      let muster = "";
      if (an && gemischt) {
        const m = spurMuster(folge, k, dash);
        if (!m.muster) an = false;
        else {
          muster = m.muster;
          basis = m.basis;
        }
      }
      el.style.strokeDasharray = muster;
      el.classList.toggle("is-on", an);
      if (schein) {
        schein.style.strokeDasharray = muster;
        schein.classList.toggle("is-on", an);
      }
      if (!an) return;
      const spurFarbe = gemischt ? teile[k].farbe : farbe;
      el.style.stroke = spurFarbe;
      if (schein) schein.style.stroke = spurFarbe;
      laufend.push({ el, schein, basis });
      if (!c.animate) {
        el.setAttribute("stroke-dashoffset", basis.toFixed(1));
        if (schein) schein.setAttribute("stroke-dashoffset", basis.toFixed(1));
      }
    });
    if (aktiv) {
      const p = anteil(w, c.max_power);
      const alt = this._fluss.get(id);
      this._fluss.set(id, {
        tempo: (14 + 110 * p) * this._stil().tempo,
        versatz: alt ? alt.versatz : 0,
        rueck: Boolean(rueck),
        spuren: laufend,
      });
    } else {
      this._fluss.delete(id);
    }
  }

  /**
   * Strichfolge mit Ruhezone: Die Aufteilung aendert sich erst, wenn sich
   * ein Anteil um mehr als MISCH_RUHE gegenueber der gezeigten Aufteilung
   * aendert oder eine Quelle dazukommt oder wegfaellt. Kleine Schwankungen
   * der Messwerte lassen die Striche so nicht springen.
   */
  _stabileFolge(id, teile) {
    const farben = teile.map((t) => t.farbe).join("|");
    const alt = this._mischStand.get(id);
    if (alt && alt.farben === farben &&
        teile.every((t, k) => Math.abs(t.anteil - alt.anteile[k]) < MISCH_RUHE)) {
      return alt.folge;
    }
    const folge = strichFolge(strichZahlen(teile));
    this._mischStand.set(id, { farben, anteile: teile.map((t) => t.anteil), folge });
    return folge;
  }

  /** Ring und Leuchten eines Knotens ein- oder ausschalten. */
  _setAktiv(id, aktiv, farbeOderMix) {
    const farbe = (farbeOderMix && farbeOderMix.haupt !== undefined
      ? farbeOderMix.haupt : farbeOderMix) || this._thema().neutral;
    const ring = this._el(`ring-${id}`);
    if (ring) {
      ring.style.stroke = farbe;
      ring.classList.toggle("is-on", aktiv);
    }
    const icon = this._el(`icon-${id}`);
    if (icon) icon.style.color = aktiv ? farbe : "";
    const glow = this._el(`glow-${id}`);
    if (!glow) return;
    glow.style.stroke = farbe;
    if (aktiv && this._config.animate) {
      this._puls.set(`glow-${id}`, { dauer: 2.8, min: 0.12, max: 0.45 });
    } else {
      this._puls.delete(`glow-${id}`);
      glow.setAttribute("opacity", aktiv ? "0.3" : "0");
    }
  }

  _setDreh(id, gradProSek) {
    if (gradProSek > 0 && this._config.animate) {
      const alt = this._dreh.get(id);
      this._dreh.set(id, { gradProSek, winkel: alt ? alt.winkel : 0 });
    } else {
      this._dreh.delete(id);
    }
  }

  _setPuls(id, aktiv, dauer) {
    const el = this._el(id);
    if (!el) return;
    if (aktiv && this._config.animate) this._puls.set(id, { dauer, min: 0.3, max: 1 });
    else {
      this._puls.delete(id);
      el.setAttribute("opacity", aktiv ? "1" : "0");
    }
  }

  /** Teilbogen setzen: Laenge und Anfang als Anteil des Kreises. */
  _setBogen(id, start, laenge, farbe) {
    const el = this._el(id);
    if (!el) return;
    const u = 2 * Math.PI * G.R;
    const l = clamp(laenge, 0, 1) * u;
    el.setAttribute("stroke-dasharray", `${l.toFixed(1)} ${u.toFixed(1)}`);
    el.setAttribute("stroke-dashoffset", (-clamp(start, 0, 1) * u).toFixed(1));
    if (farbe) el.setAttribute("stroke", farbe);
  }

  _update() {
    const c = this._config;
    const m = this._messen();
    const f = m.fluss;
    const schwelle = Number(c.min_flow) || 0;
    const an = (w) => w !== null && w !== undefined && w > schwelle;
    const zusatz = (k) => (this._hat(k) ? this._text(k) : "");

    // Hinweise
    const e = c.entities || {};
    const nichts = !c.demo && !Object.keys(e).some((k) => e[k]) && !(c.consumers || []).length;
    const hinweis = this._el("hinweis");
    if (hinweis) {
      hinweis.hidden = !nichts;
      hinweis.textContent = this._t("hinweis");
    }
    const demo = this._el("demo-hinweis");
    if (demo) {
      demo.hidden = !c.demo;
      demo.textContent = this._t("demo");
    }

    /* ---- PV ---- */
    this._zeige("dev-pv", m.hatPv);
    this._setText("pv-v", this._wText(m.pv));
    this._setText("pv-s", zusatz("pv_secondary"));
    this._setAktiv("pv", an(m.pv), FARBE.pv);
    this._setDreh("pv-strahlen", an(m.pv) ? 10 + 60 * anteil(m.pv, c.max_power) : 0);

    /* ---- Netz ---- */
    this._zeige("dev-netz", m.hatNetz);
    // Der Wert zeigt Bezug oder Einspeisung, die Richtung zeigt die Leitung.
    const einspeisen = an(m.einspeisung) && !an(m.bezug);
    const netzW = einspeisen ? m.einspeisung : m.bezug;
    // Farbe der Einspeiseleitung: das, was eingespeist wird.
    const einspeiseMix = mischung([[FARBE.pv, f.pvNetz], [FARBE.akku, f.akkuNetz]]);
    this._setText("netz-v", this._wText(netzW));
    this._setText("netz-s2", zusatz("grid_secondary"));
    this._setAktiv("netz", an(netzW), FARBE.netz);

    /* ---- Akku ---- */
    this._zeige("dev-akku", m.hatAkku);
    this._setText("akku-v", m.soc === null ? "--" : `${Math.round(m.soc)} %`);
    // Statt der Leistung steht im Akku die gespeicherte Energie:
    // Ladestand mal maximale Kapazitaet.
    const kap = this._kapazitaet();
    this._setText("akku-s", kap > 0 && m.soc !== null
      ? `${this._zahlText((clamp(m.soc, 0, 100) / 100) * kap, 1)} kWh`
      : "");

    this._setText("akku-s2", zusatz("battery_secondary"));
    // Der Ladestandsbogen ist immer akkugruen.
    this._setBogen("akku-soc", 0, m.soc === null ? 0 : m.soc / 100, FARBE.akku);
    // Woher der Ladestrom kommt, zeigt die Leitung. Der Akku bleibt gruen,
    // sein Ring ist der Ladestandsbogen.
    const ladeMix = mischung([[FARBE.pv, f.pvAkku], [FARBE.netz, f.netzAkku]]);
    this._setAktiv("akku", an(m.laden) || an(m.entladen), FARBE.akku);
    const akkuRing = this._el("ring-akku");
    if (akkuRing) akkuRing.classList.remove("is-on");
    this._setPuls("akku-blitz", an(m.laden), 1.4);
    // Akkusaeule
    this._zeige("akku-saeule", m.hatAkku);
    this._saeulePct = m.soc === null ? 0 : m.soc;
    const pctEl = this._el("bat-pct");
    if (pctEl) {
      pctEl.textContent = m.soc === null ? "--" : `${Math.round(m.soc)} %`;
      pctEl.hidden = c.battery_bar_percent === false;
    }

    /* ---- Haus ---- */
    this._setText("haus-v", this._wText(m.haus));
    this._setText("haus-s2", zusatz("home_secondary"));
    const summe = (m.haus || 0) > 0 ? m.haus : 0;
    if (summe > 0) {
      const aPv = f.pvHaus / summe;
      const aAkku = f.akkuHaus / summe;
      const aNetz = Math.max(0, 1 - aPv - aAkku);
      this._setBogen("seg-pv", 0, aPv);
      this._setBogen("seg-akku", aPv, aAkku);
      this._setBogen("seg-netz", aPv + aAkku, aNetz);
    } else {
      ["seg-pv", "seg-akku", "seg-netz"].forEach((id) => this._setBogen(id, 0, 0));
    }
    // Das Haus bekommt keinen eigenen Ring, die Herkunftsboegen sind sein Ring.
    const hausIcon = this._el("icon-haus");
    // Was das Haus gerade bezieht, in den Farben der Quellen. Diese Farbe
    // tragen auch die Leitungen zu den Verbrauchern.
    const hausMix = mischung([[FARBE.pv, f.pvHaus], [FARBE.akku, f.akkuHaus], [FARBE.netz, f.netzHaus]]);
    if (hausIcon) hausIcon.style.color = an(m.haus) ? this._thema().haus : "";

    /* ---- Leitungen ---- */
    this._zeige("ltg-pv_haus", m.hatPv);
    this._zeige("ltg-akku_haus", m.hatAkku);
    this._zeige("ltg-netz_haus", m.hatNetz);
    // PV laeuft immer ins Haus.
    this._setLeitung("pv_haus", m.pv, FARBE.pv);
    // Akku: Entladen laeuft zum Haus und ist gruen. Laden laeuft
    // zum Akku und traegt die Farbe der ladenden Quelle, also gelb fuer
    // PV und blau fuer Netzstrom, etwa beim Laden im guenstigen Tarif.
    if (an(m.entladen)) this._setLeitung("akku_haus", m.entladen, FARBE.akku, false);
    else this._setLeitung("akku_haus", m.laden, ladeMix, true);
    // Netz: Bezug ist blau und laeuft zum Haus. Einspeisung
    // laeuft zum Netz und traegt die Farbe dessen, was eingespeist wird.
    if (an(m.bezug)) this._setLeitung("netz_haus", m.bezug, FARBE.netz, false);
    else this._setLeitung("netz_haus", m.einspeisung, einspeiseMix.haupt ? einspeiseMix : FARBE.pv, true);

    /* ---- Plaetze rund um das Haus ---- */
    {
      const zeigeWp = c.demo || Boolean(e.heatpump);
      const zeigeWb = c.demo || Boolean(e.wallbox);
      this._zeige("dev-wp", zeigeWp);
      this._zeige("ltg-bus_wp", zeigeWp);
      this._zeige("dev-wb", zeigeWb);
      this._zeige("ltg-bus_wb", zeigeWb);

      // Waermepumpe
      this._setText("wp-v", this._verbraucherText(this._id("heatpump"), m.wp, an(m.wp)));
      this._dimm("wp-v", !an(m.wp));
      this._setText("wp-s", zusatz("heatpump_secondary"));
      this._setAktiv("wp", an(m.wp), GERAET.wp);
      this._setDreh("wp-rotor", an(m.wp) ? 90 + 400 * anteil(m.wp, 4000) : 0);
      this._setLeitung("bus_wp", zeigeWp ? m.wp : null, hausMix);

      // Wallbox
      this._setText("wb-v", this._verbraucherText(this._id("wallbox"), m.wb, an(m.wb)));
      this._dimm("wb-v", !an(m.wb));
      this._setText("wb-s", zusatz("wallbox_secondary"));
      this._setAktiv("wb", an(m.wb), GERAET.wallbox);
      this._setPuls("wb-blitz", an(m.wb), 1.6);
      if (!an(m.wb)) {
        const blitz = this._el("wb-blitz");
        if (blitz) blitz.setAttribute("opacity", "0.5");
      }
      this._setLeitung("bus_wb", zeigeWb ? m.wb : null, hausMix);

      // Weitere Verbraucher
      m.verbraucher.forEach((v, i) => {
        const aktiv = an(v.w);
        this._setText(`ex${i}-v`, this._verbraucherText(v.id, v.w, aktiv));
        this._dimm(`ex${i}-v`, !aktiv);
        this._setAktiv(`ex${i}`, aktiv, v.farbe);
      });
      // Jeder Verbraucher hat seine eigene Leitung aus dem Haus.
      m.verbraucher.forEach((v, i) => this._setLeitung(`ex_l${i}`, v.w, hausMix));

    }

    ["pv", "akku", "netz", "haus", "wp", "wb"].forEach((id) => this._zentriere(id));
    (m.verbraucher || []).forEach((_, i) => this._zentriere(`ex${i}`));
    this._abrechnungPruefen();
    this._abrechnungZeigen();
    this._passeRahmen();
  }

  /**
   * Setzt Symbol und Textzeilen eines grossen Kreises als Block in die
   * Mitte. Leere Zeilen zaehlen nicht mit, so steht der Inhalt immer
   * mittig, egal ob eine oder drei Zeilen belegt sind.
   */
  _zentriere(id) {
    const icon = this._el(`icon-${id}`);
    if (!icon) return;
    const f = this._fs();
    const SYMBOL = 24;
    const ABSTAND = 5 * f;
    // Hoehe und Abstand der Grundlinie von der Oberkante je Zeile.
    const zeilen = [
      { el: this._el(`${id}-v`), hoehe: 23 * f, grund: 18 * f },
      { el: this._el(`${id}-s`), hoehe: 17 * f, grund: 13 * f },
      { el: this._el(`${id}-s2`), hoehe: 17 * f, grund: 13 * f },
      { el: this._el(`${id}-s3`), hoehe: 17 * f, grund: 13 * f },
    ].filter((z) => z.el && z.el.textContent !== "");
    const gesamt = SYMBOL + ABSTAND + zeilen.reduce((a, z) => a + z.hoehe, 0);
    const schluessel = zeilen.map((z) => z.el.id).join("|");
    if (icon.dataset.layout === schluessel) return;
    icon.dataset.layout = schluessel;
    let y = -gesamt / 2;
    icon.setAttribute("transform", `translate(0 ${(y + SYMBOL / 2).toFixed(1)})`);
    y += SYMBOL + ABSTAND;
    zeilen.forEach((z) => {
      z.el.setAttribute("y", (y + z.grund).toFixed(1));
      y += z.hoehe;
    });
  }

  /**
   * Schneidet die Zeichnung auf den tatsaechlich sichtbaren Inhalt zu.
   * Ausgeblendete Baugruppen und leere Ecken kosten so keinen Platz.
   * Gerechnet wird nur, wenn sich die Menge der sichtbaren Teile aendert.
   */
  _passeRahmen() {
    const svg = this.shadowRoot && this.shadowRoot.querySelector("svg");
    if (!svg) return;
    const sichtbar = Array.from(svg.querySelectorAll("[display]"))
      .map((el) => `${el.id}:${el.getAttribute("display")}`)
      .join("|");
    if (sichtbar === this._rahmenFuer) return;
    let box;
    try {
      const inhalt = this._el("fluss-inhalt");
      box = inhalt ? inhalt.getBBox() : svg.getBBox();
    } catch (err) {
      return;
    }
    // Noch nicht gezeichnet, etwa in einem verborgenen Tab: spaeter erneut.
    if (!box || box.width < 10 || box.height < 10) return;

    // Akkusaeule rechts daneben, von der Ober- bis zur Unterkante des Flusses.
    const saeule = this._el("akku-saeule");
    if (saeule && saeule.getAttribute("display") !== "none") {
      const POL = 10;
      const STRICH = 3;
      const hoehe = box.height - POL;
      const anteil = clamp(Number(this._config.battery_bar_width) || 22, 8, 80) / 100;
      const breite = Math.round(hoehe * anteil);
      const x = box.x + box.width + 26;
      const y = box.y + POL;
      const setze = (id, a) => {
        const el = this._el(id);
        if (el) Object.keys(a).forEach((k) => el.setAttribute(k, a[k].toFixed(1)));
      };
      setze("saeule-rahmen", { x, y, width: breite, height: hoehe });
      setze("saeule-pol", { x: x + breite * 0.3, y: box.y, width: breite * 0.4, height: POL + 2 });
      setze("saeule-innen", {
        x: x + STRICH + 2, y: y + STRICH + 2,
        width: breite - 2 * (STRICH + 2), height: hoehe - 2 * (STRICH + 2),
      });
      box = { x: box.x, y: box.y, width: box.width + 26 + breite, height: box.height };
    }
    // Etwas Luft fuer den Leuchtschein um aktive Kreise.
    const luft = 8;
    const basis = [
      Math.floor(box.x - luft), Math.floor(box.y - luft),
      Math.ceil(box.width + 2 * luft), Math.ceil(box.height + 2 * luft),
    ];
    svg.setAttribute("viewBox", basis.join(" "));
    // Grundlage fuer das Verschieben der Saeule an den rechten Rand.
    this._basis = {
      vb: basis,
      saeule: ["saeule-rahmen", "saeule-pol", "saeule-innen"].map((id) => {
        const el = this._el(id);
        return el ? [id, parseFloat(el.getAttribute("x")) || 0] : null;
      }).filter(Boolean),
    };
    this._rahmenFuer = sichtbar;
    this._saeuleLage();
  }

  /** Ob die Akkusaeule gezeichnet wird. */
  _zeigtSaeule() {
    const c = this._config;
    return c.battery_bar !== false && this._zeigtAkku();
  }

  /**
   * Legt die Leinwand genau ueber den Innenraum der Saeule. Laeuft nach
   * jeder Groessenaenderung der Karte, die Zeichnung skaliert ja mit.
   */
  _saeuleLage() {
    const ueber = this._el("bat-ueber");
    const innen = this._el("saeule-innen");
    const szene = this.shadowRoot && this.shadowRoot.querySelector(".lef-scene");
    const saeule = this._el("akku-saeule");
    if (!ueber || !szene) return;
    if (!innen || !saeule || saeule.getAttribute("display") === "none") {
      ueber.hidden = true;
      return;
    }
    // Ist die Karte breiter als die Zeichnung, wandert die Saeule an den
    // rechten Rand. Der Fluss bleibt links, die Luecke liegt dazwischen.
    const svg = this.shadowRoot.querySelector("svg");
    const basis = this._basis;
    if (svg && basis) {
      const platz = szene.getBoundingClientRect();
      const [vx, vy, vw, vh] = basis.vb;
      let extra = 0;
      if (platz.width > 0 && platz.height > 0) {
        const soll = (vh * platz.width) / platz.height;
        if (soll > vw * 1.005) extra = soll - vw;
      }
      const vb = [vx, vy, (vw + extra).toFixed(1), vh].join(" ");
      if (svg.getAttribute("viewBox") !== vb) {
        svg.setAttribute("viewBox", vb);
        basis.saeule.forEach(([id, x]) => {
          const el = this._el(id);
          if (el) el.setAttribute("x", (x + extra).toFixed(1));
        });
      }
    }
    const a = innen.getBoundingClientRect();
    const b = szene.getBoundingClientRect();
    if (a.width < 2 || a.height < 2) {
      ueber.hidden = true;
      return;
    }
    ueber.hidden = false;
    Object.assign(ueber.style, {
      left: `${a.left - b.left}px`, top: `${a.top - b.top}px`,
      width: `${a.width}px`, height: `${a.height}px`,
    });
    const lw = this._el("bat-leinwand");
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(a.width * dpr);
    const h = Math.round(a.height * dpr);
    if (lw && (lw.width !== w || lw.height !== h)) {
      lw.width = w;
      lw.height = h;
      this._saeuleStand = null;
    }
    this._saeuleMass = { w: a.width, h: a.height, dpr };
    const pct = this._el("bat-pct");
    // Schrift waechst mit der Breite, aber nicht ueber ein Fuenfzehntel der Hoehe.
    if (pct) {
      const groesse = Math.min(a.width * 0.3, a.height / 15) * this._fs();
      pct.style.fontSize = `${Math.max(10, groesse).toFixed(1)}px`;
    }
  }

  /** Zeichnet die Fuellung der Akkusaeule fuer das aktuelle Bild. */
  _saeuleZeichnen(dt) {
    const lw = this._el("bat-leinwand");
    const ueber = this._el("bat-ueber");
    const mass = this._saeuleMass;
    if (!lw || !ueber || ueber.hidden || !mass) return;
    const c = this._config;
    const animiert = c.animate !== false;
    const mode = animiert ? clamp(parseInt(c.battery_bar_animation, 10) || 0, 0, SAEULE_STILE - 1) : 0;
    const pct = clamp(this._saeulePct || 0, 0, 100);
    // Ohne Bewegung nur neu zeichnen, wenn sich etwas geaendert hat.
    const stand = `${mode}|${pct}|${lw.width}`;
    if (mode === 0 && this._saeuleStand === stand) return;
    this._saeuleStand = stand;
    if (!this._saeuleZustand) this._saeuleZustand = { teile: [], spalten: [], anzeige: 0, t: 0 };
    const st = this._saeuleZustand;
    st.t += dt * 2.4;
    const ctx = lw.getContext("2d");
    ctx.setTransform(mass.dpr, 0, 0, mass.dpr, 0, 0);
    ctx.clearRect(0, 0, mass.w, mass.h);
    saeuleZeichnen(ctx, mass.w, mass.h, pct, st.t, mode, st, Math.min(6, dt * 60));
  }

  /* -------------------- Animation -------------------- */

  _startAnimation() {
    let zuletzt = performance.now();
    const tick = (jetzt) => {
      // Getrennt oder ausserhalb des Bildes: Schleife beenden. Sie startet
      // wieder, sobald die Karte sichtbar wird.
      if (!this.isConnected || this._sichtbar === false) {
        this._animLoop = null;
        return;
      }
      // Nach einem Hintergrund-Tab nicht in einem Satz springen.
      const dt = Math.min(0.1, (jetzt - zuletzt) / 1000);
      zuletzt = jetzt;
      // Eingestellter Faktor fuer die Geschwindigkeit aller Bewegungen.
      const faktor = clamp(Number(this._config && this._config.animation_speed) || 1, 0.1, 5);
      this._animZeit += dt * faktor;
      if (this._config && this._config.animate) this._animiere(dt * faktor);
      this._saeuleZeichnen(dt * faktor);
      this._animLoop = requestAnimationFrame(tick);
    };
    this._animLoop = requestAnimationFrame(tick);
  }

  _animiere(dt) {
    const zeit = this._animZeit;

    // Laufende Striche. Die Strecke waechst fortlaufend, damit eine
    // Tempoaenderung keinen Sprung erzeugt.
    const stil = this._stil();
    const periode = stil.dash.reduce((a, b) => a + b, 0) || STRICH_PERIODE;
    // Die Spanne ist ein Vielfaches des gemischten Musters, damit der
    // Ruecksprung nicht zu sehen ist.
    const spanne = periode * MISCH_STRICHE * 100;
    this._fluss.forEach((s) => {
      s.versatz = (s.versatz + (s.rueck ? 1 : -1) * s.tempo * dt) % spanne;
      s.spuren.forEach((sp) => {
        const wert = (s.versatz + sp.basis).toFixed(1);
        sp.el.setAttribute("stroke-dashoffset", wert);
        if (sp.schein) sp.schein.setAttribute("stroke-dashoffset", wert);
      });
    });

    // Zusatzeffekte einzelner Stile auf den laufenden Leitungen.
    if (stil.atmen || stil.zucken) {
      this._fluss.forEach((s, id) => {
        if (stil.atmen) {
          const welle = 0.5 - 0.5 * Math.cos(((zeit % 1.6) / 1.6) * Math.PI * 2);
          const wert = (0.08 + stil.schein[1] * 1.6 * welle).toFixed(2);
          s.spuren.forEach((sp) => { if (sp.schein) sp.schein.style.opacity = wert; });
        }
        if (stil.zucken) {
          // Pseudozufall aus Zeit und Leitung, damit nicht alle gleich flackern.
          const n = Math.sin(zeit * 37 + id.length * 13.7) * Math.sin(zeit * 11.3 + id.length);
          s.spuren.forEach((sp) => { sp.el.style.opacity = n > 0.55 ? "0.35" : "0.95"; });
        }
      });
    }

    // Drehende Symbole
    this._dreh.forEach((s, id) => {
      const el = this._el(id);
      if (!el) return;
      s.winkel = (s.winkel + s.gradProSek * dt) % 360;
      el.setAttribute("transform", `rotate(${s.winkel.toFixed(2)})`);
    });

    // Pulsieren
    this._puls.forEach((s, id) => {
      const el = this._el(id);
      if (!el) return;
      const p = (zeit % s.dauer) / s.dauer;
      const welle = 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
      el.setAttribute("opacity", (s.min + (s.max - s.min) * welle).toFixed(2));
    });
  }

  /* -------------------- Gestaltung -------------------- */

  _css() {
    const f = this._fs();
    const stil = this._stil();
    const px = (n) => `${(n * f).toFixed(1)}px`;
    const t = this._thema();
    return `
      /* Die Karte fuellt genau den Platz, den Home Assistant ihr gibt.
         Ist die Hoehe fest vorgegeben, wird die Zeichnung verkleinert
         statt ueber den Rand zu ragen. */
      :host { display: block; height: 100%; }
      .lef-root { height: 100%; }
      .lef {
        background: ${t.bg};
        color: ${t.text}; padding: 4px; overflow: hidden; position: relative;
        box-sizing: border-box; height: 100%;
        display: flex; flex-direction: column;
      }
      .lef-scene {
        flex: 1 1 auto; min-height: 0; position: relative;
        /* Die Zeichnung bleibt immer links, egal wie breit die Karte ist. */
        display: flex; align-items: center; justify-content: flex-start;
      }
      .saeule { cursor: pointer; }
      .saeule-rahmen { fill: ${t.saeule}; stroke: ${t.saeuleRand}; stroke-width: 3; }
      .saeule-pol { fill: ${t.saeuleRand}; opacity: 0.6; }
      .bat-ueber { position: absolute; overflow: hidden; border-radius: 5px; cursor: pointer; }
      .bat-ueber[hidden] { display: none; }
      .bat-ueber canvas { width: 100%; height: 100%; display: block; }
      .bat-pct {
        position: absolute; left: 0; right: 0; bottom: 8px; text-align: center;
        font-weight: 700; color: #FFFFFF; text-shadow: 0 1px 3px rgba(0,0,0,0.6);
        font-family: Roboto, "Segoe UI", system-ui, -apple-system,
          "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", Meiryo, sans-serif;
        font-variant-numeric: tabular-nums; pointer-events: none;
      }
      .bat-pct[hidden] { display: none; }
      .lef-hint, .lef-demo {
        margin: 8px 8px 6px; padding: 10px 14px; border-radius: 10px; font-size: 14px;
        flex: 0 0 auto;
      }
      .lef-hint { background: ${t.hinweisBg}; border: 1px solid ${t.hinweisRand}; color: ${t.hinweisText}; }
      .lef-demo { background: ${t.demoBg}; border: 1px solid ${t.demoRand}; color: ${t.demoText}; font-size: 13px; }
      .lef-hint[hidden], .lef-demo[hidden] { display: none; }
      .lef-svg { width: 100%; height: auto; max-height: 100%; display: block; }

      .pipe-shell {
        fill: none; stroke: ${t.huelle}; stroke-width: 12;
        stroke-linecap: round; stroke-linejoin: round;
      }
      .pipe {
        fill: none; stroke: ${t.rohr}; stroke-width: 5;
        stroke-linecap: round; stroke-linejoin: round;
        transition: stroke 900ms ease, stroke-opacity 900ms ease;
      }
      .pipe.is-on { stroke-opacity: 0.35; }
      /* Laufende Striche mit einer weichen Leuchtspur darunter. */
      .flow, .flow-glow {
        fill: none; stroke-linecap: round; stroke-dasharray: ${stil.dash.join(" ")}; opacity: 0;
        transition: opacity 400ms ease;
      }
      .flow { stroke-width: ${stil.breite}; }
      .flow-glow { stroke-width: ${stil.schein[0]}; }
      .flow.is-on { opacity: 0.95; }
      .flow-glow.is-on { opacity: ${stil.schein[1]}; }
      .flow:not(.is-on), .flow-glow:not(.is-on) { opacity: 0 !important; }
      .knotenpunkt { fill: ${t.knoten}; stroke: ${t.rohr}; stroke-width: 2; }
      .info-rahmen { fill: ${t.infoBg}; stroke: ${t.infoRand}; stroke-width: 1.5; }

      .node[data-entity], .node[data-entity-id], .node[data-verlauf] { cursor: pointer; }
      /* Verlauf eines Verbrauchers, liegt ueber der Zeichnung. */
      .verlauf {
        position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column;
        background: ${t.bg}; color: ${t.text}; padding: 12px 14px; box-sizing: border-box;
        font-family: Roboto, "Segoe UI", system-ui, -apple-system,
          "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", Meiryo, sans-serif;
      }
      .verlauf[hidden] { display: none; }
      .verlauf-kopf { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 16px; }
      .verlauf-kopf .titel { flex: 1 1 auto; }
      .verlauf-kopf .zeit { font-weight: 600; font-size: 13px; color: ${t.sub}; }
      .verlauf-kopf button {
        background: none; border: 1px solid ${t.knotenRand}; color: ${t.text}; border-radius: 8px;
        font-size: 13px; padding: 4px 10px; cursor: pointer;
      }
      .verlauf-kopf button.aktiv { background: ${t.knotenRand}; }
      .verlauf-kopf .zu { font-size: 18px; line-height: 1; padding: 2px 9px; }
      .verlauf-info { display: flex; gap: 18px; font-size: 13px; color: ${t.sub}; margin: 6px 0 4px; }
      .verlauf-info b { color: ${t.wert}; }
      .verlauf-flaeche { flex: 1 1 auto; min-height: 0; position: relative; }
      .verlauf-flaeche svg { width: 100%; height: 100%; display: block; }
      .verlauf-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        color: ${t.sub}; font-size: 14px; text-align: center; padding: 0 20px; }
      .verlauf-achse { fill: ${t.sub}; font-size: 11px; font-family: Roboto, "Segoe UI", system-ui, sans-serif; }
      .verlauf-gitter { stroke: ${t.knotenRand}; stroke-width: 1; }
      .node-bg { fill: ${t.knoten}; stroke: ${t.knotenRand}; stroke-width: 2; }
      .node-glow { fill: none; stroke-width: 8; }
      .node-ring {
        fill: none; stroke-width: 2.5; opacity: 0;
        transition: opacity 500ms ease, stroke 500ms ease;
      }
      .node-ring.is-on { opacity: 1; }
      .bogen {
        fill: none; stroke-width: 3.5; stroke-linecap: butt;
        transition: stroke-dasharray 900ms ease, stroke-dashoffset 900ms ease, stroke 900ms ease;
      }
      .label-bg { fill: ${t.labelBg}; }
      /* Klare Schrift: hell auf dunkel, kraeftig, mit dunkler Kontur, damit
         sie auch ueber Leuchtschein und Leitungen gut lesbar bleibt. */
      .node-label, .value, .value-k, .sub, .info-titel, .info-wert {
        font-family: Roboto, "Segoe UI", system-ui, -apple-system,
          "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", Meiryo, sans-serif;
        paint-order: stroke; stroke: ${t.kontur}; stroke-linejoin: round;
      }
      .node-label {
        fill: ${t.label}; font-size: ${px(13)}; font-weight: 600;
        letter-spacing: 0.06em; text-transform: uppercase; stroke-width: 3px;
      }
      .node-label.klein { font-size: ${px(11.5)}; letter-spacing: 0.01em; text-transform: none; }
      .icon {
        color: ${t.icon}; fill: none; stroke: currentColor; stroke-width: 1.8;
        stroke-linecap: round; stroke-linejoin: round; transition: color 500ms ease;
      }
      .value, .value-k, .sub, .info-wert { font-variant-numeric: tabular-nums; }
      .info-titel { fill: ${t.sub}; font-size: ${px(11)}; font-weight: 600; stroke-width: 3px; }
      .info-wert { fill: ${t.wert}; font-size: ${px(18)}; font-weight: 700; stroke-width: 4px; }
      .value {
        fill: ${t.wert}; font-size: ${px(19)}; font-weight: 700; stroke-width: 4px;
        transition: fill 500ms ease;
      }
      .value-k { fill: ${t.wert}; font-size: ${px(10.5)}; font-weight: 700; stroke-width: 3px; }
      .sub { fill: ${t.sub}; font-size: ${px(13)}; font-weight: 600; stroke-width: 3px; transition: fill 500ms ease; }

      .is-aus { fill: ${t.aus}; font-weight: 600; }
    `;
  }
}

/* ================================================================== *
 *  Editor
 *  Nutzt die Formularbausteine von Home Assistant. Jeder Bereich hat
 *  sein eigenes Formular in einem aufklappbaren Abschnitt.
 * ================================================================== */
const EDITOR_TEXTE = {
  de: {
    allgemein: "Allgemein",
    language: "Sprache",
    theme: "Farbschema",
    thema: { auto: "Automatisch (wie Home Assistant)", dunkel: "Dunkel", hell: "Hell", ha: "Home Assistant Design", oled: "OLED Schwarz", mitternacht: "Mitternachtsblau", graphit: "Graphit" },
    demo: "Demomodus (Beispielwerte)",
    show_names: "Namen anzeigen",
    animate: "Animation",
    animation_speed: "Animationsgeschwindigkeit (1 = normal)",
    font_scale: "Schriftgröße (1 = normal)",
    animation_style: "Animationsstil der Leitungen",
    stil: {
      striche: "Striche", punkte: "Punkte", perlen: "Perlen", lang: "Lange Striche",
      komet: "Komet", morse: "Morse", lauflicht: "Lauflicht", neon: "Neon",
      puls: "Puls", blitz: "Blitz",
    },
    max_power: "Leistung für höchstes Tempo (W)",
    kw_threshold: "Ab dieser Leistung in kW anzeigen (W)",
    min_flow: "Kleinere Leistung gilt als Stillstand (W)",
    inverter: "AC-Leistung Wechselrichter (leer = wird berechnet)",
    inverter_secondary: "Zusatzzeile (z.B. Temperatur)",
    name_inverter: "Eigener Name",
    sek_wr: "Wechselrichter",
    pv: "PV Leistung",
    pv_secondary: "Zusatzzeile (z.B. Ertrag heute)",
    name_pv: "Eigener Name",
    grid: "Netzleistung (eine Entität, positiv = Bezug)",
    grid_invert: "Vorzeichen umkehren",
    grid_import: "oder getrennt: Bezug",
    grid_export: "oder getrennt: Einspeisung",
    grid_secondary: "Zusatzzeile (z.B. Strompreis)",
    name_grid: "Eigener Name",
    battery: "Akkuleistung (eine Entität, positiv = Entladen)",
    battery_invert: "Vorzeichen umkehren",
    battery_charge: "oder getrennt: Laden",
    battery_discharge: "oder getrennt: Entladen",
    battery_soc: "Ladestand (%)",
    battery_capacity: "Maximale Kapazität (Entität, z.B. Fronius capacity_maximum)",
    battery_capacity_kwh: "oder fester Wert in kWh, falls keine Entität",
    battery_bar: "Akkusäule rechts anzeigen",
    battery_bar_animation: "Animation der Akkusäule",
    battery_bar_percent: "Prozent in der Akkusäule anzeigen",
    battery_bar_width: "Breite der Akkusäule (% ihrer Höhe)",
    saeule: ["Statisch", "Wellen", "Pulsieren", "Blasen", "Glitzer", "Sanft auffüllend",
      "Schimmern", "Blitz", "Regen", "Feuer", "Matrix", "Scanline", "Herzschlag"],
    battery_secondary: "Zusatzzeile (z.B. Temperatur)",
    name_battery: "Eigener Name",
    home: "Hausverbrauch (leer = wird berechnet)",
    home_secondary: "Zusatzzeile",
    name_home: "Eigener Name",
    heatpump: "Leistung Wärmepumpe",
    heatpump_secondary: "Zusatzzeile (z.B. Vorlauf)",
    name_heatpump: "Eigener Name",
    wallbox: "Ladeleistung Wallbox",
    wallbox_secondary: "Zusatzzeile (z.B. Ladestand Auto)",
    name_wallbox: "Eigener Name",
    c_entity: "Verbraucher {n}: Leistung",
    c_area: "Verbraucher {n}: oder Raum (Summe aller Leistungssensoren)",
    c_exclude: "Verbraucher {n}: im Raum ausschließen",
    c_area_info: "Gezählt im Raum",
    ausgeschlossen: "ausgeschlossen",
    c_titel: "Verbraucher {n}",
    c_area_leer: "Keine Leistungssensoren in diesem Raum gefunden",
    nv_kurz: "n. v.",
    c_name: "Verbraucher {n}: Name",
    c_icon: "Verbraucher {n}: Symbol",
    c_color: "Verbraucher {n}: Farbe",
    c_position: "Verbraucher {n}: Platz",
    heatpump_position: "Platz",
    wallbox_position: "Platz",
    platz: { links_oben: "Links oben", oben: "Oben", rechts_oben: "Rechts oben", rechts: "Rechts", rechts_unten: "Rechts unten", unten: "Unten", links_unten: "Links unten" },
    sek_pv: "PV",
    sek_netz: "Netz",
    sek_akku: "Akku",
    sek_haus: "Haus",
    sek_wp: "Wärmepumpe",
    sek_wb: "Wallbox",
    sek_ex: "Weitere Verbraucher",
    sek_abr: "Abrechnung",
    grid_import_energy: "Netzbezug Zählerstand (kWh, Energie)",
    grid_cost: "Kosten Netzbezug (optional, Kosten-Sensor bei dynamischem Tarif)",
    billing_date: "Abrechnungsdatum (jedes Jahr, Tag und Monat zählen)",
    price_per_kwh: "Arbeitspreis (ct/kWh)",
    base_fee_month: "Grundgebühr pro Monat",
    lade: "Editor wird geladen …",
    auto: "Automatisch",
    sym: {
      steckdose: "Steckdose", waschmaschine: "Waschmaschine", spuelmaschine: "Spülmaschine",
      herd: "Herd", kuehlschrank: "Kühlschrank", computer: "Computer", licht: "Licht", auto: "Auto",
    },
  },
  en: {
    allgemein: "General",
    language: "Language",
    theme: "Colour scheme",
    thema: { auto: "Automatic (like Home Assistant)", dunkel: "Dark", hell: "Light", ha: "Home Assistant theme", oled: "OLED black", mitternacht: "Midnight blue", graphit: "Graphite" },
    demo: "Demo mode (sample values)",
    show_names: "Show names",
    animate: "Animation",
    animation_speed: "Animation speed (1 = normal)",
    font_scale: "Font size (1 = normal)",
    animation_style: "Line animation style",
    stil: {
      striche: "Dashes", punkte: "Dots", perlen: "Pearls", lang: "Long dashes",
      komet: "Comet", morse: "Morse", lauflicht: "Running light", neon: "Neon",
      puls: "Pulse", blitz: "Lightning",
    },
    max_power: "Power for top speed (W)",
    kw_threshold: "Show in kW from this power (W)",
    min_flow: "Lower power counts as idle (W)",
    inverter: "Inverter AC power (empty = calculated)",
    inverter_secondary: "Extra line (e.g. temperature)",
    name_inverter: "Own name",
    sek_wr: "Inverter",
    pv: "Solar power",
    pv_secondary: "Extra line (e.g. yield today)",
    name_pv: "Own name",
    grid: "Grid power (one entity, positive = import)",
    grid_invert: "Invert sign",
    grid_import: "or split: import",
    grid_export: "or split: export",
    grid_secondary: "Extra line (e.g. price)",
    name_grid: "Own name",
    battery: "Battery power (one entity, positive = discharge)",
    battery_invert: "Invert sign",
    battery_charge: "or split: charge",
    battery_discharge: "or split: discharge",
    battery_soc: "State of charge (%)",
    battery_capacity: "Maximum capacity (entity, e.g. Fronius capacity_maximum)",
    battery_capacity_kwh: "or fixed value in kWh if no entity",
    battery_bar: "Show battery bar on the right",
    battery_bar_animation: "Battery bar animation",
    battery_bar_percent: "Show percentage in battery bar",
    battery_bar_width: "Battery bar width (% of its height)",
    saeule: ["Static", "Waves", "Pulse", "Bubbles", "Glitter", "Smooth fill",
      "Shimmer", "Lightning", "Rain", "Fire", "Matrix", "Scanline", "Heartbeat"],
    battery_secondary: "Extra line (e.g. temperature)",
    name_battery: "Own name",
    home: "Home consumption (empty = calculated)",
    home_secondary: "Extra line",
    name_home: "Own name",
    heatpump: "Heat pump power",
    heatpump_secondary: "Extra line (e.g. flow temperature)",
    name_heatpump: "Own name",
    wallbox: "Wallbox charging power",
    wallbox_secondary: "Extra line (e.g. car state of charge)",
    name_wallbox: "Own name",
    c_entity: "Consumer {n}: power",
    c_area: "Consumer {n}: or area (sum of all power sensors)",
    c_exclude: "Consumer {n}: exclude in area",
    c_area_info: "Counted in this area",
    ausgeschlossen: "excluded",
    c_titel: "Consumer {n}",
    c_area_leer: "No power sensors found in this area",
    nv_kurz: "n/a",
    c_name: "Consumer {n}: name",
    c_icon: "Consumer {n}: symbol",
    c_color: "Consumer {n}: colour",
    c_position: "Consumer {n}: position",
    heatpump_position: "Position",
    wallbox_position: "Position",
    platz: { links_oben: "Top left", oben: "Top", rechts_oben: "Top right", rechts: "Right", rechts_unten: "Bottom right", unten: "Bottom", links_unten: "Bottom left" },
    sek_pv: "Solar",
    sek_netz: "Grid",
    sek_akku: "Battery",
    sek_haus: "Home",
    sek_wp: "Heat pump",
    sek_wb: "Wallbox",
    sek_ex: "Further consumers",
    sek_abr: "Billing",
    grid_import_energy: "Grid import meter (kWh, energy)",
    grid_cost: "Grid import cost (optional, cost sensor for a dynamic tariff)",
    billing_date: "Billing date (every year, day and month count)",
    price_per_kwh: "Energy price (ct/kWh)",
    base_fee_month: "Base fee per month",
    lade: "Loading editor …",
    auto: "Automatic",
    sym: {
      steckdose: "Socket", waschmaschine: "Washer", spuelmaschine: "Dishwasher",
      herd: "Stove", kuehlschrank: "Fridge", computer: "Computer", licht: "Light", auto: "Car",
    },
  },
  fr: {
    allgemein: "Général",
    language: "Langue",
    theme: "Jeu de couleurs",
    thema: { auto: "Automatique (comme Home Assistant)", dunkel: "Sombre", hell: "Clair", ha: "Thème Home Assistant", oled: "Noir OLED", mitternacht: "Bleu nuit", graphit: "Graphite" },
    demo: "Mode démo (valeurs d'exemple)",
    show_names: "Afficher les noms",
    animate: "Animation",
    animation_speed: "Vitesse d'animation (1 = normal)",
    font_scale: "Taille du texte (1 = normal)",
    animation_style: "Style d'animation des lignes",
    stil: {
      striche: "Tirets", punkte: "Points", perlen: "Perles", lang: "Longs tirets",
      komet: "Comète", morse: "Morse", lauflicht: "Lumière mobile", neon: "Néon",
      puls: "Pulsation", blitz: "Éclair",
    },
    max_power: "Puissance pour la vitesse maximale (W)",
    kw_threshold: "Afficher en kW à partir de (W)",
    min_flow: "En dessous, considéré comme à l'arrêt (W)",
    inverter: "Puissance AC de l'onduleur (vide = calculée)",
    inverter_secondary: "Ligne supplémentaire (ex. température)",
    name_inverter: "Nom personnalisé",
    sek_wr: "Onduleur",
    pv: "Puissance solaire",
    pv_secondary: "Ligne supplémentaire (ex. production du jour)",
    name_pv: "Nom personnalisé",
    grid: "Puissance réseau (une entité, positif = soutirage)",
    grid_invert: "Inverser le signe",
    grid_import: "ou séparé : soutirage",
    grid_export: "ou séparé : injection",
    grid_secondary: "Ligne supplémentaire (ex. prix)",
    name_grid: "Nom personnalisé",
    battery: "Puissance batterie (une entité, positif = décharge)",
    battery_invert: "Inverser le signe",
    battery_charge: "ou séparé : charge",
    battery_discharge: "ou séparé : décharge",
    battery_soc: "État de charge (%)",
    battery_capacity: "Capacité maximale (entité, ex. Fronius capacity_maximum)",
    battery_capacity_kwh: "ou valeur fixe en kWh si aucune entité",
    battery_bar: "Afficher la colonne batterie à droite",
    battery_bar_animation: "Animation de la colonne batterie",
    battery_bar_percent: "Afficher le pourcentage dans la colonne",
    battery_bar_width: "Largeur de la colonne (% de sa hauteur)",
    saeule: ["Statique", "Vagues", "Pulsation", "Bulles", "Paillettes", "Remplissage doux",
      "Miroitement", "Éclair", "Pluie", "Feu", "Matrix", "Balayage", "Battement de cœur"],
    battery_secondary: "Ligne supplémentaire (ex. température)",
    name_battery: "Nom personnalisé",
    home: "Consommation de la maison (vide = calculée)",
    home_secondary: "Ligne supplémentaire",
    name_home: "Nom personnalisé",
    heatpump: "Puissance de la pompe à chaleur",
    heatpump_secondary: "Ligne supplémentaire (ex. température de départ)",
    name_heatpump: "Nom personnalisé",
    wallbox: "Puissance de charge de la borne",
    wallbox_secondary: "Ligne supplémentaire (ex. charge de la voiture)",
    name_wallbox: "Nom personnalisé",
    c_entity: "Consommateur {n} : puissance",
    c_area: "Consommateur {n} : ou pièce (somme de tous les capteurs de puissance)",
    c_exclude: "Consommateur {n} : exclure dans la pièce",
    c_area_info: "Compté dans la pièce",
    ausgeschlossen: "exclu",
    c_titel: "Consommateur {n}",
    c_area_leer: "Aucun capteur de puissance trouvé dans cette pièce",
    nv_kurz: "n/d",
    c_name: "Consommateur {n} : nom",
    c_icon: "Consommateur {n} : symbole",
    c_color: "Consommateur {n} : couleur",
    c_position: "Consommateur {n} : emplacement",
    heatpump_position: "Emplacement",
    wallbox_position: "Emplacement",
    platz: { links_oben: "En haut à gauche", oben: "En haut", rechts_oben: "En haut à droite", rechts: "À droite", rechts_unten: "En bas à droite", unten: "En bas", links_unten: "En bas à gauche" },
    sek_pv: "Solaire",
    sek_netz: "Réseau",
    sek_akku: "Batterie",
    sek_haus: "Maison",
    sek_wp: "Pompe à chaleur",
    sek_wb: "Borne",
    sek_ex: "Autres consommateurs",
    sek_abr: "Facturation",
    grid_import_energy: "Compteur de soutirage (kWh, énergie)",
    grid_cost: "Coût du soutirage (optionnel, capteur de coût pour un tarif dynamique)",
    billing_date: "Date de facturation (chaque année, jour et mois comptent)",
    price_per_kwh: "Prix du kWh (ct/kWh)",
    base_fee_month: "Abonnement par mois",
    lade: "Chargement de l'éditeur …",
    auto: "Automatique",
    sym: {
      steckdose: "Prise", waschmaschine: "Lave-linge", spuelmaschine: "Lave-vaisselle",
      herd: "Cuisinière", kuehlschrank: "Réfrigérateur", computer: "Ordinateur", licht: "Lumière", auto: "Voiture",
    },
  },
  ja: {
    allgemein: "全般",
    language: "言語",
    theme: "配色",
    thema: { auto: "自動（Home Assistant に合わせる）", dunkel: "ダーク", hell: "ライト", ha: "Home Assistant テーマ", oled: "OLED ブラック", mitternacht: "ミッドナイトブルー", graphit: "グラファイト" },
    demo: "デモモード（サンプル値）",
    show_names: "名前を表示",
    animate: "アニメーション",
    animation_speed: "アニメーション速度（1 = 標準）",
    font_scale: "文字サイズ（1 = 標準）",
    animation_style: "ラインのアニメーション",
    stil: {
      striche: "破線", punkte: "点", perlen: "パール", lang: "長い破線",
      komet: "彗星", morse: "モールス", lauflicht: "流れる光", neon: "ネオン",
      puls: "パルス", blitz: "稲妻",
    },
    max_power: "最高速度になる電力（W）",
    kw_threshold: "この電力から kW 表示（W）",
    min_flow: "これ未満は停止とみなす（W）",
    inverter: "パワコンの AC 出力（空欄 = 自動計算）",
    inverter_secondary: "追加行（例：温度）",
    name_inverter: "表示名",
    sek_wr: "パワコン",
    pv: "太陽光発電の電力",
    pv_secondary: "追加行（例：本日の発電量）",
    name_pv: "表示名",
    grid: "系統電力（1 つのエンティティ、正 = 買電）",
    grid_invert: "符号を反転",
    grid_import: "または個別：買電",
    grid_export: "または個別：売電",
    grid_secondary: "追加行（例：電力単価）",
    name_grid: "表示名",
    battery: "蓄電池の電力（1 つのエンティティ、正 = 放電）",
    battery_invert: "符号を反転",
    battery_charge: "または個別：充電",
    battery_discharge: "または個別：放電",
    battery_soc: "充電率（%）",
    battery_capacity: "最大容量（エンティティ、例：Fronius capacity_maximum）",
    battery_capacity_kwh: "またはエンティティがない場合の固定値（kWh）",
    battery_bar: "右側に蓄電池バーを表示",
    battery_bar_animation: "蓄電池バーのアニメーション",
    battery_bar_percent: "蓄電池バーに % を表示",
    battery_bar_width: "蓄電池バーの幅（高さに対する %）",
    saeule: ["静止", "波", "脈動", "泡", "きらめき", "なめらかに充填",
      "揺らめき", "稲妻", "雨", "炎", "マトリックス", "スキャンライン", "心拍"],
    battery_secondary: "追加行（例：温度）",
    name_battery: "表示名",
    home: "家庭の消費電力（空欄 = 自動計算）",
    home_secondary: "追加行",
    name_home: "表示名",
    heatpump: "ヒートポンプの電力",
    heatpump_secondary: "追加行（例：往き温度）",
    name_heatpump: "表示名",
    wallbox: "EV充電器の充電電力",
    wallbox_secondary: "追加行（例：車の充電率）",
    name_wallbox: "表示名",
    c_entity: "機器 {n}：電力",
    c_area: "機器 {n}：またはエリア（全電力センサーの合計）",
    c_exclude: "機器 {n}：エリア内で除外",
    c_area_info: "このエリアの集計",
    ausgeschlossen: "除外",
    c_titel: "機器 {n}",
    c_area_leer: "このエリアに電力センサーが見つかりません",
    nv_kurz: "取得不可",
    c_name: "機器 {n}：名前",
    c_icon: "機器 {n}：アイコン",
    c_color: "機器 {n}：色",
    c_position: "機器 {n}：配置",
    heatpump_position: "配置",
    wallbox_position: "配置",
    platz: { links_oben: "左上", oben: "上", rechts_oben: "右上", rechts: "右", rechts_unten: "右下", unten: "下", links_unten: "左下" },
    sek_pv: "太陽光",
    sek_netz: "系統",
    sek_akku: "蓄電池",
    sek_haus: "家庭",
    sek_wp: "ヒートポンプ",
    sek_wb: "EV充電器",
    sek_ex: "その他の機器",
    sek_abr: "請求",
    grid_import_energy: "買電量メーター（kWh、エネルギー）",
    grid_cost: "買電コスト（任意、動的料金用のコストセンサー）",
    billing_date: "請求日（毎年、日と月のみ使用）",
    price_per_kwh: "電力量料金（ct/kWh）",
    base_fee_month: "月額基本料金",
    lade: "エディターを読み込み中 …",
    auto: "自動",
    sym: {
      steckdose: "コンセント", waschmaschine: "洗濯機", spuelmaschine: "食洗機",
      herd: "コンロ", kuehlschrank: "冷蔵庫", computer: "パソコン", licht: "照明", auto: "車",
    },
  },
};

const LEISTUNG = { entity: { domain: ["sensor", "input_number"] } };
const BELIEBIG = { entity: {} };
const TEXT = { text: {} };
const JA_NEIN = { boolean: {} };

class LutarymEnergyFlowCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._formulare = [];
    this._built = false;
  }

  _sp() {
    const gewaehlt = this._config && this._config.language;
    if (gewaehlt && gewaehlt !== "auto" && SPRACHEN.includes(gewaehlt)) return gewaehlt;
    const kurz = String((this._hass && this._hass.language) || "").slice(0, 2).toLowerCase();
    return SPRACHEN.includes(kurz) ? kurz : "en";
  }

  _et(schluessel) {
    const satz = EDITOR_TEXTE[this._sp()] || EDITOR_TEXTE.en;
    return satz[schluessel] !== undefined ? satz[schluessel] : schluessel;
  }

  setConfig(config) {
    this._config = {
      ...config,
      entities: { ...(config.entities || {}) },
      consumers: Array.isArray(config.consumers) ? config.consumers.map((c) => ({ ...c })) : [],
    };
    this._abgleich();
  }

  set hass(hass) {
    this._hass = hass;
    this._formulare.forEach((f) => { f.el.hass = hass; });
    if (!this._built) this._aufbauen();
    else this._raumInfoZeigen();
  }

  /**
   * Zeigt unter dem Raum eines Verbrauchers alle Leistungssensoren, die
   * dem Raum zugewiesen sind, mit Wert. Ausgeschlossene stehen durchgestrichen
   * dabei, damit man sieht, was gezaehlt wird und was nicht.
   */
  _raumInfoZeigen() {
    if (!this._raumInfos || !this._hass || !this._config) return;
    const hass = this._hass;
    const sp = this._sp();
    const ort = { de: "de-DE", en: "en-US", fr: "fr-FR", ja: "ja-JP" }[sp] || "en-US";
    const zahl = new Intl.NumberFormat(ort, { maximumFractionDigits: 2 });
    const w = (x) => (x === null ? this._et("nv_kurz")
      : Math.abs(x) >= 1000 ? `${zahl.format(x / 1000)} kW` : `${zahl.format(Math.round(x))} W`);
    const verbraucher = this._config.consumers || [];
    this._raumInfos.forEach((box, i) => {
      if (!box) return;
      const v = verbraucher[i];
      let html = "";
      if (v && v.area && !v.entity) {
        const ohne = new Set(Array.isArray(v.exclude) ? v.exclude : []);
        const alle = raumSensorenSuchen(hass, v.area, []);
        let summe = 0;
        const zeilen = alle.map((id) => {
          const st = hass.states[id];
          const x = wattAus(st);
          const aus = ohne.has(id);
          if (!aus && x !== null) summe += x;
          const name = (st && st.attributes && st.attributes.friendly_name) || id;
          return `<li class="${aus ? "aus" : ""}">${escapeHtml(name)} <span>${escapeHtml(id)}</span>: <b>${w(x)}</b>${aus ? ` <em>${escapeHtml(this._et("ausgeschlossen"))}</em>` : ""}</li>`;
        });
        html = alle.length
          ? `<div class="raum-kopf">${escapeHtml(this._et("c_area_info"))}: <b>${w(summe)}</b></div><ul>${zeilen.join("")}</ul>`
          : `<div class="raum-kopf">${escapeHtml(this._et("c_area_leer"))}</div>`;
      }
      if (box.innerHTML !== html) box.innerHTML = html;
      box.hidden = !html;
    });
  }

  /** Sorgt dafuer, dass ha-form geladen ist, auch wenn noch keine andere Karte es nachgeladen hat. */
  async _haFormLaden() {
    if (customElements.get("ha-form")) return;
    try {
      const helfer = await window.loadCardHelpers();
      const karte = await helfer.createCardElement({ type: "entities", entities: [] });
      if (karte && karte.constructor && karte.constructor.getConfigElement) {
        await karte.constructor.getConfigElement();
      }
    } catch (err) {
      // Ohne Helfer bleibt nur das Warten auf die Definition.
    }
    await Promise.race([
      customElements.whenDefined("ha-form"),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  }

  /** Abschnitte mit ihren Feldern. ort "e" heisst unter entities. */
  _abschnitte() {
    const sp = this._sp();
    const symbole = SYMBOL_NAMEN.map((k) => ({ value: k, label: EDITOR_TEXTE[sp].sym[k] }));
    const platzWahl = { select: { mode: "dropdown", options: [
      { value: "auto", label: this._et("auto") },
      ...PLATZ_NAMEN.map((k) => ({ value: k, label: EDITOR_TEXTE[sp].platz[k] })),
    ] } };
    const verbraucher = [];
    for (let i = 0; i < MAX_VERBRAUCHER; i++) {
      verbraucher.push(
        { name: `c${i}_entity`, ort: "c", feld: "entity", idx: i, selector: LEISTUNG },
        { name: `c${i}_area`, ort: "c", feld: "area", idx: i, selector: { area: {} } },
        { name: `c${i}_exclude`, ort: "c", feld: "exclude", idx: i,
          selector: { entity: { multiple: true, domain: "sensor" } } },
        { name: `c${i}_name`, ort: "c", feld: "name", idx: i, selector: TEXT },
        { name: `c${i}_icon`, ort: "c", feld: "icon", idx: i,
          selector: { select: { mode: "dropdown", options: symbole } } },
        { name: `c${i}_color`, ort: "c", feld: "color", idx: i, selector: { color_rgb: {} } },
        { name: `c${i}_position`, ort: "c", feld: "position", idx: i, selector: platzWahl }
      );
    }
    return [
      { titel: "allgemein", offen: true, felder: [
        { name: "demo", selector: JA_NEIN },
        { name: "theme", selector: { select: { mode: "dropdown",
          options: THEMA_NAMEN.map((k) => ({ value: k, label: EDITOR_TEXTE[sp].thema[k] })) } } },
        { name: "language", selector: { select: { mode: "dropdown", options: [
          { value: "auto", label: this._et("auto") },
          { value: "de", label: "Deutsch" },
          { value: "en", label: "English" },
          { value: "fr", label: "Français" },
          { value: "ja", label: "日本語" },
        ] } } },
        { name: "show_names", selector: JA_NEIN },
        { name: "animate", selector: JA_NEIN },
        { name: "animation_speed", selector: { number: { min: 0.25, max: 3, step: 0.25, mode: "slider" } } },
        { name: "font_scale", selector: { number: { min: 0.7, max: 1.15, step: 0.05, mode: "slider" } } },
        { name: "animation_style", selector: { select: { mode: "dropdown",
          options: STIL_NAMEN.map((k) => ({ value: k, label: EDITOR_TEXTE[sp].stil[k] })) } } },
        { name: "max_power", selector: { number: { min: 1000, max: 50000, step: 500, mode: "box" } } },
        { name: "kw_threshold", selector: { number: { min: 0, max: 10000, step: 100, mode: "box" } } },
        { name: "min_flow", selector: { number: { min: 0, max: 500, step: 1, mode: "box" } } },
      ] },
      { titel: "sek_pv", felder: [
        { name: "pv", ort: "e", selector: LEISTUNG },
        { name: "pv_secondary", ort: "e", selector: BELIEBIG },
        { name: "name_pv", selector: TEXT },
      ] },
      { titel: "sek_netz", felder: [
        { name: "grid", ort: "e", selector: LEISTUNG },
        { name: "grid_invert", selector: JA_NEIN },
        { name: "grid_import", ort: "e", selector: LEISTUNG },
        { name: "grid_export", ort: "e", selector: LEISTUNG },
        { name: "grid_secondary", ort: "e", selector: BELIEBIG },
        { name: "name_grid", selector: TEXT },
      ] },
      { titel: "sek_akku", felder: [
        { name: "battery", ort: "e", selector: LEISTUNG },
        { name: "battery_invert", selector: JA_NEIN },
        { name: "battery_charge", ort: "e", selector: LEISTUNG },
        { name: "battery_discharge", ort: "e", selector: LEISTUNG },
        { name: "battery_soc", ort: "e", selector: LEISTUNG },
        { name: "battery_capacity", ort: "e", selector: LEISTUNG },
        { name: "battery_capacity_kwh", selector: { number: { min: 0, max: 200, step: 0.1, mode: "box", unit_of_measurement: "kWh" } } },
        { name: "battery_bar", selector: JA_NEIN },
        { name: "battery_bar_animation", selector: { select: { mode: "dropdown",
          options: EDITOR_TEXTE[sp].saeule.map((label, i) => ({ value: String(i), label })) } } },
        { name: "battery_bar_percent", selector: JA_NEIN },
        { name: "battery_bar_width", selector: { number: { min: 8, max: 80, step: 1, mode: "slider", unit_of_measurement: "%" } } },
        { name: "battery_secondary", ort: "e", selector: BELIEBIG },
        { name: "name_battery", selector: TEXT },
      ] },
      { titel: "sek_haus", felder: [
        { name: "home", ort: "e", selector: LEISTUNG },
        { name: "home_secondary", ort: "e", selector: BELIEBIG },
        { name: "name_home", selector: TEXT },
      ] },
      { titel: "sek_wp", felder: [
        { name: "heatpump", ort: "e", selector: LEISTUNG },
        { name: "heatpump_secondary", ort: "e", selector: BELIEBIG },
        { name: "heatpump_position", selector: platzWahl },
        { name: "name_heatpump", selector: TEXT },
      ] },
      { titel: "sek_wb", felder: [
        { name: "wallbox", ort: "e", selector: LEISTUNG },
        { name: "wallbox_secondary", ort: "e", selector: BELIEBIG },
        { name: "wallbox_position", selector: platzWahl },
        { name: "name_wallbox", selector: TEXT },
      ] },
      { titel: "sek_ex", felder: verbraucher },
      { titel: "sek_abr", felder: [
        { name: "grid_import_energy", ort: "e", selector: { entity: { domain: "sensor", device_class: "energy" } } },
        { name: "billing_date", selector: { date: {} } },
        { name: "price_per_kwh", selector: { number: { min: 0, max: 200, step: 0.01, mode: "box", unit_of_measurement: "ct/kWh" } } },
        { name: "base_fee_month", selector: { number: { min: 0, max: 500, step: 0.01, mode: "box" } } },
        { name: "grid_cost", ort: "e", selector: { entity: { domain: "sensor", device_class: "monetary" } } },
      ] },
    ];
  }

  _label(feld) {
    const m = /^c(\d)_(entity|area|exclude|name|icon|color|position)$/.exec(feld.name);
    if (m) return this._et(`c_${m[2]}`).replace("{n}", String(Number(m[1]) + 1));
    return this._et(feld.name);
  }

  /** Aktuelle Werte eines Abschnitts aus der Konfiguration lesen. */
  /** Standardname eines Namensfelds in der Kartensprache. */
  _standardName(feld) {
    const texte = TEXTE[this._sp()] || TEXTE.en;
    return texte[NAME_STANDARD[feld]] || "";
  }

  _daten(abschnitt) {
    const c = this._config || {};
    const d = {};
    abschnitt.felder.forEach((f) => {
      let v;
      if (f.ort === "e") v = c.entities[f.name];
      else if (f.ort === "c") v = (c.consumers[f.idx] || {})[f.feld];
      else v = c[f.name] !== undefined ? c[f.name] : DEFAULT_CONFIG[f.name];
      // Auswahllisten arbeiten mit Text, gespeichert wird die Zahl.
      if (f.name === "battery_bar_animation" && v !== undefined) v = String(v);
      // Namensfeld ohne eigenen Namen zeigt den Text, der in der Grafik
      // steht. Wird es geleert, steht dort nichts mehr.
      if (NAME_STANDARD[f.name] && v === undefined) v = this._standardName(f.name);
      if (v !== undefined && v !== "") d[f.name] = v;
    });
    if (abschnitt.titel === "allgemein" && d.language === undefined) d.language = "auto";
    return d;
  }

  async _aufbauen() {
    if (this._built || !this._hass || !this._config) return;
    this._built = true;
    this.shadowRoot.innerHTML = `<style>${this._css()}</style><div class="ed"><p class="lade">${this._et("lade")}</p></div>`;
    await this._haFormLaden();
    const wurzel = this.shadowRoot.querySelector(".ed");
    wurzel.innerHTML = "";
    // Version oben im Editor, damit sichtbar ist, welcher Stand geladen ist.
    const kopf = document.createElement("div");
    kopf.className = "version";
    kopf.textContent = `Energy Flow Card by Lutarym · v${CARD_VERSION}`;
    wurzel.appendChild(kopf);
    this._formulare = [];
    this._raumInfos = [];
    // Erzeugt ein Formular fuer einen Teil der Felder eines Abschnitts.
    const formular = (ab) => {
      const form = document.createElement("ha-form");
      form.hass = this._hass;
      form.schema = ab.felder.map((f) => ({ name: f.name, selector: f.selector }));
      form.data = this._daten(ab);
      form.computeLabel = (s) => this._label(ab.felder.find((f) => f.name === s.name) || s);
      form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._uebernehmen(ab, ev.detail.value || {});
      });
      this._formulare.push({ ab, el: form });
      return form;
    };
    this._abschnitte().forEach((ab) => {
      const det = document.createElement("details");
      if (ab.offen) det.open = true;
      const sum = document.createElement("summary");
      sum.textContent = this._et(ab.titel);
      det.appendChild(sum);
      const huelle = document.createElement("div");
      huelle.className = "inhalt";
      if (ab.titel === "sek_ex") {
        // Je Verbraucher ein eigener Block. Direkt unter Entitaet und Raum
        // stehen alle Leistungssensoren des gewaehlten Raums.
        for (let i = 0; i < MAX_VERBRAUCHER; i++) {
          const felder = ab.felder.filter((f) => f.idx === i);
          const oben = felder.filter((f) => f.feld === "entity" || f.feld === "area");
          const rest = felder.filter((f) => f.feld !== "entity" && f.feld !== "area");
          const block = document.createElement("div");
          block.className = "verbraucher";
          const titel = document.createElement("div");
          titel.className = "verbraucher-titel";
          titel.textContent = this._et("c_titel").replace("{n}", String(i + 1));
          block.appendChild(titel);
          block.appendChild(formular({ titel: ab.titel, felder: oben }));
          const info = document.createElement("div");
          info.className = "raum-info";
          info.hidden = true;
          block.appendChild(info);
          this._raumInfos[i] = info;
          block.appendChild(formular({ titel: ab.titel, felder: rest }));
          huelle.appendChild(block);
        }
      } else {
        huelle.appendChild(formular(ab));
      }
      det.appendChild(huelle);
      wurzel.appendChild(det);
    });
    this._raumInfoZeigen();
  }

  _abgleich() {
    this._formulare.forEach(({ ab, el }) => { el.data = this._daten(ab); });
    this._raumInfoZeigen();
  }

  /** Werte eines Abschnitts in die Konfiguration schreiben. Leere Felder fallen weg. */
  _uebernehmen(ab, werte) {
    const c = {
      ...this._config,
      entities: { ...(this._config.entities || {}) },
      consumers: (this._config.consumers || []).map((x) => ({ ...x })),
    };
    ab.felder.forEach((f) => {
      let v = werte[f.name];
      if (f.name === "battery_bar_animation" && v !== undefined && v !== "") v = Number(v);
      // "Automatisch" beim Platz heisst: nichts festlegen.
      if (/position$/.test(f.name) && v === "auto") v = "";
      const leer = v === undefined || v === null || v === "";
      // Ein geleertes Namensfeld bleibt als "" stehen: keine Beschriftung.
      // Namensfelder: Der Standardname bleibt ungespeichert, ein geleertes
      // Feld wird als "" gespeichert und heisst: keine Beschriftung. Je nach
      // Version liefert das Formular dabei "" oder gar keinen Wert.
      if (NAME_STANDARD[f.name]) {
        if (v === undefined || v === null || v === "") c[f.name] = "";
        else if (v === this._standardName(f.name) && c[f.name] === undefined) delete c[f.name];
        else c[f.name] = v;
        return;
      }
      if (f.ort === "e") {
        if (leer) delete c.entities[f.name];
        else c.entities[f.name] = v;
      } else if (f.ort === "c") {
        while (c.consumers.length <= f.idx) c.consumers.push({});
        if (leer) delete c.consumers[f.idx][f.feld];
        else c.consumers[f.idx][f.feld] = v;
      } else if (leer || v === DEFAULT_CONFIG[f.name]) {
        // Standardwerte nicht ins YAML schreiben, das bleibt kurz.
        delete c[f.name];
      } else {
        c[f.name] = v;
      }
    });
    // Leere Verbraucher am Ende entfernen, Luecken dazwischen behalten.
    while (c.consumers.length && !c.consumers[c.consumers.length - 1].entity &&
           !c.consumers[c.consumers.length - 1].area &&
           !c.consumers[c.consumers.length - 1].name) {
      c.consumers.pop();
    }
    if (!c.consumers.length) delete c.consumers;
    const spracheAlt = this._sp();
    this._config = c;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: c }, bubbles: true, composed: true,
    }));
    // Neue Sprache: Beschriftungen neu aufbauen.
    if (this._sp() !== spracheAlt) {
      this._built = false;
      this._aufbauen();
    }
  }

  _css() {
    return `
      .ed { display: flex; flex-direction: column; gap: 8px; }
      .lade { color: var(--secondary-text-color); }
      .version { color: var(--secondary-text-color); font-size: 12px; text-align: right; padding: 0 4px; }
      details {
        border: 1px solid var(--divider-color, #33415A); border-radius: 10px;
        background: var(--card-background-color, transparent);
      }
      summary {
        cursor: pointer; padding: 12px 14px; font-weight: 600;
        list-style: none; user-select: none;
      }
      summary::-webkit-details-marker { display: none; }
      summary::before { content: "▸"; display: inline-block; width: 18px; transition: transform 150ms ease; }
      details[open] > summary::before { transform: rotate(90deg); }
      .inhalt { padding: 0 14px 14px; }
      .verbraucher { border-top: 1px solid var(--divider-color, #33415A); padding-top: 10px; margin-top: 10px; }
      .verbraucher:first-child { border-top: none; margin-top: 0; }
      .verbraucher-titel { font-weight: 600; margin-bottom: 6px; }
      .raum-info { margin: 4px 0 12px; padding: 8px 10px; font-size: 13px; color: var(--secondary-text-color);
        border-left: 3px solid var(--primary-color, #3D8BFF); background: rgba(127, 127, 127, 0.08); border-radius: 4px; }
      .raum-info .raum-kopf { color: var(--primary-text-color); }
      .raum-info li.aus { text-decoration: line-through; opacity: 0.6; }
      .raum-info em { text-decoration: none; font-style: normal; }
      .raum-info ul { margin: 4px 0 0; padding-left: 18px; }
      .raum-info span { opacity: 0.7; font-size: 12px; }
    `;
  }
}

// Wird die Datei zweimal geladen, etwa ueber HACS und zusaetzlich als
// eigene Ressource, wuerde eine zweite Registrierung einen Fehler werfen.
if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, LutarymEnergyFlowCard);
if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, LutarymEnergyFlowCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((k) => k.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG,
    name: "Energy Flow Card by Lutarym",
    description: TEXTE.en.beschreibung,
    preview: true,
    documentationURL: "https://github.com/Lutarym/Energy-Flow-Card-by-Lutarym",
  });
}

console.info(
  `%c ENERGY FLOW BY LUTARYM %c ${CARD_VERSION} `,
  "background:#0D131B;color:#FFC44D;font-weight:600;padding:2px 6px;border-radius:3px 0 0 3px",
  "background:#FFC44D;color:#0D131B;font-weight:600;padding:2px 6px;border-radius:0 3px 3px 0"
);
