import { cards } from "./cards";
import { characters } from "./characters";
import { producerItems } from "./producer-items";
import { idols } from "./idols";

test("idが重複していない", () => {
  let ids: string[] = [];
  for (const idol of idols) {
    expect(ids).not.toContain(idol.id);
    ids = [...ids, idol.id];
  }
});
// 存在するデータのパターンから、法則を推測し、それに適合しているかでデータの検証を行う。
// 今後、新しいデータの出現によって、法則が崩れてテストが成立しなくなる可能性はある。
for (const idol of idols) {
  describe(`${idol.id} - ${idol.title}`, () => {
    test("characterId が characters に存在する", () => {
      expect(
        characters.some((character) => character.id === idol.characterId),
      ).toBe(true);
    });
    test("id の中に characterId が埋め込まれている", () => {
      expect(idol.id).toMatch(idol.characterId);
    });
    test("specificCardId が cards に存在する", () => {
      expect(cards.some((card) => card.id === idol.specificCardId)).toBe(true);
    });
    test("specificProducerItemId が producerItems に存在する", () => {
      expect(
        producerItems.some(
          (producerItem) => producerItem.id === idol.specificProducerItemId,
        ),
      ).toBe(true);
    });
  });
}
