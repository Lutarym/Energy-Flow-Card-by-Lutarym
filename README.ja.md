# Energy Flow Card by Lutarym

Version 1.0.1

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · **日本語**

![カードのスクリーンショット](https://raw.githubusercontent.com/Lutarym/Energy-Flow-Card-by-Lutarym/main/docs/screenshot-ja.png)

Home Assistant 用のアニメーション付き Lovelace カードです。太陽光、パワコン、蓄電池、系統、家庭の間のエネルギーの流れを表示し、ヒートポンプ、EV充電器、最大4台のその他の機器にも対応します。

このカードは動的電気料金に最適化されています。ラインの色で、電気がどこから来てどこへ流れているかを常に表示します。例えば、安い系統電力で蓄電池を充電するときです。

## 機能

- 実際の設備と同じ構成：太陽光と蓄電池はパワコンに接続、パワコンが家庭へ給電、系統は家庭に接続
- ヒートポンプ、EV充電器、最大4台のその他の機器は専用の分配ラインに接続
- 機器ごとに固有の色。ラインは電気の出どころを示します：太陽光は黄、系統は青、蓄電池は緑。例えば動的料金で蓄電池を充電するときは、系統から蓄電池まで青になります。2つの電源からの電気は両方の色が交互に表示されます
- ラインの流れる速さは電力に比例
- ミニマルなデザイン：小さなアイコン付きの丸いノード、稼働中は光るリング
- 太陽の光線とヒートポンプのファンは電力に合わせて回転、EV充電器のアイコンは充電中に脈動
- 蓄電池のリングは充電率、家庭のリングは電気の出どころを表示
- 右側に13種類のアニメーション付き蓄電池バー（lutarym-battery-card から採用）
- 機器ごとに任意の追加行、例えば本日の発電量、往き温度、車の充電率
- 機器をクリックすると Home Assistant でそのエンティティが開きます
- ビジュアルエディター、デモモード、英語、ドイツ語、フランス語、日本語

## 動作要件

- Home Assistant 2024.1.0 以降
- W または kW の電力センサー

## インストール

### HACS

1. HACS を開き、三点メニューから「カスタムリポジトリ」
2. リポジトリ：`https://github.com/Lutarym/Energy-Flow-Card-by-Lutarym`、カテゴリ：**Dashboard**
3. カードを検索してダウンロード
4. ブラウザをキャッシュなしで再読み込み

### 手動

1. 最新リリースから `energy-flow-card-by-lutarym.js` をダウンロード
2. `<config>/www/community/energy-flow-card-by-lutarym/` にコピー
3. 設定、ダッシュボード、三点メニュー、リソース、リソースを追加
4. URL `/local/community/energy-flow-card-by-lutarym/energy-flow-card-by-lutarym.js`、タイプ **JavaScript モジュール**

## 設定

ビジュアルエディターを使うのが最も簡単です。新しいカードはデモモードで始まります。デモモードをオフにして、自分のエンティティを割り当ててください。

### YAML の例

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
    name: 洗濯機
    icon: waschmaschine
```

### エンティティ

| キー | 意味 |
|---|---|
| `pv` | 太陽光の電力 |
| `grid` | 系統の電力、正の値は買電 |
| `grid_import`, `grid_export` | `grid` の代わりに2つの別々のセンサー |
| `battery` | 蓄電池の電力、正の値は放電 |
| `battery_charge`, `battery_discharge` | `battery` の代わりに2つの別々のセンサー |
| `battery_soc` | 蓄電池の充電率（%） |
| `battery_capacity` | 蓄電池の最大容量（Wh または kWh）、例えば Fronius の `capacity_maximum`。蓄電池に蓄えられたエネルギーを kWh で表示します |
| `inverter` | パワコンの AC 電力。空欄の場合は太陽光と蓄電池から計算 |
| `home` | 家庭の消費電力。空欄の場合は太陽光、系統、蓄電池から計算 |
| `heatpump` | ヒートポンプの電力 |
| `wallbox` | EV充電器の充電電力 |
| `pv_secondary`, `inverter_secondary`, `grid_secondary`, `battery_secondary`, `home_secondary`, `heatpump_secondary`, `wallbox_secondary` | 任意の追加行、任意のエンティティ |

### その他の機器

`consumers` の下に最大4件、それぞれ `entity`、`name`、`icon`、任意で `color`（`#RRGGBB` または `[r, g, b]`）。エンティティが利用できない場合も機器は表示されたままで、`取得不可` と表示されます。
アイコン：`steckdose`（コンセント）、`waschmaschine`（洗濯機）、`spuelmaschine`（食器洗い機）、`herd`（コンロ）、`kuehlschrank`（冷蔵庫）、`computer`（コンピューター）、`licht`（照明）、`auto`（車）。

### オプション

| オプション | 既定値 | 意味 |
|---|---|---|
| `language` | `auto` | `auto`、`en`、`de`、`fr`、`ja` |
| `demo` | `false` | 試用のためのサンプル値 |
| `show_names` | `true` | 円の上下に名前を表示 |
| `animate` | `true` | アニメーションを表示 |
| `animation_speed` | `1` | アニメーションの速度係数、0.25 から 3 |
| `font_scale` | `1` | すべての文字の大きさの係数、0.7 から 1.15 |
| `animation_style` | `striche` | ラインのアニメーション：`striche`（破線）、`punkte`（点）、`perlen`（パール）、`lang`（長い破線）、`komet`（彗星）、`morse`（モールス）、`lauflicht`（流れる光）、`neon`（ネオン）、`puls`（脈動）、`blitz`（稲妻） |
| `battery_bar` | `true` | 右側にカードの高さいっぱいの蓄電池バー。フローは左寄せ、バーは右寄せのまま |
| `battery_bar_animation` | `1` | 蓄電池バーのアニメーション、0 から 12：静止、波、脈動、泡、きらめき、なめらかな充填、シマー、稲妻、雨、炎、マトリックス、スキャンライン、鼓動 |
| `battery_bar_percent` | `true` | 蓄電池バーにパーセントを表示 |
| `battery_bar_width` | `22` | 蓄電池バーの幅（高さに対する %）、8 から 80 |
| `battery_capacity_kwh` | `0` | 蓄電池の固定容量（kWh）、`battery_capacity` エンティティが未設定の場合に使用 |
| `max_power` | `10000` | ラインが最も速く流れる電力（W） |
| `kw_threshold` | `1000` | この電力（W）以上で kW 表示 |
| `min_flow` | `10` | これより小さい電力（W）は停止とみなす |
| `grid_invert` | `false` | `grid` の符号を反転 |
| `battery_invert` | `false` | `battery` の符号を反転 |
| `name_pv`, `name_inverter`, `name_grid`, `name_battery`, `name_home`, `name_heatpump`, `name_wallbox` | | 独自の名前、空欄の場合はカードの言語を使用 |

## ライセンス

GNU General Public License v3.0、[LICENSE](LICENSE) を参照してください。
