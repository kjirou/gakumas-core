import type {
  ActionCost,
  Card,
  CardInHandSummary,
  CardInProduction,
  CardUsageCondition,
  Effect,
  EffectCondition,
  GetRandom,
  IdGenerator,
  Idol,
  Lesson,
  LessonUpdateQuery,
  LessonUpdateQueryDiff,
  LessonUpdateQueryReason,
  Modifier,
  ProducePlan,
  ProducerItem,
  ProducerItemContentDefinition,
  VitalityUpdateQuery,
} from "./types";
import { filterGeneratableCardsData } from "./data/cards";
import {
  calculateActualActionCost,
  calculateClearScoreProgress,
  calculateRemainingTurns,
  getCardContentDefinition,
  getIdolParameterKindOnTurn,
  getProducerItemContentDefinition,
  handSizeOnLessonStart,
  isDelayedEffectModifierType,
  isDrawCardsEffectType,
  isEnhanceHandEffectType,
  isPerformEffectType,
  isRemainingProducerItemTimes,
  isScoreSatisfyingPerfect,
  maxHandSize,
  patchUpdates,
  prepareCardsForLesson,
} from "./models";
import { shuffleArray, validateNumberInRange } from "./utils";

/** 主に型都合のユーティリティ処理 */
const createLessonUpdateQueryFromDiff = (
  diff: LessonUpdateQueryDiff,
  reason: LessonUpdateQueryReason,
): LessonUpdateQuery => ({ ...diff, reason });

/**
 * 山札から指定数のスキルカードを引く
 *
 * - 山札がなくなった場合は、捨札をシャッフルして山札にする
 */
export const drawCardsFromDeck = (
  deck: Lesson["deck"],
  count: number,
  discardPile: Lesson["discardPile"],
  getRandom: GetRandom,
): {
  deck: Lesson["deck"];
  deckRebuilt: boolean;
  discardPile: Lesson["discardPile"];
  drawnCards: Array<Card["id"]>;
} => {
  let newDeck = [...deck];
  let newDiscardPile = [...discardPile];
  let drawnCards = [];
  let deckRebuilt = false;
  for (let i = 0; i < count; i++) {
    // 捨札を加えても引く数に足りない状況は考慮しない
    if (newDeck.length === 0) {
      newDeck = shuffleArray(newDiscardPile, getRandom);
      newDiscardPile = [];
      deckRebuilt = true;
    }
    const drawnCard = newDeck.shift();
    if (!drawnCard) {
      throw new Error("Unexpected empty deck");
    }
    drawnCards.push(drawnCard);
  }
  return {
    deck: newDeck,
    deckRebuilt,
    discardPile: newDiscardPile,
    drawnCards,
  };
};

/**
 * スキルカードを手札へ加える
 *
 * - 山札から引いた時、レッスン開始時手札を引く時、生成した時、などに使う
 * - 手札が最大枚数の5枚に達した以降は、引いたスキルカードは手札へ加えずに捨札へ移動する
 */
export const addCardsToHandOrDiscardPile = (
  drawnCards: Array<Card["id"]>,
  hand: Lesson["hand"],
  discardPile: Lesson["discardPile"],
): {
  hand: Lesson["hand"];
  discardPile: Lesson["discardPile"];
} => {
  const newHand = [...hand];
  const newDiscardPile = [...discardPile];
  for (const drawnCard of drawnCards) {
    if (newHand.length < maxHandSize) {
      newHand.push(drawnCard);
    } else {
      newDiscardPile.push(drawnCard);
    }
  }
  return {
    hand: newHand,
    discardPile: newDiscardPile,
  };
};

export const createCardPlacementDiff = (
  before: {
    deck?: Lesson["deck"];
    discardPile?: Lesson["discardPile"];
    hand?: Lesson["hand"];
    removedCardPile?: Lesson["removedCardPile"];
  },
  after: {
    deck?: Lesson["deck"];
    discardPile?: Lesson["discardPile"];
    hand?: Lesson["hand"];
    removedCardPile?: Lesson["removedCardPile"];
  },
): Extract<LessonUpdateQueryDiff, { kind: "cardPlacement" }> => {
  return {
    kind: "cardPlacement" as const,
    ...(before.deck !== undefined &&
    after.deck !== undefined &&
    JSON.stringify(before.deck) !== JSON.stringify(after.deck)
      ? { deck: after.deck }
      : {}),
    ...(before.discardPile !== undefined &&
    after.discardPile !== undefined &&
    JSON.stringify(before.discardPile) !== JSON.stringify(after.discardPile)
      ? { discardPile: after.discardPile }
      : {}),
    ...(before.hand !== undefined &&
    after.hand !== undefined &&
    JSON.stringify(before.hand) !== JSON.stringify(after.hand)
      ? { hand: after.hand }
      : {}),
    ...(before.removedCardPile !== undefined &&
    after.removedCardPile !== undefined &&
    JSON.stringify(before.removedCardPile) !==
      JSON.stringify(after.removedCardPile)
      ? { removedCardPile: after.removedCardPile }
      : {}),
  };
};

/**
 * アイドルがコスト分のリソースを持つかを検証する
 */
export const validateCostConsumution = (
  idol: Idol,
  cost: ActionCost,
): boolean => {
  const actualCost = calculateActualActionCost(cost, idol.modifiers);
  const actualCostKind = actualCost.kind;
  switch (actualCostKind) {
    case "focus": {
      const focus = idol.modifiers.find((e) => e.kind === "focus");
      const focusAmount = focus && "amount" in focus ? focus.amount : 0;
      return actualCost.value <= focusAmount;
    }
    case "goodCondition": {
      const goodCondition = idol.modifiers.find(
        (e) => e.kind === "goodCondition",
      );
      const goodConditionDuration =
        goodCondition && "duration" in goodCondition
          ? goodCondition.duration
          : 0;
      return actualCost.value <= goodConditionDuration;
    }
    case "life": {
      return actualCost.value <= idol.life;
    }
    case "motivation": {
      const motivation = idol.modifiers.find((e) => e.kind === "motivation");
      const motivationAmount =
        motivation && "amount" in motivation ? motivation.amount : 0;
      return actualCost.value <= motivationAmount;
    }
    case "normal": {
      return actualCost.value <= idol.life + idol.vitality;
    }
    case "positiveImpression": {
      const positiveImpression = idol.modifiers.find(
        (e) => e.kind === "positiveImpression",
      );
      const positiveImpressionAmount =
        positiveImpression && "amount" in positiveImpression
          ? positiveImpression.amount
          : 0;
      return actualCost.value <= positiveImpressionAmount;
    }
    default: {
      const unreachable: never = actualCostKind;
      throw new Error(`Unreachable statement`);
    }
  }
};

/** スキルカードが使用できるかを判定する */
export const canUseCard = (
  lesson: Lesson,
  cost: ActionCost,
  condition: CardUsageCondition | undefined,
): boolean => {
  const costValidation = validateCostConsumution(lesson.idol, cost);
  if (!costValidation) {
    return false;
  }
  if (!condition) {
    return true;
  }
  const conditionKind = condition.kind;
  switch (conditionKind) {
    case "countTurnNumber": {
      return lesson.turnNumber >= condition.min;
    }
    case "countVitalityZero": {
      return lesson.idol.vitality === 0;
    }
    case "hasGoodCondition": {
      return (
        lesson.idol.modifiers.find((e) => e.kind === "goodCondition") !==
        undefined
      );
    }
    case "measureValue": {
      let targetPercentage: number | undefined = undefined;
      const valueKind = condition.valueKind;
      switch (valueKind) {
        case "life": {
          targetPercentage = Math.floor(
            (lesson.idol.life * 100) / lesson.idol.original.maxLife,
          );
          break;
        }
        case "score": {
          if (lesson.clearScoreThresholds) {
            const result = calculateClearScoreProgress(
              lesson.score,
              lesson.clearScoreThresholds,
            );
            targetPercentage = result.clearScoreProgressPercentage;
          }
          break;
        }
        default: {
          const unreachable: never = valueKind;
          throw new Error(`Unreachable statement`);
        }
      }
      if (targetPercentage === undefined) {
        return true;
      }
      const criterionKind = condition.criterionKind;
      switch (criterionKind) {
        case "greaterEqual": {
          return targetPercentage >= condition.percentage;
        }
        case "lessEqual": {
          return targetPercentage <= condition.percentage;
        }
        default: {
          const unreachable: never = criterionKind;
          throw new Error(`Unreachable statement`);
        }
      }
    }
    default: {
      const unreachable: never = conditionKind;
      throw new Error(`Unreachable statement`);
    }
  }
};

