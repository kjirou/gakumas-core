import { get } from "http";
import type { CardData } from "../types";
import {
  cards,
  compareDeckOrder,
  getCardContentDataList,
  getCardDataById,
} from "./cards";

test("idが重複していない", () => {
  let ids: string[] = [];
  for (const card of cards) {
    expect(ids).not.toContain(card.id);
    ids = [...ids, card.id];
  }
});
// 存在するデータのパターンから、法則を推測し、それに適合しているかでデータの検証を行う。
// 今後、新しいデータの出現によって、法則が崩れてテストが成立しなくなる可能性はある。
for (const card of cards) {
  describe(`${card.name}(${card.id})`, () => {
    test("id文字列はヘボン式ローマ字表記である", () => {
      // id値は複数単語を区切りなく連結しているため、特に母音が後の単語の先頭になるときのパターンはリストに加えられない
      // 例えば、"ou"は、「〜の/う〜」のような単語の場合、"no/u"が連続する
      const nonHepburnWords = [
        "si",
        "ti",
        "tu",
        /(?<!s)hu/,
        "zi",
        "di",
        "du",
        "sya",
        "syu",
        "syo",
        "tya",
        "tyu",
        "tyo",
        "nb",
        "nm",
        "np",
        "cch",
      ];
      for (const word of nonHepburnWords) {
        expect(card.id).not.toMatch(word);
      }
    });
    test("アイドル固有スキルカードは、必ず「重複不可」「レッスン中1回」を持つ", () => {
      if (card.cardProviderKind === "idol") {
        expect(card.nonDuplicative).toBe(true);
        for (const content of getCardContentDataList(card)) {
          expect(content.usableOncePerLesson).toBe(true);
        }
      }
    });
    test("サポートカード固有スキルカードは、必ず「重複不可」「レッスン中1回」を持つ", () => {
      if (card.cardProviderKind === "supportCard") {
        expect(card.nonDuplicative).toBe(true);
        for (const content of getCardContentDataList(card)) {
          expect(content.usableOncePerLesson).toBe(true);
        }
      }
    });
    test("全ての強化段階で、「レッスン中1回」の有無は揃っている", () => {
      const contents = getCardContentDataList(card);
      for (const content of contents) {
        expect(content.usableOncePerLesson).toBe(
          contents[0].usableOncePerLesson,
        );
      }
    });
    test("全ての強化段階で、「レッスン開始時手札に入る」の有無は揃っている", () => {
      const contents = getCardContentDataList(card);
      for (const content of contents) {
        expect(content.innate).toBe(contents[0].innate);
      }
    });
    test("life コストの値は 0 にならない", () => {
      for (const content of getCardContentDataList(card)) {
        // life は値が 0 になると normal になる
        if (content.cost.kind === "life") {
          expect(content.cost.value).not.toBe(0);
        }
      }
    });
    test("全ての強化段階で、コストの種類は基本的に同じである", () => {
      const contents = getCardContentDataList(card);
      for (const content of contents) {
        // life は値が 0 になると normal になる
        if (contents[0].cost.kind === "life") {
          expect(content.cost.kind).toMatch(/^(life|normal)$/);
        } else {
          expect(content.cost.kind).toBe(contents[0].cost.kind);
        }
      }
    });
    test("コストの値は、強化段階の上昇により、少なくとも上がることはない", () => {
      let minCostValue: number | undefined = undefined;
      for (const content of getCardContentDataList(card)) {
        if (minCostValue !== undefined && content.cost.value > minCostValue) {
          fail("強化段階が高いのにコストが上がっている");
        }
        minCostValue = content.cost.value;
      }
    });
    test("アクティブスキルカードは、基本的にスコア/パラメータ増加効果を持つ、メンタルスキルカードはその逆である", () => {
      // 遅延効果や持続効果で攻撃的な効果を持つカードは、下の条件に当てはまらないことがあるので除外する
      //
      // 「なに聴いてるの？」だけは、元気と体力回復だけだがアクティブになっていて、データ設定がおかしそう？
      // 体力回復はアクティブではないのは、「距離感」や「陽だまりの生徒会室」がメンタルであることから。
      if (
        card.id !== "shikonoentame" &&
        card.id !== "kagayakukimihe" &&
        card.id !== "nanikiteruno"
      ) {
        for (const content of getCardContentDataList(card)) {
          const hasScorePerformance = content.effects.some(
            (effect) =>
              (effect.kind === "perform" && effect.score) ||
              effect.kind === "performLeveragingModifier" ||
              effect.kind === "performLeveragingVitality" ||
              (effect.kind === "getModifier" &&
                effect.modifier.kind === "delayedEffect" &&
                effect.modifier.effect.kind === "perform"),
          );
          if (card.cardSummaryKind === "active") {
            expect(hasScorePerformance).toBe(true);
          } else if (card.cardSummaryKind === "mental") {
            expect(hasScorePerformance).toBe(false);
          }
        }
      }
    });
    test("perform 種別の効果は、 score か vitality のどちらかもしくは両方のプロパティを持つ", () => {
      for (const content of getCardContentDataList(card)) {
        // TODO: delayedEffect 内の effect を検証できていない
        for (const effect of content.effects.filter(
          (effect) => effect.kind === "perform",
        )) {
          expect(effect.score || effect.vitality).toBeDefined();
        }
      }
    });
  });
}
describe("compareDeckOrder", () => {
  const testParameters: Array<{
    compared: Array<CardData["id"]>;
    expected: Array<CardData["id"]>;
    name: string;
  }> = [
    // shinshinkiei   =  active, sense, r, キャラ固有
    // karuiashidori  =  active, sense, r
    // chosen         =  active, sense, c
    // kyomoohayo     =  active, logic, r
    // kawaiishigusa  =  active, logic, c
    // apirunokihon   =  active,  free, c
    // baransukankaku =  mental, sense, r
    // furumainokihon =  mental, sense, c
    // risutato       =  mental, logic, r
    // mesennokihon   =  mental, logic, c
    // kiaijubun      =  mental,  free, r
    // hyogennokihon  =  mental,  free, c
    // nemuke         = trouble,  free, c
    {
      name: "概ね優先順位が考慮されている",
      compared: [
        "nemuke",
        "hyogennokihon",
        "kiaijubun",
        "mesennokihon",
        "risutato",
        "furumainokihon",
        "baransukankaku",
        "risutato",
        "apirunokihon",
        "kawaiishigusa",
        "kyomoohayo",
        "chosen",
        "shinshinkiei",
        "chosen",
        "karuiashidori",
      ],
      expected: [
        "shinshinkiei",
        "karuiashidori",
        "chosen",
        "chosen",
        "kyomoohayo",
        "kawaiishigusa",
        "apirunokihon",
        "baransukankaku",
        "furumainokihon",
        "risutato",
        "risutato",
        "mesennokihon",
        "kiaijubun",
        "hyogennokihon",
        "nemuke",
      ],
    },
  ];
  test.each(testParameters)("$name", ({ compared, expected }) => {
    const comparedList = compared.map((id) => getCardDataById(id));
    expect(comparedList.sort(compareDeckOrder).map((e) => e.id)).toStrictEqual(
      expected,
    );
  });
});
describe("getCardContentDataList", () => {
  const testCases: Array<{
    args: Parameters<typeof getCardContentDataList>;
    expected: ReturnType<typeof getCardContentDataList>;
  }> = [
    {
      args: [getCardDataById("karuiashidori")],
      expected: [
        {
          cost: { kind: "normal", value: 4 },
          effects: [
            { kind: "perform", score: { value: 6 } },
            {
              kind: "getModifier",
              modifier: { kind: "goodCondition", duration: 2 },
            },
          ],
        },
        {
          cost: { kind: "normal", value: 4 },
          effects: [
            { kind: "perform", score: { value: 9 } },
            {
              kind: "getModifier",
              modifier: { kind: "goodCondition", duration: 3 },
            },
          ],
        },
        {
          cost: { kind: "normal", value: 3 },
          effects: [
            { kind: "perform", score: { value: 9 } },
            {
              kind: "getModifier",
              modifier: { kind: "goodCondition", duration: 3 },
            },
          ],
        },
        {
          cost: { kind: "normal", value: 2 },
          effects: [
            { kind: "perform", score: { value: 9 } },
            {
              kind: "getModifier",
              modifier: { kind: "goodCondition", duration: 3 },
            },
          ],
        },
      ],
    },
    {
      args: [getCardDataById("nemuke")],
      expected: [
        {
          cost: { kind: "normal", value: 0 },
          effects: [],
          usableOncePerLesson: true,
        },
        {
          cost: { kind: "normal", value: 0 },
          effects: [],
          usableOncePerLesson: true,
        },
        {
          cost: { kind: "normal", value: 0 },
          effects: [],
          usableOncePerLesson: true,
        },
        {
          cost: { kind: "normal", value: 0 },
          effects: [],
          usableOncePerLesson: true,
        },
      ],
    },
  ];
  test.each(testCases)("$args.0.id", ({ args, expected }) => {
    expect(getCardContentDataList(...args)).toStrictEqual(expected);
  });
});
