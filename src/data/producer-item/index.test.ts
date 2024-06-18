import { findCardDataById } from "../card";
import { producerItems } from "./index";

test("any id is not duplicated", () => {
  let ids: string[] = [];
  for (const producerItem of producerItems) {
    expect(ids).not.toContain(producerItem.id);
    ids = [...ids, producerItem.id];
  }
});

// 存在するデータのパターンから、法則を推測し、それに適合しているかでデータの検証を行う。
// 今後、新しいデータの出現によって、法則が崩れてテストが成立しなくなる可能性はある。
for (const producerItem of producerItems) {
  describe(`${producerItem.name}(${producerItem.id})`, () => {
    // id値は複数単語を区切りなく連結しているため、特に母音が後の単語の先頭になるときのパターンはリストに加えられない
    // 例えば、"ou"は、「〜の/う〜」のような単語の場合、"no/u"が連続する
    test("an id should be written in Hepburn romanization", () => {
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
        expect(producerItem.id).not.toMatch(word);
      }
    });
    test("idol's producer item should have an enhancement pattern", () => {
      if (producerItem.producerItemProviderKind === "idol") {
        expect(producerItem.enhanced).not.toBeUndefined();
      }
    });
    test("a producer item obtained during the game cannot be enhanced", () => {
      if (
        producerItem.producerItemProviderKind === "supportCard" ||
        producerItem.producerItemProviderKind === "others"
      ) {
        expect(producerItem.enhanced).toBeUndefined();
      }
    });
    test("an enhanced producer item has a number of times that is equal to or greater than its pre-enhanced value", () => {
      if (
        producerItem.base.times !== undefined &&
        producerItem.enhanced &&
        producerItem.enhanced.times !== undefined
      ) {
        expect(producerItem.enhanced.times).toBeGreaterThanOrEqual(
          producerItem.base.times,
        );
      }
    });
    test("`trigger`が`cardDefinitionId`設定の`cardUsage`の時、対象のidがスキルカード定義に存在する", () => {
      if (
        producerItem.base.trigger.kind === "cardUsage" &&
        producerItem.base.trigger.cardDefinitionId !== undefined
      ) {
        expect(
          findCardDataById(producerItem.base.trigger.cardDefinitionId),
        ).not.toBeUndefined();
      }
      if (
        producerItem.enhanced &&
        producerItem.enhanced.trigger.kind === "cardUsage" &&
        producerItem.enhanced.trigger.cardDefinitionId !== undefined
      ) {
        expect(
          findCardDataById(producerItem.enhanced.trigger.cardDefinitionId),
        ).not.toBeUndefined();
      }
    });
  });
}