/**
 * 各効果が適用できるかを判定する
 */
export const canApplyEffect = (
  lesson: Lesson,
  condition: EffectCondition,
): boolean => {
  const conditionKind = condition.kind;
  switch (conditionKind) {
    case "countModifier": {
      let targetValue: number;
      const modifierKind = condition.modifierKind;
      switch (modifierKind) {
        case "focus": {
          const focus = lesson.idol.modifiers.find((e) => e.kind === "focus");
          targetValue = focus && "amount" in focus ? focus.amount : 0;
          break;
        }
        case "motivation": {
          const motivation = lesson.idol.modifiers.find(
            (e) => e.kind === "motivation",
          );
          targetValue =
            motivation && "amount" in motivation ? motivation.amount : 0;
          break;
        }
        case "positiveImpression": {
          const positiveImpression = lesson.idol.modifiers.find(
            (e) => e.kind === "positiveImpression",
          );
          targetValue =
            positiveImpression && "amount" in positiveImpression
              ? positiveImpression.amount
              : 0;
          break;
        }
        default: {
          const unreachable: never = modifierKind;
          throw new Error(`Unreachable statement`);
        }
      }
      return targetValue >= condition.min;
    }
    case "countReminingTurns": {
      return calculateRemainingTurns(lesson) <= condition.max;
    }
    case "countVitality": {
      return validateNumberInRange(lesson.idol.vitality, condition.range);
    }
    case "hasGoodCondition": {
      return (
        lesson.idol.modifiers.find((e) => e.kind === "goodCondition") !==
        undefined
      );
    }
    case "measureIfLifeIsEqualGreaterThanHalf": {
      const percentage = Math.floor(
        (lesson.idol.life * 100) / lesson.idol.original.maxLife,
      );
      return percentage >= 50;
    }
    default: {
      const unreachable: never = conditionKind;
      throw new Error(`Unreachable statement`);
    }
  }
};

/**
 * Pアイテムが発動できる条件を満たしているかを判定する
 */
export const canActivateProducerItem = (
  lesson: Lesson,
  producerItem: ProducerItem,
) => {
  const producerItemContent = getProducerItemContentDefinition(producerItem);
  const idolParameterKind = getIdolParameterKindOnTurn(lesson);
  return (
    (producerItemContent.trigger.idolParameterKind === undefined ||
      producerItemContent.trigger.idolParameterKind === idolParameterKind) &&
    (producerItemContent.condition === undefined ||
      canApplyEffect(lesson, producerItemContent.condition)) &&
    isRemainingProducerItemTimes(producerItem)
  );
};

const calculateActualAndMaxComsumution = (
  resourceValue: number,
  costAbsValue: number,
) => {
  return {
    actual: Math.max(-resourceValue, -costAbsValue),
    max: -costAbsValue,
    restCost: Math.max(0, costAbsValue - resourceValue),
  };
};

/** LessonUpdateQueryDiff からコスト消費関係部分を抜き出したもの */
type CostConsumptionUpdateQueryDiff = Extract<
  LessonUpdateQueryDiff,
  { kind: "life" } | { kind: "modifier" } | { kind: "vitality" }
>;

/**
 * コスト消費を計算する
 *
 * - 全体的に、 actual が実際にリソースを消費する差分、 max がコスト側から指定がある値、という形で返す
 *   - つまり、消費分のコストが足りない場合に、actual と max に差が出る
 *   - コストが払えない状況を考慮しているのは、コストが払えない状況でもスキルカード使用のプレビューはできるようにするため
 * - 数値に対する `+ 0` は、`-0` を `0` に変換するため
 * - 状態修正の場合、コストの対象となるリソースがない時は、0コストを返すのではなく全く結果を返さない
 *   - まず、本家UIのスキルカード使用プレビューの仕様上、この状況の差分は全く画面に表示されないので、切実な必要がない
 *   - そして、状態修正の新規追加で負の値があることを現状考慮していないので、その分の実装を省略するため
 */
export const calculateCostConsumption = (
  idol: Idol,
  cost: ActionCost,
  idGenerator: IdGenerator,
): CostConsumptionUpdateQueryDiff[] => {
  switch (cost.kind) {
    case "normal": {
      const updates: CostConsumptionUpdateQueryDiff[] = [];
      let restCost = cost.value;
      if (idol.vitality > 0) {
        const result = calculateActualAndMaxComsumution(
          idol.vitality,
          restCost,
        );
        restCost = result.restCost;
        updates.push({
          kind: "vitality",
          actual: result.actual + 0,
          max: result.max + 0,
        });
      }
      if (restCost > 0) {
        const result = calculateActualAndMaxComsumution(idol.life, restCost);
        updates.push({
          kind: "life",
          actual: result.actual + 0,
          max: result.max + 0,
        });
      }
      return updates;
    }
    case "life": {
      const result = calculateActualAndMaxComsumution(idol.life, cost.value);
      return [
        {
          kind: "life",
          actual: result.actual + 0,
          max: result.max + 0,
        },
      ];
    }
    case "focus":
    case "motivation":
    case "positiveImpression": {
      const id = idGenerator();
      const sameKindModifier = idol.modifiers.find((e) => e.kind === cost.kind);
      if (sameKindModifier && "amount" in sameKindModifier) {
        const actual = Math.min(cost.value, sameKindModifier.amount);
        return [
          {
            kind: "modifier",
            actual: {
              kind: cost.kind,
              amount: -actual + 0,
              id,
              updateTargetId: sameKindModifier.id,
            },
            max: {
              kind: cost.kind,
              amount: -cost.value + 0,
              id,
              updateTargetId: sameKindModifier.id,
            },
          },
        ];
      } else {
        // 結果を返す必要があるなら要考慮点がある、関数コメント参照
        return [];
      }
    }
    case "goodCondition": {
      const id = idGenerator();
      const sameKindModifier = idol.modifiers.find((e) => e.kind === cost.kind);
      if (sameKindModifier && "duration" in sameKindModifier) {
        const actual = Math.min(cost.value, sameKindModifier.duration);
        return [
          {
            kind: "modifier",
            actual: {
              kind: cost.kind,
              duration: -actual + 0,
              id,
              updateTargetId: sameKindModifier.id,
            },
            max: {
              kind: cost.kind,
              duration: -cost.value + 0,
              id,
              updateTargetId: sameKindModifier.id,
            },
          },
        ];
      } else {
        // 結果を返す必要があるなら要考慮点がある、関数コメント参照
        return [];
      }
    }
    default: {
      const unreachable: never = cost.kind;
      throw new Error(`Unreachable statement`);
    }
  }
};

