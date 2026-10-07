# Energy Flow Card by Lutarym

Version 1.0.1

[English](README.md) · [Deutsch](README.de.md) · **Français** · [日本語](README.ja.md)

![Capture d'écran de la carte](https://raw.githubusercontent.com/Lutarym/Energy-Flow-Card-by-Lutarym/main/docs/screenshot-fr.png)

Carte Lovelace animée pour Home Assistant. Elle montre le flux d'énergie entre le solaire, l'onduleur, la batterie, le réseau et la maison, ainsi que la pompe à chaleur, la borne de recharge et jusqu'à quatre autres consommateurs.

La carte est optimisée pour les tarifs d'électricité dynamiques : les couleurs des lignes montrent à tout moment d'où vient le courant et où il va, par exemple quand le courant bon marché du réseau charge la batterie.

## Fonctions

- Construite comme une vraie installation : solaire et batterie sur l'onduleur, l'onduleur alimente la maison, le réseau est raccordé à la maison
- Pompe à chaleur, borne de recharge et jusqu'à quatre autres consommateurs sur leur propre ligne de distribution
- Chaque appareil a sa propre couleur. Les lignes montrent d'où vient le courant : solaire jaune, réseau bleu, batterie vert, par exemple bleu du réseau jusqu'à la batterie quand un tarif dynamique charge la batterie. Le courant de deux sources montre les deux couleurs en alternance
- La vitesse des traits suit la puissance
- Design minimaliste : nœuds ronds avec petits symboles, anneau lumineux en fonctionnement
- Les rayons du soleil et le ventilateur de la pompe à chaleur tournent avec la puissance, le symbole de la borne pulse pendant la charge
- L'anneau de la batterie montre l'état de charge, l'anneau de la maison l'origine du courant
- Barre de batterie à droite avec 13 animations, reprise de lutarym-battery-card
- Ligne supplémentaire optionnelle pour chaque appareil, par exemple production du jour, température de départ ou état de charge de la voiture
- Un clic sur un appareil ouvre son entité dans Home Assistant
- Éditeur visuel, mode démo, anglais, allemand, français et japonais

## Prérequis

- Home Assistant 2024.1.0 ou plus récent
- Capteurs de puissance en W ou kW

## Installation

### HACS

1. Ouvrir HACS, menu avec les trois points, Dépôts personnalisés
2. Dépôt : `https://github.com/Lutarym/Energy-Flow-Card-by-Lutarym`, catégorie : **Dashboard**
3. Chercher la carte et la télécharger
4. Recharger le navigateur sans cache

### Manuelle

1. Télécharger `energy-flow-card-by-lutarym.js` depuis la dernière version
2. Le copier dans `<config>/www/community/energy-flow-card-by-lutarym/`
3. Paramètres, Tableaux de bord, menu avec les trois points, Ressources, Ajouter une ressource
4. URL `/local/community/energy-flow-card-by-lutarym/energy-flow-card-by-lutarym.js`, type **Module JavaScript**

## Configuration

Le plus simple est l'éditeur visuel. Une nouvelle carte démarre en mode démo. Le désactiver et attribuer ses propres entités.

### Exemple en YAML

```yaml
type: custom:energy-flow-card-by-lutarym
entities:
  pv: sensor.puissance_solaire
  grid: sensor.puissance_reseau
  battery: sensor.puissance_batterie
  battery_soc: sensor.etat_charge_batterie
  heatpump: sensor.puissance_pompe_a_chaleur
  wallbox: sensor.puissance_borne
consumers:
  - entity: sensor.puissance_lave_linge
    name: Lave-linge
    icon: waschmaschine
```

### Entités

| Clé | Signification |
|---|---|
| `pv` | Puissance solaire |
| `grid` | Puissance réseau, positive signifie soutirage |
| `grid_import`, `grid_export` | À la place de `grid` : deux capteurs séparés |
| `battery` | Puissance batterie, positive signifie décharge |
| `battery_charge`, `battery_discharge` | À la place de `battery` : deux capteurs séparés |
| `battery_soc` | État de charge de la batterie en % |
| `battery_capacity` | Capacité maximale de la batterie en Wh ou kWh, par exemple Fronius `capacity_maximum`. La batterie affiche alors l'énergie stockée en kWh |
| `inverter` | Puissance AC de l'onduleur. Vide : calculée à partir du solaire et de la batterie |
| `home` | Consommation de la maison. Vide : calculée à partir du solaire, du réseau et de la batterie |
| `heatpump` | Puissance de la pompe à chaleur |
| `wallbox` | Puissance de charge de la borne |
| `pv_secondary`, `inverter_secondary`, `grid_secondary`, `battery_secondary`, `home_secondary`, `heatpump_secondary`, `wallbox_secondary` | Ligne supplémentaire optionnelle, n'importe quelle entité |

### Autres consommateurs

Jusqu'à quatre entrées sous `consumers`, chacune avec `entity`, `name`, `icon` et en option `color` (`#RRGGBB` ou `[r, g, b]`). Un consommateur reste visible quand son entité est indisponible et affiche alors `n/d`.
Symboles : `steckdose` (prise), `waschmaschine` (lave-linge), `spuelmaschine` (lave-vaisselle), `herd` (cuisinière), `kuehlschrank` (réfrigérateur), `computer` (ordinateur), `licht` (lumière), `auto` (voiture).

### Options

| Option | Défaut | Signification |
|---|---|---|
| `language` | `auto` | `auto`, `en`, `de`, `fr` ou `ja` |
| `demo` | `false` | Valeurs d'exemple pour essayer |
| `show_names` | `true` | Afficher les noms au dessus et au dessous des cercles |
| `animate` | `true` | Afficher l'animation |
| `animation_speed` | `1` | Facteur de vitesse de l'animation, 0,25 à 3 |
| `font_scale` | `1` | Facteur de taille pour tous les textes, 0,7 à 1,15 |
| `animation_style` | `striche` | Animation des lignes : `striche` (traits), `punkte` (points), `perlen` (perles), `lang` (traits longs), `komet` (comète), `morse`, `lauflicht` (chenillard), `neon`, `puls` (pulsation), `blitz` (éclair) |
| `battery_bar` | `true` | Barre de batterie à droite, sur toute la hauteur de la carte. Le flux reste aligné à gauche, la barre à droite |
| `battery_bar_animation` | `1` | Animation de la barre de batterie, 0 à 12 : statique, vagues, pulsation, bulles, paillettes, remplissage doux, miroitement, éclair, pluie, feu, matrix, ligne de balayage, battement de cœur |
| `battery_bar_percent` | `true` | Afficher le pourcentage dans la barre de batterie |
| `battery_bar_width` | `22` | Largeur de la barre de batterie en % de sa hauteur, 8 à 80 |
| `battery_capacity_kwh` | `0` | Capacité fixe de la batterie en kWh, utilisée si aucune entité `battery_capacity` n'est définie |
| `max_power` | `10000` | Puissance en W à laquelle les traits vont le plus vite |
| `kw_threshold` | `1000` | À partir de cette puissance en W, la valeur est affichée en kW |
| `min_flow` | `10` | Une puissance plus faible en W compte comme arrêt |
| `grid_invert` | `false` | Inverser le signe de `grid` |
| `battery_invert` | `false` | Inverser le signe de `battery` |
| `name_pv`, `name_inverter`, `name_grid`, `name_battery`, `name_home`, `name_heatpump`, `name_wallbox` | | Noms personnalisés, vide utilise la langue de la carte |

## Licence

GNU General Public License v3.0, voir [LICENSE](LICENSE).
