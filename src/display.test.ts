import type {
  CardEnhancement,
  CardInInventoryDisplay,
  CardInProduction,
  Lesson,
  LessonDisplay,
  Modifier,
  ProducerItemInProduction,
} from "./types";
import { getCardDataById } from "./data/cards";
import { getProducerItemDataById } from "./data/producer-items";
import {
  generateCardInHandDisplay,
  generateCardInInventoryDisplays,
  generateCardPlayPreviewDisplay,
  generateEncouragementDisplays,
  generateLessonDisplay,
} from "./display";
import { prepareCardsForLesson } from "./models";
import { createIdGenerator } from "./utils";
import { createGamePlayForTest } from "./test-utils";

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

describe("generateCardInHandDisplay", () => {
  const testCases: Array<{
    args: Parameters<typeof generateCardInHandDisplay>;
    expected: ReturnType<typeof generateCardInHandDisplay>;
    name: string;
  }> = [
    {
      name: "基本的なスキルカードを要約できる",
      args: [
        createLessonForTest({
          deck: [
            {
              id: "a",
              data: getCardDataById("apirunokihon"),
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
            deck: [
              {
                id: "a",
                data: getCardDataById("apirunokihon"),
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
            deck: [
              {
                id: "a",
                data: getCardDataById("apirunokihon"),
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
          deck: [
            {
              id: "a",
              data: getCardDataById("rakkanteki"),
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
          {
            effect: expect.any(Object),
            kind: "modifier-goodCondition",
            applyable: true,
          },
          {
            effect: expect.any(Object),
            kind: "modifier-focus",
            applyable: false,
          },
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
          deck: [
            {
              id: "a",
              data: getCardDataById("hiyaku"),
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
          {
            effect: expect.any(Object),
            kind: "perform-score",
            applyable: false,
          },
        ],
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
            deck: [
              {
                id: "a",
                data: getCardDataById("hiyaku"),
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
        effects: [
          {
            effect: expect.any(Object),
            kind: "perform-score",
            applyable: true,
          },
        ],
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
          deck: [
            {
              id: "a",
              data: getCardDataById("honkinoshumi"),
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
          {
            effect: expect.any(Object),
            kind: "perform-vitality",
            applyable: false,
          },
        ],
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
            deck: [
              {
                id: "a",
                data: getCardDataById("honkinoshumi"),
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
        effects: [
          {
            effect: expect.any(Object),
            kind: "perform-vitality",
            applyable: true,
          },
        ],
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
            deck: [
              {
                id: "a",
                data: getCardDataById("apirunokihon"),
                enhanced: true,
              },
            ],
          });
          const aCard = lesson.cards.find((e) => e.id === "a");
          if (aCard) {
            aCard.enhancements = [
              ...aCard.enhancements,
              { kind: "lessonSupport" },
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
        enhancements: [{ kind: "original" }, { kind: "lessonSupport" }],
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
          deck: [
            {
              id: "a",
              data: getCardDataById("chosen"),
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
            deck: [
              {
                id: "a",
                data: getCardDataById("wammoasuteppu"),
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
    expect(generateCardInHandDisplay(...args)).toStrictEqual(expected);
  });
});
describe("generateEncouragementDisplays", () => {
  const testCases: Array<{
    args: Parameters<typeof generateEncouragementDisplays>;
    expected: ReturnType<typeof generateEncouragementDisplays>;
    name: string;
  }> = [
    {
      name: "descriptionの条件と効果の間に読点がない",
      args: [
        [
          {
            turnNumber: 1,
            effect: {
              kind: "perform",
              vitality: { value: 1 },
              condition: {
                kind: "countModifier",
                modifierKind: "focus",
                range: { min: 3 },
              },
            },
          },
        ],
      ],
      expected: [
        {
          turnNumber: 1,
          effect: expect.any(Object),
          description: "{{集中}}が3以上の場合{{元気}}+1",
        },
      ],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(generateEncouragementDisplays(...args)).toStrictEqual(expected);
  });
});
describe("generateCardInInventoryDisplays", () => {
  const testCases: Array<{
    args: Parameters<typeof generateCardInInventoryDisplays>;
    expected: ReturnType<typeof generateCardInInventoryDisplays>;
    name: string;
  }> = [
    {
      name: "標準ソートで整列する",
      args: [
        prepareCardsForLesson([
          {
            id: "a",
            data: getCardDataById("apirunokihon"),
            enhanced: false,
          },
          {
            id: "b",
            data: getCardDataById("hyogennokihon"),
            enhanced: false,
          },
        ]),
        ["b", "a"],
      ],
      expected: [{ id: "a" }, { id: "b" }] as CardInInventoryDisplay[],
    },
    {
      name: "レッスンサポートの強化を反映する",
      args: [
        prepareCardsForLesson([
          {
            id: "a",
            data: getCardDataById("apirunokihon"),
            enhanced: true,
          },
        ]).map((card) => ({
          ...card,
          enhancements: [
            ...card.enhancements,
            { kind: "lessonSupport" },
            { kind: "lessonSupport" },
          ],
        })),
        ["a"],
      ],
      expected: [
        { name: "アピールの基本+++", description: "パラメータ+15" },
      ] as CardInInventoryDisplay[],
    },
    {
      name: "状態修正効果がある時、効果リストへ追加する",
      args: [
        prepareCardsForLesson([
          {
            id: "a",
            data: getCardDataById("damedamekukkingu"),
            enhanced: false,
          },
        ]),
        ["a"],
      ],
      expected: [
        {
          effects: [
            { kind: "modifier-positiveImpression" },
            { kind: "modifier-motivation" },
            { kind: "modifier-delayedEffect" },
          ],
        },
      ] as CardInInventoryDisplay[],
    },
    {
      name: "条件付きのパラメータ増加と元気がある時、効果リストへ追加する",
      args: [
        prepareCardsForLesson([
          {
            id: "a",
            data: getCardDataById("hiyaku"),
            enhanced: false,
          },
          {
            id: "b",
            data: getCardDataById("chokougakurekiaidoru"),
            enhanced: false,
          },
        ]),
        ["a", "b"],
      ],
      expected: [
        { effects: [{ kind: "perform-score" }] },
        { effects: [{ kind: "perform-vitality" }] },
      ] as CardInInventoryDisplay[],
    },
    {
      name: "条件なしのパラメータ増加と元気がある時、効果リストへ追加しない",
      args: [
        prepareCardsForLesson([
          {
            id: "a",
            data: getCardDataById("shikosakugo"),
            enhanced: false,
          },
          {
            id: "b",
            data: getCardDataById("tegakinomesseji"),
            enhanced: false,
          },
        ]),
        ["a"],
      ],
      expected: [{ effects: [] as any }] as CardInInventoryDisplay[],
    },
    {
      name: "効果リストの applyable は常に true である",
      args: [
        prepareCardsForLesson([
          {
            id: "a",
            data: getCardDataById("hyojonokihon"),
            enhanced: false,
          },
          {
            id: "b",
            data: getCardDataById("hiyaku"),
            enhanced: false,
          },
        ]),
        ["a", "b"],
      ],
      expected: [
        { effects: [{ applyable: true }] },
        { effects: [{ applyable: true }] },
      ] as CardInInventoryDisplay[],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(generateCardInInventoryDisplays(...args)).toMatchObject(expected);
  });
});
describe("generateLessonDisplay", () => {
  const testCases: Array<{
    args: Parameters<typeof generateLessonDisplay>;
    expected: ReturnType<typeof generateLessonDisplay>;
    name: string;
  }> = [
    {
      name: "hand - 概ね動作する",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest({
            deck: [
              {
                id: "c1",
                data: getCardDataById("apirunokihon"),
                enhanced: false,
              },
              {
                id: "c2",
                data: getCardDataById("hyogennokihon"),
                enhanced: true,
              },
            ],
          });
          gamePlay.initialLesson.hand = ["c1", "c2"];
          gamePlay.initialLesson.cards = gamePlay.initialLesson.cards.map(
            (card) => {
              return card.id === "c2"
                ? {
                    ...card,
                    enhancements: [
                      ...card.enhancements,
                      { kind: "lessonSupport" },
                    ],
                  }
                : card;
            },
          );
          return gamePlay;
        })(),
      ],
      expected: {
        hand: [
          {
            name: "アピールの基本",
            enhancements: [] as CardEnhancement[],
          },
          {
            name: "表現の基本++",
            enhancements: [{ kind: "original" }, { kind: "lessonSupport" }],
          },
        ],
      } as LessonDisplay,
    },
    {
      name: "inventory.{deck,discardPile,hand,removedCardPile} - 概ね動作する",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest({
            deck: [
              {
                id: "c1",
                data: getCardDataById("apirunokihon"),
                enhanced: false,
              },
              {
                id: "c2",
                data: getCardDataById("furumainokihon"),
                enhanced: false,
              },
              {
                id: "c3",
                data: getCardDataById("hyojonokihon"),
                enhanced: false,
              },
              {
                id: "c4",
                data: getCardDataById("hyogennokihon"),
                enhanced: false,
              },
            ],
          });
          gamePlay.initialLesson.hand = ["c1"];
          gamePlay.initialLesson.deck = ["c2"];
          gamePlay.initialLesson.discardPile = ["c3"];
          gamePlay.initialLesson.removedCardPile = ["c4"];
          return gamePlay;
        })(),
      ],
      expected: {
        inventory: {
          hand: [{ id: "c1", name: "アピールの基本" }],
          deck: [{ id: "c2", name: "振る舞いの基本" }],
          discardPile: [{ id: "c3", name: "表情の基本" }],
          removedCardPile: [{ id: "c4", name: "表現の基本" }],
        },
      } as LessonDisplay,
    },
    {
      name: 'producerItems - 概ね動作する | 強化済みの名称には、"+"を末尾へ付与する',
      args: [
        (() => {
          const gamePlay = createGamePlayForTest({
            producerItems: [
              {
                id: "p1",
                data: getProducerItemDataById("saigononatsunoomoide"),
                enhanced: true,
              },
            ],
          });
          return gamePlay;
        })(),
      ],
      expected: {
        producerItems: [
          {
            id: "p1",
            name: "最後の夏の思い出+",
            description: [
              "ターン開始時{{集中}}が3以上の場合、{{元気}}+14",
              "（レッスン内1回）",
            ].join("\n"),
            activationCount: 0,
            remainingTimes: 1,
          },
        ],
      } as LessonDisplay,
    },
    {
      name: "modifiers - 状態修正が存在する時、それを含む配列を返す",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest();
          gamePlay.initialLesson.idol.modifiers = [
            { kind: "focus", amount: 1, id: "m1" },
          ];
          return gamePlay;
        })(),
      ],
      expected: {
        modifiers: [
          {
            id: "m1",
            kind: "focus",
            amount: 1,
            name: "集中",
            description: expect.any(String),
            representativeValue: 1,
            representativeValueText: "1",
          },
        ],
      } as LessonDisplay,
    },
    {
      name: "modifiers - 状態修正が存在しない時、空配列を返す",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest();
          return gamePlay;
        })(),
      ],
      expected: {
        modifiers: [] as Modifier[],
      } as LessonDisplay,
    },
    {
      name: "modifiers - おすすめ効果を先頭へ配置し、他の整列順は変えない",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest({
            idolDataId: "hanamisaki-ssr-1",
          });
          gamePlay.initialLesson.idol.modifiers = [
            { kind: "motivation", amount: 1, id: "m1" },
            { kind: "focus", amount: 1, id: "m2" },
            { kind: "goodCondition", duration: 1, id: "m3" },
            { kind: "excellentCondition", duration: 1, id: "m4" },
            { kind: "positiveImpression", amount: 1, id: "m5" },
          ];
          return gamePlay;
        })(),
      ],
      expected: {
        modifiers: [
          { kind: "goodCondition" },
          { kind: "motivation" },
          { kind: "focus" },
          { kind: "excellentCondition" },
          { kind: "positiveImpression" },
        ],
      } as LessonDisplay,
    },
    {
      name: "turns - 概ね動作する",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest();
          gamePlay.initialLesson.turns = ["vocal", "visual", "dance"];
          gamePlay.initialLesson.encouragements = [
            {
              turnNumber: 3,
              effect: { kind: "perform", vitality: { value: 1 } },
            },
          ];
          gamePlay.initialLesson.turnNumber = 2;
          gamePlay.initialLesson.remainingTurnsChange = 1;
          return gamePlay;
        })(),
      ],
      expected: {
        turns: [
          {
            idolParameter: {
              kind: "vocal",
              name: "ボーカル",
            },
            turnNumber: 1,
            turnNumberDiff: -1,
          },
          {
            idolParameter: {
              kind: "visual",
              name: "ビジュアル",
            },
            turnNumber: 2,
            turnNumberDiff: 0,
          },
          {
            idolParameter: {
              kind: "dance",
              name: "ダンス",
            },
            turnNumber: 3,
            turnNumberDiff: 1,
            encouragement: {
              turnNumber: 3,
              effect: expect.any(Object),
              description: "{{元気}}+1",
            },
          },
          {
            idolParameter: {
              kind: "dance",
              name: "ダンス",
            },
            turnNumber: 4,
            turnNumberDiff: 2,
          },
        ],
      } as LessonDisplay,
    },
    {
      name: "scoreBonus - 概ね動作する",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest();
          gamePlay.initialLesson.turns = ["vocal"];
          gamePlay.initialLesson.turnNumber = 1;
          gamePlay.initialLesson.idol.scoreBonus = {
            vocal: 300,
            visual: 200,
            dance: 100,
          };
          return gamePlay;
        })(),
      ],
      expected: {
        scoreBonus: 300,
      } as LessonDisplay,
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(generateLessonDisplay(...args)).toMatchObject(expected);
  });
});