/**
 * スコア/パラメータ増加効果の計算をする
 *
 * - 本家 v1.2.0 での例
 *   - 集中:0, 好調:1, 絶好調:無, アピールの基本（未強化, +9） => 14
 *     - `9 * 1.5 = 13.5`
 *   - 集中:4, 好調:6, 絶好調:有, ハイタッチ{未強化, +17, 集中*1.5} => 49
 *     - `(17 + 4 * 1.5) * (1.5 + 0.6) = 48.30`
 *   - 集中:4, 好調:6, 絶好調:有, ハイタッチ{強化済, +23, 集中*2.0} => 66
 *     - `(23 + 4 * 2.0) * (1.5 + 0.6) = 65.10`
 *   - 集中:4, 好調:6, 絶好調:有, 初星水（+10） => 30
 *     - `(10 + 4) * (1.5 + 0.6) = 29.40`
 * - TODO: 集中増幅効果が端数の時、そこで端数処理が入るのか、小数のまま計算されるのか。とりあえず小数のまま計算されると仮定している。
 *
 * @param remainingIncrementableScore 残りの増加可能スコア。undefined の場合は、無限大として扱う。
 */
export const calculatePerformingScoreEffect = (
  idol: Idol,
  remainingIncrementableScore: number | undefined,
  query: NonNullable<Extract<Effect, { kind: "perform" }>["score"]>,
): Array<Extract<LessonUpdateQueryDiff, { kind: "score" }>> => {
  const goodCondition = idol.modifiers.find((e) => e.kind === "goodCondition");
  const goodConditionDuration =
    goodCondition && "duration" in goodCondition ? goodCondition.duration : 0;
  const focus = idol.modifiers.find((e) => e.kind === "focus");
  const focusAmount = focus && "amount" in focus ? focus.amount : 0;
  const hasExcellentCondition =
    idol.modifiers.find((e) => e.kind === "excellentCondition") !== undefined;
  const hasMightyPerformance =
    idol.modifiers.find((e) => e.kind === "mightyPerformance") !== undefined;
  const focusMultiplier =
    query.focusMultiplier !== undefined ? query.focusMultiplier : 1;
  const score = Math.ceil(
    (query.value + focusAmount * focusMultiplier) *
      ((goodConditionDuration > 0 ? 1.5 : 1.0) +
        (goodConditionDuration > 0 && hasExcellentCondition
          ? goodConditionDuration * 0.1
          : 0.0)) *
      (hasMightyPerformance ? 1.5 : 1.0),
  );
  const diffs: Array<Extract<LessonUpdateQueryDiff, { kind: "score" }>> = [];
  let remainingIncrementableScore_ = remainingIncrementableScore;
  for (let i = 0; i < (query.times !== undefined ? query.times : 1); i++) {
    diffs.push({
      kind: "score",
      actual:
        remainingIncrementableScore_ !== undefined
          ? Math.min(score, remainingIncrementableScore_)
          : score,
      max: score,
    });
    if (remainingIncrementableScore_ !== undefined) {
      remainingIncrementableScore_ -= score;
      remainingIncrementableScore_ = Math.max(remainingIncrementableScore_, 0);
    }
  }
  return diffs;
};

/**
 * 好印象によるスコア増加の計算をする
 */
export const calculatePositiveImpressionScore = (
  modifiers: Modifier[],
  remainingIncrementableScore: number | undefined,
): Extract<LessonUpdateQueryDiff, { kind: "score" }> => {
  const positiveImpression = modifiers.find(
    (e) => e.kind === "positiveImpression",
  );
  const positiveImpressionAmount =
    positiveImpression && "amount" in positiveImpression
      ? positiveImpression.amount
      : 0;
  const hasMightyPerformance =
    modifiers.find((e) => e.kind === "mightyPerformance") !== undefined;
  const score = Math.ceil(
    positiveImpressionAmount * (hasMightyPerformance ? 1.5 : 1.0),
  );
  return {
    kind: "score",
    actual:
      remainingIncrementableScore !== undefined
        ? Math.min(score, remainingIncrementableScore)
        : score,
    max: score,
  };
};

export const calculatePerformingVitalityEffect = (
  idol: Idol,
  query: VitalityUpdateQuery,
): Extract<LessonUpdateQueryDiff, { kind: "vitality" }> => {
  const hasNoVitalityIncrease =
    idol.modifiers.find((e) => e.kind === "noVitalityIncrease") !== undefined;
  if (hasNoVitalityIncrease) {
    return {
      kind: "vitality",
      actual: 0,
      max: 0,
    };
  }
  if (query.fixedValue === true) {
    return {
      kind: "vitality",
      actual: query.value,
      max: query.value,
    };
  }
  const motivation = idol.modifiers.find((e) => e.kind === "motivation");
  const motivationAmount =
    motivation && "amount" in motivation ? motivation.amount : 0;
  const value =
    query.value +
    motivationAmount +
    (query.boostPerCardUsed !== undefined
      ? idol.totalCardUsageCount * query.boostPerCardUsed
      : 0);
  return {
    kind: "vitality",
    actual: value,
    max: value,
  };
};

/**
 * 効果を計算して更新差分リストを返す
 *
 * @return 効果適用条件を満たさない場合は undefined を返す、結果的に効果がなかった場合は空配列を返す
 */
