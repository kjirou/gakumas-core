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

import {
  Card,
  CardDefinition,
  CardInHandSummary,
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
  activateEffectsOnTurnEnd,
  activateEffectsOnTurnStart,
  consumeRemainingCardUsageCount,
  decreaseEachModifierDurationOverTime,
  drawCardsOnTurnStart,
  obtainPositiveImpressionScoreOnTurnEnd,
  summarizeCardInHand,
  useCard,
} from "./lesson-mutation";
import {
  calculateClearScoreProgress,
  getCardContentDefinition,
  isScoreSatisfyingPerfect,
  patchUpdates,
} from "./models";
import { generateCardDescription } from "./text-generation";

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
  let lesson = patchUpdates(
    lessonGamePlay.initialLesson,
    lessonGamePlay.updates,
  );

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
  // スキルカード使用数追加の状態修正を削除
  //
  const additionalCardUsageCount = lesson.idol.modifiers.find(
    (e) => e.kind === "additionalCardUsageCount",
  );
  if (additionalCardUsageCount) {
    const id = lessonGamePlay.idGenerator();
    const additionalCardUsageCountUpdates: LessonUpdateQuery[] = [
      {
        kind: "modifier",
        actual: {
          kind: "additionalCardUsageCount",
          amount: -additionalCardUsageCount.amount,
          id,
          updateTargetId: additionalCardUsageCount.id,
        },
        max: {
          kind: "additionalCardUsageCount",
          amount: -additionalCardUsageCount.amount,
          id,
          updateTargetId: additionalCardUsageCount.id,
        },
        reason: {
          kind: "turnEndTrigger",
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex,
        },
      },
    ];
    updates = [...updates, ...additionalCardUsageCountUpdates];
    historyResultIndex++;
    lesson = patchUpdates(lesson, additionalCardUsageCountUpdates);
  }

  //
  // ターン経過に伴い、状態修正の効果時間を減少
  //
  if (lesson.idol.modifierIdsAtTurnStart.length > 0) {
    const decreaseEachModifierDurationOverTimeResult =
      decreaseEachModifierDurationOverTime(lesson, historyResultIndex, {
        idGenerator: lessonGamePlay.idGenerator,
      });
    updates = [
      ...updates,
      ...decreaseEachModifierDurationOverTimeResult.updates,
    ];
    historyResultIndex =
      decreaseEachModifierDurationOverTimeResult.nextHistoryResultIndex;
    lesson = patchUpdates(
      lesson,
      decreaseEachModifierDurationOverTimeResult.updates,
    );
  }

  //
  // この時点で存在する状態修正IDリストを更新
  //
  const modifierIdsAtTurnStartUpdates: LessonUpdateQuery[] = [
    {
      kind: "modifierIdsAtTurnStart",
      modifierIdsAtTurnStart: lesson.idol.modifiers.map((e) => e.id),
      reason: {
        kind: "turnEndTrigger",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex,
      },
    },
  ];
  updates = [...updates, ...modifierIdsAtTurnStartUpdates];
  historyResultIndex++;
  lesson = patchUpdates(lesson, modifierIdsAtTurnStartUpdates);

  //
  // アクションポイントを1にする
  //
  const actionPointsUpdates: LessonUpdateQuery[] = [
    {
      kind: "actionPoints",
      amount: -lesson.idol.actionPoints + 1,
      reason: {
        kind: "turnSkip",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex,
      },
    },
  ];
  updates = [...updates, ...actionPointsUpdates];
  historyResultIndex++;
  lesson = patchUpdates(lesson, actionPointsUpdates);

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

  const isLessonEnded = isScoreSatisfyingPerfect(lesson);

  //
  // 手札を山札から引く
  //
  // - 本家仕様確認
  //   - ターン開始処理の後であることは、SR咲季のPアイテムで確認した
  //   - ターン開始処理でスコアパーフェクトを満たした場合、手札を引かないことを、SSR広のPアイテムで確認した
  //
  if (!isLessonEnded) {
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
  }

  return {
    ...lessonGamePlay,
    updates,
  };
};

/**
 * 手札をリストで取得する
 */
export const getCardsInHand = (
  lessonGamePlay: LessonGamePlay,
): CardInHandSummary[] => {
  const lesson = patchUpdates(
    lessonGamePlay.initialLesson,
    lessonGamePlay.updates,
  );
  return lesson.hand.map((cardId) => {
    return {
      ...summarizeCardInHand(
        lesson,
        cardId,
        lessonGamePlay.getRandom,
        lessonGamePlay.idGenerator,
      ),
    };
  });
};

/**
 * ターンが終了しているかを返す
 */
