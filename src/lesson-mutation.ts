import type {
  ActionCost,
  Card,
  CardContentDefinition,
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
  VitalityUpdateQuery,
} from "./types";
import { filterGeneratableCardsData } from "./data/card";
import {
  calculateActualActionCost,
  calculateActualRemainingTurns,
  calculateClearScoreProgress,
  handSizeOnLessonStart,
  isDelayedEffectModifierType,
  isDrawCardsEffectType,
  isEnhanceHandEffectType,
  isPerformEffectType,
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

const getCardContentDefinition = (card: Card): CardContentDefinition => {
  return card.original.definition.enhanced !== undefined &&
    card.enhancements.length > 0
    ? card.original.definition.enhanced
    : card.original.definition.base;
};

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
  deck: Array<Card["id"]>;
  discardPile: Array<Card["id"]>;
  drawnCards: Array<Card["id"]>;
} => {
  let newDeck = [...deck];
  let newDiscardPile = [...discardPile];
  let drawnCards = [];
  for (let i = 0; i < count; i++) {
    // 捨札を加えても引く数に足りない状況は考慮しない
    if (newDeck.length === 0) {
      newDeck = shuffleArray(newDiscardPile, getRandom);
      newDiscardPile = [];
    }
    const drawnCard = newDeck.shift();
    if (!drawnCard) {
      throw new Error("Unexpected empty deck");
    }
    drawnCards.push(drawnCard);
  }
  return {
    deck: newDeck,
    discardPile: newDiscardPile,
    drawnCards,
  };
};