const activateEffect = (
  lesson: Lesson,
  effect: Effect,
  getRandom: GetRandom,
  idGenerator: IdGenerator,
): LessonUpdateQueryDiff[] | undefined => {
  let remainingIncrementableScore: number | undefined;
  if (lesson.clearScoreThresholds !== undefined) {
    const progress = calculateClearScoreProgress(
      lesson.score,
      lesson.clearScoreThresholds,
    );
    if (progress.remainingPerfectScore !== undefined) {
      remainingIncrementableScore = progress.remainingPerfectScore;
    }
  }

  let diffs: LessonUpdateQueryDiff[] = [];

  //
  // 効果別の適用条件判定
  //
  if (effect.condition) {
    if (!canApplyEffect(lesson, effect.condition)) {
      return undefined;
    }
  }

  const effectKind = effect.kind;
  switch (effectKind) {
    // 現在は、Pアイテムの「私の「初」の楽譜」にのみ存在し、スキルカードには存在しない効果
    case "drainLife": {
      diffs.push({
        kind: "life",
        actual: Math.max(-effect.value, -lesson.idol.life),
        max: -effect.value,
      });
      break;
    }
    case "drawCards": {
      const { deck, deckRebuilt, discardPile, drawnCards } = drawCardsFromDeck(
        lesson.deck,
        effect.amount,
        lesson.discardPile,
        getRandom,
      );
      const { hand, discardPile: discardPile2 } = addCardsToHandOrDiscardPile(
        drawnCards,
        lesson.hand,
        discardPile,
      );
      if (deckRebuilt) {
        diffs.push({
          kind: "playedCardsOnEmptyDeck",
          cardIds: [],
        });
      }
      diffs.push(
        createCardPlacementDiff(
          {
            deck: lesson.deck,
            discardPile: lesson.discardPile,
            hand: lesson.hand,
          },
          {
            deck,
            discardPile: discardPile2,
            hand,
          },
        ),
      );
      break;
    }
    case "enhanceHand": {
      diffs.push({
        kind: "cardEnhancement",
        // 手札の中で強化されていないスキルカードのみを対象にする
        cardIds: lesson.hand.filter((id) => {
          const card = lesson.cards.find((card) => card.id === id);
          // この分岐に入ることはない想定、型ガード用
          if (!card) {
            return false;
          }
          return (
            card.enhancements.find(
              (e) => e.kind === "original" || e.kind === "effect",
            ) === undefined
          );
        }),
      });
      break;
    }
    case "exchangeHand": {
      const discardPile1 = [...lesson.discardPile, ...lesson.hand];
      const {
        deck,
        deckRebuilt,
        discardPile: discardPile2,
        drawnCards,
      } = drawCardsFromDeck(
        lesson.deck,
        lesson.hand.length,
        discardPile1,
        getRandom,
      );
      const { hand, discardPile: discardPile3 } = addCardsToHandOrDiscardPile(
        drawnCards,
        [],
        discardPile2,
      );
      if (deckRebuilt) {
        diffs.push({
          kind: "playedCardsOnEmptyDeck",
          cardIds: [],
        });
      }
      diffs.push(
        createCardPlacementDiff(
          {
            deck: lesson.deck,
            discardPile: lesson.discardPile,
            hand: lesson.hand,
          },
          {
            deck,
            discardPile: discardPile3,
            hand,
          },
        ),
      );
      break;
    }
    case "generateCard": {
      const candidates = filterGeneratableCardsData(
        lesson.idol.original.definition.producePlan.kind,
      );
      const cardDefinition = candidates[getRandom() * candidates.length];
      const cardInProduction: CardInProduction = {
        id: idGenerator(),
        definition: cardDefinition,
        enabled: true,
        enhanced: true,
      };
      const card: Card = prepareCardsForLesson([cardInProduction])[0];
      const { hand, discardPile } = addCardsToHandOrDiscardPile(
        [card.id],
        lesson.hand,
        lesson.discardPile,
      );
      diffs.push({
        kind: "cards",
        cards: [...lesson.cards, card],
      });
      diffs.push(
        createCardPlacementDiff(
          { hand: lesson.hand, discardPile: lesson.discardPile },
          { hand, discardPile },
        ),
      );
      break;
    }
    case "getModifier": {
      const id = idGenerator();
      const sameKindModifier = lesson.idol.modifiers.find(
        (e) => e.kind === effect.modifier.kind,
      );
      const isUpdate =
        sameKindModifier !== undefined &&
        effect.modifier.kind !== "delayedEffect" &&
        effect.modifier.kind !== "doubleEffect" &&
        effect.modifier.kind !== "effectActivationAtEndOfTurn" &&
        effect.modifier.kind !== "effectActivationUponCardUsage";
      diffs.push({
        kind: "modifier",
        actual: {
          ...effect.modifier,
          id,
          ...(isUpdate ? { updateTargetId: sameKindModifier.id } : {}),
        },
        max: {
          ...effect.modifier,
          id,
          ...(isUpdate ? { updateTargetId: sameKindModifier.id } : {}),
        },
      });
      break;
    }
    case "increaseRemainingTurns": {
      diffs.push({
        kind: "remainingTurns",
        amount: effect.amount,
      });
      break;
    }
    case "multiplyModifier": {
      const modifier = lesson.idol.modifiers.find(
        (e) => e.kind === effect.modifierKind,
      );
      // 現在は、好印象に対してしか存在しない効果なので、そのこと前提で実装している
      if (modifier?.kind === "positiveImpression") {
        const amount =
          Math.ceil(modifier.amount * effect.multiplier) - modifier.amount;
        const id = idGenerator();
        diffs.push({
          kind: "modifier",
          actual: {
            kind: "positiveImpression",
            amount,
            id,
            updateTargetId: modifier.id,
          },
          max: {
            kind: "positiveImpression",
            amount,
            id,
            updateTargetId: modifier.id,
          },
        });
      }
      break;
    }
    case "perform": {
      if (effect.score) {
        diffs = [
          ...diffs,
          ...calculatePerformingScoreEffect(
            lesson.idol,
            remainingIncrementableScore,
            effect.score,
          ),
        ];
      }
      if (effect.vitality) {
        diffs = [
          ...diffs,
          calculatePerformingVitalityEffect(lesson.idol, effect.vitality),
        ];
      }
      break;
    }
    case "performLeveragingModifier": {
      let score = 0;
      const modifierKind = effect.modifierKind;
      switch (modifierKind) {
        case "motivation": {
          const motivation = lesson.idol.modifiers.find(
            (e) => e.kind === "motivation",
          );
          const motivationAmount =
            motivation && "amount" in motivation ? motivation.amount : 0;
          score = Math.ceil((motivationAmount * effect.percentage) / 100);
          break;
        }
        case "positiveImpression": {
          const positiveImpression = lesson.idol.modifiers.find(
            (e) => e.kind === "positiveImpression",
          );
          const positiveImpressionAmount =
            positiveImpression && "amount" in positiveImpression
              ? positiveImpression.amount
              : 0;
          score = Math.ceil(
            (positiveImpressionAmount * effect.percentage) / 100,
          );
          break;
        }
        default: {
          const unreachable: never = modifierKind;
          throw new Error(`Unreachable statement`);
        }
      }
      diffs.push({
        kind: "score",
        actual:
          remainingIncrementableScore !== undefined
            ? Math.min(score, remainingIncrementableScore)
            : score,
        max: score,
      });
      break;
    }
    case "performLeveragingVitality": {
      // 本家のインタラクションや効果説明上、先に元気を減少させる
      if (effect.reductionKind !== undefined) {
        const reductionRate = effect.reductionKind === "zero" ? 1.0 : 0.5;
        const value = Math.floor(lesson.idol.vitality * reductionRate);
        diffs.push({
          kind: "vitality",
          actual: -value,
          max: -value,
        });
      }
      const score = Math.ceil((lesson.idol.vitality * effect.percentage) / 100);
      diffs.push({
        kind: "score",
        actual:
          remainingIncrementableScore !== undefined
            ? Math.min(score, remainingIncrementableScore)
            : score,
        max: score,
      });
      break;
    }
    case "recoverLife": {
      diffs.push({
        kind: "life",
        actual: Math.min(
          effect.value,
          lesson.idol.original.maxLife - lesson.idol.life,
        ),
        max: effect.value,
      });
      break;
    }
    default: {
      const unreachable: never = effectKind;
      throw new Error(`Unreachable statement`);
    }
  }
  return diffs;
};

const activateDelayedEffectModifier = (
  lesson: Lesson,
  modifier: Extract<Modifier, { kind: "delayedEffect" }>,
  getRandom: GetRandom,
  idGenerator: IdGenerator,
): LessonUpdateQueryDiff[] => {
  if (modifier.id === undefined) {
    throw new Error(`modifier.id is undefined: ${modifier}`);
  }
  let diffs: LessonUpdateQueryDiff[] = [];
  if (modifier.delay === 1) {
    const effectResult = activateEffect(
      lesson,
      modifier.effect,
      getRandom,
      idGenerator,
    );
    if (effectResult) {
      diffs = [...diffs, ...effectResult];
    }
  }
  const id = idGenerator();
  diffs = [
    ...diffs,
    {
      kind: "modifier",
      actual: {
        ...modifier,
        delay: -1,
        id,
        updateTargetId: modifier.id,
      },
      max: {
        ...modifier,
        delay: -1,
        id,
        updateTargetId: modifier.id,
      },
    },
  ];
  return diffs;
};

/**
 * 効果発動結果リスト
 *
 * - 配列のインデックスは、実行した効果リストのインデックスに対応する
 * - undefined は、効果適用条件を満たさなかったもの
 */
type EffectActivations = Array<LessonUpdateQueryDiff[] | undefined>;

/**
 * 効果リストを発動をして、効果発動結果リストを返す
 *
 * - 1スキルカードや1Pアイテムが持つ効果リストに対して使う
 * - 本処理内では、レッスンその他の状況は変わらない前提
 *   - 「お嬢様の晴れ舞台」で、最初に加算される元気は、その後のパラメータ上昇の計算には含まれていない、などのことから
 */
const activateEffects = (
  lesson: Lesson,
  effects: Effect[],
  getRandom: GetRandom,
  idGenerator: IdGenerator,
): EffectActivations => {
  let effectActivations: EffectActivations = [];
  for (const effect of effects) {
    const activation = activateEffect(lesson, effect, getRandom, idGenerator);
    effectActivations = [...effectActivations, activation];
  }
  return effectActivations;
};

/**
 * 手札としてスキルカードを表示するために、スキルカード情報を要約する
 */