export const isTurnEnded = (lessonGamePlay: LessonGamePlay): boolean => {
  const lesson = patchUpdates(
    lessonGamePlay.initialLesson,
    lessonGamePlay.updates,
  );
  return lesson.idol.actionPoints === 0;
};

/**
 * スキルカード使用のプレビューを表示するための情報を返す
 *
 * - 本家のプレビュー仕様
 *   - 体力・元気
 *     - 効果反映後の値に変わり、その近くに差分アイコンが +n/-n で表示される
 *     - 差分は実際に変化した値を表示する、例えば、結果的に値の変更がない場合は何も表示されない
 *   - 状態修正差分
 *     - 新規: スキルカード追加使用など一部のものを除いて、左側の状態修正リストの末尾へ追加
 *     - 既存: 差分がある状態修正アイコンに差分適用後の値を表示し、その右に差分アイコンを表示する
 *     - スキルカード追加使用、次に使用するスキルカードの効果をもう1回発動、など、差分アイコンが表示されないものもある
 *   - スキルカード詳細ポップアップ
 *     - 全ての項目が、各効果による変化前のデータ定義時の値
 *
 * @example
 *   // 変化する差分は updates に含まれるので、アニメーション処理はこの値を解析して使う
 *   const { cardDescription, updates } = previewCardPlay(lessonGamePlay, 0);
 *   // プレビュー用の差分を反映したレッスンの状態、UI側は各値につきこの値との差を使う
 *   const previewedLesson = patchUpdates(lessonGamePlay.initialLesson, updates);
 * @param selectedCardInHandIndex 選択する手札のインデックス、使用条件を満たさない手札も選択可能
 */
export const previewCardPlay = (
  lessonGamePlay: LessonGamePlay,
  selectedCardInHandIndex: number,
): { cardDescription: string; updates: LessonUpdateQuery[] } => {
  const lesson = patchUpdates(
    lessonGamePlay.initialLesson,
    lessonGamePlay.updates,
  );
  const cardId = lesson.hand[selectedCardInHandIndex];
  if (cardId === undefined) {
    throw new Error("Invalid card index");
  }
  const card = lesson.cards.find((e) => e.id === cardId);
  if (card === undefined) {
    throw new Error("Invalid card ID");
  }
  const cardContent = getCardContentDefinition(card);
  const { updates } = useCard(lesson, 1, {
    getRandom: lessonGamePlay.getRandom,
    idGenerator: lessonGamePlay.idGenerator,
    selectedCardInHandIndex,
    preview: true,
  });
  const cardDescription = generateCardDescription({
    cost: cardContent.cost,
    condition: cardContent.condition,
    effects: cardContent.effects,
    innate: cardContent.innate,
    nonDuplicative: card.original.definition.nonDuplicative,
    usableOncePerLesson: cardContent.usableOncePerLesson,
  });
  return {
    cardDescription,
    updates,
  };
};

/**
 * スキルカードを使用する
 *
 * @param selectedCardInHandIndex 選択する手札のインデックス、使用条件を満たす手札のみ選択可能
 */
export const playCard = (
  lessonGamePlay: LessonGamePlay,
  selectedCardInHandIndex: number,
): LessonGamePlay => {
  let updates = lessonGamePlay.updates;
  let historyResultIndex = 1;
  let lesson = patchUpdates(
    lessonGamePlay.initialLesson,
    lessonGamePlay.updates,
  );

  //
  // アクションポイントがない場合は実行できない
  //
  // - スキルカード使用数が残っていても、使えない
  //
  if (lesson.idol.actionPoints === 0) {
    throw new Error("No action points");
  }

  //
  // スキルカード使用数またはアクションポイントを減らす
  //
  const consumeRemainingCardUsageCountResult = consumeRemainingCardUsageCount(
    lesson,
    historyResultIndex,
    {
      idGenerator: lessonGamePlay.idGenerator,
    },
  );
  updates = [...updates, ...consumeRemainingCardUsageCountResult.updates];
  historyResultIndex =
    consumeRemainingCardUsageCountResult.nextHistoryResultIndex;
  lesson = patchUpdates(lesson, consumeRemainingCardUsageCountResult.updates);

  //
  // スキルカードを使用する
  //
  const useCardResult = useCard(lesson, historyResultIndex, {
    getRandom: lessonGamePlay.getRandom,
    idGenerator: lessonGamePlay.idGenerator,
    selectedCardInHandIndex,
    preview: false,
  });
  updates = [...updates, ...useCardResult.updates];
  historyResultIndex = useCardResult.nextHistoryResultIndex;
  lesson = patchUpdates(lesson, useCardResult.updates);

  // TODO: スコアパーフェクト達成によるゲーム終了判定、ターン終了処理を待たずに即座に終了している

  return {
    ...lessonGamePlay,
    updates,
  };
};

