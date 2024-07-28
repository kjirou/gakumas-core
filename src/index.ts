// このコメントブロックは、主にCopilotに対する指示を記述するためのものである。
//
// - このファイル及び関連するファイル群は、ある既存のデッキ構築型カードバトルローグライトゲームのコアライブラリである。
// - ライブラリ名もしくはプロジェクト名は、"gakumasu-core"である。
// - このファイルは、npm packageのエントリーポイントである。
// - UIに関する実装は行わない。
// - TypeScriptの型のプロパティ名を列挙する際は、キャメルケースを使い、アルファベット降順に並べる。
// - TypeScriptの型でstringのUnion型を列挙する際は、アルファベット降順に並べる。
// - MUST: ソースコードのコメント内では、Copilotは**絶対に**提案や補完を行わないこと。

// TODO: ModifierのMetaの定義をする、その上で重ならないようにするかはフラグで持つ、その上で「ファンシーチャーム」などはlabelにそれが入るようにする
// TODO: スコアボーナスを渡せるようにする
// TODO: 状態修正一覧、Pアイテム一覧、応援/トラブル一覧などを返すユーティリティを公開APIへ追加
// TODO: Pドリンク
// TODO: レッスン履歴
// TODO: データの永続化サポート
// TODO: コンテスト

import {
  EncouragementDisplay,
  Lesson,
  LessonGamePlay,
  LessonDisplay,
  LessonUpdateQuery,
  ProducerItemDisplay,
  TurnDisplay,
} from "./types";
import {
  activateEffectsOnLessonStart,
  activateEffectsOnTurnEnd,
  activateEncouragementOnTurnStart,
  activateModifierEffectsOnTurnStart,
  activateProducerItemEffectsOnTurnStart,
  activateMemoryEffectsOnLessonStart,
  consumeRemainingCardUsageCount,
  decreaseEachModifierDurationOverTime,
  drawCardsOnTurnStart,
  obtainPositiveImpressionScoreOnTurnEnd,
  summarizeCardInHand,
  useCard,
} from "./lesson-mutation";
import {
  calculateRemainingTurns,
  createActualTurns,
  getCardContentDefinition,
  getNextHistoryResultIndex,
  getProducerItemContentDefinition,
  getRemainingProducerItemTimes,
  isScoreSatisfyingPerfect,
  patchUpdates,
} from "./models";
import {
  generateCardDescription,
  generateEffectText,
  generateProducerItemDescription,
  idolParameterKindLabels,
  modifierLabels,
} from "./text-generation";

export type * from "./types";
export * from "./models";
export * from "./utils";

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
 * 応援/トラブル情報リストを取得する
 *
 * - 例えば、アイドルの道の各ステージ詳細の応援/トラブル詳細を表示する際に使う
 */
export const getEncouragements = (
  lessonGamePlay: LessonGamePlay,
): EncouragementDisplay[] => {
  return lessonGamePlay.initialLesson.encouragements.map((encouragement) => {
    return {
      ...encouragement,
      description: generateEffectText(encouragement.effect, {
        hasSeparator: false,
      }),
    };
  });
};

/**
 * レッスンのターンを開始する
 *
 * - レッスン開始時に関わる処理も含む
 */
export const startLessonTurn = (
  lessonGamePlay: LessonGamePlay,
): LessonGamePlay => {
  let { updates } = lessonGamePlay;
  let historyResultIndex = getNextHistoryResultIndex(updates);
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
      getRandom: lessonGamePlay.getRandom,
      idGenerator: lessonGamePlay.idGenerator,
    });
  updates = [...updates, ...activateEncouragementOnTurnStartResult.updates];
  historyResultIndex =
    activateEncouragementOnTurnStartResult.nextHistoryResultIndex;
  lesson = patchUpdates(lesson, activateEncouragementOnTurnStartResult.updates);

  //
  // Pアイテム起因の、ターン開始時・2ターンごとの効果発動
  //
  const activateProducerItemEffectsOnTurnStartResult =
    activateProducerItemEffectsOnTurnStart(lesson, historyResultIndex, {
      getRandom: lessonGamePlay.getRandom,
      idGenerator: lessonGamePlay.idGenerator,
    });
  updates = [
    ...updates,
    ...activateProducerItemEffectsOnTurnStartResult.updates,
  ];
  historyResultIndex =
    activateProducerItemEffectsOnTurnStartResult.nextHistoryResultIndex;
  lesson = patchUpdates(
    lesson,
    activateProducerItemEffectsOnTurnStartResult.updates,
  );

  //
  // 手札を山札から引く
  //
  // - Pアイテム起因のターン開始処理でスコアパーフェクトを満たした場合、手札を引かないことを、SSR広のPアイテムで確認した
  //
  if (!isScoreSatisfyingPerfect(lesson)) {
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

  //
  // 状態修正起因の、ターン開始時の効果発動
  //
  if (!isScoreSatisfyingPerfect(lesson)) {
    const activateModifierEffectsOnTurnStartResult =
      activateModifierEffectsOnTurnStart(lesson, historyResultIndex, {
        getRandom: lessonGamePlay.getRandom,
        idGenerator: lessonGamePlay.idGenerator,
      });
    updates = [...updates, ...activateModifierEffectsOnTurnStartResult.updates];
    historyResultIndex =
      activateModifierEffectsOnTurnStartResult.nextHistoryResultIndex;
    lesson = patchUpdates(
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
        getRandom: lessonGamePlay.getRandom,
        idGenerator: lessonGamePlay.idGenerator,
      });
    updates = [...updates, ...activateMemoryEffectsOnLessonStartResult.updates];
    historyResultIndex =
      activateMemoryEffectsOnLessonStartResult.nextHistoryResultIndex;
    lesson = patchUpdates(
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
        kind: "turnEndTrigger",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex,
      },
    },
  ];
  updates = [...updates, ...modifierIdsAtTurnStartUpdates];
  historyResultIndex++;
  lesson = patchUpdates(lesson, modifierIdsAtTurnStartUpdates);

  return {
    ...lessonGamePlay,
    updates,
  };
};

