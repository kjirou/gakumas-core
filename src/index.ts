// このコメントブロックは、主にCopilotに対する指示を記述するためのものである。
//
// - このファイル及び関連するファイル群は、ある既存のデッキ構築型カードバトルローグライトゲームのコアライブラリである。
// - ライブラリ名もしくはプロジェクト名は、"gakumasu-core"である。
// - このファイルは、npm packageのエントリーポイントである。
// - UIに関する実装は行わない。
// - TypeScriptの型のプロパティ名を列挙する際は、キャメルケースを使い、アルファベット降順に並べる。
// - TypeScriptの型でstringのUnion型を列挙する際は、アルファベット降順に並べる。
// - MUST: ソースコードのコメント内では、Copilotは**絶対に**提案や補完を行わないこと。

// TODO: Pドリンク
// TODO: サポートアビリティ
// TODO: レッスン内の応援/トラブル
// TODO: レッスン履歴
// TODO: データの永続化サポート
// TODO: コンテスト、後のためのメモ
//       - AIの挙動を解読する必要がある、多少眺めた限りだとわからなかった
//       - レッスン中に放置するとカードがうっすら光っておすすめカードを教えてくれるが、それがコンテストと同じAIかもしれない
//         - もしそうだとすると、AIはサーバ側ではなくてクライアント側が計算しているのかもしれない

import { getCardDataById } from "./data/card";
import { getCharacterDataById } from "./data/character";
import { getIdolDataById } from "./data/idol";
import { getProducerItemDataById } from "./data/producer-item";
import {
  Card,
  CardInProduction,
  GetRandom,
  IdGenerator,
  Idol,
  IdolInProduction,
  Lesson,
  LessonGamePlay,
  LessonUpdateQuery,
} from "./types";
import {
  activateEffectsOnLessonStart,
  activateEffectsOnTurnStart,
  canUseCard,
  drawCardsOnTurnStart,
  previewCardUsage,
  useCard,
} from "./lesson-mutation";
import {
  getCardContentDefinition,
  handSizeOnLessonStart,
  patchUpdates,
} from "./models";

//
// UI側での想定の呼び出し方
//
// ゲーム開始:
// ```
// const lessonGamePlay = createLessonGamePlay();
// ```
//
// ターン開始:
// ```
// const newLessonGamePlay = startLessonTurn(lessonGamePlay);
// const recentUpdates = newLessonGamePlay.updates.slice(lessonGamePlay.updates.length);
// set状態遷移アニメーション(recentUpdates);
// // アニメーション設定がある場合は、それが終わるまで表示上反映されない
// setLesson(最新のLessonの状態を返す(newLessonGamePlay));
// ```
//
// カード選択してスキルカード使用プレビュー:
// ```
// // 使用できない状況のカードでもプレビューはできる、また、連鎖するPアイテム効果などはプレビュー表示されないなど実際のカード使用処理とは違うところが多いので別にした方が良い
// const newLessonGamePlay = previewCardUsage(lessonGamePlay, cardInHandIndex);
// const recentUpdates = newLessonGamePlay.updates.slice(lessonGamePlay.updates.length);
// // プレビューは差分表示されるがアニメーションはされない
// const setプレビュー用Updates(recentUpdates)
// ```
//
// 手札のスキルカードを表示:
// ```
// const cardsInHand = getCardsInHand(lessonGamePlay);
// set手札リスト(cardsInHand);
// ```
//
// カード選択してスキルカード使用:
// ```
// const newLessonGamePlay = useCard(lessonGamePlay, cardInHandIndex);
// const recentUpdates = newLessonGamePlay.updates.slice(lessonGamePlay.updates.length);
// set状態遷移アニメーション(recentUpdates);
// // アニメーション設定がある場合は、それが終わるまで表示上反映されない
// setLesson(最新のLessonの状態を返す(newLessonGamePlay));
// ```
//

/**
 * レッスンのターンを開始する
 *
 * - レッスン開始時に関わる処理も含む
 */
