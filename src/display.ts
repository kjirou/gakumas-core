/**
 * 表示用の情報を生成するモジュール
 */

import type {
  Card,
  CardEffectDisplay,
  CardInHandDisplay,
  CardInInventoryDisplay,
  CardPlayPreviewDisplay,
  DrinkDisplay,
  Effect,
  Encouragement,
  EncouragementDisplay,
  GetRandom,
  ModifierDisplay,
  IdGenerator,
  Lesson,
  LessonDisplay,
  GamePlay,
  LessonUpdateDiff,
  ProducerItemDisplay,
  TurnDisplay,
  Modifier,
  ProducePlan,
  ProducerItem,
} from "./types";
import { compareDeckOrder } from "./data/cards";
import { metaModifierDictioanry } from "./data/modifiers";
import {
  activateEffectsOnCardPlay,
  canPlayCard,
  useCard,
} from "./lesson-mutation";
import {
  calculateModifierEffectedActionCost,
  createActualTurns,
  createCurrentTurnDetails,
  getCardContentData,
  getDisplayedRepresentativeModifierValue,
  getIdolParameterKindOnTurn,
  getProducerItemContentData,
  getRemainingProducerItemTimes,
  lifeRecoveredBySkippingTurn,
  patchDiffs,
} from "./models";
import {
  generateCardName,
  generateCardDescription,
  generateDrinkDescription,
  generateEffectText,
  generateProducerItemDescription,
  generateProducerItemName,
  idolParameterKindNames,
} from "./text-generation";

const generateEffectDisplay = (
  effect: Effect,
  activatable: boolean,
): CardEffectDisplay | undefined => {
  if (effect.kind === "getModifier") {
    return {
      effect,
      kind: `modifier-${effect.modifier.kind}`,
      activatable,
    };
  } else if (effect.kind === "perform") {
    if (effect.condition) {
      if (effect.score) {
        return {
          effect,
          kind: "perform-score",
          activatable,
        };
      } else if (effect.vitality) {
        return {
          effect,
          kind: "perform-vitality",
          activatable,
        };
      }
    }
    return undefined;
  }
  return {
    effect,
    kind: effect.kind,
    activatable: activatable,
  };
};

export const generateCardInHandDisplay = (
  lesson: Lesson,
  cardId: Card["id"],
  getRandom: GetRandom,
  idGenerator: IdGenerator,
): CardInHandDisplay => {
  const card = lesson.cards.find((card) => card.id === cardId);
  if (!card) {
    throw new Error(`Card not found in cards: cardId=${cardId}`);
  }
  const cardContent = getCardContentData(card);
  const effectActivations = activateEffectsOnCardPlay(
    lesson,
    cardContent.effects,
    getRandom,
    idGenerator,
  );
  const effectDiffs = effectActivations.reduce<LessonUpdateDiff[]>(
    (acc, effectActivation) =>
      effectActivation ? [...acc, ...effectActivation] : acc,
    [],
  );
  let scores: CardInHandDisplay["scores"] = [];
  for (const effectActivation of effectActivations) {
    // score と vitality が同時に含まれていることがあるのに注意
    if (effectActivation) {
      const scoreDiffs = effectActivation.filter((e) => e.kind === "score");
      if (scoreDiffs.length > 0) {
        scores = [
          ...scores,
          {
            // 1回の効果発動で複数回スコアが上がる時は、全てのスコアの値は同じになる前提
            value: scoreDiffs[0].max,
            times: scoreDiffs.length,
          },
        ];
      }
    }
  }
  let vitality: CardInHandDisplay["vitality"] = undefined;
  const firstVitalityUpdate = effectDiffs.find((e) => e.kind === "vitality");
  if (firstVitalityUpdate) {
    vitality = firstVitalityUpdate.max;
  }
  let effectDisplays: CardInHandDisplay["effects"] = [];
  for (const [effectIndex, effect] of cardContent.effects.entries()) {
    const activatable = effectActivations[effectIndex] !== undefined;
    const effectDisplay = generateEffectDisplay(effect, activatable);
    if (effectDisplay) {
      effectDisplays = [...effectDisplays, effectDisplay];
    }
  }
  return {
    cost: calculateModifierEffectedActionCost(
      cardContent.cost,
      lesson.idol.modifiers,
    ),
    effects: effectDisplays,
    enhancements: card.enhancements,
    name: generateCardName(card.data.name, card.enhancements.length),
    playable: canPlayCard(lesson, cardContent.cost, cardContent.condition),
    rarity: card.data.rarity,
    scores,
    vitality,
  };
};

