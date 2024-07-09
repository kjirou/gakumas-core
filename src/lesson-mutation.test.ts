import {
  Card,
  CardDefinition,
  CardInProduction,
  Idol,
  IdolDefinition,
  IdolInProduction,
  Lesson,
  Modifier,
} from "./types";
import { cards, getCardDataById } from "./data/card";
import {
  activateEffectsOnTurnStart,
  addCardsToHandOrDiscardPile,
  calculateCostConsumption,
  calculatePerformingScoreEffect,
  calculatePerformingVitalityEffect,
  canApplyEffect,
  canUseCard,
  consumeRemainingCardUsageCount,
  createCardPlacementDiff,
  drawCardsFromDeck,
  drawCardsOnTurnStart,
  useCard,
  summarizeCardInHand,
  validateCostConsumution,
} from "./lesson-mutation";
import {
  createIdolInProduction,
  createLesson,
  patchUpdates,
  prepareCardsForLesson,
} from "./models";
import { createIdGenerator } from "./utils";

const createLessonForTest = (
  overwrites: Partial<Parameters<typeof createIdolInProduction>[0]> = {},
): Lesson => {
  const idolInProduction = createIdolInProduction({
    // Pアイテムが最終ターンにならないと発動しないので、テストデータとして優秀
    idolDefinitionId: "shinosawahiro-r-1",
    cards: [],
    specificCardEnhanced: false,
    specificProducerItemEnhanced: false,
    idGenerator: createIdGenerator(),
    ...overwrites,
  });
  return createLesson({
    clearScoreThresholds: undefined,
    getRandom: Math.random,
    idolInProduction,
    lastTurnNumber: 6,
  });
};

