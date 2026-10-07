# Energy Flow Card by Lutarym

Version 1.0.1

**English** · [Deutsch](README.de.md) · [Français](README.fr.md) · [日本語](README.ja.md)

![Screenshot of the card](https://raw.githubusercontent.com/Lutarym/Energy-Flow-Card-by-Lutarym/main/docs/screenshot-en.png)

Animated Lovelace card for Home Assistant that shows the energy flow between solar, inverter, battery, grid and home, plus heat pump, wallbox and up to four further consumers.

The card is optimized for dynamic electricity tariffs: the line colours show at any time where the power comes from and where it goes, for example when cheap grid power charges the battery.

## Features

- Built like a real system: solar and battery on the inverter, inverter feeds the home, grid connected to the home
- Heat pump, wallbox and up to four further consumers on their own distribution line
- Every device has its own colour. The lines show where the power comes from: solar yellow, grid blue, battery green, for example blue all the way from the grid to the battery when a dynamic tariff charges the battery. Power from two sources shows both colours alternating
- Speed of the running lines follows the power
- Minimal design: round nodes with small symbols, glowing ring when active
- Sun rays and heat pump fan turn with the power, wallbox symbol pulses while charging
- Battery ring shows the state of charge, home ring shows where the power comes from
- Battery bar on the right with 13 animations, taken from lutarym-battery-card
- Optional extra line for each device, for example yield today, flow temperature or car state of charge
- Click on a device opens its entity in Home Assistant
- Visual editor, demo mode, English, German, French and Japanese

## Requirements

- Home Assistant 2024.1.0 or later
- Power sensors in W or kW

## Installation

### HACS

1. Open HACS, menu with the three dots, Custom repositories
2. Repository: `https://github.com/Lutarym/Energy-Flow-Card-by-Lutarym`, category: **Dashboard**
3. Search for the card and download it
4. Reload the browser without cache

### Manual

1. Download `energy-flow-card-by-lutarym.js` from the latest release
2. Copy it to `<config>/www/community/energy-flow-card-by-lutarym/`
3. Settings, Dashboards, menu with the three dots, Resources, add resource
4. URL `/local/community/energy-flow-card-by-lutarym/energy-flow-card-by-lutarym.js`, type **JavaScript module**

## Configuration

The easiest way is the visual editor. A new card starts in demo mode. Switch it off and assign your entities.

### Example in YAML

```yaml
type: custom:energy-flow-card-by-lutarym
entities:
  pv: sensor.pv_power
  grid: sensor.grid_power
  battery: sensor.battery_power
  battery_soc: sensor.battery_soc
  heatpump: sensor.heatpump_power
  wallbox: sensor.wallbox_power
consumers:
  - entity: sensor.washer_power
    name: Washer
    icon: waschmaschine
```

### Entities

| Key | Meaning |
|---|---|
| `pv` | Solar power |
| `grid` | Grid power, positive is import |
| `grid_import`, `grid_export` | Instead of `grid`: two separate sensors |
| `battery` | Battery power, positive is discharge |
| `battery_charge`, `battery_discharge` | Instead of `battery`: two separate sensors |
| `battery_soc` | Battery state of charge in % |
| `battery_capacity` | Maximum battery capacity in Wh or kWh, e.g. Fronius `capacity_maximum`. The battery then shows its stored energy in kWh |
| `inverter` | Inverter AC power. Empty: calculated from solar and battery |
| `home` | Home consumption. Empty: calculated from solar, grid and battery |
| `heatpump` | Heat pump power |
| `wallbox` | Wallbox charging power |
| `pv_secondary`, `inverter_secondary`, `grid_secondary`, `battery_secondary`, `home_secondary`, `heatpump_secondary`, `wallbox_secondary` | Optional extra line, any entity |

### Further consumers

Up to four entries under `consumers`, each with `entity`, `name`, `icon` and optional `color` (`#RRGGBB` or `[r, g, b]`). A consumer stays visible when its entity is unavailable and shows `n/a`.
Symbols: `steckdose`, `waschmaschine`, `spuelmaschine`, `herd`, `kuehlschrank`, `computer`, `licht`, `auto`.

### Options

| Option | Default | Meaning |
|---|---|---|
| `language` | `auto` | `auto`, `en`, `de`, `fr` or `ja` |
| `demo` | `false` | Sample values for trying out |
| `show_names` | `true` | Show the names above and below the circles |
| `animate` | `true` | Show the animation |
| `animation_speed` | `1` | Speed factor of the animation, 0.25 to 3 |
| `font_scale` | `1` | Size factor for all text, 0.7 to 1.15 |
| `animation_style` | `striche` | Line animation: `striche` (dashes), `punkte` (dots), `perlen` (pearls), `lang` (long dashes), `komet` (comet), `morse`, `lauflicht` (running light), `neon`, `puls` (pulse), `blitz` (lightning) |
| `battery_bar` | `true` | Battery bar on the right, full height of the card. The flow stays left aligned, the bar stays right aligned |
| `battery_bar_animation` | `1` | Animation of the battery bar, 0 to 12: static, waves, pulse, bubbles, glitter, smooth fill, shimmer, lightning, rain, fire, matrix, scanline, heartbeat |
| `battery_bar_percent` | `true` | Show the percentage in the battery bar |
| `battery_bar_width` | `22` | Width of the battery bar in % of its height, 8 to 80 |
| `battery_capacity_kwh` | `0` | Fixed battery capacity in kWh, used when no `battery_capacity` entity is set |
| `max_power` | `10000` | Power in W at which the lines run fastest |
| `kw_threshold` | `1000` | From this power in W the value is shown in kW |
| `min_flow` | `10` | Lower power in W counts as idle |
| `grid_invert` | `false` | Invert the sign of `grid` |
| `battery_invert` | `false` | Invert the sign of `battery` |
| `name_pv`, `name_inverter`, `name_grid`, `name_battery`, `name_home`, `name_heatpump`, `name_wallbox` | | Own names, empty uses the card language |

## License

GNU General Public License v3.0, see [LICENSE](LICENSE).
