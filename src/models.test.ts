import {
  Card,
  CurrentTurnDetails,
  Lesson,
  LessonUpdateQuery,
  Modifier,
} from "./types";
import { getCardDataByConstId } from "./data/cards";
import { getIdolDataByConstId } from "./data/idols";
import { getProducerItemDataByConstId } from "./data/producer-items";
import {
  calculateClearScoreProgress,
  createCurrentTurnDetails,
  calculateModifierEffectedActionCost,
  createActualTurns,
  createLesson,
  diffUpdates,
  findPrioritizedDoubleEffectModifier,
  getDisplayedRepresentativeModifierValue,
  getIdolParameterKindOnTurn,
  patchDiffs,
  scanIncreasedModifierKinds,
  getIdolParameterKindOnTurnConsideringIgnoring,
} from "./models";
import { createIdGenerator } from "./utils";

describe("calculateClearScoreProgress", () => {
  const testCases: Array<{
    args: Parameters<typeof calculateClearScoreProgress>;
    expected: ReturnType<typeof calculateClearScoreProgress>;
  }> = [
    {
      args: [0, { clear: 100 }],
      expected: {
        necessaryClearScore: 100,
        necessaryPerfectScore: undefined,
        remainingClearScore: 100,
        remainingPerfectScore: undefined,
        clearScoreProgressPercentage: 0,
      },
    },
    {
      args: [10, { clear: 1000 }],
      expected: {
        necessaryClearScore: 1000,
        necessaryPerfectScore: undefined,
        remainingClearScore: 990,
        remainingPerfectScore: undefined,
        clearScoreProgressPercentage: 1,
      },
    },
    {
      args: [9, { clear: 1000 }],
      expected: {
        necessaryClearScore: 1000,
        necessaryPerfectScore: undefined,
        remainingClearScore: 991,
        remainingPerfectScore: undefined,
        clearScoreProgressPercentage: 0,
      },
    },
    {
      args: [50, { clear: 100, perfect: 300 }],
      expected: {
        necessaryClearScore: 100,
        necessaryPerfectScore: 300,
        remainingClearScore: 50,
        remainingPerfectScore: 250,
        clearScoreProgressPercentage: 50,
      },
    },
  ];
  test.each(testCases)(
    "$args.0, $args.1 => $expected",
    ({ args, expected }) => {
      expect(calculateClearScoreProgress(...args)).toStrictEqual(expected);
    },
  );
});
describe("createCurrentTurnDetails", () => {
  const testCases: Array<{
    args: Parameters<typeof createCurrentTurnDetails>;
    expected: ReturnType<typeof createCurrentTurnDetails>;
    name: string;
  }> = [
    {
      name: "1ターン目の時、概ね正しく動く",
      args: [
        {
          turns: ["vocal", "dance", "visual"],
          turnNumber: 1,
          remainingTurnsChange: 0,
        } as Lesson,
      ],
      expected: {
        turnNumber: 1,
        originalTurns: 3,
        additionalTurns: 0,
        remainingOriginalTurns: 3,
        remainingAdditionalTurns: 0,
        remainingTurns: 3,
        idolParameterKind: "vocal",
      },
    },
    {
      name: "最終ターンの時、概ね正しく動く",
      args: [
        {
          turns: ["vocal", "dance", "visual"],
          turnNumber: 3,
          remainingTurnsChange: 0,
        } as Lesson,
      ],
      expected: {
        turnNumber: 3,
        originalTurns: 3,
        additionalTurns: 0,
        remainingOriginalTurns: 1,
        remainingAdditionalTurns: 0,
        remainingTurns: 1,
        idolParameterKind: "visual",
      },
    },
    {
      name: "ターン追加がある1ターン目の時、概ね正しく動く",
      args: [
        {
          turns: ["vocal", "dance", "visual"],
          turnNumber: 1,
          remainingTurnsChange: 4,
        } as Lesson,
      ],
      expected: {
        turnNumber: 1,
        originalTurns: 3,
        additionalTurns: 4,
        remainingOriginalTurns: 3,
        remainingAdditionalTurns: 4,
        remainingTurns: 7,
        idolParameterKind: "vocal",
      },
    },
    {
      name: "ターン追加がある最終ターンの時、概ね正しく動く",
      args: [
        {
          turns: ["vocal", "dance", "visual"],
          turnNumber: 7,
          remainingTurnsChange: 4,
        } as Lesson,
      ],
      expected: {
        turnNumber: 7,
        originalTurns: 3,
        additionalTurns: 4,
        remainingOriginalTurns: 0,
        remainingAdditionalTurns: 1,
        remainingTurns: 1,
        idolParameterKind: "visual",
      },
    },
    {
      name: "ターン追加分への切り替え直後の時、概ね正しく動く",
      args: [
        {
          turns: ["vocal", "dance", "visual"],
          turnNumber: 4,
          remainingTurnsChange: 4,
        } as Lesson,
      ],
      expected: {
        turnNumber: 4,
        originalTurns: 3,
        additionalTurns: 4,
        remainingOriginalTurns: 0,
        remainingAdditionalTurns: 4,
        remainingTurns: 4,
        idolParameterKind: "visual",
      },
    },
    {
      name: "ターン追加分を1ターン経過した時ま時、残り追加ターン数が減る",
      args: [
        {
          turns: ["vocal", "dance", "visual"],
          turnNumber: 6,
          remainingTurnsChange: 4,
        } as Lesson,
      ],
      expected: {
        additionalTurns: 4,
        remainingOriginalTurns: 0,
        remainingAdditionalTurns: 2,
        remainingTurns: 2,
      } as CurrentTurnDetails,
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(createCurrentTurnDetails(...args)).toMatchObject(expected);
  });
});
describe("calculateModifierEffectedActionCost", () => {
  const testCases: Array<{
    args: Parameters<typeof calculateModifierEffectedActionCost>;
    expected: ReturnType<typeof calculateModifierEffectedActionCost>;
  }> = [
    {
      args: [{ kind: "normal", value: 1 }, []],
      expected: { kind: "normal", value: 1 },
    },
    {
      args: [
        { kind: "normal", value: 1 },
        [{ kind: "lifeConsumptionReduction", value: 2 }],
      ],
      expected: { kind: "normal", value: 0 },
    },
    {
      args: [
        { kind: "normal", value: 2 },
        [{ kind: "halfLifeConsumption", duration: 1 }],
      ],
      expected: { kind: "normal", value: 1 },
    },
    {
      args: [
        { kind: "normal", value: 3 },
        [{ kind: "halfLifeConsumption", duration: 1 }],
      ],
      expected: { kind: "normal", value: 2 },
    },
    {
      args: [
        { kind: "normal", value: 1 },
        [{ kind: "doubleLifeConsumption", duration: 1 }],
      ],
      expected: { kind: "normal", value: 2 },
    },
    {
      args: [
        { kind: "normal", value: 2 },
        [
          { kind: "halfLifeConsumption", duration: 1 },
          { kind: "doubleLifeConsumption", duration: 1 },
        ],
      ],
      expected: { kind: "normal", value: 2 },
    },
    {
      args: [
        { kind: "normal", value: 2 },
        [
          { kind: "lifeConsumptionReduction", value: 1 },
          { kind: "halfLifeConsumption", duration: 1 },
          { kind: "doubleLifeConsumption", duration: 1 },
        ],
      ],
      expected: { kind: "normal", value: 1 },
    },
    {
      args: [
        { kind: "normal", value: 2 },
        [
          { kind: "lifeConsumptionReduction", value: 1 },
          { kind: "doubleLifeConsumption", duration: 1 },
        ],
      ],
      expected: { kind: "normal", value: 3 },
    },
    {
      args: [
        { kind: "life", value: 1 },
        [{ kind: "lifeConsumptionReduction", value: 1 }],
      ],
      expected: { kind: "life", value: 0 },
    },
    {
      args: [
        { kind: "focus", value: 1 },
        [{ kind: "lifeConsumptionReduction", value: 1 }],
      ],
      expected: { kind: "focus", value: 1 },
    },
    {
      args: [
        { kind: "goodCondition", value: 1 },
        [{ kind: "lifeConsumptionReduction", value: 1 }],
      ],
      expected: { kind: "goodCondition", value: 1 },
    },
    {
      args: [
        { kind: "motivation", value: 1 },
        [{ kind: "lifeConsumptionReduction", value: 1 }],
      ],
      expected: { kind: "motivation", value: 1 },
    },
    {
      args: [
        { kind: "positiveImpression", value: 1 },
        [{ kind: "lifeConsumptionReduction", value: 1 }],
      ],
      expected: { kind: "positiveImpression", value: 1 },
    },
  ];
  test.each(testCases)(
    "$args.0, [$args.1.0, $args.1.1, $args.1.2] => $expected",
    ({ args, expected }) => {
      expect(calculateModifierEffectedActionCost(...args)).toStrictEqual(
        expected,
      );
    },
  );
});
describe("createActualTurns", () => {
  const testCases: Array<{
    args: Parameters<typeof createActualTurns>;
    expected: ReturnType<typeof createActualTurns>;
  }> = [
    {
      args: [{ turns: ["vocal", "dance"], remainingTurnsChange: 0 } as Lesson],
      expected: ["vocal", "dance"],
    },
    {
      args: [{ turns: ["vocal", "dance"], remainingTurnsChange: 1 } as Lesson],
      expected: ["vocal", "dance", "dance"],
    },
    {
      args: [{ turns: ["vocal", "dance"], remainingTurnsChange: 2 } as Lesson],
      expected: ["vocal", "dance", "dance", "dance"],
    },
  ];
  test.each(testCases)(
    "$args.0.turns, $args.0.remainingTurnsChange => $expected",
    ({ args, expected }) => {
      expect(createActualTurns(...args)).toStrictEqual(expected);
    },
  );
});
describe("createLesson", () => {
  test("it works", () => {
    const lesson = createLesson({
      cards: [
        {
          id: "c1",
          data: getCardDataByConstId("apirunokihon"),
          enhancements: [],
        },
      ],
      idGenerator: createIdGenerator(),
      idolDataId: "hanamisaki-r-1",
      producerItems: [
        {
          id: "p1",
          data: getProducerItemDataByConstId("hatsuboshitecho"),
          enhanced: false,
          activationCount: 0,
        },
      ],
      turns: ["vocal", "vocal", "vocal", "vocal", "vocal", "vocal"],
    });
    expect(lesson).toStrictEqual({
      clearScoreThresholds: undefined,
      idol: {
        data: getIdolDataByConstId("hanamisaki-r-1"),
        life: 32,
        maxLife: 32,
        vitality: 0,
        producerItems: [expect.any(Object)],
        modifiers: [],
        modifierIdsAtTurnStart: [],
        totalCardUsageCount: 0,
        actionPoints: 0,
        scoreBonus: undefined,
        drinks: [],
      },
      cards: [expect.any(Object)],
      hand: [],
      deck: ["c1"],
      discardPile: [],
      removedCardPile: [],
      score: 0,
      turnNumber: 0,
      turnEnded: false,
      turns: ["vocal", "vocal", "vocal", "vocal", "vocal", "vocal"],
      remainingTurnsChange: 0,
      encouragements: [],
      memoryEffects: [],
      ignoreIdolParameterKindConditionAfterClearing: false,
    });
  });
});
describe("diffUpdates", () => {
  const testCases: Array<{
    args: Parameters<typeof diffUpdates>;
    expected: ReturnType<typeof diffUpdates>;
  }> = [
    {
      args: [
        [{ kind: "life" }] as LessonUpdateQuery[],
        [{ kind: "life" }] as LessonUpdateQuery[],
      ],
      expected: [],
    },
    {
      args: [
        [{ kind: "life" }] as LessonUpdateQuery[],
        [
          { kind: "life" },
          { kind: "score" },
          { kind: "vitality" },
        ] as LessonUpdateQuery[],
      ],
      expected: [
        { kind: "score" },
        { kind: "vitality" },
      ] as LessonUpdateQuery[],
    },
  ];
  test.each(testCases)("$args => $expected", ({ args, expected }) => {
    expect(diffUpdates(...args)).toStrictEqual(expected);
  });
});
describe("findPrioritizedDoubleEffectModifier", () => {
  const testCases: Array<{
    args: Parameters<typeof findPrioritizedDoubleEffectModifier>;
    expected: ReturnType<typeof findPrioritizedDoubleEffectModifier>;
    name: string;
  }> = [
    {
      name: "doubleEffect がない時、undefined を返す",
      args: ["active", [{ kind: "focus", amount: 1, id: "a" }]],
      expected: undefined,
    },
    {
      name: "doubleEffect がひとつだけある時、それを返す",
      args: [
        "active",
        [
          { kind: "focus", amount: 1, id: "a" },
          { kind: "doubleEffect", id: "b" },
          { kind: "motivation", amount: 1, id: "c" },
        ],
      ],
      expected: { kind: "doubleEffect", id: "b" },
    },
    {
      name: "cardSummaryKind 条件に合致しない doubleEffect のみがある時、undefined を返す",
      args: [
        "active",
        [{ kind: "doubleEffect", cardSummaryKind: "mental", id: "a" }],
      ],
      expected: undefined,
    },
    {
      name: "cardSummaryKind 条件に合致する doubleEffect のみがある時、それを返す",
      args: [
        "active",
        [{ kind: "doubleEffect", cardSummaryKind: "active", id: "a" }],
      ],
      expected: { kind: "doubleEffect", cardSummaryKind: "active", id: "a" },
    },
    {
      name: "同じ内容の doubleEffect が複数ある時、先頭を返す",
      args: [
        "active",
        [
          { kind: "doubleEffect", id: "a" },
          { kind: "doubleEffect", id: "b" },
        ],
      ],
      expected: { kind: "doubleEffect", id: "a" },
    },
    {
      name: "同じ内容の duration 付き doubleEffect が複数ある時、先頭を返す",
      args: [
        "active",
        [
          { kind: "doubleEffect", duration: 1, id: "a" },
          { kind: "doubleEffect", duration: 1, id: "b" },
        ],
      ],
      expected: { kind: "doubleEffect", duration: 1, id: "a" },
    },
    {
      name: "duration の有無それぞれで doubleEffect が複数ある時、duration 有りを返す",
      args: [
        "active",
        [
          { kind: "doubleEffect", id: "a" },
          { kind: "doubleEffect", duration: 1, id: "b" },
        ],
      ],
      expected: { kind: "doubleEffect", duration: 1, id: "b" },
    },
    {
      name: "値の異なる duration 付き doubleEffect がある時、duration が短い方を返す",
      args: [
        "active",
        [
          { kind: "doubleEffect", duration: 2, id: "a" },
          { kind: "doubleEffect", duration: 1, id: "b" },
        ],
      ],
      expected: { kind: "doubleEffect", duration: 1, id: "b" },
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(findPrioritizedDoubleEffectModifier(...args)).toStrictEqual(
      expected,
    );
  });
});
describe("getDisplayedRepresentativeModifierValue", () => {
  const testCases: Array<{
    args: Parameters<typeof getDisplayedRepresentativeModifierValue>;
    expected: ReturnType<typeof getDisplayedRepresentativeModifierValue>;
  }> = [
    {
      args: [{ kind: "focus", amount: 2 }],
      expected: 2,
    },
    {
      args: [{ kind: "goodCondition", duration: 2 }],
      expected: 2,
    },
    {
      args: [{ kind: "doubleEffect" }],
      expected: 1,
    },
    {
      args: [{ kind: "debuffProtection", times: 2 }],
      expected: 2,
    },
    {
      args: [{ kind: "delayedEffect", delay: 2 } as Modifier],
      expected: 1,
    },
    {
      args: [{ kind: "lifeConsumptionReduction", value: 2 }],
      expected: 2,
    },
    {
      args: [{ kind: "reactiveEffect" } as Modifier],
      expected: undefined,
    },
  ];
  test.each(testCases)("$args.0 => $expected", ({ args, expected }) => {
    expect(getDisplayedRepresentativeModifierValue(...args)).toBe(expected);
  });
});
describe("getIdolParameterKindOnTurn", () => {
  const testCases: Array<{
    args: Parameters<typeof getIdolParameterKindOnTurn>;
    expected: ReturnType<typeof getIdolParameterKindOnTurn>;
  }> = [
    {
      args: [{ turns: ["vocal", "dance"], turnNumber: 1 } as Lesson],
      expected: "vocal",
    },
    {
      args: [{ turns: ["vocal", "dance"], turnNumber: 2 } as Lesson],
      expected: "dance",
    },
    {
      args: [{ turns: ["vocal", "dance"], turnNumber: 3 } as Lesson],
      expected: "dance",
    },
    {
      args: [{ turns: ["vocal", "dance"], turnNumber: 0 } as Lesson],
      expected: "vocal",
    },
  ];
  test.each(testCases)(
    "$args.0.turns, $args.0.turnNumber => $expected",
    ({ args, expected }) => {
      expect(getIdolParameterKindOnTurn(...args)).toBe(expected);
    },
  );
});
describe("getIdolParameterKindOnTurnConsideringIgnoring", () => {
  const testCases: Array<{
    args: Parameters<typeof getIdolParameterKindOnTurnConsideringIgnoring>;
    expected: ReturnType<typeof getIdolParameterKindOnTurnConsideringIgnoring>;
    name: string;
  }> = [
    {
      name: "クリア状態で条件無視をしない時、ターンのパラメータ種別を返す",
      args: [
        {
          turns: ["vocal"],
          turnNumber: 1,
          score: 1,
          clearScoreThresholds: { clear: 1 },
          ignoreIdolParameterKindConditionAfterClearing: false,
        } as Lesson,
      ],
      expected: "vocal",
    },
    {
      name: "クリア状態で条件無視をする時、undefined を返す",
      args: [
        {
          turns: ["vocal"],
          turnNumber: 1,
          score: 1,
          clearScoreThresholds: { clear: 1 },
          ignoreIdolParameterKindConditionAfterClearing: true,
        } as Lesson,
      ],
      expected: undefined,
    },
    {
      name: "未クリア状態で条件無視をする時、ターンのパラメータ種別を返す",
      args: [
        {
          turns: ["vocal"],
          turnNumber: 1,
          score: 1,
          clearScoreThresholds: { clear: 2 },
          ignoreIdolParameterKindConditionAfterClearing: true,
        } as Lesson,
      ],
      expected: "vocal",
    },
    {
      name: "クリア基準未設定で条件無視をする時、ターンのパラメータ種別を返す",
      args: [
        {
          turns: ["vocal"],
          turnNumber: 1,
          score: 1,
          ignoreIdolParameterKindConditionAfterClearing: true,
        } as Lesson,
      ],
      expected: "vocal",
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(getIdolParameterKindOnTurnConsideringIgnoring(...args)).toBe(
      expected,
    );
  });
});
describe("patchDiffs", () => {
  describe("actionPoints", () => {
    test("it works", () => {
      let lessonMock = {
        idol: {
          actionPoints: 1,
        },
      } as Lesson;
      lessonMock = patchDiffs(lessonMock, [
        {
          kind: "actionPoints",
          amount: -1,
        },
      ]);
      expect(lessonMock.idol.actionPoints).toBe(0);
    });
  });
  describe("cards.enhancement.effect", () => {
    test("it works", () => {
      const lessonMock = {
        cards: [
          {
            id: "1",
            enhancements: [] as Card["enhancements"],
          },
          {
            id: "2",
            enhancements: [] as Card["enhancements"],
          },
        ],
      } as Lesson;
      const lesson = patchDiffs(lessonMock, [
        {
          kind: "cards.enhancement.effect",
          cardIds: ["1"],
        },
      ]);
      expect(lesson.cards[0].enhancements).toStrictEqual([{ kind: "effect" }]);
      expect(lesson.cards[1].enhancements).toStrictEqual([]);
    });
  });
  describe("cards.enhancement.lessonSupport", () => {
    test("it works", () => {
      const lessonMock = {
        cards: [
          {
            id: "1",
            enhancements: [] as Card["enhancements"],
          },
          {
            id: "2",
            enhancements: [{ kind: "original" }],
          },
          {
            id: "3",
            enhancements: [{ kind: "effect" }],
          },
          {
            id: "4",
            enhancements: [] as Card["enhancements"],
          },
        ],
      } as Lesson;
      const lesson = patchDiffs(lessonMock, [
        {
          kind: "cards.enhancement.lessonSupport",
          targets: [
            { cardId: "1", supportCardIds: [{}] },
            { cardId: "2", supportCardIds: [{}] },
            { cardId: "3", supportCardIds: [{}, {}] },
          ],
        },
      ]);
      expect(lesson.cards[0].enhancements).toStrictEqual([
        { kind: "lessonSupport" },
      ]);
      expect(lesson.cards[1].enhancements).toStrictEqual([
        { kind: "original" },
        { kind: "lessonSupport" },
      ]);
      expect(lesson.cards[2].enhancements).toStrictEqual([
        { kind: "effect" },
        { kind: "lessonSupport" },
        { kind: "lessonSupport" },
      ]);
      expect(lesson.cards[3].enhancements).toStrictEqual([]);
    });
  });
  describe("cardPlacement", () => {
    test("全てのプロパティが存在する", () => {
      const lessonMock = {
        deck: ["1"],
        discardPile: ["2"],
        hand: ["3"],
        removedCardPile: ["4"],
      } as Lesson;
      const lesson = patchDiffs(lessonMock, [
        {
          kind: "cardPlacement",
          deck: ["11", "111"],
          discardPile: ["22", "222"],
          hand: ["33", "333"],
          removedCardPile: ["44", "444"],
        },
      ]);
      expect(lesson.deck).toStrictEqual(["11", "111"]);
      expect(lesson.discardPile).toStrictEqual(["22", "222"]);
      expect(lesson.hand).toStrictEqual(["33", "333"]);
      expect(lesson.removedCardPile).toStrictEqual(["44", "444"]);
    });
    test("deckとdiscardPileのみ", () => {
      const lessonMock = {
        deck: ["1"],
        discardPile: ["2"],
        hand: ["3"],
        removedCardPile: ["4"],
      } as Lesson;
      const lesson = patchDiffs(lessonMock, [
        {
          kind: "cardPlacement",
          deck: ["11", "111"],
          discardPile: ["22", "222"],
        },
      ]);
      expect(lesson.deck).toStrictEqual(["11", "111"]);
      expect(lesson.discardPile).toStrictEqual(["22", "222"]);
      expect(lesson.hand).toStrictEqual(["3"]);
      expect(lesson.removedCardPile).toStrictEqual(["4"]);
    });
    test("handとremovedCardPileのみ", () => {
      const lessonMock = {
        deck: ["1"],
        discardPile: ["2"],
        hand: ["3"],
        removedCardPile: ["4"],
      } as Lesson;
      const lesson = patchDiffs(lessonMock, [
        {
          kind: "cardPlacement",
          hand: ["33", "333"],
          removedCardPile: ["44", "444"],
        },
      ]);
      expect(lesson.deck).toStrictEqual(["1"]);
      expect(lesson.discardPile).toStrictEqual(["2"]);
      expect(lesson.hand).toStrictEqual(["33", "333"]);
      expect(lesson.removedCardPile).toStrictEqual(["44", "444"]);
    });
  });
  describe("cards.addition", () => {
    test("it works", () => {
      const lessonMock = {
        cards: [
          {
            id: "1",
          },
        ],
      } as Lesson;
      const lesson = patchDiffs(lessonMock, [
        {
          kind: "cards.addition",
          card: { id: "2" } as Card,
        },
      ]);
      expect(lesson.cards).toStrictEqual([{ id: "1" }, { id: "2" }]);
    });
  });
  describe("cards.removingLessonSupports", () => {
    test("it works", () => {
      const lessonMock = {
        cards: [
          {
            id: "1",
            enhancements: [{ kind: "original" }, { kind: "lessonSupport" }],
          },
          {
            id: "2",
            enhancements: [
              { kind: "effect" },
              { kind: "lessonSupport" },
              { kind: "lessonSupport" },
              { kind: "lessonSupport" },
            ],
          },
          {
            id: "3",
            enhancements: [{ kind: "lessonSupport" }],
          },
          {
            id: "4",
            enhancements: [],
          },
        ],
      } as Lesson;
      const lesson = patchDiffs(lessonMock, [
        {
          kind: "cards.removingLessonSupports",
          cardIds: ["1", "2", "4"],
        },
      ]);
      expect(lesson.cards[0].enhancements).toStrictEqual([
        { kind: "original" },
      ]);
      expect(lesson.cards[1].enhancements).toStrictEqual([{ kind: "effect" }]);
      expect(lesson.cards[2].enhancements).toStrictEqual([
        { kind: "lessonSupport" },
      ]);
      expect(lesson.cards[3].enhancements).toStrictEqual([]);
    });
  });
  describe("drinks.removal", () => {
    test("it works", () => {
      const lessonMock = {
        idol: {
          drinks: [{ id: "1" }, { id: "2" }, { id: "3" }],
        },
      } as Lesson;
      const lesson = patchDiffs(lessonMock, [
        {
          kind: "drinks.removal",
          id: "2",
        },
      ]);
      expect(lesson.idol.drinks).toStrictEqual([{ id: "1" }, { id: "3" }]);
    });
  });
  describe("modifierIdsAtTurnStart", () => {
    test("it works", () => {
      const lessonMock = {
        idol: {
          modifierIdsAtTurnStart: ["1", "2"],
        },
      } as Lesson;
      const lesson = patchDiffs(lessonMock, [
        {
          kind: "modifierIdsAtTurnStart",
          modifierIdsAtTurnStart: ["3", "4"],
        },
      ]);
      expect(lesson.idol.modifierIdsAtTurnStart).toStrictEqual(["3", "4"]);
    });
  });
  describe("modifiers.addition", () => {
    test("末尾へ新規追加する", () => {
      let lessonMock = {
        idol: {
          modifiers: [
            {
              kind: "focus",
              amount: 1,
              id: "a",
            },
          ],
        },
      } as Lesson;
      lessonMock = patchDiffs(lessonMock, [
        {
          kind: "modifiers.addition",
          actual: {
            kind: "goodCondition",
            duration: 2,
            id: "b",
          },
          max: {
            kind: "goodCondition",
            duration: 2,
            id: "b",
          },
        },
      ]);
      expect(lessonMock.idol.modifiers).toStrictEqual([
        {
          kind: "focus",
          amount: 1,
          id: "a",
        },
        {
          kind: "goodCondition",
          duration: 2,
          id: "b",
        },
      ]);
    });
  });
  describe("modifiers.removal", () => {
    const testCases: Array<{
      args: Parameters<typeof patchDiffs>;
      expected: ReturnType<typeof patchDiffs>;
      name: string;
    }> = [
      {
        name: "it works",
        args: [
          {
            idol: {
              modifiers: [{ id: "a" }, { id: "b" }, { id: "c" }],
            },
          } as Lesson,
          [{ kind: "modifiers.removal", id: "b" }],
        ],
        expected: {
          idol: {
            modifiers: [{ id: "a" }, { id: "c" }],
          },
        } as Lesson,
      },
    ];
    test.each(testCases)("$name", ({ args, expected }) => {
      expect(patchDiffs(...args)).toMatchObject(expected);
    });
  });
  describe("modifiers.update", () => {
    const testCases: Array<{
      args: Parameters<typeof patchDiffs>;
      expected: ReturnType<typeof patchDiffs>;
      name: string;
    }> = [
      {
        name: "amount - 加算できる / actual の値を参照している",
        args: [
          {
            idol: {
              modifiers: [{ kind: "focus", amount: 1, id: "a" }],
            },
          } as Lesson,
          [
            {
              kind: "modifiers.update",
              propertyNameKind: "amount",
              actual: 2,
              max: 10,
              id: "a",
            },
          ],
        ],
        expected: {
          idol: {
            modifiers: [{ kind: "focus", amount: 3, id: "a" }],
          },
        } as Lesson,
      },
      {
        name: "delay - 加算できる / actual の値を参照している",
        args: [
          {
            idol: {
              modifiers: [{ kind: "delayedEffect", delay: 1, id: "a" }],
            },
          } as Lesson,
          [
            {
              kind: "modifiers.update",
              propertyNameKind: "delay",
              actual: 2,
              max: 10,
              id: "a",
            },
          ],
        ],
        expected: {
          idol: {
            modifiers: [{ kind: "delayedEffect", delay: 3, id: "a" }],
          },
        } as Lesson,
      },
      {
        name: "duration - 加算できる / actual の値を参照している",
        args: [
          {
            idol: {
              modifiers: [{ kind: "goodCondition", duration: 1, id: "a" }],
            },
          } as Lesson,
          [
            {
              kind: "modifiers.update",
              propertyNameKind: "duration",
              actual: 2,
              max: 10,
              id: "a",
            },
          ],
        ],
        expected: {
          idol: {
            modifiers: [{ kind: "goodCondition", duration: 3, id: "a" }],
          },
        } as Lesson,
      },
      {
        name: "times - 加算できる / actual の値を参照している",
        args: [
          {
            idol: {
              modifiers: [{ kind: "debuffProtection", times: 1, id: "a" }],
            },
          } as Lesson,
          [
            {
              kind: "modifiers.update",
              propertyNameKind: "times",
              actual: 2,
              max: 10,
              id: "a",
            },
          ],
        ],
        expected: {
          idol: {
            modifiers: [{ kind: "debuffProtection", times: 3, id: "a" }],
          },
        } as Lesson,
      },
      {
        name: "value - 加算できる / actual の値を参照している",
        args: [
          {
            idol: {
              modifiers: [
                { kind: "lifeConsumptionReduction", value: 1, id: "a" },
              ],
            },
          } as Lesson,
          [
            {
              kind: "modifiers.update",
              propertyNameKind: "value",
              actual: 2,
              max: 10,
              id: "a",
            },
          ],
        ],
        expected: {
          idol: {
            modifiers: [
              { kind: "lifeConsumptionReduction", value: 3, id: "a" },
            ],
          },
        } as Lesson,
      },
      {
        name: "減算できる",
        args: [
          {
            idol: {
              modifiers: [{ kind: "focus", amount: 10, id: "a" }],
            },
          } as Lesson,
          [
            {
              kind: "modifiers.update",
              propertyNameKind: "amount",
              actual: -2,
              max: -2,
              id: "a",
            },
          ],
        ],
        expected: {
          idol: {
            modifiers: [{ kind: "focus", amount: 8, id: "a" }],
          },
        } as Lesson,
      },
      {
        name: "減算の結果、値が 0 になった時、削除される / 削除時にリストの順番を維持する",
        args: [
          {
            idol: {
              modifiers: [
                { kind: "focus", amount: 1, id: "a" },
                { kind: "motivation", amount: 1, id: "b" },
                { kind: "positiveImpression", amount: 1, id: "c" },
              ],
            },
          } as Lesson,
          [
            {
              kind: "modifiers.update",
              propertyNameKind: "amount",
              actual: -1,
              max: -1,
              id: "b",
            },
          ],
        ],
        expected: {
          idol: {
            modifiers: [
              { kind: "focus", amount: 1, id: "a" },
              { kind: "positiveImpression", amount: 1, id: "c" },
            ],
          },
        } as Lesson,
      },
      {
        name: "doubleEffect の duration が設定されている時、減算できて、その結果 0 になったら削除する",
        args: [
          {
            idol: {
              modifiers: [{ kind: "doubleEffect", duration: 1, id: "a" }],
            },
          } as Lesson,
          [
            {
              kind: "modifiers.update",
              propertyNameKind: "duration",
              actual: -1,
              max: -1,
              id: "a",
            },
          ],
        ],
        expected: {
          idol: { modifiers: [] as Modifier[] },
        } as Lesson,
      },
    ];
    test.each(testCases)("$name", ({ args, expected }) => {
      expect(patchDiffs(...args)).toMatchObject(expected);
    });
  });
  describe("life", () => {
    test("it works", () => {
      let lessonMock = {
        idol: {
          life: 5,
        },
      } as Lesson;
      lessonMock = patchDiffs(lessonMock, [
        {
          kind: "life",
          actual: -2,
          max: -3,
        },
      ]);
      expect(lessonMock.idol.life).toBe(3);
    });
  });
  describe("producerItem.activationCount", () => {
    test("it works", () => {
      let lessonMock = {
        idol: {
          producerItems: [
            { id: "1", activationCount: 1 },
            { id: "2", activationCount: 2 },
          ],
        },
      } as Lesson;
      lessonMock = patchDiffs(lessonMock, [
        {
          kind: "producerItem.activationCount",
          producerItemId: "2",
          value: 3,
        },
      ]);
      expect(lessonMock.idol.producerItems).toStrictEqual([
        {
          id: "1",
          activationCount: 1,
        },
        {
          id: "2",
          activationCount: 3,
        },
      ]);
    });
  });
  describe("remainingTurnsChange", () => {
    test("it works", () => {
      let lessonMock = {
        remainingTurnsChange: 0,
      } as Lesson;
      lessonMock = patchDiffs(lessonMock, [
        {
          kind: "remainingTurnsChange",
          amount: 1,
        },
      ]);
      expect(lessonMock.remainingTurnsChange).toBe(1);
    });
  });
  describe("score", () => {
    test("it works", () => {
      let lessonMock = {
        score: 1,
      } as Lesson;
      lessonMock = patchDiffs(lessonMock, [
        {
          kind: "score",
          actual: 2,
          max: 3,
        },
      ]);
      expect(lessonMock.score).toBe(3);
    });
  });
  describe("totalCardUsageCount", () => {
    test("it works", () => {
      let lessonMock = {
        idol: {
          totalCardUsageCount: 0,
        },
      } as Lesson;
      lessonMock = patchDiffs(lessonMock, [
        { kind: "totalCardUsageCount", value: 2 },
      ]);
      expect(lessonMock.idol.totalCardUsageCount).toBe(2);
    });
  });
  describe("turnEnded", () => {
    test("it works", () => {
      let lessonMock = {
        turnEnded: false,
      } as Lesson;
      lessonMock = patchDiffs(lessonMock, [{ kind: "turnEnded", value: true }]);
      expect(lessonMock.turnEnded).toBe(true);
    });
  });
  describe("turnNumberIncrease", () => {
    test("it works", () => {
      let lessonMock = {
        turnNumber: 0,
      } as Lesson;
      lessonMock = patchDiffs(lessonMock, [{ kind: "turnNumberIncrease" }]);
      expect(lessonMock.turnNumber).toBe(1);
    });
  });
  describe("vitality", () => {
    test("it works", () => {
      let lessonMock = {
        idol: {
          vitality: 5,
        },
      } as Lesson;
      lessonMock = patchDiffs(lessonMock, [
        {
          kind: "vitality",
          actual: -2,
          max: -3,
        },
      ]);
      expect(lessonMock.idol.vitality).toBe(3);
    });
  });
});
describe("scanIncreasedModifierKinds", () => {
  const testCases: Array<{
    args: Parameters<typeof scanIncreasedModifierKinds>;
    expected: ReturnType<typeof scanIncreasedModifierKinds>;
    name: string;
  }> = [
    {
      name: "更新差分がない時、空配列を返す",
      args: [[{ kind: "focus", amount: 1, id: "a" }], []],
      expected: [],
    },
    {
      name: "追加された状態修正を判別できる",
      args: [
        [],
        [
          {
            kind: "modifiers.addition",
            actual: { kind: "focus", amount: 1, id: "a" },
            max: { kind: "focus", amount: 1, id: "a" },
          },
          {
            kind: "modifiers.addition",
            actual: { kind: "goodCondition", duration: 1, id: "b" },
            max: { kind: "goodCondition", duration: 1, id: "b" },
          },
        ],
      ],
      expected: ["focus", "goodCondition"],
    },
    {
      name: "増加の更新をされた状態修正を判別できる",
      args: [
        [{ kind: "motivation", amount: 1, id: "a" }],
        [
          {
            kind: "modifiers.update",
            propertyNameKind: "amount",
            id: "a",
            actual: 1,
            max: 1,
          },
        ],
      ],
      expected: ["motivation"],
    },
    {
      name: "増加していない更新をされた状態修正は、結果に含めない",
      args: [
        [{ kind: "motivation", amount: 1, id: "a" }],
        [
          {
            kind: "modifiers.update",
            propertyNameKind: "amount",
            id: "a",
            actual: 0,
            max: 1,
          },
        ],
      ],
      expected: [],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(scanIncreasedModifierKinds(...args)).toStrictEqual(expected);
  });
});
