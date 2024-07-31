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
      name: "体力が最大値を超えない",
      args: [
        {
          idolDataId: "kuramotochina-ssr-1",
          cards: [],
          producerItems: [],
          turns: ["vocal"],
          life: 100,
        },
      ],
      expected: {
        initialLesson: {
          idol: {
            life: 28,
          },
        },
      } as GamePlay,
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(initializeGamePlay(...args)).toMatchObject(expected);
  });
});
