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
import { getIdolDataById, IdolDataId } from "./data/idols";
import { metaModifierDictioanry } from "./data/modifiers";
import { getProducerItemDataById } from "./data/producer-items";
import {
  ActionCost,
  Card,
  CardContentData,
  CardData,
  CardEnhancement,
  Drink,
  Effect,
  Encouragement,
  GetRandom,
  IdGenerator,
  Idol,
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
  CharacterData,
  CurrentTurnDetails,
} from "./types";
import { shuffleArray } from "./utils";

/** ターン開始時の手札数 */
export const handSizeOnLessonStart = 3;

/** 手札の最大枚数 */
export const maxHandSize = 5;

/** ターンスキップにより回復する体力の値 */
export const lifeRecoveredBySkippingTurn = 2;

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
  const contents = getCardContentDataList(card.data);
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
  return producerItem.data.enhanced !== undefined && producerItem.enhanced
    ? producerItem.data.enhanced
    : producerItem.data.base;
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

/** 状態修正の表示用の代表的な値を返す */
export const getDisplayedRepresentativeModifierValue = <
  ModifierLike extends ModifierData,
>(
  modifier: ModifierLike,
): number | undefined => {
  const { displayedRepresentativeValuePropertyName } =
    metaModifierDictioanry[modifier.kind];
  switch (displayedRepresentativeValuePropertyName) {
    case "amount":
      return displayedRepresentativeValuePropertyName in modifier
        ? modifier.amount
        : undefined;
    case "duration":
      return displayedRepresentativeValuePropertyName in modifier
        ? modifier.duration
        : undefined;
    case "fixed1":
      return 1;
    case "times":
      return displayedRepresentativeValuePropertyName in modifier
        ? modifier.times
        : undefined;
    case "value":
      return displayedRepresentativeValuePropertyName in modifier
        ? modifier.value
        : undefined;
    case undefined:
      return undefined;
    default:
      const unreachable: never = displayedRepresentativeValuePropertyName;
      throw new Error(`Unreachable statement`);
  }
};

/**
 * 初期スキルカードセットを生成する
 */