describe("generateCardPlayPreviewDisplay", () => {
  const testCases: Array<{
    args: Parameters<typeof generateCardPlayPreviewDisplay>;
    expected: ReturnType<typeof generateCardPlayPreviewDisplay>;
    name: string;
  }> = [
    {
      name: "概ね動作する",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest({
            deck: [
              {
                id: "c1",
                data: getCardDataById("jonetsutan"),
                enhanced: true,
              },
            ],
            producerItems: [
              {
                id: "p1",
                data: getProducerItemDataById("itsumonomeikupochi"),
                enhanced: false,
              },
            ],
          });
          gamePlay.initialLesson.hand = ["c1"];
          gamePlay.initialLesson.idol.modifiers = [
            { kind: "halfLifeConsumption", duration: 1, id: "m1" },
          ];
          return gamePlay;
        })(),
        0,
      ],
      expected: {
        card: {
          name: "情熱ターン+",
          description: ["パラメータ+18", "{{集中}}+4"].join("\n"),
          // スキルカードのプレビューには、消費体力減少効果は反映されていない
          cost: { kind: "normal", value: 6 },
        },
        // 「いつものメイクポーチ」は、本来発動するはずだが、プレビューなので発動していない
        lesson: expect.any(Object),
        updates: [
          // 差分には、消費体力減少効果が反映されている
          {
            kind: "life",
            actual: -3,
            max: -3,
            reason: expect.any(Object),
          },
          {
            kind: "score",
            actual: 18,
            max: 18,
            reason: expect.any(Object),
          },
          {
            kind: "modifier",
            actual: {
              kind: "focus",
              amount: 4,
              id: expect.any(String),
            },
            max: {
              kind: "focus",
              amount: 4,
              id: expect.any(String),
            },
            reason: expect.any(Object),
          },
        ],
      },
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(generateCardPlayPreviewDisplay(...args)).toStrictEqual(expected);
  });
});
