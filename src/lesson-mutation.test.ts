import {
  Card,
  CardInProduction,
  Idol,
  Lesson,
  Modifier,
  ProducerItem,
  ProducerItemInProduction,
} from "./types";
import { getCardDataById } from "./data/cards";
import { getProducerItemDataById } from "./data/producer-items";
import {
  activateEffectIf,
  activateEffectsEachProducerItemsAccordingToCardUsage,
  activateEffectsOfProducerItem,
  activateEffectsOnLessonStart,
  activateEffectsOnCardPlay,
  activateEffectsOnTurnEnd,
  activateEncouragementOnTurnStart,
  activateMemoryEffect,
  activateMemoryEffectsOnLessonStart,
  activateModifierEffectsOnTurnStart,
  activateProducerItemEffectsOnTurnStart,
  addCardsToHandOrDiscardPile,
  calculateCostConsumption,
  calculatePerformingScoreEffect,
  calculatePerformingVitalityEffect,
  canActivateEffect,
  canPlayCard,
  canTriggerProducerItem,
  consumeRemainingCardUsageCount,
  createCardPlacementDiff,
  decreaseEachModifierDurationOverTime,
  drawCardsFromDeck,
  drawCardsOnTurnStart,
  obtainPositiveImpressionScoreOnTurnEnd,
  useCard,
  validateCostConsumution,
} from "./lesson-mutation";
import { patchDiffs } from "./models";
import { createGamePlayForTest } from "./test-utils";
import { createIdGenerator } from "./utils";

const createLessonForTest = (
  options: {
    deck?: CardInProduction[];
    producerItems?: ProducerItemInProduction[];
  } = {},
): Lesson => {
  const gamePlay = createGamePlayForTest({
    deck: options.deck,
    producerItems: options.producerItems,
  });
  return gamePlay.initialLesson;
};