describe("drawCardsFromDeck", () => {
  test("山札がなくならない状態で1枚引いた時、1枚引けて、山札が1枚減る", () => {
    const deck = ["1", "2", "3"];
    const { drawnCards, deck: newDeck } = drawCardsFromDeck(
      deck,
      1,
      [],
      Math.random,
    );
    expect(drawnCards).toHaveLength(1);
    expect(newDeck).toHaveLength(2);
  });
  test("山札の最後の1枚を1枚だけ引いた時、1枚引けて、山札が1枚減り、捨札は変わらない", () => {
    const deck = ["1", "2", "3"];
    const discardPile = ["4"];
    const {
      drawnCards,
      deck: newDeck,
      discardPile: newDiscardPile,
    } = drawCardsFromDeck(deck, 1, discardPile, Math.random);
    expect(drawnCards).toHaveLength(1);
    expect(newDeck).toHaveLength(2);
    expect(newDiscardPile).toStrictEqual(discardPile);
  });
  test("山札が残り1枚で2枚引いた時、2枚引けて、捨札は山札に移動して空になり、山札は捨札の-1枚の数になる", () => {
    const deck = ["1"];
    const discardPile = ["2", "3", "4", "5"];
    const {
      drawnCards,
      deck: newDeck,
      discardPile: newDiscardPile,
    } = drawCardsFromDeck(deck, 2, discardPile, Math.random);
    expect(drawnCards).toHaveLength(2);
    expect(newDeck).toHaveLength(3);
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
describe("canUseCard", () => {
  const testCases: Array<{
    args: Parameters<typeof canUseCard>;
    expected: ReturnType<typeof canUseCard>;
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
    expect(canUseCard(...args)).toStrictEqual(expected);
  });
});
describe("canApplyEffect", () => {
  const testCases: Array<{
    args: Parameters<typeof canApplyEffect>;
    expected: ReturnType<typeof canApplyEffect>;
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
        { kind: "countModifier", modifierKind: "focus", min: 3 },
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
        { kind: "countModifier", modifierKind: "focus", min: 3 },
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
        { kind: "countModifier", modifierKind: "motivation", min: 3 },
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
        { kind: "countModifier", modifierKind: "motivation", min: 3 },
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
        { kind: "countModifier", modifierKind: "positiveImpression", min: 3 },
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
        { kind: "countModifier", modifierKind: "positiveImpression", min: 3 },
      ],
      expected: false,
    },
    {
      name: "countReminingTurnsを満たす時、trueを返す",
      args: [
        {
          turnNumber: 4,
          lastTurnNumber: 6,
          remainingTurns: 0,
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
          lastTurnNumber: 6,
          remainingTurns: 0,
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
    expect(canApplyEffect(...args)).toBe(expected);
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
        createIdGenerator(),
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
        createIdGenerator(),
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
        createIdGenerator(),
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
        createIdGenerator(),
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
        createIdGenerator(),
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
        createIdGenerator(),
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
        createIdGenerator(),
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
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "modifier",
          actual: {
            kind: "focus",
            amount: -3,
            id: expect.any(String),
            updateTargetId: "a",
          },
          max: {
            kind: "focus",
            amount: -3,
            id: expect.any(String),
            updateTargetId: "a",
          },
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
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "modifier",
          actual: {
            kind: "focus",
            amount: -3,
            id: expect.any(String),
            updateTargetId: "a",
          },
          max: {
            kind: "focus",
            amount: -4,
            id: expect.any(String),
            updateTargetId: "a",
          },
        },
      ],
    },
    {
      name: "amountプロパティのmodifierコストで、アイドルが相当するmodifierを持たない時、結果を返さない",
      args: [
        { modifiers: [] as Modifier[] } as Idol,
        { kind: "focus", value: 3 },
        createIdGenerator(),
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
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "modifier",
          actual: {
            kind: "goodCondition",
            duration: -3,
            id: expect.any(String),
            updateTargetId: "a",
          },
          max: {
            kind: "goodCondition",
            duration: -3,
            id: expect.any(String),
            updateTargetId: "a",
          },
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
        createIdGenerator(),
      ],
      expected: [
        {
          kind: "modifier",
          actual: {
            kind: "goodCondition",
            duration: -3,
            id: expect.any(String),
            updateTargetId: "a",
          },
          max: {
            kind: "goodCondition",
            duration: -4,
            id: expect.any(String),
            updateTargetId: "a",
          },
        },
      ],
    },
    {
      name: "amountプロパティのmodifierコストで、アイドルが相当するmodifierを持たない時、結果を返さない",
      args: [
        { modifiers: [] as Modifier[] } as Idol,
        { kind: "goodCondition", value: 3 },
        createIdGenerator(),
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
        { value: 1, focusMultiplier: 2.0, times: 2 },
      ],
      expected: [
        { kind: "score", actual: 3, max: 3 },
        { kind: "score", actual: 3, max: 3 },
      ],
    },
    {
      name: "スコア増加値の上限が設定されている時、actualはその値を超えない",
      args: [
        {
          modifiers: [] as Idol["modifiers"],
        } as Idol,
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
        { value: 17, focusMultiplier: 1.5 },
      ],
      expected: [{ kind: "score", actual: 49, max: 49 }],
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
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(calculatePerformingVitalityEffect(...args)).toStrictEqual(expected);
  });
});
describe("summarizeCardInHand", () => {
  const testCases: Array<{
    args: Parameters<typeof summarizeCardInHand>;
    expected: ReturnType<typeof summarizeCardInHand>;
    name: string;
  }> = [
    {
      name: "基本的なスキルカードを要約できる",
      args: [
        createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("apirunokihon"),
              enabled: true,
              enhanced: false,
            },
          ],
        }),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        cost: { kind: "normal", value: 4 },
        effects: [],
        enhancements: [],
        name: "アピールの基本",
        playable: true,
        scores: [{ value: 9, times: 1 }],
        vitality: undefined,
      },
    },
    {
      name: "状態修正によるコストの変化を反映する",
      args: [
        (() => {
          const lesson = createLessonForTest({
            cards: [
              {
                id: "a",
                definition: getCardDataById("apirunokihon"),
                enabled: true,
                enhanced: false,
              },
            ],
          });
          lesson.idol.modifiers = [
            { kind: "halfLifeConsumption", duration: 1, id: "x" },
          ];
          return lesson;
        })(),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        cost: { kind: "normal", value: 2 },
        effects: expect.any(Array),
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        scores: expect.any(Array),
        vitality: undefined,
      },
    },
    {
      name: "コストにリソースが足りない時も、消費する分のコストの値を返す",
      args: [
        (() => {
          const lesson = createLessonForTest({
            cards: [
              {
                id: "a",
                definition: getCardDataById("apirunokihon"),
                enabled: true,
                enhanced: false,
              },
            ],
          });
          lesson.idol.life = 0;
          return lesson;
        })(),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        cost: { kind: "normal", value: 4 },
        effects: expect.any(Array),
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        scores: expect.any(Array),
        vitality: undefined,
      },
    },
    {
      name: "無条件の状態修正と条件付きの状態修正を持つスキルカードで、後者の条件を満たさない時、effectsには条件を満たした旨と満たさない旨の2レコードが入る",
      args: [
        createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("rakkanteki"),
              enabled: true,
              enhanced: false,
            },
          ],
        }),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        cost: expect.any(Object),
        effects: [
          { kind: "modifier-goodCondition", applyable: true },
          { kind: "modifier-focus", applyable: false },
        ],
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        scores: expect.any(Array),
        vitality: undefined,
      },
    },
    {
      name: "無条件のスコアと条件付きのスコアを持つスキルカードで、後者の条件を満たさない時、effectsには条件を満たさない旨の内容が入り、scoresには無条件のスコアのみ入る",
      args: [
        createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("hiyaku"),
              enabled: true,
              enhanced: false,
            },
          ],
        }),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        cost: expect.any(Object),
        effects: [{ kind: "perform-score", applyable: false }],
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        scores: [{ value: 13, times: 1 }],
        vitality: undefined,
      },
    },
    {
      name: "無条件のスコアと条件付きのスコアを持つスキルカードで、後者の条件を満たす時、effectsには条件を満たす旨の内容が入り、scoresには両方のスコアが入る",
      args: [
        (() => {
          const lesson = createLessonForTest({
            cards: [
              {
                id: "a",
                definition: getCardDataById("hiyaku"),
                enabled: false,
                enhanced: true,
              },
            ],
          });
          lesson.idol.modifiers = [{ kind: "focus", amount: 6, id: "x" }];
          return lesson;
        })(),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        cost: expect.any(Object),
        effects: [{ kind: "perform-score", applyable: true }],
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        scores: [
          { value: 19, times: 1 },
          { value: 21, times: 1 },
        ],
        vitality: undefined,
      },
    },
    {
      name: "無条件の元気と条件付きの元気を持つスキルカードで、後者の条件を満たさない時、effectsには条件を満たさない旨の内容が入り、vitalityには無条件の値のみ入る",
      args: [
        createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("honkinoshumi"),
              enabled: true,
              enhanced: false,
            },
          ],
        }),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        cost: expect.any(Object),
        effects: [{ kind: "perform-vitality", applyable: false }],
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        scores: expect.any(Array),
        vitality: 5,
      },
    },
    {
      name: "無条件の元気と条件付きの元気を持つスキルカードで、後者の条件を満たす時、effectsには条件を満たす旨の内容が入り、vitalityには無条件の値のみ入る",
      args: [
        (() => {
          const lesson = createLessonForTest({
            cards: [
              {
                id: "a",
                definition: getCardDataById("honkinoshumi"),
                enabled: false,
                enhanced: true,
              },
            ],
          });
          lesson.idol.modifiers = [{ kind: "motivation", amount: 3, id: "x" }];
          return lesson;
        })(),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        cost: expect.any(Object),
        effects: [{ kind: "perform-vitality", applyable: true }],
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        scores: expect.any(Array),
        vitality: 10,
      },
    },
    {
      name: '強化の数と等しい"+"を名称の末尾へ付与する',
      args: [
        (() => {
          const lesson = createLessonForTest({
            cards: [
              {
                id: "a",
                definition: getCardDataById("apirunokihon"),
                enabled: true,
                enhanced: true,
              },
            ],
          });
          const aCard = lesson.cards.find((e) => e.id === "a");
          if (aCard) {
            aCard.enhancements = [
              ...aCard.enhancements,
              { kind: "supportCard", supportCardId: "x" },
            ];
          }
          return lesson;
        })(),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        cost: expect.any(Object),
        effects: expect.any(Array),
        enhancements: [
          { kind: "original" },
          { kind: "supportCard", supportCardId: "x" },
        ],
        name: "アピールの基本++",
        playable: expect.any(Boolean),
        scores: expect.any(Array),
        vitality: undefined,
      },
    },
    {
      name: "スキルカード使用条件を満たさない時も、スコアの算出を行う",
      args: [
        createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("chosen"),
              enabled: true,
              enhanced: false,
            },
          ],
        }),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        cost: expect.any(Object),
        effects: expect.any(Array),
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: false,
        scores: [{ value: 25, times: 1 }],
        vitality: undefined,
      },
    },
    {
      name: "無条件の2回のスコアと条件付きのスコアがあり、後者の条件を満たす時、scoresには2回スコアのレコードと1回のレコードの2レコードが入る",
      args: [
        (() => {
          const lesson = createLessonForTest({
            cards: [
              {
                id: "a",
                definition: getCardDataById("wammoasuteppu"),
                enabled: true,
                enhanced: false,
              },
            ],
          });
          lesson.idol.modifiers = [{ kind: "focus", amount: 6, id: "x" }];
          return lesson;
        })(),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        cost: expect.any(Object),
        effects: expect.any(Array),
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        scores: [
          { value: 13, times: 2 },
          { value: 13, times: 1 },
        ],
        vitality: undefined,
      },
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(summarizeCardInHand(...args)).toStrictEqual(expected);
  });
});
describe("drawCardsOnLessonStart", () => {
  test("山札に引く数が残っている時、山札はその分減り、捨札に変化はない / 1ターン目でレッスン開始時手札がない時、その更新は発行されない", () => {
    const lesson = createLessonForTest({
      cards: [
        ...["a", "b", "c", "d"].map((id) => ({
          id,
          definition: getCardDataById("apirunokihon"),
          enabled: true,
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
      cards: [
        ...["a", "b", "c", "d"].map((id) => ({
          id,
          definition: getCardDataById("apirunokihon"),
          enabled: true,
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
  test("1ターン目でレッスン開始時手札が1枚ある時、更新は2回発行され、手札は最終的にその札を含む3枚になる", () => {
    const lesson = createLessonForTest({
      cards: [
        ...["a"].map((id) => ({
          id,
          definition: getCardDataById("shizukanaishi"),
          enabled: true,
          enhanced: false,
        })),
        ...["b", "c", "d"].map((id) => ({
          id,
          definition: getCardDataById("apirunokihon"),
          enabled: true,
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
        hand: ["a"],
        deck: ["b", "c", "d"],
        reason: expect.any(Object),
      },
      {
        kind: "cardPlacement",
        hand: ["a", "b", "c"],
        deck: ["d"],
        reason: expect.any(Object),
      },
    ]);
  });
  test("1ターン目でレッスン開始時手札が3枚ある時、更新は1回のみ発行され、手札は最終的に開始時手札のみの3枚になる", () => {
    const lesson = createLessonForTest({
      cards: [
        ...["a", "b", "c"].map((id) => ({
          id,
          definition: getCardDataById("shizukanaishi"),
          enabled: true,
          enhanced: false,
        })),
        ...["d"].map((id) => ({
          id,
          definition: getCardDataById("apirunokihon"),
          enabled: true,
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
        hand: ["a", "b", "c"],
        deck: ["d"],
        reason: expect.any(Object),
      },
    ]);
  });
  test("1ターン目でレッスン開始時手札が5枚ある時、更新は1回のみ発行され、手札は最終的に開始時手札のみの5枚になる", () => {
    const lesson = createLessonForTest({
      cards: [
        ...["a", "b", "c", "d", "e"].map((id) => ({
          id,
          definition: getCardDataById("shizukanaishi"),
          enabled: true,
          enhanced: false,
        })),
        ...["f"].map((id) => ({
          id,
          definition: getCardDataById("apirunokihon"),
          enabled: true,
          enhanced: false,
        })),
      ],
    });
    lesson.deck = ["a", "b", "c", "d", "e", "f"];
    lesson.turnNumber = 1;
    const { updates } = drawCardsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
    });
    expect(updates.filter((e) => e.kind === "cardPlacement")).toStrictEqual([
      {
        kind: "cardPlacement",
        hand: ["a", "b", "c", "d", "e"],
        deck: ["f"],
        reason: expect.any(Object),
      },
    ]);
  });
  test("1ターン目でレッスン開始時手札が6枚ある時、更新は1回のみ発行され、手札は最終的に開始時手札のみの5枚になり、6枚目の開始時手札は捨札になる", () => {
    const lesson = createLessonForTest({
      cards: [
        ...["a", "b", "c", "d", "e", "f"].map((id) => ({
          id,
          definition: getCardDataById("shizukanaishi"),
          enabled: true,
          enhanced: false,
        })),
        ...["g"].map((id) => ({
          id,
          definition: getCardDataById("apirunokihon"),
          enabled: true,
          enhanced: false,
        })),
      ],
    });
    lesson.deck = ["a", "b", "c", "d", "e", "f", "g"];
    lesson.turnNumber = 1;
    const { updates } = drawCardsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
    });
    expect(updates.filter((e) => e.kind === "cardPlacement")).toStrictEqual([
      {
        kind: "cardPlacement",
        hand: ["a", "b", "c", "d", "e"],
        deck: ["g"],
        discardPile: ["f"],
        reason: expect.any(Object),
      },
    ]);
  });
});
describe("activateEffectsOnTurnStart", () => {
  test("次ターンと2ターン後にパラメータ追加する状態修正がある時、1回パラメータを追加し、それらの状態修正の残りターン数を減少する", () => {
    const lesson = createLessonForTest({
      cards: [
        {
          id: "a",
          definition: getCardDataById("apirunokihon"),
          enabled: true,
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
    const { updates } = activateEffectsOnTurnStart(lesson, 1, {
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
    expect(updates.filter((e) => e.kind === "modifier")).toStrictEqual([
      {
        kind: "modifier",
        actual: {
          kind: "delayedEffect",
          delay: -1,
          effect: expect.any(Object),
          id: expect.any(String),
          updateTargetId: "x",
        },
        max: {
          kind: "delayedEffect",
          delay: -1,
          effect: expect.any(Object),
          id: expect.any(String),
          updateTargetId: "x",
        },
        reason: expect.any(Object),
      },
      {
        kind: "modifier",
        actual: {
          kind: "delayedEffect",
          delay: -1,
          effect: expect.any(Object),
          id: expect.any(String),
          updateTargetId: "y",
        },
        max: {
          kind: "delayedEffect",
          delay: -1,
          effect: expect.any(Object),
          id: expect.any(String),
          updateTargetId: "y",
        },
        reason: expect.any(Object),
      },
    ]);
  });
  test("次ターンにスキルカードを1枚引く状態修正がある時、手札が1枚増え、その状態修正を減少する", () => {
    const lesson = createLessonForTest({
      cards: [
        {
          id: "a",
          definition: getCardDataById("apirunokihon"),
          enabled: true,
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
    const { updates } = activateEffectsOnTurnStart(lesson, 1, {
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
    expect(updates.filter((e) => e.kind === "modifier")).toStrictEqual([
      {
        kind: "modifier",
        actual: {
          kind: "delayedEffect",
          delay: -1,
          id: expect.any(String),
          effect: expect.any(Object),
          updateTargetId: "x",
        },
        max: {
          kind: "delayedEffect",
          delay: -1,
          id: expect.any(String),
          effect: expect.any(Object),
          updateTargetId: "x",
        },
        reason: expect.any(Object),
      },
    ]);
  });
  test("次ターン・2ターン後・次ターンにスキルカードを1枚引く状態修正がある時、手札1枚増加を2回行い、全ての状態修正を減少する", () => {
    const lesson = createLessonForTest({
      cards: [
        ...["a", "b"].map((id) => ({
          id,
          definition: getCardDataById("apirunokihon"),
          enabled: true,
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
    const { updates } = activateEffectsOnTurnStart(lesson, 1, {
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
    expect(updates.filter((e) => e.kind === "modifier")).toStrictEqual([
      {
        kind: "modifier",
        actual: {
          kind: "delayedEffect",
          delay: -1,
          effect: expect.any(Object),
          id: expect.any(String),
          updateTargetId: "x",
        },
        max: {
          kind: "delayedEffect",
          delay: -1,
          effect: expect.any(Object),
          id: expect.any(String),
          updateTargetId: "x",
        },
        reason: expect.any(Object),
      },
      {
        kind: "modifier",
        actual: {
          kind: "delayedEffect",
          delay: -1,
          effect: expect.any(Object),
          id: expect.any(String),
          updateTargetId: "y",
        },
        max: {
          kind: "delayedEffect",
          delay: -1,
          effect: expect.any(Object),
          id: expect.any(String),
          updateTargetId: "y",
        },
        reason: expect.any(Object),
      },
      {
        kind: "modifier",
        actual: {
          kind: "delayedEffect",
          delay: -1,
          effect: expect.any(Object),
          id: expect.any(String),
          updateTargetId: "z",
        },
        max: {
          kind: "delayedEffect",
          delay: -1,
          effect: expect.any(Object),
          id: expect.any(String),
          updateTargetId: "z",
        },
        reason: expect.any(Object),
      },
    ]);
  });
  test("次ターンに手札を強化するを状態修正がある時、手札が全て強化され、その状態修正を減少する", () => {
    const lesson = createLessonForTest({
      cards: [
        ...["a", "b"].map((id) => ({
          id,
          definition: getCardDataById("apirunokihon"),
          enabled: true,
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
    const { updates } = activateEffectsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
      idGenerator: createIdGenerator(),
    });
    expect(updates.filter((e) => e.kind === "cardEnhancement")).toStrictEqual([
      {
        kind: "cardEnhancement",
        cardIds: ["a", "b"],
        reason: expect.any(Object),
      },
    ]);
    expect(updates.filter((e) => e.kind === "modifier")).toStrictEqual([
      {
        kind: "modifier",
        actual: {
          kind: "delayedEffect",
          delay: -1,
          effect: expect.any(Object),
          id: expect.any(String),
          updateTargetId: "x",
        },
        max: {
          kind: "delayedEffect",
          delay: -1,
          effect: expect.any(Object),
          id: expect.any(String),
          updateTargetId: "x",
        },
        reason: expect.any(Object),
      },
    ]);
  });
  test("次ターンにスキルカードを引く状態修正と手札を強化する状態修正がある時、手札が引かれた状態で、手札が全て強化される", () => {
    const lesson = createLessonForTest({
      cards: [
        ...["a", "b"].map((id) => ({
          id,
          definition: getCardDataById("apirunokihon"),
          enabled: true,
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
    const { updates } = activateEffectsOnTurnStart(lesson, 1, {
      getRandom: Math.random,
      idGenerator: createIdGenerator(),
    });
    expect(updates.filter((e) => e.kind === "cardEnhancement")).toStrictEqual([
      {
        kind: "cardEnhancement",
        cardIds: ["a", "b"],
        reason: expect.any(Object),
      },
    ]);
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
        { idGenerator: createIdGenerator() },
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
        { idGenerator: createIdGenerator() },
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
              duration: 1,
              id: "x",
            },
          ];
          return lesson;
        })(),
        1,
        { idGenerator: createIdGenerator() },
      ],
      expected: {
        updates: [
          {
            kind: "modifier",
            actual: {
              kind: "additionalCardUsageCount",
              amount: -1,
              duration: 0,
              id: expect.any(String),
              updateTargetId: "x",
            },
            max: {
              kind: "additionalCardUsageCount",
              amount: -1,
              duration: 0,
              id: expect.any(String),
              updateTargetId: "x",
            },
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
  describe("使用した手札を捨札か除外へ移動", () => {
    test("「レッスン中1回」ではない手札を使った時は、捨札へ移動", () => {
      const lesson = createLessonForTest({
        cards: [
          {
            id: "a",
            definition: getCardDataById("apirunokihon"),
            enabled: true,
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
        cards: [
          {
            id: "a",
            definition: getCardDataById("hyogennokihon"),
            enabled: true,
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
  describe("コスト消費", () => {
    test("it works", () => {
      const lesson = createLessonForTest({
        cards: [
          {
            id: "a",
            definition: getCardDataById("apirunokihon"),
            enabled: true,
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
        cards: [
          {
            id: "a",
            definition: getCardDataById("genkinaaisatsu"),
            enabled: true,
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
  describe("効果発動", () => {
    describe("効果適用条件を満たさない効果は適用されない", () => {
      test("「飛躍」は、集中が足りない時、パラメータ上昇は1回のみ適用する", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("hiyaku"),
              enabled: true,
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
          cards: [
            {
              id: "a",
              definition: getCardDataById("jumbiundo"),
              enabled: true,
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.modifiers = [{ kind: "doubleEffect", times: 1, id: "x" }];
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
        ).toHaveLength(2);
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
          updates.filter(
            (e) => e.kind === "modifier" && e.actual.kind === "doubleEffect",
          ),
        ).toStrictEqual([
          {
            kind: "modifier",
            actual: {
              kind: "doubleEffect",
              times: -1,
              id: expect.any(String),
              updateTargetId: "x",
            },
            max: {
              kind: "doubleEffect",
              times: -1,
              id: expect.any(String),
              updateTargetId: "x",
            },
            reason: expect.any(Object),
          },
        ]);
      });
    });
    describe("drawCards", () => {
      test("「アイドル宣言」を、山札が足りる・手札最大枚数を超えない状況で使った時、手札が2枚増え、捨札は不変で、除外が1枚増える", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("aidorusengen"),
              enabled: true,
              enhanced: false,
            },
            ...["b", "c"].map((id) => ({
              id,
              definition: getCardDataById("apirunokihon"),
              enabled: true,
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
      });
      test("「アイドル宣言」を、山札が足りない状況で使った時、山札と捨札は再構築される", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("aidorusengen"),
              enabled: true,
              enhanced: false,
            },
            ...["b", "c", "d"].map((id) => ({
              id,
              definition: getCardDataById("apirunokihon"),
              enabled: true,
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
      });
      test("「アイドル宣言」を、手札最大枚数が超える状況で使った時、手札は最大枚数で、捨札が増える", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("aidorusengen"),
              enabled: true,
              enhanced: false,
            },
            ...["b", "c", "d", "e", "f", "g"].map((id) => ({
              id,
              definition: getCardDataById("apirunokihon"),
              enabled: true,
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
          cards: [
            {
              id: "a",
              definition: getCardDataById("teipatei"),
              enabled: true,
              enhanced: false,
            },
            ...["b", "c", "d"].map((id) => ({
              id,
              definition: getCardDataById("apirunokihon"),
              enabled: true,
              enhanced: false,
            })),
            ...["e"].map((id) => ({
              id,
              definition: getCardDataById("apirunokihon"),
              enabled: true,
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
          updates.find((e) => e.kind === "cardEnhancement") as any
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
          cards: [
            {
              id: "a",
              definition: getCardDataById("shikirinaoshi"),
              enabled: true,
              enhanced: false,
            },
            ...["b", "c", "d", "e", "f"].map((id) => ({
              id,
              definition: getCardDataById("apirunokihon"),
              enabled: true,
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
    });
    describe("generateCard", () => {
      test("強化済みのSSRカードを生成して手札に入る", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("hanamoyukisetsu"),
              enabled: true,
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
        const cardsUpdate = updates.find((e) => e.kind === "cards") as any;
        // アイドル固有 + 上記で足している hanamoyukisetsu + 生成したカード
        expect(cardsUpdate.cards).toHaveLength(3);
        expect(cardsUpdate.cards[2].enhancements).toStrictEqual([
          {
            kind: "original",
          },
        ]);
        expect(cardsUpdate.cards[2].original.definition.rarity).toBe("ssr");
        const cardPlacementUpdate = updates
          .slice()
          .reverse()
          .find((e) => e.kind === "cardPlacement") as any;
        expect(cardPlacementUpdate).toStrictEqual({
          kind: "cardPlacement",
          hand: expect.any(Array),
          reason: expect.any(Object),
        });
      });
    });
    describe("getModifier", () => {
      test("新規追加の時", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("furumainokihon"),
              enabled: true,
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
          cards: [
            {
              id: "a",
              definition: getCardDataById("furumainokihon"),
              enabled: true,
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
        expect(updates.filter((e) => e.kind === "modifier")).toStrictEqual([
          {
            kind: "modifier",
            actual: {
              kind: "goodCondition",
              duration: 2,
              id: expect.any(String),
              updateTargetId: "x",
            },
            max: {
              kind: "goodCondition",
              duration: 2,
              id: expect.any(String),
              updateTargetId: "x",
            },
            reason: expect.any(Object),
          },
        ]);
      });
      test("既存の状態修正が存在しても新規追加になる状態修正の時", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("enshutsukeikaku"),
              enabled: true,
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.modifiers = [
          {
            kind: "effectActivationUponCardUsage",
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
              e.actual.kind === "effectActivationUponCardUsage",
          ),
        ).toStrictEqual([
          {
            kind: "modifier",
            actual: {
              kind: "effectActivationUponCardUsage",
              cardKind: "active",
              effect: expect.any(Object),
              id: expect.any(String),
            },
            max: {
              kind: "effectActivationUponCardUsage",
              cardKind: "active",
              effect: expect.any(Object),
              id: expect.any(String),
            },
            reason: expect.any(Object),
          },
        ]);
      });
    });
    describe("increaseRemainingTurns", () => {
      test("it works", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("watashigasta"),
              enabled: true,
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.modifiers = [
          { kind: "positiveImpression", amount: 2, id: "x" },
        ];
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        const update = updates.find((e) => e.kind === "remainingTurns") as any;
        expect(update).toStrictEqual({
          kind: "remainingTurns",
          amount: 1,
          reason: expect.any(Object),
        });
      });
    });
    describe("multiplyModifier", () => {
      test("it works", () => {
        // この効果を持つスキルカードがないので、モックを作る
        const cardDefinitionMock = {
          base: {
            cost: { kind: "normal", value: 0 },
            effects: [
              {
                kind: "multiplyModifier",
                modifierKind: "positiveImpression",
                multiplier: 1.5,
              },
            ],
          },
        } as CardDefinition;
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: cardDefinitionMock,
              enabled: true,
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.modifiers = [
          { kind: "focus", amount: 20, id: "x" },
          { kind: "positiveImpression", amount: 10, id: "y" },
        ];
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
              kind: "positiveImpression",
              amount: 5,
              id: expect.any(String),
              updateTargetId: "y",
            },
            max: {
              kind: "positiveImpression",
              amount: 5,
              id: expect.any(String),
              updateTargetId: "y",
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
          cards: [
            {
              id: "a",
              definition: getCardDataById("apirunokihon"),
              enabled: true,
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
          cards: [
            {
              id: "a",
              definition: getCardDataById("apirunokihon"),
              enabled: true,
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
      test("複数の更新を生成するスコア増加を返す", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("shikosakugo"),
              enabled: true,
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
          cards: [
            {
              id: "a",
              definition: getCardDataById("pozunokihon"),
              enabled: true,
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
          cards: [
            {
              id: "a",
              definition: getCardDataById("kaika"),
              enabled: true,
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
        const update = updates.find((e) => e.kind === "score") as any;
        expect(update).toStrictEqual({
          kind: "score",
          actual: 20,
          max: 20,
          reason: expect.any(Object),
        });
      });
      test("positiveImpression", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("200sumairu"),
              enabled: true,
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
        const update = updates.find((e) => e.kind === "score") as any;
        expect(update).toStrictEqual({
          kind: "score",
          actual: 10,
          max: 10,
          reason: expect.any(Object),
        });
      });
      test("スコア上限の設定がある時は、actualはその値を超えない", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("kaika"),
              enabled: true,
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
        const update = updates.find((e) => e.kind === "score") as any;
        expect(update).toStrictEqual({
          kind: "score",
          actual: 6,
          max: 10,
          reason: expect.any(Object),
        });
      });
    });
    describe("performLeveragingVitality", () => {
      test("通常", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("genkinaaisatsu"),
              enabled: true,
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
          cards: [
            {
              id: "a",
              definition: getCardDataById("hatonoaizu"),
              enabled: true,
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
          cards: [
            {
              id: "a",
              definition: getCardDataById("todoite"),
              enabled: true,
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
    describe("recoverLife", () => {
      test("通常", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("hoyoryoku"),
              enabled: true,
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.life = 10;
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        const update = updates.find((e) => e.kind === "life") as any;
        expect(update).toStrictEqual({
          kind: "life",
          actual: 2,
          max: 2,
          reason: expect.any(Object),
        });
      });
      test("体力上限を超えて回復しない", () => {
        const lesson = createLessonForTest({
          cards: [
            {
              id: "a",
              definition: getCardDataById("hoyoryoku"),
              enabled: true,
              enhanced: false,
            },
          ],
        });
        lesson.hand = ["a"];
        lesson.idol.life = lesson.idol.original.maxLife;
        const { updates } = useCard(lesson, 1, {
          selectedCardInHandIndex: 0,
          getRandom: () => 0,
          idGenerator: createIdGenerator(),
          preview: false,
        });
        const update = updates.find((e) => e.kind === "life") as any;
        expect(update).toStrictEqual({
          kind: "life",
          actual: 0,
          max: 2,
          reason: expect.any(Object),
        });
      });
    });
  });
  describe("状態修正によるスキルカード使用毎効果発動", () => {
    test("「ファンシーチャーム」は、メンタルスキルカード使用時、好印象を付与する。アクティブスキルカード使用時は付与しない", () => {
      let lesson = createLessonForTest({
        cards: [
          {
            id: "a",
            definition: getCardDataById("fanshichamu"),
            enabled: true,
            enhanced: false,
          },
          {
            id: "b",
            definition: getCardDataById("hyogennokihon"),
            enabled: true,
            enhanced: false,
          },
          {
            id: "c",
            definition: getCardDataById("apirunokihon"),
            enabled: true,
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
            e.actual.kind === "effectActivationUponCardUsage",
        ),
      ).toStrictEqual([
        {
          kind: "modifier",
          actual: {
            kind: "effectActivationUponCardUsage",
            cardKind: "mental",
            effect: expect.any(Object),
            id: expect.any(String),
          },
          max: {
            kind: "effectActivationUponCardUsage",
            cardKind: "mental",
            effect: expect.any(Object),
            id: expect.any(String),
          },
          reason: expect.any(Object),
        },
      ]);

      lesson = patchUpdates(lesson, updates1);

      const { updates: updates2a } = useCard(lesson, 2, {
        selectedCardInHandIndex: 0,
        getRandom: () => 0,
        idGenerator,
        preview: false,
      });
      expect(updates2a.filter((e) => e.kind === "modifier")).toStrictEqual([
        {
          kind: "modifier",
          actual: {
            kind: "positiveImpression",
            amount: 1,
            id: expect.any(String),
            updateTargetId: expect.any(String),
          },
          max: {
            kind: "positiveImpression",
            amount: 1,
            id: expect.any(String),
            updateTargetId: expect.any(String),
          },
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
        cards: [
          {
            id: "a",
            definition: getCardDataById("enshutsukeikaku"),
            enabled: true,
            enhanced: false,
          },
          {
            id: "b",
            definition: getCardDataById("apirunokihon"),
            enabled: true,
            enhanced: false,
          },
          {
            id: "c",
            definition: getCardDataById("shinkokyu"),
            enabled: true,
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
            e.actual.kind === "effectActivationUponCardUsage",
        ),
      ).toStrictEqual([
        {
          kind: "modifier",
          actual: {
            kind: "effectActivationUponCardUsage",
            cardKind: "active",
            effect: expect.any(Object),
            id: expect.any(String),
          },
          max: {
            kind: "effectActivationUponCardUsage",
            cardKind: "active",
            effect: expect.any(Object),
            id: expect.any(String),
          },
          reason: expect.any(Object),
        },
      ]);

      lesson = patchUpdates(lesson, updates1);

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
  });
});
describe("useCard preview:true", () => {
  test("コストに対してリソースが不足している時も、プレビューできる", () => {
    const lesson = createLessonForTest({
      cards: [
        {
          id: "a",
          definition: getCardDataById("apirunokihon"),
          enabled: true,
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
      cards: [
        {
          id: "a",
          definition: getCardDataById("chosen"),
          enabled: true,
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
      cards: [
        {
          id: "a",
          definition: getCardDataById("apirunokihon"),
          enabled: true,
          enhanced: false,
        },
      ],
    });
    lesson.hand = ["a"];
    lesson.idol.modifiers = [{ kind: "doubleEffect", times: 1, id: "x" }];
    const { updates } = useCard(lesson, 1, {
      selectedCardInHandIndex: 0,
      getRandom: () => 0,
      idGenerator: createIdGenerator(),
      preview: true,
    });
    expect(updates.filter((e) => e.kind === "modifier")).toStrictEqual([
      {
        kind: "modifier",
        actual: {
          kind: "doubleEffect",
          times: -1,
          id: expect.any(String),
          updateTargetId: "x",
        },
        max: {
          kind: "doubleEffect",
          times: -1,
          id: expect.any(String),
          updateTargetId: "x",
        },
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