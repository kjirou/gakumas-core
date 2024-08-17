// このコメントブロックは、主にCopilotに対する指示を記述するためのものである。
//
// - このファイル及び関連するファイル群は、ある既存のデッキ構築型カードバトルローグライトゲームのコアライブラリである。
// - ライブラリ名もしくはプロジェクト名は、"gakumasu-core"である。
// - このファイルは、npm packageのエントリーポイントである。
// - UIに関する実装は行わない。
// - TypeScriptの型のプロパティ名を列挙する際は、キャメルケースを使い、アルファベット降順に並べる。
// - TypeScriptの型でstringのUnion型を列挙する際は、アルファベット降順に並べる。
// - MUST: ソースコードのコメント内では、Copilotは**絶対に**提案や補完を行わないこと。

import {
  Encouragement,
  Idol,
  Lesson,
  GamePlay,
  LessonUpdateQuery,
  MemoryEffect,
  Drink,
  NextLifecyclePhase,
  Card,
  ProducerItem,
} from "./types";
import {
  type CardDataId,
  compareDeckOrder,
  getCardDataByConstId,
  getCardDataById,
} from "./data/cards";
import { type DrinkDataId, getDrinkDataById } from "./data/drinks";
import { type IdolDataId, getIdolDataById } from "./data/idols";
import {
  type ProducerItemDataId,
  getProducerItemDataByConstId,
  getProducerItemDataById,
} from "./data/producer-items";
import {
  activateEffectsOnLessonStart,
  activateEffectsOnTurnEnd,
  activateEncouragementOnTurnStart,
  activateModifierEffectsOnTurnStart,
  activateProducerItemEffectsOnTurnStart,
  activateMemoryEffectsOnLessonStart,
  decreaseEachModifierDurationOverTime,
  drawCardsOnTurnStart,
  obtainPositiveImpressionScoreOnTurnEnd,
  useCard,
  useDrink as useDrinkMutation,
} from "./lesson-mutation";
import {
  createCurrentTurnDetails,
  createLesson,
  getNextHistoryResultIndex,
  isScoreSatisfyingPerfect,
  lifeRecoveredBySkippingTurn,
  patchDiffs,
} from "./models";
import { createIdGenerator } from "./utils";

export type * from "./types";
export * from "./data/card-sets";
export * from "./data/cards";
export * from "./data/characters";
export * from "./data/drinks";
export * from "./data/idols";
export * from "./data/modifiers";
export * from "./data/producer-items";
export {
  generateLessonDisplay,
  generateCardPlayPreviewDisplay,
} from "./display";
export * from "./models";
export * from "./utils";