export const summarizeCardInHand = (
  lesson: Lesson,
  cardId: Card["id"],
  getRandom: GetRandom,
  idGenerator: IdGenerator,
): CardInHandSummary => {
  const card = lesson.cards.find((card) => card.id === cardId);
  if (!card) {
    throw new Error(`Card not found in cards: cardId=${cardId}`);
  }
  const cardContent = getCardContentDefinition(card);
  const effectActivations = activateEffects(
    lesson,
    cardContent.effects,
    getRandom,
    idGenerator,
  );
  const effectDiffs = effectActivations.reduce<LessonUpdateQueryDiff[]>(
    (acc, effectActivation) =>
      effectActivation ? [...acc, ...effectActivation] : acc,
    [],
  );
  let scores: CardInHandSummary["scores"] = [];
  for (const effectActivation of effectActivations) {
    if (effectActivation) {
      if (effectActivation.length > 0 && effectActivation[0].kind === "score") {
        scores = [
          ...scores,
          {
            value: effectActivation[0].max,
            // 1回の効果発動で複数回スコアが上がる時は、全てのスコアの値は同じになる前提
            times: effectActivation.length,
          },
        ];
      }
    }
  }
  let vitality: CardInHandSummary["vitality"] = undefined;
  const firstVitalityUpdate = effectDiffs.find((e) => e.kind === "vitality");
  if (firstVitalityUpdate) {
    vitality = firstVitalityUpdate.max;
  }
  let effects: CardInHandSummary["effects"] = [];
  for (const [effectIndex, effect] of cardContent.effects.entries()) {
    const applyable = effectActivations[effectIndex] !== undefined;
    if (effect.kind === "getModifier") {
      effects = [
        ...effects,
        {
          kind: `modifier-${effect.modifier.kind}`,
          applyable,
        },
      ];
    } else if (effect.kind === "perform") {
      if (effect.condition) {
        if (effect.score) {
          effects = [
            ...effects,
            {
              kind: "perform-score",
              applyable,
            },
          ];
        } else if (effect.vitality) {
          effects = [
            ...effects,
            {
              kind: "perform-vitality",
              applyable,
            },
          ];
        }
      }
    } else {
      effects = [
        ...effects,
        {
          kind: effect.kind,
          applyable,
        },
      ];
    }
  }
  return {
    cost: calculateActualActionCost(cardContent.cost, lesson.idol.modifiers),
    effects,
    enhancements: card.enhancements,
    name: card.original.definition.name + "+".repeat(card.enhancements.length),
    playable: canUseCard(lesson, cardContent.cost, cardContent.condition),
    scores,
    vitality,
  };
};

/**
 * レッスンの状態を更新する関数が返す結果
 */
type LessonMutationResult = {
  nextHistoryResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"];
  updates: LessonUpdateQuery[];
};

/**
 * レッスン開始時に効果を発動する
 */
export const activateEffectsOnLessonStart = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    getRandom: GetRandom;
    idGenerator: IdGenerator;
  },
): LessonMutationResult => {
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  //
  // TODO: Pアイテムによるレッスン開始時の効果発動
  //
  // - 「レッスン開始時手札に入る」は、ターン開始時の手札を引く処理に関連するので、ここでは処理しない
  //

  return {
    updates: [],
    nextHistoryResultIndex,
  };
};

/**
 * ターン開始時のPアイテムの効果を発動する
 */
export const activateProducerItemEffectsOnTurnStart = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    getRandom: GetRandom;
    idGenerator: IdGenerator;
  },
): LessonMutationResult => {
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  //
  // ターン開始時の効果発動
  //
  let turnStartUpdates: LessonUpdateQuery[] = [];
  for (const producerItem of newLesson.producerItems) {
    const producerItemContent = getProducerItemContentDefinition(producerItem);
    if (
      producerItemContent.trigger.kind === "turnStart" &&
      canActivateProducerItem(newLesson, producerItem)
    ) {
      let innerUpdates: LessonUpdateQuery[] = [];
      for (const effect of producerItemContent.effects) {
        const diffs = activateEffect(
          newLesson,
          effect,
          params.getRandom,
          params.idGenerator,
        );
        if (diffs) {
          innerUpdates = diffs.map((diff) =>
            createLessonUpdateQueryFromDiff(diff, {
              kind: "turnStartTrigger",
              historyTurnNumber: lesson.turnNumber,
              historyResultIndex: nextHistoryResultIndex,
            }),
          );
        }
      }
      newLesson = patchUpdates(newLesson, innerUpdates);
      turnStartUpdates = [...turnStartUpdates, ...innerUpdates];
    }
  }
  if (turnStartUpdates.length > 0) {
    nextHistoryResultIndex++;
  }

  //
  // 2ターンごとターン開始時の効果発動
  //
  let turnStartEveryTwoTurnsUpdates: LessonUpdateQuery[] = [];
  for (const producerItem of newLesson.producerItems) {
    const producerItemContent = getProducerItemContentDefinition(producerItem);
    if (
      producerItemContent.trigger.kind === "turnStartEveryTwoTurns" &&
      newLesson.turnNumber >= 2 &&
      newLesson.turnNumber % 2 === 0 &&
      canActivateProducerItem(newLesson, producerItem)
    ) {
      let innerUpdates: LessonUpdateQuery[] = [];
      for (const effect of producerItemContent.effects) {
        const diffs = activateEffect(
          newLesson,
          effect,
          params.getRandom,
          params.idGenerator,
        );
        if (diffs) {
          innerUpdates = diffs.map((diff) =>
            createLessonUpdateQueryFromDiff(diff, {
              kind: "turnStartTrigger",
              historyTurnNumber: lesson.turnNumber,
              historyResultIndex: nextHistoryResultIndex,
            }),
          );
        }
      }
      newLesson = patchUpdates(newLesson, innerUpdates);
      turnStartEveryTwoTurnsUpdates = [
        ...turnStartEveryTwoTurnsUpdates,
        ...innerUpdates,
      ];
    }
  }
  if (turnStartEveryTwoTurnsUpdates.length > 0) {
    nextHistoryResultIndex++;
  }

  return {
    updates: [...turnStartUpdates, ...turnStartEveryTwoTurnsUpdates],
    nextHistoryResultIndex,
  };
};

/**
 * ターン開始時の効果を発動する
 */
export const activateModifierEffectsOnTurnStart = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    getRandom: GetRandom;
    idGenerator: IdGenerator;
  },
): LessonMutationResult => {
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  //
  // 「(次ターン|nターン後)、パラメータ+n」による効果発動
  //
  // - 実装上、元気更新も実行できるが、本家にその効果は存在しない
  // - TODO: [仕様確認] スキルパーフェクトを達成した場合に、後続処理は処理されるのか
  //
  let performDelayedEffectUpdates: LessonUpdateQuery[] = [];
  for (const modifier of newLesson.idol.modifiers) {
    if (
      isDelayedEffectModifierType(modifier) &&
      isPerformEffectType(modifier.effect)
    ) {
      const innerUpdates = activateDelayedEffectModifier(
        newLesson,
        modifier,
        params.getRandom,
        params.idGenerator,
      ).map((diff) =>
        createLessonUpdateQueryFromDiff(diff, {
          kind: "turnStartTrigger",
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex,
        }),
      );
      newLesson = patchUpdates(newLesson, innerUpdates);
      performDelayedEffectUpdates = [
        ...performDelayedEffectUpdates,
        ...innerUpdates,
      ];
    }
  }
  if (performDelayedEffectUpdates.length > 0) {
    nextHistoryResultIndex++;
  }

  //
  // 状態修正の「(次ターン|nターン後)、スキルカードを引く」による効果発動
  //
  let drawCardDelayedEffectUpdates: LessonUpdateQuery[] = [];
  for (const modifier of newLesson.idol.modifiers) {
    if (
      isDelayedEffectModifierType(modifier) &&
      isDrawCardsEffectType(modifier.effect)
    ) {
      const innerUpdates = activateDelayedEffectModifier(
        newLesson,
        modifier,
        params.getRandom,
        params.idGenerator,
      ).map((diff) =>
        createLessonUpdateQueryFromDiff(diff, {
          kind: "turnStartTrigger",
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex,
        }),
      );
      newLesson = patchUpdates(newLesson, innerUpdates);
      drawCardDelayedEffectUpdates = [
        ...drawCardDelayedEffectUpdates,
        ...innerUpdates,
      ];
    }
  }
  if (drawCardDelayedEffectUpdates.length > 0) {
    nextHistoryResultIndex++;
  }

  //
  // 状態修正の「(次ターン|nターン後)、スキルカードを強化」による効果発動
  //
  let enhanceHandDelayedEffectUpdates: LessonUpdateQuery[] = [];
  for (const modifier of newLesson.idol.modifiers) {
    if (
      isDelayedEffectModifierType(modifier) &&
      isEnhanceHandEffectType(modifier.effect)
    ) {
      const innerUpdates = activateDelayedEffectModifier(
        newLesson,
        modifier,
        params.getRandom,
        params.idGenerator,
      ).map((diff) =>
        createLessonUpdateQueryFromDiff(diff, {
          kind: "turnStartTrigger",
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex,
        }),
      );
      newLesson = patchUpdates(newLesson, innerUpdates);
      enhanceHandDelayedEffectUpdates = [
        ...enhanceHandDelayedEffectUpdates,
        ...innerUpdates,
      ];
    }
  }
  if (enhanceHandDelayedEffectUpdates.length > 0) {
    nextHistoryResultIndex++;
  }

  return {
    updates: [
      ...performDelayedEffectUpdates,
      ...drawCardDelayedEffectUpdates,
      ...enhanceHandDelayedEffectUpdates,
    ],
    nextHistoryResultIndex,
  };
};

