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

const CARD_VERSION = "1.0.0";
const CARD_TAG = "energy-flow-card-by-lutarym";
const EDITOR_TAG = "energy-flow-card-by-lutarym-editor";

/* ------------------------------------------------------------------ *
 *  Farben
 *  Es gibt genau drei Farben, eine je Quelle: PV gelb, Netz blau,
 *  Akku gruen. Jede Leitung und jeder Ring traegt die Farbe der Quelle,
 *  aus der der Strom gerade stammt, egal wohin er fliesst. Laedt etwa
 *  das Netz den Akku, ist der ganze Weg vom Netz bis zum Akku blau.
 *  Kommt der Strom aus zwei Quellen, wechseln sich beide Farben ab.
 * ------------------------------------------------------------------ */
const FARBE = {
  pv: "#FFC44D",
  netz: "#4D9BFF",
  akku: "#5BE08F",
};

// Zweite Farbe nur zeigen, wenn diese Quelle mindestens so viel beitraegt.
const MISCH_SCHWELLE = 0.2;

/**
 * Ermittelt aus Anteilen [[farbe, watt], ...] die Hauptfarbe und, falls
 * eine zweite Quelle nennenswert beitraegt, auch deren Farbe.
 */
function mischung(anteile) {
  const liste = anteile.filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
  const summe = liste.reduce((a, [, w]) => a + w, 0);
  if (!liste.length) return { haupt: null, neben: null };
  const neben = liste[1] && liste[1][1] / summe >= MISCH_SCHWELLE ? liste[1][0] : null;
  return { haupt: liste[0][0], neben };
}
const NEUTRAL = "#46536A";

/* ------------------------------------------------------------------ *
 *  Zeichenraster
 *  Aufbau wie eine echte Anlage, in drei Spalten:
 *    PV        Netz      Waermepumpe
 *    WR        Haus      Wallbox
 *    Akku      weitere Verbraucher
 *  PV und Akku haengen am Wechselrichter, der Wechselrichter speist ins
 *  Haus, das Netz haengt direkt am Haus, die Verbraucher am Haus.
 *  Jede Leitung verbindet nur direkte Nachbarn, nichts kreuzt sich.
 *  Die Leitungen beginnen in den Kreismitten, die Kreise liegen darueber.
 * ------------------------------------------------------------------ */
const G = {
  W: 600,
  W_OHNE_RECHTS: 400,
  H: 520,
  H_KURZ: 340,
  R: 56,
  R_KLEIN: 28,
  PV: { x: 100, y: 90 },
  WR: { x: 100, y: 260 },
  AKKU: { x: 100, y: 430 },
  NETZ: { x: 310, y: 90 },
  HAUS: { x: 310, y: 260 },
  WP: { x: 520, y: 90 },
  WB: { x: 520, y: 260 },
  EX_SCHIENE: 385,
  EX_Y: 440,
  EX_X: [255, 345, 425, 505],
};

const LEITUNGEN = {
  pv_wr: "M100 90 V 260",
  akku_wr: "M100 430 V 260",
  wr_haus: "M100 260 H 310",
  netz_haus: "M310 90 V 260",
  // Waermepumpe und Wallbox haben je eine eigene Leitung aus dem Haus.
  bus_wp: "M310 225 H 410 V 90 H 520",
  bus_wb: "M310 260 H 520",
  bus_ex: "M310 260 V 385",
};

/** Schiene zu den weiteren Verbrauchern: links ein Abzweig, rechts der Rest. */
function exSchiene(seite, anzahl) {
  if (seite === "l") return `M310 ${G.EX_SCHIENE} H ${G.EX_X[0]}`;
  return `M310 ${G.EX_SCHIENE} H ${G.EX_X[Math.max(1, anzahl - 1)]}`;
}
function exAbzweig(i) {
  return `M${G.EX_X[i]} ${G.EX_SCHIENE} V ${G.EX_Y}`;
}

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

// Laenge eines Strichs plus Luecke. Muss zur stroke-dasharray im CSS passen.
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
const SPRACHEN = ["de", "en"];
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
  },
};

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
  entities: {},
  consumers: [],
};