/**
 * ゲームを初期化する
 *
 * - プロデュースアイドル・スキルカード・PアイテムなどのIDは、dataディレクトリ内のファイルを参照
 *
 * @param params.cards アイドル固有に加えて、追加するスキルカードリスト
 * @param params.clearScoreThresholds クリアスコアとパーフェクトスコア設定、任意でデフォルトは上限なしを意味する undefined
 * @param params.drinks Pドリンク設定、任意、本家と異なり上限数無し
 * @param params.encouragements 応援/トラブル設定、任意
 * @param params.idolDataId プロデュースアイドルのID
 * @param params.idolSpecificCardTestId テスト用、本来知る必要がない内部的なIDを指定する
 * @param params.ignoreIdolParameterKindConditionAfterClearing クリア後に、Pアイテムがパラメータ属性を無視して効果を発動するか。追い込みレッスンの設定。
 *                                                             任意でデフォルトは false
 * @param params.life レッスン開始時のアイドルの体力、任意でデフォルトは最大値
 * @param params.maxLife レッスン開始時のアイドルの最大体力、任意でデフォルトはTrue Endの効果を含むアイドルの最大体力
 * @param params.memoryEffects メモリーのアビリティによる効果設定、任意
 * @param params.noIdolSpecificCard 任意でアイドル固有スキルカードを使用しないなら true
 * @param params.noIdolSpecificProducerItem 任意でアイドル固有Pアイテムを使用しないなら true
 * @param params.producerItems アイドル固有に加えて、追加するPアイテムリスト
 * @param params.scoreBonus スコアボーナス設定、任意でデフォルトは設定なしを意味する undefined
 * @param params.specialTrainingLevel 特訓段階、アイドル固有スキルカードの強化に影響を与えるのみ。任意でデフォルトは1。
 * @param params.talentAwakeningLevel 才能開花段階、アイドル固有Pアイテムの強化に影響を与えるのみ。任意でデフォルトは1。
 * @param params.turns ターン別のパラメータ属性の配列
 * @example
 *   ```ts
 *   // 通常・SPレッスンの例
 *   const gamePlay = initializeGamePlay({
 *     idolDataId: "kuramotochina-ssr-1",
 *     specialTrainingLevel: 3,
 *     talentAwakeningLevel: 2,
 *     cards: [
 *       { id: "apirunokihon" },
 *       { id: "genkinaaisatsu", enhanced: true },
 *     ],
 *     producerItems: [
 *       { id: "masukottohikonin" },
 *     ],
 *     turns: ["dance", "dance", "dance", "dance", "dance", "dance", "dance"],
 *     clearScoreThresholds: { clear: 100, perfect: 200 },
 *   });
 *   // 追い込みレッスンの例
 *   const gamePlay = initializeGamePlay({
 *     // ...略...
 *     turns: ["dance", "dance", "dance", "dance", "dance", "dance", "dance", "dance", "dance", "dance", "dance", "dance"],
 *     clearScoreThresholds: { clear: 165, perfect: 600 },
 *     ignoreIdolParameterKindConditionAfterClearing: true,
 *   });
 *   // 中間試験・最終試験の例
 *   const gamePlay = initializeGamePlay({
 *     // ...略...
 *     turns: ["dance", "dance", "visual", "dance", "visual", "dance", "vocal", "visual", "vocal", "visual", "dance"],
 *     clearScoreThresholds: { clear: 1700 },
 *     scoreBonus: { vocal: 400, dance: 1400, visual: 1200 },
 *   });
 *   ```
 */
export const initializeGamePlay = (params: {
  cards: Array<{
    enhanced?: boolean;
    id: CardDataId;
    /** テスト用、本来知る必要がない内部的なIDを指定する */
    testId?: Card["id"];
  }>;
  clearScoreThresholds?: Lesson["clearScoreThresholds"];
  drinks?: Array<{
    id: DrinkDataId;
  }>;
  encouragements?: Encouragement[];
  idolDataId: IdolDataId;
  idolSpecificCardTestId?: Card["id"];
  ignoreIdolParameterKindConditionAfterClearing?: Lesson["ignoreIdolParameterKindConditionAfterClearing"];
  life?: Idol["life"];
  maxLife?: Idol["maxLife"];
  memoryEffects?: MemoryEffect[];
  noIdolSpecificCard?: boolean;
  noIdolSpecificProducerItem?: boolean;
  producerItems: Array<{
    enhanced?: ProducerItem["enhanced"];
    id: ProducerItemDataId;
  }>;
  scoreBonus?: Idol["scoreBonus"];
  specialTrainingLevel?: number | undefined;
  talentAwakeningLevel?: number | undefined;
  turns: Lesson["turns"];
}): GamePlay => {
  const idGenerator = createIdGenerator();
  const getRandom = Math.random;
  const idolData = getIdolDataById(params.idolDataId);
  const specialTrainingLevel = params.specialTrainingLevel ?? 0;
  const talentAwakeningLevel = params.talentAwakeningLevel ?? 0;
  const ignoreIdolParameterKindConditionAfterClearing =
    params.ignoreIdolParameterKindConditionAfterClearing ?? false;
  const cards: Card[] = [
    ...(!params.noIdolSpecificCard
      ? [
          {
            id: params.idolSpecificCardTestId ?? idGenerator(),
            data: getCardDataById(idolData.specificCardId),
            enhancements:
              specialTrainingLevel >= 3 ? [{ kind: "original" } as const] : [],
          } as const,
        ]
      : []),
    ...params.cards.map((cardSetting) => {
      const card: Card = {
        id: cardSetting.testId ?? idGenerator(),
        data: getCardDataByConstId(cardSetting.id),
        enhancements: cardSetting.enhanced ? [{ kind: "original" }] : [],
      };
      return card;
    }),
  ].sort((a, b) => compareDeckOrder(a.data, b.data));
  const producerItems: ProducerItem[] = [
    ...(!params.noIdolSpecificProducerItem
      ? [
          {
            id: idGenerator(),
            data: getProducerItemDataById(idolData.specificProducerItemId),
            enhanced: talentAwakeningLevel >= 2,
            activationCount: 0,
          },
        ]
      : []),
    ...params.producerItems.map((producerItemSetting) => {
      return {
        id: idGenerator(),
        data: getProducerItemDataByConstId(producerItemSetting.id),
        enhanced: producerItemSetting.enhanced ?? false,
        activationCount: 0,
      };
    }),
  ];
  const drinks: Drink[] = (params.drinks ?? []).map((drinkSetting) => {
    return {
      id: idGenerator(),
      data: getDrinkDataById(drinkSetting.id),
    };
  });
  return {
    getRandom,
    idGenerator,
    initialLesson: createLesson({
      cards,
      clearScoreThresholds: params.clearScoreThresholds,
      drinks,
      encouragements: params.encouragements,
      idGenerator,
      idolDataId: params.idolDataId,
      ignoreIdolParameterKindConditionAfterClearing,
      life: params.life,
      maxLife: params.maxLife,
      memoryEffects: params.memoryEffects,
      producerItems,
      scoreBonus: params.scoreBonus,
      turns: params.turns,
    }),
    updates: [],
  };
};