export const startLessonTurn = (
  lessonGamePlay: LessonGamePlay,
): LessonGamePlay => {
  let updates = lessonGamePlay.updates;
  let historyResultIndex = 1;
  let lesson = lessonGamePlay.initialLesson;

  //
  // レッスン開始時の効果発動
  //
  // - ゲーム内の履歴を見ると、1ターン目の前にこれの結果が記載されている
  //
  if (lesson.turnNumber === 0) {
    const activateEffectsOnLessonStartResult = activateEffectsOnLessonStart(
      lesson,
      historyResultIndex,
      {
        getRandom: lessonGamePlay.getRandom,
        idGenerator: lessonGamePlay.idGenerator,
      },
    );
    updates = [...updates, ...activateEffectsOnLessonStartResult.updates];
    historyResultIndex =
      activateEffectsOnLessonStartResult.nextHistoryResultIndex;
    lesson = patchUpdates(lesson, activateEffectsOnLessonStartResult.updates);
  }

  //
  // ターン番号を増やす
  //
  const increaseTurnNumberUpdate: LessonUpdateQuery = {
    kind: "turnNumberIncrease",
    reason: {
      kind: "turnStartTrigger",
      historyTurnNumber: lesson.turnNumber,
      historyResultIndex,
    },
  };
  updates = [...updates, increaseTurnNumberUpdate];
  historyResultIndex++;
  lesson = patchUpdates(lesson, [increaseTurnNumberUpdate]);

  //
  // 手札を山札から引く
  //
  const drawCardsOnLessonStartResult = drawCardsOnTurnStart(
    lesson,
    historyResultIndex,
    {
      getRandom: lessonGamePlay.getRandom,
    },
  );
  updates = [...updates, ...drawCardsOnLessonStartResult.updates];
  historyResultIndex = drawCardsOnLessonStartResult.nextHistoryResultIndex;
  lesson = patchUpdates(lesson, drawCardsOnLessonStartResult.updates);

  //
  // ターン開始時の効果発動
  //
  const activateEffectsOnTurnStartResult = activateEffectsOnTurnStart(
    lesson,
    historyResultIndex,
    {
      getRandom: lessonGamePlay.getRandom,
      idGenerator: lessonGamePlay.idGenerator,
    },
  );
  updates = [...updates, ...activateEffectsOnTurnStartResult.updates];
  historyResultIndex = activateEffectsOnTurnStartResult.nextHistoryResultIndex;
  lesson = patchUpdates(lesson, activateEffectsOnTurnStartResult.updates);

  return {
    ...lessonGamePlay,
    updates,
  };
};

/**
 * 手札情報を取得する
 */
export const getCardsInHand = (
  lessonGamePlay: LessonGamePlay,
): Array<{ card: Card; playable: boolean }> => {
  const lesson = patchUpdates(
    lessonGamePlay.initialLesson,
    lessonGamePlay.updates,
  );
  return lesson.hand.map((cardId) => {
    const card = lesson.cards.find((e) => e.id === cardId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }
    const cardContent = getCardContentDefinition(card);
    return {
      card,
      playable: canUseCard(lesson, cardContent.cost, cardContent.condition),
    };
  });
};

// const previewCardUsage = () => {};

/**
 * スキルカードを使用する
 *
 * @param selectedCardInHandIndex 選択した手札のインデックス、使用可能な手札を渡す必要がある
 */
export const playCard = (
  lessonGamePlay: LessonGamePlay,
  selectedCardInHandIndex: number,
): LessonGamePlay => {
  let updatesList = [lessonGamePlay.updates];
  let lesson = lessonGamePlay.initialLesson;
  let historyResultIndex = 1;

  // TODO: スキルカード使用数1以上か検証

  // TODO: スキルカード使用数消費

  lesson = patchUpdates(lesson, updatesList[updatesList.length - 1]);
  const result = useCard(lesson, historyResultIndex, {
    getRandom: lessonGamePlay.getRandom,
    idGenerator: lessonGamePlay.idGenerator,
    selectedCardInHandIndex,
  });
  updatesList = [...updatesList, result.updates];
  historyResultIndex = result.nextHistoryResultIndex;

  // TODO: スコアパーフェクト達成によるゲーム終了判定、ターン終了処理を待たずに即座に終了している

  // TODO: スキルカード使用数0ならターン終了

  return {
    ...lessonGamePlay,
    updates: updatesList.flat(),
  };
};

/**
 * ターンをスキップする
 *
 * - 本家のボタンについているラベルは「Skip」
 * - プレビューはない
 */
export const skipTurn = (lessonGamePlay: LessonGamePlay): LessonGamePlay => {
  let updatesList = [lessonGamePlay.updates];
  let lesson = lessonGamePlay.initialLesson;
  let historyResultIndex = 1;

  // TODO: スキルカード使用数1以上必要

  // TODO: 体力回復

  return {
    ...lessonGamePlay,
    updates: updatesList.flat(),
  };
};

/**
 * レッスンのターンを終了する
 *
 * - レッスン終了時に関わる処理は、現在はなさそう
 */
const endLessonTurn = (lessonGamePlay: LessonGamePlay): LessonGamePlay => {
  let updatesList = [lessonGamePlay.updates];
  let lesson = lessonGamePlay.initialLesson;
  let historyResultIndex = 1;

  // TODO: ターン終了時トリガー

  // TODO: 応援/トラブルトリガー

  // TODO: 手札を捨てる

  // TODO: ターン数によるゲーム終了判定

  return {
    ...lessonGamePlay,
    updates: updatesList.flat(),
  };
};