/**
 * ターンをスキップする
 *
 * - 本家のボタンについているラベルは「Skip」
 * - プレビューはない
 */
export const skipTurn = (lessonGamePlay: LessonGamePlay): LessonGamePlay => {
  let updates = lessonGamePlay.updates;
  let historyResultIndex = 1;
  let lesson = patchUpdates(
    lessonGamePlay.initialLesson,
    lessonGamePlay.updates,
  );

  //
  // アクションポイントを0にする
  //
  const actionPointsUpdates: LessonUpdateQuery[] = [
    {
      kind: "actionPoints",
      amount: -lesson.idol.actionPoints + 0,
      reason: {
        kind: "turnSkip",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex,
      },
    },
  ];
  updates = [...updates, ...actionPointsUpdates];
  historyResultIndex++;
  lesson = patchUpdates(lesson, actionPointsUpdates);

  //
  // 体力を2回復する
  //
  const recoveringLifeUpdates: LessonUpdateQuery[] = [
    {
      kind: "life",
      actual: Math.min(2, lesson.idol.original.maxLife - lesson.idol.life) + 0,
      max: 2,
      reason: {
        kind: "turnSkip",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex,
      },
    },
  ];
  updates = [...updates, ...recoveringLifeUpdates];
  historyResultIndex++;
  lesson = patchUpdates(lesson, recoveringLifeUpdates);

  return {
    ...lessonGamePlay,
    updates,
  };
};

/**
 * レッスンのターンを終了する
 */
export const endLessonTurn = (
  lessonGamePlay: LessonGamePlay,
): LessonGamePlay => {
  let updates = lessonGamePlay.updates;
  let historyResultIndex = 1;
  let lesson = patchUpdates(
    lessonGamePlay.initialLesson,
    lessonGamePlay.updates,
  );

  //
  // 状態修正やPアイテムによるターン終了時の効果発動
  //
  const activateEffectsOnTurnEndUpdates = activateEffectsOnTurnEnd(
    lesson,
    historyResultIndex,
    {
      getRandom: lessonGamePlay.getRandom,
      idGenerator: lessonGamePlay.idGenerator,
    },
  );
  updates = [...updates, ...activateEffectsOnTurnEndUpdates.updates];
  historyResultIndex = activateEffectsOnTurnEndUpdates.nextHistoryResultIndex;
  lesson = patchUpdates(lesson, activateEffectsOnTurnEndUpdates.updates);

  // TODO: [仕様確認] ターン終了時トリガーによりスコアパーフェクト条件を満たしている場合、本当に後続処理が実行されないのか
  if (!isScoreSatisfyingPerfect(lesson)) {
    //
    // 手札を捨てる
    //
    if (lesson.hand.length > 0) {
      const discardHandUpdates: LessonUpdateQuery[] = [
        {
          kind: "cardPlacement",
          hand: [],
          discardPile: [...lesson.discardPile, ...lesson.hand],
          reason: {
            kind: "turnEndTrigger",
            historyTurnNumber: lesson.turnNumber,
            historyResultIndex,
          },
        },
      ];
      updates = [...updates, ...discardHandUpdates];
      historyResultIndex++;
      lesson = patchUpdates(lesson, discardHandUpdates);
    }

    //
    // 好印象によるスコア増加
    //
    // - ターン終了時トリガーの効果発動とは明らかに時点が異なる、こちらは手札を捨てた後発動している
    //
    const obtainPositiveImpressionScoreOnTurnEndResult =
      obtainPositiveImpressionScoreOnTurnEnd(lesson, historyResultIndex);
    updates = [
      ...updates,
      ...obtainPositiveImpressionScoreOnTurnEndResult.updates,
    ];
    historyResultIndex =
      obtainPositiveImpressionScoreOnTurnEndResult.nextHistoryResultIndex;
    lesson = patchUpdates(
      lesson,
      obtainPositiveImpressionScoreOnTurnEndResult.updates,
    );
  }

  return {
    ...lessonGamePlay,
    updates,
  };
};

/**
 * レッスンが終了しているかを返す
 *
 * - 以下の処理の後に本関数を呼び出し、レッスンが終了しているかを判定する。終了していたら、その時点から後続処理を行わない。
 *   - `startLessonTurn`
 *   - `playCard`
 *   - `endLessonTurn`
 */
export const isLessonEnded = (lessonGamePlay: LessonGamePlay): boolean => {
  const lesson = patchUpdates(
    lessonGamePlay.initialLesson,
    lessonGamePlay.updates,
  );
  return (
    (lesson.turnNumber === lesson.lastTurnNumber + lesson.remainingTurns &&
      lesson.idol.actionPoints === 0) ||
    isScoreSatisfyingPerfect(lesson)
  );
};