/**
 * 現在のレッスンの状態を返す
 */
export const getLesson = (gamePlay: GamePlay): Lesson =>
  patchDiffs(gamePlay.initialLesson, gamePlay.updates);

/**
 * そのターンのアイドルの行動が終了しているかを返す
 */
export const hasActionEnded = (gamePlay: GamePlay): boolean => {
  const lesson = getLesson(gamePlay);
  return lesson.idol.actionPoints === 0;
};

/**
 * レッスンが終了しているかを返す
 *
 * - 以下の処理の後に本関数を呼び出し、レッスンが終了しているかを判定する。終了していたら、その時点から後続処理を行わない。
 *   - `startTurn`
 *   - `playCard`
 *   - `endTurn`
 */
export const isLessonEnded = (gamePlay: GamePlay): boolean => {
  const lesson = getLesson(gamePlay);
  return (
    isScoreSatisfyingPerfect(lesson) ||
    (createCurrentTurnDetails(lesson).remainingTurns === 1 &&
      hasActionEnded(gamePlay) &&
      lesson.turnEnded)
  );
};

/**
 * 次に行うべきフェーズを返す
 *
 * - 各フェーズの処理、例えば、`startTurn`、`playCard`、`endTurn` などの終了後に呼び出して、次に行うことを判定する
 * - 各フェーズの処理の実行中に呼び出すと、正常に判定できない
 */
export const getNextPhase = (gamePlay: GamePlay): NextLifecyclePhase => {
  const lesson = getLesson(gamePlay);
  if (isLessonEnded(gamePlay)) {
    return "lessonEnd";
  } else if (hasActionEnded(gamePlay)) {
    return lesson.turnNumber === 0 && !lesson.turnEnded
      ? "lessonStart"
      : lesson.turnEnded
        ? "turnStart"
        : "turnEnd";
  } else {
    return "playerInput";
  }
};

/**
 * レッスンのターンを開始する
 *
 * - レッスン開始時に関わる処理も含む
 */