export const createDefaultCardSet = (
  producePlan: ProducePlan,
  idGenerator: IdGenerator,
): Card[] => {
  const defaultCardSetData = getDefaultCardSetData(producePlan);
  return defaultCardSetData.cardDataIds.map((cardDataId) => {
    const cardData = getCardDataById(cardDataId);
    return {
      id: idGenerator(),
      data: cardData,
      enhancements: [],
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
 * レッスンを生成する
 *
 * - initializeGamePlay と比べると、ユニットテストの時にここから呼び出すことが多い
 *   - そのため、 idGenerator や getRandom を使う処理は、可能な限り initializeGamePlay へ移動するのが好ましい
 */
export const createLesson = (params: {
  cards: Card[];
  clearScoreThresholds?: Lesson["clearScoreThresholds"];
  drinks?: Drink[];
  encouragements?: Encouragement[];
  getRandom?: GetRandom;
  idGenerator: IdGenerator;
  idolDataId: IdolDataId;
  ignoreIdolParameterKindConditionAfterClearing?: Lesson["ignoreIdolParameterKindConditionAfterClearing"];
  life?: Idol["life"];
  maxLife?: CharacterData["maxLife"];
  memoryEffects?: MemoryEffect[];
  producerItems: ProducerItem[];
  scoreBonus?: Idol["scoreBonus"];
  turns: Lesson["turns"];
}): Lesson => {
  const getRandom = params.getRandom ? params.getRandom : Math.random;
  const idolData = getIdolDataById(params.idolDataId);
  const characterData = getCharacterDataById(idolData.characterId);
  const maxLife = params.maxLife ?? characterData.maxLife;
  const life = params.life ? Math.min(params.life, maxLife) : maxLife;
  const clearScoreThresholds =
    params.clearScoreThresholds !== undefined
      ? params.clearScoreThresholds
      : undefined;
  const encouragements = params.encouragements ?? [];
  const ignoreIdolParameterKindConditionAfterClearing =
    params.ignoreIdolParameterKindConditionAfterClearing ?? false;
  const memoryEffects = params.memoryEffects ?? [];
  return {
    cards: params.cards,
    clearScoreThresholds,
    deck: shuffleArray(
      params.cards.map((card) => card.id),
      getRandom,
    ),
    discardPile: [],
    encouragements,
    hand: [],
    idol: {
      actionPoints: 0,
      data: idolData,
      drinks: params.drinks ?? [],
      life,
      maxLife,
      modifierIdsAtTurnStart: [],
      modifiers: [],
      producerItems: params.producerItems,
      scoreBonus: params.scoreBonus,
      totalCardUsageCount: 0,
      vitality: 0,
    },
    ignoreIdolParameterKindConditionAfterClearing,
    memoryEffects,
    turns: params.turns,
    removedCardPile: [],
    handWhenEmptyDeck: [],
    score: 0,
    turnNumber: 0,
    turnEnded: false,
    remainingTurnsChange: 0,
  };
};

/**
 * ターン追加を考慮した、実際の最終ターンまでのリストを生成する
 *
 * - 「ターン追加」により追加したターンは、元の最終ターンのパラメータ種別をコピーする
 */
export const createActualTurns = (lesson: Lesson): IdolParameterKind[] => {
  const lastTurn = lesson.turns[lesson.turns.length - 1];
  return [
    ...lesson.turns,
    ...new Array(lesson.remainingTurnsChange).fill(lastTurn),
  ];
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

export const createCurrentTurnDetails = (
  lesson: Lesson,
): CurrentTurnDetails => {
  const pastTurns = lesson.turnNumber - 1;
  const originalTurns = lesson.turns.length;
  const remainingOriginalTurns = Math.max(originalTurns - pastTurns, 0);
  const additionalTurns = lesson.remainingTurnsChange;
  const remainingAdditionalTurns =
    additionalTurns - Math.max(pastTurns - originalTurns, 0);
  return {
    additionalTurns,
    idolParameterKind: getIdolParameterKindOnTurn(lesson),
    originalTurns,
    remainingTurns: remainingOriginalTurns + remainingAdditionalTurns,
    remainingAdditionalTurns,
    remainingOriginalTurns,
    turnNumber: lesson.turnNumber,
  };
};

/**
 * 状態修正による補正を適用したコストへ変換して返す
 *
 * - 現状では、「消費体力減少」「消費体力増加」「消費体力削減」を反映したコストを返す
 * - スキルカード使用時のみこの影響を受ける、その他のPアイテム・Pドリンク・トラブルなどは影響を受けない
 *   - Pアイテムの「消費体力減少」「消費体力削減」が影響を受けないことのみ仕様確認済み、他はそこからの推測
 *     - 仕様確認Issue: https://github.com/kjirou/gakumas-core/issues/141
 *     - 仕様確認Issue: https://github.com/kjirou/gakumas-core/issues/144
 */
export const calculateModifierEffectedActionCost = (
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
 * 次のスキルカード使用で消費する doubleEffect インスタンスを返す
 *
 * - 論点は以下へまとめている
 *   -　Issue: https://github.com/kjirou/gakumas-core/issues/112
 * - 優先順位は、duration 値が少ない > duration の設定がある > duration の設定がない
 */
export const findPrioritizedDoubleEffectModifier = (
  cardSummaryKind: CardData["cardSummaryKind"],
  modifiers: Modifier[],
): Extract<Modifier, { kind: "doubleEffect" }> | undefined => {
  const doubleEffects = modifiers
    // これだけで filter を独立しないと、型を狭められない
    .filter((e) => e.kind === "doubleEffect")
    .filter(
      (e) =>
        e.cardSummaryKind === undefined ||
        e.cardSummaryKind === cardSummaryKind,
    )
    .slice()
    .sort((a, b) => {
      const aScore = a.duration ?? 999999999;
      const bScore = b.duration ?? 999999999;
      return aScore < bScore ? -1 : 0;
    });
  return doubleEffects[0];
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
      case "drinks.removal": {
        newLesson = {
          ...newLesson,
          idol: {
            ...newLesson.idol,
            drinks: newLesson.idol.drinks.filter(
              (drink) => drink.id !== update.id,
            ),
          },
        };
        break;
      }
      case "handWhenEmptyDeck": {
        newLesson = {
          ...newLesson,
          handWhenEmptyDeck: update.cardIds,
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
      case "modifiers.addition": {
        newLesson = {
          ...newLesson,
          idol: {
            ...newLesson.idol,
            // 新規追加で負の値が入ることは想定していない
            modifiers: [...newLesson.idol.modifiers, update.actual],
          },
        };
        break;
      }
      case "modifiers.update": {
        const targetedModifier = newLesson.idol.modifiers.find(
          (e) => e.id === update.id,
        );
        if (targetedModifier === undefined) {
          throw new Error(`Targeted modifier not found: ${update.id}`);
        }
        let newTargetedModifier: Modifier;
        let newValue: number = 0;
        switch (update.propertyNameKind) {
          case "amount":
            if ("amount" in targetedModifier) {
              newValue = targetedModifier.amount + update.actual;
              newTargetedModifier = {
                ...targetedModifier,
                amount: newValue,
              };
            }
            break;
          case "delay":
            if ("delay" in targetedModifier) {
              newValue = targetedModifier.delay + update.actual;
              newTargetedModifier = {
                ...targetedModifier,
                delay: newValue,
              };
            }
            break;
          case "duration":
            if (
              "duration" in targetedModifier &&
              targetedModifier.duration !== undefined
            ) {
              newValue = targetedModifier.duration + update.actual;
              newTargetedModifier = {
                ...targetedModifier,
                duration: newValue,
              };
            }
            break;
          case "times":
            if ("times" in targetedModifier) {
              newValue = targetedModifier.times + update.actual;
              newTargetedModifier = {
                ...targetedModifier,
                times: newValue,
              };
            }
            break;
          case "value":
            if ("value" in targetedModifier) {
              newValue = targetedModifier.value + update.actual;
              newTargetedModifier = {
                ...targetedModifier,
                value: newValue,
              };
            }
            break;
          default:
            const unreachable: never = update.propertyNameKind;
            throw new Error(`Unreachable statement`);
        }
        newLesson = {
          ...newLesson,
          idol: {
            ...newLesson.idol,
            modifiers:
              newValue === 0
                ? newLesson.idol.modifiers.filter(
                    (modifier) => modifier.id !== newTargetedModifier.id,
                  )
                : newLesson.idol.modifiers.map((modifier) =>
                    modifier.id === newTargetedModifier.id
                      ? newTargetedModifier
                      : modifier,
                  ),
          },
        };
        break;
      }
      case "modifiers.removal": {
        newLesson = {
          ...newLesson,
          idol: {
            ...newLesson.idol,
            modifiers: newLesson.idol.modifiers.filter(
              (e) => e.id !== update.id,
            ),
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
      case "remainingTurnsChange": {
        newLesson = {
          ...newLesson,
          remainingTurnsChange: newLesson.remainingTurnsChange + update.amount,
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
      case "turnEnded": {
        newLesson = {
          ...newLesson,
          turnEnded: update.value,
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

/**
 * 更新差分を走査して、上昇した状態修正種別リストを返す
 */
export const scanIncreasedModifierKinds = (
  beforeModifiers: Modifier[],
  diffs: LessonUpdateDiff[],
): Array<ModifierData["kind"]> => {
  const increasedModifierKinds = new Set<ModifierData["kind"]>();
  for (const diff of diffs) {
    if (diff.kind === "modifiers.addition") {
      increasedModifierKinds.add(diff.actual.kind);
    } else if (diff.kind === "modifiers.update") {
      if (diff.actual > 0) {
        const modifier = beforeModifiers.find((e) => e.id === diff.id);
        if (modifier !== undefined) {
          increasedModifierKinds.add(modifier.kind);
        }
      }
    }
  }
  return Array.from(increasedModifierKinds);
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
