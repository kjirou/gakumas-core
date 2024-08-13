# gakumas-core

Core engine of Gakuen iDOLM@STER!(学園アイドルマスター)

## :cat: 特徴

- [学園アイドルマスター](https://gakuen.idolmaster-official.jp/)（通称:学マス）のカードゲーム部分の内部処理を再現したものです。
  - 育成ゲーム部分は含んでいません。
- TypeScript対応です。

## :rocket: インストール方法

```
npm install gakumas-core
```

```
yarn add gakumas-core
```

## :world_map: 概要

ゲームの初期化処理の例です。生成した`gamePlay`変数は、ゲームの状態を表すものとして、保持する必要があります。

```ts
import { initializeGamePlay } from "gakumas-core";

const gamePlay = initializeGamePlay({
  idolDataId: "kuramotochina-ssr-1",
  specialTrainingLevel: 3,
  talentAwakeningLevel: 2,
  cards: [{ id: "apirunokihon" }, { id: "genkinaaisatsu", enhanced: true }],
  producerItems: [{ id: "masukottohikonin" }],
  turns: ["dance", "dance", "dance", "dance", "dance", "dance", "dance"],
  clearScoreThresholds: { clear: 100, perfect: 200 },
});
```

---

ゲームのUIを描画するための情報の生成例です。生成した変数の中に、ターン状況・手札・Pアイテム・バフ/デバフ・所持スキルカードなどの画面を描画するために必要な情報がまとまっています。

```ts
import { generateLessonDisplay } from "gakumas-core";

const lessonDisplay = generateLessonDisplay(gamePlay);
```

---

レッスンのライフサイクル上、次に実行するべき処理を示すフラグを返します。

```ts
import { getNextPhase } from "gakumas-core";

const nextPhase = getNextPhase(gamePlay);
```

戻り値は、以下の値のいずれかです。

- `"turnStart"`: `startTurn` によりターン開始処理を行うべきです。
- `"playerInput"`: ユーザーの操作により、`playCard` によるスキルカードの使用や `skipTurn` によるターンのスキップを行うべきです。
- `"turnEnd"`: `endTurn` によりターン終了処理を行うべきです。
- `"lessonEnd"`: 既にレッスンが終了しています。操作を禁止する、画面をゲーム終了後に遷移する、などの処理が必要でしょう。

基本的には、 `"turnStart"` -> `"playerInput"` -> `"turnEnd"` -> `"turnStart"` -> ... の遷移を繰り返します。

そして、いずれのフェーズからも、 `"lessonEnd"` へ移行する可能性があります。一例ですが、具体的には以下のような状況です。

- `"turnStart"` から移行する例:
  - Pアイテムの「等身大のレディリップ」の発動でパラメータ/スコアのパーフェクトを満たす。
  - バフの「成就」の発動でパラメータ/スコアのパーフェクトを満たす。
- `"playerInput"` から移行する例:
  - スキルカードの使用または連鎖するPアイテムの効果発動により、パラメータ/スコアのパーフェクトを満たす。
- `"turnEnd"` から移行する例:
  - 残りターン数が 0 になる。
  - 応援/トラブルのターン終了時のパラメータ/スコア追加でパーフェクトを満たす。
  - 好印象の発動でパラメータ/スコアのパーフェクトを満たす。

---

ターン開始処理の例です。

```ts
import { startTurn, diffUpdates } from "gakumas-core";

const gamePlay = あなたのコードから取得する();

// 手札の配布・Pアイテムの発動・バフの持続効果の発動、などを行います。
const newGamePlay = startTurn(gamePlay);

// ターン開始処理で行われた更新内容の詳細です。
// 特にアニメーション・インタラクション用の更新情報を抽出するのに使います。
// 例えば、パラメータ/スコア増加なら、 [{kind: "score", actual: 9, max: 9, ...}] のような形で記録されています。
const latestUpdates = diffUpdates(gamePlay.updates, newGamePlay.updates);

// 更新後のレッスンの状態を保持します。
あたなのコードで保持する(newGamePlay);
```

---

スキルカード使用処理の例です。

```ts
import { playCard } from "gakumas-core";

// ...ターン開始処理と同じなので略...

// 使用するスキルカードの手札のインデックスを渡します。
// 手札一覧や使用可能な状況であるのかなどは、 generateLessonDisplay で生成した変数内にあります。
const newGamePlay = playCard(gamePlay, 0);

// ...他はターン開始処理と同じなので略...
```

---

ターン終了処理の例です。

```ts
import { endTrun } from "gakumas-core";

// ...ターン開始処理と同じなので略...

// 手札を捨てる・Pアイテムの発動・バフの持続効果の発動・好印象のスコア増加、などを行います。
const newGamePlay = endTrun(gamePlay);

// ...ターン開始処理と同じなので略...
```

## :book: APIリファレンス

主だったものの名称と、一言説明だけ記載します。より詳細は、ソースコードから探して読んでください。概ね、ソースコードコメントがあります。

- `diffUpdates`: 2つのゲームプレイを比較して、間の更新差分を抽出する。
- `endTurn`: ターン終了処理を実行する。
- `generateCardPlayPreviewDisplay`: スキルカード選択時のプレビュー用の表示情報を生成する。
- `generateLessonDisplay`: 画面を描画するための表示情報を生成する。
- `getLesson`: 現在のレッスンの状態を返す。
- `getNextPhase`: レッスンのライフサイクル上、次に実行するべき処理を示すフラグを返す。
- `hasActionEnded`: アイドルの手番が終了しているかを判定する。
- `initializeGamePlay`: ゲームプレイを初期化する。
- `isLessonEnded`: レッスンが終了しているかを判定する。
- `patchDiffs`: レッスンに対して、更新差分を適用して更新した結果のレッスンを返す。
- `playCard`: スキルカードを使用する。
- `skipTurn`: ターンをスキップする。
- `startTurn`: ターン開始処理を実行する。
- `useDrink`: Pドリンクを使用する。
- 各種データ定義: `cards` や `getCardDataById` のような API 群。 [`src/data`](./src/data/) 内を参照。

## :writing_hand: 主なTODO

- [ ] UI に載せて想定通り動くのかが未検証
  - アニメーション・インタラクションのために十分な情報を返せているかは、かなり疑問である
- [ ] 「藤田ことね Yellow Big Bang!」より後のアイドルがほぼ未実装
- [ ] コンテストやアイドルの道だけにある応援/トラブルが未実装
- [ ] レッスンサポート効果の発動が未実装
  - 発動率など全般的に仕様が不明なため
- [ ] レッスンサポートで++/+++になったスキルカードの性能が不明なものが多数ある
- [ ] レッスンの行動履歴が未実装
  - 本家のレッスン画面の下アイコンから表示できる行動履歴のこと。おそらく完全再現はできないが、ある程度までやる予定。
- [ ] コンテストの再現
  - コンテストのスキルカード選択のアルゴリズムがわからない。
- [ ] レアケースで本家と挙動が異なる点がいくつかある
  - そもそも本家仕様が不明なものが多く、[Issueへまとめている](https://github.com/kjirou/gakumas-core/issues?q=is%3Aissue+is%3Aopen+label%3A_%E4%BB%95%E6%A7%98%E7%A2%BA%E8%AA%8D)。情報いただけるとありがたい。

その他の技術的なものや些細なものについては、[GitHub Issues](https://github.com/kjirou/gakumas-core/issues)を参照するか、[ソースコードを `"TODO:"` で検索](https://github.com/search?q=repo%3Akjirou%2Fgakumas-core%20%22TODO%3A%22&type=code)してください。

## :hammer_and_wrench: 開発

### 準備

- [Node.js](https://nodejs.org/)のインストール
  - バージョンは[.nvmrc](/.nvmrc)と同じ

### インストール手順

```
git clone git@github.com:kjirou/gakumas-core.git
cd ./gakumas-core
npm install
```
