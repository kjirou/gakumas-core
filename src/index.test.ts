import type { GamePlay } from "./types";
import { getCardDataById } from "./data/cards";
import { getIdolDataById } from "./data/idols";
import { getProducerItemDataById } from "./data/producer-items";
import { initializeGamePlay } from "./index";

describe("initializeGamePlay", () => {
  const testCases: Array<{
    args: Parameters<typeof initializeGamePlay>;
    expected: ReturnType<typeof initializeGamePlay>;
    name: string;
  }> = [
    {
      name: "必須設定群が動作する",
      args: [
        {
          idolDataId: "kuramotochina-ssr-1",
          cards: [
            { id: "apirunokihon" },
            { id: "hyogennokihon", enhanced: true },
          ],
          producerItems: [{ id: "masukottohikonin" }],
          turns: ["vocal"],
        },
      ],
      expected: {
        initialLesson: {
          idol: {
            original: {
              data: getIdolDataById("kuramotochina-ssr-1"),
            },
            producerItems: [
              {
                original: {
                  data: getProducerItemDataById("himitsutokkunkade"),
                  enhanced: false,
                },
              },
              {
                original: {
                  data: getProducerItemDataById("masukottohikonin"),
                },
              },
            ],
          },
          cards: [
            {
              original: {
                data: getCardDataById("ojosamanoharebutai"),
                enhanced: false,
              },
            },
            {
              original: {
                data: getCardDataById("apirunokihon"),
                enhanced: false,
              },
            },
            {
              original: {
                data: getCardDataById("hyogennokihon"),
                enhanced: true,
              },
              enhancements: [{ kind: "original" }],
            },
          ],
          turns: ["vocal"],
        },
      } as GamePlay,
    },
    {
      name: "特訓段階と才能開花段階により、アイドル固有が強化される",
      args: [
        {
          idolDataId: "kuramotochina-ssr-1",
          specialTrainingLevel: 3,
          talentAwakeningLevel: 2,
          cards: [],
          producerItems: [],
          turns: ["vocal"],
        },
      ],
      expected: {
        initialLesson: {
          idol: {
            producerItems: [
              {
                original: {
                  data: getProducerItemDataById("himitsutokkunkade"),
                  enhanced: true,
                },
              },
            ],
          },
          cards: [
            {
              original: {
                data: getCardDataById("ojosamanoharebutai"),
                enhanced: true,
              },
              enhancements: [{ kind: "original" }],
            },
          ],
        },
      } as GamePlay,
    },
    {
      name: "最大体力のデフォルト値は、True End効果を含むアイドルの設定値である",
      args: [
        {
          idolDataId: "kuramotochina-ssr-1",
          cards: [],
          producerItems: [],
          turns: ["vocal"],
        },
      ],
      expected: {
        initialLesson: {
          idol: {
            original: {
              maxLife: 28,
            },
          },
        },
      } as GamePlay,
    },
    {
      name: "最大体力を任意値に設定できる",
      args: [
        {
          idolDataId: "kuramotochina-ssr-1",
          cards: [],
          producerItems: [],
          turns: ["vocal"],
          maxLife: 100,
        },
      ],
      expected: {
        initialLesson: {
          idol: {
            original: {
              maxLife: 100,
            },
          },
        },
      } as GamePlay,
    },
    {
      name: "体力が最大値を超えない",
      args: [
        {
          idolDataId: "kuramotochina-ssr-1",
          cards: [],
          producerItems: [],
          turns: ["vocal"],
          maxLife: 10,
          life: 100,
        },
      ],
      expected: {
        initialLesson: {
          idol: {
            life: 10,
          },
        },
      } as GamePlay,
    },
    {
      name: "応援/トラブルを設定できる",
      args: [
        {
          idolDataId: "kuramotochina-ssr-1",
          cards: [],
          producerItems: [],
          turns: ["vocal"],
          encouragements: [
            { turnNumber: 1, effect: { kind: "perform", score: { value: 1 } } },
          ],
        },
      ],
      expected: {
        initialLesson: {
          encouragements: [
            { turnNumber: 1, effect: { kind: "perform", score: { value: 1 } } },
          ],
        },
      } as GamePlay,
    },
    {
      name: "メモリーのアビリティによる効果発動が設定できる",
      args: [
        {
          idolDataId: "kuramotochina-ssr-1",
          cards: [],
          producerItems: [],
          turns: ["vocal"],
          memoryEffects: [{ kind: "vitality", value: 1, probability: 100 }],
        },
      ],
      expected: {
        initialLesson: {
          memoryEffects: [{ kind: "vitality", value: 1, probability: 100 }],
        },
      } as GamePlay,
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(initializeGamePlay(...args)).toMatchObject(expected);
  });
});