export const startTurn = (gamePlay: GamePlay): GamePlay => {
  let { updates } = gamePlay;
  let historyResultIndex = getNextHistoryResultIndex(updates);
  let lesson = getLesson(gamePlay);

  if (
    (lesson.turnNumber !== 0 && lesson.turnEnded === false) ||
    !hasActionEnded(gamePlay)
  ) {
    throw new Error("ターンが正常に終了していない");
  } else if (isLessonEnded(gamePlay)) {
    throw new Error("レッスンが終了している");
  }

  if (lesson.turnNumber === 0) {
    //
    // レッスン開始時の効果発動
    //
    // - ゲーム内の履歴を見ると、1ターン目の前にこれの結果が記載されている
    //
    const activateEffectsOnLessonStartResult = activateEffectsOnLessonStart(
      lesson,
      historyResultIndex,
      {
        getRandom: gamePlay.getRandom,
        idGenerator: gamePlay.idGenerator,
      },
    );
    updates = [...updates, ...activateEffectsOnLessonStartResult.updates];
    historyResultIndex =
      activateEffectsOnLessonStartResult.nextHistoryResultIndex;
    lesson = patchDiffs(lesson, activateEffectsOnLessonStartResult.updates);
  } else {
    //
    // ターン終了フラグをOffにする
    //
    const turnEndedUpdates: LessonUpdateQuery[] = [
      {
        kind: "turnEnded",
        value: false,
        reason: {
          kind: "turnStart",
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex,
        },
      },
    ];
    updates = [...updates, ...turnEndedUpdates];
    historyResultIndex++;
    lesson = patchDiffs(lesson, turnEndedUpdates);
  }

  //
  // ターン経過に伴い、状態修正の効果時間を減少
  //
  if (lesson.idol.modifierIdsAtTurnStart.length > 0) {
    const decreaseEachModifierDurationOverTimeResult =
      decreaseEachModifierDurationOverTime(lesson, historyResultIndex);
    updates = [
      ...updates,
      ...decreaseEachModifierDurationOverTimeResult.updates,
    ];
    historyResultIndex =
      decreaseEachModifierDurationOverTimeResult.nextHistoryResultIndex;
    lesson = patchDiffs(
      lesson,
      decreaseEachModifierDurationOverTimeResult.updates,
    );
  }

  //
  // アクションポイントを1にする
  //
  const actionPointsUpdates: LessonUpdateQuery[] = [
    {
      kind: "actionPoints",
      amount: -lesson.idol.actionPoints + 1,
      reason: {
        kind: "turnStart",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex,
      },
    },
  ];
  updates = [...updates, ...actionPointsUpdates];
  historyResultIndex++;
  lesson = patchDiffs(lesson, actionPointsUpdates);

  //
  // ターン番号を増やす
  //
  const increaseTurnNumberUpdate: LessonUpdateQuery = {
    kind: "turnNumberIncrease",
    reason: {
      kind: "turnStart",
      historyTurnNumber: lesson.turnNumber,
      historyResultIndex,
    },
  };
  updates = [...updates, increaseTurnNumberUpdate];
  historyResultIndex++;
  lesson = patchDiffs(lesson, [increaseTurnNumberUpdate]);

  //
  // ターン開始時の効果発動順序のまとめ
  //
  // 1. 応援/トラブルの効果発動
  // 2. Pアイテム起因の、「ターン開始時」の効果発動
  //    ProducerItemTrigger["kind"] === "turnStart"
  // 3. Pアイテム起因の、「2ターンごと」の効果発動
  //    ProducerItemTrigger["kind"] === "turnStartEveryTwoTurns"
  // 4. 手札を山札から引く
  // 5. 状態修正起因の、「(次ターン|nターン後)、パラメータ+n」の効果発動
  //    Modifier["kind"] === "delayedEffect" && Effect["kind"] === "perform"
  // 6. 状態修正起因の、「(次ターン|nターン後)、スキルカードを引く」の効果発動
  //    Modifier["kind"] === "delayedEffect" && Effect["kind"] === "drawCards"
  // 7. 状態修正起因の、「(次ターン|nターン後)、スキルカードを強化」の効果発動
  //    Modifier["kind"] === "delayedEffect" && Effect["kind"] === "enhanceHand"
  // 8. メモリーのアビリティの効果発動
  //
  // 仕様確認済み情報のまとめ
  //
  // - 1 > 2
  //   - 応援 -> 「最後の夏の思い出」の順序で発動していることを以下で確認
  //     - 参考動画: https://youtu.be/l0kHH_iSDJw?si=jRG4zYp69AQL-JSh&t=1209
  // - 2 > 3
  //   - 「はつぼしキーホルダー」->「柴犬ポシェット」の順序で発動していることを以下で確認
  //     - 参考動画: https://www.youtube.com/live/6LEmq_eZTE4?si=ZPlHH-4Nw0kb4aoC&t=16768
  //       - Pアイテムの順序は、「柴犬ポシェット」->「はつぼしキーホルダー」の順
  // - 2 > 4 > 5
  //   - 「星のリトルプリンス」-> 手札を引く -> 「成就」の順序で発動していることを以下で確認
  //     - 参考動画: https://www.youtube.com/live/DDZaGs2xkNo?si=u1CdnIForY12KtF1&t=5256
  // - 6 > 8
  //   - 画面から明らかにわかる
  //     - 参考動画: https://youtu.be/l0kHH_iSDJw?si=MLtGqNzDrG4B4wSp&t=21
  // - 5,6,7 vs 8
  //   - 7 は 1 ターン目のみなので、同時に発動することはないはず
  //

  //
  // 応援/トラブルの効果発動
  //
  const activateEncouragementOnTurnStartResult =
    activateEncouragementOnTurnStart(lesson, historyResultIndex, {
      getRandom: gamePlay.getRandom,
      idGenerator: gamePlay.idGenerator,
    });
  updates = [...updates, ...activateEncouragementOnTurnStartResult.updates];
  historyResultIndex =
    activateEncouragementOnTurnStartResult.nextHistoryResultIndex;
  lesson = patchDiffs(lesson, activateEncouragementOnTurnStartResult.updates);

  //
  // Pアイテム起因の、ターン開始時・2ターンごとの効果発動
  //
  const activateProducerItemEffectsOnTurnStartResult =
    activateProducerItemEffectsOnTurnStart(lesson, historyResultIndex, {
      getRandom: gamePlay.getRandom,
      idGenerator: gamePlay.idGenerator,
    });
  updates = [
    ...updates,
    ...activateProducerItemEffectsOnTurnStartResult.updates,
  ];
  historyResultIndex =
    activateProducerItemEffectsOnTurnStartResult.nextHistoryResultIndex;
  lesson = patchDiffs(
    lesson,
    activateProducerItemEffectsOnTurnStartResult.updates,
  );

  //
  // 手札を山札から引く
  //
  // - Pアイテム起因のターン開始処理でスコアパーフェクトを満たした場合、手札を引かないことを、SSR広のPアイテムで確認した
  //
  if (!isScoreSatisfyingPerfect(lesson)) {
    const drawCardsOnTurnStartResult = drawCardsOnTurnStart(
      lesson,
      historyResultIndex,
      {
        getRandom: gamePlay.getRandom,
      },
    );
    updates = [...updates, ...drawCardsOnTurnStartResult.updates];
    historyResultIndex = drawCardsOnTurnStartResult.nextHistoryResultIndex;
    lesson = patchDiffs(lesson, drawCardsOnTurnStartResult.updates);
  }

  //
  // 状態修正起因の、ターン開始時の効果発動
  //
  if (!isScoreSatisfyingPerfect(lesson)) {
    const activateModifierEffectsOnTurnStartResult =
      activateModifierEffectsOnTurnStart(lesson, historyResultIndex, {
        getRandom: gamePlay.getRandom,
        idGenerator: gamePlay.idGenerator,
      });
    updates = [...updates, ...activateModifierEffectsOnTurnStartResult.updates];
    historyResultIndex =
      activateModifierEffectsOnTurnStartResult.nextHistoryResultIndex;
    lesson = patchDiffs(
      lesson,
      activateModifierEffectsOnTurnStartResult.updates,
    );
  }

  //
  // メモリーのアビリティの効果発動
  //
  if (lesson.turnNumber === 1 && !isScoreSatisfyingPerfect(lesson)) {
    const activateMemoryEffectsOnLessonStartResult =
      activateMemoryEffectsOnLessonStart(lesson, historyResultIndex, {
        getRandom: gamePlay.getRandom,
        idGenerator: gamePlay.idGenerator,
      });
    updates = [...updates, ...activateMemoryEffectsOnLessonStartResult.updates];
    historyResultIndex =
      activateMemoryEffectsOnLessonStartResult.nextHistoryResultIndex;
    lesson = patchDiffs(
      lesson,
      activateMemoryEffectsOnLessonStartResult.updates,
    );
  }

  //
  // この時点で存在する状態修正IDリストを更新
  //
  // - 次ターン開始時の先頭で、効果時間の自然減少の対象にするもの
  // - もし、「状態修正起因の、ターン開始時の効果発動」で効果時間を持つものが付与される場合、自然減少の対象になるかは不明
  //   - 今の所、「状態修正起因の、ターン開始時の効果発動」の効果には、状態修正を付与するものがない
  //
  const modifierIdsAtTurnStartUpdates: LessonUpdateQuery[] = [
    {
      kind: "modifierIdsAtTurnStart",
      modifierIdsAtTurnStart: lesson.idol.modifiers.map((e) => e.id),
      reason: {
        kind: "turnStart",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex,
      },
    },
  ];
  updates = [...updates, ...modifierIdsAtTurnStartUpdates];
  historyResultIndex++;
  lesson = patchDiffs(lesson, modifierIdsAtTurnStartUpdates);

  return {
    ...gamePlay,
    updates,
  };
};

