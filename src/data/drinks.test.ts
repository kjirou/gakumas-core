import { drinks } from "./drinks";

test("idが重複していない", () => {
  let ids: string[] = [];
  for (const item of drinks) {
    expect(ids).not.toContain(item.id);
    ids = [...ids, item.id];
  }
});
// 存在するデータのパターンから、法則を推測し、それに適合しているかでデータの検証を行う。
// 今後、新しいデータの出現によって、法則が崩れてテストが成立しなくなる可能性はある。
for (const drink of drinks) {
  describe(`${drink.name}(${drink.id})`, () => {
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
        expect(drink.id).not.toMatch(word);
      }
    });
  });
}