/**
 * レッスン中のPアイテム表示用情報リストを生成する
 */
const createProducerDisplays = (lesson: Lesson): ProducerItemDisplay[] => {
  return lesson.idol.producerItems.map((producerItem) => {
    const producerItemContent = getProducerItemContentDefinition(producerItem);
    const name =
      producerItem.original.definition.name +
      (producerItem.original.enhanced ? "+" : "");
    return {
      ...producerItem,
      name,
      description: generateProducerItemDescription({
        condition: producerItemContent.condition,
        cost: producerItemContent.cost,
        effects: producerItemContent.effects,
        times: producerItemContent.times,
        trigger: producerItemContent.trigger,
      }),
      remainingTimes: getRemainingProducerItemTimes(producerItem),
    };
  });
};

/**
 * レッスン表示用情報を生成する
 *
 * - TODO: ターン詳細の「3位以上で合格」が未実装
 * - TODO: レッスン履歴が未実装
 */
export const createLessonDisplay = (
  lessonGamePlay: LessonGamePlay,
): LessonDisplay => {
  const lesson = patchUpdates(
    lessonGamePlay.initialLesson,
    lessonGamePlay.updates,
  );
  const modifiers = lesson.idol.modifiers.map((modifier) => {
    return {
      ...modifier,
      label: modifierLabels[modifier.kind],
      description: "",
    };
  });
  const encouragements = getEncouragements(lessonGamePlay);
  const turns: TurnDisplay[] = createActualTurns(lesson).map(
    (idolParameterKind, index) => {
      const turnNumber = index + 1;
      const encouragement = encouragements.find(
        (e) => e.turnNumber === turnNumber,
      );
      return {
        turnNumber,
        turnNumberDiff: turnNumber - lesson.turnNumber,
        idolParameterKind,
        idolParameterLabel: idolParameterKindLabels[idolParameterKind],
        ...(encouragement ? { encouragement } : {}),
      };
    },
  );
  const hand = lesson.hand.map((cardId) => {
    return {
      ...summarizeCardInHand(
        lesson,
        cardId,
        lessonGamePlay.getRandom,
        lessonGamePlay.idGenerator,
      ),
    };
  });
  return {
    hand,
    life: lesson.idol.life,
    modifiers,
    producerItems: createProducerDisplays(lesson),
    turnNumber: lesson.turnNumber,
    turns,
    vitality: lesson.idol.vitality,
  };
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
 *   - プレビュー時には、選択したスキルカードの効果のみ反映される
 *     - 例えば、「ワクワクが止まらない」の状態修正が付与されている時に、メンタルスキルカードを選択しても、その分は反映されない
 *       - 参考動画: https://youtu.be/7hbRaIYE_ZI?si=Jd5JYrOVCJZZPp7i&t=214
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
  let { updates } = lessonGamePlay;
  let historyResultIndex = getNextHistoryResultIndex(updates);
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
    getRandom: lessonGamePlay.getRandom,
    idGenerator: lessonGamePlay.idGenerator,
    selectedCardInHandIndex,
    preview: false,
  });
  updates = [...updates, ...useCardResult.updates];
  historyResultIndex = useCardResult.nextHistoryResultIndex;
  lesson = patchUpdates(lesson, useCardResult.updates);

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
  let { updates } = lessonGamePlay;
  let historyResultIndex = getNextHistoryResultIndex(updates);
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
  let { updates } = lessonGamePlay;
  let historyResultIndex = getNextHistoryResultIndex(updates);
  let lesson = patchUpdates(
    lessonGamePlay.initialLesson,
    lessonGamePlay.updates,
  );

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
      getRandom: lessonGamePlay.getRandom,
      idGenerator: lessonGamePlay.idGenerator,
    },
  );
  updates = [...updates, ...activateEffectsOnTurnEndUpdates.updates];
  historyResultIndex = activateEffectsOnTurnEndUpdates.nextHistoryResultIndex;
  lesson = patchUpdates(lesson, activateEffectsOnTurnEndUpdates.updates);

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
      lesson = patchUpdates(
        lesson,
        obtainPositiveImpressionScoreOnTurnEndResult.updates,
      );
    }
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
    (calculateRemainingTurns(lesson) === 1 && lesson.idol.actionPoints === 0) ||
    isScoreSatisfyingPerfect(lesson)
  );
};
