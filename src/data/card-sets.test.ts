import { cards } from "./cards";
import { cardSets } from "./card-sets";

test("any id is not duplicated", () => {
  let ids: string[] = [];
  for (const cardSet of cardSets) {
    expect(ids).not.toContain(cardSet.id);
    ids = [...ids, cardSet.id];
  }
});

// 存在するデータのパターンから、法則を推測し、それに適合しているかでデータの検証を行う。
// 今後、新しいデータの出現によって、法則が崩れてテストが成立しなくなる可能性はある。
for (const cardSet of cardSets) {
  describe(cardSet.id, () => {
    test("`cardDefinitionIds` should exist in cards", () => {
      expect(
        cardSet.cardDefinitionIds.every((cardDefinitionId) =>
          cards.some((card) => card.id === cardDefinitionId),
        ),
      ).toBe(true);
    });
  });
}
