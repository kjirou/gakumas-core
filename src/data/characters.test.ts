import { characters } from "./characters";

test("any id is not duplicated", () => {
  let ids: string[] = [];
  for (const character of characters) {
    expect(ids).not.toContain(character.id);
    ids = [...ids, character.id];
  }
});

// 存在するデータのパターンから、法則を推測し、それに適合しているかでデータの検証を行う。
// 今後、新しいデータの出現によって、法則が崩れてテストが成立しなくなる可能性はある。
for (const character of characters) {
  describe(`${character.lastName}${character.firstName}(${character.id})`, () => {
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
        expect(character.id).not.toMatch(word);
      }
    });
  });
}