/**
 * ターン開始時に手札を引く
 */
export const drawCardsOnTurnStart = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    getRandom: GetRandom;
  },
): LessonMutationResult => {
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  //
  // 「レッスン開始時手札に入る」のスキルカードを引く
  //
  // - TODO: [仕様確認] レッスン開始時手札が6枚あるとき、6枚目以降は山札に残るのか捨札に行くのか？今は捨札へ移動している。
  //
  let drawInnateCardsUpdates: LessonUpdateQuery[] = [];
  let remainingDrawCount = handSizeOnLessonStart;
  if (newLesson.turnNumber === 1) {
    let deck: Array<Card["id"]> = [];
    let innateCardIds: Array<Card["id"]> = [];
    for (const deckCardId of newLesson.deck) {
      const card = newLesson.cards.find((card) => card.id === deckCardId);
      if (!card) {
        throw new Error(`Card not found in cards: cardId=${deckCardId}`);
      }
      if (getCardContentDefinition(card).innate) {
        innateCardIds = [...innateCardIds, deckCardId];
      } else {
        deck = [...deck, deckCardId];
      }
    }
    if (innateCardIds.length > 0) {
      remainingDrawCount = Math.max(
        0,
        remainingDrawCount - innateCardIds.length,
      );
      const drawnCards = innateCardIds.slice(0, maxHandSize);
      const discardPile = [
        ...newLesson.discardPile,
        ...innateCardIds.slice(maxHandSize),
      ];
      const { hand, discardPile: discardPile2 } = addCardsToHandOrDiscardPile(
        drawnCards,
        newLesson.hand,
        discardPile,
      );
      drawInnateCardsUpdates = [
        {
          ...createCardPlacementDiff(
            {
              deck: newLesson.deck,
              discardPile: newLesson.discardPile,
              hand: newLesson.hand,
            },
            {
              deck,
              discardPile: discardPile2,
              hand,
            },
          ),
          reason: {
            kind: "turnStartTrigger",
            historyTurnNumber: newLesson.turnNumber,
            historyResultIndex,
          },
        },
      ];
      newLesson = patchUpdates(newLesson, drawInnateCardsUpdates);
      nextHistoryResultIndex++;
    }
  }

  //
  // 捨札から、山札0枚時に捨札になったスキルカードを一時取り出す
  //
  // - 山札の再構築時の候補から外すため
  // - 山札0枚時の特殊仕様によるもの、詳細は Lesson["playedCardsOnEmptyDeck"] を参照
  //
  const playedCardsOnEmptyDeck = newLesson.playedCardsOnEmptyDeck;
  let playedCardsOnEmptyDeckUpdates: LessonUpdateQuery[] = [];
  if (playedCardsOnEmptyDeck.length > 0) {
    // 必ず、山札は0枚のはず
    if (newLesson.deck.length > 0) {
      throw new Error(
        `Unexpected state: deck is not empty: ${newLesson.deck.length}`,
      );
    }
    playedCardsOnEmptyDeckUpdates = [
      {
        kind: "cardPlacement",
        discardPile: newLesson.discardPile.filter(
          (e) => !playedCardsOnEmptyDeck.includes(e),
        ),
        reason: {
          kind: "turnStartTrigger",
          historyTurnNumber: newLesson.turnNumber,
          historyResultIndex,
        },
      },
    ];
    newLesson = patchUpdates(newLesson, playedCardsOnEmptyDeckUpdates);
    nextHistoryResultIndex++;
  }

  //
  // 手札を引く
  //
  let drawCardsInHandUpdates: LessonUpdateQuery[] = [];
  if (remainingDrawCount > 0) {
    const effectResult = activateEffect(
      newLesson,
      { kind: "drawCards", amount: remainingDrawCount },
      params.getRandom,
      // "drawCards" に限れば idGenerator は使われない
      () => "",
    );
    drawCardsInHandUpdates = (effectResult ?? []).map((diff) =>
      createLessonUpdateQueryFromDiff(diff, {
        kind: "turnStartTrigger",
        historyTurnNumber: newLesson.turnNumber,
        historyResultIndex,
      }),
    );
    newLesson = patchUpdates(newLesson, drawCardsInHandUpdates);
    nextHistoryResultIndex++;
  }

  //
  // 先に捨札から取り出した、山札0枚時に捨札になったスキルカードを捨札へ戻す
  //
  let restoringPlayedCardsOnEmptyDeckUpdates: LessonUpdateQuery[] = [];
  if (playedCardsOnEmptyDeck.length > 0) {
    // 必ず、山札は再構築されているはずなので、捨札は空のはず
    if (newLesson.discardPile.length > 0) {
      throw new Error(
        `Unexpected state: discardPile is not empty: ${newLesson.discardPile.length}`,
      );
    }
    // 必ず、"drawCards"の中で山札が再構築されているはずなので、その中でこの値は初期化されているはず
    if (newLesson.playedCardsOnEmptyDeck.length > 0) {
      throw new Error(
        `Unexpected state: playedCardsOnEmptyDeck is not empty: ${newLesson.discardPile.length}`,
      );
    }
    restoringPlayedCardsOnEmptyDeckUpdates = [
      {
        kind: "cardPlacement",
        discardPile: playedCardsOnEmptyDeck,
        reason: {
          kind: "turnStartTrigger",
          historyTurnNumber: newLesson.turnNumber,
          historyResultIndex,
        },
      },
    ];
    newLesson = patchUpdates(newLesson, restoringPlayedCardsOnEmptyDeckUpdates);
    nextHistoryResultIndex++;
  }

  return {
    updates: [
      ...drawInnateCardsUpdates,
      ...playedCardsOnEmptyDeckUpdates,
      ...drawCardsInHandUpdates,
      ...restoringPlayedCardsOnEmptyDeckUpdates,
    ],
    nextHistoryResultIndex,
  };
};

/**
 * ターン経過に伴って状態修正の効果時間を減少する
 */
