/**
 * ゲームの知識を前提とした共通処理をまとめたモジュール
 */

import { compareDeckOrder, getCardDataById } from "./data/cards";
import { getDefaultCardSetData } from "./data/card-sets";
import { getCharacterDataById } from "./data/characters";
import { getIdolDataById } from "./data/idols";
import { getProducerItemDataById } from "./data/producer-items";
import {
  ActionCost,
  Card,
  CardContentDefinition,
  CardInProduction,
  CardSetDefinition,
  Effect,
  GetRandom,
  IdGenerator,
  Idol,
  IdolDefinition,
  IdolInProduction,
  IdolParameterKind,
  Lesson,
  LessonGamePlay,
  LessonUpdateQuery,
  Modifier,
  ModifierDefinition,
  ProducePlan,
  ProducerItem,
  ProducerItemContentDefinition,
  ProducerItemInProduction,
} from "./types";
import { createIdGenerator, shuffleArray } from "./utils";

/** ターン開始時の手札数 */
export const handSizeOnLessonStart = 3;

/** 手札の最大枚数 */
export const maxHandSize = 5;

export const isDelayedEffectModifierType = (
  modifier: Modifier,
): modifier is Extract<Modifier, { kind: "delayedEffect" }> =>
  modifier.kind === "delayedEffect";

export const isDrawCardsEffectType = (
  effect: Effect,
): effect is Extract<Effect, { kind: "drawCards" }> =>
  effect.kind === "drawCards";

export const isEnhanceHandEffectType = (
  effect: Effect,
): effect is Extract<Effect, { kind: "enhanceHand" }> =>
  effect.kind === "enhanceHand";

export const isPerformEffectType = (
  effect: Effect,
): effect is Extract<Effect, { kind: "perform" }> => effect.kind === "perform";

export const getCardContentDefinition = (card: Card): CardContentDefinition => {
  return card.original.definition.enhanced !== undefined &&
    card.enhancements.length > 0
    ? card.original.definition.enhanced
    : card.original.definition.base;
};

export const getProducerItemContentDefinition = (
  producerItem: ProducerItem,
): ProducerItemContentDefinition => {
  return producerItem.original.definition.enhanced !== undefined &&
    producerItem.original.enhanced
    ? producerItem.original.definition.enhanced
    : producerItem.original.definition.base;
};

/** Pアイテムの使用回数が足りているか */
export const isRemainingProducerItemTimes = (
  producerItem: ProducerItem,
): boolean => {
  const producerItemContent = getProducerItemContentDefinition(producerItem);
  return (
    producerItemContent.times === undefined ||
    producerItem.activationCount < producerItemContent.times
  );
};

/**
 * 初期スキルカードセットを生成する
 *
 * - TODO: 引数から強化済みスキルカードを指定できるようにする、才能開花4用
 */
const createDefaultCardSet = (
  producePlan: ProducePlan,
  idGenerator: IdGenerator,
): CardInProduction[] => {
  const defaultCardSetDefinition = getDefaultCardSetData(producePlan);
  return defaultCardSetDefinition.cardDefinitionIds.map((cardDefinitionId) => {
    const cardDefinition = getCardDataById(cardDefinitionId);
    return {
      id: idGenerator(),
      definition: cardDefinition,
      enhanced: false,
      enabled: true,
    };
  });
};

/**
 * プロデュースアイドルを生成する
 *
 * @param param.deck 山札全体を明示的に指定し、キャラクター固有を生成しないなど本来の処理を通さない。テスト用。
 * @param param.producerItems Pアイテム全体を指定し、キャラクター固有を生成しないなど本来の処理を通さない。テスト用。
 * @param param.specialTrainingLevel 特訓段階
 * @param param.talentAwakeningLevel 才能開花段階
 */
export const createIdolInProduction = (params: {
  deck?: CardInProduction[];
  idGenerator: IdGenerator;
  idolDefinitionId: IdolDefinition["id"];
  producerItems?: ProducerItemInProduction[];
  specialTrainingLevel: number;
  talentAwakeningLevel: number;
}): IdolInProduction => {
  const idolDefinition = getIdolDataById(params.idolDefinitionId);
  const characterDefinition = getCharacterDataById(idolDefinition.characterId);
  const specificCardDefinition = getCardDataById(idolDefinition.specificCardId);
  const specificProducerItemDefinition = getProducerItemDataById(
    idolDefinition.specificProducerItemId,
  );
  // TODO: 才能開花1段階目のランダムスキルカード強化
  const deck =
    params.deck ??
    [
      {
        id: params.idGenerator(),
        definition: specificCardDefinition,
        enhanced: params.specialTrainingLevel >= 3,
        enabled: true,
      },
      ...createDefaultCardSet(idolDefinition.producePlan, params.idGenerator),
    ].sort((a, b) => compareDeckOrder(a.definition, b.definition));
  const producerItems = params.producerItems ?? [
    {
      id: params.idGenerator(),
      definition: specificProducerItemDefinition,
      enhanced: params.talentAwakeningLevel >= 2,
    },
  ];
  return {
    deck,
    definition: idolDefinition,
    life: characterDefinition.maxLife,
    maxLife: characterDefinition.maxLife,
    producerItems,
  };
};

