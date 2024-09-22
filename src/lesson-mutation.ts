import type {
  ActionCost,
  Card,
  CardUsageCondition,
  Effect,
  EffectCondition,
  EffectWithoutCondition,
  GetRandom,
  IdGenerator,
  Idol,
  Lesson,
  LessonUpdateQuery,
  LessonUpdateDiff,
  LessonUpdateQueryReason,
  MemoryEffect,
  Modifier,
  ModifierData,
  ProducerItem,
  VitalityUpdateQuery,
  MeasureValueConditionContent,
  ReactiveEffectTrigger,
  ReactiveEffectQuery,
  ReactiveEffectQueryWithoutIdolParameterKind,
} from "./types";
import {
  filterGeneratableCardsData,
  getCardDataByConstId,
  getCardDataById,
} from "./data/cards";
import { metaModifierDictioanry } from "./data/modifiers";
import {
  calculateModifierEffectedActionCost,
  calculateClearScoreProgress,
  createCurrentTurnDetails,
  getCardContentData,
  getIdolParameterKindOnTurn,
  getProducerItemContentData,
  findPrioritizedDoubleEffectModifier,
  isDelayedEffectModifierType,
  isDrawCardsEffectType,
  isEnhanceHandEffectType,
  isPerformEffectType,
  isRemainingProducerItemTimes,
  isScoreSatisfyingPerfect,
  maxHandSize,
  numberOfCardsToDrawAtTurnStart,
  patchDiffs,
  scanIncreasedModifierKinds,
  getIdolParameterKindOnTurnConsideringIgnoring,
} from "./models";
import { getRandomInteger, shuffleArray, validateNumberInRange } from "./utils";

/** 主に型都合のユーティリティ処理 */
const createLessonUpdateQueryFromDiff = (
  diff: LessonUpdateDiff,
  reason: LessonUpdateQueryReason,
): LessonUpdateQuery => ({ ...diff, reason });

/**
 * 山札から指定数のスキルカードを引く
 *
 * - 山札がなくなった場合は、捨札をシャッフルして、山札へ再構築する
 *   - 捨札も含めて足りない場合は、その数のカードは引けない
 *     - おそらく、本家にそのような状況は無いが、シミュレーターなので、各札がない時も考慮する
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
      if (newDiscardPile.length === 0) {
        deckRebuilt = true;
        break;
      } else {
        newDeck = shuffleArray(newDiscardPile, getRandom);
        newDiscardPile = [];
        deckRebuilt = true;
      }
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
): Extract<LessonUpdateDiff, { kind: "cardPlacement" }> => {
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
 *
 * - 現状、この判定が必要になるのは、スキルカード使用時のみである
 */
export const validateCostConsumution = (
  idol: Idol,
  cost: ActionCost,
): boolean => {
  const actualCost = calculateModifierEffectedActionCost(cost, idol.modifiers);
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

/**
 * 反応型効果のトリガーの要求を満たすかを検証する
 */
export const validateQueryOfReactiveEffectTrigger = (
  trigger: ReactiveEffectTrigger,
  query: ReactiveEffectQuery,
): boolean => {
  const idolParameterKindCondition =
    trigger.idolParameterKind === undefined ||
    query.idolParameterKind === undefined ||
    trigger.idolParameterKind === query.idolParameterKind;
  switch (trigger.kind) {
    case "afterCardEffectActivation":
    case "beforeCardEffectActivation": {
      if (
        query.kind === "beforeCardEffectActivation" ||
        query.kind === "afterCardEffectActivation"
      ) {
        const cardData = getCardDataById(query.cardDataId);
        const cardDataIdCondition =
          trigger.cardDataId === undefined ||
          trigger.cardDataId === query.cardDataId;
        const cardSummaryKindCondition =
          trigger.cardSummaryKind === undefined ||
          trigger.cardSummaryKind === cardData.cardSummaryKind;
        if (
          trigger.kind === "beforeCardEffectActivation" &&
          query.kind === "beforeCardEffectActivation"
        ) {
          return (
            cardSummaryKindCondition &&
            cardDataIdCondition &&
            idolParameterKindCondition
          );
        } else if (
          trigger.kind === "afterCardEffectActivation" &&
          query.kind === "afterCardEffectActivation"
        ) {
          const effectKindCondition =
            trigger.effectKind === undefined ||
            (trigger.effectKind === "vitality" &&
              query.diffs.some(
                (diff) => diff.kind === "vitality" && diff.max > 0,
              )) ||
            (trigger.effectKind === "positiveImpression" &&
              scanIncreasedModifierKinds(query.modifiers, query.diffs).includes(
                "positiveImpression",
              ));
          return (
            cardSummaryKindCondition &&
            cardDataIdCondition &&
            effectKindCondition &&
            idolParameterKindCondition
          );
        }
      }
      return false;
    }
    case "beforeCardEffectActivationEveryNTimes": {
      if (query.kind === "beforeCardEffectActivationEveryNTimes") {
        const cardData = getCardDataById(query.cardDataId);
        const cardSummaryKindCondition =
          trigger.cardSummaryKind === undefined ||
          trigger.cardSummaryKind === cardData.cardSummaryKind;
        const totalCardUsageCountCondition =
          query.totalCardUsageCount > 0 &&
          query.totalCardUsageCount % trigger.interval === 0;
        return (
          cardSummaryKindCondition &&
          idolParameterKindCondition &&
          totalCardUsageCountCondition
        );
      }
      return false;
    }
    case "lessonStart": {
      return query.kind === "lessonStart" && idolParameterKindCondition;
    }
    case "lifeDecrease": {
      if (query.kind === "lifeDecrease") {
        return (
          query.diffs.some((diff) => diff.kind === "life" && diff.actual < 0) &&
          idolParameterKindCondition
        );
      }
      return false;
    }
    case "modifierIncrease": {
      if (query.kind === "modifierIncrease") {
        const increasedModifierKinds = scanIncreasedModifierKinds(
          query.modifiers,
          query.diffs,
        );
        const modifierKindCondition = increasedModifierKinds.includes(
          trigger.modifierKind,
        );
        return modifierKindCondition && idolParameterKindCondition;
      }
      return false;
    }
    case "turnEnd": {
      return query.kind === "turnEnd" && idolParameterKindCondition;
    }
    case "turnStart": {
      return query.kind === "turnStart" && idolParameterKindCondition;
    }
    case "turnStartEveryNTurns": {
      return (
        query.kind === "turnStartEveryNTurns" &&
        query.turnNumber > 0 &&
        query.turnNumber % trigger.interval === 0 &&
        idolParameterKindCondition
      );
    }
    default: {
      const unreachable: never = trigger;
      throw new Error(`Unreachable statement`);
    }
  }
};

/**
 * 様々な値の現在値が基準値に対して指定比率の範囲内かを判定する
 */
export const measureValue = (
  lesson: Lesson,
  condition: MeasureValueConditionContent,
): boolean => {
  let targetPercentage: number | undefined = undefined;
  const valueKind = condition.valueKind;
  switch (valueKind) {
    case "life": {
      targetPercentage = Math.floor(
        (lesson.idol.life * 100) / lesson.idol.maxLife,
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
};

/** スキルカードが使用できるかを判定する */
export const canPlayCard = (
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
      return measureValue(lesson, condition);
    }
    default: {
      const unreachable: never = conditionKind;
      throw new Error(`Unreachable statement`);
    }
  }
};

/**
 * 効果が発動できるかを判定する
 */
export const canActivateEffect = (
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
          targetValue = focus ? focus.amount : 0;
          break;
        }
        case "goodCondition": {
          const goodCondition = lesson.idol.modifiers.find(
            (e) => e.kind === "goodCondition",
          );
          targetValue = goodCondition ? goodCondition.duration : 0;
          break;
        }
        case "halfLifeConsumption": {
          const halfLifeConsumption = lesson.idol.modifiers.find(
            (e) => e.kind === "halfLifeConsumption",
          );
          targetValue = halfLifeConsumption ? halfLifeConsumption.duration : 0;
          break;
        }
        case "motivation": {
          const motivation = lesson.idol.modifiers.find(
            (e) => e.kind === "motivation",
          );
          targetValue = motivation ? motivation.amount : 0;
          break;
        }
        case "positiveImpression": {
          const positiveImpression = lesson.idol.modifiers.find(
            (e) => e.kind === "positiveImpression",
          );
          targetValue = positiveImpression ? positiveImpression.amount : 0;
          break;
        }
        default: {
          const unreachable: never = modifierKind;
          throw new Error(`Unreachable statement`);
        }
      }
      return validateNumberInRange(targetValue, condition.range);
    }
    case "countRemainingTurns": {
      return createCurrentTurnDetails(lesson).remainingTurns <= condition.max;
    }
    case "countVitality": {
      return validateNumberInRange(lesson.idol.vitality, condition.range);
    }
    case "measureValue": {
      return measureValue(lesson, condition);
    }
    default: {
      const unreachable: never = conditionKind;
      throw new Error(`Unreachable statement`);
    }
  }
};