export const decreaseEachModifierDurationOverTime = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    idGenerator: IdGenerator;
  },
): LessonMutationResult => {
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  let modifierUpdates: LessonUpdateQuery[] = [];
  for (const modifierId of newLesson.idol.modifierIdsAtTurnStart) {
    const modifier = newLesson.idol.modifiers.find((e) => e.id === modifierId);
    const reason = {
      kind: "turnStartTrigger",
      historyTurnNumber: lesson.turnNumber,
      historyResultIndex: nextHistoryResultIndex,
    } as const;
    if (modifier) {
      switch (modifier.kind) {
        case "goodCondition":
        case "doubleLifeConsumption":
        case "excellentCondition":
        case "halfLifeConsumption":
        case "mightyPerformance":
        case "noVitalityIncrease": {
          const change = {
            kind: modifier.kind,
            duration: -1,
            id: params.idGenerator(),
            updateTargetId: modifier.id,
          };
          modifierUpdates = [
            ...modifierUpdates,
            {
              kind: "modifier",
              actual: change,
              max: change,
              reason,
            },
          ];
          break;
        }
        case "positiveImpression": {
          const change = {
            kind: modifier.kind,
            amount: -1,
            id: params.idGenerator(),
            updateTargetId: modifier.id,
          };
          modifierUpdates = [
            ...modifierUpdates,
            {
              kind: "modifier",
              actual: change,
              max: change,
              reason,
            },
          ];
          break;
        }
      }
    }
  }
  newLesson = patchUpdates(newLesson, modifierUpdates);
  nextHistoryResultIndex++;

  return {
    updates: [...modifierUpdates],
    nextHistoryResultIndex,
  };
};

/**
 * スキルカード使用数を1消費する
 *
 * - 「スキルカード使用数追加」を先に消費し、それがなければアクションポイントを消費する
 * - 足りない状況で実行したら、0を返す
 */
export const consumeRemainingCardUsageCount = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    idGenerator: IdGenerator;
  },
): LessonMutationResult => {
  const additionalCardUsageCount = lesson.idol.modifiers.find(
    (e) => e.kind === "additionalCardUsageCount",
  );
  let diff: LessonUpdateQueryDiff | undefined;
  if (additionalCardUsageCount) {
    const id = params.idGenerator();
    diff = {
      kind: "modifier",
      actual: {
        kind: "additionalCardUsageCount",
        amount: -1,
        id: params.idGenerator(),
        updateTargetId: additionalCardUsageCount.id,
      },
      max: {
        kind: "additionalCardUsageCount",
        amount: -1,
        id: params.idGenerator(),
        updateTargetId: additionalCardUsageCount.id,
      },
    };
  } else {
    diff = {
      kind: "actionPoints",
      amount: Math.max(-1, -lesson.idol.actionPoints) + 0,
    };
  }
  return {
    updates: [
      {
        ...diff,
        reason: {
          kind: "cardUsage.remainingCardUsageCountConsumption",
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex,
        },
      },
    ],
    nextHistoryResultIndex: historyResultIndex + 1,
  };
};

/**
 * スキルカードを使用する
 *
 * - TODO: [仕様確認] 主効果発動によりスコアパーフェクトを達成した後、スキルカード使用がトリガーの追加効果発動は発動されるか？
 *         - 例えば、「願いの力」「曇りをぬぐったタオル」など
 *         - 多分されそうな気がする
 */