const createIdol = (params: { idolInProduction: IdolInProduction }): Idol => {
  return {
    actionPoints: 0,
    life: params.idolInProduction.life,
    modifierIdsAtTurnStart: [],
    modifiers: [],
    original: params.idolInProduction,
    // TODO: そのレッスン中に使用できる可能性があるPアイテムのみへ絞り込む
    producerItems: prepareProducerItemsForLesson(
      params.idolInProduction.producerItems,
    ),
    totalCardUsageCount: 0,
    vitality: 0,
  };
};

export const prepareCardsForLesson = (
  cardsInProduction: CardInProduction[],
): Card[] => {
  return cardsInProduction.map((cardInProduction) => {
    return {
      id: cardInProduction.id,
      original: cardInProduction,
      enhancements: cardInProduction.enhanced ? [{ kind: "original" }] : [],
    };
  });
};

export const prepareProducerItemsForLesson = (
  producerItemsInProduction: ProducerItemInProduction[],
): ProducerItem[] => {
  return producerItemsInProduction.map((producerItemInProduction) => {
    return {
      activationCount: 0,
      id: producerItemInProduction.id,
      original: producerItemInProduction,
    };
  });
};

/**
 * レッスンのクリアに対するスコア進捗を計算する
 */
export const calculateClearScoreProgress = (
  score: Lesson["score"],
  clearScoreThresholds: NonNullable<Lesson["clearScoreThresholds"]>,
): {
  clearScoreProgressPercentage: number;
  necessaryClearScore: number;
  necessaryPerfectScore: number | undefined;
  remainingClearScore: number;
  remainingPerfectScore: number | undefined;
} => {
  return {
    necessaryClearScore: clearScoreThresholds.clear,
    necessaryPerfectScore: clearScoreThresholds.perfect,
    remainingClearScore: Math.max(0, clearScoreThresholds.clear - score),
    remainingPerfectScore:
      clearScoreThresholds.perfect !== undefined
        ? Math.max(0, clearScoreThresholds.perfect - score)
        : undefined,
    clearScoreProgressPercentage: Math.floor(
      (score * 100) / clearScoreThresholds.clear,
    ),
  };
};

/**
 * スコアがパーフェクトを満たすかを判定する
 *
 * @returns false の場合は、パーフェクトを満たしていないか、パーフェクトの閾値が設定されていない
 */
export const isScoreSatisfyingPerfect = (lesson: Lesson): boolean => {
  return lesson.clearScoreThresholds
    ? calculateClearScoreProgress(lesson.score, lesson.clearScoreThresholds)
        .remainingPerfectScore === 0
    : false;
};

/**
 * レッスンのゲームプレイを初期化する
 *
 * - ここの「レッスン」には、試験・コンテスト・アイドルの道なども含む
 *
 * @param params.idGenerator createIdolInProduction で使用した関数と同じものを渡す
 */
export const createLessonGamePlay = (params: {
  clearScoreThresholds?: Lesson["clearScoreThresholds"];
  idolInProduction: IdolInProduction;
  getRandom?: GetRandom;
  idGenerator: IdGenerator;
  turns: Lesson["turns"];
}): LessonGamePlay => {
  const clearScoreThresholds =
    params.clearScoreThresholds !== undefined
      ? params.clearScoreThresholds
      : undefined;
  const getRandom = params.getRandom ? params.getRandom : Math.random;
  const cards = prepareCardsForLesson(params.idolInProduction.deck);
  return {
    getRandom,
    idGenerator: params.idGenerator,
    initialLesson: {
      cards,
      clearScoreThresholds,
      deck: shuffleArray(
        cards.map((card) => card.id),
        getRandom,
      ),
      discardPile: [],
      hand: [],
      idol: createIdol({
        idolInProduction: params.idolInProduction,
      }),
      turns: params.turns,
      removedCardPile: [],
      playedCardsOnEmptyDeck: [],
      score: 0,
      turnNumber: 0,
      remainingTurns: 0,
    },
    updates: [],
  };
};

