import type { GamePlay } from "./types";
import { getCardDataByConstId } from "./data/cards";
import { getDrinkDataById } from "./data/drinks";
import { getIdolDataByConstId } from "./data/idols";
import { getProducerItemDataByConstId } from "./data/producer-items";
import {
  endTurn,
  getNextPhase,
  initializeGamePlay,
  skipTurn,
  startTurn,
} from "./index";

describe("getNextPhase", () => {
  test("概ね正しく動く", () => {
    let gamePlay = initializeGamePlay({
      idolDataId: "kuramotochina-ssr-1",
      cards: [],
      producerItems: [],
      turns: ["vocal", "vocal"],
    });
    // 0
    expect(getNextPhase(gamePlay)).toBe("lessonStart");
    gamePlay = startTurn(gamePlay);
    // 1
    expect(getNextPhase(gamePlay)).toBe("playerInput");
    gamePlay = skipTurn(gamePlay);
    expect(getNextPhase(gamePlay)).toBe("turnEnd");
    gamePlay = endTurn(gamePlay);
    // 2
    expect(getNextPhase(gamePlay)).toBe("turnStart");
    gamePlay = startTurn(gamePlay);
    expect(getNextPhase(gamePlay)).toBe("playerInput");
    gamePlay = skipTurn(gamePlay);
    expect(getNextPhase(gamePlay)).toBe("turnEnd");
    gamePlay = endTurn(gamePlay);
    expect(getNextPhase(gamePlay)).toBe("lessonEnd");
  });
});
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
            data: getIdolDataByConstId("kuramotochina-ssr-1"),
            producerItems: [
              {
                data: getProducerItemDataByConstId("himitsutokkunkade"),
                enhanced: false,
              },
              {
                data: getProducerItemDataByConstId("masukottohikonin"),
              },
            ],
          },
          cards: [
            {
              data: getCardDataByConstId("ojosamanoharebutai"),
              enhancements: [],
            },
            {
              data: getCardDataByConstId("apirunokihon"),
              enhancements: [],
            },
            {
              data: getCardDataByConstId("hyogennokihon"),
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
                data: getProducerItemDataByConstId("himitsutokkunkade"),
                enhanced: true,
              },
            ],
          },
          cards: [
            {
              data: getCardDataByConstId("ojosamanoharebutai"),
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
            maxLife: 28,
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
            maxLife: 100,
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
      name: "Pドリンクが設定できる",
      args: [
        {
          idolDataId: "kuramotochina-ssr-1",
          cards: [],
          producerItems: [],
          turns: ["vocal"],
          drinks: [{ id: "hatsuboshimizu" }],
        },
      ],
      expected: {
        initialLesson: {
          idol: {
            drinks: [
              {
                id: expect.any(String),
                data: getDrinkDataById("hatsuboshimizu"),
              },
            ],
          },
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
    {
      name: "noDeckShuffle - 設定がある時、山札をシャッフルしない",
      args: [
        {
          idolDataId: "kuramotochina-ssr-1",
          cards: [
            { id: "apirunokihon", testId: "a" },
            { id: "apirunokihon", testId: "b" },
            { id: "apirunokihon", testId: "c" },
            { id: "apirunokihon", testId: "d" },
            { id: "apirunokihon", testId: "e" },
          ],
          producerItems: [],
          turns: ["vocal"],
          noDeckShuffle: true,
          noIdolSpecificCard: true,
          // 0 を返すからと言って山札がシャッフルされないわけではない、シャッフルの結果を固定するために 0 にしている
          getRandom: () => 0,
        },
      ],
      expected: {
        initialLesson: {
          deck: ["a", "b", "c", "d", "e"],
        },
      } as GamePlay,
    },
    {
      name: "noIdolSpecificCard - 設定がある時、アイドル固有のスキルカードを追加しない",
      args: [
        {
          idolDataId: "kuramotochina-ssr-1",
          cards: [],
          producerItems: [],
          turns: ["vocal"],
          noIdolSpecificCard: true,
        },
      ],
      expected: {
        initialLesson: {
          cards: [] as any,
        },
      } as GamePlay,
    },
    {
      name: "noIdolSpecificProducerItem - 設定がある時、アイドル固有のPアイテムを追加しない",
      args: [
        {
          idolDataId: "kuramotochina-ssr-1",
          cards: [],
          producerItems: [],
          turns: ["vocal"],
          noIdolSpecificProducerItem: true,
        },
      ],
      expected: {
        initialLesson: {
          idol: {
            producerItems: [] as any,
          },
        },
      } as GamePlay,
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(initializeGamePlay(...args)).toMatchObject(expected);
  });
});