const generateCardInInventoryDisplay = (card: Card): CardInInventoryDisplay => {
  const cardContent = getCardContentData(card);
  const effectDisplays = cardContent.effects
    .map((e) => generateEffectDisplay(e, true))
    .filter((e) => e !== undefined);
  return {
    ...card,
    effects: effectDisplays,
    name: generateCardName(card.data.name, card.enhancements.length),
    description: generateCardDescription({
      cost: cardContent.cost,
      condition: cardContent.condition,
      effects: cardContent.effects,
      innate: cardContent.innate,
      nonDuplicative: card.data.nonDuplicative,
      usableOncePerLesson: cardContent.usableOncePerLesson,
    }),
  };
};

export const generateCardInInventoryDisplays = (
  allCards: Card[],
  pile: Array<Card["id"]>,
): CardInInventoryDisplay[] => {
  return pile
    .map((cardId) => {
      const card = allCards.find((e) => e.id === cardId);
      if (!card) {
        throw new Error(`Card with id ${cardId} not found in allCards`);
      }
      return generateCardInInventoryDisplay(card);
    })
    .sort((a, b) => compareDeckOrder(a.data, b.data));
};

export const generateProducerItemDisplays = (
  producerItems: ProducerItem[],
): ProducerItemDisplay[] => {
  return producerItems.map((producerItem) => {
    const producerItemContent = getProducerItemContentData(producerItem);
    const name = generateProducerItemName(
      producerItem.data.name,
      producerItem.enhanced,
    );
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
 * 状態修正の表示用情報を生成する
 *
 * @param beforeModifier false は前の状態修正との差分計算を行わない。 undefined は前の状態修正と比較はするが対象がないことを意味する、つまり追加の意味になる。
 */
const generateModifierDisplay = (
  modifier: Modifier,
  beforeModifier: Modifier | undefined | false,
) => {
  let representativeValue = getDisplayedRepresentativeModifierValue(modifier);
  let change: ModifierDisplay["change"] = undefined;
  if (beforeModifier) {
    const beforeModifierRepresentativeValue =
      getDisplayedRepresentativeModifierValue(beforeModifier);
    if (
      representativeValue !== undefined &&
      beforeModifierRepresentativeValue !== undefined &&
      representativeValue !== beforeModifierRepresentativeValue
    ) {
      change = {
        kind: "update",
        representativeValueDelta:
          representativeValue - beforeModifierRepresentativeValue,
      };
    }
  } else if (beforeModifier === undefined) {
    change = {
      kind: "addition",
      representativeValueDelta: representativeValue,
    };
  }
  return {
    ...modifier,
    change,
    name: metaModifierDictioanry[modifier.kind].label,
    // TODO: 状態修正の詳細の説明文を生成する
    description: "",
    representativeValue,
    representativeValueText:
      representativeValue !== undefined
        ? representativeValue.toString()
        : undefined,
  };
};

/**
 * 状態修正リストの表示用情報を生成する
 *
 * - 本実装は、アイドルの「おすすめ効果」の状態修正種別を先頭へ表示することは行なっているが、本家UIのように、おすすめ効果の状態修正がなくても表示することは行なっていない
 *
 * @param params.beforeModifiers 前の状態修正リストと比較して、状態修正内に差分情報を生成する
 */
export const generateModifierDisplays = (params: {
  beforeModifiers?: Modifier[];
  modifiers: Modifier[];
  recommendedModifierKind: ProducePlan["recommendedModifierKind"];
}): ModifierDisplay[] => {
  let modifiers = params.modifiers.map((modifier) => {
    const beforeModifier =
      params.beforeModifiers === undefined
        ? false
        : params.beforeModifiers.find((e) => e.id === modifier.id);
    return generateModifierDisplay(modifier, beforeModifier);
  });
  modifiers = modifiers.slice().sort((a) => {
    return a.kind === params.recommendedModifierKind ? -1 : 0;
  });
  return modifiers;
};

const generateDrinkDisplays = (lesson: Lesson): DrinkDisplay[] => {
  return lesson.idol.drinks.map((drink) => {
    return {
      ...drink,
      name: drink.data.name,
      description: generateDrinkDescription({
        cost: drink.data.cost,
        effects: drink.data.effects,
      }),
    };
  });
};

export const generateEncouragementDisplays = (
  encouragements: Encouragement[],
): EncouragementDisplay[] => {
  return encouragements.map((encouragement) => {
    return {
      ...encouragement,
      description: generateEffectText(encouragement.effect, {
        hasSeparator: false,
      }),
    };
  });
};

/**
 * レッスン表示用情報を生成する
 *
 * - TODO: 手札プレビュー生成のため、効果発動処理を実行しており、そのために getRandom と idGenerator の状態が変わっている
 * - TODO: ターン詳細の「3位以上で合格」が未実装
 * - TODO: レッスン履歴が未実装
 */
export const generateLessonDisplay = (gamePlay: GamePlay): LessonDisplay => {
  const lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
  const modifiers = generateModifierDisplays({
    modifiers: lesson.idol.modifiers,
    recommendedModifierKind:
      lesson.idol.data.producePlan.recommendedModifierKind,
  });
  const encouragements = generateEncouragementDisplays(
    gamePlay.initialLesson.encouragements,
  );
  const turns: TurnDisplay[] = createActualTurns(lesson).map(
    (idolParameterKind, index) => {
      const turnNumber = index + 1;
      const encouragement = encouragements.find(
        (e) => e.turnNumber === turnNumber,
      );
      return {
        turnNumber,
        turnNumberDiff: turnNumber - lesson.turnNumber,
        idolParameter: {
          kind: idolParameterKind,
          name: idolParameterKindNames[idolParameterKind],
        },
        ...(encouragement ? { encouragement } : {}),
      };
    },
  );
  const idolParameterKind = getIdolParameterKindOnTurn(lesson);
  const scoreBonus = lesson.idol.scoreBonus
    ? lesson.idol.scoreBonus[idolParameterKind]
    : undefined;
  const hand = lesson.hand.map((cardId) => {
    return {
      ...generateCardInHandDisplay(
        lesson,
        cardId,
        gamePlay.getRandom,
        gamePlay.idGenerator,
      ),
    };
  });
  return {
    clearScoreThresholds: lesson.clearScoreThresholds,
    currentTurn: createCurrentTurnDetails(lesson),
    drinks: generateDrinkDisplays(lesson),
    hand,
    inventory: {
      deck: generateCardInInventoryDisplays(lesson.cards, lesson.deck),
      discardPile: generateCardInInventoryDisplays(
        lesson.cards,
        lesson.discardPile,
      ),
      hand: generateCardInInventoryDisplays(lesson.cards, lesson.hand),
      removedCardPile: generateCardInInventoryDisplays(
        lesson.cards,
        lesson.removedCardPile,
      ),
    },
    life: lesson.idol.life,
    lifeRecoveredBySkippingTurn: Math.min(
      lifeRecoveredBySkippingTurn,
      lesson.idol.maxLife - lesson.idol.life,
    ),
    maxLife: lesson.idol.maxLife,
    modifiers,
    producerItems: generateProducerItemDisplays(lesson.idol.producerItems),
    score: lesson.score,
    scoreBonus,
    turns,
    vitality: lesson.idol.vitality,
  };
};

/**
 * スキルカード使用のプレビューを表示するための情報を返す
 *
 * TODO: getRandom と idGenerator が実行されることでそれらの内部状態が変化してしまう。今の所実害はないが、可能なら複製して渡したい。
 *
 * @param selectedCardInHandIndex 選択する手札のインデックス、使用条件を満たさない手札も選択可能
 */
export const generateCardPlayPreviewDisplay = (
  gamePlay: GamePlay,
  selectedCardInHandIndex: number,
): CardPlayPreviewDisplay => {
  const beforeLesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
  const cardId = beforeLesson.hand[selectedCardInHandIndex];
  if (cardId === undefined) {
    throw new Error("Invalid card index");
  }
  const card = beforeLesson.cards.find((e) => e.id === cardId);
  if (card === undefined) {
    throw new Error("Invalid card ID");
  }
  const cardContent = getCardContentData(card);
  const { updates } = useCard(beforeLesson, 1, {
    getRandom: gamePlay.getRandom,
    idGenerator: gamePlay.idGenerator,
    selectedCardInHandIndex,
    preview: true,
  });
  const afterLesson = patchDiffs(beforeLesson, updates);
  const description = generateCardDescription({
    cost: cardContent.cost,
    condition: cardContent.condition,
    effects: cardContent.effects,
    innate: cardContent.innate,
    nonDuplicative: card.data.nonDuplicative,
    usableOncePerLesson: cardContent.usableOncePerLesson,
  });
  return {
    card: {
      cost: cardContent.cost,
      description,
      name: generateCardName(card.data.name, card.enhancements.length),
    },
    hasActionEnded: afterLesson.idol.actionPoints === 0,
    lessonDelta: {
      life: {
        after: afterLesson.idol.life,
        delta: afterLesson.idol.life - beforeLesson.idol.life,
      },
      modifires: generateModifierDisplays({
        beforeModifiers: beforeLesson.idol.modifiers,
        modifiers: afterLesson.idol.modifiers,
        recommendedModifierKind:
          beforeLesson.idol.data.producePlan.recommendedModifierKind,
      }),
      score: {
        after: afterLesson.score,
        delta: afterLesson.score - beforeLesson.score,
      },
      vitality: {
        after: afterLesson.idol.vitality,
        delta: afterLesson.idol.vitality - beforeLesson.idol.vitality,
      },
    },
    updates,
  };
};
