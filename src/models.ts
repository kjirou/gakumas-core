/**
 * ゲームの知識を前提とした共通処理をまとめたモジュール
 */

import {
  compareDeckOrder,
  getCardDataById,
  getCardContentDataList,
} from "./data/cards";
import { getDefaultCardSetData } from "./data/card-sets";
import { getCharacterDataById } from "./data/characters";
import { getIdolDataById } from "./data/idols";
import { getProducerItemDataById } from "./data/producer-items";
import {
  ActionCost,
  Card,
  CardContentData,
  CardEnhancement,
  CardInProduction,
  Effect,
  Encouragement,
  GetRandom,
  IdGenerator,
  Idol,
  IdolData,
  IdolInProduction,
  IdolParameterKind,
  Lesson,
  GamePlay,
  LessonUpdateQuery,
  LessonUpdateDiff,
  LessonUpdateQueryReason,
  MemoryEffect,
  Modifier,
  ModifierData,
  ProducePlan,
  ProducerItem,
  ProducerItemContentData,
  ProducerItemInProduction,
} from "./types";
import { shuffleArray } from "./utils";

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

export const getCardContentData = (card: Card): CardContentData => {
  const contents = getCardContentDataList(card.original.data);
  if (card.enhancements.length === 0) {
    return contents[0];
  } else if (card.enhancements.length === 1) {
    return contents[1];
  } else if (card.enhancements.length === 2) {
    return contents[2];
  } else {
    return contents[3];
  }
};

export const getProducerItemContentData = (
  producerItem: ProducerItem,
): ProducerItemContentData => {
  return producerItem.original.data.enhanced !== undefined &&
    producerItem.original.enhanced
    ? producerItem.original.data.enhanced
    : producerItem.original.data.base;
};

/** Pアイテムの残り発動回数を返す */
export const getRemainingProducerItemTimes = (
  producerItem: ProducerItem,
): number | undefined => {
  const producerItemContent = getProducerItemContentData(producerItem);
  return producerItemContent.times === undefined
    ? undefined
    : Math.max(producerItemContent.times - producerItem.activationCount, 0);
};

/** Pアイテムの発動回数が足りているか */
export const isRemainingProducerItemTimes = (
  producerItem: ProducerItem,
): boolean => {
  const remainingTimes = getRemainingProducerItemTimes(producerItem);
  return remainingTimes !== undefined ? remainingTimes > 0 : true;
};

/**
 * 初期スキルカードセットを生成する
 */
export const createDefaultCardSet = (
  producePlan: ProducePlan,
  idGenerator: IdGenerator,
): CardInProduction[] => {
  const defaultCardSetData = getDefaultCardSetData(producePlan);
  return defaultCardSetData.cardDataIds.map((cardDataId) => {
    const cardData = getCardDataById(cardDataId);
    return {
      id: idGenerator(),
      data: cardData,
      enhanced: false,
    };
  });
};

/**
 * プロデュースアイドルを生成する
 *
 * @param params.additionalCards アイドル固有に加えて、追加するスキルカードリスト
 * @param params.additionalProducerItems アイドル固有に加えて、追加するPアイテムリスト
 * @param params.deck 山札全体を明示的に指定する。アイドル固有を生成しないなど本来の処理を通さない。テスト用。
 * @param params.producerItems Pアイテム全体を指定する。アイドル固有を生成しないなど本来の処理を通さない。テスト用。
 * @param params.specialTrainingLevel 特訓段階
 * @param params.talentAwakeningLevel 才能開花段階
 */
export const createIdolInProduction = (params: {
  additionalCards?: CardInProduction[];
  additionalProducerItems?: ProducerItemInProduction[];
  deck?: CardInProduction[];
  idGenerator: IdGenerator;
  idolDataId: IdolData["id"];
  life?: IdolInProduction["life"];
  producerItems?: ProducerItemInProduction[];
  specialTrainingLevel: number;
  talentAwakeningLevel: number;
}): IdolInProduction => {
  const idolData = getIdolDataById(params.idolDataId);
  const characterData = getCharacterDataById(idolData.characterId);
  const specificCardData = getCardDataById(idolData.specificCardId);
  const specificProducerItemData = getProducerItemDataById(
    idolData.specificProducerItemId,
  );
  const deck =
    params.deck ??
    [
      {
        id: params.idGenerator(),
        data: specificCardData,
        enhanced: params.specialTrainingLevel >= 3,
      },
      ...(params.additionalCards ?? []),
    ].sort((a, b) => compareDeckOrder(a.data, b.data));
  const producerItems = params.producerItems ?? [
    {
      id: params.idGenerator(),
      data: specificProducerItemData,
      enhanced: params.talentAwakeningLevel >= 2,
    },
    ...(params.additionalProducerItems ?? []),
  ];
  return {
    deck,
    data: idolData,
    life: params.life
      ? Math.min(params.life, characterData.maxLife)
      : characterData.maxLife,
    maxLife: characterData.maxLife,
    producerItems,
  };
};