/**
 * Pアイテムの効果が発動できるかを判定する
 *
 * - 体力消費のコストがあるPアイテムは、体力が足りない時も発動できる
 *   - 仕様確認Issue: https://github.com/kjirou/gakumas-core/issues/46
 *   - 体力減少という類似効果もあるが、こちらは不明。一旦は体力消費と同じように、足りなくても発動している。
 */
export const canActivateProducerItem = (
  lesson: Lesson,
  producerItem: ProducerItem,
  queryLike: ReactiveEffectQueryWithoutIdolParameterKind,
): boolean => {
  const producerItemContent = getProducerItemContentData(
    producerItem.data,
    producerItem.enhanced,
  );
  const query = {
    ...queryLike,
    idolParameterKind: getIdolParameterKindOnTurnConsideringIgnoring(lesson),
  } as ReactiveEffectQuery;
  return (
    validateQueryOfReactiveEffectTrigger(producerItemContent.trigger, query) &&
    (producerItemContent.condition === undefined ||
      canActivateEffect(lesson, producerItemContent.condition)) &&
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

/** LessonUpdatDiff からコスト消費関係部分を抜き出したもの */
type CostConsumptionUpdateDiff = Extract<
  LessonUpdateDiff,
  { kind: "life" } | { kind: "modifiers.update" } | { kind: "vitality" }
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
): CostConsumptionUpdateDiff[] => {
  switch (cost.kind) {
    case "normal": {
      const updates: CostConsumptionUpdateDiff[] = [];
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
      const sameKindModifier = idol.modifiers.find((e) => e.kind === cost.kind);
      if (sameKindModifier && "amount" in sameKindModifier) {
        const actual = Math.min(cost.value, sameKindModifier.amount);
        return [
          {
            kind: "modifiers.update",
            propertyNameKind: "amount",
            id: sameKindModifier.id,
            actual: -actual + 0,
            max: -cost.value + 0,
          },
        ];
      } else {
        // 結果を返す必要があるなら要考慮点がある、関数コメント参照
        return [];
      }
    }
    case "goodCondition": {
      const sameKindModifier = idol.modifiers.find(
        (e) => e.kind === "goodCondition",
      );
      if (sameKindModifier && "duration" in sameKindModifier) {
        const actual = Math.min(cost.value, sameKindModifier.duration);
        return [
          {
            kind: "modifiers.update",
            propertyNameKind: "duration",
            id: sameKindModifier.id,
            actual: -actual + 0,
            max: -cost.value + 0,
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
 * - 元気や好印象などを含む全てのスコア増加効果について、この式を通している
 *   - そのため、本実装上では、元気や好印象によるスコア増加へ好調の影響を与えることもできる
 *
 * @param remainingIncrementableScore 残りの増加可能スコア。undefined の場合は、無限大として扱う。
 */
export const calculatePerformingScoreEffect = (
  idol: Idol,
  scoreBonus: number | undefined,
  remainingIncrementableScore: number | undefined,
  query: NonNullable<Extract<Effect, { kind: "perform" }>["score"]>,
): Array<Extract<LessonUpdateDiff, { kind: "score" }>> => {
  const goodCondition = idol.modifiers.find((e) => e.kind === "goodCondition");
  const goodConditionDuration =
    goodCondition && "duration" in goodCondition ? goodCondition.duration : 0;
  const focus = idol.modifiers.find((e) => e.kind === "focus");
  const focusAmount = focus && "amount" in focus ? focus.amount : 0;
  const hasExcellentCondition =
    idol.modifiers.find((e) => e.kind === "excellentCondition") !== undefined;
  const mightyPerformance = idol.modifiers.find(
    (e) => e.kind === "mightyPerformance",
  );
  // NOTE: 0.1 * 1.4 = 0.13999999999999999 になるなど、絶好調時の好調1を0.1として計算すると値がずれるので、整数で計算する
  const goodConditionMultiplier =
    (goodConditionDuration > 0 ? 15 : 10) +
    (goodConditionDuration > 0 && hasExcellentCondition
      ? goodConditionDuration
      : 0);
  const focusMultiplier =
    query.focusMultiplier !== undefined ? query.focusMultiplier : 1;
  const baseScore = Math.ceil(
    (query.value +
      focusAmount * focusMultiplier +
      (query.boostPerCardUsed ?? 0) * idol.totalCardUsageCount) *
      (goodConditionMultiplier / 10) *
      (mightyPerformance ? (100 + mightyPerformance.percentage) / 100 : 1.0),
  );
  const score =
    scoreBonus !== undefined
      ? Math.ceil((baseScore * scoreBonus) / 100)
      : baseScore;
  const diffs: Array<Extract<LessonUpdateDiff, { kind: "score" }>> = [];
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

export const calculatePerformingVitalityEffect = (
  idol: Idol,
  query: VitalityUpdateQuery,
): Extract<LessonUpdateDiff, { kind: "vitality" }> => {
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
  const motivationMultiplier =
    query.motivationMultiplier !== undefined ? query.motivationMultiplier : 1;
  const value = Math.ceil(
    query.value +
      motivationAmount * motivationMultiplier +
      (query.boostPerCardUsed !== undefined
        ? idol.totalCardUsageCount * query.boostPerCardUsed
        : 0),
  );
  return {
    kind: "vitality",
    actual: value,
    max: value,
  };
};

const createNewModifierDiff = (
  modifierData: ModifierData,
  id: Modifier["id"],
): Extract<LessonUpdateDiff, { kind: "modifiers.addition" }> => {
  const newModifier = {
    ...modifierData,
    id,
  };
  return {
    kind: "modifiers.addition",
    actual: newModifier,
    max: newModifier,
  };
};

/**
 * 残りスキルカード使用数を1回分減らす
 *
 * - 「スキルカード使用数追加」を先に消費し、それがなければアクションポイントを消費する
 * - 足りない状況で実行したら、アクションポイントの0修正を返す
 */
export const consumeRemainingCardUsageCount = (
  idol: Idol,
): LessonUpdateDiff[] => {
  const additionalCardUsageCount = idol.modifiers.find(
    (e) => e.kind === "additionalCardUsageCount",
  );
  if (additionalCardUsageCount) {
    return [
      {
        kind: "modifiers.update",
        propertyNameKind: "amount",
        id: additionalCardUsageCount.id,
        actual: -1,
        max: -1,
      },
    ];
  } else {
    return [
      {
        kind: "actionPoints",
        amount: Math.max(-1, -idol.actionPoints) + 0,
      },
    ];
  }
};

/**
 * 効果を発動する
 */
export const activateEffect = <
  EffectWithoutConditionLike extends EffectWithoutCondition,
>(
  lesson: Lesson,
  effect: EffectWithoutConditionLike,
  getRandom: GetRandom,
  idGenerator: IdGenerator,
): LessonUpdateDiff[] => {
  const idolParameterKind = getIdolParameterKindOnTurn(lesson);
  const scoreBonus =
    lesson.idol.scoreBonus !== undefined
      ? lesson.idol.scoreBonus[idolParameterKind]
      : undefined;
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
  let diffs: LessonUpdateDiff[] = [];
  const effectKind = effect.kind;
  switch (effectKind) {
    case "drainLife": {
      diffs = [
        ...diffs,
        ...calculateCostConsumption(lesson.idol, {
          kind: "normal",
          value: effect.value,
        }),
      ];
      break;
    }
    case "drawCards": {
      const { deck, discardPile, drawnCards } = drawCardsFromDeck(
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
        kind: "cards.enhancement.effect",
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
    // TODO: 手札5枚で生成した場合、現在は捨札に入れているが、本家は山札の先頭へスタックされる、Ref: https://youtu.be/40E2XOr0q2w
    case "generateCard": {
      const candidates = filterGeneratableCardsData(
        lesson.idol.data.producePlan.kind,
      );
      const cardData =
        candidates[getRandomInteger(getRandom, candidates.length - 1)];
      if (!cardData) {
        throw new Error("Unexpected empty card data");
      }
      const additionalCard: Card = {
        id: idGenerator(),
        data: cardData,
        enhancements: [{ kind: "original" }],
      };
      const { hand, discardPile } = addCardsToHandOrDiscardPile(
        [additionalCard.id],
        lesson.hand,
        lesson.discardPile,
      );
      diffs.push({
        kind: "cards.addition",
        card: additionalCard,
      });
      diffs.push(
        createCardPlacementDiff(
          { hand: lesson.hand, discardPile: lesson.discardPile },
          { hand, discardPile },
        ),
      );
      break;
    }
    case "generateTroubleCard": {
      const additionalCard: Card = {
        id: idGenerator(),
        data: getCardDataByConstId("nemuke"),
        enhancements: [],
      };
      const deck = [...lesson.deck];
      // 例: deck が ["a", "b", "c"] なら、0,1,2,3 のいずれかに挿入する
      const index = getRandomInteger(getRandom, deck.length);
      deck.splice(index, 0, additionalCard.id);
      diffs.push({
        kind: "cards.addition",
        card: additionalCard,
      });
      diffs.push(createCardPlacementDiff({ deck: lesson.deck }, { deck }));
      break;
    }
    case "getModifier": {
      const metaModifierData = metaModifierDictioanry[effect.modifier.kind];
      const debuffProtection = lesson.idol.modifiers.find(
        (e) => e.kind === "debuffProtection",
      );
      // 低下状態無効を付与していたら、デバフ的な状態修正は弾く
      // 仕様確認Issue: https://github.com/kjirou/gakumas-core/issues/74
      if (metaModifierData.debuff && debuffProtection) {
        diffs.push({
          kind: "modifiers.update",
          propertyNameKind: "times",
          id: debuffProtection.id,
          actual: -1,
          max: -1,
        });
        break;
      }
      const sameKindModifier = lesson.idol.modifiers.find(
        (e) => e.kind === effect.modifier.kind,
      );
      let diff: LessonUpdateDiff;
      switch (effect.modifier.kind) {
        case "additionalCardUsageCount":
        case "focus":
        case "motivation":
        case "positiveImpression": {
          diff = sameKindModifier
            ? {
                kind: "modifiers.update",
                id: sameKindModifier.id,
                propertyNameKind: "amount",
                actual: effect.modifier.amount,
                max: effect.modifier.amount,
              }
            : createNewModifierDiff(effect.modifier, idGenerator());
          break;
        }
        case "debuffProtection": {
          diff = sameKindModifier
            ? {
                kind: "modifiers.update",
                id: sameKindModifier.id,
                propertyNameKind: "times",
                actual: effect.modifier.times,
                max: effect.modifier.times,
              }
            : createNewModifierDiff(effect.modifier, idGenerator());
          break;
        }
        case "doubleLifeConsumption":
        case "excellentCondition":
        case "goodCondition":
        case "halfLifeConsumption":
        case "noVitalityIncrease": {
          // TODO: パラメータ上昇量増加50%/30% は、それぞれの値も見ないと同じ種類かが判別できない
          diff = sameKindModifier
            ? {
                kind: "modifiers.update",
                id: sameKindModifier.id,
                propertyNameKind: "duration",
                actual: effect.modifier.duration,
                max: effect.modifier.duration,
              }
            : createNewModifierDiff(effect.modifier, idGenerator());
          break;
        }
        case "mightyPerformance": {
          const isSameKindAndPercentageModifier = lesson.idol.modifiers.find(
            (modifier) =>
              modifier.kind === "mightyPerformance" &&
              effect.modifier.kind === "mightyPerformance" &&
              modifier.percentage === effect.modifier.percentage,
          );
          diff = isSameKindAndPercentageModifier
            ? {
                kind: "modifiers.update",
                id: isSameKindAndPercentageModifier.id,
                propertyNameKind: "duration",
                actual: effect.modifier.duration,
                max: effect.modifier.duration,
              }
            : createNewModifierDiff(effect.modifier, idGenerator());
          break;
        }
        case "lifeConsumptionReduction": {
          diff = sameKindModifier
            ? {
                kind: "modifiers.update",
                id: sameKindModifier.id,
                propertyNameKind: "value",
                actual: effect.modifier.value,
                max: effect.modifier.value,
              }
            : createNewModifierDiff(effect.modifier, idGenerator());
          break;
        }
        // 常に新規追加になる状態修正群
        case "delayedEffect":
        case "doubleEffect":
        case "reactiveEffect": {
          diff = createNewModifierDiff(effect.modifier, idGenerator());
          break;
        }
        default: {
          const unreachable: never = effect.modifier;
          throw new Error(`Unreachable statement`);
        }
      }
      diffs.push(diff);
      break;
    }
    case "increaseRemainingTurns": {
      diffs.push({
        kind: "remainingTurnsChange",
        amount: effect.amount,
      });
      break;
    }
    case "multiplyModifier": {
      const modifier = lesson.idol.modifiers.find(
        (e) => e.kind === effect.modifierKind,
      );
      switch (effect.modifierKind) {
        case "focus": {
          if (modifier && "amount" in modifier) {
            const amount =
              Math.ceil(modifier.amount * effect.multiplier) - modifier.amount;
            diffs.push({
              kind: "modifiers.update",
              propertyNameKind: "amount",
              id: modifier.id,
              actual: amount,
              max: amount,
            });
          }
          break;
        }
        case "positiveImpression": {
          if (modifier && "amount" in modifier) {
            const amount =
              Math.ceil(modifier.amount * effect.multiplier) - modifier.amount;
            diffs.push({
              kind: "modifiers.update",
              propertyNameKind: "amount",
              id: modifier.id,
              actual: amount,
              max: amount,
            });
          }
          break;
        }
        default: {
          const unreachable: never = effect;
          throw new Error(`Unreachable statement`);
        }
      }
      break;
    }
    case "perform": {
      if (effect.score) {
        diffs = [
          ...diffs,
          ...calculatePerformingScoreEffect(
            lesson.idol,
            scoreBonus,
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
      let baseValue = 0;
      const modifierKind = effect.modifierKind;
      switch (modifierKind) {
        case "goodCondition": {
          const goodCondition = lesson.idol.modifiers.find(
            (e) => e.kind === "goodCondition",
          );
          const goodConditionDuration =
            goodCondition && "duration" in goodCondition
              ? goodCondition.duration
              : 0;
          baseValue = Math.ceil(
            (goodConditionDuration * effect.percentage) / 100,
          );
          break;
        }
        case "motivation": {
          const motivation = lesson.idol.modifiers.find(
            (e) => e.kind === "motivation",
          );
          const motivationAmount =
            motivation && "amount" in motivation ? motivation.amount : 0;
          baseValue = Math.ceil((motivationAmount * effect.percentage) / 100);
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
          baseValue = Math.ceil(
            (positiveImpressionAmount * effect.percentage) / 100,
          );
          break;
        }
        default: {
          const unreachable: never = modifierKind;
          throw new Error(`Unreachable statement`);
        }
      }
      let newDiffs: LessonUpdateDiff[] = [];
      switch (effect.valueKind) {
        case "score": {
          newDiffs = calculatePerformingScoreEffect(
            lesson.idol,
            scoreBonus,
            remainingIncrementableScore,
            { value: baseValue },
          );
          break;
        }
        case "vitality": {
          newDiffs = [
            calculatePerformingVitalityEffect(lesson.idol, {
              value: baseValue,
            }),
          ];
          break;
        }
        default: {
          const unreachable: never = effect.valueKind;
          throw new Error(`Unreachable statement`);
        }
      }
      diffs = [...diffs, ...newDiffs];
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
      diffs = [
        ...diffs,
        ...calculatePerformingScoreEffect(
          lesson.idol,
          scoreBonus,
          remainingIncrementableScore,
          { value: score },
        ),
      ];
      break;
    }
    case "recoverLife": {
      diffs.push({
        kind: "life",
        actual: Math.min(effect.value, lesson.idol.maxLife - lesson.idol.life),
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

/**
 * 効果の条件を満たせば、効果を発動する
 *
 * @param options.lessonForCondition 条件判定用のレッスンを効果発動用のレッスンと別に指定する時に使用する
 * @return 効果適用条件を満たさない場合は undefined を返す、結果的に効果がなかった場合は空配列を返す
 */
export const activateEffectIf = (
  lesson: Lesson,
  effect: Effect,
  getRandom: GetRandom,
  idGenerator: IdGenerator,
  options: {
    lessonForCondition?: Lesson;
  } = {},
): LessonUpdateDiff[] | undefined => {
  if (effect.condition) {
    if (
      !canActivateEffect(options.lessonForCondition ?? lesson, effect.condition)
    ) {
      return undefined;
    }
  }
  return activateEffect(lesson, effect, getRandom, idGenerator);
};

const activateDelayedEffectModifier = (
  lesson: Lesson,
  modifier: Extract<Modifier, { kind: "delayedEffect" }>,
  getRandom: GetRandom,
  idGenerator: IdGenerator,
): LessonUpdateDiff[] => {
  if (modifier.id === undefined) {
    throw new Error(`modifier.id is undefined: ${modifier}`);
  }
  let diffs: LessonUpdateDiff[] = [];
  if (modifier.delay === 1) {
    diffs = [
      ...diffs,
      ...activateEffect(lesson, modifier.effect, getRandom, idGenerator),
    ];
  }
  diffs = [
    ...diffs,
    {
      kind: "modifiers.update",
      propertyNameKind: "delay",
      id: modifier.id,
      actual: -1,
      max: -1,
    },
  ];
  return diffs;
};

/**
 * メモリーのアビリティの効果を発動する
 */
export const activateMemoryEffect = (
  lesson: Lesson,
  memoryEffect: MemoryEffect,
  getRandom: GetRandom,
  idGenerator: IdGenerator,
): LessonUpdateDiff[] => {
  if (memoryEffect.probability <= getRandom() * 100) {
    return [];
  }
  switch (memoryEffect.kind) {
    case "focus":
    case "motivation":
    case "positiveImpression": {
      const effect: EffectWithoutCondition = {
        kind: "getModifier",
        modifier: {
          kind: memoryEffect.kind,
          amount: memoryEffect.value,
        },
      };
      return activateEffect(lesson, effect, getRandom, idGenerator);
    }
    case "goodCondition":
    case "halfLifeConsumption": {
      const effect: EffectWithoutCondition = {
        kind: "getModifier",
        modifier: {
          kind: memoryEffect.kind,
          duration: memoryEffect.value,
        },
      };
      return activateEffect(lesson, effect, getRandom, idGenerator);
    }
    case "vitality": {
      const effect: EffectWithoutCondition = {
        kind: "perform",
        vitality: {
          value: memoryEffect.value,
        },
      };
      return activateEffect(lesson, effect, getRandom, idGenerator);
    }
    default: {
      const unreachable: never = memoryEffect.kind;
      throw new Error(`Unreachable statement`);
    }
  }
};

/**
 * 効果発動結果リスト
 *
 * - 配列のインデックスは、実行した効果リストのインデックスに対応する
 * - undefined は、効果適用条件を満たさなかったもの
 */
type EffectActivations = Array<LessonUpdateDiff[] | undefined>;

/**
 * スキルカードの使用により、その効果リストを発動する
 *
 * - 効果リストの順番通りに発動し、後の効果は前の効果の結果に影響を受ける
 *   - 仕様確認: https://github.com/kjirou/gakumas-core/issues/95
 * - 一方で、各効果の効果発動条件については、スキルカード使用前のレッスンの状態を参照する
 *   - 例えば、「楽観的」は、好調がない状態では、集中+1は発動しない
 */
export const activateEffectsOnCardPlay = (
  lesson: Lesson,
  effects: Effect[],
  getRandom: GetRandom,
  idGenerator: IdGenerator,
): EffectActivations => {
  const beforeLesson = lesson;
  let effectActivations: EffectActivations = [];
  for (const effect of effects) {
    const diffs = activateEffectIf(lesson, effect, getRandom, idGenerator, {
      lessonForCondition: beforeLesson,
    });
    if (diffs) {
      lesson = patchDiffs(lesson, diffs);
    }
    // diffs が undefined の時も記録する必要がある
    effectActivations = [...effectActivations, diffs];
  }
  return effectActivations;
};

/**
 * Pアイテムの効果リストを発動する
 *
 * - スキルカードとは異なり、プレビューがないので、EffectActivations の形式でなくても良い
 * - コスト消費時点は、見た感じは、効果発動後だった
 *   - 参考動画: https://www.youtube.com/live/ebXmhK2aa_s?si=lH56MFYv6Vgp3TGW&t=3737
 */
export const activateEffectsOfProducerItem = (
  lesson: Lesson,
  producerItem: ProducerItem,
  getRandom: GetRandom,
  idGenerator: IdGenerator,
): LessonUpdateDiff[] => {
  let newLesson = lesson;
  let diffs: LessonUpdateDiff[] = [];
  const producerItemContent = getProducerItemContentData(
    producerItem.data,
    producerItem.enhanced,
  );
  for (const effect of producerItemContent.effects) {
    const innerDiffs = activateEffect(lesson, effect, getRandom, idGenerator);
    diffs = [...diffs, ...innerDiffs];
    newLesson = patchDiffs(newLesson, innerDiffs);
  }
  if (producerItemContent.cost) {
    const innerDiffs = calculateCostConsumption(
      newLesson.idol,
      producerItemContent.cost,
    );
    diffs = [...diffs, ...innerDiffs];
    newLesson = patchDiffs(newLesson, innerDiffs);
  }
  diffs = [
    ...diffs,
    {
      kind: "producerItem.activationCount",
      producerItemId: producerItem.id,
      value: producerItem.activationCount + 1,
    },
  ];
  return diffs;
};

/**
 * スキルカード使用に伴うPアイテムの効果を発動して反映する
 */
export const activateEffectsEachProducerItemsAccordingToCardUsage = (
  lesson: Lesson,
  queryLike: ReactiveEffectQueryWithoutIdolParameterKind,
  getRandom: GetRandom,
  idGenerator: IdGenerator,
  reason: LessonUpdateQueryReason,
): {
  lesson: Lesson;
  updates: LessonUpdateQuery[];
} => {
  let updates: LessonUpdateQuery[] = [];
  let newLesson = lesson;
  const targetProducerItems = newLesson.idol.producerItems.filter(
    (producerItem) =>
      canActivateProducerItem(newLesson, producerItem, queryLike),
  );
  for (const producerItem of targetProducerItems) {
    const diffs = activateEffectsOfProducerItem(
      newLesson,
      producerItem,
      getRandom,
      idGenerator,
    );
    const innerUpdates = diffs.map((diff) =>
      createLessonUpdateQueryFromDiff(diff, reason),
    );
    newLesson = patchDiffs(newLesson, innerUpdates);
    updates = [...updates, ...innerUpdates];
  }
  return {
    lesson: newLesson,
    updates,
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
 *
 * - 「レッスン開始時手札に入る」は、ターン開始時の手札を引く処理に関連するので、ここでは処理しない
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
  // Pアイテム起因の、レッスン開始時の効果発動
  //
  // - 現状は、恒常SSR清夏の「ゲーセンの戦利品」のみ、このトリガーで効果が発動する
  //
  let producerItemUpdates: LessonUpdateQuery[] = [];
  for (const producerItem of newLesson.idol.producerItems) {
    if (
      canActivateProducerItem(newLesson, producerItem, { kind: "lessonStart" })
    ) {
      const diffs = activateEffectsOfProducerItem(
        newLesson,
        producerItem,
        params.getRandom,
        params.idGenerator,
      );
      const innerUpdates = diffs.map((diff) =>
        createLessonUpdateQueryFromDiff(diff, {
          kind: "lessonStart.producerItemEffectActivation",
          producerItemId: producerItem.id,
          producerItemDataId: producerItem.data.id,
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex: nextHistoryResultIndex,
        }),
      );
      if (innerUpdates.length > 0) {
        newLesson = patchDiffs(newLesson, innerUpdates);
        producerItemUpdates = [...producerItemUpdates, ...innerUpdates];
        nextHistoryResultIndex++;
        if (isScoreSatisfyingPerfect(newLesson)) {
          break;
        }
      }
    }
  }

  return {
    updates: [...producerItemUpdates],
    nextHistoryResultIndex,
  };
};

/**
 * ターン開始時に応援/トラブルの効果を発動する
 */
export const activateEncouragementOnTurnStart = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    getRandom: GetRandom;
    idGenerator: IdGenerator;
  },
): LessonMutationResult => {
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  let encouragementUpdates: LessonUpdateQuery[] = [];
  const encouragementIndex = lesson.encouragements.findIndex(
    (e) => e.turnNumber === lesson.turnNumber,
  );
  const encouragement = lesson.encouragements[encouragementIndex];
  if (encouragement) {
    const diffs = activateEffectIf(
      newLesson,
      encouragement.effect,
      params.getRandom,
      params.idGenerator,
    );
    if (diffs) {
      const innerUpdates = diffs.map((diff) =>
        createLessonUpdateQueryFromDiff(diff, {
          kind: "turnStart.encouragement",
          index: encouragementIndex,
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex: nextHistoryResultIndex,
        }),
      );
      if (innerUpdates.length > 0) {
        newLesson = patchDiffs(newLesson, innerUpdates);
        encouragementUpdates = [...encouragementUpdates, ...innerUpdates];
        nextHistoryResultIndex++;
      }
    }
  }

  return {
    updates: [...encouragementUpdates],
    nextHistoryResultIndex,
  };
};

/**
 * ターン開始時・2ターンごとのPアイテムの効果を発動する
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
  for (const producerItem of newLesson.idol.producerItems) {
    if (
      canActivateProducerItem(newLesson, producerItem, {
        kind: "turnStart",
      })
    ) {
      const diffs = activateEffectsOfProducerItem(
        newLesson,
        producerItem,
        params.getRandom,
        params.idGenerator,
      );
      const innerUpdates = diffs.map((diff) =>
        createLessonUpdateQueryFromDiff(diff, {
          kind: "turnStart.producerItem.effectActivation",
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex: nextHistoryResultIndex,
        }),
      );
      if (innerUpdates.length > 0) {
        newLesson = patchDiffs(newLesson, innerUpdates);
        turnStartUpdates = [...turnStartUpdates, ...innerUpdates];
        nextHistoryResultIndex++;
        if (isScoreSatisfyingPerfect(newLesson)) {
          break;
        }
      }
    }
  }

  //
  // 数ターンごとの効果発動
  //
  let turnStartEveryNTurnsUpdates: LessonUpdateQuery[] = [];
  for (const producerItem of newLesson.idol.producerItems) {
    if (
      canActivateProducerItem(newLesson, producerItem, {
        kind: "turnStartEveryNTurns",
        turnNumber: newLesson.turnNumber,
      })
    ) {
      const diffs = activateEffectsOfProducerItem(
        newLesson,
        producerItem,
        params.getRandom,
        params.idGenerator,
      );
      const innerUpdates = diffs.map((diff) =>
        createLessonUpdateQueryFromDiff(diff, {
          kind: "turnStart.producerItem.effectActivationEveryTwoTurns",
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex: nextHistoryResultIndex,
        }),
      );
      if (innerUpdates.length > 0) {
        newLesson = patchDiffs(newLesson, innerUpdates);
        turnStartEveryNTurnsUpdates = [
          ...turnStartEveryNTurnsUpdates,
          ...innerUpdates,
        ];
        nextHistoryResultIndex++;
        if (isScoreSatisfyingPerfect(newLesson)) {
          break;
        }
      }
    }
  }

  return {
    updates: [...turnStartUpdates, ...turnStartEveryNTurnsUpdates],
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
  //
  let performDelayedEffectUpdates: LessonUpdateQuery[] = [];
  for (const modifier of newLesson.idol.modifiers) {
    if (
      isDelayedEffectModifierType(modifier) &&
      isPerformEffectType(modifier.effect)
    ) {
      const diffs = activateDelayedEffectModifier(
        newLesson,
        modifier,
        params.getRandom,
        params.idGenerator,
      );
      const innerUpdates = diffs.map((diff) =>
        createLessonUpdateQueryFromDiff(diff, {
          kind: "turnStart.modifier.delayedEffectActivation",
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex: nextHistoryResultIndex,
        }),
      );
      if (innerUpdates.length > 0) {
        newLesson = patchDiffs(newLesson, innerUpdates);
        performDelayedEffectUpdates = [
          ...performDelayedEffectUpdates,
          ...innerUpdates,
        ];
        nextHistoryResultIndex++;
        if (isScoreSatisfyingPerfect(newLesson)) {
          break;
        }
      }
    }
  }

  //
  // 状態修正の「(次ターン|nターン後)、スキルカードを引く」による効果発動
  //
  let drawCardDelayedEffectUpdates: LessonUpdateQuery[] = [];
  if (!isScoreSatisfyingPerfect(newLesson)) {
    for (const modifier of newLesson.idol.modifiers) {
      if (
        isDelayedEffectModifierType(modifier) &&
        isDrawCardsEffectType(modifier.effect)
      ) {
        const diffs = activateDelayedEffectModifier(
          newLesson,
          modifier,
          params.getRandom,
          params.idGenerator,
        );
        const innerUpdates = diffs.map((diff) =>
          createLessonUpdateQueryFromDiff(diff, {
            kind: "turnStart.modifier.delayedEffectActivation",
            historyTurnNumber: lesson.turnNumber,
            historyResultIndex: nextHistoryResultIndex,
          }),
        );
        if (innerUpdates.length > 0) {
          newLesson = patchDiffs(newLesson, innerUpdates);
          drawCardDelayedEffectUpdates = [
            ...drawCardDelayedEffectUpdates,
            ...innerUpdates,
          ];
          nextHistoryResultIndex++;
        }
      }
    }
  }

  //
  // 状態修正の「(次ターン|nターン後)、スキルカードを強化」による効果発動
  //
  let enhanceHandDelayedEffectUpdates: LessonUpdateQuery[] = [];
  if (!isScoreSatisfyingPerfect(newLesson)) {
    for (const modifier of newLesson.idol.modifiers) {
      if (
        isDelayedEffectModifierType(modifier) &&
        isEnhanceHandEffectType(modifier.effect)
      ) {
        const diffs = activateDelayedEffectModifier(
          newLesson,
          modifier,
          params.getRandom,
          params.idGenerator,
        );
        const innerUpdates = diffs.map((diff) =>
          createLessonUpdateQueryFromDiff(diff, {
            kind: "turnStart.modifier.delayedEffectActivation",
            historyTurnNumber: lesson.turnNumber,
            historyResultIndex: nextHistoryResultIndex,
          }),
        );
        if (innerUpdates.length > 0) {
          newLesson = patchDiffs(newLesson, innerUpdates);
          enhanceHandDelayedEffectUpdates = [
            ...enhanceHandDelayedEffectUpdates,
            ...innerUpdates,
          ];
          nextHistoryResultIndex++;
        }
      }
    }
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
 *
 * - 本実装では、山札と捨札を合計しても引く数に足りない状況も、正しい状況として扱う
 *   - おそらく、本家では存在しない状況
 */
export const drawCardsOnTurnStart = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    getRandom: GetRandom;
    noInnateActivation: boolean;
  },
): LessonMutationResult => {
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  //
  // 「レッスン開始時手札に入る」のスキルカードを山札の先頭へ移動する
  //
  // - TODO: レッスン開始時手札が8枚以上の時の挙動が、本家と異なる
  //         - レッスン開始時手札が8枚の時、1ターン目:5枚->2ターン目:2枚->不定ターン目:1枚、Ref: https://github.com/kjirou/gakumas-core/issues/37
  //         - レッスン開始時手札が9枚の時、1ターン目:5枚->2ターン目:3枚->不定ターン目:1枚、Ref: https://github.com/kjirou/gakumas-core/issues/42
  //
  let innateCardCount = 0;
  let moveInnateCardsUpdates: LessonUpdateQuery[] = [];
  if (!params.noInnateActivation && newLesson.turnNumber === 1) {
    let innateCardIds: Array<Card["id"]> = [];
    let restCardids: Array<Card["id"]> = [];
    for (const deckCardId of newLesson.deck) {
      const card = newLesson.cards.find((card) => card.id === deckCardId);
      if (!card) {
        throw new Error(`Card not found in cards: cardId=${deckCardId}`);
      }
      if (getCardContentData(card.data, card.enhancements.length).innate) {
        innateCardIds = [...innateCardIds, deckCardId];
      } else {
        restCardids = [...restCardids, deckCardId];
      }
    }
    if (innateCardIds.length) {
      innateCardCount = innateCardIds.length;
      moveInnateCardsUpdates = [
        {
          kind: "cardPlacement",
          deck: [...innateCardIds, ...restCardids],
          reason: {
            kind: "turnStart",
            historyTurnNumber: newLesson.turnNumber,
            historyResultIndex: nextHistoryResultIndex,
          },
        },
      ];
      newLesson = patchDiffs(newLesson, moveInnateCardsUpdates);
      nextHistoryResultIndex++;
    }
  }

  //
  // 全てのスキルカードのレッスンサポートを削除する
  //
  // - TODO: おそらくは、この時点ではなく、手札から手札以外に外れる時に削除するのではないかと思う。まずは仕様不明: https://github.com/kjirou/gakumas-core/issues/58
  //         - この時点だと、ターン内に手札を引き直した時にレッスンサポートが付与されていることもありうる
  //         - 影響が少ないし、手札から外れる場所は多くて手間がかかるし、仕様判明してからその処理に変える
  //
  const removeLessonSupportUpdates: LessonUpdateQuery[] = [
    createLessonUpdateQueryFromDiff(
      {
        kind: "cards.removingLessonSupports",
        cardIds: newLesson.cards
          .filter((card) =>
            card.enhancements.some(
              (enhancement) => enhancement.kind === "lessonSupport",
            ),
          )
          .map((e) => e.id),
      },
      {
        kind: "turnStart",
        historyTurnNumber: newLesson.turnNumber,
        historyResultIndex: nextHistoryResultIndex,
      },
    ),
  ];
  newLesson = patchDiffs(newLesson, removeLessonSupportUpdates);
  nextHistoryResultIndex++;

  //
  // 手札を引く
  //
  // - TODO: レッスンサポートを発動する
  //
  let drawCardsEffectUpdates: LessonUpdateQuery[] = [];
  const drawCardsEffectDiffs = activateEffect(
    newLesson,
    {
      kind: "drawCards",
      amount: Math.min(
        Math.max(innateCardCount, numberOfCardsToDrawAtTurnStart),
        maxHandSize,
      ),
    },
    params.getRandom,
    // "drawCards" に限れば idGenerator は使われない
    () => {
      throw new Error("Unexpected call");
    },
  );
  drawCardsEffectUpdates = drawCardsEffectDiffs.map((diff) =>
    createLessonUpdateQueryFromDiff(diff, {
      kind: "turnStart.drawingHand",
      historyTurnNumber: newLesson.turnNumber,
      historyResultIndex: nextHistoryResultIndex,
    }),
  );
  newLesson = patchDiffs(newLesson, drawCardsEffectUpdates);
  nextHistoryResultIndex++;

  return {
    updates: [
      ...moveInnateCardsUpdates,
      ...removeLessonSupportUpdates,
      ...drawCardsEffectUpdates,
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
): LessonMutationResult => {
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  // 毎ループに lesson の更新が必要かは不明
  // 本実装では、とりあえず、全ループ後に 1 回だけ更新している
  let modifierUpdates: LessonUpdateQuery[] = [];
  for (const modifierId of newLesson.idol.modifierIdsAtTurnStart) {
    const modifier = newLesson.idol.modifiers.find((e) => e.id === modifierId);
    const reason: LessonUpdateQueryReason = {
      kind: "turnStart.modifier.durationDecreaseOverTime",
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
          modifierUpdates = [
            ...modifierUpdates,
            {
              kind: "modifiers.update",
              propertyNameKind: "duration",
              id: modifier.id,
              actual: -1,
              max: -1,
              reason,
            },
          ];
          break;
        }
        case "doubleEffect": {
          if (modifier.duration !== undefined) {
            modifierUpdates = [
              ...modifierUpdates,
              {
                kind: "modifiers.update",
                propertyNameKind: "duration",
                id: modifier.id,
                actual: -1,
                max: -1,
                reason,
              },
            ];
          }
          break;
        }
        case "positiveImpression": {
          modifierUpdates = [
            ...modifierUpdates,
            {
              kind: "modifiers.update",
              propertyNameKind: "amount",
              id: modifier.id,
              actual: -1,
              max: -1,
              reason,
            },
          ];
          break;
        }
      }
    }
  }
  if (modifierUpdates.length > 0) {
    newLesson = patchDiffs(newLesson, modifierUpdates);
    nextHistoryResultIndex++;
  }

  return {
    updates: [...modifierUpdates],
    nextHistoryResultIndex,
  };
};

/**
 * メモリーのアビリティの効果を発動する
 */
export const activateMemoryEffectsOnLessonStart = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    getRandom: GetRandom;
    idGenerator: IdGenerator;
  },
): LessonMutationResult => {
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  let memoryEffectUpdates: LessonUpdateQuery[] = [];
  for (const [index, memoryEffect] of newLesson.memoryEffects.entries()) {
    const innerUpdates = activateMemoryEffect(
      newLesson,
      memoryEffect,
      params.getRandom,
      params.idGenerator,
    ).map((diff) =>
      createLessonUpdateQueryFromDiff(diff, {
        kind: "turnStart.memoryEffect",
        index,
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex: nextHistoryResultIndex,
      }),
    );
    memoryEffectUpdates = [...memoryEffectUpdates, ...innerUpdates];
    newLesson = patchDiffs(newLesson, innerUpdates);
  }
  if (memoryEffectUpdates.length > 0) {
    nextHistoryResultIndex++;
  }

  return {
    updates: [...memoryEffectUpdates],
    nextHistoryResultIndex,
  };
};

/**
 * Pドリンクを使用する
 */
export const useDrink = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    drinkIndex: number;
    getRandom: GetRandom;
    idGenerator: IdGenerator;
    noConsumption: boolean;
  },
): LessonMutationResult => {
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  const drink = newLesson.idol.drinks[params.drinkIndex];
  if (!drink) {
    throw new Error(`Drink not found: drinkIndex=${params.drinkIndex}`);
  }

  //
  // Pドリンクの消費
  //
  let drinkConsumptionUpdates: LessonUpdateQuery[] = [];
  if (!params.noConsumption) {
    drinkConsumptionUpdates = [
      createLessonUpdateQueryFromDiff(
        {
          kind: "drinks.removal",
          id: drink.id,
        },
        {
          kind: "drinkUsage.consumption",
          drinkDataId: drink.data.id,
          drinkIndex: params.drinkIndex,
          historyTurnNumber: newLesson.turnNumber,
          historyResultIndex: nextHistoryResultIndex,
        },
      ),
    ];
    newLesson = patchDiffs(newLesson, drinkConsumptionUpdates);
    nextHistoryResultIndex++;
  }

  //
  // コストの消費
  //
  let costConsumptionUpdates: LessonUpdateQuery[] = [];
  if (drink.data.cost) {
    costConsumptionUpdates = calculateCostConsumption(
      newLesson.idol,
      drink.data.cost,
    ).map((diff) =>
      createLessonUpdateQueryFromDiff(diff, {
        kind: "drinkUsage.costConsumption",
        historyTurnNumber: newLesson.turnNumber,
        historyResultIndex: nextHistoryResultIndex,
      }),
    );
    newLesson = patchDiffs(newLesson, costConsumptionUpdates);
    nextHistoryResultIndex++;
  }

  //
  // 効果発動
  //
  let effectsUpdates: LessonUpdateQuery[] = [];
  for (const effect of drink.data.effects) {
    const innerUpdates = activateEffect(
      newLesson,
      effect,
      params.getRandom,
      params.idGenerator,
    ).map((diff) =>
      createLessonUpdateQueryFromDiff(diff, {
        kind: "drinkUsage.effectActivation",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex: nextHistoryResultIndex,
      }),
    );
    effectsUpdates = [...effectsUpdates, ...innerUpdates];
    newLesson = patchDiffs(newLesson, innerUpdates);
  }
  if (effectsUpdates.length > 0) {
    nextHistoryResultIndex++;
  }

  return {
    updates: [
      ...drinkConsumptionUpdates,
      ...costConsumptionUpdates,
      ...effectsUpdates,
    ],
    nextHistoryResultIndex,
  };
};

/**
 * スキルカードを使用する
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
  const cardContent = getCardContentData(card.data, card.enhancements.length);
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  const idolParameterKind = getIdolParameterKindOnTurn(lesson);
  const doubleEffect = findPrioritizedDoubleEffectModifier(
    card.data.cardSummaryKind,
    newLesson.idol.modifiers,
  );

  //
  // 使用可否のバリデーション
  //
  // - 本関数は、使用条件を満たさないスキルカードに対しては使えない前提
  //
  if (
    !params.preview &&
    !canPlayCard(lesson, cardContent.cost, cardContent.condition)
  ) {
    throw new Error(`Can not use the card: ${card.data.name}`);
  }

  //
  // 残りスキルカード使用数（アクションポイント or スキルカード使用追加数）を1減らす
  //
  const consumeRemainingCardUsageCountUpdates = consumeRemainingCardUsageCount(
    newLesson.idol,
  ).map((diff) =>
    createLessonUpdateQueryFromDiff(diff, {
      kind: "cardUsage.remainingCardUsageCountConsumption",
      historyTurnNumber: newLesson.turnNumber,
      historyResultIndex: nextHistoryResultIndex,
    }),
  );
  newLesson = patchDiffs(newLesson, consumeRemainingCardUsageCountUpdates);
  nextHistoryResultIndex++;

  //
  // 手札の消費
  //
  // - 「レッスン中1回」がないものは捨札、あるものは除外へ移動する
  //
  let usedCardPlacementUpdates: LessonUpdateQuery[] = [];
  if (!params.preview) {
    usedCardPlacementUpdates = [
      createLessonUpdateQueryFromDiff(
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
        },
        {
          kind: "cardUsage.cardConsumption",
          cardId,
          historyTurnNumber: newLesson.turnNumber,
          historyResultIndex: nextHistoryResultIndex,
        },
      ),
    ];
    newLesson = patchDiffs(newLesson, usedCardPlacementUpdates);
    nextHistoryResultIndex++;
  }

  //
  // コストの消費
  //
  const costConsumptionUpdates: LessonUpdateQuery[] = calculateCostConsumption(
    newLesson.idol,
    calculateModifierEffectedActionCost(
      cardContent.cost,
      newLesson.idol.modifiers,
    ),
  ).map((diff) =>
    createLessonUpdateQueryFromDiff(diff, {
      kind: "cardUsage.costConsumption",
      cardId: card.id,
      historyTurnNumber: newLesson.turnNumber,
      historyResultIndex: nextHistoryResultIndex,
    }),
  );
  newLesson = patchDiffs(newLesson, costConsumptionUpdates);
  nextHistoryResultIndex++;

  //
  // 使用したスキルカード数を加算
  //
  const totalCardUsageCountUpdates: LessonUpdateQuery[] = [
    createLessonUpdateQueryFromDiff(
      {
        kind: "totalCardUsageCount",
        value: newLesson.idol.totalCardUsageCount + 1,
      },
      {
        kind: "cardUsage.totalCardUsageCount",
        cardId: card.id,
        historyTurnNumber: newLesson.turnNumber,
        historyResultIndex: nextHistoryResultIndex,
      },
    ),
  ];
  newLesson = patchDiffs(newLesson, totalCardUsageCountUpdates);
  nextHistoryResultIndex++;

  //
  // 効果発動
  //
  let effectActivationUpdates: LessonUpdateQuery[] = [];
  for (let times = 1; times <= (doubleEffect ? 2 : 1); times++) {
    //
    // 「次に使用するスキルカードの効果をもう1回発動」があれば、1 つ消費
    //
    if (doubleEffect && times === 1) {
      const innerUpdates = [
        createLessonUpdateQueryFromDiff(
          {
            kind: "modifiers.removal",
            id: doubleEffect.id,
          },
          {
            kind: "cardUsage",
            cardId: card.id,
            historyTurnNumber: newLesson.turnNumber,
            historyResultIndex: nextHistoryResultIndex,
          },
        ),
      ];
      newLesson = patchDiffs(newLesson, innerUpdates);
      effectActivationUpdates = [...effectActivationUpdates, ...innerUpdates];
    }

    //
    // Pアイテムに起因する、スキルカード使用時の主効果発動前の効果発動
    //
    if (!params.preview) {
      const { lesson: updatedLesson, updates } =
        activateEffectsEachProducerItemsAccordingToCardUsage(
          newLesson,
          { kind: "beforeCardEffectActivation", cardDataId: card.data.id },
          params.getRandom,
          params.idGenerator,
          {
            kind: "cardUsage.producerItem.beforeCardEffectActivation",
            cardId: card.id,
            historyTurnNumber: newLesson.turnNumber,
            historyResultIndex: nextHistoryResultIndex,
          },
        );
      newLesson = updatedLesson;
      effectActivationUpdates = [...effectActivationUpdates, ...updates];
    }

    //
    // 状態修正に起因する、スキルカードの主効果発動前の効果発動
    //
    if (!params.preview) {
      const effectsBeforeCardEffectActivation = newLesson.idol.modifiers
        .filter((modifier) => modifier.kind === "reactiveEffect")
        .filter((modifier) =>
          validateQueryOfReactiveEffectTrigger(modifier.trigger, {
            kind: "beforeCardEffectActivation",
            cardDataId: card.data.id,
            idolParameterKind,
          }),
        );
      for (const { effect } of effectsBeforeCardEffectActivation) {
        const diffs = activateEffectIf(
          newLesson,
          effect,
          params.getRandom,
          params.idGenerator,
        );
        if (diffs) {
          const innerUpdates = [
            ...diffs.map((diff) =>
              createLessonUpdateQueryFromDiff(diff, {
                kind: "cardUsage.modifier.beforeCardEffectActivation",
                cardId: card.id,
                historyTurnNumber: newLesson.turnNumber,
                historyResultIndex: nextHistoryResultIndex,
              }),
            ),
          ];
          newLesson = patchDiffs(newLesson, innerUpdates);
          effectActivationUpdates = [
            ...effectActivationUpdates,
            ...innerUpdates,
          ];
        }
      }
    }

    //
    // Pアイテムに起因する、n回ごとのスキルカードの主効果発動前の効果発動
    //
    if (!params.preview) {
      const { lesson: updatedLesson, updates } =
        activateEffectsEachProducerItemsAccordingToCardUsage(
          newLesson,
          {
            kind: "beforeCardEffectActivationEveryNTimes",
            cardDataId: card.data.id,
            totalCardUsageCount: newLesson.idol.totalCardUsageCount,
          },
          params.getRandom,
          params.idGenerator,
          {
            kind: "cardUsage.producerItem.beforeCardEffectActivationEveryNTimes",
            cardId: card.id,
            historyTurnNumber: newLesson.turnNumber,
            historyResultIndex: nextHistoryResultIndex,
          },
        );
      newLesson = updatedLesson;
      effectActivationUpdates = [...effectActivationUpdates, ...updates];
    }

    //
    // 主効果発動
    //
    const mainEffectActivations = activateEffectsOnCardPlay(
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
        const innerUpdates = [
          ...effectActivation.map((diff) =>
            createLessonUpdateQueryFromDiff(diff, {
              // プレビュー時に、発動されない効果を表示する必要があるので、この reason の形式で更新を返す必要がある
              kind: "cardUsage.mainEffectActivation",
              cardId: card.id,
              effectIndex,
              historyTurnNumber: newLesson.turnNumber,
              historyResultIndex: nextHistoryResultIndex,
            }),
          ),
        ];
        newLesson = patchDiffs(newLesson, innerUpdates);
        effectActivationUpdates = [...effectActivationUpdates, ...innerUpdates];
      }
    }

    const mainEffectDiffs = mainEffectActivations
      .filter((e) => e !== undefined)
      .reduce((acc, e) => [...acc, ...e], []);

    //
    // Pアイテムに起因する、スキルカードの主効果発動後の効果発動
    //
    if (!params.preview) {
      const { lesson: updatedLesson, updates } =
        activateEffectsEachProducerItemsAccordingToCardUsage(
          newLesson,
          {
            kind: "afterCardEffectActivation",
            cardDataId: card.data.id,
            diffs: mainEffectDiffs,
            modifiers: newLesson.idol.modifiers,
          },
          params.getRandom,
          params.idGenerator,
          {
            kind: "cardUsage.producerItem.afterCardEffectActivation",
            cardId: card.id,
            historyTurnNumber: newLesson.turnNumber,
            historyResultIndex: nextHistoryResultIndex,
          },
        );
      newLesson = updatedLesson;
      effectActivationUpdates = [...effectActivationUpdates, ...updates];
    }

    //
    // 状態修正に起因する、スキルカードの主効果発動後の効果発動
    //
    if (!params.preview) {
      const effectsAfterCardEffectActivation = newLesson.idol.modifiers
        .filter((modifier) => modifier.kind === "reactiveEffect")
        .filter((modifier) =>
          validateQueryOfReactiveEffectTrigger(modifier.trigger, {
            kind: "afterCardEffectActivation",
            cardDataId: card.data.id,
            diffs: mainEffectDiffs,
            idolParameterKind:
              getIdolParameterKindOnTurnConsideringIgnoring(newLesson),
            modifiers: newLesson.idol.modifiers,
          }),
        );
      for (const { effect } of effectsAfterCardEffectActivation) {
        const diffs = activateEffectIf(
          newLesson,
          effect,
          params.getRandom,
          params.idGenerator,
        );
        if (diffs) {
          const innerUpdates = [
            ...diffs.map((diff) =>
              createLessonUpdateQueryFromDiff(diff, {
                kind: "cardUsage.modifier.afterCardEffectActivation",
                cardId: card.id,
                historyTurnNumber: newLesson.turnNumber,
                historyResultIndex: nextHistoryResultIndex,
              }),
            ),
          ];
          newLesson = patchDiffs(newLesson, innerUpdates);
          effectActivationUpdates = [
            ...effectActivationUpdates,
            ...innerUpdates,
          ];
        }
      }
    }

    //
    // Pアイテムに起因する、スキルカードの主効果による状態修正増加後の効果発動
    //
    if (!params.preview) {
      const { lesson: updatedLesson, updates } =
        activateEffectsEachProducerItemsAccordingToCardUsage(
          newLesson,
          {
            kind: "modifierIncrease",
            diffs: mainEffectDiffs,
            modifiers: newLesson.idol.modifiers,
          },
          params.getRandom,
          params.idGenerator,
          {
            kind: "cardUsage.producerItem.modifierIncreaseEffectActivation",
            cardId: card.id,
            historyTurnNumber: newLesson.turnNumber,
            historyResultIndex: nextHistoryResultIndex,
          },
        );
      newLesson = updatedLesson;
      effectActivationUpdates = [...effectActivationUpdates, ...updates];
    }

    //
    // Pアイテムに起因する、体力減少時の効果発動
    //
    if (!params.preview) {
      const { lesson: updatedLesson, updates } =
        activateEffectsEachProducerItemsAccordingToCardUsage(
          newLesson,
          {
            kind: "lifeDecrease",
            diffs: costConsumptionUpdates,
          },
          params.getRandom,
          params.idGenerator,
          {
            kind: "cardUsage.producerItem.lifeDecreaseEffectActivation",
            cardId: card.id,
            historyTurnNumber: newLesson.turnNumber,
            historyResultIndex: nextHistoryResultIndex,
          },
        );
      newLesson = updatedLesson;
      effectActivationUpdates = [...effectActivationUpdates, ...updates];
    }
  }
  // スキルカードが 2 回効果発動しても、履歴上は 1 つの結果になっている
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
    const reason: LessonUpdateQueryReason = {
      kind: "cardUsage",
      cardId: card.id,
      historyTurnNumber: newLesson.turnNumber,
      historyResultIndex: nextHistoryResultIndex,
    } as const;
    recoveringActionPointsUpdates = [
      createLessonUpdateQueryFromDiff(
        {
          kind: "actionPoints",
          amount: 1,
        },
        reason,
      ),
      createLessonUpdateQueryFromDiff(
        {
          kind: "modifiers.update",
          propertyNameKind: "amount",
          id: additionalCardUsageCount.id,
          actual: -1,
          max: -1,
        },
        reason,
      ),
    ];
    newLesson = patchDiffs(newLesson, recoveringActionPointsUpdates);
    nextHistoryResultIndex++;
  }

  return {
    nextHistoryResultIndex,
    updates: [
      ...consumeRemainingCardUsageCountUpdates,
      ...usedCardPlacementUpdates,
      ...costConsumptionUpdates,
      ...totalCardUsageCountUpdates,
      ...effectActivationUpdates,
      ...recoveringActionPointsUpdates,
    ],
  };
};

/**
 * ターン終了時の各種効果を発動する
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

  const idolParameterKind = getIdolParameterKindOnTurn(lesson);

  //
  // Pアイテム起因の、ターン終了時の効果発動
  //
  let producerItemUpdates: LessonUpdateQuery[] = [];
  for (const producerItem of newLesson.idol.producerItems) {
    if (canActivateProducerItem(newLesson, producerItem, { kind: "turnEnd" })) {
      const diffs = activateEffectsOfProducerItem(
        newLesson,
        producerItem,
        params.getRandom,
        params.idGenerator,
      );
      const innerUpdates = diffs.map((diff) =>
        createLessonUpdateQueryFromDiff(diff, {
          kind: "turnEnd.producerItemEffectActivation",
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex: nextHistoryResultIndex,
        }),
      );
      if (innerUpdates.length > 0) {
        newLesson = patchDiffs(newLesson, innerUpdates);
        producerItemUpdates = [...producerItemUpdates, ...innerUpdates];
        nextHistoryResultIndex++;
        if (isScoreSatisfyingPerfect(newLesson)) {
          break;
        }
      }
    }
  }

  //
  // 状態修正起因の、ターン終了時の効果発動
  //
  let modifierUpdates: LessonUpdateQuery[] = [];
  if (!isScoreSatisfyingPerfect(newLesson)) {
    for (const modifier of newLesson.idol.modifiers) {
      let innerUpdates: LessonUpdateQuery[] = [];
      if (
        modifier.kind === "reactiveEffect" &&
        validateQueryOfReactiveEffectTrigger(modifier.trigger, {
          kind: "turnEnd",
          idolParameterKind,
        })
      ) {
        const diffs = activateEffectIf(
          newLesson,
          modifier.effect,
          params.getRandom,
          params.idGenerator,
        );
        if (diffs) {
          innerUpdates = diffs.map((diff) =>
            createLessonUpdateQueryFromDiff(diff, {
              kind: "turnEnd.modifierEffectActivation",
              historyTurnNumber: lesson.turnNumber,
              historyResultIndex: nextHistoryResultIndex,
            }),
          );
        }
      }
      if (innerUpdates.length > 0) {
        newLesson = patchDiffs(newLesson, innerUpdates);
        modifierUpdates = [...modifierUpdates, ...innerUpdates];
        nextHistoryResultIndex++;
        if (isScoreSatisfyingPerfect(newLesson)) {
          break;
        }
      }
    }
  }

  return {
    updates: [...producerItemUpdates, ...modifierUpdates],
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

  const positiveImpression = lesson.idol.modifiers.find(
    (e) => e.kind === "positiveImpression",
  );
  if (positiveImpression) {
    const idolParameterKind = getIdolParameterKindOnTurn(lesson);
    const scoreBonus =
      lesson.idol.scoreBonus !== undefined
        ? lesson.idol.scoreBonus[idolParameterKind]
        : undefined;
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
    const diffs = calculatePerformingScoreEffect(
      lesson.idol,
      scoreBonus,
      remainingIncrementableScore,
      { value: positiveImpression.amount },
    );
    updates = [
      ...updates,
      ...diffs.map((diff) =>
        createLessonUpdateQueryFromDiff(diff, {
          kind: "turnEnd.scoreIncreaseDueToPositiveImpression",
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex,
        }),
      ),
    ];
  }

  return {
    nextHistoryResultIndex: historyResultIndex + 1,
    updates,
  };
};