const MAX_VERBRAUCHER = 4;

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
    this._fluss = new Map(); // Leitung -> { tempo, versatz, rueck }
    this._dreh = new Map(); // Element -> { gradProSek, winkel }
    this._puls = new Map(); // Element -> { dauer, min, max }
    this._elCache = new Map();
  }

  /* -------------------- Lebenszyklus -------------------- */

  connectedCallback() {
    if (this._built && this._beobachter) {
      const svg = this.shadowRoot.querySelector("svg");
      if (svg) this._beobachter.observe(svg);
    }
    if (this._built && !this._animLoop) this._startAnimation();
    if (this._config && this._config.demo) this._demoStart();
  }

  disconnectedCallback() {
    if (this._beobachter) this._beobachter.disconnect();
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
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      entities: { ...(config.entities || {}) },
      consumers: Array.isArray(config.consumers)
        ? config.consumers.filter((c) => c && c.entity).slice(0, MAX_VERBRAUCHER)
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
    this._render();
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

  /** Laenge eines Strichmusters des gewaehlten Stils. */
  _periode() {
    return this._stil().dash.reduce((a, b) => a + b, 0) || STRICH_PERIODE;
  }

  /** Gewaehlter Animationsstil, unbekannte Namen fallen auf Striche zurueck. */
  _stil() {
    const name = this._config && this._config.animation_style;
    return STILE[name] || STILE.striche;
  }

  /** Eingestellter Schriftfaktor, begrenzt auf einen lesbaren Bereich. */
  _fs() {
    return clamp(Number(this._config && this._config.font_scale) || 1, 0.7, 1.3);
  }

  /** Eigener Name gewinnt, sonst der Name in der Kartensprache. */
  _name(schluessel, standard) {
    const eigen = this._config && this._config[`name_${schluessel}`];
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
    if (!Number.isNaN(v) && String(v) === String(roh).trim()) {
      const stellen = Math.abs(v) < 10 && !Number.isInteger(v) ? 1 : 0;
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
    return this._zustand(id) ? this._t("nv") : "--";
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
    return this._sp() === "de" ? s.replace(".", ",") : s;
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

    // Hausverbrauch: eigene Entitaet gewinnt, sonst aus der Bilanz.
    let haus = null;
    if (!demo && e.home) {
      const h = this._leistung("home");
      haus = h === null ? null : Math.max(0, h);
    } else if (pv !== null || bezug !== null || entladen !== null) {
      haus = Math.max(
        0,
        (pv || 0) + (bezug || 0) + (entladen || 0) - (einspeisung || 0) - (laden || 0)
      );
    }

    const wp = demo || e.heatpump ? this._leistung("heatpump") : null;
    const wb = demo || e.wallbox ? this._leistung("wallbox") : null;
    const verbraucher = this._verbraucherListe().map((v) => ({
      ...v,
      w: this._leistungVon(v.id),
    }));

    const fluss = verteile({ pv, bezug, einspeisung, laden, entladen, haus });

    // Wechselrichter: AC-Leistung ins Haus. Eigene Entitaet gewinnt,
    // sonst PV plus Entladen minus Laden. Negativ heisst: das Netz laedt
    // ueber das Haus den Akku.
    const hatWr = hatPv || hatAkku;
    let wr = null;
    if (hatWr) {
      const eigen = !demo && e.inverter ? this._leistung("inverter") : null;
      wr = eigen !== null ? eigen
        : (pv || 0) + (entladen || 0) - (laden || 0);
    }

    return {
      hatPv, hatNetz, hatAkku, hatWr, wr,
      pv, bezug, einspeisung, laden, entladen, soc, haus,
      wp, wb, verbraucher, fluss,
    };
  }

  _verbraucherListe() {
    if (this._config.demo) {
      const sp = this._sp();
      return this._demo
        ? this._demo.verbraucher.map((v) => ({ ...v, name: v.name[sp] || v.name.en }))
        : [];
    }
    return (this._config.consumers || []).map((v, i) => ({
      id: v.entity,
      name: v.name || this._friendly(v.entity) || `${this._t("verbraucher")} ${i + 1}`,
      symbol: SYMBOLE[v.icon] ? v.icon : "steckdose",
    }));
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
        { id: "demo.c0", name: { de: "Waschmaschine", en: "Washer" }, symbol: "waschmaschine" },
        { id: "demo.c1", name: { de: "Kühlschrank", en: "Fridge" }, symbol: "kuehlschrank" },
        { id: "demo.c2", name: { de: "Server", en: "Server" }, symbol: "computer" },
        { id: "demo.c3", name: { de: "Licht", en: "Lights" }, symbol: "licht" },
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
    const rechts = this._zeigtRechts();
    const akku = this._zeigtAkku();
    const anzahl = this._verbraucherListe().length;
    if (this._built && (this._gebautMit !== sprache || this._gebautRechts !== rechts ||
        this._gebautAkku !== akku || this._gebautEx !== anzahl)) {
      this._built = false;
    }
    if (!this._built) {
      this._build();
      this._built = true;
      this._gebautMit = sprache;
      this._gebautRechts = rechts;
      this._gebautAkku = akku;
      this._gebautEx = anzahl;
    }
    this._update();
  }

  /** Ob die rechte Spalte mit Waermepumpe, Wallbox oder Verbrauchern gebraucht wird. */
  _zeigtRechts() {
    const c = this._config;
    if (c.demo) return true;
    const e = c.entities || {};
    return Boolean(e.heatpump || e.wallbox || (c.consumers && c.consumers.length));
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
      </ha-card>`;
    this.shadowRoot.replaceChildren(root);
    this._rahmenFuer = null;
    this._saeuleZustand = null;
    this._saeuleStand = null;
    this._saeuleMass = null;
    // Die Leinwand muss der Saeule folgen, wenn sich die Kartengroesse aendert.
    if (this._beobachter) this._beobachter.disconnect();
    if (window.ResizeObserver) {
      this._beobachter = new ResizeObserver(() => this._saeuleLage());
      const svg = this.shadowRoot.querySelector("svg");
      if (svg) this._beobachter.observe(svg);
      const szene = this.shadowRoot.querySelector(".lef-scene");
      if (szene) this._beobachter.observe(szene);
    }
    this._klicks();
    this._startAnimation();
  }

  /** Klick auf eine Baugruppe oeffnet den Detaildialog von Home Assistant. */
  _klicks() {
    const sr = this.shadowRoot;
    const ueber = sr.getElementById("bat-ueber");
    const saeule = sr.getElementById("akku-saeule");
    if (ueber && saeule) ueber.addEventListener("click", () => saeule.dispatchEvent(new Event("click")));
    sr.querySelectorAll("[data-entity]").forEach((el) => {
      el.addEventListener("click", () => {
        if (this._config.demo) return;
        const id = this._id(el.dataset.entity) || el.dataset.entityId;
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
        <path class="flow" id="f-${id}" d="${pfad}"/>
        <path class="flow" id="f2-${id}" d="${pfad}"/>
      </g>`;
  }

  /**
   * Ein Knoten: Kreis mit Leuchtring, kleinem Symbol und Werten.
   * Alles innen ist relativ zur Kreismitte gezeichnet.
   */
  _knoten({ id, pos, r, label, labelUnten, entity, icon, inhalt }) {
    const radius = r || G.R;
    const f = this._fs();
    const ly = labelUnten ? radius + (radius > 40 ? 20 : 14) * f : -(radius + 12);
    return `
      <g class="node" id="dev-${id}" transform="translate(${pos.x} ${pos.y})" ${entity ? `data-entity="${entity}"` : ""}>
        <circle id="glow-${id}" class="node-glow" r="${radius}" opacity="0" filter="url(#glowBlur)"/>
        <circle class="node-bg" r="${radius}"/>
        <circle id="ring-${id}" class="node-ring" r="${radius}"/>
        ${label ? `<rect class="label-bg" x="${-(String(label).length * (radius > 40 ? 4.6 : 3.4) * f + 8)}" y="${ly - 12 * f}"
              width="${String(label).length * (radius > 40 ? 9.2 : 6.8) * f + 16}" height="${16 * f}" rx="${8 * f}"/>` : ""}
        <text class="node-label${radius > 40 ? "" : " klein"}" id="${id}-label" y="${ly}" text-anchor="middle">${escapeHtml(label)}</text>
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

  /** Ring aus Teilbogen, fuer Akkustand und die Herkunft des Hausstroms. */
  _bogen(id, farbe) {
    return `<circle id="${id}" class="bogen" r="${G.R}" stroke="${farbe}"
              stroke-dasharray="0 ${(2 * Math.PI * G.R).toFixed(1)}" transform="rotate(-90)"/>`;
  }

  _svg() {
    const rechts = this._zeigtRechts();
    const akku = this._zeigtAkku();
    const ex = this._verbraucherListe();
    const breite = rechts ? G.W : G.W_OHNE_RECHTS;
    // Ohne Akku und ohne Verbraucherreihen endet die Zeichnung unter der Mittelreihe.
    const hoehe = akku || (rechts && ex.length) ? G.H : G.H_KURZ;

    const rechteSpalte = !rechts ? "" : `
      ${this._leitung("bus_wp")}
      ${this._leitung("bus_wb")}
      ${ex.length ? this._leitung("bus_ex") : ""}
      ${ex.length ? this._leitung("ex_l", exSchiene("l", ex.length)) : ""}
      ${ex.length > 1 ? this._leitung("ex_r", exSchiene("r", ex.length)) : ""}
      ${ex.map((_, i) => this._leitung(`exa${i}`, exAbzweig(i))).join("")}
      ${ex.length ? `<circle cx="310" cy="${G.EX_SCHIENE}" r="6" class="knotenpunkt"/>` : ""}
      ${this._knoten({ id: "wp", pos: G.WP, label: this._name("heatpump", "wp"), entity: "heatpump",
        icon: ICON.wp, inhalt: this._werte("wp", "wp-c") })}
      ${this._knoten({ id: "wb", pos: G.WB, label: this._name("wallbox"), entity: "wallbox",
        icon: ICON.wb, inhalt: this._werte("wb", "wb-c") })}
      ${ex.map((v, i) => this._knoten({
        id: `ex${i}`, r: G.R_KLEIN, labelUnten: true,
        pos: { x: G.EX_X[i], y: G.EX_Y },
        label: kuerzen(v.name, 11),
        icon: `<g id="ex${i}-sym">${SYMBOLE[v.symbol] || SYMBOLE.steckdose}</g>`,
        inhalt: `<text class="value-k" id="ex${i}-v" y="${(14 + 2 * this._fs()).toFixed(1)}" text-anchor="middle">--</text>`,
      })).join("")}`;

    return `
    <svg viewBox="0 0 ${breite} ${hoehe}" class="lef-svg" role="img" aria-label="Energy flow"
         preserveAspectRatio="xMinYMid meet">
      ${this._defs()}
      <g id="fluss-inhalt">
      ${this._leitung("pv_wr")}
      ${this._leitung("akku_wr")}
      ${this._leitung("wr_haus")}
      ${this._leitung("netz_haus")}
      ${rechteSpalte}

      ${this._knoten({ id: "pv", pos: G.PV, label: this._name("pv"), entity: "pv",
        icon: ICON.pv, inhalt: this._werte("pv", "pv-c") })}
      ${this._knoten({ id: "wr", pos: G.WR, label: this._name("inverter", "wr"),
        entity: this._config.entities.inverter ? "inverter" : "",
        icon: ICON.wr, inhalt: this._werte("wr") })}
      ${this._knoten({ id: "akku", pos: G.AKKU, label: this._name("battery", "akku"), labelUnten: true,
        entity: this._config.entities.battery_soc ? "battery_soc" : "battery",
        icon: ICON.akku, inhalt: `${this._bogen("akku-soc", NEUTRAL)}${this._werte("akku")}` })}
      ${this._knoten({ id: "netz", pos: G.NETZ, label: this._name("grid", "netz"),
        entity: this._config.entities.grid ? "grid" : "grid_import",
        icon: ICON.netz, inhalt: this._werte("netz") })}
      ${this._knoten({ id: "haus", pos: G.HAUS, label: this._name("home", "haus"),
        entity: this._config.entities.home ? "home" : "",
        icon: ICON.haus,
        inhalt: `${this._bogen("seg-pv", FARBE.pv)}${this._bogen("seg-akku", FARBE.akku)}${this._bogen("seg-netz", FARBE.netz)}${this._werte("haus")}` })}
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

  /** Schaltet eine Leitung. Positive Leistung laeuft in Pfadrichtung. */
  _setLeitung(id, w, farbeOderMix, rueck) {
    const c = this._config;
    const mix = typeof farbeOderMix === "string" || !farbeOderMix
      ? { haupt: farbeOderMix, neben: null }
      : farbeOderMix;
    const farbe = mix.haupt || NEUTRAL;
    const aktiv = w !== null && w !== undefined && w > (Number(c.min_flow) || 0);
    const f = this._el(`f-${id}`);
    const f2 = this._el(`f2-${id}`);
    const fg = this._el(`fg-${id}`);
    const rohr = this._el(`pipe-${id}`);
    if (!f) return;
    f.classList.toggle("is-on", aktiv);
    if (fg) fg.classList.toggle("is-on", aktiv);
    // Zweite Quelle: eigene Strichspur, um eine halbe Periode versetzt.
    const gemischt = aktiv && Boolean(mix.neben);
    if (f2) {
      f2.classList.toggle("is-on", gemischt);
      if (gemischt) f2.style.stroke = mix.neben;
    }
    if (rohr) {
      rohr.style.stroke = aktiv ? farbe : "";
      rohr.classList.toggle("is-on", aktiv);
    }
    if (aktiv) {
      f.style.stroke = farbe;
      if (fg) fg.style.stroke = farbe;
      const p = anteil(w, c.max_power);
      const alt = this._fluss.get(id);
      this._fluss.set(id, {
        tempo: (14 + 110 * p) * this._stil().tempo,
        versatz: alt ? alt.versatz : 0,
        rueck: Boolean(rueck),
        els: fg ? [f, fg] : [f],
        zweit: gemischt ? f2 : null,
      });
      if (!c.animate) {
        f.setAttribute("stroke-dashoffset", "0");
        if (fg) fg.setAttribute("stroke-dashoffset", "0");
        if (gemischt) f2.setAttribute("stroke-dashoffset", (this._periode() / 2).toFixed(1));
      }
    } else {
      this._fluss.delete(id);
    }
  }

  /** Ring und Leuchten eines Knotens ein- oder ausschalten. */
  _setAktiv(id, aktiv, farbeOderMix) {
    const farbe = (farbeOderMix && farbeOderMix.haupt !== undefined
      ? farbeOderMix.haupt : farbeOderMix) || NEUTRAL;
    const ring = this._el(`ring-${id}`);
    if (ring) {
      ring.setAttribute("stroke", farbe);
      ring.classList.toggle("is-on", aktiv);
    }
    const icon = this._el(`icon-${id}`);
    if (icon) icon.style.color = aktiv ? farbe : "";
    const glow = this._el(`glow-${id}`);
    if (!glow) return;
    glow.setAttribute("stroke", farbe);
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
    const einspeisen = an(m.einspeisung) && !an(m.bezug);
    const netzW = einspeisen ? m.einspeisung : m.bezug;
    // Bezug ist blau. Bei Einspeisung traegt das Netz die Farbe dessen,
    // was eingespeist wird, also meist gelb fuer PV.
    const einspeiseMix = mischung([[FARBE.pv, f.pvNetz], [FARBE.akku, f.akkuNetz]]);
    const netzFarbe = einspeisen ? (einspeiseMix.haupt || FARBE.pv) : FARBE.netz;
    this._setText("netz-v", this._wText(netzW));
    // Ob bezogen oder eingespeist wird, zeigt die Laufrichtung der Leitung.
    this._setText("netz-s2", zusatz("grid_secondary"));
    this._setAktiv("netz", an(netzW), netzFarbe);

    /* ---- Akku ---- */
    this._zeige("dev-akku", m.hatAkku);
    this._setText("akku-v", m.soc === null ? "--" : `${Math.round(m.soc)} %`);
    // Ob geladen oder entladen wird, zeigt die Laufrichtung der Leitung.
    let akkuW = null;
    if (m.laden !== null || m.entladen !== null) {
      akkuW = an(m.laden) ? m.laden : an(m.entladen) ? m.entladen : 0;
    }
    // Statt der Leistung steht im Akku die gespeicherte Energie:
    // Ladestand mal maximale Kapazitaet.
    const kap = this._kapazitaet();
    this._setText("akku-s", kap > 0 && m.soc !== null
      ? `${this._zahlText((clamp(m.soc, 0, 100) / 100) * kap, 1)} kWh`
      : "");

    this._setText("akku-s2", zusatz("battery_secondary"));
    // Der Ladestandsbogen ist immer akkugruen, wie alles, was aus dem Akku kommt.
    this._setBogen("akku-soc", 0, m.soc === null ? 0 : m.soc / 100, FARBE.akku);
    // Beim Laden leuchtet der Akku in der Farbe der ladenden Quelle.
    const ladeMix = mischung([[FARBE.pv, f.pvAkku], [FARBE.netz, f.netzAkku]]);
    this._setAktiv("akku", an(m.laden) || an(m.entladen),
      an(m.laden) ? ladeMix : FARBE.akku);
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
    // Was das Haus gerade bezieht, in den Farben der Quellen.
    const hausMix = mischung([[FARBE.pv, f.pvHaus], [FARBE.akku, f.akkuHaus], [FARBE.netz, f.netzHaus]]);
    if (hausIcon) hausIcon.style.color = an(m.haus) ? hausMix.haupt || "" : "";

    /* ---- Wechselrichter ---- */
    this._zeige("dev-wr", m.hatWr);
    this._setText("wr-v", this._wText(m.wr === null ? null : Math.abs(m.wr)));
    this._setText("wr-s", zusatz("inverter_secondary"));
    // Der Wechselrichter traegt die Farbe dessen, was gerade durch ihn fliesst.
    const wrMix = (m.wr || 0) >= 0
      ? mischung([[FARBE.pv, f.pvHaus + f.pvNetz], [FARBE.akku, f.akkuHaus + f.akkuNetz]])
      : mischung([[FARBE.netz, f.netzAkku]]);
    // PV, die direkt in den Akku geht, laeuft auch durch den Wechselrichter.
    if (!wrMix.haupt && an(m.pv)) wrMix.haupt = FARBE.pv;
    this._setAktiv("wr", an(Math.abs(m.wr || 0)) || an(m.pv), wrMix);

    /* ---- Leitungen ---- */
    this._zeige("ltg-pv_wr", m.hatPv);
    this._zeige("ltg-akku_wr", m.hatAkku);
    this._zeige("ltg-wr_haus", m.hatWr);
    this._zeige("ltg-netz_haus", m.hatNetz);
    // PV laeuft immer in den Wechselrichter.
    this._setLeitung("pv_wr", m.pv, FARBE.pv);
    // Akku: Entladen laeuft zum Wechselrichter und ist gruen. Laden laeuft
    // zum Akku und traegt die Farbe der ladenden Quelle, also gelb fuer
    // PV und blau fuer Netzstrom, etwa beim Laden im guenstigen Tarif.
    if (an(m.entladen)) this._setLeitung("akku_wr", m.entladen, FARBE.akku, false);
    else this._setLeitung("akku_wr", m.laden, ladeMix, true);
    // Wechselrichter ins Haus: PV und Akkustrom. Negativ heisst, das Netz
    // laedt ueber das Haus den Akku, die Leitung laeuft blau zurueck.
    if ((m.wr || 0) >= 0) {
      this._setLeitung("wr_haus", m.wr,
        mischung([[FARBE.pv, f.pvHaus + f.pvNetz], [FARBE.akku, f.akkuHaus + f.akkuNetz]]), false);
    } else {
      this._setLeitung("wr_haus", -m.wr, FARBE.netz, true);
    }
    // Netz: Bezug ist blau und laeuft zum Haus. Einspeisung laeuft zum Netz
    // und traegt die Farbe dessen, was eingespeist wird.
    if (an(m.bezug)) this._setLeitung("netz_haus", m.bezug, FARBE.netz, false);
    else this._setLeitung("netz_haus", m.einspeisung, einspeiseMix.haupt ? einspeiseMix : FARBE.pv, true);

    /* ---- Rechte Spalte ---- */
    if (this._gebautRechts) {
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
      this._setAktiv("wp", an(m.wp), hausMix);
      this._setDreh("wp-rotor", an(m.wp) ? 90 + 400 * anteil(m.wp, 4000) : 0);
      this._setLeitung("bus_wp", zeigeWp ? m.wp : null, hausMix);

      // Wallbox
      this._setText("wb-v", this._verbraucherText(this._id("wallbox"), m.wb, an(m.wb)));
      this._dimm("wb-v", !an(m.wb));
      this._setText("wb-s", zusatz("wallbox_secondary"));
      this._setAktiv("wb", an(m.wb), hausMix);
      this._setPuls("wb-blitz", an(m.wb), 1.6);
      if (!an(m.wb)) {
        const blitz = this._el("wb-blitz");
        if (blitz) blitz.setAttribute("opacity", "0.5");
      }
      this._setLeitung("bus_wb", zeigeWb ? m.wb : null, hausMix);

      // Weitere Verbraucher
      let exSumme = 0;
      let rechtsEx = 0;
      m.verbraucher.forEach((v, i) => {
        const aktiv = an(v.w);
        if (aktiv) {
          exSumme += v.w;
          if (i > 0) rechtsEx += v.w;
        }
        this._setLeitung(`exa${i}`, v.w, hausMix);
        this._setText(`ex${i}-v`, this._verbraucherText(v.id, v.w, aktiv));
        this._dimm(`ex${i}-v`, !aktiv);
        this._setAktiv(`ex${i}`, aktiv, hausMix);
      });
      this._setLeitung("bus_ex", exSumme, hausMix);
      this._setLeitung("ex_l", m.verbraucher[0] ? m.verbraucher[0].w : null, hausMix);
      this._setLeitung("ex_r", rechtsEx, hausMix);

      // Waermepumpe, Wallbox und Verbraucher haben eigene Leitungen aus dem Haus.
    }

    ["pv", "wr", "akku", "netz", "haus", "wp", "wb"].forEach((id) => this._zentriere(id));
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
      { el: this._el(`${id}-v`), hoehe: 21 * f, grund: 16 * f },
      { el: this._el(`${id}-s`), hoehe: 15 * f, grund: 12 * f },
      { el: this._el(`${id}-s2`), hoehe: 15 * f, grund: 12 * f },
      { el: this._el(`${id}-s3`), hoehe: 15 * f, grund: 12 * f },
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
      if (!this.isConnected) {
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
    this._fluss.forEach((s) => {
      s.versatz = (s.versatz + (s.rueck ? 1 : -1) * s.tempo * dt) % (periode * 1000);
      const wert = s.versatz.toFixed(1);
      s.els.forEach((el) => el.setAttribute("stroke-dashoffset", wert));
      if (s.zweit) s.zweit.setAttribute("stroke-dashoffset", (s.versatz + periode / 2).toFixed(1));
    });

    // Zusatzeffekte einzelner Stile auf den laufenden Leitungen.
    if (stil.atmen || stil.zucken) {
      this._fluss.forEach((s, id) => {
        const glow = s.els[1];
        const strich = s.els[0];
        if (stil.atmen && glow) {
          const welle = 0.5 - 0.5 * Math.cos(((zeit % 1.6) / 1.6) * Math.PI * 2);
          glow.style.opacity = (0.08 + stil.schein[1] * 1.6 * welle).toFixed(2);
        }
        if (stil.zucken && strich) {
          // Pseudozufall aus Zeit und Leitung, damit nicht alle gleich flackern.
          const n = Math.sin(zeit * 37 + id.length * 13.7) * Math.sin(zeit * 11.3 + id.length);
          strich.style.opacity = n > 0.55 ? "0.35" : "0.95";
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
    return `
      /* Die Karte fuellt genau den Platz, den Home Assistant ihr gibt.
         Ist die Hoehe fest vorgegeben, wird die Zeichnung verkleinert
         statt ueber den Rand zu ragen. */
      :host { display: block; height: 100%; }
      .lef-root { height: 100%; }
      .lef {
        background: linear-gradient(180deg, #131A24 0%, #0D131B 100%);
        color: #E8EDF4; padding: 4px; overflow: hidden; position: relative;
        box-sizing: border-box; height: 100%;
        display: flex; flex-direction: column;
      }
      .lef-scene {
        flex: 1 1 auto; min-height: 0; position: relative;
        /* Die Zeichnung bleibt immer links, egal wie breit die Karte ist. */
        display: flex; align-items: center; justify-content: flex-start;
      }
      .saeule { cursor: pointer; }
      .saeule-rahmen { fill: #111821; stroke: #C3D0E0; stroke-width: 3; }
      .saeule-pol { fill: #C3D0E0; opacity: 0.6; }
      .bat-ueber { position: absolute; overflow: hidden; border-radius: 5px; cursor: pointer; }
      .bat-ueber[hidden] { display: none; }
      .bat-ueber canvas { width: 100%; height: 100%; display: block; }
      .bat-pct {
        position: absolute; left: 0; right: 0; bottom: 8px; text-align: center;
        font-weight: 700; color: #FFFFFF; text-shadow: 0 1px 3px rgba(0,0,0,0.6);
        font-family: ui-monospace, "SF Mono", Menlo, monospace; pointer-events: none;
      }
      .bat-pct[hidden] { display: none; }
      .lef-hint, .lef-demo {
        margin: 8px 8px 6px; padding: 10px 14px; border-radius: 10px; font-size: 14px;
        flex: 0 0 auto;
      }
      .lef-hint { background: #2A2313; border: 1px solid #B07B2E; color: #F2DFB0; }
      .lef-demo { background: #16233A; border: 1px solid #3E6EA8; color: #B8D0EC; font-size: 13px; }
      .lef-hint[hidden], .lef-demo[hidden] { display: none; }
      .lef-svg { width: 100%; height: auto; max-height: 100%; display: block; }

      .pipe-shell {
        fill: none; stroke: #0B1017; stroke-width: 12;
        stroke-linecap: round; stroke-linejoin: round;
      }
      .pipe {
        fill: none; stroke: #2E3848; stroke-width: 5;
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
      .knotenpunkt { fill: #111821; stroke: #2E3848; stroke-width: 2; }

      .node[data-entity] { cursor: pointer; }
      .node-bg { fill: #111821; stroke: #2A3445; stroke-width: 2; }
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
      .label-bg { fill: #10161F; }
      .node-label { fill: #7E8CA0; font-size: ${px(12)}; letter-spacing: 0.08em; text-transform: uppercase; }
      .node-label.klein { font-size: ${px(11)}; letter-spacing: 0.02em; text-transform: none; }
      .icon {
        color: #55657F; fill: none; stroke: currentColor; stroke-width: 1.8;
        stroke-linecap: round; stroke-linejoin: round; transition: color 500ms ease;
      }
      .value, .value-k, .sub {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      .value { fill: #E8EDF4; font-size: ${px(18)}; font-weight: 700; transition: fill 500ms ease; }
      .value-k { fill: #E8EDF4; font-size: ${px(9.5)}; font-weight: 700; }
      .sub { fill: #7E8CA0; font-size: ${px(11)}; transition: fill 500ms ease; }

      .is-aus { fill: #7E8CA0; font-weight: 600; }
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
    demo: "Demomodus (Beispielwerte)",
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
    name_consumers: "Eigener Name des Bereichs",
    c_entity: "Verbraucher {n}: Leistung",
    c_name: "Verbraucher {n}: Name",
    c_icon: "Verbraucher {n}: Symbol",
    sek_pv: "PV",
    sek_netz: "Netz",
    sek_akku: "Akku",
    sek_haus: "Haus",
    sek_wp: "Wärmepumpe",
    sek_wb: "Wallbox",
    sek_ex: "Weitere Verbraucher",
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
    demo: "Demo mode (sample values)",
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
    name_consumers: "Own name of section",
    c_entity: "Consumer {n}: power",
    c_name: "Consumer {n}: name",
    c_icon: "Consumer {n}: symbol",
    sek_pv: "Solar",
    sek_netz: "Grid",
    sek_akku: "Battery",
    sek_haus: "Home",
    sek_wp: "Heat pump",
    sek_wb: "Wallbox",
    sek_ex: "Further consumers",
    lade: "Loading editor …",
    auto: "Automatic",
    sym: {
      steckdose: "Socket", waschmaschine: "Washer", spuelmaschine: "Dishwasher",
      herd: "Stove", kuehlschrank: "Fridge", computer: "Computer", licht: "Light", auto: "Car",
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
    const verbraucher = [];
    for (let i = 0; i < MAX_VERBRAUCHER; i++) {
      verbraucher.push(
        { name: `c${i}_entity`, ort: "c", feld: "entity", idx: i, selector: LEISTUNG },
        { name: `c${i}_name`, ort: "c", feld: "name", idx: i, selector: TEXT },
        { name: `c${i}_icon`, ort: "c", feld: "icon", idx: i,
          selector: { select: { mode: "dropdown", options: symbole } } }
      );
    }
    return [
      { titel: "allgemein", offen: true, felder: [
        { name: "demo", selector: JA_NEIN },
        { name: "language", selector: { select: { mode: "dropdown", options: [
          { value: "auto", label: this._et("auto") },
          { value: "de", label: "Deutsch" },
          { value: "en", label: "English" },
        ] } } },
        { name: "animate", selector: JA_NEIN },
        { name: "animation_speed", selector: { number: { min: 0.25, max: 3, step: 0.25, mode: "slider" } } },
        { name: "font_scale", selector: { number: { min: 0.7, max: 1.3, step: 0.05, mode: "slider" } } },
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
      { titel: "sek_wr", felder: [
        { name: "inverter", ort: "e", selector: LEISTUNG },
        { name: "inverter_secondary", ort: "e", selector: BELIEBIG },
        { name: "name_inverter", selector: TEXT },
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
        { name: "name_heatpump", selector: TEXT },
      ] },
      { titel: "sek_wb", felder: [
        { name: "wallbox", ort: "e", selector: LEISTUNG },
        { name: "wallbox_secondary", ort: "e", selector: BELIEBIG },
        { name: "name_wallbox", selector: TEXT },
      ] },
      { titel: "sek_ex", felder: [{ name: "name_consumers", selector: TEXT }, ...verbraucher] },
    ];
  }

  _label(feld) {
    const m = /^c(\d)_(entity|name|icon)$/.exec(feld.name);
    if (m) return this._et(`c_${m[2]}`).replace("{n}", String(Number(m[1]) + 1));
    return this._et(feld.name);
  }

  /** Aktuelle Werte eines Abschnitts aus der Konfiguration lesen. */
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
    this._formulare = [];
    this._abschnitte().forEach((ab) => {
      const det = document.createElement("details");
      if (ab.offen) det.open = true;
      const sum = document.createElement("summary");
      sum.textContent = this._et(ab.titel);
      det.appendChild(sum);
      const form = document.createElement("ha-form");
      form.hass = this._hass;
      form.schema = ab.felder.map((f) => ({ name: f.name, selector: f.selector }));
      form.data = this._daten(ab);
      form.computeLabel = (s) => this._label(ab.felder.find((f) => f.name === s.name) || s);
      form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._uebernehmen(ab, ev.detail.value || {});
      });
      const huelle = document.createElement("div");
      huelle.className = "inhalt";
      huelle.appendChild(form);
      det.appendChild(huelle);
      wurzel.appendChild(det);
      this._formulare.push({ ab, el: form });
    });
  }

  _abgleich() {
    this._formulare.forEach(({ ab, el }) => { el.data = this._daten(ab); });
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
      const leer = v === undefined || v === null || v === "";
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
    `;
  }
}

customElements.define(CARD_TAG, LutarymEnergyFlowCard);
customElements.define(EDITOR_TAG, LutarymEnergyFlowCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TAG,
  name: "Energy-Flow-Card-by-Lutarym",
  description: TEXTE.en.beschreibung,
  preview: true,
  documentationURL: "https://github.com/Lutarym/Energy-Flow-Card-by-Lutarym",
});

console.info(
  `%c ENERGY FLOW BY LUTARYM %c ${CARD_VERSION} `,
  "background:#0D131B;color:#FFC44D;font-weight:600;padding:2px 6px;border-radius:3px 0 0 3px",
  "background:#FFC44D;color:#0D131B;font-weight:600;padding:2px 6px;border-radius:0 3px 3px 0"
);
