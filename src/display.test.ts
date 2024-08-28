import type {
  CardEnhancement,
  CardInHandDisplay,
  CardInInventoryDisplay,
  CardPlayPreviewDisplay,
  LessonDisplay,
  Modifier,
  ModifierDisplay,
  ProducerItemDisplay,
} from "./types";
import { getCardDataByConstId } from "./data/cards";
import { getDrinkDataByConstId } from "./data/drinks";
import { getProducerItemDataByConstId } from "./data/producer-items";
import {
  generateCardInHandDisplay,
  generateCardInInventoryDisplays,
  generateCardPlayPreviewDisplay,
  generateEncouragementDisplays,
  generateLessonDisplay,
  generateModifierDisplays,
  generateProducerItemDisplays,
} from "./display";
import { createIdGenerator } from "./utils";
import { createGamePlayForTest, createLessonForTest } from "./test-utils";

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
          cards: [
            {
              id: "a",
              data: getCardDataByConstId("apirunokihon"),
              enhancements: [],
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
        rarity: "c",
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
                data: getCardDataByConstId("apirunokihon"),
                enhancements: [],
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
        rarity: "c",
        scores: expect.any(Array),
        vitality: undefined,
      },
    },
    {
      name: "コスト消費後の状態を元に効果が計算される",
      args: [
        (() => {
          const lesson = createLessonForTest({
            cards: [
              {
                id: "a",
                data: getCardDataByConstId("shupurehikoru"),
                enhancements: [],
              },
            ],
          });
          lesson.idol.modifiers = [
            { kind: "goodCondition", duration: 1, id: "m1" },
            { kind: "focus", amount: 3, id: "m2" },
          ];
          return lesson;
        })(),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        // 集中の効果がなくなって、好調の効果のみになっている
        scores: [{ value: 9 }],
      } as CardInHandDisplay,
    },
    {
      name: "コストにリソースが足りない時も、消費する分のコストの値を返す",
      args: [
        (() => {
          const lesson = createLessonForTest({
            cards: [
              {
                id: "a",
                data: getCardDataByConstId("apirunokihon"),
                enhancements: [],
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
        rarity: "c",
        scores: expect.any(Array),
        vitality: undefined,
      },
    },
    {
      name: "performにscoreとvitalityがある時、それぞれが正しい",
      args: [
        (() => {
          const lesson = createLessonForTest({
            cards: [
              {
                id: "a",
                data: getCardDataByConstId("pozunokihon"),
                enhancements: [],
              },
            ],
          });
          return lesson;
        })(),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        scores: [{ value: 2, times: 1 }],
        vitality: 2,
      } as CardInHandDisplay,
    },
    {
      name: "使用したスキルカード数を参照して元気を増加する効果は、まだ使っていないスキルカードを1枚分として加算した上で、表示値へ反映する",
      args: [
        (() => {
          const lesson = createLessonForTest({
            cards: [
              {
                id: "a",
                data: getCardDataByConstId("mikannotaiki"),
                enhancements: [],
              },
            ],
          });
          lesson.idol.totalCardUsageCount = 2;
          return lesson;
        })(),
        "a",
        () => 0,
        createIdGenerator(),
      ],
      expected: {
        vitality: 11,
      } as CardInHandDisplay,
    },
    {
      name: "無条件の状態修正と条件付きの状態修正を持つスキルカードで、後者の条件を満たさない時、effectsには条件を満たした旨と満たさない旨の2レコードが入る",
      args: [
        createLessonForTest({
          cards: [
            {
              id: "a",
              data: getCardDataByConstId("rakkanteki"),
              enhancements: [],
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
            activatable: true,
          },
          {
            effect: expect.any(Object),
            kind: "modifier-focus",
            activatable: false,
          },
        ],
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        rarity: "r",
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
              data: getCardDataByConstId("hiyaku"),
              enhancements: [],
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
            activatable: false,
          },
        ],
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        rarity: "sr",
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
                data: getCardDataByConstId("hiyaku"),
                enhancements: [],
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
            activatable: true,
          },
        ],
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        rarity: "sr",
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
              data: getCardDataByConstId("honkinoshumi"),
              enhancements: [],
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
            activatable: false,
          },
        ],
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        rarity: "ssr",
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
                data: getCardDataByConstId("honkinoshumi"),
                enhancements: [{ kind: "original" }],
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
            activatable: true,
          },
        ],
        enhancements: expect.any(Array),
        name: expect.any(String),
        playable: expect.any(Boolean),
        rarity: "ssr",
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
                data: getCardDataByConstId("apirunokihon"),
                enhancements: [{ kind: "original" }],
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
        rarity: "c",
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
              data: getCardDataByConstId("chosen"),
              enhancements: [],
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
        rarity: "c",
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
                data: getCardDataByConstId("wammoasuteppu"),
                enhancements: [],
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
        rarity: "ssr",
        scores: [
          { value: 13, times: 2 },
          { value: 13, times: 1 },
        ],
        vitality: undefined,
      },
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(generateCardInHandDisplay(...args)).toMatchObject(expected);
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
        [
          {
            id: "a",
            data: getCardDataByConstId("apirunokihon"),
            enhancements: [],
          },
          {
            id: "b",
            data: getCardDataByConstId("hyogennokihon"),
            enhancements: [],
          },
        ],
        ["b", "a"],
      ],
      expected: [{ id: "a" }, { id: "b" }] as CardInInventoryDisplay[],
    },
    {
      name: "レッスンサポートの強化を反映する",
      args: [
        [
          {
            id: "a",
            data: getCardDataByConstId("apirunokihon"),
            enhancements: [{ kind: "original" } as const],
          },
        ].map((card) => ({
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
        [
          {
            id: "a",
            data: getCardDataByConstId("damedamekukkingu"),
            enhancements: [],
          },
        ],
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
        [
          {
            id: "a",
            data: getCardDataByConstId("hiyaku"),
            enhancements: [],
          },
          {
            id: "b",
            data: getCardDataByConstId("chokougakurekiaidoru"),
            enhancements: [],
          },
        ],
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
        [
          {
            id: "a",
            data: getCardDataByConstId("shikosakugo"),
            enhancements: [],
          },
          {
            id: "b",
            data: getCardDataByConstId("tegakinomesseji"),
            enhancements: [],
          },
        ],
        ["a"],
      ],
      expected: [{ effects: [] as any }] as CardInInventoryDisplay[],
    },
    {
      name: "効果リストの activatable は常に true である",
      args: [
        [
          {
            id: "a",
            data: getCardDataByConstId("hyojonokihon"),
            enhancements: [],
          },
          {
            id: "b",
            data: getCardDataByConstId("hiyaku"),
            enhancements: [],
          },
        ],
        ["a", "b"],
      ],
      expected: [
        { effects: [{ activatable: true }] },
        { effects: [{ activatable: true }] },
      ] as CardInInventoryDisplay[],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(generateCardInInventoryDisplays(...args)).toMatchObject(expected);
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
            cards: [
              {
                id: "c1",
                data: getCardDataByConstId("jonetsutan"),
                enhancements: [{ kind: "original" }],
              },
            ],
            producerItems: [
              {
                id: "p1",
                data: getProducerItemDataByConstId("itsumonomeikupochi"),
                enhanced: false,
                activationCount: 0,
              },
            ],
          });
          gamePlay.initialLesson.idol.actionPoints = 1;
          gamePlay.initialLesson.hand = ["c1"];
          gamePlay.initialLesson.idol.life = 10;
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
        hasActionEnded: true,
        lessonDelta: {
          life: {
            after: 7,
            delta: -3,
          },
          score: {
            after: 18,
            delta: 18,
          },
          vitality: {
            after: 0,
            delta: 0,
          },
        },
        // 「いつものメイクポーチ」は、本来発動するはずだが、プレビューなので発動していない
        updates: [
          {
            kind: "actionPoints",
            amount: -1,
            reason: expect.any(Object),
          },
          // 差分には、消費体力減少効果が反映されている
          {
            kind: "life",
            actual: -3,
            max: -3,
            reason: expect.any(Object),
          },
          {
            kind: "totalCardUsageCount",
            value: 1,
            reason: expect.any(Object),
          },
          {
            kind: "score",
            actual: 18,
            max: 18,
            reason: expect.any(Object),
          },
          {
            kind: "modifiers.addition",
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
      } as CardPlayPreviewDisplay,
    },
    {
      name: "hasActionEnded - スキルカード使用によりアイドルの行動が終了する時、true になる",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest({
            cards: [
              {
                id: "c1",
                data: getCardDataByConstId("apirunokihon"),
                enhancements: [],
              },
            ],
          });
          gamePlay.initialLesson.idol.actionPoints = 1;
          gamePlay.initialLesson.hand = ["c1"];
          return gamePlay;
        })(),
        0,
      ],
      expected: {
        hasActionEnded: true,
      } as CardPlayPreviewDisplay,
    },
    {
      name: "hasActionEnded - スキルカード使用によりアイドルの行動が終了しない時、false になる",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest({
            cards: [
              {
                id: "c1",
                data: getCardDataByConstId("hidamarinoseitokaishitsu"),
                enhancements: [],
              },
            ],
          });
          gamePlay.initialLesson.idol.actionPoints = 1;
          gamePlay.initialLesson.hand = ["c1"];
          return gamePlay;
        })(),
        0,
      ],
      expected: {
        hasActionEnded: false,
      } as CardPlayPreviewDisplay,
    },
    {
      name: "lessonDelta.modifiers - 概ね正しく動く",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest({
            cards: [
              {
                id: "c1",
                data: getCardDataByConstId("shupurehikoru"),
                enhancements: [{ kind: "original" }],
              },
            ],
          });
          gamePlay.initialLesson.idol.actionPoints = 1;
          gamePlay.initialLesson.hand = ["c1"];
          gamePlay.initialLesson.idol.modifiers = [
            { kind: "focus", amount: 4, id: "m1" },
            { kind: "halfLifeConsumption", duration: 1, id: "m2" },
          ];
          return gamePlay;
        })(),
        0,
      ],
      expected: {
        lessonDelta: {
          modifires: [
            {
              name: "集中",
              representativeValue: 2,
              change: { kind: "update", representativeValueDelta: -2 },
            },
            {
              name: "消費体力減少",
              representativeValue: 1,
              change: undefined,
            },
            {
              name: "好調",
              representativeValue: 3,
              change: { kind: "addition", representativeValueDelta: 3 },
            },
          ],
        },
      } as CardPlayPreviewDisplay,
    },
    {
      name: "lessonDelta.modifiers - スキルカード使用数追加が付与されていなく、1追加のスキルカードのプレビューをする時、本家UIと異なり「スキルカード使用数追加 0(+1)」を返さない",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest({
            cards: [
              {
                id: "c1",
                data: getCardDataByConstId("aidorusengen"),
                enhancements: [],
              },
            ],
          });
          gamePlay.initialLesson.idol.actionPoints = 1;
          gamePlay.initialLesson.hand = ["c1"];
          return gamePlay;
        })(),
        0,
      ],
      expected: {
        lessonDelta: {
          modifires: [] as Modifier[],
        },
      } as CardPlayPreviewDisplay,
    },
    {
      name: "lessonDelta.modifiers - スキルカード使用数追加が1付与されていて、1追加のスキルカードのプレビューをする時、現在値:1/差分:追加+1の表示になる",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest({
            cards: [
              {
                id: "c1",
                data: getCardDataByConstId("aidorusengen"),
                enhancements: [],
              },
            ],
          });
          gamePlay.initialLesson.idol.actionPoints = 1;
          gamePlay.initialLesson.hand = ["c1"];
          gamePlay.initialLesson.idol.modifiers = [
            { kind: "additionalCardUsageCount", amount: 1, id: "m1" },
          ];
          return gamePlay;
        })(),
        0,
      ],
      expected: {
        lessonDelta: {
          modifires: [
            {
              name: "スキルカード使用数追加",
              representativeValue: 1,
              change: { kind: "addition", representativeValueDelta: 1 },
            },
          ],
        },
      } as CardPlayPreviewDisplay,
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(generateCardPlayPreviewDisplay(...args)).toMatchObject(expected);
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
describe("generateLessonDisplay", () => {
  const testCases: Array<{
    args: Parameters<typeof generateLessonDisplay>;
    expected: ReturnType<typeof generateLessonDisplay>;
    name: string;
  }> = [
    {
      name: "drinks - 概ね動作する",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest();
          gamePlay.initialLesson.idol.life = 2;
          gamePlay.initialLesson.idol.drinks = [
            { id: "d1", data: getDrinkDataByConstId("hatsuboshimizu") },
            { id: "d2", data: getDrinkDataByConstId("busutoekisu") },
          ];
          return gamePlay;
        })(),
      ],
      expected: {
        drinks: [
          {
            name: "初星水",
            description: "パラメータ+10",
          },
          {
            name: "ブーストエキス",
            description: [
              "{{パラメータ上昇量増加}}30%（3ターン）",
              "{{消費体力減少}}3ターン",
              "{{体力消費}}2",
            ].join("\n"),
          },
        ],
      } as LessonDisplay,
    },
    {
      name: "hand - 概ね動作する",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest({
            cards: [
              {
                id: "c1",
                data: getCardDataByConstId("apirunokihon"),
                enhancements: [],
              },
              {
                id: "c2",
                data: getCardDataByConstId("hyogennokihon"),
                enhancements: [{ kind: "original" }],
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
            cards: [
              {
                id: "c1",
                data: getCardDataByConstId("apirunokihon"),
                enhancements: [],
              },
              {
                id: "c2",
                data: getCardDataByConstId("furumainokihon"),
                enhancements: [],
              },
              {
                id: "c3",
                data: getCardDataByConstId("hyojonokihon"),
                enhancements: [],
              },
              {
                id: "c4",
                data: getCardDataByConstId("hyogennokihon"),
                enhancements: [],
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
      name: "life, maxLife",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest();
          gamePlay.initialLesson.idol.life = 1;
          gamePlay.initialLesson.idol.maxLife = 2;
          return gamePlay;
        })(),
      ],
      expected: {
        life: 1,
        maxLife: 2,
      } as LessonDisplay,
    },
    {
      name: "lifeRecoveredBySkippingTurn - 体力が最大から3下がっている時、2になる",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest();
          gamePlay.initialLesson.idol.life =
            gamePlay.initialLesson.idol.maxLife - 3;
          return gamePlay;
        })(),
      ],
      expected: {
        lifeRecoveredBySkippingTurn: 2,
      } as LessonDisplay,
    },
    {
      name: "lifeRecoveredBySkippingTurn - 体力が最大の時、0になる",
      args: [
        (() => {
          const gamePlay = createGamePlayForTest();
          return gamePlay;
        })(),
      ],
      expected: {
        lifeRecoveredBySkippingTurn: 0,
      } as LessonDisplay,
    },
    {
      name: "modifiers - 状態修正が存在する時、それを含む配列を返す / 状態修正は更新差分情報を含まない",
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
            change: undefined,
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
      name: 'producerItems - 概ね動作する | 強化済みの名称には、"+"を末尾へ付与する',
      args: [
        (() => {
          const gamePlay = createGamePlayForTest({
            producerItems: [
              {
                id: "p1",
                data: getProducerItemDataByConstId("saigononatsunoomoide"),
                enhanced: true,
                activationCount: 0,
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
describe("generateModifierDisplays", () => {
  const testCases: Array<{
    args: Parameters<typeof generateModifierDisplays>;
    expected: ReturnType<typeof generateModifierDisplays>;
    name: string;
  }> = [
    {
      name: "状態修正が空なら空配列を返す",
      args: [
        {
          modifiers: [] as Modifier[],
          recommendedModifierKind: "goodCondition",
        },
      ],
      expected: [] as ModifierDisplay[],
    },
    {
      name: "概ね動作する",
      args: [
        {
          modifiers: [
            { kind: "focus", amount: 2, id: "m1" },
            { kind: "additionalCardUsageCount", amount: 1, id: "m2" },
          ],
          recommendedModifierKind: "goodCondition",
        },
      ],
      expected: [
        {
          name: "集中",
          representativeValue: 2,
          representativeValueText: "2",
          change: undefined,
        },
        {
          name: "スキルカード使用数追加",
          representativeValue: 1,
          representativeValueText: "1",
          change: undefined,
        },
      ] as ModifierDisplay[],
    },
    {
      name: "reactiveEffect は個別設定の名称を使う",
      args: [
        {
          modifiers: [
            {
              kind: "reactiveEffect",
              trigger: { kind: "beforeCardEffectActivation" },
              effect: { kind: "perform", score: { value: 1 } },
              representativeName: "Foo",
              id: "m1",
            },
          ],
          recommendedModifierKind: "focus",
        },
      ],
      expected: [{ name: "Foo" }] as ModifierDisplay[],
    },
    {
      name: "おすすめ効果が先頭へ移動する",
      args: [
        {
          modifiers: [
            { kind: "additionalCardUsageCount", amount: 1, id: "m1" },
            { kind: "focus", amount: 2, id: "m2" },
          ],
          recommendedModifierKind: "focus",
        },
      ],
      expected: [
        { name: "集中" },
        { name: "スキルカード使用数追加" },
      ] as ModifierDisplay[],
    },
    {
      name: "前の状態修正リストが存在し、現在そこにない項目がある時、追加の差分情報を含めて返せる",
      args: [
        {
          beforeModifiers: [
            { kind: "halfLifeConsumption", duration: 1, id: "m1" },
          ],
          modifiers: [
            { kind: "halfLifeConsumption", duration: 1, id: "m1" },
            { kind: "goodCondition", duration: 1, id: "m2" },
          ],
          recommendedModifierKind: "motivation",
        },
      ],
      expected: [
        { name: "消費体力減少", change: undefined },
        {
          name: "好調",
          change: {
            kind: "addition",
            representativeValueDelta: 1,
          },
        },
      ] as ModifierDisplay[],
    },
    {
      name: "前の状態修正リストが存在し、現在そこと値が異なる項目がある時、更新の差分情報を含めて返せる",
      args: [
        {
          beforeModifiers: [
            { kind: "halfLifeConsumption", duration: 1, id: "m1" },
          ],
          modifiers: [{ kind: "halfLifeConsumption", duration: 3, id: "m1" }],
          recommendedModifierKind: "motivation",
        },
      ],
      expected: [
        {
          name: "消費体力減少",
          change: {
            kind: "update",
            representativeValueDelta: 2,
          },
        },
      ] as ModifierDisplay[],
    },
    {
      name: "前の状態修正リストが存在し、現在そこにない項目がある時、その差分情報は残らない",
      args: [
        {
          beforeModifiers: [
            { kind: "halfLifeConsumption", duration: 1, id: "m1" },
            { kind: "focus", amount: 2, id: "m2" },
            { kind: "doubleEffect", id: "m3" },
          ],
          modifiers: [
            { kind: "halfLifeConsumption", duration: 1, id: "m1" },
            { kind: "doubleEffect", id: "m3" },
          ],
          recommendedModifierKind: "motivation",
        },
      ],
      expected: [
        {
          name: "消費体力減少",
          change: undefined,
        },
        {
          name: "スキルカード追加発動",
          change: undefined,
        },
      ] as ModifierDisplay[],
    },
    {
      name: "前の状態修正リストが存在し、追加・更新・削除・不変を含む時、正しく動作する",
      args: [
        {
          beforeModifiers: [
            { kind: "goodCondition", duration: 1, id: "m1" },
            { kind: "halfLifeConsumption", duration: 1, id: "m2" },
            { kind: "focus", amount: 2, id: "m3" },
            { kind: "doubleEffect", id: "m4" },
          ],
          modifiers: [
            { kind: "halfLifeConsumption", duration: 1, id: "m2" },
            { kind: "focus", amount: 7, id: "m3" },
            { kind: "additionalCardUsageCount", amount: 1, id: "m5" },
          ],
          recommendedModifierKind: "motivation",
        },
      ],
      expected: [
        {
          name: "消費体力減少",
          change: undefined,
        },
        {
          name: "集中",
          change: { kind: "update", representativeValueDelta: 5 },
        },
        {
          name: "スキルカード使用数追加",
          change: { kind: "addition", representativeValueDelta: 1 },
        },
      ] as ModifierDisplay[],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(generateModifierDisplays(...args)).toMatchObject(expected);
  });
});
describe("generateProducerItemDisplays", () => {
  const testCases: Array<{
    args: Parameters<typeof generateProducerItemDisplays>;
    expected: ReturnType<typeof generateProducerItemDisplays>;
    name: string;
  }> = [
    {
      name: "name - 強化状態を反映する",
      args: [
        [
          {
            id: "p1",
            data: getProducerItemDataByConstId("saigononatsunoomoide"),
            enhanced: true,
            activationCount: 0,
          },
          {
            id: "p2",
            data: getProducerItemDataByConstId("amakawaramemmeguri"),
            enhanced: false,
            activationCount: 0,
          },
        ],
      ],
      expected: [
        {
          name: "最後の夏の思い出+",
        },
        {
          name: "天川ラーメン巡り",
        },
      ] as ProducerItemDisplay[],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(generateProducerItemDisplays(...args)).toMatchObject(expected);
  });
});
