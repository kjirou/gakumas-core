/**
 * 公開APIの組み合わせを検証するテスト
 *
 * - e2e-tests の検証を前提として、再現できない・再現しにくい状況を検証する
 * - なるべく公開APIを使う
 */

import {
  type LessonDisplay,
  endTurn,
  generateLessonDisplay,
  getLesson,
  initializeGamePlay,
  playCard,
  skipTurn,
  startTurn,
  useDrink,
} from "./index";

describe("手札の配布と山札の再構築", () => {
  test("山札7枚で、スキップを続けた時、山札:4,捨札:0と山札1:捨札:3を繰り返す", () => {
    let gamePlay = initializeGamePlay({
      idolDataId: "kuramotochina-r-1",
      cards: new Array(6).fill({ id: "apirunokihon" }),
      producerItems: [],
      turns: ["vocal", "vocal", "vocal"],
    });
    // 1
    gamePlay = startTurn(gamePlay);
    gamePlay = skipTurn(gamePlay);
    const display1 = generateLessonDisplay(gamePlay);
    expect(display1.inventory.deck).toHaveLength(4);
    expect(display1.inventory.discardPile).toHaveLength(0);
    gamePlay = endTurn(gamePlay);
    // 2
    gamePlay = startTurn(gamePlay);
    gamePlay = skipTurn(gamePlay);
    const display2 = generateLessonDisplay(gamePlay);
    expect(display2.inventory.deck).toHaveLength(1);
    expect(display2.inventory.discardPile).toHaveLength(3);
    gamePlay = endTurn(gamePlay);
    // 3
    gamePlay = startTurn(gamePlay);
    const display3 = generateLessonDisplay(gamePlay);
    expect(display3.inventory.deck).toHaveLength(4);
    expect(display3.inventory.discardPile).toHaveLength(0);
  });
  test("山札6枚で、スキップを続けた時、山札:3,捨札:0と山札:0,捨札:3を繰り返す / 山札0枚時の特殊仕様は発動しない", () => {
    let gamePlay = initializeGamePlay({
      idolDataId: "kuramotochina-r-1",
      cards: new Array(5).fill({ id: "apirunokihon" }),
      producerItems: [],
      turns: ["vocal", "vocal", "vocal"],
    });
    // 1
    gamePlay = startTurn(gamePlay);
    gamePlay = skipTurn(gamePlay);
    const display1 = generateLessonDisplay(gamePlay);
    expect(display1.inventory.deck).toHaveLength(3);
    expect(display1.inventory.discardPile).toHaveLength(0);
    gamePlay = endTurn(gamePlay);
    // 2
    gamePlay = startTurn(gamePlay);
    gamePlay = skipTurn(gamePlay);
    const display2 = generateLessonDisplay(gamePlay);
    expect(display2.inventory.deck).toHaveLength(0);
    expect(display2.inventory.discardPile).toHaveLength(3);
    gamePlay = endTurn(gamePlay);
    // 3
    gamePlay = startTurn(gamePlay);
    const display3 = generateLessonDisplay(gamePlay);
    expect(display3.inventory.deck).toHaveLength(3);
    expect(display3.inventory.discardPile).toHaveLength(0);
  });
  test("山札6枚で、2ターン目の山札0枚状態でスキルカードを使用した時、山札0枚時の特殊仕様が発動する", () => {
    let gamePlay = initializeGamePlay({
      idolDataId: "kuramotochina-r-1",
      idolSpecificCardTestId: "a",
      cards: [
        { id: "apirunokihon", testId: "b" },
        { id: "apirunokihon", testId: "c" },
        { id: "apirunokihon", testId: "d" },
        { id: "apirunokihon", testId: "e" },
        { id: "apirunokihon", testId: "f" },
      ],
      producerItems: [],
      turns: ["vocal", "vocal", "vocal"],
    });
    gamePlay.initialLesson.deck = ["a", "b", "c", "d", "e", "f"];
    // 1
    gamePlay = startTurn(gamePlay);
    expect(getLesson(gamePlay)).toMatchObject({
      hand: ["a", "b", "c"],
      deck: ["d", "e", "f"],
      discardPile: [],
    });
    gamePlay = skipTurn(gamePlay);
    gamePlay = endTurn(gamePlay);
    // 2
    gamePlay = startTurn(gamePlay);
    expect(getLesson(gamePlay)).toMatchObject({
      hand: ["d", "e", "f"],
      deck: [],
      discardPile: ["a", "b", "c"],
    });
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);
    // 3
    gamePlay = startTurn(gamePlay);
    expect(getLesson(gamePlay)).toMatchObject({
      hand: expect.arrayContaining(["a", "b", "c"]),
      deck: [],
      discardPile: expect.arrayContaining(["d", "e", "f"]),
    });
  });
  test("山札3枚で、毎ターンスキルカードを使用した時、おそらくは山札0枚時の特殊仕様を発動しつつも、手札は毎ターン3枚引ける", () => {
    let gamePlay = initializeGamePlay({
      idolDataId: "kuramotochina-r-1",
      noIdolSpecificCard: true,
      cards: [
        { id: "apirunokihon", testId: "a" },
        { id: "apirunokihon", testId: "b" },
        { id: "apirunokihon", testId: "c" },
      ],
      producerItems: [],
      turns: ["vocal", "vocal", "vocal"],
    });
    // 1
    gamePlay = startTurn(gamePlay);
    expect(getLesson(gamePlay)).toMatchObject({
      hand: expect.arrayContaining(["a", "b", "c"]),
      deck: [],
      discardPile: [],
    });
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);
    // 2
    gamePlay = startTurn(gamePlay);
    expect(getLesson(gamePlay)).toMatchObject({
      hand: expect.arrayContaining(["a", "b", "c"]),
      deck: [],
      discardPile: [],
    });
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);
    // 3
    gamePlay = startTurn(gamePlay);
    expect(getLesson(gamePlay)).toMatchObject({
      hand: expect.arrayContaining(["a", "b", "c"]),
      deck: [],
      discardPile: [],
    });
  });
});
describe("状態修正の効果時間の自然減少", () => {
  test("ターン開始時処理（例えば、応援/トラブル）で初めて付与された状態修正の種類は、次ターン開始時に効果時間が減少する", () => {
    let gamePlay = initializeGamePlay({
      idolDataId: "hanamisaki-ssr-1",
      cards: [],
      producerItems: [],
      turns: ["vocal", "vocal"],
      encouragements: [
        {
          turnNumber: 1,
          effect: {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 1 },
          },
        },
      ],
    });
    // 1
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      modifiers: [{ name: "好調", representativeValue: 1 }],
    } as LessonDisplay);
    gamePlay = skipTurn(gamePlay);
    gamePlay = endTurn(gamePlay);
    // 2
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      modifiers: [] as any,
    } as LessonDisplay);
  });
  test("アイドルの行動（例えば、スキルカード使用）で初めて付与された状態修正の種類は、次ターン開始時に効果時間が減少しない", () => {
    let gamePlay = initializeGamePlay({
      idolDataId: "hanamisaki-ssr-1",
      idolSpecificCardTestId: "a",
      cards: [
        { id: "aidorusengen", testId: "b" },
        { id: "kokumintekiaidoru", testId: "c" },
      ],
      producerItems: [],
      turns: ["vocal", "vocal"],
    });
    gamePlay.initialLesson.deck = ["a", "b", "c"];
    // 「国民的アイドル」のコストを用意
    gamePlay.initialLesson.idol.modifiers = [
      { kind: "goodCondition", duration: 1, id: "m1" },
    ];
    // 1
    gamePlay = startTurn(gamePlay);
    // 「国民的アイドル」→スキルカード使用数追加有りの「アイドル宣言」のコンボで、スキルカード使用数追加を1余らせる
    gamePlay = playCard(gamePlay, 2);
    gamePlay = playCard(gamePlay, 1);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      modifiers: [{ name: "スキルカード使用数追加", representativeValue: 1 }],
    } as LessonDisplay);
    gamePlay = skipTurn(gamePlay);
    gamePlay = endTurn(gamePlay);
    // 2
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      modifiers: [{ name: "スキルカード使用数追加", representativeValue: 1 }],
    } as LessonDisplay);
  });
});
// SSR清夏だけしか持ってなく、E2Eテストに書いてないので、ここで担保する
describe("レッスン開始時処理", () => {
  test("概ね正しく動作する", () => {
    let gamePlay = initializeGamePlay({
      idolDataId: "shiunsumika-ssr-1",
      cards: [],
      producerItems: [],
      turns: ["vocal"],
    });
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      producerItems: [{ name: "ゲーセンの戦利品", remainingTimes: 0 }],
      modifiers: [{ name: "集中", representativeValue: 3 }],
    } as LessonDisplay);
  });
});
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