/**
 * スキルカードを手札へ加える
 *
 * - 山札から引いた時、レッスン開始時手札を引く時、生成した時、などに使う
 * - 手札が最大枚数の5枚に達した以降は、引いたスキルカードは手札へ加えずに捨札へ移動する
 * - TODO: [仕様確認] 最大手札数は本当に5枚か？
 * - TODO: [仕様確認] 最大手札数を超えて引いた時の捨札へ直行する挙動自体、記憶によるとなので本当かわからない
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

/** アイドルがコスト分のリソースを持つかを検証する */
export const validateCostComsumution = (
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
  const costValidation = validateCostComsumution(lesson.idol, cost);
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

/** 各効果が適用できるかを判定する */
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
      return calculateActualRemainingTurns(lesson) <= condition.max;
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

const calculateActualAndMaxComsumution = (
  resourceValue: number,
  costValue: number,
) => {
  return {
    actual: costValue > resourceValue ? -resourceValue : -costValue,
    max: -costValue,
    restCost: resourceValue > costValue ? 0 : costValue - resourceValue,
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
 * - 消費分のコストは足りる前提で呼び出す
 */
const calculateCostConsumption = (
  idol: Idol,
  cost: ActionCost,
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
          actual: result.actual,
          max: result.max,
        });
      }
      if (restCost > 0) {
        const result = calculateActualAndMaxComsumution(idol.life, restCost);
        updates.push({
          kind: "life",
          actual: result.actual,
          max: result.max,
        });
      }
      return updates;
    }
    case "life": {
      return [
        {
          kind: "life",
          actual: -cost.value,
          max: -cost.value,
        },
      ];
    }
    case "focus":
    case "motivation":
    case "positiveImpression": {
      return [
        {
          kind: "modifier",
          modifier: {
            kind: cost.kind,
            amount: cost.value,
          },
        },
      ];
    }
    case "goodCondition": {
      return [
        {
          kind: "modifier",
          modifier: {
            kind: cost.kind,
            duration: cost.value,
          },
        },
      ];
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

export const calculatePerformingVitalityEffect = (
  idol: Idol,
  query: VitalityUpdateQuery,
): Extract<LessonUpdateQueryDiff, { kind: "vitality" }> => {
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
 * 効果リストを計算して更新差分リストを返す
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
): LessonUpdateQueryDiff[] => {
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
  for (const effect of effects) {
    //
    // 効果別の適用条件判定
    //
    if (effect.condition) {
      if (!canApplyEffect(lesson, effect.condition)) {
        continue;
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
        let modifier: Modifier = effect.modifier;
        if (isDelayedEffectModifierType(modifier)) {
          modifier = {
            ...modifier,
            id: idGenerator(),
          };
        }
        diffs.push({
          kind: "modifier",
          modifier,
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
          diffs.push({
            kind: "modifier",
            modifier: {
              kind: "positiveImpression",
              amount:
                Math.ceil(modifier.amount * effect.multiplier) -
                modifier.amount,
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
        const score = Math.ceil(
          (lesson.idol.vitality * effect.percentage) / 100,
        );
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
    diffs = activateEffects(lesson, [modifier.effect], getRandom, idGenerator);
  }
  diffs = [
    ...diffs,
    {
      kind: "modifier",
      modifier: {
        ...modifier,
        delay: -1,
        id: modifier.id,
      },
    },
  ];
  return diffs;
};

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
  // 手札を引く
  //
  let drawCardsInHandUpdates: LessonUpdateQuery[] = [];
  if (remainingDrawCount > 0) {
    drawCardsInHandUpdates = activateEffects(
      newLesson,
      [{ kind: "drawCards", amount: remainingDrawCount }],
      params.getRandom,
      () => "",
    ).map((diff) =>
      createLessonUpdateQueryFromDiff(diff, {
        kind: "turnStartTrigger",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex,
      }),
    );
    newLesson = patchUpdates(newLesson, drawCardsInHandUpdates);
    nextHistoryResultIndex++;
  }

  return {
    updates: [...drawInnateCardsUpdates, ...drawCardsInHandUpdates],
    nextHistoryResultIndex,
  };
};

/**
 * ターン開始時の効果を発動する
 *
 * - TODO: [仕様確認] 状態修正の「次ターン」or「nターン後」 と Pアイテム による発動があるが、その順序が不明。また、おそらくカード引き→カード強化の順にもなってそうで内容によるのかも。
 */
export const activateEffectsOnTurnStart = (
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
  // TODO: Pアイテムによるターン開始時の効果発動
  //

  //
  // 状態修正の「次ターン/nターン後、パラメータ+n」による効果発動
  //
  // - TODO: [仕様確認] 他ふたつの手札関連の発動より先だっけ？
  // - 実装上、元気更新も実行できるが、本家にその効果は存在しない
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
  // 状態修正の「次ターン/nターン後、スキルカードを引く」による効果発動
  //
  // - スキルカードを引く → スキルカードを強化 の順に処理する必要がある
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
  // 状態修正の「次ターン/nターン後、スキルカードを強化」による効果発動
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
 * スキルカードを使用する
 */
export const useCard = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    getRandom: GetRandom;
    idGenerator: IdGenerator;
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
  const hasDoubleEffect =
    lesson.idol.modifiers.find((e) => e.kind === "doubleEffect") !== undefined;
  let newLesson = lesson;
  let nextHistoryResultIndex = historyResultIndex;

  //
  // 使用可否のバリデーション
  //
  // - 本関数は、使用条件を満たさないスキルカードに対しては使えない前提
  //
  if (!canUseCard(lesson, cardContent.cost, cardContent.condition)) {
    throw new Error(`Can not use the card: ${card.original.definition.name}`);
  }

  //
  // 使用した手札を捨札か除外へ移動
  //
  const discardOrRemovedCardUpdates: LessonUpdateQuery[] = [
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
      reason: {
        kind: "cardUsage",
        cardId,
        historyTurnNumber: newLesson.turnNumber,
        historyResultIndex: nextHistoryResultIndex,
      },
    },
  ];
  newLesson = patchUpdates(newLesson, discardOrRemovedCardUpdates);
  nextHistoryResultIndex++;

  //
  // コスト消費
  //
  const costConsumptionUpdates: LessonUpdateQuery[] = calculateCostConsumption(
    newLesson.idol,
    calculateActualActionCost(cardContent.cost, newLesson.idol.modifiers),
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
  for (let times = 1; times <= (hasDoubleEffect ? 2 : 1); times++) {
    //
    // 主効果発動
    //
    let effectActivationUpdatesOnce: LessonUpdateQuery[] = activateEffects(
      newLesson,
      cardContent.effects,
      params.getRandom,
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

    //
    // 「次に使用するスキルカードの効果をもう1回発動」を消費
    //
    if (hasDoubleEffect && times === 1) {
      effectActivationUpdatesOnce = [
        ...effectActivationUpdatesOnce,
        createLessonUpdateQueryFromDiff(
          {
            kind: "modifier",
            modifier: {
              kind: "doubleEffect",
              times: 1,
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

    //
    // 状態修正によるスキルカード使用毎効果発動
    //
    const effectsUponCardUsage = newLesson.idol.modifiers.filter(
      (e) =>
        e.kind === "effectActivationUponCardUsage" &&
        e.cardKind === card.original.definition.cardSummaryKind,
    ) as Array<Extract<Modifier, { kind: "effectActivationUponCardUsage" }>>;
    for (const { effect } of effectsUponCardUsage) {
      effectActivationUpdatesOnce = [
        ...effectActivationUpdatesOnce,
        ...activateEffects(
          newLesson,
          [effect],
          params.getRandom,
          params.idGenerator,
        ).map((diff) =>
          createLessonUpdateQueryFromDiff(diff, {
            kind: "cardUsageTrigger",
            cardId: card.id,
            historyTurnNumber: newLesson.turnNumber,
            historyResultIndex: nextHistoryResultIndex,
          }),
        ),
      ];
    }

    //
    // TODO: Pアイテムのスキルカード使用時に効果発動
    //

    //
    // TODO: Pアイテムのスキルカード使用による状態修正増加時トリガー
    //

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

  return {
    nextHistoryResultIndex,
    updates: [
      ...discardOrRemovedCardUpdates,
      ...costConsumptionUpdates,
      ...effectActivationUpdates,
    ],
  };
};

/**
 * 手札使用のプレビュー表示をするか表示を解除する
 *
 * - コストを満たさない状態でもプレビューはできる
 *   - 足りないコストは、ゼロとして差分表示される
 * - カードを引く効果や「生成」効果など、一部の効果はプレビューできない
 */
export const previewCardUsage = (
  lesson: Lesson,
  historyResultIndex: LessonUpdateQuery["reason"]["historyResultIndex"],
  params: {
    selectedCardInHandIndex: number | undefined;
  },
): LessonMutationResult => {
  return {
    nextHistoryResultIndex: historyResultIndex + 1,
    updates: [
      {
        kind: "selectedCardInHandIndex",
        index: params.selectedCardInHandIndex,
        reason: {
          kind: "cardUsagePreview",
          historyTurnNumber: lesson.turnNumber,
          historyResultIndex,
        },
      },
    ],
  };
};