/**
 * 現在のターンのアイドルパラメータ種別を返す
 *
 * - 0ターン目は1ターン目の値を返す
 * - 指定したターン番号が存在しない時は、最終ターンの内容を返す
 * - 「ターン追加」による最終ターンの延長時に、最終ターンの内容が継続する仕様を表現したものでもある
 */
export const getIdolParameterKindOnTurn = (
  lesson: Lesson,
): IdolParameterKind => {
  return lesson.turnNumber === 0
    ? lesson.turns[0]
    : lesson.turns[lesson.turnNumber - 1] ||
        lesson.turns[lesson.turns.length - 1];
};
export const calculateLastTurnNumber = (lesson: Lesson): number =>
  lesson.turns.length + lesson.remainingTurns;

/** 残りターン数を計算する、最終ターンは1 */
export const calculateRemainingTurns = (lesson: Lesson): number =>
  calculateLastTurnNumber(lesson) - lesson.turnNumber + 1;

/** 「消費体力減少」・「消費体力削減」・「消費体力増加」を反映したコストを返す */
export const calculateActualActionCost = (
  cost: ActionCost,
  modifiers: ModifierDefinition[],
): ActionCost => {
  switch (cost.kind) {
    case "focus":
    case "motivation":
    case "goodCondition":
    case "positiveImpression": {
      return cost;
    }
    case "life":
    case "normal": {
      const lifeConsumptionReduction = modifiers.find(
        (e) => e.kind === "lifeConsumptionReduction",
      );
      const lifeConsumptionReductionValue =
        lifeConsumptionReduction !== undefined &&
        "value" in lifeConsumptionReduction
          ? lifeConsumptionReduction.value
          : 0;
      const halfLifeConsumption =
        modifiers.find((e) => e.kind === "halfLifeConsumption") !== undefined;
      const hasDoubleLifeConsumption =
        modifiers.find((e) => e.kind === "doubleLifeConsumption") !== undefined;
      let rate = hasDoubleLifeConsumption ? 2 : 1;
      rate = rate / (halfLifeConsumption ? 2 : 1);
      return {
        kind: cost.kind,
        value: Math.max(
          Math.ceil(cost.value * rate) - lifeConsumptionReductionValue,
          0,
        ),
      };
    }
    default: {
      const unreachable: never = cost.kind;
      throw new Error(`Unreachable statement`);
    }
  }
};

/**
 * レッスン更新クエリを適用した結果のレッスンを返す
 *
 * - Redux の Action のような、単純な setter の塊
 *   - ロジックはなるべく含まない
 *     - 例えば、バリデーションや閾値処理などは、更新クエリを生成する際に行う
 */