const createIdol = (params: {
  idolInProduction: IdolInProduction;
  scoreBonus?: Idol["scoreBonus"];
}): Idol => {
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
    scoreBonus: params.scoreBonus,
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
 * ゲームプレイのインスタンスを作成する
 *
 * @param params.idGenerator createIdolInProduction で使用した関数と同じものを渡す
 */
export const createGamePlay = (params: {
  clearScoreThresholds?: Lesson["clearScoreThresholds"];
  encouragements?: Encouragement[];
  getRandom?: GetRandom;
  idGenerator: IdGenerator;
  idolInProduction: IdolInProduction;
  ignoreIdolParameterKindConditionAfterClearing?: Lesson["ignoreIdolParameterKindConditionAfterClearing"];
  memoryEffects?: MemoryEffect[];
  scoreBonus?: Idol["scoreBonus"];
  turns: Lesson["turns"];
}): GamePlay => {
  const clearScoreThresholds =
    params.clearScoreThresholds !== undefined
      ? params.clearScoreThresholds
      : undefined;
  const getRandom = params.getRandom ? params.getRandom : Math.random;
  const cards = prepareCardsForLesson(params.idolInProduction.deck);
  const encouragements = params.encouragements ?? [];
  const ignoreIdolParameterKindConditionAfterClearing =
    params.ignoreIdolParameterKindConditionAfterClearing ?? false;
  const memoryEffects = params.memoryEffects ?? [];
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
      encouragements,
      hand: [],
      idol: createIdol({
        idolInProduction: params.idolInProduction,
        scoreBonus: params.scoreBonus,
      }),
      ignoreIdolParameterKindConditionAfterClearing,
      memoryEffects,
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
 * ターン追加を考慮した、実際の最終ターンまでのリストを生成する
 *
 * - 「ターン追加」により追加したターンは、元の最終ターンのパラメータ種別をコピーする
 */
export const createActualTurns = (lesson: Lesson): IdolParameterKind[] => {
  const lastTurn = lesson.turns[lesson.turns.length - 1];
  return [...lesson.turns, ...new Array(lesson.remainingTurns).fill(lastTurn)];
};

/**
 * 現在のターンのアイドルパラメータ種別を返す
 *
 * - 0ターン目は1ターン目の値を返す
 */
export const getIdolParameterKindOnTurn = (
  lesson: Lesson,
): IdolParameterKind => {
  const turns = createActualTurns(lesson);
  return lesson.turnNumber === 0 ? turns[0] : turns[lesson.turnNumber - 1];
};

/** 残りターン数を計算する、最終ターンは1 */
export const calculateRemainingTurns = (lesson: Lesson): number =>
  createActualTurns(lesson).length - lesson.turnNumber + 1;

/** 「消費体力減少」・「消費体力削減」・「消費体力増加」を反映したコストを返す */
export const calculateActualActionCost = (
  cost: ActionCost,
  modifiers: ModifierData[],
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
 * レッスン更新差分を適用した結果のレッスンを返す
 *
 * - Redux の Action のような、単純な setter の塊
 *   - ロジックはなるべく含まない
 *     - 例えば、バリデーションや閾値処理などは、更新差分を生成する際に行う
 */
export const patchDiffs = <LessonUpdateDiffLike extends LessonUpdateDiff>(
  lesson: Lesson,
  diffs: LessonUpdateDiffLike[],
): Lesson => {
  let newLesson = lesson;
  for (const update of diffs) {
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
      case "cards.addition": {
        newLesson = {
          ...newLesson,
          cards: [...newLesson.cards, update.card],
        };
        break;
      }
      case "cards.enhancement.effect": {
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
      case "cards.enhancement.lessonSupport": {
        newLesson = {
          ...newLesson,
          cards: newLesson.cards.map((card) => {
            let newCard = card;
            for (const target of update.targets) {
              if (target.cardId === card.id) {
                newCard = {
                  ...newCard,
                  enhancements: [
                    ...newCard.enhancements,
                    ...new Array<CardEnhancement>(
                      target.supportCardIds.length,
                    ).fill({ kind: "lessonSupport" }),
                  ],
                };
              }
            }
            return newCard;
          }),
        };
        break;
      }
      case "cards.removingLessonSupports": {
        newLesson = {
          ...newLesson,
          cards: newLesson.cards.map((card) => {
            if (!update.cardIds.includes(card.id)) {
              return card;
            }
            return {
              ...card,
              enhancements: card.enhancements.filter(
                (enhancement) => enhancement.kind !== "lessonSupport",
              ),
            };
          }),
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
            case "effectActivationOnTurnEnd":
            case "effectActivationBeforeCardEffectActivation": {
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
            // "effectActivationOnTurnEnd" や "effectActivationBeforeCardEffectActivation" など、数値を持たないものは永続なので、削除しない
            .filter(
              (modifier) =>
                !("amount" in modifier && modifier.amount === 0) &&
                !("delay" in modifier && modifier.delay === 0) &&
                !("duration" in modifier && modifier.duration === 0) &&
                !("times" in modifier && modifier.times === 0) &&
                !("value" in modifier && modifier.value === 0),
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

/** 次のレッスン履歴インデックスを返す */
export const getNextHistoryResultIndex = (
  updates: LessonUpdateQuery[],
): LessonUpdateQueryReason["historyResultIndex"] => {
  const lastUpdate = updates[updates.length - 1];
  return lastUpdate ? lastUpdate.reason.historyResultIndex + 1 : 1;
};

/**
 * 新旧の更新クエリリストの差分を返す
 *
 * - 主に、最後の行動で発行された更新クエリリストの抽出に使う
 */
export const diffUpdates = (
  previous: LessonUpdateQuery[],
  current: LessonUpdateQuery[],
) => current.slice(previous.length);
