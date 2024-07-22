import { Card, Lesson, LessonUpdateQuery } from "./types";
import { getCardDataById } from "./data/cards";
import { getIdolDataById } from "./data/idols";
import { getProducerItemDataById } from "./data/producer-items";
import {
  calculateActualActionCost,
  calculateClearScoreProgress,
  createIdolInProduction,
  createLessonGamePlay,
  getIdolParameterKindOnTurn,
  patchUpdates,
} from "./models";
import { createIdGenerator } from "./utils";

describe("createIdolInProduction", () => {
  test("it creates an idol in production", () => {
    const idGenerator = createIdGenerator();
    const idolInProduction = createIdolInProduction({
      idolDefinitionId: "hanamisaki-r-1",
      cards: [
        {
          id: idGenerator(),
          definition: getCardDataById("haitatchi"),
          enhanced: true,
          enabled: true,
        },
      ],
      producerItems: [
        {
          id: idGenerator(),
          definition: getProducerItemDataById("hatsuboshitecho"),
        },
      ],
      specificCardEnhanced: false,
      specificProducerItemEnhanced: false,
      idGenerator,
    });
    expect(idolInProduction).toStrictEqual({
      deck: [
        {
          id: expect.any(String),
          definition: getCardDataById("shinshinkiei"),
          enhanced: false,
          enabled: true,
        },
        // 初期分
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        {
          id: expect.any(String),
          definition: getCardDataById("haitatchi"),
          enhanced: true,
          enabled: true,
        },
      ],
      definition: getIdolDataById("hanamisaki-r-1"),
      life: 32,
      maxLife: 32,
      producerItems: [
        {
          id: expect.any(String),
          definition: getProducerItemDataById("bakuonraion"),
          enhanced: false,
        },
        {
          id: expect.any(String),
          definition: getProducerItemDataById("hatsuboshitecho"),
        },
      ],
    });
  });
});
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
describe("createLessonGamePlay", () => {
  test("it creates a lesson game play", () => {
    const idGenerator = createIdGenerator();
    const idolInProduction = createIdolInProduction({
      idolDefinitionId: "hanamisaki-r-1",
      cards: [
        {
          id: idGenerator(),
          definition: getCardDataById("apirunokihon"),
          enhanced: false,
          enabled: true,
        },
        {
          id: idGenerator(),
          definition: getCardDataById("pozunokihon"),
          enhanced: false,
          enabled: true,
        },
      ],
      producerItems: [
        {
          id: idGenerator(),
          definition: getProducerItemDataById("hatsuboshitecho"),
        },
      ],
      specificCardEnhanced: false,
      specificProducerItemEnhanced: false,
      idGenerator,
    });
    const lessonGamePlay = createLessonGamePlay({
      idolInProduction,
      turns: ["vocal", "vocal", "vocal", "vocal", "vocal", "vocal"],
    });
    expect(lessonGamePlay).toStrictEqual({
      getRandom: expect.any(Function),
      idGenerator: expect.any(Function),
      initialLesson: {
        clearScoreThresholds: undefined,
        idol: {
          original: idolInProduction,
          life: 32,
          vitality: 0,
          producerItems: expect.any(Array),
          modifiers: [],
          modifierIdsAtTurnStart: [],
          totalCardUsageCount: 0,
          actionPoints: 0,
        },
        cards: expect.any(Array),
        hand: [],
        deck: expect.any(Array),
        discardPile: [],
        removedCardPile: [],
        playedCardsOnEmptyDeck: [],
        score: 0,
        turnNumber: 1,
        turns: ["vocal", "vocal", "vocal", "vocal", "vocal", "vocal"],
        remainingTurns: 0,
      },
      updates: [],
    });
  });
});
describe("calculateActualActionCost", () => {
  const testCases: Array<{
    args: Parameters<typeof calculateActualActionCost>;
    expected: ReturnType<typeof calculateActualActionCost>;
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
      expect(calculateActualActionCost(...args)).toStrictEqual(expected);
    },
  );
});
describe("patchUpdates", () => {
  describe("actionPoints", () => {
    test("it works", () => {
      let lessonMock = {
        idol: {
          actionPoints: 1,
        },
      } as Lesson;
      lessonMock = patchUpdates(lessonMock, [
        {
          kind: "actionPoints",
          amount: -1,
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
        },
      ]);
      expect(lessonMock.idol.actionPoints).toBe(0);
    });
  });
  describe("cardEnhancement", () => {
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
      const lesson = patchUpdates(lessonMock, [
        {
          kind: "cardEnhancement",
          cardIds: ["1"],
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
        },
      ]);
      expect(lesson.cards[0].enhancements).toStrictEqual([{ kind: "effect" }]);
      expect(lesson.cards[1].enhancements).toStrictEqual([]);
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
      const lesson = patchUpdates(lessonMock, [
        {
          kind: "cardPlacement",
          deck: ["11", "111"],
          discardPile: ["22", "222"],
          hand: ["33", "333"],
          removedCardPile: ["44", "444"],
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
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
      const lesson = patchUpdates(lessonMock, [
        {
          kind: "cardPlacement",
          deck: ["11", "111"],
          discardPile: ["22", "222"],
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
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
      const lesson = patchUpdates(lessonMock, [
        {
          kind: "cardPlacement",
          hand: ["33", "333"],
          removedCardPile: ["44", "444"],
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
        },
      ]);
      expect(lesson.deck).toStrictEqual(["1"]);
      expect(lesson.discardPile).toStrictEqual(["2"]);
      expect(lesson.hand).toStrictEqual(["33", "333"]);
      expect(lesson.removedCardPile).toStrictEqual(["44", "444"]);
    });
  });
  describe("cards", () => {
    test("it works", () => {
      const lessonMock = {
        cards: [
          {
            id: "1",
          },
          {
            id: "2",
          },
        ],
      } as Lesson;
      const lesson = patchUpdates(lessonMock, [
        {
          kind: "cards",
          cards: [],
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
        },
      ]);
      expect(lesson.cards).toStrictEqual([]);
    });
  });
  describe("modifierIdsAtTurnStart", () => {
    test("it works", () => {
      const lessonMock = {
        idol: {
          modifierIdsAtTurnStart: ["1", "2"],
        },
      } as Lesson;
      const lesson = patchUpdates(lessonMock, [
        {
          kind: "modifierIdsAtTurnStart",
          modifierIdsAtTurnStart: ["3", "4"],
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
        },
      ]);
      expect(lesson.idol.modifierIdsAtTurnStart).toStrictEqual(["3", "4"]);
    });
  });
  describe("modifier", () => {
    describe("新規追加", () => {
      test("既存の状態修正を指定しない時、末尾へ新規追加する", () => {
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
        lessonMock = patchUpdates(lessonMock, [
          {
            kind: "modifier",
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
            reason: {
              kind: "lessonStartTrigger",
              historyTurnNumber: 1,
              historyResultIndex: 1,
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
    describe("既存の特別な処理がない状態修正を指定した時、増減対象のプロパティ名称別に正しく更新できるか", () => {
      const modifierPropertyNamesWithKindsList = [
        [
          "amount",
          [
            "additionalCardUsageCount",
            "focus",
            "motivation",
            "positiveImpression",
          ],
        ],
        ["delay", ["delayedEffect"]],
        [
          "duration",
          [
            "doubleLifeConsumption",
            "excellentCondition",
            "goodCondition",
            "halfLifeConsumption",
            "mightyPerformance",
            "noVitalityIncrease",
          ],
        ],
        ["times", ["debuffProtection"]],
        ["value", ["lifeConsumptionReduction"]],
      ] as const;
      for (const [
        propertyName,
        modifierKinds,
      ] of modifierPropertyNamesWithKindsList) {
        describe(propertyName, () => {
          for (const modifierKind of modifierKinds) {
            describe(modifierKind, () => {
              test("合算する", () => {
                let lessonMock = {
                  idol: {
                    modifiers: [
                      {
                        kind: modifierKind,
                        [propertyName]: 1,
                        id: "a",
                      },
                    ],
                  },
                } as Lesson;
                lessonMock = patchUpdates(lessonMock, [
                  {
                    kind: "modifier",
                    actual: {
                      kind: modifierKind,
                      [propertyName]: 2,
                      id: "b",
                      updateTargetId: "a",
                    },
                    max: {
                      kind: modifierKind,
                      [propertyName]: 2,
                      id: "b",
                      updateTargetId: "a",
                    },
                    reason: {
                      kind: "lessonStartTrigger",
                      historyTurnNumber: 1,
                      historyResultIndex: 1,
                    },
                  } as Extract<LessonUpdateQuery, { kind: "modifier" }>,
                ]);
                expect(lessonMock.idol.modifiers).toStrictEqual([
                  {
                    kind: modifierKind,
                    [propertyName]: 3,
                    id: "a",
                  },
                ]);
              });
              test("合算した結果0になった時、削除する", () => {
                let lessonMock = {
                  idol: {
                    modifiers: [
                      {
                        kind: modifierKind,
                        [propertyName]: 5,
                        id: "a",
                      },
                    ],
                  },
                } as Lesson;
                lessonMock = patchUpdates(lessonMock, [
                  {
                    kind: "modifier",
                    actual: {
                      kind: modifierKind,
                      [propertyName]: -5,
                      id: "b",
                      updateTargetId: "a",
                    },
                    max: {
                      kind: modifierKind,
                      [propertyName]: -5,
                      id: "b",
                      updateTargetId: "a",
                    },
                    reason: {
                      kind: "lessonStartTrigger",
                      historyTurnNumber: 1,
                      historyResultIndex: 1,
                    },
                  } as Extract<LessonUpdateQuery, { kind: "modifier" }>,
                ]);
                expect(lessonMock.idol.modifiers).toStrictEqual([]);
              });
            });
          }
        });
      }
    });
    describe("doubleEffect", () => {
      test("既存の状態修正を指定した時、削除できる", () => {
        let lessonMock = {
          idol: {
            modifiers: [
              {
                kind: "doubleEffect",
                times: 1,
                id: "a",
              },
            ],
          },
        } as Lesson;
        lessonMock = patchUpdates(lessonMock, [
          {
            kind: "modifier",
            actual: {
              kind: "doubleEffect",
              times: -1,
              id: "b",
              updateTargetId: "a",
            },
            max: {
              kind: "doubleEffect",
              times: -1,
              id: "b",
              updateTargetId: "a",
            },
            reason: {
              kind: "lessonStartTrigger",
              historyTurnNumber: 1,
              historyResultIndex: 1,
            },
          },
        ]);
        expect(lessonMock.idol.modifiers).toStrictEqual([]);
      });
    });
  });
  describe("life", () => {
    test("it works", () => {
      let lessonMock = {
        idol: {
          life: 5,
        },
      } as Lesson;
      lessonMock = patchUpdates(lessonMock, [
        {
          kind: "life",
          actual: -2,
          max: -3,
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
        },
      ]);
      expect(lessonMock.idol.life).toBe(3);
    });
  });
  describe("playedCardsOnEmptyDeck", () => {
    test("it works", () => {
      let lessonMock = {
        playedCardsOnEmptyDeck: ["1"],
      } as Lesson;
      lessonMock = patchUpdates(lessonMock, [
        {
          kind: "playedCardsOnEmptyDeck",
          cardIds: ["2"],
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
        },
      ]);
      expect(lessonMock.playedCardsOnEmptyDeck).toStrictEqual(["2"]);
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
      lessonMock = patchUpdates(lessonMock, [
        {
          kind: "producerItem.activationCount",
          producerItemId: "2",
          value: 3,
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
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
  describe("remainingTurns", () => {
    test("it works", () => {
      let lessonMock = {
        remainingTurns: 0,
      } as Lesson;
      lessonMock = patchUpdates(lessonMock, [
        {
          kind: "remainingTurns",
          amount: 1,
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
        },
      ]);
      expect(lessonMock.remainingTurns).toBe(1);
    });
  });
  describe("score", () => {
    test("it works", () => {
      let lessonMock = {
        score: 1,
      } as Lesson;
      lessonMock = patchUpdates(lessonMock, [
        {
          kind: "score",
          actual: 2,
          max: 3,
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
        },
      ]);
      expect(lessonMock.score).toBe(3);
    });
  });
  describe("turnNumberIncrease", () => {
    test("it works", () => {
      let lessonMock = {
        turnNumber: 0,
      } as Lesson;
      lessonMock = patchUpdates(lessonMock, [
        {
          kind: "turnNumberIncrease",
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
        },
      ]);
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
      lessonMock = patchUpdates(lessonMock, [
        {
          kind: "vitality",
          actual: -2,
          max: -3,
          reason: {
            kind: "lessonStartTrigger",
            historyTurnNumber: 1,
            historyResultIndex: 1,
          },
        },
      ]);
      expect(lessonMock.idol.vitality).toBe(3);
    });
  });
});
