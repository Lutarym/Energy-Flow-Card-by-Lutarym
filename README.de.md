# Energy-Flow-Card-by-Lutarym

[English](README.md) · **Deutsch**

![Bildschirmfoto der Karte](https://raw.githubusercontent.com/Lutarym/Energy-Flow-Card-by-Lutarym/main/docs/screenshot-de.png)

Animierte Lovelace Karte für Home Assistant. Sie zeigt den Energiefluss zwischen PV, Wechselrichter, Akku, Netz und Haus, dazu Wärmepumpe, Wallbox und bis zu vier weitere Verbraucher.

## Funktionen

- Aufbau wie eine echte Anlage: PV und Akku am Wechselrichter, der Wechselrichter speist ins Haus, das Netz hängt am Haus
- Wärmepumpe, Wallbox und bis zu vier weitere Verbraucher an einer eigenen Verteilung
- Laufende Striche in der Farbe der Quelle, das Tempo folgt der Leistung
- Minimalistisch: runde Knoten mit kleinen Symbolen, leuchtender Ring bei Betrieb
- Sonnenstrahlen und Lüfter der Wärmepumpe drehen mit der Leistung, das Wallbox Symbol pulsiert beim Laden
- Der Ring des Akkus zeigt den Ladestand, der Ring des Hauses die Herkunft des Stroms
- Akkusäule rechts mit 13 Animationen, übernommen aus lutarym-battery-card
- Optionale Zusatzzeile je Baugruppe, zum Beispiel Ertrag heute, Vorlauf oder Ladestand des Autos
- Klick auf eine Baugruppe öffnet ihre Entität in Home Assistant
- Visueller Editor, Demomodus, Deutsch und Englisch

## Voraussetzungen

- Home Assistant 2024.1.0 oder neuer
- Leistungssensoren in W oder kW

## Installation

### HACS

1. HACS öffnen, Menü mit den drei Punkten, Benutzerdefinierte Repositories
2. Repository: `https://github.com/Lutarym/Energy-Flow-Card-by-Lutarym`, Kategorie: **Dashboard**
3. Nach der Karte suchen und herunterladen
4. Browser ohne Cache neu laden

### Manuell

1. `energy-flow-card-by-lutarym.js` aus dem neuesten Release laden
2. Nach `<config>/www/community/energy-flow-card-by-lutarym/` kopieren
3. Einstellungen, Dashboards, Menü mit den drei Punkten, Ressourcen, Ressource hinzufügen
4. URL `/local/community/energy-flow-card-by-lutarym/energy-flow-card-by-lutarym.js`, Typ **JavaScript-Modul**

## Konfiguration

Am einfachsten über den visuellen Editor. Eine neue Karte startet im Demomodus. Diesen ausschalten und die eigenen Entitäten zuordnen.

### Beispiel in YAML

```yaml
type: custom:energy-flow-card-by-lutarym
entities:
  pv: sensor.pv_leistung
  grid: sensor.netz_leistung
  battery: sensor.akku_leistung
  battery_soc: sensor.akku_ladestand
  heatpump: sensor.waermepumpe_leistung
  wallbox: sensor.wallbox_leistung
consumers:
  - entity: sensor.waschmaschine_leistung
    name: Waschmaschine
    icon: waschmaschine
```

### Entitäten

| Schlüssel | Bedeutung |
|---|---|
| `pv` | PV Leistung |
| `grid` | Netzleistung, positiv ist Bezug |
| `grid_import`, `grid_export` | Statt `grid`: zwei getrennte Sensoren |
| `battery` | Akkuleistung, positiv ist Entladen |
| `battery_charge`, `battery_discharge` | Statt `battery`: zwei getrennte Sensoren |
| `battery_soc` | Ladestand des Akkus in % |
| `battery_capacity` | Maximale Kapazität des Akkus in Wh oder kWh, z.B. Fronius `capacity_maximum`. Der Akku zeigt dann die gespeicherte Energie in kWh |
| `inverter` | AC-Leistung des Wechselrichters. Leer: wird aus PV und Akku berechnet |
| `home` | Hausverbrauch. Leer: wird aus PV, Netz und Akku berechnet |
| `heatpump` | Leistung der Wärmepumpe |
| `wallbox` | Ladeleistung der Wallbox |
| `pv_secondary`, `inverter_secondary`, `grid_secondary`, `battery_secondary`, `home_secondary`, `heatpump_secondary`, `wallbox_secondary` | Optionale Zusatzzeile, beliebige Entität |

### Weitere Verbraucher

Bis zu vier Einträge unter `consumers`, jeweils mit `entity`, `name` und `icon`. Ein Verbraucher bleibt sichtbar, wenn seine Entität ausfällt, und zeigt dann `n. v.`.
Symbole: `steckdose`, `waschmaschine`, `spuelmaschine`, `herd`, `kuehlschrank`, `computer`, `licht`, `auto`.

### Optionen

| Option | Standard | Bedeutung |
|---|---|---|
| `language` | `auto` | `auto`, `de` oder `en` |
| `demo` | `false` | Beispielwerte zum Ausprobieren |
| `animate` | `true` | Animation zeigen |
| `animation_speed` | `1` | Faktor für die Animationsgeschwindigkeit, 0,25 bis 3 |
| `font_scale` | `1` | Faktor für alle Schriften, 0,7 bis 1,3 |
| `animation_style` | `striche` | Animation der Leitungen: `striche`, `punkte`, `perlen`, `lang`, `komet`, `morse`, `lauflicht`, `neon`, `puls`, `blitz` |
| `battery_bar` | `true` | Akkusäule rechts, über die ganze Höhe der Karte |
| `battery_bar_animation` | `1` | Animation der Akkusäule, 0 bis 12: statisch, Wellen, Pulsieren, Blasen, Glitzer, sanft auffüllend, Schimmern, Blitz, Regen, Feuer, Matrix, Scanline, Herzschlag |
| `battery_bar_percent` | `true` | Prozent in der Akkusäule anzeigen |
| `battery_capacity_kwh` | `0` | Feste Kapazität des Akkus in kWh, falls keine Entität `battery_capacity` gesetzt ist |
| `max_power` | `10000` | Leistung in W, bei der die Striche am schnellsten laufen |
| `kw_threshold` | `1000` | Ab dieser Leistung in W wird in kW angezeigt |
| `min_flow` | `10` | Kleinere Leistung in W gilt als Stillstand |
| `grid_invert` | `false` | Vorzeichen von `grid` umkehren |
| `battery_invert` | `false` | Vorzeichen von `battery` umkehren |
| `name_pv`, `name_inverter`, `name_grid`, `name_battery`, `name_home`, `name_heatpump`, `name_wallbox`, `name_consumers` | | Eigene Namen, leer nimmt die Kartensprache |

## Lizenz

GNU General Public License v3.0, siehe [LICENSE](LICENSE).