export const useCard = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    getRandom: GetRandom;
    idGenerator: IdGenerator;
    preview: boolean;
    selectedCardInHandIndex: number;
  },
): LessonMutationResult => {
  const cardId = lesson.hand[params.selectedCardInHandIndex];
  if (cardId === undefined) {
    throw new Error(
      `Card not found in hand: selectedCardInHandIndex=${params.selectedCardInHandIndex}`,
    );
  }
  const card = lesson.cards.find((card) => card.id === cardId);
  if (card === undefined) {
    throw new Error(`Card not found in cards: cardId=${cardId}`);
  }
  const cardContent = getCardContentDefinition(card);
  const doubleEffect = lesson.idol.modifiers.find(
    (e) => e.kind === "doubleEffect",
  );
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  //
  // 使用可否のバリデーション
  //
  // - 本関数は、使用条件を満たさないスキルカードに対しては使えない前提
  //
  if (
    !params.preview &&
    !canUseCard(lesson, cardContent.cost, cardContent.condition)
  ) {
    throw new Error(`Can not use the card: ${card.original.definition.name}`);
  }

  //
  // 使用した手札を捨札などへ移動
  //
  // - 基本的には、「レッスン中1回」がないものは捨札、あるものは除外へ移動する
  // - しかし、山札0枚時の特殊仕様を考慮する必要がある、詳細は Lesson["playedCardsOnEmptyDeck"] を参照
  //
  let usedCardPlacementUpdates: LessonUpdateQuery[] = [];
  if (!params.preview) {
    const reason = {
      kind: "cardUsage",
      cardId,
      historyTurnNumber: newLesson.turnNumber,
      historyResultIndex: nextHistoryResultIndex,
    } as const;
    usedCardPlacementUpdates = [
      {
        ...createCardPlacementDiff(
          {
            hand: lesson.hand,
            discardPile: lesson.discardPile,
            removedCardPile: lesson.removedCardPile,
          },
          {
            hand: newLesson.hand.filter((id) => id !== cardId),
            ...(cardContent.usableOncePerLesson
              ? { removedCardPile: [...newLesson.removedCardPile, cardId] }
              : { discardPile: [...newLesson.discardPile, cardId] }),
          },
        ),
        reason,
      },
    ];
    if (newLesson.deck.length === 0 && !cardContent.usableOncePerLesson) {
      usedCardPlacementUpdates = [
        ...usedCardPlacementUpdates,
        {
          kind: "playedCardsOnEmptyDeck",
          cardIds: [...newLesson.playedCardsOnEmptyDeck, cardId],
          reason,
        },
      ];
    }
    newLesson = patchUpdates(newLesson, usedCardPlacementUpdates);
    nextHistoryResultIndex++;
  }

  //
  // コスト消費
  //
  const costConsumptionUpdates: LessonUpdateQuery[] = calculateCostConsumption(
    newLesson.idol,
    calculateActualActionCost(cardContent.cost, newLesson.idol.modifiers),
    params.idGenerator,
  ).map((diff) => ({
    ...diff,
    reason: {
      kind: "cardUsage",
      cardId: card.id,
      historyTurnNumber: newLesson.turnNumber,
      historyResultIndex: nextHistoryResultIndex,
    },
  }));
  newLesson = patchUpdates(newLesson, costConsumptionUpdates);
  nextHistoryResultIndex++;

  //
  // 副作用を含む効果発動を1-2回行う
  //
  let effectActivationUpdates: LessonUpdateQuery[] = [];
  for (let times = 1; times <= (doubleEffect ? 2 : 1); times++) {
    let effectActivationUpdatesOnce: LessonUpdateQuery[] = [];

    //
    // 状態修正に起因する、スキルカード使用毎の効果発動
    //
    // - 「ファンシーチャーム」で確認したところ、スキルカードの主効果発動の前に作用していた
    //
    if (!params.preview) {
      const effectsUponCardUsage = newLesson.idol.modifiers.filter(
        (e) =>
          e.kind === "effectActivationUponCardUsage" &&
          e.cardKind === card.original.definition.cardSummaryKind,
      ) as Array<Extract<Modifier, { kind: "effectActivationUponCardUsage" }>>;
      for (const { effect } of effectsUponCardUsage) {
        const effectResult = activateEffect(
          newLesson,
          effect,
          params.getRandom,
          params.idGenerator,
        );
        effectActivationUpdatesOnce = [
          ...effectActivationUpdatesOnce,
          ...(effectResult ?? []).map((diff) =>
            createLessonUpdateQueryFromDiff(diff, {
              kind: "cardUsageTrigger",
              cardId: card.id,
              historyTurnNumber: newLesson.turnNumber,
              historyResultIndex: nextHistoryResultIndex,
            }),
          ),
        ];
      }
    }

    //
    // TODO: Pアイテムに起因する、スキルカード使用毎の効果発動
    //       - スキルカード使用がトリガーのものと、スキルカード使用による状態修正がトリガーのものがある
    //
    // - 「満開ペアヘアピン」で確認したところ、スキルカードの主効果発動の前に作用していた
    //

    //
    // 主効果発動
    //
    const mainEffectActivations = activateEffects(
      newLesson,
      // プレビュー時は、一部の効果は発動されていない
      cardContent.effects.filter(
        (effect) =>
          !params.preview ||
          !(
            effect.kind === "drawCards" ||
            effect.kind === "enhanceHand" ||
            effect.kind === "exchangeHand" ||
            effect.kind === "generateCard"
          ),
      ),
      params.getRandom,
      params.idGenerator,
    );
    for (const [
      effectIndex,
      effectActivation,
    ] of mainEffectActivations.entries()) {
      if (effectActivation) {
        effectActivationUpdatesOnce = [
          ...effectActivationUpdatesOnce,
          ...effectActivation.map((diff) =>
            createLessonUpdateQueryFromDiff(diff, {
              kind: "cardUsage.effectActivation",
              cardId: card.id,
              effectIndex,
              historyTurnNumber: newLesson.turnNumber,
              historyResultIndex: nextHistoryResultIndex,
            }),
          ),
        ];
      }
    }

    //
    // 「次に使用するスキルカードの効果をもう1回発動」の状態修正を消費
    //
    if (doubleEffect && times === 1) {
      const id = params.idGenerator();
      effectActivationUpdatesOnce = [
        ...effectActivationUpdatesOnce,
        createLessonUpdateQueryFromDiff(
          {
            kind: "modifier",
            actual: {
              kind: "doubleEffect",
              times: -1,
              id,
              updateTargetId: doubleEffect.id,
            },
            max: {
              kind: "doubleEffect",
              times: -1,
              id,
              updateTargetId: doubleEffect.id,
            },
          },
          {
            kind: "cardUsage",
            cardId: card.id,
            historyTurnNumber: newLesson.turnNumber,
            historyResultIndex: nextHistoryResultIndex,
          },
        ),
      ];
    }

    // 1回分のスキルカード使用に対する副作用を含んで完了してから、1ループに1回のみレッスンの状態を更新する
    // 例えば、「ファンシーチャーム」は「以降、メンタルスキルカード使用時、好印象+1」の効果だが、自身の使用によって発動はしないことを担保する必要がある
    newLesson = patchUpdates(newLesson, effectActivationUpdatesOnce);
    effectActivationUpdates = [
      ...effectActivationUpdates,
      ...effectActivationUpdatesOnce,
    ];
  }
  // スキルカード追加発動時は、スキルカード1枚分の結果の中に表示されている
  nextHistoryResultIndex++;

  //
  // スキルカード使用数追加が残っている場合、アクションポイントを1回復して消費する
  //
  // - 例えば、アクションポイントを消費して使ったスキルカードの効果で、スキルカード使用数追加が発生した時、最終的にそのスキルカード使用数追加が消費され、アクションポイントは残っている
  // - 上記の状況を、本家UIのスキルカード使用プレビューで見た時、スキルカード使用数追加へ+1の差分が出ているが、その合計数は0という不思議な表記になっている
  //   - なお、本実装において、UI側はこの状況が発生していることは直接レッスンから取得できず、 updates から解析してもらう必要がある
  // - スキルカード使用プレビューでこの状況を再現する必要があるので、本処理は useCard 内に含める必要がある
  //
  let recoveringActionPointsUpdates: LessonUpdateQuery[] = [];
  const additionalCardUsageCount = newLesson.idol.modifiers.find(
    (e) => e.kind === "additionalCardUsageCount",
  );
  if (newLesson.idol.actionPoints === 0 && additionalCardUsageCount) {
    const reason = {
      kind: "cardUsage",
      cardId: card.id,
      historyTurnNumber: newLesson.turnNumber,
      historyResultIndex: nextHistoryResultIndex,
    } as const;
    const modifierChange: Modifier = {
      kind: "additionalCardUsageCount",
      amount: -1,
      id: params.idGenerator(),
      updateTargetId: additionalCardUsageCount.id,
    };
    recoveringActionPointsUpdates = [
      {
        kind: "actionPoints",
        amount: 1,
        reason,
      },
      {
        kind: "modifier",
        actual: modifierChange,
        max: modifierChange,
        reason,
      },
    ];
    newLesson = patchUpdates(newLesson, recoveringActionPointsUpdates);
    nextHistoryResultIndex++;
  }

  return {
    nextHistoryResultIndex,
    updates: [
      ...usedCardPlacementUpdates,
      ...costConsumptionUpdates,
      ...effectActivationUpdates,
      ...recoveringActionPointsUpdates,
    ],
  };
};

/**
 * ターン終了時の各種効果を発動する
 *
 * - TODO: [仕様確認] それぞれの効果によりスコアパーフェクト条件を満たした時、後続処理が実行されるのか不明。現在存在する効果だと、ほぼこれで勝負が決まることはなさそうではある。
 */
export const activateEffectsOnTurnEnd = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    getRandom: GetRandom;
    idGenerator: IdGenerator;
  },
): LessonMutationResult => {
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  //
  // 状態修正による効果発動
  //
  // - TODO: [仕様確認] Pアイテムより先に発動しているか？
  //
  let modifierUpdates: LessonUpdateQuery[] = [];
  for (const modifier of newLesson.idol.modifiers) {
    let innerUpdates: LessonUpdateQuery[] = [];
    if (modifier.kind === "effectActivationAtEndOfTurn") {
      const diffs = activateEffect(
        newLesson,
        modifier.effect,
        params.getRandom,
        params.idGenerator,
      );
      if (diffs) {
        innerUpdates = diffs.map((diff) =>
          createLessonUpdateQueryFromDiff(diff, {
            kind: "turnEndTrigger",
            historyTurnNumber: lesson.turnNumber,
            historyResultIndex,
          }),
        );
      }
    }
    newLesson = patchUpdates(newLesson, innerUpdates);
    modifierUpdates = [...modifierUpdates, ...innerUpdates];
    if (isScoreSatisfyingPerfect(newLesson)) {
      break;
    }
  }
  if (modifierUpdates.length > 0) {
    nextHistoryResultIndex++;
  }

  //
  // TODO: Pアイテムによる効果発動、turnEnd
  //
  // - TODO: [仕様確認] Pアイテム内の発動順はどうなっている？
  //
  if (!isScoreSatisfyingPerfect(newLesson)) {
  }

  return {
    updates: [...modifierUpdates],
    nextHistoryResultIndex,
  };
};

/**
 * ターン終了時の好印象の発動によりスコアを獲得する
 */
export const obtainPositiveImpressionScoreOnTurnEnd = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
): LessonMutationResult => {
  let updates: LessonUpdateQuery[] = [];

  const hasPositiveImpression =
    lesson.idol.modifiers.find((e) => e.kind === "positiveImpression") !==
    undefined;
  if (hasPositiveImpression) {
    let remainingIncrementableScore: number | undefined = undefined;
    if (lesson.clearScoreThresholds !== undefined) {
      const progress = calculateClearScoreProgress(
        lesson.score,
        lesson.clearScoreThresholds,
      );
      if (progress.remainingPerfectScore !== undefined) {
        remainingIncrementableScore = progress.remainingPerfectScore;
      }
    }
    const diff = calculatePositiveImpressionScore(
      lesson.idol.modifiers,
      remainingIncrementableScore,
    );
    updates = [
      ...updates,
      createLessonUpdateQueryFromDiff(diff, {
        kind: "turnEndTrigger",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex,
      }),
    ];
  }

  return {
    nextHistoryResultIndex: historyResultIndex + 1,
    updates,
  };
};
