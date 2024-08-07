/**
 * 公開APIの組み合わせを検証するテスト
 *
 * - e2e.test.ts の検証を前提として、再現できない・再現しにくい状況を検証する
 */

import {
  type LessonDisplay,
  endTurn,
  generateLessonDisplay,
  getNextHistoryResultIndex,
  initializeGamePlay,
  isLessonEnded,
  hasActionEnded,
  patchDiffs,
  playCard,
  skipTurn,
  startTurn,
  useDrink,
} from "./index";

describe("「ランダムな強化済みスキルカード（SSR）を、手札に生成」", () => {
  test("概ね正しく動作する", () => {
    for (let i = 0; i < 1000; i++) {
      let gamePlay = initializeGamePlay({
        idolDataId: "shinosawahiro-r-1",
        cards: [{ id: "apirunokihon" }, { id: "hyojonokihon" }],
        producerItems: [],
        drinks: [{ id: "hatsuboshisupesharuaojiru" }],
        turns: ["vocal"],
      });
      gamePlay = startTurn(gamePlay);
      expect(generateLessonDisplay(gamePlay)).toMatchObject({
        hand: [{}, {}, {}],
      } as LessonDisplay);
      gamePlay = useDrink(gamePlay, 0);
      expect(generateLessonDisplay(gamePlay)).toMatchObject({
        hand: [
          {},
          {},
          {},
          { rarity: "ssr", enhancements: [{ kind: "original" }] },
        ],
      } as LessonDisplay);
    }
  });
});
describe("「眠気を山札のランダムな位置に生成」", () => {
  test("概ね正しく動作する", () => {
    for (let i = 0; i < 1000; i++) {
      let gamePlay = initializeGamePlay({
        idolDataId: "shinosawahiro-r-1",
        cards: [
          { id: "apirunokihon" },
          { id: "apirunokihon" },
          { id: "apirunokihon" },
          { id: "apirunokihon" },
          { id: "apirunokihon" },
        ],
        producerItems: [],
        drinks: [{ id: "hatsuboshisupesharuaojiru" }],
        turns: ["vocal"],
        encouragements: [
          { turnNumber: 1, effect: { kind: "generateTroubleCard" } },
        ],
      });
      gamePlay = startTurn(gamePlay);
      const display = generateLessonDisplay(gamePlay);
      // 応援/トラブルは、手札を引く前に実行されるため、山札と手札のどちらかに入る
      expect(
        display.inventory.hand.some((e) => e.name === "眠気") ||
          display.inventory.deck.some((e) => e.name === "眠気"),
      ).toBe(true);
    }
  });
});