/**
 * スキルカードを使用する
 *
 * @param selectedCardInHandIndex 選択する手札のインデックス、使用条件を満たす手札のみ選択可能
 */
export const playCard = (
  gamePlay: GamePlay,
  selectedCardInHandIndex: number,
): GamePlay => {
  let { updates } = gamePlay;
  let historyResultIndex = getNextHistoryResultIndex(updates);
  let lesson = getLesson(gamePlay);

  if (lesson.turnEnded) {
    throw new Error("ターンが正常に開始していない");
  } else if (hasActionEnded(gamePlay)) {
    throw new Error("アイドルの行動が終了している");
  } else if (isLessonEnded(gamePlay)) {
    throw new Error("レッスンが終了している");
  }

  //
  // ------------------
  // スキルカードを使用する
  // ------------------
  //
  // スキルカード使用時の効果発動順序のまとめ
  //
  // 1. 手札の消費
  // 2. コストの消費
  // 3. 効果発動、「次に使用するスキルカードの効果をもう1回発動」があれば 3 全体を 2 回実行
  // 3-a. 「次に使用するスキルカードの効果をもう1回発動」があれば、1 つ消費
  // 3-b. Pアイテムに起因する、スキルカード使用時の主効果発動前の効果発動
  // 3-c. 状態修正に起因する、スキルカード使用時の効果発動
  // 3-d. 主効果発動
  // 3-e. Pアイテムに起因する、スキルカード使用時の主効果発動後の効果発動
  // 3-f. Pアイテムに起因する、スキルカードの主効果による状態修正増加後の効果発動
  //
  // 仕様確認済み情報のまとめ
  //
  // - 「次に使用するスキルカードの効果をもう1回発動」が 2 つ付与されている状態だとどうなるか？
  //   - 1 回のスキルカード使用につき、 1 回しか繰り返さない
  //     - 例えば、「国民的アイドル」→「入道雲と、きみ」を実行して、後者の状態修正が重複している状態でアクティブスキルカードを使用しても 1 回しか繰り返さない
  //       - 参考動画: https://youtu.be/0OTOCFB8_zo?si=W9F0YHS5tNXqm0TV&t=246
  // - 3-a > 3-d
  //   - 見た目上は、主効果発動前に消費している
  //     - 参考動画: https://youtu.be/0OTOCFB8_zo?si=W9F0YHS5tNXqm0TV&t=246
  // - 3-b > 3-d
  //   - 「虹かけるクロス」で確認
  //     - 参考動画: https://www.youtube.com/live/UEyfJE3u2dg?si=U4cU_N-wGb5Y-tCf&t=2283
  //   - 「満開ペアヘアピン」も同じだった
  // - 3-c > 3-d
  //   - 「輝くキミへ」の場合
  //     - 参考動画: https://www.youtube.com/live/UEyfJE3u2dg?si=yDqqGoLU_ENPKzaz&t=2293
  //   - 「輝くキミへ」がある状態で「ファンシーチャーム」を使った場合
  //     - 参考動画: https://www.youtube.com/live/UEyfJE3u2dg?si=iEEZZ8gCItrptYVX&t=2711
  //       - 「輝くキミへ」状態修正発動 → 「ファンシーチャーム」状態修正発動 → 「ファンシーチャーム」主効果発動
  //       - 状態修正リストの上から発動していそうなこともわかる
  // - 3-b > 3-c
  //   - 「いつものメイクポーチ」と「願いの力」を同時に発動したら、前者が先に発動していた
  //     - 参考動画: https://youtube.com/shorts/359RrA1iIWo?feature=share
  // - 3-d > 3-e
  //   - 「ビッグドリーム貯金箱」で確認
  //     - 参考動画: https://www.youtube.com/live/UEyfJE3u2dg?si=Dy0wKkkmMi2YPElw&t=2371
  // - 3-d > 3-f
  //   - 「ひみつ特訓カーデ」
  //     - 参考動画: https://youtu.be/Z_ls8y-ar4k?si=HUYDzJ31ptVfRVvR&t=265
  // - 3-e と 3-f の順序
  //   - どちらもキャラ固有にしか存在しなく、同時に所持できないので、現在は気にしないで良い
  //
  const useCardResult = useCard(lesson, historyResultIndex, {
    getRandom: gamePlay.getRandom,
    idGenerator: gamePlay.idGenerator,
    selectedCardInHandIndex,
    preview: false,
  });
  updates = [...updates, ...useCardResult.updates];
  historyResultIndex = useCardResult.nextHistoryResultIndex;
  lesson = patchDiffs(lesson, useCardResult.updates);

  return {
    ...gamePlay,
    updates,
  };
};

