# Changelog

**English** · [Deutsch](#deutsch) · [Français](#français) · [日本語](#日本語)

## English

### v1.6.0

- New: click on heat pump, wallbox or a consumer shows its history of 24 hours or 7 days with average, peak and energy, also for areas

### v1.5.1

- Fix: mixed lines no longer jump. The order of the colours stays fixed, small changes of the shares no longer redistribute the dashes, a source only appears from 3 % and only disappears below 1.5 %
- Fix: the pipe under a line stays neutral, no solid coloured line appears and disappears anymore

### v1.5.0

- New: colour schemes automatic, dark, light, Home Assistant theme, OLED black, midnight blue and graphite

### v1.4.3

- Billing date repeats every year: only day and month count, on this day a new billing period starts

### v1.4.2

- Editor: every consumer has its own block, the power sensors of a chosen area are listed directly under the area field, excluded ones struck through

### v1.4.1

- The editor lists every sensor counted for an area with its value, to find and exclude double counting

### v1.4.0

- New: a consumer can be an area instead of an entity, the card adds up all power sensors of the area, with exclusions

### v1.3.3

- Fix: on lines with mixed power every colour has its own glow, small shares no longer look grey

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

### v1.6.0

- Neu: Klick auf Wärmepumpe, Wallbox oder einen Verbraucher zeigt seinen Verlauf über 24 Stunden oder 7 Tage mit Mittel, Höchstwert und Energie, auch für Räume

### v1.5.1

- Behoben: Gemischte Leitungen springen nicht mehr. Die Reihenfolge der Farben bleibt fest, kleine Änderungen der Anteile verteilen die Striche nicht neu, eine Quelle erscheint erst ab 3 % und verschwindet erst unter 1,5 %
- Behoben: Das Rohr unter einer Leitung bleibt neutral, es erscheint und verschwindet keine durchgehende farbige Linie mehr

### v1.5.0

- Neu: Farbschemas Automatisch, Dunkel, Hell, Home Assistant Design, OLED Schwarz, Mitternachtsblau und Graphit

### v1.4.3

- Abrechnungsdatum wiederholt sich jedes Jahr: Nur Tag und Monat zählen, an diesem Tag beginnt ein neuer Abrechnungszeitraum

### v1.4.2

- Editor: Jeder Verbraucher hat einen eigenen Block, die Leistungssensoren des gewählten Raums stehen direkt unter dem Feld Raum, ausgeschlossene durchgestrichen

### v1.4.1

- Der Editor listet jeden Sensor, der für einen Raum gezählt wird, mit seinem Wert, um doppelt Gezähltes zu finden und auszuschließen

### v1.4.0

- Neu: Ein Verbraucher kann statt einer Entität ein Raum sein, die Karte zählt alle Leistungssensoren des Raums zusammen, mit Ausschlüssen

### v1.3.3

- Behoben: Auf Leitungen mit gemischtem Strom hat jede Farbe ihren eigenen Schein, kleine Anteile wirken nicht mehr grau

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

### v1.6.0

- Nouveau : un clic sur la pompe à chaleur, la borne ou un consommateur montre son historique sur 24 heures ou 7 jours avec moyenne, maximum et énergie, aussi pour les pièces

### v1.5.1

- Corrigé : les lignes mixtes ne sautent plus. L'ordre des couleurs reste fixe, de petites variations des parts ne redistribuent plus les traits, une source n'apparaît qu'à partir de 3 % et ne disparaît qu'en dessous de 1,5 %
- Corrigé : le tube sous une ligne reste neutre, plus de ligne colorée continue qui apparaît et disparaît

### v1.5.0

- Nouveau : jeux de couleurs automatique, sombre, clair, thème Home Assistant, noir OLED, bleu nuit et graphite

### v1.4.3

- La date de facturation se répète chaque année : seuls le jour et le mois comptent, une nouvelle période commence ce jour-là

### v1.4.2

- Éditeur : chaque consommateur a son propre bloc, les capteurs de puissance de la pièce choisie sont listés juste sous le champ pièce, les exclus barrés

### v1.4.1

- L'éditeur liste chaque capteur compté pour une pièce avec sa valeur, pour trouver et exclure un double comptage

### v1.4.0

- Nouveau : un consommateur peut être une pièce au lieu d'une entité, la carte additionne tous les capteurs de puissance de la pièce, avec exclusions

### v1.3.3

- Corrigé : sur les lignes au courant mixte, chaque couleur a sa propre lueur, les petites parts ne paraissent plus grises

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

### v1.6.0

- 新機能：ヒートポンプ、EV充電器、機器をクリックすると24時間または7日間の履歴（平均、最大、電力量）を表示。エリアにも対応

### v1.5.1

- 修正：混在ラインが跳ねなくなりました。色の順番を固定し、割合の小さな変化では破線を再配分せず、電源は3%以上で表示、1.5%未満で非表示
- 修正：ラインの下の管は常にニュートラル。色付きの連続線が出たり消えたりしなくなりました

### v1.5.0

- 新機能：配色（自動、ダーク、ライト、Home Assistant テーマ、OLED ブラック、ミッドナイトブルー、グラファイト）

### v1.4.3

- 請求日は毎年繰り返し：日と月のみ使用し、その日に新しい請求期間が始まります

### v1.4.2

- エディター：機器ごとに専用ブロック、選択したエリアの電力センサーをエリア欄のすぐ下に一覧表示（除外したものは取り消し線）

### v1.4.1

- エディターにエリアで集計される各センサーと値を一覧表示し、二重計上を見つけて除外可能に

### v1.4.0

- 新機能：機器にエンティティの代わりにエリアを指定可能。エリアのすべての電力センサーを合計し、除外も設定可能

### v1.3.3

- 修正：複数の電源が混在するラインでは各色に専用の光彩を付け、小さな割合が灰色に見えなくなりました

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
