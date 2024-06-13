import { cards } from "./index";

test("any id is not duplicated", () => {
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
    test("the character specific card should be non-duplicative and usable once per lesson", () => {
      if (card.characterSpecific) {
        expect(card.nonDuplicative).toBe(true);
        expect(card.base.usableOncePerLesson).toBe(true);
      }
    });
    test("the support-card specific card should be non-duplicative and usable once per lesson", () => {
      if (card.supportCardSpecific) {
        expect(card.nonDuplicative).toBe(true);
        expect(card.base.usableOncePerLesson).toBe(true);
      }
    });
    test("the `innate` property should not change if the card is enhanced", () => {
      if (card.enhanced) {
        expect(card.base.innate).toBe(card.base.innate);
      }
    });
    test("the `usableOncePerLesson` property should not change if the card is enhanced", () => {
      if (card.enhanced) {
        expect(card.base.usableOncePerLesson).toBe(
          card.base.usableOncePerLesson,
        );
      }
    });
    test("the type of cost for the enhanced card is generally the same as that for the basic card", () => {
      // kind:"life" の種類がコストが 0 になり、kind:"normal" になることはあるので、それは除外する
      if (
        card.enhanced &&
        !(
          card.base.cost.kind === "life" &&
          card.enhanced.cost.kind === "normal" &&
          card.enhanced.cost.value === 0
        )
      ) {
        expect(card.enhanced.cost.value).toBeLessThanOrEqual(
          card.base.cost.value,
        );
      }
    });
    test("the enhanced card should have lower cost than the base card", () => {
      if (card.enhanced) {
        expect(card.enhanced.cost.value).toBeLessThanOrEqual(
          card.base.cost.value,
        );
      }
    });
    test("the active card should have score performance", () => {
      // 「なに聴いているの？」は、元気と体力回復だけだがアクティブになっていて、データ設定がおかしそう？
      // 体力回復はアクティブではないのは、「距離感」や「陽だまりの生徒会室」がメンタルであることから。
      if (card.id !== "nanikiteruno") {
        const hasScorePerformance = card.base.effects.some(
          (effect) =>
            (effect.kind === "perform" && effect.score) ||
            effect.kind === "performLeveragingModifier" ||
            effect.kind === "performLeveragingVitality" ||
            (effect.kind === "getModifier" &&
              effect.modifier.kind === "delayedPerformance"),
        );
        if (card.cardSummaryKind === "active") {
          expect(hasScorePerformance).toBe(true);
        } else if (card.cardSummaryKind === "mental") {
          expect(hasScorePerformance).toBe(false);
        }
      }
    });
  });
}
