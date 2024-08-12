import type { LessonDisplay, Modifier } from "../index";
import {
  endTurn,
  generateLessonDisplay,
  initializeGamePlay,
  isLessonEnded,
  playCard,
  startTurn,
  useDrink,
} from "../index";
import { addLessonSupport } from "../test-utils";

// 再現するプレイ動画: https://www.youtube.com/watch?v=uta5-aj-o64
test("最終試験前の追い込みレッスンを再現する", () => {
  let gamePlay = initializeGamePlay({
    idolDataId: "kuramotochina-ssr-1",
    specialTrainingLevel: 6,
    talentAwakeningLevel: 1,
    // 最大体力不明、プレイには関係なかった
    life: 16,
    idolSpecificCardTestId: "ojosamanoharebutai",
    cards: [
      { id: "hombanzenya", testId: "hombanzenya", enhanced: true },
      { id: "tegakinomesseji", testId: "tegakinomesseji", enhanced: true },
      { id: "yurufuwaoshaveri", testId: "yurufuwaoshaveri", enhanced: true },
      { id: "genkinaaisatsu", testId: "genkinaaisatsu", enhanced: true },
      { id: "apirunokihon", testId: "apirunokihon", enhanced: true },
      { id: "afureruomoide", testId: "afureruomoide", enhanced: true },
      { id: "200sumairu", testId: "200sumairu" },
      { id: "kibuntenkan", testId: "kibuntenkan" },
      { id: "pozunokihon", testId: "pozunokihon" },
      { id: "imetore", testId: "imetore", enhanced: true },
      { id: "watashigasta", testId: "watashigasta", enhanced: true },
      { id: "genkinaaisatsu", testId: "genkinaaisatsu2", enhanced: true },
      { id: "genkinaaisatsu", testId: "genkinaaisatsu3", enhanced: true },
      { id: "rizumikaru", testId: "rizumikaru", enhanced: true },
      { id: "mosukoshidake", testId: "mosukoshidake" },
      { id: "ishikinokihon", testId: "ishikinokihon" },
      { id: "terebishutsuen", testId: "terebishutsuen" },
      { id: "hyogennokihon", testId: "hyogennokihon" },
      { id: "genkinaaisatsu", testId: "genkinaaisatsu4", enhanced: true },
      { id: "kanaetaiyume", testId: "kanaetaiyume", enhanced: true },
      { id: "eieio", testId: "eieio" },
      { id: "ishikinokihon", testId: "ishikinokihon2" },
    ],
    producerItems: [{ id: "nakanaorinokikkake" }],
    drinks: [{ id: "uroncha" }, { id: "mikkususumuji" }, { id: "uroncha" }],
    turns: new Array(11).fill("dance"),
    clearScoreThresholds: { clear: 165, perfect: 600 },
    ignoreIdolParameterKindConditionAfterClearing: true,
    encouragements: [
      {
        turnNumber: 2,
        effect: {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 3 },
        },
      },
      {
        turnNumber: 4,
        effect: {
          kind: "generateTroubleCard",
          condition: {
            kind: "countModifier",
            modifierKind: "motivation",
            range: { max: 6 },
          },
        },
      },
      {
        turnNumber: 6,
        effect: {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 6 },
          condition: {
            kind: "countModifier",
            modifierKind: "motivation",
            range: { min: 13 },
          },
        },
      },
      {
        turnNumber: 7,
        effect: {
          kind: "drainLife",
          value: 4,
          condition: {
            kind: "countModifier",
            modifierKind: "motivation",
            range: { max: 23 },
          },
        },
      },
    ],
    // 動画にこれが発動する時点が含まれてなかったので、状況から推測
    memoryEffects: [
      { kind: "motivation", value: 1, probability: 100 },
      { kind: "halfLifeConsumption", value: 1, probability: 100 },
    ],
  });
  gamePlay.initialLesson.deck = [
    // 残りターン数11
    "hombanzenya", // 使用
    "tegakinomesseji",
    "yurufuwaoshaveri",
    // 残りターン数10
    "genkinaaisatsu", // レッスンサポート1発動
    "apirunokihon",
    "afureruomoide", // 使用
    // 残りターン数9
    "ojosamanoharebutai",
    "200sumairu", // レッスンサポート1発動、使用
    "kibuntenkan",
    // 残りターン数8
    "pozunokihon",
    "imetore", // 使用2
    "watashigasta", // 使用1
    "genkinaaisatsu2", // カードを引いた分
    // 残りターン数7(+1)
    "genkinaaisatsu3",
    "rizumikaru", // 使用
    "mosukoshidake",
    // 残りターン数6(+1)
    "ishikinokihon",
    "terebishutsuen", // 使用
    "hyogennokihon",
    // 残りターン数5(+1)
    "genkinaaisatsu4",
    "kanaetaiyume", // 使用
    "eieio",
    // 残りターン数4(+1)
    "ishikinokihon",
    "genkinaaisatsu", // このカードから山札再構築後、レッスンサポート1発動、使用、使用でクリア達成
    "genkinaaisatsu2",
    // 残りターン数3(+1)、Pアイテム「仲直りのきっかけ」発動
    "genkinaaisatsu3", // 使用2、使用でパーフェクト達成
    "ojosamanoharebutai", // 使用1
    "kibuntenkan",
  ];

  // 残りターン数11
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 16,
    vitality: 0,
    modifiers: [
      { name: "やる気", representativeValue: 1 },
      { name: "消費体力減少", representativeValue: 1 },
    ],
    score: 0,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = endTurn(gamePlay);

  // 残りターン数10
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, "genkinaaisatsu", 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 13,
    vitality: 0,
    modifiers: [
      { name: "やる気", representativeValue: 11 },
      { name: "好印象", representativeValue: 5 },
    ],
    score: 5,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = endTurn(gamePlay);

  // 残りターン数9
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, "200sumairu", 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 10,
    vitality: 15,
    modifiers: [
      { name: "やる気", representativeValue: 19 },
      { name: "好印象", representativeValue: 4 },
    ],
    score: 10,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数8
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, "imetore", 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 10,
    vitality: 9,
    modifiers: [
      { name: "やる気", representativeValue: 19 },
      { name: "好印象", representativeValue: 9 },
    ],
    score: 37,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数7(+1)
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 10,
    vitality: 36,
    modifiers: [
      { name: "やる気", representativeValue: 24 },
      { name: "好印象", representativeValue: 7 },
    ],
    score: 45,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数6(+1)
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 10,
    vitality: 68,
    modifiers: [
      { name: "やる気", representativeValue: 30 },
      { name: "好印象", representativeValue: 6 },
    ],
    score: 52,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数5(+1)
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 10,
    vitality: 100,
    modifiers: [
      { name: "やる気", representativeValue: 30 },
      { name: "好印象", representativeValue: 5 },
      { name: "消費体力減少", representativeValue: 4 },
    ],
    score: 58,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数4(+1)
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, "genkinaaisatsu", 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 9,
    vitality: 139,
    modifiers: [
      { name: "やる気", representativeValue: 30 },
      { name: "好印象", representativeValue: 4 },
      { name: "消費体力減少", representativeValue: 3 },
      { name: "消費体力削減", representativeValue: 2 },
    ],
    score: 63,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数3(+1)
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 9,
    vitality: 139,
    modifiers: [
      { name: "やる気", representativeValue: 30 },
      { name: "好印象", representativeValue: 3 },
      { name: "消費体力減少", representativeValue: 2 },
      { name: "消費体力削減", representativeValue: 2 },
      { name: "スキルカード使用数追加", representativeValue: 1 },
    ],
    score: 262,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  expect(isLessonEnded(gamePlay)).toBe(false);
  gamePlay = playCard(gamePlay, 0);
  expect(isLessonEnded(gamePlay)).toBe(true);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    score: 600,
  } as LessonDisplay);
});
// 再現するプレイ動画: https://www.youtube.com/watch?v=q1s7t-6KiY8
test("最終試験を再現する", () => {
  let gamePlay = initializeGamePlay({
    idolDataId: "kuramotochina-ssr-1",
    specialTrainingLevel: 6,
    talentAwakeningLevel: 1,
    life: 31,
    maxLife: 31,
    idolSpecificCardTestId: "ojosamanoharebutai",
    cards: [
      { id: "hombanzenya", testId: "hombanzenya", enhanced: true },
      { id: "ishikinokihon", testId: "ishikinokihon" },
      { id: "tegakinomesseji", testId: "tegakinomesseji", enhanced: true },
      { id: "mosukoshidake", testId: "mosukoshidake" },
      { id: "hyogennokihon", testId: "hyogennokihon" },
      { id: "genkinaaisatsu", testId: "genkinaaisatsu", enhanced: true },
      { id: "kanaetaiyume", testId: "kanaetaiyume", enhanced: true },
      { id: "apirunokihon", testId: "apirunokihon", enhanced: true },
      { id: "genkinaaisatsu", testId: "genkinaaisatsu2", enhanced: true },
      { id: "ishikinokihon", testId: "ishikinokihon2" },
      { id: "kibuntenkan", testId: "kibuntenkan" },
      { id: "terebishutsuen", testId: "terebishutsuen" },
      { id: "genkinaaisatsu", testId: "genkinaaisatsu3", enhanced: true },
      { id: "pozunokihon", testId: "pozunokihon" },
      { id: "genkinaaisatsu", testId: "genkinaaisatsu4", enhanced: true },
      { id: "todoite", testId: "todoite" },
      { id: "afureruomoide", testId: "afureruomoide", enhanced: true },
      { id: "200sumairu", testId: "200sumairu" },
      { id: "watashigasta", testId: "watashigasta", enhanced: true },
      { id: "eieio", testId: "eieio" },
      { id: "yurufuwaoshaveri", testId: "yurufuwaoshaveri", enhanced: true },
      { id: "rizumikaru", testId: "rizumikaru", enhanced: true },
      { id: "imetore", testId: "imetore", enhanced: true },
    ],
    producerItems: [{ id: "nakanaorinokikkake" }],
    drinks: [{ id: "uroncha" }, { id: "mikkususumuji" }, { id: "uroncha" }],
    turns: [
      "dance",
      "visual",
      "dance",
      "dance",
      "visual",
      "vocal",
      "vocal",
      "dance",
      "vocal",
      "visual",
      "dance",
    ],
    // クリアスコアは未確認で、この値かは不明
    clearScoreThresholds: { clear: 1700 },
    scoreBonus: { vocal: 546, dance: 1794, visual: 1421 },
    encouragements: [
      {
        turnNumber: 2,
        effect: {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 4 },
        },
      },
      {
        turnNumber: 4,
        effect: {
          kind: "perform",
          vitality: { value: 11 },
          condition: {
            kind: "countModifier",
            modifierKind: "motivation",
            range: { min: 9 },
          },
        },
      },
      {
        turnNumber: 6,
        effect: {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 9 },
          condition: {
            kind: "countModifier",
            modifierKind: "motivation",
            range: { min: 11 },
          },
        },
      },
    ],
    memoryEffects: [],
  });
  gamePlay.initialLesson.deck = [
    // 残りターン数11
    "hombanzenya", // 使用
    "ishikinokihon",
    "tegakinomesseji",
    // 残りターン数10、Pアイテム「仲直りのきっかけ」発動
    "mosukoshidake", // 使用1
    "hyogennokihon", // 使用2
    "genkinaaisatsu",
    // 残りターン数9
    "kanaetaiyume", // 使用
    "apirunokihon",
    "genkinaaisatsu2",
    // 残りターン数8
    "ishikinokihon2", // 使用
    "kibuntenkan",
    "terebishutsuen",
    // 残りターン数7
    "genkinaaisatsu3",
    "pozunokihon", // 使用
    "genkinaaisatsu4",
    // 残りターン数6
    "todoite",
    "afureruomoide", // 使用
    "ojosamanoharebutai",
    // 残りターン数5
    "200sumairu", // 使用
    "watashigasta", // 好印象0で使えない
    "eieio",
    // 残りターン数4
    "yurufuwaoshaveri",
    "rizumikaru",
    "imetore", // 使用
    // 残りターン数3
    "apirunokihon", // 山札再構築後の1枚目
    "ishikinokihon",
    "afureruomoide", // 使用
    // 残りターン数2、「私がスター」の後に「烏龍茶」x2を使用
    "pozunokihon",
    "genkinaaisatsu", // 使用2
    "watashigasta", // 使用1
    "mosukoshidake", // カードを引いた分
    // 残りターン数1(+1)、「ミックススムージー」使用
    "genkinaaisatsu2",
    "ishikinokihon2",
    "kibuntenkan",
    "eieio", // カードを交換した分
    "tegakinomesseji", // カードを交換した分
    "genkinaaisatsu3", // カードを交換した分、使用
    // 残りターン数1
    "terebishutsuen",
    "ojosamanoharebutai",
    "todoite", // 使用
  ];

  // 残りターン数11
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 31,
    vitality: 0,
    modifiers: [] as Modifier[],
    score: 0,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = endTurn(gamePlay);

  // 残りターン数10
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 26,
    vitality: 0,
    modifiers: [
      { name: "やる気", representativeValue: 11 },
      { name: "好印象", representativeValue: 5 },
      { name: "スキルカード使用数追加", representativeValue: 1 },
    ],
    score: 90,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = endTurn(gamePlay);

  // 残りターン数9
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 21,
    vitality: 21,
    modifiers: [
      { name: "やる気", representativeValue: 17 },
      { name: "好印象", representativeValue: 4 },
    ],
    score: 305,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = endTurn(gamePlay);

  // 残りターン数8
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 20,
    vitality: 75,
    modifiers: [
      { name: "やる気", representativeValue: 17 },
      { name: "好印象", representativeValue: 3 },
      { name: "消費体力削減", representativeValue: 2 },
    ],
    score: 377,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = endTurn(gamePlay);

  // 残りターン数7
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 20,
    vitality: 93,
    modifiers: [
      { name: "やる気", representativeValue: 19 },
      { name: "好印象", representativeValue: 2 },
      { name: "消費体力削減", representativeValue: 2 },
    ],
    score: 431,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数6
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 20,
    vitality: 113,
    modifiers: [
      { name: "やる気", representativeValue: 28 },
      { name: "好印象", representativeValue: 1 },
      { name: "消費体力削減", representativeValue: 2 },
    ],
    score: 489,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数5
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 20,
    vitality: 144,
    modifiers: [
      { name: "やる気", representativeValue: 33 },
      { name: "消費体力削減", representativeValue: 2 },
    ],
    score: 495,
    hand: [
      { name: "２００％スマイル", playable: true },
      { name: "私がスター+", playable: false },
      { name: "えいえいおー", playable: true },
    ],
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = endTurn(gamePlay);

  // 残りターン数4
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 20,
    vitality: 140,
    modifiers: [
      { name: "やる気", representativeValue: 33 },
      { name: "消費体力削減", representativeValue: 2 },
      { name: "好印象", representativeValue: 5 },
    ],
    score: 551,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = endTurn(gamePlay);

  // 残りターン数3
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 20,
    vitality: 182,
    modifiers: [
      { name: "やる気", representativeValue: 38 },
      { name: "消費体力削減", representativeValue: 2 },
      { name: "好印象", representativeValue: 4 },
    ],
    score: 641,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = endTurn(gamePlay);

  // 残りターン数2
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 20,
    vitality: 223,
    modifiers: [
      { name: "やる気", representativeValue: 43 },
      { name: "消費体力削減", representativeValue: 2 },
      { name: "好印象", representativeValue: 3 },
    ],
    score: 663,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = useDrink(gamePlay, 2);
  gamePlay = useDrink(gamePlay, 0);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数1(+1)
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 19,
    vitality: 323,
    modifiers: [
      { name: "やる気", representativeValue: 43 },
      { name: "消費体力削減", representativeValue: 2 },
      { name: "好印象", representativeValue: 1 },
    ],
    score: 6206,
    hand: [
      { name: "元気な挨拶+" },
      { name: "意識の基本" },
      { name: "気分転換" },
    ],
  } as LessonDisplay);
  gamePlay = useDrink(gamePlay, 0);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 21,
    hand: [
      { name: "えいえいおー" },
      { name: "手書きのメッセージ+" },
      { name: "元気な挨拶+" },
    ],
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = endTurn(gamePlay);

  // 残りターン数1
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 20,
    vitality: 323,
    modifiers: [
      { name: "やる気", representativeValue: 43 },
      { name: "消費体力削減", representativeValue: 2 },
    ],
    score: 13185,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  expect(isLessonEnded(gamePlay)).toBe(false);
  gamePlay = endTurn(gamePlay);
  expect(isLessonEnded(gamePlay)).toBe(true);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 20,
    vitality: 0,
    modifiers: [
      { name: "やる気", representativeValue: 43 },
      { name: "消費体力削減", representativeValue: 2 },
    ],
    score: 22460,
  } as LessonDisplay);
});