export const patchUpdates = (
  lesson: Lesson,
  updates: LessonUpdateQuery[],
): Lesson => {
  let newLesson = lesson;
  for (const update of updates) {
    switch (update.kind) {
      case "actionPoints": {
        newLesson = {
          ...newLesson,
          idol: {
            ...newLesson.idol,
            actionPoints: newLesson.idol.actionPoints + update.amount,
          },
        };
        break;
      }
      case "cardEnhancement": {
        newLesson = {
          ...newLesson,
          cards: newLesson.cards.map((card) =>
            update.cardIds.includes(card.id)
              ? {
                  ...card,
                  enhancements: [...card.enhancements, { kind: "effect" }],
                }
              : card,
          ),
        };
        break;
      }
      case "cardPlacement": {
        newLesson = {
          ...newLesson,
          ...(update.deck ? { deck: update.deck } : {}),
          ...(update.discardPile ? { discardPile: update.discardPile } : {}),
          ...(update.hand ? { hand: update.hand } : {}),
          ...(update.removedCardPile
            ? { removedCardPile: update.removedCardPile }
            : {}),
        };
        break;
      }
      case "cards": {
        newLesson = {
          ...newLesson,
          cards: update.cards,
        };
        break;
      }
      case "life": {
        newLesson = {
          ...newLesson,
          idol: {
            ...newLesson.idol,
            life: newLesson.idol.life + update.actual,
          },
        };
        break;
      }
      case "modifier": {
        const updateTargetId = update.actual.updateTargetId;
        let newModifiers = newLesson.idol.modifiers;
        if (updateTargetId === undefined) {
          // 新規追加で負の値が入ることは想定していない
          newModifiers = [...newModifiers, update.actual];
        } else {
          const targetedModifier = newLesson.idol.modifiers.find(
            (e) => e.id === updateTargetId,
          );
          if (targetedModifier === undefined) {
            throw new Error(`Targeted modifier not found: ${updateTargetId}`);
          }
          let newTargetedModifier = targetedModifier;
          const updateModifierKind = update.actual.kind;
          switch (updateModifierKind) {
            // duration の設定もあるが、現在は常に 1 なので無視する
            case "additionalCardUsageCount": {
              if (update.actual.kind === newTargetedModifier.kind) {
                newTargetedModifier = {
                  ...newTargetedModifier,
                  amount: newTargetedModifier.amount + update.actual.amount,
                };
              }
              break;
            }
            case "debuffProtection": {
              if (update.actual.kind === newTargetedModifier.kind) {
                newTargetedModifier = {
                  ...newTargetedModifier,
                  times: newTargetedModifier.times + update.actual.times,
                };
              }
              break;
            }
            case "delayedEffect": {
              if (update.actual.kind === newTargetedModifier.kind) {
                newTargetedModifier = {
                  ...newTargetedModifier,
                  delay: newTargetedModifier.delay + update.actual.delay,
                };
              }
              break;
            }
            // 合算できないので、この既存状態修正を指定した処理を行う時は、常に削除の意味になる
            case "doubleEffect": {
              if (update.actual.kind === newTargetedModifier.kind) {
                newTargetedModifier = {
                  ...newTargetedModifier,
                  times: 0,
                };
              }
              break;
            }
            case "doubleLifeConsumption":
            case "excellentCondition":
            case "goodCondition":
            case "halfLifeConsumption":
            case "mightyPerformance":
            case "noVitalityIncrease": {
              if (update.actual.kind === newTargetedModifier.kind) {
                newTargetedModifier = {
                  ...newTargetedModifier,
                  duration:
                    newTargetedModifier.duration + update.actual.duration,
                };
              }
              break;
            }
            case "focus":
            case "motivation":
            case "positiveImpression": {
              if (update.actual.kind === newTargetedModifier.kind) {
                newTargetedModifier = {
                  ...newTargetedModifier,
                  amount: newTargetedModifier.amount + update.actual.amount,
                };
              }
              break;
            }
            case "lifeConsumptionReduction": {
              if (update.actual.kind === newTargetedModifier.kind) {
                newTargetedModifier = {
                  ...newTargetedModifier,
                  value: newTargetedModifier.value + update.actual.value,
                };
              }
              break;
            }
            // 常に新規追加で、かつ削除できないので、ここを通ることはない
            case "effectActivationAtEndOfTurn":
            case "effectActivationUponCardUsage": {
              throw new Error(
                `Unexpected modifier kind: ${updateModifierKind}`,
              );
            }
            default:
              const unreachable: never = updateModifierKind;
              throw new Error(`Unreachable statement`);
          }
          newModifiers = newModifiers
            .map((modifier) =>
              modifier.id === updateTargetId ? newTargetedModifier : modifier,
            )
            .filter(
              (modifier) =>
                ("amount" in modifier && modifier.amount > 0) ||
                ("delay" in modifier && modifier.delay > 0) ||
                ("duration" in modifier && modifier.duration > 0) ||
                ("times" in modifier && modifier.times > 0) ||
                ("value" in modifier && modifier.value > 0),
            );
        }
        newLesson = {
          ...newLesson,
          idol: {
            ...newLesson.idol,
            modifiers: newModifiers,
          },
        };
        break;
      }
      case "modifierIdsAtTurnStart": {
        newLesson = {
          ...newLesson,
          idol: {
            ...newLesson.idol,
            modifierIdsAtTurnStart: update.modifierIdsAtTurnStart,
          },
        };
        break;
      }
      case "playedCardsOnEmptyDeck": {
        newLesson = {
          ...newLesson,
          playedCardsOnEmptyDeck: update.cardIds,
        };
        break;
      }
      case "producerItem.activationCount": {
        newLesson = {
          ...newLesson,
          idol: {
            ...newLesson.idol,
            producerItems: newLesson.idol.producerItems.map((producerItem) =>
              producerItem.id === update.producerItemId
                ? { ...producerItem, activationCount: update.value }
                : producerItem,
            ),
          },
        };
        break;
      }
      case "remainingTurns": {
        newLesson = {
          ...newLesson,
          remainingTurns: newLesson.remainingTurns + update.amount,
        };
        break;
      }
      case "score": {
        newLesson = {
          ...newLesson,
          score: newLesson.score + update.actual,
        };
        break;
      }
      case "turnNumberIncrease": {
        newLesson = {
          ...newLesson,
          turnNumber: newLesson.turnNumber + 1,
        };
        break;
      }
      case "vitality": {
        newLesson = {
          ...newLesson,
          idol: {
            ...newLesson.idol,
            vitality: newLesson.idol.vitality + update.actual,
          },
        };
        break;
      }
      default: {
        const unreachable: never = update;
        throw new Error(`Unreachable statement`);
      }
    }
  }
  return newLesson;
};