/**
 * Pドリンクを使用する
 *
 * - プレビューはない
 *
 * @param drinkIndex 選択するPドリンクのインデックス、使用条件を満たすPドリンクのみ選択可能
 */
export const useDrink = (gamePlay: GamePlay, drinkIndex: number): GamePlay => {
  let { updates } = gamePlay;
  let historyResultIndex = getNextHistoryResultIndex(updates);
  let lesson = getLesson(gamePlay);

  if (lesson.turnEnded) {
    throw new Error("ターンが正常に開始していない");
  } else if (hasActionEnded(gamePlay)) {
    throw new Error("アイドルの行動が終了している");
  } else if (isLessonEnded(gamePlay)) {
    throw new Error("レッスンが終了している");
  }

  const useDrinkResult = useDrinkMutation(lesson, historyResultIndex, {
    getRandom: gamePlay.getRandom,
    idGenerator: gamePlay.idGenerator,
    drinkIndex,
  });
  updates = [...updates, ...useDrinkResult.updates];
  historyResultIndex = useDrinkResult.nextHistoryResultIndex;
  lesson = patchDiffs(lesson, useDrinkResult.updates);

  return {
    ...gamePlay,
    updates,
  };
};

/**
 * ターンをスキップする
 *
 * - 本家のボタンについているラベルは「Skip」
 * - プレビューはない
 */
