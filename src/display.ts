/**
 * 表示用の情報を生成するモジュール
 */

import type {
  Card,
  CardEffectDisplay,
  CardInHandDisplay,
  CardInInventoryDisplay,
  CardPlayPreviewDisplay,
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
} from "./types";
import { compareDeckOrder } from "./data/cards";
import { metaModifierDictioanry } from "./data/modifiers";
import { activateEffects, canUseCard, useCard } from "./lesson-mutation";
import {
  calculateActualActionCost,
  calculateRemainingTurns,
  createActualTurns,
  getCardContentData,
  getDisplayedRepresentativeModifierValue,
  getIdolParameterKindOnTurn,
  getProducerItemContentData,
  getRemainingProducerItemTimes,
  patchDiffs,
} from "./models";
import {
  generateCardName,
  generateCardDescription,
  generateEffectText,
  generateProducerItemDescription,
  idolParameterKindNames,
} from "./text-generation";

const generateEffectDisplay = (
  effect: Effect,
  applyable: boolean,
): CardEffectDisplay | undefined => {
  if (effect.kind === "getModifier") {
    return {
      effect,
      kind: `modifier-${effect.modifier.kind}`,
      applyable,
    };
  } else if (effect.kind === "perform") {
    if (effect.condition) {
      if (effect.score) {
        return {
          effect,
          kind: "perform-score",
          applyable,
        };
      } else if (effect.vitality) {
        return {
          effect,
          kind: "perform-vitality",
          applyable,
        };
      }
    }
    return undefined;
  }
  return {
    effect,
    kind: effect.kind,
    applyable,
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
  const effectActivations = activateEffects(
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
  let vitality: CardInHandDisplay["vitality"] = undefined;
  const firstVitalityUpdate = effectDiffs.find((e) => e.kind === "vitality");
  if (firstVitalityUpdate) {
    vitality = firstVitalityUpdate.max;
  }
  let effectDisplays: CardInHandDisplay["effects"] = [];
  for (const [effectIndex, effect] of cardContent.effects.entries()) {
    const applyable = effectActivations[effectIndex] !== undefined;
    const effectDisplay = generateEffectDisplay(effect, applyable);
    if (effectDisplay) {
      effectDisplays = [...effectDisplays, effectDisplay];
    }
  }
  return {
    cost: calculateActualActionCost(cardContent.cost, lesson.idol.modifiers),
    effects: effectDisplays,
    enhancements: card.enhancements,
    name: generateCardName(card),
    playable: canUseCard(lesson, cardContent.cost, cardContent.condition),
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
    name: generateCardName(card),
    description: generateCardDescription({
      cost: cardContent.cost,
      condition: cardContent.condition,
      effects: cardContent.effects,
      innate: cardContent.innate,
      nonDuplicative: card.original.data.nonDuplicative,
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
    .sort((a, b) => compareDeckOrder(a.original.data, b.original.data));
};

export const generateProducerItemDisplays = (
  lesson: Lesson,
): ProducerItemDisplay[] => {
  return lesson.idol.producerItems.map((producerItem) => {
    const producerItemContent = getProducerItemContentData(producerItem);
    const name =
      producerItem.original.data.name +
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
 * - TODO: ターン詳細の「3位以上で合格」が未実装
 * - TODO: レッスン履歴が未実装
 */
export const generateLessonDisplay = (gamePlay: GamePlay): LessonDisplay => {
  const lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
  const modifiers: ModifierDisplay[] = lesson.idol.modifiers.map((modifier) => {
    const representativeValue =
      getDisplayedRepresentativeModifierValue(modifier);
    return {
      ...modifier,
      name: metaModifierDictioanry[modifier.kind].label,
      description: "",
      representativeValue,
      representativeValueText:
        representativeValue !== undefined
          ? representativeValue.toString()
          : undefined,
    };
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
    modifiers,
    producerItems: generateProducerItemDisplays(lesson),
    remainingTurns: calculateRemainingTurns(lesson),
    score: lesson.score,
    scoreBonus,
    turnNumber: lesson.turnNumber,
    turns,
    vitality: lesson.idol.vitality,
  };
};

/**
 * スキルカード使用のプレビューを表示するための情報を返す
 *
 * - 本家のプレビュー仕様
 *   - 体力・元気の差分
 *     - 効果反映後の値に変わり、その近くに差分アイコンが +n/-n で表示される
 *     - 差分は実際に変化した値を表示する、例えば、結果的に値の変更がない場合は何も表示されない
 *   - 状態修正の差分
 *     - 新規: スキルカード追加使用など一部のものを除いて、左側の状態修正リストの末尾へ追加
 *     - 既存: 差分がある状態修正アイコンに差分適用後の値を表示し、その右に差分アイコンを表示する
 *     - スキルカード追加使用、次に使用するスキルカードの効果をもう1回発動、など、差分アイコンが表示されないものもある
 *   - スキルカード詳細ポップアップ
 *     - 全ての項目が、各効果による変化前のデータ定義時の値、強化段階のみ反映される
 *       - 例えば、「消費体力減少」が付与されていても、コストは半分にならない
 *   - プレビュー時には、選択したスキルカードの効果のみ反映される
 *     - 例えば、「ワクワクが止まらない」の状態修正が付与されている時に、メンタルスキルカードを選択しても、その分は反映されない
 *       - 参考動画: https://youtu.be/7hbRaIYE_ZI?si=Jd5JYrOVCJZZPp7i&t=214
 *
 * TODO: getRandom と idGenerator が実行されることでそれらの内部状態に変化してしまう。今の所実害はないが、可能なら複製して渡したい。
 *
 * @param selectedCardInHandIndex 選択する手札のインデックス、使用条件を満たさない手札も選択可能
 */
export const generateCardPlayPreviewDisplay = (
  gamePlay: GamePlay,
  selectedCardInHandIndex: number,
): CardPlayPreviewDisplay => {
  const lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
  const cardId = lesson.hand[selectedCardInHandIndex];
  if (cardId === undefined) {
    throw new Error("Invalid card index");
  }
  const card = lesson.cards.find((e) => e.id === cardId);
  if (card === undefined) {
    throw new Error("Invalid card ID");
  }
  const cardContent = getCardContentData(card);
  const { updates } = useCard(lesson, 1, {
    getRandom: gamePlay.getRandom,
    idGenerator: gamePlay.idGenerator,
    selectedCardInHandIndex,
    preview: true,
  });
  const description = generateCardDescription({
    cost: cardContent.cost,
    condition: cardContent.condition,
    effects: cardContent.effects,
    innate: cardContent.innate,
    nonDuplicative: card.original.data.nonDuplicative,
    usableOncePerLesson: cardContent.usableOncePerLesson,
  });
  return {
    card: {
      cost: cardContent.cost,
      description,
      name: generateCardName(card),
    },
    lesson: patchDiffs(lesson, updates),
    updates,
  };
};