describe("drawCardsFromDeck", () => {
  test("山札がなくならない状態で1枚引いた時、1枚引けて、山札は再構築されず、山札が1枚減る", () => {
    const deck = ["1", "2", "3"];
    const {
      drawnCards,
      deck: newDeck,
      deckRebuilt,
    } = drawCardsFromDeck(deck, 1, [], Math.random);
    expect(drawnCards).toHaveLength(1);
    expect(newDeck).toHaveLength(2);
    expect(deckRebuilt).toBe(false);
  });
  test("山札の最後の1枚を1枚だけ引いた時、1枚引けて、山札は再構築されず、山札が1枚減り、捨札は変わらない", () => {
    const deck = ["1", "2", "3"];
    const discardPile = ["4"];
    const {
      drawnCards,
      deck: newDeck,
      deckRebuilt,
      discardPile: newDiscardPile,
    } = drawCardsFromDeck(deck, 1, discardPile, Math.random);
    expect(drawnCards).toHaveLength(1);
    expect(newDeck).toHaveLength(2);
    expect(deckRebuilt).toBe(false);
    expect(newDiscardPile).toStrictEqual(discardPile);
  });
  test("山札が残り1枚で2枚引いた時、山札は再構築され、2枚引けて、捨札は山札に移動して空になり、山札は捨札の-1枚の数になる", () => {
    const deck = ["1"];
    const discardPile = ["2", "3", "4", "5"];
    const {
      drawnCards,
      deck: newDeck,
      deckRebuilt,
      discardPile: newDiscardPile,
    } = drawCardsFromDeck(deck, 2, discardPile, Math.random);
    expect(drawnCards).toHaveLength(2);
    expect(newDeck).toHaveLength(3);
    expect(deckRebuilt).toBe(true);
    expect(newDiscardPile).toStrictEqual([]);
    expect([...drawnCards, ...newDeck].sort()).toStrictEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });
});
describe("addCardsToHandOrDiscardPile", () => {
  const testCases: {
    args: Parameters<typeof addCardsToHandOrDiscardPile>;
    expected: ReturnType<typeof addCardsToHandOrDiscardPile>;
  }[] = [
    {
      args: [["1", "2", "3", "4", "5"], [], []],
      expected: {
        hand: ["1", "2", "3", "4", "5"],
        discardPile: [],
      },
    },
    {
      args: [["1", "2", "3", "4", "5", "6", "7"], [], []],
      expected: {
        hand: ["1", "2", "3", "4", "5"],
        discardPile: ["6", "7"],
      },
    },
    {
      args: [["3", "4", "5"], ["1", "2"], []],
      expected: {
        hand: ["1", "2", "3", "4", "5"],
        discardPile: [],
      },
    },
    {
      args: [["3", "4", "5", "6", "7"], ["1", "2"], []],
      expected: {
        hand: ["1", "2", "3", "4", "5"],
        discardPile: ["6", "7"],
      },
    },
    {
      args: [
        ["8", "9"],
        ["1", "2", "3", "4", "5"],
        ["6", "7"],
      ],
      expected: {
        hand: ["1", "2", "3", "4", "5"],
        discardPile: ["6", "7", "8", "9"],
      },
    },
  ];
  test.each(testCases)(
    "Drawn:$args.0, Hand:$args.1, Discard:$args.2 => Hand:$expected.hand, Discard:$expected.discardPile",
    ({ args, expected }) => {
      expect(addCardsToHandOrDiscardPile(...args)).toStrictEqual(expected);
    },
  );
});
describe("createCardPlacementDiff", () => {
  const testCases: {
    args: Parameters<typeof createCardPlacementDiff>;
    expected: ReturnType<typeof createCardPlacementDiff>;
    name: string;
  }[] = [
    {
      name: "before側だけ存在しても差分は返さない",
      args: [
        {
          deck: ["1"],
          discardPile: ["2"],
          hand: ["3"],
          removedCardPile: ["4"],
        },
        {},
      ],
      expected: { kind: "cardPlacement" },
    },
    {
      name: "after側だけ存在しても差分は返さない",
      args: [
        {},
        {
          deck: ["1"],
          discardPile: ["2"],
          hand: ["3"],
          removedCardPile: ["4"],
        },
      ],
      expected: { kind: "cardPlacement" },
    },
    {
      name: "全ての値がbefore/afterで同じ場合は差分を返さない",
      args: [
        {
          deck: ["1"],
          discardPile: ["2"],
          hand: ["3"],
          removedCardPile: ["4"],
        },
        {
          deck: ["1"],
          discardPile: ["2"],
          hand: ["3"],
          removedCardPile: ["4"],
        },
      ],
      expected: { kind: "cardPlacement" },
    },
    {
      name: "deckのみの差分を返せる",
      args: [
        {
          deck: ["1"],
          discardPile: ["2"],
          hand: ["3"],
          removedCardPile: ["4"],
        },
        {
          deck: ["11"],
          discardPile: ["2"],
          hand: ["3"],
          removedCardPile: ["4"],
        },
      ],
      expected: { kind: "cardPlacement", deck: ["11"] },
    },
    {
      name: "discardPileのみの差分を返せる",
      args: [
        {
          deck: ["1"],
          discardPile: ["2"],
          hand: ["3"],
          removedCardPile: ["4"],
        },
        {
          deck: ["1"],
          discardPile: ["22"],
          hand: ["3"],
          removedCardPile: ["4"],
        },
      ],
      expected: { kind: "cardPlacement", discardPile: ["22"] },
    },
    {
      name: "handのみの差分を返せる",
      args: [
        {
          deck: ["1"],
          discardPile: ["2"],
          hand: ["3"],
          removedCardPile: ["4"],
        },
        {
          deck: ["1"],
          discardPile: ["2"],
          hand: ["33"],
          removedCardPile: ["4"],
        },
      ],
      expected: { kind: "cardPlacement", hand: ["33"] },
    },
    {
      name: "removedCardPileのみの差分を返せる",
      args: [
        {
          deck: ["1"],
          discardPile: ["2"],
          hand: ["3"],
          removedCardPile: ["4"],
        },
        {
          deck: ["1"],
          discardPile: ["2"],
          hand: ["3"],
          removedCardPile: ["44"],
        },
      ],
      expected: { kind: "cardPlacement", removedCardPile: ["44"] },
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(createCardPlacementDiff(...args)).toStrictEqual(expected);
  });
});
describe("validateCostConsumution", () => {
  const testCases: Array<{
    args: Parameters<typeof validateCostConsumution>;
    expected: ReturnType<typeof validateCostConsumution>;
    name: string;
  }> = [
    {
      name: "normalコストに対してlifeが足りる時、スキルカードが使える",
      args: [
        {
          life: 3,
          vitality: 0,
          modifiers: [] as Idol["modifiers"],
        } as Idol,
        { kind: "normal", value: 3 },
      ],
      expected: true,
    },
    {
      name: "normalコストに対してvitalityが足りる時、スキルカードが使える",
      args: [
        {
          life: 0,
          vitality: 3,
          modifiers: [] as Idol["modifiers"],
        } as Idol,
        { kind: "normal", value: 3 },
      ],
      expected: true,
    },
    {
      name: "normalコストに対してlifeとvitalityの合計が足りる時、スキルカードが使える",
      args: [
        {
          life: 1,
          vitality: 2,
          modifiers: [] as Idol["modifiers"],
        } as Idol,
        { kind: "normal", value: 3 },
      ],
      expected: true,
    },
    {
      name: "normalコストに対してlifeとvitalityの合計が足りない時、スキルカードが使えない",
      args: [
        {
          life: 1,
          vitality: 2,
          modifiers: [] as Idol["modifiers"],
        } as Idol,
        { kind: "normal", value: 4 },
      ],
      expected: false,
    },
    {
      name: "lifeコストを満たす時、スキルカードが使える",
      args: [
        {
          life: 3,
          vitality: 0,
          modifiers: [] as Idol["modifiers"],
        } as Idol,
        { kind: "life", value: 3 },
      ],
      expected: true,
    },
    {
      name: "lifeコスト満たさない時、スキルカードが使えない",
      args: [
        {
          life: 3,
          vitality: 10,
          modifiers: [] as Idol["modifiers"],
        } as Idol,
        { kind: "life", value: 4 },
      ],
      expected: false,
    },
    {
      name: "focusコストを満たす時、スキルカードが使える",
      args: [
        {
          life: 0,
          vitality: 0,
          modifiers: [{ kind: "focus", amount: 3 }] as Idol["modifiers"],
        } as Idol,
        { kind: "focus", value: 3 },
      ],
      expected: true,
    },
    {
      name: "focusコストを満たさない時、スキルカードが使えない",
      args: [
        {
          life: 0,
          vitality: 0,
          modifiers: [{ kind: "focus", amount: 3 }] as Idol["modifiers"],
        } as Idol,
        { kind: "focus", value: 4 },
      ],
      expected: false,
    },
    {
      name: "goodConditionコストを満たす時、スキルカードが使える",
      args: [
        {
          life: 0,
          vitality: 0,
          modifiers: [
            { kind: "goodCondition", duration: 3 },
          ] as Idol["modifiers"],
        } as Idol,
        { kind: "goodCondition", value: 3 },
      ],
      expected: true,
    },
    {
      name: "goodConditionコストを満たさない時、スキルカードが使えない",
      args: [
        {
          life: 0,
          vitality: 0,
          modifiers: [
            { kind: "goodCondition", duration: 3 },
          ] as Idol["modifiers"],
        } as Idol,
        { kind: "goodCondition", value: 4 },
      ],
      expected: false,
    },
    {
      name: "motivationコストを満たす時、スキルカードが使える",
      args: [
        {
          life: 0,
          vitality: 0,
          modifiers: [{ kind: "motivation", amount: 3 }] as Idol["modifiers"],
        } as Idol,
        { kind: "motivation", value: 3 },
      ],
      expected: true,
    },
    {
      name: "motivationコストを満たさない時、スキルカードが使えない",
      args: [
        {
          life: 0,
          vitality: 0,
          modifiers: [{ kind: "motivation", amount: 3 }] as Idol["modifiers"],
        } as Idol,
        { kind: "motivation", value: 4 },
      ],
      expected: false,
    },
    {
      name: "positiveImpressionコストを満たす時、スキルカードが使える",
      args: [
        {
          life: 0,
          vitality: 0,
          modifiers: [
            { kind: "positiveImpression", amount: 3 },
          ] as Idol["modifiers"],
        } as Idol,
        { kind: "positiveImpression", value: 3 },
      ],
      expected: true,
    },
    {
      name: "positiveImpressionコストを満たさない時、スキルカードが使えない",
      args: [
        {
          life: 0,
          vitality: 0,
          modifiers: [
            { kind: "positiveImpression", amount: 3 },
          ] as Idol["modifiers"],
        } as Idol,
        { kind: "positiveImpression", value: 4 },
      ],
      expected: false,
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(validateCostConsumution(...args)).toStrictEqual(expected);
  });
});
// validateCostConsumution で検証できる内容はそちらで行う
describe("canPlayCard", () => {
  const testCases: Array<{
    args: Parameters<typeof canPlayCard>;
    expected: ReturnType<typeof canPlayCard>;
    name: string;
  }> = [
    {
      name: "コストを満たすリソースがない時、スキルカードを使えない",
      args: [
        {
          idol: {
            life: 3,
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
        } as Lesson,
        { kind: "normal", value: 4 },
        undefined,
      ],
      expected: false,
    },
    {
      name: "コストを満たすリソースがあり、追加条件が無い時、スキルカードを使える",
      args: [
        {
          idol: {
            life: 3,
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
        } as Lesson,
        { kind: "normal", value: 3 },
        undefined,
      ],
      expected: true,
    },
    {
      name: "ターン数の追加条件を満たす時、スキルカードを使える",
      args: [
        {
          idol: {
            life: 0,
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
          turnNumber: 3,
        } as Lesson,
        { kind: "normal", value: 0 },
        { kind: "countTurnNumber", min: 3 },
      ],
      expected: true,
    },
    {
      name: "ターン数の追加条件を満たさない時、スキルカードを使えない",
      args: [
        {
          idol: {
            life: 0,
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
          turnNumber: 2,
        } as Lesson,
        { kind: "normal", value: 0 },
        { kind: "countTurnNumber", min: 3 },
      ],
      expected: false,
    },
    {
      name: "元気0の追加条件を満たす時、スキルカードを使える",
      args: [
        {
          idol: {
            life: 0,
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
          turnNumber: 3,
        } as Lesson,
        { kind: "normal", value: 0 },
        { kind: "countVitalityZero" },
      ],
      expected: true,
    },
    {
      name: "元気0の追加条件を満たさない時、スキルカードを使えない",
      args: [
        {
          idol: {
            life: 0,
            vitality: 1,
            modifiers: [] as Idol["modifiers"],
          },
          turnNumber: 3,
        } as Lesson,
        { kind: "normal", value: 0 },
        { kind: "countVitalityZero" },
      ],
      expected: false,
    },
    {
      name: "好調所持の追加条件を満たす時、スキルカードを使える",
      args: [
        {
          idol: {
            life: 3,
            vitality: 0,
            modifiers: [
              { kind: "goodCondition", duration: 1 },
            ] as Idol["modifiers"],
          },
          turnNumber: 3,
        } as Lesson,
        { kind: "normal", value: 3 },
        { kind: "hasGoodCondition" },
      ],
      expected: true,
    },
    {
      name: "好調所持の追加条件を満たさない時、スキルカードを使える",
      args: [
        {
          idol: {
            life: 3,
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
          turnNumber: 3,
        } as Lesson,
        { kind: "normal", value: 3 },
        { kind: "hasGoodCondition" },
      ],
      expected: false,
    },
    {
      name: "life比率以上の追加条件を満たす時、スキルカードを使える",
      args: [
        {
          idol: {
            life: 5,
            original: {
              maxLife: 10,
            },
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
        } as Lesson,
        { kind: "normal", value: 3 },
        {
          kind: "measureValue",
          valueKind: "life",
          criterionKind: "greaterEqual",
          percentage: 50,
        },
      ],
      expected: true,
    },
    {
      name: "life比率以上の追加条件を満たさない時、スキルカードを使えない",
      args: [
        {
          idol: {
            life: 4,
            original: {
              maxLife: 10,
            },
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
        } as Lesson,
        { kind: "normal", value: 3 },
        {
          kind: "measureValue",
          valueKind: "life",
          criterionKind: "greaterEqual",
          percentage: 50,
        },
      ],
      expected: false,
    },
    {
      name: "life比率以下の追加条件を満たす時、スキルカードを使える",
      args: [
        {
          idol: {
            life: 5,
            original: {
              maxLife: 10,
            },
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
        } as Lesson,
        { kind: "normal", value: 3 },
        {
          kind: "measureValue",
          valueKind: "life",
          criterionKind: "lessEqual",
          percentage: 50,
        },
      ],
      expected: true,
    },
    {
      name: "life比率以下の追加条件を満たさない時、スキルカードを使えない",
      args: [
        {
          idol: {
            life: 6,
            original: {
              maxLife: 10,
            },
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
        } as Lesson,
        { kind: "normal", value: 3 },
        {
          kind: "measureValue",
          valueKind: "life",
          criterionKind: "lessEqual",
          percentage: 50,
        },
      ],
      expected: false,
    },
    {
      name: "score比率以上の追加条件を満たす時、スキルカードを使える",
      args: [
        {
          idol: {
            life: 0,
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
          score: 10,
          clearScoreThresholds: {
            clear: 10,
          },
        } as Lesson,
        { kind: "normal", value: 0 },
        {
          kind: "measureValue",
          valueKind: "score",
          criterionKind: "greaterEqual",
          percentage: 100,
        },
      ],
      expected: true,
    },
    {
      name: "score比率以上の追加条件を満たさない時、スキルカードを使えない",
      args: [
        {
          idol: {
            life: 0,
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
          score: 9,
          clearScoreThresholds: {
            clear: 10,
          },
        } as Lesson,
        { kind: "normal", value: 0 },
        {
          kind: "measureValue",
          valueKind: "score",
          criterionKind: "greaterEqual",
          percentage: 100,
        },
      ],
      expected: false,
    },
    {
      name: "score比率以下の追加条件を満たす時、スキルカードを使える",
      args: [
        {
          idol: {
            life: 0,
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
          score: 10,
          clearScoreThresholds: {
            clear: 10,
          },
        } as Lesson,
        { kind: "normal", value: 0 },
        {
          kind: "measureValue",
          valueKind: "score",
          criterionKind: "lessEqual",
          percentage: 100,
        },
      ],
      expected: true,
    },
    {
      name: "score比率以下の追加条件を満たさない時、スキルカードを使えない",
      args: [
        {
          idol: {
            life: 0,
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
          score: 11,
          clearScoreThresholds: {
            clear: 10,
          },
        } as Lesson,
        { kind: "normal", value: 0 },
        {
          kind: "measureValue",
          valueKind: "score",
          criterionKind: "lessEqual",
          percentage: 100,
        },
      ],
      expected: false,
    },
    {
      name: "score比率の追加条件があるが、レッスンにクリアスコア閾値が設定されていない時、スキルカードを使える",
      args: [
        {
          idol: {
            life: 0,
            vitality: 0,
            modifiers: [] as Idol["modifiers"],
          },
          score: 10,
        } as Lesson,
        { kind: "normal", value: 0 },
        {
          kind: "measureValue",
          valueKind: "score",
          criterionKind: "greaterEqual",
          percentage: 100,
        },
      ],
      expected: true,
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(canPlayCard(...args)).toStrictEqual(expected);
  });
});
describe("canActivateEffect", () => {
  const testCases: Array<{
    args: Parameters<typeof canActivateEffect>;
    expected: ReturnType<typeof canActivateEffect>;
    name: string;
  }> = [
    {
      name: "countModifierのfocusを満たす時、trueを返す",
      args: [
        {
          idol: {
            modifiers: [{ kind: "focus", amount: 3 }] as Idol["modifiers"],
          },
        } as Lesson,
        { kind: "countModifier", modifierKind: "focus", range: { min: 3 } },
      ],
      expected: true,
    },
    {
      name: "countModifierのfocusを満たさない時、falseを返す",
      args: [
        {
          idol: {
            modifiers: [{ kind: "focus", amount: 2 }] as Idol["modifiers"],
          },
        } as Lesson,
        { kind: "countModifier", modifierKind: "focus", range: { min: 3 } },
      ],
      expected: false,
    },
    {
      name: "countModifierのgoodConditionを満たす時、trueを返す",
      args: [
        {
          idol: {
            modifiers: [
              { kind: "goodCondition", duration: 3 },
            ] as Idol["modifiers"],
          },
        } as Lesson,
        {
          kind: "countModifier",
          modifierKind: "goodCondition",
          range: { min: 3 },
        },
      ],
      expected: true,
    },
    {
      name: "countModifierのgoodConditionを満たさない時、trueを返す",
      args: [
        {
          idol: {
            modifiers: [
              { kind: "goodCondition", duration: 2 },
            ] as Idol["modifiers"],
          },
        } as Lesson,
        {
          kind: "countModifier",
          modifierKind: "goodCondition",
          range: { min: 3 },
        },
      ],
      expected: false,
    },
    {
      name: "countModifierのmotivationを満たす時、trueを返す",
      args: [
        {
          idol: {
            modifiers: [{ kind: "motivation", amount: 3 }] as Idol["modifiers"],
          },
        } as Lesson,
        {
          kind: "countModifier",
          modifierKind: "motivation",
          range: { min: 3 },
        },
      ],
      expected: true,
    },
    {
      name: "countModifierのmotivationを満たさない時、falseを返す",
      args: [
        {
          idol: {
            modifiers: [{ kind: "motivation", amount: 2 }] as Idol["modifiers"],
          },
        } as Lesson,
        {
          kind: "countModifier",
          modifierKind: "motivation",
          range: { min: 3 },
        },
      ],
      expected: false,
    },
    {
      name: "countModifierのpositiveImpressionを満たす時、trueを返す",
      args: [
        {
          idol: {
            modifiers: [
              { kind: "positiveImpression", amount: 3 },
            ] as Idol["modifiers"],
          },
        } as Lesson,
        {
          kind: "countModifier",
          modifierKind: "positiveImpression",
          range: { min: 3 },
        },
      ],
      expected: true,
    },
    {
      name: "countModifierのpositiveImpressionを満たさない時、falseを返す",
      args: [
        {
          idol: {
            modifiers: [
              { kind: "positiveImpression", amount: 2 },
            ] as Idol["modifiers"],
          },
        } as Lesson,
        {
          kind: "countModifier",
          modifierKind: "positiveImpression",
          range: { min: 3 },
        },
      ],
      expected: false,
    },
    {
      name: "countReminingTurnsを満たす時、trueを返す",
      args: [
        {
          turnNumber: 4,
          turns: ["vocal", "vocal", "vocal", "vocal", "vocal", "vocal"],
          remainingTurnsChange: 0,
        } as Lesson,
        { kind: "countReminingTurns", max: 3 },
      ],
      expected: true,
    },
    {
      name: "countReminingTurnsを満たさない時、falseを返す",
      args: [
        {
          turnNumber: 4,
          turns: ["vocal", "vocal", "vocal", "vocal", "vocal", "vocal"],
          remainingTurnsChange: 0,
        } as Lesson,
        { kind: "countReminingTurns", max: 2 },
      ],
      expected: false,
    },
    {
      name: "countVitalityを満たす時、trueを返す",
      args: [
        {
          idol: {
            vitality: 1,
          },
        } as Lesson,
        { kind: "countVitality", range: { min: 1, max: 1 } },
      ],
      expected: true,
    },
    {
      name: "countVitalityを満たさない時、falseを返す",
      args: [
        {
          idol: {
            vitality: 1,
          },
        } as Lesson,
        { kind: "countVitality", range: { min: 2, max: 2 } },
      ],
      expected: false,
    },
    {
      name: "hasGoodConditionを満たす時、trueを返す",
      args: [
        {
          idol: {
            modifiers: [
              { kind: "goodCondition", duration: 1 },
            ] as Idol["modifiers"],
          },
        } as Lesson,
        { kind: "hasGoodCondition" },
      ],
      expected: true,
    },
    {
      name: "hasGoodConditionを満たさない時、falseを返す",
      args: [
        {
          idol: {
            modifiers: [{ kind: "focus", amount: 1 }] as Idol["modifiers"],
          },
        } as Lesson,
        { kind: "hasGoodCondition" },
      ],
      expected: false,
    },
    {
      name: "measureIfLifeIsEqualGreaterThanHalfを満たす時、trueを返す",
      args: [
        {
          idol: {
            life: 5,
            original: {
              maxLife: 10,
            },
          },
        } as Lesson,
        { kind: "measureIfLifeIsEqualGreaterThanHalf" },
      ],
      expected: true,
    },
    {
      name: "measureIfLifeIsEqualGreaterThanHalfを満たさない時、falseを返す",
      args: [
        {
          idol: {
            life: 4,
            original: {
              maxLife: 10,
            },
          },
        } as Lesson,
        { kind: "measureIfLifeIsEqualGreaterThanHalf" },
      ],
      expected: false,
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(canActivateEffect(...args)).toBe(expected);
  });
});
// condition 条件は canActivateEffect で検証する、こちらでやろうとするとモックが複雑になるのでやらない
describe("canTriggerProducerItem", () => {
  const testCases: Array<{
    args: Parameters<typeof canTriggerProducerItem>;
    expected: ReturnType<typeof canTriggerProducerItem>;
    name: string;
  }> = [
    {
      name: "トリガー種別以外の条件がなく、トリガー種別が一致する時、trueを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          activationCount: 0,
          original: {
            data: { base: { trigger: { kind: "turnStart" } } },
          },
        } as ProducerItem,
        "turnStart",
      ],
      expected: true,
    },
    {
      name: "トリガー種別以外の条件がなく、トリガー種別が一致しない時、falseを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          activationCount: 0,
          original: {
            data: { base: { trigger: { kind: "turnStart" } } },
          },
        } as ProducerItem,
        "turnEnd",
      ],
      expected: false,
    },
    {
      name: "アイドルパラメータ種別条件があり、合致する時、trueを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          activationCount: 0,
          original: {
            data: {
              base: {
                trigger: { kind: "turnStart", idolParameterKind: "vocal" },
              },
            },
          },
        } as ProducerItem,
        "turnStart",
      ],
      expected: true,
    },
    {
      name: "アイドルパラメータ種別条件があり、合致しない時、falseを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          activationCount: 0,
          original: {
            data: {
              base: {
                trigger: { kind: "turnStart", idolParameterKind: "dance" },
              },
            },
          },
        } as ProducerItem,
        "turnStart",
      ],
      expected: false,
    },
    {
      name: "アイドルパラメータ種別条件があり、合致しないが、クリア済みなら全属性対象になる時、trueを返す",
      args: [
        {
          turns: ["vocal"],
          turnNumber: 1,
          ignoreIdolParameterKindConditionAfterClearing: true,
          clearScoreThresholds: { clear: 1 },
          score: 1,
        } as Lesson,
        {
          activationCount: 0,
          original: {
            data: {
              base: {
                trigger: { kind: "turnStart", idolParameterKind: "dance" },
              },
            },
          },
        } as ProducerItem,
        "turnStart",
      ],
      expected: true,
    },
    {
      name: "アイドルパラメータ種別条件があり、合致しないが、クリア済みなら全属性対象になるがまだクリア済みでない時、falseを返す",
      args: [
        {
          turns: ["vocal"],
          turnNumber: 1,
          ignoreIdolParameterKindConditionAfterClearing: true,
          clearScoreThresholds: { clear: 2 },
          score: 1,
        } as Lesson,
        {
          activationCount: 0,
          original: {
            data: {
              base: {
                trigger: { kind: "turnStart", idolParameterKind: "dance" },
              },
            },
          },
        } as ProducerItem,
        "turnStart",
      ],
      expected: false,
    },
    {
      name: "発動回数条件があり、残り発動回数が足りている時、trueを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          activationCount: 1,
          original: {
            data: { base: { trigger: { kind: "turnStart" }, times: 2 } },
          },
        } as ProducerItem,
        "turnStart",
      ],
      expected: true,
    },
    {
      name: "発動回数条件があり、残り発動回数が足りていない時、falseを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          activationCount: 2,
          original: {
            data: { base: { trigger: { kind: "turnStart" }, times: 2 } },
          },
        } as ProducerItem,
        "turnStart",
      ],
      expected: false,
    },
    {
      name: "turnStartEveryTwoTurns で、2ターン目の時、trueを返す",
      args: [
        { turns: ["vocal"], turnNumber: 2 } as Lesson,
        {
          original: {
            data: {
              base: { trigger: { kind: "turnStartEveryTwoTurns" } },
            },
          },
        } as ProducerItem,
        "turnStartEveryTwoTurns",
      ],
      expected: true,
    },
    {
      name: "turnStartEveryTwoTurns で、1ターン目の時、falseを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          original: {
            data: {
              base: { trigger: { kind: "turnStartEveryTwoTurns" } },
            },
          },
        } as ProducerItem,
        "turnStartEveryTwoTurns",
      ],
      expected: false,
    },
    {
      name: "turnStartEveryTwoTurns で、0ターン目の時、falseを返す",
      args: [
        { turns: ["vocal"], turnNumber: 0 } as Lesson,
        {
          original: {
            data: {
              base: { trigger: { kind: "turnStartEveryTwoTurns" } },
            },
          },
        } as ProducerItem,
        "turnStartEveryTwoTurns",
      ],
      expected: false,
    },
    {
      name: "beforeCardEffectActivation で、スキルカード定義IDとスキルカード概要種別が一致する時、trueを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          original: {
            data: {
              base: {
                trigger: {
                  kind: "beforeCardEffectActivation",
                  cardDataId: "a",
                  cardSummaryKind: "active",
                },
              },
            },
          },
        } as ProducerItem,
        "beforeCardEffectActivation",
        {
          cardDataId: "a",
          cardSummaryKind: "active",
        },
      ],
      expected: true,
    },
    {
      name: "beforeCardEffectActivation で、スキルカード定義IDが一致せず、スキルカード概要種別が一致する時、falseを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          original: {
            data: {
              base: {
                trigger: {
                  kind: "beforeCardEffectActivation",
                  cardDataId: "a",
                  cardSummaryKind: "active",
                },
              },
            },
          },
        } as ProducerItem,
        "beforeCardEffectActivation",
        {
          cardDataId: "b",
          cardSummaryKind: "active",
        },
      ],
      expected: false,
    },
    {
      name: "beforeCardEffectActivation で、スキルカード定義IDが一致し、スキルカード概要種別が一致しない時、falseを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          original: {
            data: {
              base: {
                trigger: {
                  kind: "beforeCardEffectActivation",
                  cardDataId: "a",
                  cardSummaryKind: "active",
                },
              },
            },
          },
        } as ProducerItem,
        "beforeCardEffectActivation",
        {
          cardDataId: "a",
          cardSummaryKind: "mental",
        },
      ],
      expected: false,
    },
    {
      name: "afterCardEffectActivation で、スキルカード概要種別が一致する時、trueを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          original: {
            data: {
              base: {
                trigger: {
                  kind: "afterCardEffectActivation",
                  cardSummaryKind: "active",
                },
              },
            },
          },
        } as ProducerItem,
        "afterCardEffectActivation",
        {
          cardSummaryKind: "active",
        },
      ],
      expected: true,
    },
    {
      name: "afterCardEffectActivation で、スキルカード概要種別が一致しない時、trueを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          original: {
            data: {
              base: {
                trigger: {
                  kind: "afterCardEffectActivation",
                  cardSummaryKind: "active",
                },
              },
            },
          },
        } as ProducerItem,
        "afterCardEffectActivation",
        {
          cardSummaryKind: "mental",
        },
      ],
      expected: false,
    },
    {
      name: "modifierIncrease で、指定した状態修正が渡された状態修正リストに含まれる時、trueを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          original: {
            data: {
              base: {
                trigger: {
                  kind: "modifierIncrease",
                  modifierKind: "focus",
                },
              },
            },
          },
        } as ProducerItem,
        "modifierIncrease",
        {
          increasedModifierKinds: ["focus"],
        },
      ],
      expected: true,
    },
    {
      name: "modifierIncrease で、指定した状態修正が渡された状態修正リストに含まれない時、falseを返す",
      args: [
        { turns: ["vocal"], turnNumber: 1 } as Lesson,
        {
          original: {
            data: {
              base: {
                trigger: {
                  kind: "modifierIncrease",
                  modifierKind: "focus",
                },
              },
            },
          },
        } as ProducerItem,
        "modifierIncrease",
        {
          increasedModifierKinds: ["goodCondition"],
        },
      ],
      expected: false,
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(canTriggerProducerItem(...args)).toStrictEqual(expected);
  });
});
describe("calculateCostConsumption", () => {
  const testCases: Array<{
    args: Parameters<typeof calculateCostConsumption>;
    expected: ReturnType<typeof calculateCostConsumption>;
    name: string;
  }> = [
    {
      name: "normalコストでvitality以下の値の時、全コストをvitalityで払う",
      args: [
        {
          vitality: 3,
        } as Idol,
        { kind: "normal", value: 3 },
      ],
      expected: [{ kind: "vitality", actual: -3, max: -3 }],
    },
    {
      name: "normalコストでvitalityを超える値の時、一部コストをvitalityで払い、一部をlifeで払う",
      args: [
        {
          life: 1,
          vitality: 3,
        } as Idol,
        { kind: "normal", value: 4 },
      ],
      expected: [
        { kind: "vitality", actual: -3, max: -4 },
        { kind: "life", actual: -1, max: -1 },
      ],
    },
    {
      name: "normalコストでvitalityとlifeの合計を超える値の時、一部コストをvitalityとlifeで払う",
      args: [
        {
          life: 1,
          vitality: 3,
        } as Idol,
        { kind: "normal", value: 5 },
      ],
      expected: [
        { kind: "vitality", actual: -3, max: -5 },
        { kind: "life", actual: -1, max: -2 },
      ],
    },
    {
      name: "normalコストでvitalityもlifeも0の時、lifeで0コストを払う",
      args: [
        {
          life: 0,
          vitality: 0,
        } as Idol,
        { kind: "normal", value: 3 },
      ],
      expected: [{ kind: "life", actual: 0, max: -3 }],
    },
    {
      name: "lifeコストでlife以下の値の時、全コストをlifeで払う",
      args: [
        {
          life: 3,
        } as Idol,
        { kind: "life", value: 3 },
      ],
      expected: [{ kind: "life", actual: -3, max: -3 }],
    },
    {
      name: "lifeコストでlifeを超える値の時、一部コストをlifeで払う",
      args: [
        {
          life: 2,
        } as Idol,
        { kind: "life", value: 3 },
      ],
      expected: [{ kind: "life", actual: -2, max: -3 }],
    },
    {
      name: "lifeコストでlifeが0の時、0コストをlifeで払う",
      args: [
        {
          life: 0,
        } as Idol,
        { kind: "life", value: 3 },
      ],
      expected: [{ kind: "life", actual: 0, max: -3 }],
    },
    {
      name: "amountプロパティのmodifierコストで、値がアイドルが持つmodifier以下の時、全部のコストを払う",
      args: [
        {
          modifiers: [{ kind: "focus", amount: 3, id: "a" }],
        } as Idol,
        { kind: "focus", value: 3 },
      ],
      expected: [
        {
          kind: "modifier.update",
          propertyNameKind: "amount",
          id: "a",
          actual: -3,
          max: -3,
        },
      ],
    },
    {
      name: "amountプロパティのmodifierコストで、値がアイドルが持つmodifierを超える時、一部のコストを払う",
      args: [
        {
          modifiers: [{ kind: "focus", amount: 3, id: "a" }],
        } as Idol,
        { kind: "focus", value: 4 },
      ],
      expected: [
        {
          kind: "modifier.update",
          propertyNameKind: "amount",
          id: "a",
          actual: -3,
          max: -4,
        },
      ],
    },
    {
      name: "amountプロパティのmodifierコストで、アイドルが相当するmodifierを持たない時、結果を返さない",
      args: [
        { modifiers: [] as Modifier[] } as Idol,
        { kind: "focus", value: 3 },
      ],
      expected: [],
    },
    {
      name: "durationプロパティのmodifierコストで、値がアイドルが持つmodifier以下の時、全部のコストを払う",
      args: [
        {
          modifiers: [{ kind: "goodCondition", duration: 3, id: "a" }],
        } as Idol,
        { kind: "goodCondition", value: 3 },
      ],
      expected: [
        {
          kind: "modifier.update",
          propertyNameKind: "duration",
          id: "a",
          actual: -3,
          max: -3,
        },
      ],
    },
    {
      name: "durationプロパティのmodifierコストで、値がアイドルが持つmodifierを超える時、一部のコストを払う",
      args: [
        {
          modifiers: [{ kind: "goodCondition", duration: 3, id: "a" }],
        } as Idol,
        { kind: "goodCondition", value: 4 },
      ],
      expected: [
        {
          kind: "modifier.update",
          propertyNameKind: "duration",
          id: "a",
          actual: -3,
          max: -4,
        },
      ],
    },
    {
      name: "amountプロパティのmodifierコストで、アイドルが相当するmodifierを持たない時、結果を返さない",
      args: [
        { modifiers: [] as Modifier[] } as Idol,
        { kind: "goodCondition", value: 3 },
      ],
      expected: [],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(calculateCostConsumption(...args)).toStrictEqual(expected);
  });
});
describe("calculatePerformingScoreEffect", () => {
  const testCases: {
    args: Parameters<typeof calculatePerformingScoreEffect>;
    expected: ReturnType<typeof calculatePerformingScoreEffect>;
    name: string;
  }[] = [
    {
      name: "状態変化などの条件がない時、指定通りのスコアを返す",
      args: [
        {
          modifiers: [] as Idol["modifiers"],
        } as Idol,
        undefined,
        undefined,
        { value: 9 },
      ],
      expected: [{ kind: "score", actual: 9, max: 9 }],
    },
    {
      name: "アイドルへ好調のみが付与されている時、1.5倍（端数切り上げ）したスコアを返す",
      args: [
        {
          modifiers: [{ kind: "goodCondition", duration: 1 }],
        } as Idol,
        undefined,
        undefined,
        { value: 9 },
      ],
      expected: [{ kind: "score", actual: 14, max: 14 }],
    },
    {
      name: "アイドルへ集中のみが付与されている時、その分を加算したスコアを返す",
      args: [
        {
          modifiers: [{ kind: "focus", amount: 1 }],
        } as Idol,
        undefined,
        undefined,
        { value: 9 },
      ],
      expected: [{ kind: "score", actual: 10, max: 10 }],
    },
    {
      name: "アイドルへパラメータ上昇量増加50%のみが付与されている時、1.5倍（端数切り上げ）したスコアを返す",
      args: [
        {
          modifiers: [{ kind: "mightyPerformance", duration: 1 }],
        } as Idol,
        undefined,
        undefined,
        { value: 9 },
      ],
      expected: [{ kind: "score", actual: 14, max: 14 }],
    },
    {
      name: "アイドルへ好調と集中が付与されている時、集中分も好調の倍率の影響を受ける",
      args: [
        {
          modifiers: [
            { kind: "goodCondition", duration: 1 },
            { kind: "focus", amount: 3 },
          ],
        } as Idol,
        undefined,
        undefined,
        { value: 1 },
      ],
      expected: [{ kind: "score", actual: 6, max: 6 }],
    },
    {
      name: "アイドルへ好調と絶好調が付与されている時、(1.5 + 好調ターン数 * 0.1)倍したスコアを返す",
      args: [
        {
          modifiers: [
            { kind: "goodCondition", duration: 5 },
            { kind: "excellentCondition", duration: 1 },
          ],
        } as Idol,
        undefined,
        undefined,
        { value: 10 },
      ],
      expected: [{ kind: "score", actual: 20, max: 20 }],
    },
    {
      name: "アイドルへ絶好調のみが付与されている時、好調の効果は発動しない",
      args: [
        {
          modifiers: [{ kind: "excellentCondition", duration: 1 }],
        } as Idol,
        undefined,
        undefined,
        { value: 10 },
      ],
      expected: [{ kind: "score", actual: 10, max: 10 }],
    },
    {
      name: "アイドルへ好調とパラメータ上昇量増加50%が付与されている時、(1.5 * 1.5)倍のスコアを返す",
      args: [
        {
          modifiers: [
            { kind: "goodCondition", duration: 1 },
            { kind: "mightyPerformance", duration: 1 },
          ],
        } as Idol,
        undefined,
        undefined,
        { value: 10 },
      ],
      expected: [{ kind: "score", actual: 23, max: 23 }],
    },
    {
      name: "スコアのクエリに集中増幅効果が指定されている時、集中の効果をその倍率分増加する",
      args: [
        {
          modifiers: [{ kind: "focus", amount: 1 }],
        } as Idol,
        undefined,
        undefined,
        { value: 1, focusMultiplier: 2.0 },
      ],
      expected: [{ kind: "score", actual: 3, max: 3 }],
    },
    {
      name: "スコアのクエリに回数が指定されている時、状態修正や集中増幅効果などの影響を反映した結果を回数分の結果で返す",
      args: [
        {
          modifiers: [{ kind: "focus", amount: 1 }],
        } as Idol,
        undefined,
        undefined,
        { value: 1, focusMultiplier: 2.0, times: 2 },
      ],
      expected: [
        { kind: "score", actual: 3, max: 3 },
        { kind: "score", actual: 3, max: 3 },
      ],
    },
    {
      name: "スコアボーナスが指定されている時、それをパーセンテージとして乗算する",
      args: [
        {
          modifiers: [] as Idol["modifiers"],
        } as Idol,
        201,
        undefined,
        { value: 10 },
      ],
      expected: [{ kind: "score", actual: 21, max: 21 }],
    },
    {
      name: "スコア増加値の上限が設定されている時、actualはその値を超えない",
      args: [
        {
          modifiers: [] as Idol["modifiers"],
        } as Idol,
        undefined,
        6,
        { value: 10 },
      ],
      expected: [{ kind: "score", actual: 6, max: 10 }],
    },
    {
      name: "スコア増加値の上限が設定されている中で複数回スコア増加の時、スコア増加の累計と上限を比較する",
      args: [
        {
          modifiers: [] as Idol["modifiers"],
        } as Idol,
        undefined,
        16,
        { value: 10, times: 3 },
      ],
      expected: [
        { kind: "score", actual: 10, max: 10 },
        { kind: "score", actual: 6, max: 10 },
        { kind: "score", actual: 0, max: 10 },
      ],
    },
    {
      name: "集中:4,好調:6,絶好調:有,ハイタッチ{未強化,+17,集中*1.5} は `(17 + 4 * 1.5) * (1.5 + 0.6) = 48.30` で 49 を返す",
      args: [
        {
          modifiers: [
            { kind: "focus", amount: 4 },
            { kind: "goodCondition", duration: 6 },
            { kind: "excellentCondition", duration: 1 },
          ] as Idol["modifiers"],
        } as Idol,
        undefined,
        undefined,
        { value: 17, focusMultiplier: 1.5 },
      ],
      expected: [{ kind: "score", actual: 49, max: 49 }],
    },
    // https://github.com/kjirou/gakumas-core/issues/81 の実例
    {
      name: "好調状態でパラメータ追加+23をスコアボーナス 1668% で使うと 584 を返す",
      args: [
        {
          modifiers: [
            { kind: "goodCondition", duration: 1 },
          ] as Idol["modifiers"],
        } as Idol,
        1668,
        undefined,
        { value: 23 },
      ],
      expected: [{ kind: "score", actual: 584, max: 584 }],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(calculatePerformingScoreEffect(...args)).toStrictEqual(expected);
  });
});
describe("calculatePerformingVitalityEffect", () => {
  const testCases: {
    args: Parameters<typeof calculatePerformingVitalityEffect>;
    expected: ReturnType<typeof calculatePerformingVitalityEffect>;
    name: string;
  }[] = [
    {
      name: "通常の元気増加",
      args: [
        {
          vitality: 0,
          modifiers: [] as Idol["modifiers"],
        } as Idol,
        { value: 1 },
      ],
      expected: {
        kind: "vitality",
        actual: 1,
        max: 1,
      },
    },
    {
      name: "やる気の数値を元気増加時に加算する",
      args: [
        {
          vitality: 0,
          modifiers: [{ kind: "motivation", amount: 10 }] as Idol["modifiers"],
        } as Idol,
        { value: 1 },
      ],
      expected: {
        kind: "vitality",
        actual: 11,
        max: 11,
      },
    },
    {
      name: "「レッスン中に使用したスキルカード1枚ごとに、元気増加量+n」の効果",
      args: [
        {
          vitality: 0,
          modifiers: [] as Idol["modifiers"],
          totalCardUsageCount: 3,
        } as Idol,
        { value: 1, boostPerCardUsed: 2 },
      ],
      expected: {
        kind: "vitality",
        actual: 7,
        max: 7,
      },
    },
    {
      name: "固定元気の時、他のいかなる修正も無視する",
      args: [
        {
          vitality: 0,
          modifiers: [{ kind: "motivation", amount: 10 }] as Idol["modifiers"],
          totalCardUsageCount: 3,
        } as Idol,
        { value: 1, boostPerCardUsed: 2, fixedValue: true },
      ],
      expected: {
        kind: "vitality",
        actual: 1,
        max: 1,
      },
    },
    {
      name: "元気増加無効が付与されている時、増加しない",
      args: [
        {
          vitality: 0,
          modifiers: [
            { kind: "noVitalityIncrease", duration: 1, id: "x" },
          ] as Idol["modifiers"],
        } as Idol,
        { value: 1 },
      ],
      expected: {
        kind: "vitality",
        actual: 0,
        max: 0,
      },
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(calculatePerformingVitalityEffect(...args)).toStrictEqual(expected);
  });
});
describe("activateEffectIf", () => {
  const testCases: Array<{
    args: Parameters<typeof activateEffectIf>;
    expected: ReturnType<typeof activateEffectIf>;
    name: string;
  }> = [
    {
      name: "drainLife",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.life = 1;
          lesson.idol.vitality = 3;
          return lesson;
        })(),
        { kind: "drainLife", value: 5 },
        () => 0,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "vitality",
          actual: -3,
          max: -5,
        },
        {
          kind: "life",
          actual: -1,
          max: -2,
        },
      ],
    },
    {
      name: "generateCard - 手札0枚で実行した時、強化されたSSRのスキルカードを追加して、手札はその1枚になる",
      args: [
        (() => {
          const lesson = createLessonForTest({ deck: [] });
          return lesson;
        })(),
        { kind: "generateCard" },
        () => 0,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "cards.addition",
          card: {
            id: expect.any(String),
            enhancements: [{ kind: "original" }],
            original: {
              id: expect.any(String),
              data: expect.objectContaining({
                rarity: "ssr",
              }),
              enhanced: true,
            },
          },
        },
        {
          kind: "cardPlacement",
          hand: [expect.any(String)],
        },
      ],
    },
    {
      name: "generateTroubleCard - 山札0枚で実行した時、眠気スキルカードを追加して、山札はその1枚になる",
      args: [
        (() => {
          const lesson = createLessonForTest({ deck: [] });
          return lesson;
        })(),
        { kind: "generateTroubleCard" },
        () => 0,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "cards.addition",
          card: {
            id: expect.any(String),
            enhancements: [],
            original: {
              id: expect.any(String),
              data: expect.objectContaining({
                id: "nemuke",
              }),
              enhanced: false,
            },
          },
        },
        {
          kind: "cardPlacement",
          deck: [expect.any(String)],
        },
      ],
    },
    {
      name: "increaseRemainingTurns",
      args: [
        (() => {
          const lesson = createLessonForTest();
          return lesson;
        })(),
        { kind: "increaseRemainingTurns", amount: 1 },
        () => 0,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "remainingTurnsChange",
          amount: 1,
        },
      ],
    },
    {
      name: "recoverLife - 体力回復で最大体力以下まで回復した時、指定した数値分の体力を回復する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.life = 1;
          return lesson;
        })(),
        { kind: "recoverLife", value: 2 },
        () => 0,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "life",
          actual: 2,
          max: 2,
        },
      ],
    },
    {
      name: "recoverLife - 体力回復で最大体力を超過して回復した時、最大値に到達するまでの体力を回復する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.life = lesson.idol.original.maxLife - 1;
          return lesson;
        })(),
        { kind: "recoverLife", value: 2 },
        () => 0,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "life",
          actual: 1,
          max: 2,
        },
      ],
    },
    {
      name: "multiplyModifier",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.modifiers = [
            { kind: "focus", amount: 10, id: "m1" },
            { kind: "positiveImpression", amount: 100, id: "m2" },
          ];
          return lesson;
        })(),
        {
          kind: "multiplyModifier",
          modifierKind: "positiveImpression",
          multiplier: 1.5,
        },
        () => 0,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "modifier.update",
          propertyNameKind: "amount",
          id: "m2",
          actual: 50,
          max: 50,
        },
      ],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(activateEffectIf(...args)).toStrictEqual(expected);
  });
});
describe("activateEffectsOnCardPlay", () => {
  const testCases: Array<{
    args: Parameters<typeof activateEffectsOnCardPlay>;
    expected: ReturnType<typeof activateEffectsOnCardPlay>;
    name: string;
  }> = [
    {
      name: "各効果発動は、自身より後の効果発動へ影響を与える",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.vitality = 0;
          return lesson;
        })(),
        [
          { kind: "perform", vitality: { value: 1 } },
          { kind: "performLeveragingVitality", percentage: 100 },
        ],
        () => 0,
        createIdGenerator(),
      ],
      expected: [
        [{ kind: "vitality", actual: 1, max: 1 }],
        [{ kind: "score", actual: 1, max: 1 }],
      ],
    },
    {
      name: "各効果の発動条件は、効果リスト発動前の状態を参照する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          return lesson;
        })(),
        [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 1 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 1 },
            condition: { kind: "hasGoodCondition" },
          },
        ],
        () => 0,
        createIdGenerator(),
      ],
      expected: [
        [
          {
            kind: "modifier",
            actual: {
              kind: "goodCondition",
              duration: 1,
              id: expect.any(String),
            },
            max: {
              kind: "goodCondition",
              duration: 1,
              id: expect.any(String),
            },
          },
        ],
        undefined,
      ],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(activateEffectsOnCardPlay(...args)).toStrictEqual(expected);
  });
});
describe("activateEffectsOfProducerItem", () => {
  const testCases: Array<{
    args: Parameters<typeof activateEffectsOfProducerItem>;
    expected: ReturnType<typeof activateEffectsOfProducerItem>;
    name: string;
  }> = [
    {
      name: "activationCount を 1 増加する",
      args: [
        (() => {
          const lesson = createLessonForTest({ producerItems: [] });
          return lesson;
        })(),
        {
          id: "a",
          original: {
            id: "a",
            data: getProducerItemDataById("gesennosenrihin"),
            enhanced: false,
          },
          activationCount: 0,
        },
        () => 0,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "modifier",
          actual: { kind: "focus", amount: 3, id: expect.any(String) },
          max: { kind: "focus", amount: 3, id: expect.any(String) },
        },
        {
          kind: "producerItem.activationCount",
          producerItemId: "a",
          value: 1,
        },
      ],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(activateEffectsOfProducerItem(...args)).toStrictEqual(expected);
  });
});
describe("activateMemoryEffect", () => {
  const testCases: Array<{
    args: Parameters<typeof activateMemoryEffect>;
    expected: ReturnType<typeof activateMemoryEffect>;
    name: string;
  }> = [
    {
      name: "可能性が0の時、常に結果を返さない",
      args: [
        (() => {
          const lesson = createLessonForTest();
          return lesson;
        })(),
        { kind: "focus", value: 1, probability: 0 },
        () => 0.999999999,
        createIdGenerator(),
      ],
      expected: [],
    },
    {
      name: "値がamountプロパティな状態修正を新規で付与する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          return lesson;
        })(),
        { kind: "focus", value: 1, probability: 100 },
        () => 0.999999999,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "modifier",
          actual: { kind: "focus", amount: 1, id: expect.any(String) },
          max: { kind: "focus", amount: 1, id: expect.any(String) },
        },
      ],
    },
    {
      name: "値がamountプロパティな状態修正を更新する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.modifiers = [{ kind: "focus", amount: 1, id: "a" }];
          return lesson;
        })(),
        { kind: "focus", value: 2, probability: 100 },
        () => 0.999999999,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "modifier.update",
          propertyNameKind: "amount",
          id: "a",
          actual: 2,
          max: 2,
        },
      ],
    },
    {
      name: "値がdurationプロパティな状態修正を新規で付与する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          return lesson;
        })(),
        { kind: "goodCondition", value: 1, probability: 100 },
        () => 0.999999999,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "modifier",
          actual: {
            kind: "goodCondition",
            duration: 1,
            id: expect.any(String),
          },
          max: { kind: "goodCondition", duration: 1, id: expect.any(String) },
        },
      ],
    },
    {
      name: "値がdurationプロパティな状態修正を更新する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.modifiers = [
            { kind: "goodCondition", duration: 1, id: "a" },
          ];
          return lesson;
        })(),
        { kind: "goodCondition", value: 2, probability: 100 },
        () => 0.999999999,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "modifier.update",
          propertyNameKind: "duration",
          id: "a",
          actual: 2,
          max: 2,
        },
      ],
    },
    {
      name: "元気をやる気の補正を付与して加算する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.vitality = 1;
          lesson.idol.modifiers = [{ kind: "motivation", amount: 1, id: "a" }];
          return lesson;
        })(),
        { kind: "vitality", value: 2, probability: 100 },
        () => 0.999999999,
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "vitality",
          actual: 3,
          max: 3,
        },
      ],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(activateMemoryEffect(...args)).toStrictEqual(expected);
  });
});
describe("activateEffectsEachProducerItemsAccordingToCardUsage", () => {
  test("スキルカード使用時トリガーである、「いつものメイクポーチ」は、アクティブスキルカード使用時、集中を付与する。メンタルスキルカード使用時は付与しない", () => {
    let lesson = createLessonForTest({
      producerItems: [
        {
          id: "a",
          data: getProducerItemDataById("itsumonomeikupochi"),
          enhanced: false,
        },
      ],
    });
    const dummyReason = {
      kind: "cardUsage",
      cardId: "x",
      historyTurnNumber: 1,
      historyResultIndex: 1,
    } as const;
    const { updates: updates1 } =
      activateEffectsEachProducerItemsAccordingToCardUsage(
        lesson,
        "beforeCardEffectActivation",
        () => 0,
        createIdGenerator(),
        dummyReason,
        {
          cardSummaryKind: "active",
        },
      );
    expect(updates1.filter((e) => e.kind === "modifier")).toStrictEqual([
      {
        kind: "modifier",
        actual: {
          kind: "focus",
          amount: 2,
          id: expect.any(String),
        },
        max: {
          kind: "focus",
          amount: 2,
          id: expect.any(String),
        },
        reason: expect.any(Object),
      },
    ]);
    const { updates: updates2 } =
      activateEffectsEachProducerItemsAccordingToCardUsage(
        lesson,
        "beforeCardEffectActivation",
        () => 0,
        createIdGenerator(),
        dummyReason,
        {
          cardSummaryKind: "mental",
        },
      );
    expect(updates2).toStrictEqual([]);
  });
  test("「最高にハッピーの源」は、「アドレナリン全開」スキルカード使用時、好調と固定元気を付与する。他スキルカード使用時は付与しない", () => {
    let lesson = createLessonForTest({
      producerItems: [
        {
          id: "a",
          data: getProducerItemDataById("saikonihappinominamoto"),
          enhanced: false,
        },
      ],
    });
    const dummyReason = {
      kind: "cardUsage",
      cardId: "x",
      historyTurnNumber: 1,
      historyResultIndex: 1,
    } as const;
    const { updates: updates1 } =
      activateEffectsEachProducerItemsAccordingToCardUsage(
        lesson,
        "beforeCardEffectActivation",
        () => 0,
        createIdGenerator(),
        dummyReason,
        {
          cardDataId: "adorenarinzenkai",
        },
      );
    expect(
      updates1.filter((e) => e.kind === "modifier" || e.kind === "vitality"),
    ).toStrictEqual([
      {
        kind: "modifier",
        actual: {
          kind: "goodCondition",
          duration: 3,
          id: expect.any(String),
        },
        max: {
          kind: "goodCondition",
          duration: 3,
          id: expect.any(String),
        },
        reason: expect.any(Object),
      },
      {
        kind: "vitality",
        actual: 5,
        max: 5,
        reason: expect.any(Object),
      },
    ]);
    const { updates: updates2 } =
      activateEffectsEachProducerItemsAccordingToCardUsage(
        lesson,
        "beforeCardEffectActivation",
        () => 0,
        createIdGenerator(),
        dummyReason,
        {
          cardDataId: "apirunokihon",
        },
      );
    expect(updates2).toStrictEqual([]);
  });
  test("「最高にハッピーの源」と「曇りをぬぐったタオル」は、1枚のアクティブスキルカード使用時に同時に効果発動し得る", () => {
    let lesson = createLessonForTest({
      producerItems: [
        {
          id: "a",
          data: getProducerItemDataById("saikonihappinominamoto"),
          enhanced: false,
        },
        {
          id: "b",
          data: getProducerItemDataById("kumoriwonuguttataoru"),
        },
      ],
    });
    const dummyReason = {
      kind: "cardUsage",
      cardId: "x",
      historyTurnNumber: 1,
      historyResultIndex: 1,
    } as const;
    const { updates } = activateEffectsEachProducerItemsAccordingToCardUsage(
      lesson,
      "beforeCardEffectActivation",
      () => 0,
      createIdGenerator(),
      dummyReason,
      {
        cardDataId: "adorenarinzenkai",
        cardSummaryKind: "active",
      },
    );
    expect(
      updates.filter(
        (e) =>
          e.kind === "modifier" || e.kind === "vitality" || e.kind === "life",
      ),
    ).toStrictEqual([
      {
        kind: "modifier",
        actual: {
          kind: "goodCondition",
          duration: 3,
          id: expect.any(String),
        },
        max: {
          kind: "goodCondition",
          duration: 3,
          id: expect.any(String),
        },
        reason: expect.any(Object),
      },
      {
        kind: "vitality",
        actual: 5,
        max: 5,
        reason: expect.any(Object),
      },
      {
        kind: "life",
        actual: 0,
        max: 2,
        reason: expect.any(Object),
      },
    ]);
  });
  test("スキルカード使用後トリガーである、「ビッグドリーム貯金箱」を、好印象が6以上の時、発動する。好印象が6未満の時、発動しない", () => {
    let lesson = createLessonForTest({
      producerItems: [
        {
          id: "a",
          data: getProducerItemDataById("biggudorimuchokimbako"),
          enhanced: false,
        },
      ],
    });
    lesson.idol.modifiers = [
      { kind: "positiveImpression", amount: 6, id: "m1" },
    ];
    const dummyReason = {
      kind: "cardUsage",
      cardId: "x",
      historyTurnNumber: 1,
      historyResultIndex: 1,
    } as const;
    const { updates: updates1 } =
      activateEffectsEachProducerItemsAccordingToCardUsage(
        lesson,
        "afterCardEffectActivation",
        () => 0,
        createIdGenerator(),
        dummyReason,
      );
    expect(updates1.filter((e) => e.kind === "modifier.update")).toStrictEqual([
      {
        kind: "modifier.update",
        propertyNameKind: "amount",
        id: "m1",
        actual: 3,
        max: 3,
        reason: expect.any(Object),
      },
    ]);
    expect(updates1.filter((e) => e.kind === "modifier")).toStrictEqual([
      {
        kind: "modifier",
        actual: {
          kind: "additionalCardUsageCount",
          amount: 1,
          id: expect.any(String),
        },
        max: {
          kind: "additionalCardUsageCount",
          amount: 1,
          id: expect.any(String),
        },
        reason: expect.any(Object),
      },
    ]);
    lesson.idol.modifiers = [
      { kind: "positiveImpression", amount: 5, id: "m1" },
    ];
    const { updates: updates2 } =
      activateEffectsEachProducerItemsAccordingToCardUsage(
        lesson,
        "afterCardEffectActivation",
        () => 0,
        createIdGenerator(),
        dummyReason,
      );
    expect(updates2).toStrictEqual([]);
  });
  test("状態修正トリガーである、「ひみつ特訓カーデ」を、やる気が上昇した時、発動する。やる気ではない時、発動しない", () => {
    let lesson = createLessonForTest({
      producerItems: [
        {
          id: "a",
          data: getProducerItemDataById("himitsutokkunkade"),
          enhanced: false,
        },
      ],
    });
    const dummyReason = {
      kind: "cardUsage",
      cardId: "x",
      historyTurnNumber: 1,
      historyResultIndex: 1,
    } as const;
    const { updates: updates1 } =
      activateEffectsEachProducerItemsAccordingToCardUsage(
        lesson,
        "modifierIncrease",
        () => 0,
        createIdGenerator(),
        dummyReason,
        {
          increasedModifierKinds: ["motivation"],
        },
      );
    expect(updates1.filter((e) => e.kind === "modifier")).toStrictEqual([
      {
        kind: "modifier",
        actual: {
          kind: "motivation",
          amount: 3,
          id: expect.any(String),
        },
        max: {
          kind: "motivation",
          amount: 3,
          id: expect.any(String),
        },
        reason: expect.any(Object),
      },
    ]);
    const { updates: updates2 } =
      activateEffectsEachProducerItemsAccordingToCardUsage(
        lesson,
        "modifierIncrease",
        () => 0,
        createIdGenerator(),
        dummyReason,
        {
          increasedModifierKinds: ["positiveImpression"],
        },
      );
    expect(updates2).toStrictEqual([]);
  });
});
describe("activateEffectsOnLessonStart", () => {
  const testCases: Array<{
    args: Parameters<typeof activateEffectsOnLessonStart>;
    expected: ReturnType<typeof activateEffectsOnLessonStart>;
    name: string;
  }> = [
    {
      name: "「ゲーセンの戦利品」を発動する",
      args: [
        createLessonForTest({
          producerItems: [
            {
              id: "a",
              data: getProducerItemDataById("gesennosenrihin"),
              enhanced: false,
            },
          ],
        }),
        1,
        {
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
        },
      ],
      expected: {
        updates: [
          {
            kind: "modifier",
            actual: { kind: "focus", amount: 3, id: expect.any(String) },
            max: { kind: "focus", amount: 3, id: expect.any(String) },
            reason: expect.any(Object),
          },
          {
            kind: "producerItem.activationCount",
            producerItemId: "a",
            value: 1,
            reason: expect.any(Object),
          },
        ],
        nextHistoryResultIndex: 2,
      },
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(activateEffectsOnLessonStart(...args)).toStrictEqual(expected);
  });
});
describe("activateEncouragementOnTurnStart", () => {
  const testCases: Array<{
    args: Parameters<typeof activateEncouragementOnTurnStart>;
    expected: ReturnType<typeof activateEncouragementOnTurnStart>;
    name: string;
  }> = [
    {
      name: "ターン番号が一致し、効果発動条件を満たす時、発動する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.turnNumber = 1;
          lesson.encouragements = [
            {
              turnNumber: 1,
              effect: {
                kind: "perform",
                condition: {
                  kind: "countModifier",
                  modifierKind: "motivation",
                  range: { min: 1 },
                },
                score: { value: 1 },
              },
            },
          ];
          lesson.idol.modifiers = [{ kind: "motivation", amount: 1, id: "m1" }];
          return lesson;
        })(),
        1,
        {
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
        },
      ],
      expected: {
        updates: [
          {
            kind: "score",
            actual: 1,
            max: 1,
            reason: expect.any(Object),
          },
        ],
        nextHistoryResultIndex: 2,
      },
    },
    {
      name: "ターン番号は一致するが、効果発動条件を満たさない時、発動しない",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.turnNumber = 1;
          lesson.encouragements = [
            {
              turnNumber: 1,
              effect: {
                kind: "perform",
                condition: {
                  kind: "countModifier",
                  modifierKind: "motivation",
                  range: { min: 1 },
                },
                score: { value: 1 },
              },
            },
          ];
          return lesson;
        })(),
        1,
        {
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
        },
      ],
      expected: {
        updates: [],
        nextHistoryResultIndex: 1,
      },
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(activateEncouragementOnTurnStart(...args)).toStrictEqual(expected);
  });
});
describe("drawCardsOnLessonStart", () => {
  test("山札に引く数が残っている時、山札はその分減り、捨札に変化はない / 1ターン目でレッスン開始時手札がない時、その更新は発行されない", () => {
    const lesson = createLessonForTest({
      deck: [
        ...["a", "b", "c", "d"].map((id) => ({
          id,
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        })),
      ],
    });
    lesson.deck = ["a", "b", "c"];
    lesson.discardPile = ["d"];
    lesson.turnNumber = 1;
    const { updates } = drawCardsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
    });
    expect(updates.filter((e) => e.kind === "cardPlacement")).toStrictEqual([
      {
        kind: "cardPlacement",
        hand: expect.arrayContaining(["a", "b", "c"]),
        deck: [],
        reason: expect.any(Object),
      },
    ]);
  });
  test("山札に引く数が残っていない時、山札は再構築された上で残りの引く数分減り、捨札は空になる", () => {
    const lesson = createLessonForTest({
      deck: [
        ...["a", "b", "c", "d"].map((id) => ({
          id,
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        })),
      ],
    });
    lesson.deck = ["a", "b"];
    lesson.discardPile = ["c", "d"];
    lesson.turnNumber = 2;
    const { updates } = drawCardsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
    });
    const update = updates.find((e) => e.kind === "cardPlacement") as any;
    expect(update.hand).toHaveLength(3);
    expect(update.deck).toHaveLength(1);
    expect(update.discardPile).toHaveLength(0);
    expect(update.removedCardPile).toBeUndefined();
  });
  test("山札が0枚で、前ターンに1枚捨札へ移動した時、山札は再構築され、捨札はその1枚のみになり、前ターンに1枚捨札へ移動したフラグは消える", () => {
    const lesson = createLessonForTest({
      deck: [
        ...["a", "b", "c", "d", "e"].map((id) => ({
          id,
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        })),
      ],
    });
    lesson.hand = [];
    lesson.deck = [];
    lesson.discardPile = ["a", "b", "c", "d", "e"];
    lesson.playedCardsOnEmptyDeck = ["e"];
    lesson.turnNumber = 2;
    const { updates } = drawCardsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
    });
    const newLesson = patchDiffs(lesson, updates);
    expect(newLesson.hand).toHaveLength(3);
    expect(newLesson.deck).toHaveLength(1);
    expect(newLesson.discardPile).toStrictEqual(["e"]);
    expect(newLesson.removedCardPile).toHaveLength(0);
    expect(
      updates.filter((e) => e.kind === "playedCardsOnEmptyDeck"),
    ).toStrictEqual([
      {
        kind: "playedCardsOnEmptyDeck",
        cardIds: [],
        reason: expect.any(Object),
      },
    ]);
  });
  test("1ターン目でレッスン開始時手札が1枚ある時、更新は2回発行され、手札は最終的にその札を含む3枚になる", () => {
    const lesson = createLessonForTest({
      deck: [
        ...["a", "b", "c"].map((id) => ({
          id,
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        })),
        ...["d"].map((id) => ({
          id,
          data: getCardDataById("shizukanaishi"),
          enhanced: false,
        })),
      ],
    });
    lesson.deck = ["a", "b", "c", "d"];
    lesson.turnNumber = 1;
    const { updates } = drawCardsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
    });
    expect(updates.filter((e) => e.kind === "cardPlacement")).toStrictEqual([
      {
        kind: "cardPlacement",
        deck: ["d", "a", "b", "c"],
        reason: expect.any(Object),
      },
      {
        kind: "cardPlacement",
        hand: ["d", "a", "b"],
        deck: ["c"],
        reason: expect.any(Object),
      },
    ]);
  });
  test("1ターン目でレッスン開始時手札が5枚ある時、手札は最終的にレッスン開始時手札のみの5枚になる", () => {
    const lesson = createLessonForTest({
      deck: [
        ...["a", "b", "c"].map((id) => ({
          id,
          data: getCardDataById("shizukanaishi"),
          enhanced: false,
        })),
        ...["d"].map((id) => ({
          id,
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        })),
        ...["e", "f"].map((id) => ({
          id,
          data: getCardDataById("shizukanaishi"),
          enhanced: false,
        })),
      ],
    });
    lesson.deck = ["a", "b", "c", "d", "e", "f"];
    lesson.turnNumber = 1;
    const { updates } = drawCardsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
    });
    expect(
      updates.filter((e) => e.kind === "cardPlacement").slice(-1),
    ).toStrictEqual([
      {
        kind: "cardPlacement",
        hand: ["a", "b", "c", "e", "f"],
        deck: ["d"],
        reason: expect.any(Object),
      },
    ]);
  });
  test("1ターン目でレッスン開始時手札が8枚ある時、手札は最終的にレッスン開始時手札のみの5枚になり、山札の先頭3枚はレッスン開始時手札である", () => {
    const lesson = createLessonForTest({
      deck: [
        ...["a", "b", "c"].map((id) => ({
          id,
          data: getCardDataById("shizukanaishi"),
          enhanced: false,
        })),
        ...["d"].map((id) => ({
          id,
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        })),
        ...["e", "f", "g", "h"].map((id) => ({
          id,
          data: getCardDataById("shizukanaishi"),
          enhanced: false,
        })),
        ...["i"].map((id) => ({
          id,
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        })),
      ],
    });
    lesson.deck = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    lesson.turnNumber = 1;
    const { updates } = drawCardsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
    });
    expect(
      updates.filter((e) => e.kind === "cardPlacement").slice(-1),
    ).toStrictEqual([
      {
        kind: "cardPlacement",
        hand: ["a", "b", "c", "e", "f"],
        deck: ["g", "h", "d", "i"],
        reason: expect.any(Object),
      },
    ]);
  });
  test("全てのスキルカードへ付与しているレッスンサポートを削除する", () => {
    const lesson = createLessonForTest({
      deck: [
        ...["a", "b", "c"].map((id) => ({
          id,
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        })),
      ],
    });
    const aCard = lesson.cards.find((e) => e.id === "a");
    if (aCard) {
      aCard.enhancements = [{ kind: "lessonSupport" }];
    }
    const cCard = lesson.cards.find((e) => e.id === "c");
    if (cCard) {
      cCard.enhancements = [{ kind: "lessonSupport" }];
    }
    const { updates } = drawCardsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
    });
    expect(
      updates.filter((e) => e.kind === "cards.removingLessonSupports"),
    ).toStrictEqual([
      {
        kind: "cards.removingLessonSupports",
        cardIds: ["a", "c"],
        reason: expect.any(Object),
      },
    ]);
  });
});
// canTriggerProducerItem のテストケースで可能な範囲はそちらで検証する
describe("activateProducerItemEffectsOnTurnStart", () => {
  test("「ばくおんライオン」を、好調状態の時、発動する", () => {
    const lesson = createLessonForTest({
      producerItems: [
        {
          id: "a",
          data: getProducerItemDataById("bakuonraion"),
          enhanced: false,
        },
      ],
    });
    lesson.idol.modifiers = [{ kind: "goodCondition", duration: 1, id: "x" }];
    const { updates } = activateProducerItemEffectsOnTurnStart(lesson, 1, {
      getRandom: () => 0,
      idGenerator: createIdGenerator(),
    });
    expect(updates.filter((e) => e.kind === "score")).toStrictEqual([
      {
        kind: "score",
        // 好調が付与されているので1.5倍になっている
        actual: 9,
        max: 9,
        reason: expect.any(Object),
      },
    ]);
  });
  test("「ばくおんライオン」を、好調状態ではない時、発動しない", () => {
    const lesson = createLessonForTest({
      producerItems: [
        {
          id: "a",
          data: getProducerItemDataById("bakuonraion"),
          enhanced: false,
        },
      ],
    });
    const { updates } = activateProducerItemEffectsOnTurnStart(lesson, 1, {
      getRandom: () => 0,
      idGenerator: createIdGenerator(),
    });
    expect(updates.filter((e) => e.kind === "score")).toStrictEqual([]);
  });
  test("「柴犬ポシェット」を、2ターン目の時、発動する", () => {
    const lesson = createLessonForTest({
      producerItems: [
        {
          id: "a",
          data: getProducerItemDataById("shibainuposhetto"),
          enhanced: false,
        },
      ],
    });
    lesson.turnNumber = 2;
    const { updates } = activateProducerItemEffectsOnTurnStart(lesson, 1, {
      getRandom: () => 0,
      idGenerator: createIdGenerator(),
    });
    expect(updates.filter((e) => e.kind === "vitality")).toStrictEqual([
      {
        kind: "vitality",
        actual: 5,
        max: 5,
        reason: expect.any(Object),
      },
    ]);
  });
  test("「柴犬ポシェット」を、1ターン目の時、発動しない", () => {
    const lesson = createLessonForTest({
      producerItems: [
        {
          id: "a",
          data: getProducerItemDataById("shibainuposhetto"),
          enhanced: false,
        },
      ],
    });
    lesson.turnNumber = 1;
    const { updates } = activateProducerItemEffectsOnTurnStart(lesson, 1, {
      getRandom: () => 0,
      idGenerator: createIdGenerator(),
    });
    expect(updates.filter((e) => e.kind === "vitality")).toStrictEqual([]);
  });
});
// Pアイテム発動条件については、canTriggerProducerItem のテストケースで可能な範囲はそちらで検証する
describe("activateModifierEffectsOnTurnStart", () => {
  test("次ターンと2ターン後にパラメータ追加する状態修正がある時、1回パラメータを追加し、それらの状態修正の残りターン数を減少する", () => {
    const lesson = createLessonForTest({
      deck: [
        {
          id: "a",
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        },
      ],
    });
    lesson.idol.modifiers = [
      {
        kind: "delayedEffect",
        delay: 1,
        id: "x",
        effect: {
          kind: "perform",
          score: {
            value: 10,
          },
        },
      },
      {
        kind: "delayedEffect",
        delay: 2,
        id: "y",
        effect: {
          kind: "perform",
          score: {
            value: 15,
          },
        },
      },
    ];
    const { updates } = activateModifierEffectsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
      idGenerator: createIdGenerator(),
    });
    expect(updates.filter((e) => e.kind === "score")).toStrictEqual([
      {
        kind: "score",
        actual: 10,
        max: 10,
        reason: expect.any(Object),
      },
    ]);
    expect(updates.filter((e) => e.kind === "modifier.update")).toStrictEqual([
      {
        kind: "modifier.update",
        propertyNameKind: "delay",
        id: "x",
        actual: -1,
        max: -1,
        reason: expect.any(Object),
      },
      {
        kind: "modifier.update",
        propertyNameKind: "delay",
        id: "y",
        actual: -1,
        max: -1,
        reason: expect.any(Object),
      },
    ]);
  });
  test("次ターンにスキルカードを1枚引く状態修正がある時、手札が1枚増え、その状態修正を減少する", () => {
    const lesson = createLessonForTest({
      deck: [
        {
          id: "a",
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        },
      ],
    });
    lesson.deck = ["a"];
    lesson.idol.modifiers = [
      {
        kind: "delayedEffect",
        delay: 1,
        id: "x",
        effect: {
          kind: "drawCards",
          amount: 1,
        },
      },
    ];
    const { updates } = activateModifierEffectsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
      idGenerator: createIdGenerator(),
    });
    expect(updates.filter((e) => e.kind === "cardPlacement")).toStrictEqual([
      {
        kind: "cardPlacement",
        hand: ["a"],
        deck: [],
        reason: expect.any(Object),
      },
    ]);
    expect(updates.filter((e) => e.kind === "modifier.update")).toStrictEqual([
      {
        kind: "modifier.update",
        propertyNameKind: "delay",
        id: "x",
        actual: -1,
        max: -1,
        reason: expect.any(Object),
      },
    ]);
  });
  test("次ターン・2ターン後・次ターンにスキルカードを1枚引く状態修正がある時、手札1枚増加を2回行い、全ての状態修正を減少する", () => {
    const lesson = createLessonForTest({
      deck: [
        ...["a", "b"].map((id) => ({
          id,
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        })),
      ],
    });
    lesson.deck = ["a", "b"];
    lesson.idol.modifiers = [
      {
        kind: "delayedEffect",
        delay: 1,
        id: "x",
        effect: {
          kind: "drawCards",
          amount: 1,
        },
      },
      {
        kind: "delayedEffect",
        delay: 2,
        id: "y",
        effect: {
          kind: "drawCards",
          amount: 1,
        },
      },
      {
        kind: "delayedEffect",
        delay: 1,
        id: "z",
        effect: {
          kind: "drawCards",
          amount: 1,
        },
      },
    ];
    const { updates } = activateModifierEffectsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
      idGenerator: createIdGenerator(),
    });
    expect(updates.filter((e) => e.kind === "cardPlacement")).toStrictEqual([
      {
        kind: "cardPlacement",
        hand: ["a"],
        deck: ["b"],
        reason: expect.any(Object),
      },
      {
        kind: "cardPlacement",
        hand: ["a", "b"],
        deck: [],
        reason: expect.any(Object),
      },
    ]);
    expect(updates.filter((e) => e.kind === "modifier.update")).toStrictEqual([
      {
        kind: "modifier.update",
        propertyNameKind: "delay",
        id: "x",
        actual: -1,
        max: -1,
        reason: expect.any(Object),
      },
      {
        kind: "modifier.update",
        propertyNameKind: "delay",
        id: "y",
        actual: -1,
        max: -1,
        reason: expect.any(Object),
      },
      {
        kind: "modifier.update",
        propertyNameKind: "delay",
        id: "z",
        actual: -1,
        max: -1,
        reason: expect.any(Object),
      },
    ]);
  });
  test("次ターンに手札を強化するを状態修正がある時、手札が全て強化され、その状態修正を減少する", () => {
    const lesson = createLessonForTest({
      deck: [
        ...["a", "b"].map((id) => ({
          id,
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        })),
      ],
    });
    lesson.hand = ["a", "b"];
    lesson.idol.modifiers = [
      {
        kind: "delayedEffect",
        delay: 1,
        id: "x",
        effect: {
          kind: "enhanceHand",
        },
      },
    ];
    const { updates } = activateModifierEffectsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
      idGenerator: createIdGenerator(),
    });
    expect(
      updates.filter((e) => e.kind === "cards.enhancement.effect"),
    ).toStrictEqual([
      {
        kind: "cards.enhancement.effect",
        cardIds: ["a", "b"],
        reason: expect.any(Object),
      },
    ]);
    expect(updates.filter((e) => e.kind === "modifier.update")).toStrictEqual([
      {
        kind: "modifier.update",
        propertyNameKind: "delay",
        id: "x",
        actual: -1,
        max: -1,
        reason: expect.any(Object),
      },
    ]);
  });
  test("次ターンにスキルカードを引く状態修正と手札を強化する状態修正がある時、手札が引かれた状態で、手札が全て強化される", () => {
    const lesson = createLessonForTest({
      deck: [
        ...["a", "b"].map((id) => ({
          id,
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        })),
      ],
    });
    lesson.hand = ["a"];
    lesson.deck = ["b"];
    lesson.idol.modifiers = [
      {
        kind: "delayedEffect",
        delay: 1,
        id: "x",
        effect: {
          kind: "enhanceHand",
        },
      },
      {
        kind: "delayedEffect",
        delay: 1,
        id: "y",
        effect: {
          kind: "drawCards",
          amount: 1,
        },
      },
    ];
    const { updates } = activateModifierEffectsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
      idGenerator: createIdGenerator(),
    });
    expect(
      updates.filter((e) => e.kind === "cards.enhancement.effect"),
    ).toStrictEqual([
      {
        kind: "cards.enhancement.effect",
        cardIds: ["a", "b"],
        reason: expect.any(Object),
      },
    ]);
  });
});
describe("decreaseEachModifierDurationOverTime", () => {
  const testCases: Array<{
    args: Parameters<typeof decreaseEachModifierDurationOverTime>;
    expected: ReturnType<typeof decreaseEachModifierDurationOverTime>;
    name: string;
  }> = [
    {
      name: "時間経過で減少する状態修正と減少しない状態修正がある時、減少する状態修正のみ減少する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.modifiers = [
            { kind: "goodCondition", duration: 1, id: "x" },
            { kind: "focus", amount: 1, id: "y" },
          ];
          lesson.idol.modifierIdsAtTurnStart = ["x", "y"];
          return lesson;
        })(),
        1,
      ],
      expected: {
        updates: [
          {
            kind: "modifier.update",
            propertyNameKind: "duration",
            id: "x",
            actual: -1,
            max: -1,
            reason: expect.any(Object),
          },
        ],
        nextHistoryResultIndex: 2,
      },
    },
    {
      name: "前ターン開始時に存在した状態修正とそうではない状態修正がある時、前ターン開始時に存在した状態修正のみ減少する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.modifiers = [
            { kind: "goodCondition", duration: 1, id: "x" },
            { kind: "excellentCondition", duration: 1, id: "y" },
          ];
          lesson.idol.modifierIdsAtTurnStart = ["x"];
          return lesson;
        })(),
        1,
      ],
      expected: {
        updates: [
          {
            kind: "modifier.update",
            propertyNameKind: "duration",
            id: "x",
            actual: -1,
            max: -1,
            reason: expect.any(Object),
          },
        ],
        nextHistoryResultIndex: 2,
      },
    },
    {
      name: "強度のプロパティ名がdurationではない一部も状態修正も、この処理で減少する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.modifiers = [
            { kind: "positiveImpression", amount: 1, id: "x" },
          ];
          lesson.idol.modifierIdsAtTurnStart = ["x"];
          return lesson;
        })(),
        1,
      ],
      expected: {
        updates: [
          {
            kind: "modifier.update",
            propertyNameKind: "amount",
            id: "x",
            actual: -1,
            max: -1,
            reason: expect.any(Object),
          },
        ],
        nextHistoryResultIndex: 2,
      },
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(decreaseEachModifierDurationOverTime(...args)).toStrictEqual(
      expected,
    );
  });
});
// 基本的には activateMemoryEffect 側でテストする
describe("activateMemoryEffectsOnLessonStart", () => {
  const testCases: Array<{
    args: Parameters<typeof activateMemoryEffectsOnLessonStart>;
    expected: ReturnType<typeof activateMemoryEffectsOnLessonStart>;
    name: string;
  }> = [
    {
      name: "設定がない時、発動しない",
      args: [
        createLessonForTest(),
        1,
        { getRandom: () => 0, idGenerator: createIdGenerator() },
      ],
      expected: {
        updates: [],
        nextHistoryResultIndex: 1,
      },
    },
    {
      name: "100%発動する設定がある時、発動する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.memoryEffects = [
            { kind: "focus", value: 1, probability: 100 },
          ];
          return lesson;
        })(),
        1,
        { getRandom: () => 0, idGenerator: createIdGenerator() },
      ],
      expected: {
        updates: [
          {
            kind: "modifier",
            actual: { kind: "focus", amount: 1, id: expect.any(String) },
            max: { kind: "focus", amount: 1, id: expect.any(String) },
            reason: expect.any(Object),
          },
        ],
        nextHistoryResultIndex: 2,
      },
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(activateMemoryEffectsOnLessonStart(...args)).toStrictEqual(expected);
  });
});
describe("consumeRemainingCardUsageCount", () => {
  const testCases: Array<{
    args: Parameters<typeof consumeRemainingCardUsageCount>;
    expected: ReturnType<typeof consumeRemainingCardUsageCount>;
    name: string;
  }> = [
    {
      name: "スキルカード使用数追加がない時、アクションポイントを減らす",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.actionPoints = 1;
          return lesson;
        })(),
        1,
      ],
      expected: {
        updates: [
          {
            kind: "actionPoints",
            amount: -1,
            reason: expect.any(Object),
          },
        ],
        nextHistoryResultIndex: 2,
      },
    },
    {
      name: "スキルカード使用数追加もアクションポイントもない時、アクションポイントを0変更する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.actionPoints = 0;
          return lesson;
        })(),
        1,
      ],
      expected: {
        updates: [
          {
            kind: "actionPoints",
            amount: 0,
            reason: expect.any(Object),
          },
        ],
        nextHistoryResultIndex: 2,
      },
    },
    {
      name: "スキルカード使用数追加とアクションポイントがある時、スキルカード使用数追加を減らす",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.actionPoints = 1;
          lesson.idol.modifiers = [
            {
              kind: "additionalCardUsageCount",
              amount: 1,
              id: "x",
            },
          ];
          return lesson;
        })(),
        1,
      ],
      expected: {
        updates: [
          {
            kind: "modifier.update",
            propertyNameKind: "amount",
            id: "x",
            actual: -1,
            max: -1,
            reason: expect.any(Object),
          },
        ],
        nextHistoryResultIndex: 2,
      },
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(consumeRemainingCardUsageCount(...args)).toStrictEqual(expected);
  });
});
describe("useCard preview:false", () => {
  describe("手札の消費", () => {
    test("「レッスン中1回」ではない手札を使った時は、捨札へ移動", () => {
      const lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("apirunokihon"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a"];
      const { updates } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      const update = updates.find((e) => e.kind === "cardPlacement") as any;
      expect(update.hand).toStrictEqual([]);
      expect(update.deck).toBeUndefined();
      expect(update.discardPile).toStrictEqual(["a"]);
      expect(update.removedCardPile).toBeUndefined();
    });
    test("「レッスン中1回」の手札を使った時は、除外へ移動", () => {
      const lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("hyogennokihon"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a"];
      const { updates } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      const update = updates.find((e) => e.kind === "cardPlacement") as any;
      expect(update.hand).toStrictEqual([]);
      expect(update.deck).toBeUndefined();
      expect(update.discardPile).toBeUndefined();
      expect(update.removedCardPile).toStrictEqual(["a"]);
    });
  });
  // 基本的には calculateCostConsumption のテストで行う
  describe("コストの消費", () => {
    test("it works", () => {
      const lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("apirunokihon"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a"];
      lesson.idol.vitality = 3;
      const { updates } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      expect(updates.filter((e) => e.kind === "vitality")).toStrictEqual([
        {
          kind: "vitality",
          actual: -3,
          max: -4,
          reason: expect.any(Object),
        },
      ]);
      expect(updates.filter((e) => e.kind === "life")).toStrictEqual([
        {
          kind: "life",
          actual: -1,
          max: -1,
          reason: expect.any(Object),
        },
      ]);
    });
    test("状態修正により消費体力が変動", () => {
      const lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("genkinaaisatsu"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a"];
      lesson.idol.modifiers = [
        { kind: "lifeConsumptionReduction", value: 1, id: "x" },
      ];
      const { updates } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      expect(updates.find((e) => e.kind === "life")).toStrictEqual({
        kind: "life",
        actual: -3,
        max: -3,
        reason: expect.any(Object),
      });
    });
  });
  // 基本的には activateEffectsEachProducerItemsAccordingToCardUsage のテストで検証する
  describe("Pアイテムに起因する、スキルカード使用時の主効果発動前の効果発動", () => {
    test("「アドレナリン全開」の使用により「最高にハッピーの源」が発動する", () => {
      let lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("adorenarinzenkai"),
            enhanced: false,
          },
        ],
        producerItems: [
          {
            id: "p",
            data: getProducerItemDataById("saikonihappinominamoto"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a"];
      const { updates } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      expect(
        updates.filter(
          (e) => e.kind === "modifier" || e.kind === "modifier.update",
        ),
      ).toStrictEqual([
        {
          kind: "modifier",
          actual: {
            kind: "goodCondition",
            duration: 3,
            id: expect.any(String),
          },
          max: {
            kind: "goodCondition",
            duration: 3,
            id: expect.any(String),
          },
          reason: expect.any(Object),
        },
        {
          kind: "modifier.update",
          propertyNameKind: "duration",
          id: expect.any(String),
          actual: 3,
          max: 3,
          reason: expect.any(Object),
        },
        {
          kind: "modifier",
          actual: {
            kind: "excellentCondition",
            duration: 4,
            id: expect.any(String),
          },
          max: {
            kind: "excellentCondition",
            duration: 4,
            id: expect.any(String),
          },
          reason: expect.any(Object),
        },
      ]);
    });
  });
  describe("状態修正に起因する、スキルカード使用時の効果発動", () => {
    test("「ファンシーチャーム」は、メンタルスキルカード使用時、好印象を付与する。アクティブスキルカード使用時は付与しない", () => {
      let lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("fanshichamu"),
            enhanced: false,
          },
          {
            id: "b",
            data: getCardDataById("hyogennokihon"),
            enhanced: false,
          },
          {
            id: "c",
            data: getCardDataById("apirunokihon"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a", "b", "c"];
      const idGenerator = createIdGenerator();
      const { updates: updates1 } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      expect(
        updates1.filter(
          (e) =>
            e.kind === "modifier" &&
            e.actual.kind === "effectActivationBeforeCardEffectActivation",
        ),
      ).toStrictEqual([
        {
          kind: "modifier",
          actual: {
            kind: "effectActivationBeforeCardEffectActivation",
            cardKind: "mental",
            effect: expect.any(Object),
            id: expect.any(String),
          },
          max: {
            kind: "effectActivationBeforeCardEffectActivation",
            cardKind: "mental",
            effect: expect.any(Object),
            id: expect.any(String),
          },
          reason: expect.any(Object),
        },
      ]);

      lesson = patchDiffs(lesson, updates1);

      const { updates: updates2a } = useCard(lesson, 2, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator,
        preview: false,
      });
      expect(
        updates2a.filter((e) => e.kind === "modifier.update"),
      ).toStrictEqual([
        {
          kind: "modifier.update",
          propertyNameKind: "amount",
          id: expect.any(String),
          actual: 1,
          max: 1,
          reason: expect.any(Object),
        },
      ]);

      const { updates: updates2b } = useCard(lesson, 2, {
        selectedCardInHandIndex: 1,
        getRandom: () => 0,
        idGenerator,
        preview: false,
      });
      expect(updates2b.filter((e) => e.kind === "modifier")).toStrictEqual([]);
    });
    test("「演出計画」は、アクティブスキルカード使用時、固定元気を付与する。メンタルスキルカード使用時は付与しない", () => {
      let lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("enshutsukeikaku"),
            enhanced: false,
          },
          {
            id: "b",
            data: getCardDataById("apirunokihon"),
            enhanced: false,
          },
          {
            id: "c",
            data: getCardDataById("shinkokyu"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a", "b", "c"];
      const idGenerator = createIdGenerator();
      const { updates: updates1 } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator,
        preview: false,
      });
      expect(
        updates1.filter(
          (e) =>
            e.kind === "modifier" &&
            e.actual.kind === "effectActivationBeforeCardEffectActivation",
        ),
      ).toStrictEqual([
        {
          kind: "modifier",
          actual: {
            kind: "effectActivationBeforeCardEffectActivation",
            cardKind: "active",
            effect: expect.any(Object),
            id: expect.any(String),
          },
          max: {
            kind: "effectActivationBeforeCardEffectActivation",
            cardKind: "active",
            effect: expect.any(Object),
            id: expect.any(String),
          },
          reason: expect.any(Object),
        },
      ]);

      lesson = patchDiffs(lesson, updates1);

      const { updates: updates2a } = useCard(lesson, 2, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator,
        preview: false,
      });
      expect(updates2a.filter((e) => e.kind === "vitality")).toStrictEqual([
        {
          kind: "vitality",
          actual: 2,
          max: 2,
          reason: expect.any(Object),
        },
      ]);

      const { updates: updates2b } = useCard(lesson, 2, {
        selectedCardInHandIndex: 1,
        getRandom: () => 0,
        idGenerator,
        preview: false,
      });
      expect(updates2b.filter((e) => e.kind === "vitality")).toHaveLength(0);
    });
    test("「輝くキミへ」を発動できる", () => {
      let lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("kagayakukimihe"),
            enhanced: false,
          },
          {
            id: "b",
            data: getCardDataById("hyogennokihon"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a", "b"];
      lesson.idol.modifiers = [
        { kind: "motivation", amount: 4, id: "x" },
        { kind: "positiveImpression", amount: 10, id: "y" },
      ];
      const idGenerator = createIdGenerator();
      const { updates: updates1 } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator,
        preview: false,
      });
      expect(
        updates1.filter(
          (e) =>
            e.kind === "modifier" &&
            e.actual.kind === "effectActivationBeforeCardEffectActivation",
        ),
      ).toStrictEqual([
        {
          kind: "modifier",
          actual: {
            kind: "effectActivationBeforeCardEffectActivation",
            effect: expect.any(Object),
            id: expect.any(String),
          },
          max: {
            kind: "effectActivationBeforeCardEffectActivation",
            effect: expect.any(Object),
            id: expect.any(String),
          },
          reason: expect.any(Object),
        },
      ]);

      lesson = patchDiffs(lesson, updates1);

      const { updates: updates2 } = useCard(lesson, 2, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator,
        preview: false,
      });
      expect(updates2.filter((e) => e.kind === "score")).toStrictEqual([
        {
          kind: "score",
          actual: 3,
          max: 3,
          reason: expect.any(Object),
        },
      ]);
    });
  });
  // 個別の効果発動に関するテストは、 activeEffect のテストで検証する
  describe("主効果発動", () => {
    describe("効果適用条件を満たさない効果は適用されない", () => {
      test("「飛躍」は、集中が足りない時、パラメータ上昇は1回のみ適用する", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("hiyaku"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        expect(updates.filter((e) => e.kind === "score")).toHaveLength(1);
      });
    });
    describe("「次に使用するスキルカードの効果をもう1回発動」が付与されている時", () => {
      test("コスト消費は1回のみだが、選択したスキルカードの効果を2回発動し、2回目の効果には1回目の状態修正が反映されていて、追加でdoubleEffectを消費する更新を生成する", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("jumbiundo"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.modifiers = [{ kind: "doubleEffect", id: "x" }];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        expect(updates.filter((e) => e.kind === "life")).toHaveLength(1);
        expect(updates.filter((e) => e.kind === "score")).toHaveLength(2);
        expect(
          updates.filter(
            (e) => e.kind === "modifier" && e.actual.kind === "focus",
          ),
        ).toHaveLength(1);
        expect(
          updates.filter(
            (e) =>
              e.kind === "modifier.update" && e.propertyNameKind === "amount",
          ),
        ).toHaveLength(1);
        expect(updates.filter((e) => e.kind === "score")[0]).toStrictEqual({
          kind: "score",
          actual: 6,
          max: 6,
          reason: expect.any(Object),
        });
        expect(updates.filter((e) => e.kind === "score")[1]).toStrictEqual({
          kind: "score",
          actual: 8,
          max: 8,
          reason: expect.any(Object),
        });
        expect(
          updates.filter((e) => e.kind === "modifier.remove"),
        ).toStrictEqual([
          {
            kind: "modifier.remove",
            id: "x",
            reason: expect.any(Object),
          },
        ]);
      });
    });
    describe("drawCards", () => {
      test("「アイドル宣言」を、山札が足りる・手札最大枚数を超えない状況で使った時、手札が2枚増え、捨札は不変で、除外が1枚増える / playedCardsOnEmptyDeck の更新を発行しない", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("aidorusengen"),
              enhanced: false,
            },
            ...["b", "c"].map((id) => ({
              id,
              data: getCardDataById("apirunokihon"),
              enhanced: false,
            })),
          ],
        });
        lesson.hand = ["a"];
        lesson.deck = ["b", "c"];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        // 手札使用時の更新があるため、効果による手札増加は2番目の更新になる
        const update = updates.filter(
          (e) => e.kind === "cardPlacement",
        )[1] as any;
        expect(update.hand).toHaveLength(2);
        expect(update.deck).toHaveLength(0);
        expect(update.discardPile).toBeUndefined();
        expect(update.removedCardPile).toBeUndefined();
        expect(
          updates.filter((e) => e.kind === "playedCardsOnEmptyDeck"),
        ).toStrictEqual([]);
      });
      test("「アイドル宣言」を、山札が足りない状況で使った時、山札と捨札は再構築される / playedCardsOnEmptyDeck を空にする更新を発行する", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("aidorusengen"),
              enhanced: false,
            },
            ...["b", "c", "d"].map((id) => ({
              id,
              data: getCardDataById("apirunokihon"),
              enhanced: false,
            })),
          ],
        });
        lesson.hand = ["a"];
        lesson.deck = ["b"];
        lesson.discardPile = ["c", "d"];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        // 手札使用時の更新があるため、効果による手札増加は2番目の更新になる
        const update = updates.filter(
          (e) => e.kind === "cardPlacement",
        )[1] as any;
        expect(update.hand).toHaveLength(2);
        expect(update.deck).toHaveLength(1);
        expect(update.discardPile).toHaveLength(0);
        expect(update.removedCardPile).toBeUndefined();
        expect(
          updates.filter((e) => e.kind === "playedCardsOnEmptyDeck"),
        ).toStrictEqual([
          {
            kind: "playedCardsOnEmptyDeck",
            cardIds: [],
            reason: expect.any(Object),
          },
        ]);
      });
      test("「アイドル宣言」を、手札最大枚数が超える状況で使った時、手札は最大枚数で、捨札が増える", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("aidorusengen"),
              enhanced: false,
            },
            ...["b", "c", "d", "e", "f", "g"].map((id) => ({
              id,
              data: getCardDataById("apirunokihon"),
              enhanced: false,
            })),
          ],
        });
        lesson.hand = ["a", "b", "c", "d", "e"];
        lesson.deck = ["f", "g"];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        // 手札使用時の更新があるため、効果による手札増加は2番目の更新になる
        const update = updates.filter(
          (e) => e.kind === "cardPlacement",
        )[1] as any;
        expect(update.hand).toHaveLength(5);
        expect(update.deck).toHaveLength(0);
        expect(update.discardPile).toHaveLength(1);
        expect(update.removedCardPile).toBeUndefined();
      });
    });
    describe("enhanceHand", () => {
      test("「ティーパーティ」は、自分以外の、プロデュース中またはレッスン中に強化していない手札のみを強化する", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("teipatei"),
              enhanced: false,
            },
            ...["b", "c", "d"].map((id) => ({
              id,
              data: getCardDataById("apirunokihon"),
              enhanced: false,
            })),
            ...["e"].map((id) => ({
              id,
              data: getCardDataById("apirunokihon"),
              enhanced: true,
            })),
          ],
        });
        lesson.hand = ["a", "b", "c", "d", "e"];
        const dCard = lesson.cards.find((e) => e.id === "d") as Card;
        dCard.enhancements = [{ kind: "effect" }];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        const enhancedCardIds = (
          updates.find((e) => e.kind === "cards.enhancement.effect") as any
        ).cardIds;
        expect(enhancedCardIds).not.toContain("a");
        expect(enhancedCardIds).toContain("b");
        expect(enhancedCardIds).toContain("c");
        expect(enhancedCardIds).not.toContain("d");
        expect(enhancedCardIds).not.toContain("e");
      });
    });
    describe("exchangeHand", () => {
      test("「仕切り直し」を、手札3枚の状況で使った時、残りの手札は捨札へ入り、手札は山札から引いた新しい2枚になる", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("shikirinaoshi"),
              enhanced: false,
            },
            ...["b", "c", "d", "e", "f"].map((id) => ({
              id,
              data: getCardDataById("apirunokihon"),
              enhanced: false,
            })),
          ],
        });
        lesson.hand = ["a", "b", "c"];
        lesson.deck = ["d", "e"];
        lesson.discardPile = ["f"];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        // 手札使用時の更新があるため、効果による手札増加は2番目の更新になる
        const update = updates.filter(
          (e) => e.kind === "cardPlacement",
        )[1] as any;
        expect(update.hand).toHaveLength(2);
        expect(update.hand).toContain("d");
        expect(update.hand).toContain("e");
        expect(update.deck).toHaveLength(0);
        expect(update.discardPile).toHaveLength(3);
        expect(update.discardPile).toContain("b");
        expect(update.discardPile).toContain("c");
        expect(update.discardPile).toContain("f");
        expect(update.removedCardPile).toBeUndefined();
      });
      test("「仕切り直し」で山札の再構築が発生した時、playedCardsOnEmptyDeckを空にする更新を発行する", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("shikirinaoshi"),
              enhanced: false,
            },
            ...["b", "c", "d", "e"].map((id) => ({
              id,
              data: getCardDataById("apirunokihon"),
              enhanced: false,
            })),
          ],
        });
        lesson.hand = ["a", "b", "c"];
        lesson.deck = ["d"];
        lesson.discardPile = ["e"];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        expect(
          updates.filter((e) => e.kind === "playedCardsOnEmptyDeck"),
        ).toStrictEqual([
          {
            kind: "playedCardsOnEmptyDeck",
            cardIds: [],
            reason: expect.any(Object),
          },
        ]);
      });
      test("「仕切り直し」で山札の再構築が発生しない時、playedCardsOnEmptyDeckの更新を発行しない", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("shikirinaoshi"),
              enhanced: false,
            },
            ...["b", "c", "d", "e"].map((id) => ({
              id,
              data: getCardDataById("apirunokihon"),
              enhanced: false,
            })),
          ],
        });
        lesson.hand = ["a", "b", "c"];
        lesson.deck = ["d", "e"];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        expect(
          updates.filter((e) => e.kind === "playedCardsOnEmptyDeck"),
        ).toStrictEqual([]);
      });
    });
    describe("getModifier", () => {
      test("新規追加の時", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("furumainokihon"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        expect(updates.filter((e) => e.kind === "modifier")).toStrictEqual([
          {
            kind: "modifier",
            actual: {
              kind: "goodCondition",
              duration: 2,
              id: expect.any(String),
            },
            max: {
              kind: "goodCondition",
              duration: 2,
              id: expect.any(String),
            },
            reason: expect.any(Object),
          },
        ]);
      });
      test("既存の状態修正と合算の時", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("furumainokihon"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.modifiers = [
          { kind: "goodCondition", duration: 1, id: "x" },
        ];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        expect(
          updates.filter((e) => e.kind === "modifier.update"),
        ).toStrictEqual([
          {
            kind: "modifier.update",
            propertyNameKind: "duration",
            id: "x",
            actual: 2,
            max: 2,
            reason: expect.any(Object),
          },
        ]);
      });
      test("既存の状態修正が存在しても新規追加になる状態修正の時", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("enshutsukeikaku"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.modifiers = [
          {
            kind: "effectActivationBeforeCardEffectActivation",
            cardKind: "active",
            id: "x",
          } as Modifier,
        ];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        expect(
          updates.filter(
            (e) =>
              e.kind === "modifier" &&
              e.actual.kind === "effectActivationBeforeCardEffectActivation",
          ),
        ).toStrictEqual([
          {
            kind: "modifier",
            actual: {
              kind: "effectActivationBeforeCardEffectActivation",
              cardKind: "active",
              effect: expect.any(Object),
              id: expect.any(String),
            },
            max: {
              kind: "effectActivationBeforeCardEffectActivation",
              cardKind: "active",
              effect: expect.any(Object),
              id: expect.any(String),
            },
            reason: expect.any(Object),
          },
        ]);
      });
    });
    // calculatePerformingScoreEffect と calculatePerformingVitalityEffect のテストで検証できる内容はそちらで行う
    describe("perform", () => {
      test("レッスンにスコア上限がある時、スコアはそれを超えない増加値を返す", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("apirunokihon"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.score = 9;
        lesson.clearScoreThresholds = {
          clear: 5,
          perfect: 10,
        };
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        const filtered = updates.filter((e) => e.kind === "score") as any[];
        expect(filtered).toStrictEqual([
          {
            kind: "score",
            actual: 1,
            max: 9,
            reason: expect.any(Object),
          },
        ]);
      });
      test("クリアスコアの設定だけありパーフェクトの設定がない時、レッスンにスコア上限はないと判断する", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("apirunokihon"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.clearScoreThresholds = {
          clear: 1,
        };
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        const filtered = updates.filter((e) => e.kind === "score") as any[];
        expect(filtered).toStrictEqual([
          {
            kind: "score",
            actual: 9,
            max: 9,
            reason: expect.any(Object),
          },
        ]);
      });
      test("スコアボーナスの設定を反映する", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("apirunokihon"),
              enhanced: false,
            },
          ],
        });
        lesson.turns = ["vocal"];
        lesson.idol.scoreBonus = { vocal: 300, visual: 200, dance: 100 };
        lesson.hand = ["a"];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        const filtered = updates.filter((e) => e.kind === "score") as any[];
        expect(filtered).toStrictEqual([
          {
            kind: "score",
            actual: 27,
            max: 27,
            reason: expect.any(Object),
          },
        ]);
      });
      test("複数の更新を生成するスコア増加を返す", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("shikosakugo"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        const filtered = updates.filter((e) => e.kind === "score") as any[];
        expect(filtered).toStrictEqual([
          {
            kind: "score",
            actual: 8,
            max: 8,
            reason: expect.any(Object),
          },
          {
            kind: "score",
            actual: 8,
            max: 8,
            reason: expect.any(Object),
          },
        ]);
      });
      test("スコアと元気の更新を同時に返す", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("pozunokihon"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        const filtered = updates.filter(
          (e) => e.kind === "score" || e.kind === "vitality",
        ) as any[];
        expect(filtered).toStrictEqual([
          {
            kind: "score",
            actual: 2,
            max: 2,
            reason: expect.any(Object),
          },
          {
            kind: "vitality",
            actual: 2,
            max: 2,
            reason: expect.any(Object),
          },
        ]);
      });
    });
    describe("performLeveragingModifier", () => {
      test("motivation", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("kaika"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.modifiers = [{ kind: "motivation", amount: 10, id: "x" }];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        expect(updates.find((e) => e.kind === "score")).toStrictEqual({
          kind: "score",
          // 開花が持つやる気上昇の効果を受けている
          actual: 32,
          max: 32,
          reason: expect.any(Object),
        });
      });
      test("positiveImpression", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("200sumairu"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.modifiers = [
          { kind: "positiveImpression", amount: 10, id: "x" },
        ];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        expect(updates.find((e) => e.kind === "score")).toStrictEqual({
          kind: "score",
          // 「200%スマイル」が持つ、好印象上昇の効果を受けている
          actual: 15,
          max: 15,
          reason: expect.any(Object),
        });
      });
      test("スコア上限の設定がある時は、actualはその値を超えない", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("kaika"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.clearScoreThresholds = {
          clear: 1,
          perfect: 6,
        };
        lesson.idol.modifiers = [{ kind: "motivation", amount: 5, id: "x" }];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        expect(updates.find((e) => e.kind === "score")).toStrictEqual({
          kind: "score",
          actual: 6,
          max: 22,
          reason: expect.any(Object),
        });
      });
    });
    describe("performLeveragingVitality", () => {
      test("通常", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("genkinaaisatsu"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.vitality = 10;
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        const update = updates.find((e) => e.kind === "score") as any;
        expect(update).toStrictEqual({
          kind: "score",
          actual: 11,
          max: 11,
          reason: expect.any(Object),
        });
      });
      test("50%の元気を消費、端数は切り捨て", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("hatonoaizu"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.vitality = 11;
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        const update = updates.find((e) => e.kind === "vitality") as any;
        expect(update).toStrictEqual({
          kind: "vitality",
          actual: -5,
          max: -5,
          reason: expect.any(Object),
        });
      });
      test("100%の元気を消費", () => {
        const lesson = createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("todoite"),
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.vitality = 10;
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        const update = updates.find((e) => e.kind === "vitality") as any;
        expect(update).toStrictEqual({
          kind: "vitality",
          actual: -10,
          max: -10,
          reason: expect.any(Object),
        });
      });
    });
  });
  // 基本的には activateEffectsEachProducerItemsAccordingToCardUsage のテストで検証する
  describe("Pアイテムに起因する、スキルカード使用時の主効果発動後の効果発動", () => {
    test("「えいえいおー」の使用により「テクノドッグ」が発動する", () => {
      let lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("eieio"),
            enhanced: false,
          },
        ],
        producerItems: [
          {
            id: "p1",
            data: getProducerItemDataById("tekunodoggu"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a"];
      const { updates } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      expect(
        updates.filter(
          (e) => e.kind === "modifier" || e.kind === "modifier.update",
        ),
      ).toStrictEqual([
        {
          kind: "modifier",
          actual: {
            kind: "motivation",
            amount: 3,
            id: expect.any(String),
          },
          max: {
            kind: "motivation",
            amount: 3,
            id: expect.any(String),
          },
          reason: expect.any(Object),
        },
        {
          kind: "modifier.update",
          propertyNameKind: "amount",
          id: expect.any(String),
          actual: 2,
          max: 2,
          reason: expect.any(Object),
        },
      ]);
    });
  });
  // 基本的には activateEffectsEachProducerItemsAccordingToCardUsage のテストで検証する
  describe("Pアイテムに起因する、スキルカードの主効果による状態修正増加後の効果発動", () => {
    test("「意識の基本」の使用により「ひみつ特訓カーデ」が発動する", () => {
      let lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("ishikinokihon"),
            enhanced: false,
          },
        ],
        producerItems: [
          {
            id: "p1",
            data: getProducerItemDataById("himitsutokkunkade"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a"];
      const { updates } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      expect(
        updates.filter(
          (e) => e.kind === "modifier" || e.kind === "modifier.update",
        ),
      ).toStrictEqual([
        {
          kind: "modifier",
          actual: {
            kind: "motivation",
            amount: 2,
            id: expect.any(String),
          },
          max: {
            kind: "motivation",
            amount: 2,
            id: expect.any(String),
          },
          reason: expect.any(Object),
        },
        {
          kind: "modifier.update",
          propertyNameKind: "amount",
          id: expect.any(String),
          actual: 3,
          max: 3,
          reason: expect.any(Object),
        },
      ]);
    });
  });
  describe("スキルカード使用数追加によるアクションポイントの回復", () => {
    test("it works", () => {
      const lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("hidamarinoseitokaishitsu"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a"];
      const { updates } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      expect(updates.filter((e) => e.kind === "actionPoints")).toStrictEqual([
        {
          kind: "actionPoints",
          amount: 1,
          reason: expect.any(Object),
        },
      ]);
      expect(
        updates.filter(
          (e) => e.kind === "modifier" || e.kind === "modifier.update",
        ),
      ).toStrictEqual([
        {
          kind: "modifier",
          actual: {
            kind: "additionalCardUsageCount",
            amount: 1,
            id: expect.any(String),
          },
          max: {
            kind: "additionalCardUsageCount",
            amount: 1,
            id: expect.any(String),
          },
          reason: expect.any(Object),
        },
        {
          kind: "modifier.update",
          propertyNameKind: "amount",
          id: expect.any(String),
          actual: -1,
          max: -1,
          reason: expect.any(Object),
        },
      ]);
    });
  });
  describe("playedCardsOnEmptyDeckへの影響", () => {
    test("山札が0枚で、捨札になるスキルカードを使う時、playedCardsOnEmptyDeckへそれを追加する", () => {
      const lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("apirunokihon"),
            enhanced: false,
          },
          {
            id: "b",
            data: getCardDataById("apirunokihon"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a", "b"];
      lesson.deck = [];
      const { updates } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      expect(
        updates.filter((e) => e.kind === "playedCardsOnEmptyDeck"),
      ).toStrictEqual([
        {
          kind: "playedCardsOnEmptyDeck",
          cardIds: ["a"],
          reason: expect.any(Object),
        },
      ]);
      // さらに追加できるか確認
      const newLesson = patchDiffs(lesson, updates);
      const { updates: updates2 } = useCard(newLesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      expect(
        updates2.filter((e) => e.kind === "playedCardsOnEmptyDeck"),
      ).toStrictEqual([
        {
          kind: "playedCardsOnEmptyDeck",
          cardIds: ["a", "b"],
          reason: expect.any(Object),
        },
      ]);
    });
    test("山札が0枚ではなく、捨札になるスキルカードを使う時、playedCardsOnEmptyDeckへそれを追加しない", () => {
      const lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("apirunokihon"),
            enhanced: false,
          },
          {
            id: "b",
            data: getCardDataById("apirunokihon"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a"];
      lesson.deck = ["b"];
      const { updates } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      expect(
        updates.filter((e) => e.kind === "playedCardsOnEmptyDeck"),
      ).toStrictEqual([]);
    });
    test("山札が0枚で、除外になるスキルカードを使う時、playedCardsOnEmptyDeckへそれを追加しない", () => {
      const lesson = createLessonForTest({
        deck: [
          {
            id: "a",
            data: getCardDataById("iji"),
            enhanced: false,
          },
        ],
      });
      lesson.hand = ["a"];
      lesson.deck = [];
      const { updates } = useCard(lesson, 1, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
        preview: false,
      });
      expect(
        updates.filter((e) => e.kind === "playedCardsOnEmptyDeck"),
      ).toStrictEqual([]);
    });
  });
});
describe("useCard preview:true", () => {
  test("コストに対してリソースが不足している時も、プレビューできる", () => {
    const lesson = createLessonForTest({
      deck: [
        {
          id: "a",
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        },
      ],
    });
    lesson.hand = ["a"];
    lesson.idol.life = 0;
    const { updates } = useCard(lesson, 1, {
      selectedCardInHandIndex: 0,
      getRandom: () => 0,
      idGenerator: createIdGenerator(),
      preview: true,
    });
    expect(updates.filter((e) => e.kind === "life")).toStrictEqual([
      {
        kind: "life",
        actual: 0,
        max: -4,
        reason: expect.any(Object),
      },
    ]);
    expect(updates.filter((e) => e.kind === "score")).toStrictEqual([
      {
        kind: "score",
        actual: 9,
        max: 9,
        reason: expect.any(Object),
      },
    ]);
  });
  test("コスト以外のスキルカード使用条件を満たさない時も、プレビューできる", () => {
    const lesson = createLessonForTest({
      deck: [
        {
          id: "a",
          data: getCardDataById("chosen"),
          enhanced: false,
        },
      ],
    });
    lesson.hand = ["a"];
    const { updates } = useCard(lesson, 1, {
      selectedCardInHandIndex: 0,
      getRandom: () => 0,
      idGenerator: createIdGenerator(),
      preview: true,
    });
    expect(updates.filter((e) => e.kind === "score")).toStrictEqual([
      {
        kind: "score",
        actual: 25,
        max: 25,
        reason: expect.any(Object),
      },
    ]);
  });
  test("doubleEffectの効果を反映する", () => {
    const lesson = createLessonForTest({
      deck: [
        {
          id: "a",
          data: getCardDataById("apirunokihon"),
          enhanced: false,
        },
      ],
    });
    lesson.hand = ["a"];
    lesson.idol.modifiers = [{ kind: "doubleEffect", id: "x" }];
    const { updates } = useCard(lesson, 1, {
      selectedCardInHandIndex: 0,
      getRandom: () => 0,
      idGenerator: createIdGenerator(),
      preview: true,
    });
    expect(updates.filter((e) => e.kind === "modifier.remove")).toStrictEqual([
      {
        kind: "modifier.remove",
        id: "x",
        reason: expect.any(Object),
      },
    ]);
    expect(updates.filter((e) => e.kind === "score")).toStrictEqual([
      {
        kind: "score",
        actual: 9,
        max: 9,
        reason: expect.any(Object),
      },
      {
        kind: "score",
        actual: 9,
        max: 9,
        reason: expect.any(Object),
      },
    ]);
  });
});
describe("activateEffectsOnTurnEnd", () => {
  describe('Pアイテムの "turnEnd" による効果発動', () => {
    test("「お気にのスニーカー」を発動する", () => {
      const lesson = createLessonForTest({
        producerItems: [
          {
            id: "a",
            data: getProducerItemDataById("okininosunika"),
          },
        ],
      });
      lesson.idol.vitality = 7;
      const { updates } = activateEffectsOnTurnEnd(lesson, 1, {
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
      });
      expect(updates.filter((e) => e.kind === "modifier")).toStrictEqual([
        {
          kind: "modifier",
          actual: {
            kind: "positiveImpression",
            amount: 4,
            id: expect.any(String),
          },
          max: {
            kind: "positiveImpression",
            amount: 4,
            id: expect.any(String),
          },
          reason: expect.any(Object),
        },
      ]);
    });
  });
  describe("状態修正による効果発動", () => {
    test("effectActivationOnTurnEnd", () => {
      const lesson = createLessonForTest();
      lesson.idol.modifiers = [
        {
          kind: "effectActivationOnTurnEnd",
          effect: {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 1 },
          },
          id: "x",
        },
      ];
      const { updates } = activateEffectsOnTurnEnd(lesson, 1, {
        getRandom: () => 0,
        idGenerator: createIdGenerator(),
      });
      expect(updates.filter((e) => e.kind === "modifier")).toStrictEqual([
        {
          kind: "modifier",
          actual: {
            kind: "motivation",
            amount: 1,
            id: expect.any(String),
          },
          max: {
            kind: "motivation",
            amount: 1,
            id: expect.any(String),
          },
          reason: expect.any(Object),
        },
      ]);
    });
  });
});
// 計算内容は calculatePerformingScoreEffect のテストで検証する
describe("obtainPositiveImpressionScoreOnTurnEnd", () => {
  const testCases: Array<{
    args: Parameters<typeof obtainPositiveImpressionScoreOnTurnEnd>;
    expected: ReturnType<typeof obtainPositiveImpressionScoreOnTurnEnd>;
    name: string;
  }> = [
    {
      name: "好印象がない時、更新を返さない",
      args: [createLessonForTest(), 1],
      expected: {
        updates: [],
        nextHistoryResultIndex: 2,
      },
    },
    {
      name: "好印象がある時、スコアを獲得する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.modifiers = [
            { kind: "positiveImpression", amount: 1, id: "x" },
          ];
          return lesson;
        })(),
        1,
      ],
      expected: {
        updates: [
          { kind: "score", actual: 1, max: 1, reason: expect.any(Object) },
        ],
        nextHistoryResultIndex: 2,
      },
    },
    {
      name: "スコアボーナスの設定を反映する",
      args: [
        (() => {
          const lesson = createLessonForTest();
          lesson.idol.modifiers = [
            { kind: "positiveImpression", amount: 1, id: "x" },
          ];
          lesson.turns = ["vocal"];
          lesson.idol.scoreBonus = { vocal: 300, visual: 200, dance: 100 };
          return lesson;
        })(),
        1,
      ],
      expected: {
        updates: [
          { kind: "score", actual: 3, max: 3, reason: expect.any(Object) },
        ],
        nextHistoryResultIndex: 2,
      },
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(obtainPositiveImpressionScoreOnTurnEnd(...args)).toStrictEqual(
      expected,
    );
  });
});