export const skipTurn = (gamePlay: GamePlay): GamePlay => {
  let { updates } = gamePlay;
  let historyResultIndex = getNextHistoryResultIndex(updates);
  let lesson = getLesson(gamePlay);

  if (lesson.turnEnded) {
    throw new Error("ターンが正常に開始していない");
  } else if (hasActionEnded(gamePlay)) {
    throw new Error("アイドルの行動が終了している");
  } else if (isLessonEnded(gamePlay)) {
    throw new Error("レッスンが終了している");
  }

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
  lesson = patchDiffs(lesson, actionPointsUpdates);

  //
  // 体力を2回復する
  //
  const recoveringLifeUpdates: LessonUpdateQuery[] = [
    {
      kind: "life",
      actual:
        Math.min(
          lifeRecoveredBySkippingTurn,
          lesson.idol.maxLife - lesson.idol.life,
        ) + 0,
      max: lifeRecoveredBySkippingTurn,
      reason: {
        kind: "turnSkip",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex,
      },
    },
  ];
  updates = [...updates, ...recoveringLifeUpdates];
  historyResultIndex++;
  lesson = patchDiffs(lesson, recoveringLifeUpdates);

  return {
    ...gamePlay,
    updates,
  };
};

/**
 * レッスンのターンを終了する
 */
