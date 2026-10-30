# Changelog

**English** · [Deutsch](#deutsch) · [Français](#français) · [日本語](#日本語)

## English

### v1.3.2

- Fix: name fields in the editor show the name that is drawn. A cleared field really removes the label, for example HOME

### v1.3.1

- The editor shows the card version at the top

### v1.3.0

- New: grid import and cost since the billing date, cost from energy price plus base fee or from a cost sensor
- Home label can be hidden: set its name to empty

### v1.2.3

- Lines with power from several sources show every colour in proportion, also small shares, for example every sixth dash yellow at 1/6 solar and 5/6 grid
- Default places restored: heat pump top, wallbox bottom

### v1.1.0

- New layout: the home stands in the middle of seven places for heat pump, wallbox and consumers, solar, grid and battery on the left
- Inverter removed from the drawing, its value only repeated solar and battery
- Further consumers are now shown as normal sized circles, up to seven, each with its own line from the home
- Place of heat pump, wallbox and every consumer selectable in the editor

### v1.0.1

- Fix: the line to the further consumers now only runs up to the last consumer that draws power
- Fix: values below `min_flow` no longer add up to an active line

### v1.0.0

First release.

- Energy flow between solar, inverter, battery, grid and home, plus heat pump, wallbox and up to four further consumers
- Line colours show the source of the power
- 10 line animations, battery bar with 13 animations
- Visual editor, demo mode
- Languages: English, German, French and Japanese

## Deutsch

### v1.3.2

- Behoben: Namensfelder im Editor zeigen den Namen, der in der Grafik steht. Ein geleertes Feld entfernt die Beschriftung wirklich, zum Beispiel HAUS

### v1.3.1

- Der Editor zeigt oben die Version der Karte

### v1.3.0

- Neu: Netzbezug und Kosten seit dem Abrechnungsdatum, Kosten aus Arbeitspreis plus Grundgebühr oder aus einem Kosten-Sensor
- Beschriftung des Hauses ausblendbar: Namen leer setzen

### v1.2.3

- Leitungen mit Strom aus mehreren Quellen zeigen jede Farbe anteilig, auch kleine Anteile, zum Beispiel jeden sechsten Strich gelb bei 1/6 PV und 5/6 Netz
- Standardplätze wiederhergestellt: Wärmepumpe oben, Wallbox unten

### v1.1.0

- Neue Anordnung: Das Haus steht in der Mitte von sieben Plätzen für Wärmepumpe, Wallbox und Verbraucher, links PV, Netz und Akku
- Wechselrichter aus der Grafik entfernt, sein Wert wiederholte nur PV und Akku
- Weitere Verbraucher werden jetzt als normal große Kreise gezeigt, bis zu sieben, jeder mit eigener Leitung aus dem Haus
- Platz von Wärmepumpe, Wallbox und jedem Verbraucher im Editor wählbar

### v1.0.1

- Behoben: Die Leitung zu den weiteren Verbrauchern läuft nur noch bis zum letzten Verbraucher, der Strom bezieht
- Behoben: Werte unter `min_flow` ergeben zusammen keine aktive Leitung mehr

### v1.0.0

Erste Veröffentlichung.

- Energiefluss zwischen PV, Wechselrichter, Akku, Netz und Haus, dazu Wärmepumpe, Wallbox und bis zu vier weitere Verbraucher
- Die Farben der Leitungen zeigen die Herkunft des Stroms
- 10 Animationen der Leitungen, Akkusäule mit 13 Animationen
- Visueller Editor, Demomodus
- Sprachen: Englisch, Deutsch, Französisch und Japanisch

## Français

### v1.3.2

- Corrigé : les champs de nom de l'éditeur montrent le nom affiché. Un champ vidé retire vraiment l'étiquette, par exemple MAISON

### v1.3.1

- L'éditeur affiche la version de la carte en haut

### v1.3.0

- Nouveau : soutirage et coût depuis la date de facturation, coût à partir du prix du kWh plus l'abonnement ou d'un capteur de coût
- Étiquette de la maison masquable : définir son nom vide

### v1.2.3

- Les lignes alimentées par plusieurs sources montrent chaque couleur en proportion, même les petites parts, par exemple un trait sur six jaune pour 1/6 de solaire et 5/6 de réseau
- Emplacements par défaut rétablis : pompe à chaleur en haut, borne en bas

### v1.1.0

- Nouvelle disposition : la maison est au milieu de sept emplacements pour la pompe à chaleur, la borne et les consommateurs, le solaire, le réseau et la batterie à gauche
- Onduleur retiré du dessin, sa valeur ne faisait que répéter le solaire et la batterie
- Les autres consommateurs sont maintenant affichés en cercles de taille normale, jusqu'à sept, chacun avec sa propre ligne depuis la maison
- Emplacement de la pompe à chaleur, de la borne et de chaque consommateur au choix dans l'éditeur

### v1.0.1

- Corrigé : la ligne vers les autres consommateurs ne va plus que jusqu'au dernier consommateur qui consomme du courant
- Corrigé : les valeurs sous `min_flow` ne s'additionnent plus en une ligne active

### v1.0.0

Première version.

- Flux d'énergie entre le solaire, l'onduleur, la batterie, le réseau et la maison, ainsi que la pompe à chaleur, la borne et jusqu'à quatre autres consommateurs
- Les couleurs des lignes montrent l'origine du courant
- 10 animations des lignes, barre de batterie avec 13 animations
- Éditeur visuel, mode démo
- Langues : anglais, allemand, français et japonais

## 日本語

### v1.3.2

- 修正：エディターの名前欄に図の名前を表示。欄を空にするとラベル（例：家庭）が確実に消えます

### v1.3.1

- エディターの上部にカードのバージョンを表示

### v1.3.0

- 新機能：請求日以降の買電量と電気代（電力量料金＋基本料金、またはコストセンサー）
- 家庭のラベルを非表示可能：名前を空に設定

### v1.2.3

- 複数の電源からのラインは、小さな割合も含めて各色を割合に応じて表示（例：太陽光1/6、系統5/6なら6本に1本が黄色）
- 既定の配置を復元：ヒートポンプは上、EV充電器は下

### v1.1.0

- 新しい配置：家庭がヒートポンプ、EV充電器、機器のための7つの配置の中央、左に太陽光、系統、蓄電池
- パワコンを図から削除（値は太陽光と蓄電池の繰り返しのみ）
- その他の機器は通常サイズの円で表示され、それぞれ家庭から専用のラインで接続（最大7台）
- ヒートポンプ、EV充電器、各機器の配置をエディターで選択可能

### v1.0.1

- 修正：その他の機器へのラインは、電力を使用している最後の機器までのみ流れるようになりました
- 修正：`min_flow` 未満の値が合算されてラインが動作することはなくなりました

### v1.0.0

最初のリリース。

- 太陽光、パワコン、蓄電池、系統、家庭の間のエネルギーの流れ、さらにヒートポンプ、EV充電器、最大4台のその他の機器
- ラインの色で電気の出どころを表示
- 10種類のラインアニメーション、13種類のアニメーション付き蓄電池バー
- ビジュアルエディター、デモモード
- 言語：英語、ドイツ語、フランス語、日本語