export const endTurn = (gamePlay: GamePlay): GamePlay => {
  let { updates } = gamePlay;
  let historyResultIndex = getNextHistoryResultIndex(updates);
  let lesson = getLesson(gamePlay);

  if (lesson.turnEnded) {
    throw new Error("ターンが正常に開始していない");
  } else if (!hasActionEnded(gamePlay)) {
    throw new Error("アイドルの行動が終了していない");
  } else if (isLessonEnded(gamePlay)) {
    throw new Error("レッスンが終了している");
  }

  //
  // ターン終了時の効果発動順序のまとめ
  //
  // 1. Pアイテム起因の、「ターン終了時」の効果発動
  //    ProducerItemTrigger["kind"] === "turnEnd"
  // 2. 状態修正起因の、「ターン終了時」の効果発動
  //    Modifier["kind"] === "effectActivationOnTurnEnd"
  // 3. 未使用の手札を捨てる
  // 4. 好印象の評価によるスコア増加効果発動
  //
  // 仕様確認済み情報のまとめ
  //
  // - 1 > 2
  //   - SSRリーリヤが、ちょうど固有の「もう怖くないから」と「夢へのライフログ」で両方の効果を持っている
  //     - 参考動画: https://www.youtube.com/live/fiQjD6lhsso?si=25gkSXymj3FEkXQA&t=5591
  //       - 一瞬、「夢へのライフログ」による好印象 14->21 が表示され、それによるスコア増加が続き、「もう怖くないから」による好印象21->22、が発動している
  // - 2 > 3 > 4
  //   - 好印象によるスコア増加は手札を捨てた後に発動している。見ると明らかにわかる。
  //

  //
  // 状態修正やPアイテムによるターン終了時の効果発動
  //
  const activateEffectsOnTurnEndUpdates = activateEffectsOnTurnEnd(
    lesson,
    historyResultIndex,
    {
      getRandom: gamePlay.getRandom,
      idGenerator: gamePlay.idGenerator,
    },
  );
  updates = [...updates, ...activateEffectsOnTurnEndUpdates.updates];
  historyResultIndex = activateEffectsOnTurnEndUpdates.nextHistoryResultIndex;
  lesson = patchDiffs(lesson, activateEffectsOnTurnEndUpdates.updates);

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
            kind: "turnEnd.discardingHand",
            historyTurnNumber: lesson.turnNumber,
            historyResultIndex,
          },
        },
      ];
      updates = [...updates, ...discardHandUpdates];
      historyResultIndex++;
      lesson = patchDiffs(lesson, discardHandUpdates);
    }

    //
    // 好印象によるスコア増加
    //
    const obtainPositiveImpressionScoreOnTurnEndResult =
      obtainPositiveImpressionScoreOnTurnEnd(lesson, historyResultIndex);
    updates = [
      ...updates,
      ...obtainPositiveImpressionScoreOnTurnEndResult.updates,
    ];
    historyResultIndex =
      obtainPositiveImpressionScoreOnTurnEndResult.nextHistoryResultIndex;
    lesson = patchDiffs(
      lesson,
      obtainPositiveImpressionScoreOnTurnEndResult.updates,
    );
  }

  //
  // ターン終了フラグをOnにする
  //
  const turnEndedUpdates: LessonUpdateQuery[] = [
    {
      kind: "turnEnded",
      value: true,
      reason: {
        kind: "turnEnd",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex,
      },
    },
  ];
  updates = [...updates, ...turnEndedUpdates];
  historyResultIndex++;
  lesson = patchDiffs(lesson, turnEndedUpdates);

  return {
    ...gamePlay,
    updates,
  };
};
