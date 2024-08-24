/**
 * 本家のプレイを再現するテスト
 *
 * - 以下の観点は検証できない
 *   - a)山札の構築・再構築が正しく行われているか
 *     - 再構築がランダムなため
 *       - なお、テストのために、最初に再構築後も含めて山札として設定している
 *   - b)「ランダムな強化済みスキルカード（SSR）を、手札に生成」が正しく行われているか
 *     - 生成内容がランダムなため
 *   - c)「眠気を山札のランダムな位置に生成」が正しく行われているか
 *     - 入る位置がランダムなため
 */

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

// 再現するプレイ動画: https://www.youtube.com/watch?v=ZxVPhMuy6ko
test("最終試験前の追い込みレッスンを再現する", () => {
  let gamePlay = initializeGamePlay({
    idolDataId: "kuramotochina-ssr-2",
    specialTrainingLevel: 4,
    talentAwakeningLevel: 1,
    life: 31,
    maxLife: 34,
    noIdolSpecificCard: true,
    cards: [
      { id: "shizukanaishi", testId: "shizukanaishi" },
      { id: "shizukanaishi", testId: "shizukanaishi2", enhanced: true },
      { id: "shizukanaishi", testId: "shizukanaishi3", enhanced: true },
      { id: "daiseien", testId: "daiseien" },
      { id: "miwakunoshisen", testId: "miwakunoshisen", enhanced: true },
      { id: "aidorusengen", testId: "aidorusengen", enhanced: true },
      { id: "kokoronoarubamu", testId: "kokoronoarubamu" },
      { id: "furumainokihon", testId: "furumainokihon" },
      { id: "shupurehikoru", testId: "shupurehikoru", enhanced: true },
      { id: "tokutaimu", testId: "tokutaimu", enhanced: true },
      { id: "nemuke", testId: "nemuke" },
      { id: "hyogennokihon", testId: "hyogennokihon" },
      { id: "bazuwado", testId: "bazuwado", enhanced: true },
      { id: "chosen", testId: "chosen" },
      { id: "koruresuponsu", testId: "koruresuponsu", enhanced: true },
      { id: "seikohenomichisuji", testId: "seikohenomichisuji" },
      { id: "iji", testId: "iji" },
      { id: "sonzaikan", testId: "sonzaikan", enhanced: true },
      { id: "ochakaiheyokoso", testId: "ochakaiheyokoso", enhanced: true },
      { id: "apirunokihon", testId: "apirunokihon" },
      { id: "hyogennokihon", testId: "hyogennokihon2" },
      { id: "apirunokihon", testId: "apirunokihon2", enhanced: true },
      { id: "haitatchi", testId: "haitatchi", enhanced: true },
      { id: "hajimarinoaizu", testId: "hajimarinoaizu" },
      { id: "furumainokihon", testId: "furumainokihon2", enhanced: true },
    ],
    producerItems: [{ id: "yumeniafuretaoonimotsu" }],
    drinks: [
      { id: "bitamindorinku" },
      { id: "hatsuboshimizu" },
      { id: "aisukohi" },
    ],
    turns: new Array(12).fill("visual"),
    clearScoreThresholds: { clear: 165, perfect: 600 },
    ignoreIdolParameterKindConditionAfterClearing: true,
    encouragements: [
      {
        turnNumber: 2,
        effect: { kind: "perform", vitality: { value: 9 } },
      },
      {
        turnNumber: 6,
        effect: {
          kind: "getModifier",
          modifier: { kind: "doubleLifeConsumption", duration: 2 },
          condition: {
            kind: "countModifier",
            modifierKind: "goodCondition",
            range: { max: 4 },
          },
        },
      },
      {
        turnNumber: 8,
        effect: {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 4 },
          condition: {
            kind: "measureValue",
            valueKind: "score",
            criterionKind: "greaterEqual",
            percentage: 100,
          },
        },
      },
    ],
    memoryEffects: [
      { kind: "halfLifeConsumption", value: 1, probability: 100 },
    ],
  });
  gamePlay.initialLesson.deck = [
    // 残りターン数12
    "shizukanaishi",
    "shizukanaishi2", // レッスンサポート1発動、使用
    "shizukanaishi3",
    // 残りターン数11
    "daiseien", // 使用
    "miwakunoshisen",
    "aidorusengen", // レッスンサポート1発動
    // 残りターン数10
    "kokoronoarubamu",
    "furumainokihon", // 使用2
    "shupurehikoru", // レッスンサポート1発動、使用1
    // 残りターン数9
    "tokutaimu", // レッスンサポート1発動
    "nemuke",
    "hyogennokihon", // 使用
    // 残りターン数8
    "bazuwado", // 使用
    "chosen",
    "koruresuponsu", // レッスンサポート1発動
    // 残りターン数7
    "seikohenomichisuji",
    "iji", // 使用2
    "sonzaikan", // 使用1
    // 残りターン数6
    "ochakaiheyokoso", // レッスンサポート1発動、使用1
    "apirunokihon",
    "hyogennokihon2", // レッスンサポート1発動
    "apirunokihon2", // カードを引いた分、レッスンサポート1発動、使用2
    // 残りターン数5
    "haitatchi", // レッスンサポート1発動
    "hajimarinoaizu", // レッスンサポート1発動、使用
    "furumainokihon2",
    // 残りターン数4
    "chosen", // このカードから山札再構築後、レッスンサポート1発動
    "tokutaimu", // レッスンサポート1発動
    "bazuwado", // 使用、使用でクリア達成
    // 残りターン数3、Pアイテム「夢にあふれた大荷物」発動
    "apirunokihon", // 使用2
    "hyogennokihon2",
    "seikohenomichisuji", // 使用1
    // 残りターン数2
    "shupurehikoru", // 使用1
    "furumainokihon",
    "shizukanaishi", // レッスンサポート1発動、使用2
    // 残りターン数1、Pアイテム「ときめきのいっぱい」発動
    "shizukanaishi3",
    "aidorusengen", // 使用1
    "apirunokihon2", // レッスンサポート1発動、使用2
    "kokoronoarubamu", // カードを引いた分、レッスンサポート1発動
    "nemuke", // カードを引いた分
    // パーフェクト未達成
  ];

  // 残りターン数12
  gamePlay = startTurn(gamePlay, { noInnateActivation: true });
  gamePlay = addLessonSupport(gamePlay, 1, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 31,
    vitality: 0,
    modifiers: [{ name: "消費体力減少", representativeValue: 1 }],
    score: 0,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数11
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 29,
    vitality: 9,
    modifiers: [
      { name: "好調", representativeValue: 3 },
      { name: "集中", representativeValue: 4 },
    ],
    score: 0,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = endTurn(gamePlay);

  // 残りターン数10
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 2, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 29,
    vitality: 12,
    modifiers: [
      { name: "好調", representativeValue: 5 },
      { name: "集中", representativeValue: 4 },
    ],
    score: 0,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数9
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 0, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 29,
    vitality: 12,
    modifiers: [
      { name: "好調", representativeValue: 9 },
      { name: "集中", representativeValue: 2 },
    ],
    score: 21,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = endTurn(gamePlay);

  // 残りターン数8
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 2, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 29,
    vitality: 16,
    modifiers: [
      { name: "好調", representativeValue: 8 },
      { name: "集中", representativeValue: 2 },
    ],
    score: 21,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = endTurn(gamePlay);

  // 残りターン数7
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 29,
    vitality: 9,
    modifiers: [
      { name: "好調", representativeValue: 7 },
      { name: "集中", representativeValue: 2 },
    ],
    score: 105,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数6
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 0, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 29,
    vitality: 10,
    modifiers: [
      { name: "好調", representativeValue: 5 },
      { name: "集中", representativeValue: 11 },
    ],
    score: 105,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = addLessonSupport(gamePlay, 2, 1);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = endTurn(gamePlay);

  // 残りターン数5
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 0, 1);
  gamePlay = addLessonSupport(gamePlay, 1, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 29,
    vitality: 11,
    modifiers: [
      { name: "好調", representativeValue: 4 },
      { name: "集中", representativeValue: 11 },
      { name: "絶好調", representativeValue: 3 },
    ],
    score: 155,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数4
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 0, 1);
  gamePlay = addLessonSupport(gamePlay, 1, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 29,
    vitality: 8,
    modifiers: [
      { name: "好調", representativeValue: 10 },
      { name: "集中", representativeValue: 11 },
      { name: "絶好調", representativeValue: 2 },
    ],
    score: 155,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = endTurn(gamePlay);

  // 残りターン数3
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 2, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 29,
    vitality: 1,
    modifiers: [
      { name: "好調", representativeValue: 9 },
      { name: "集中", representativeValue: 11 },
      { name: "絶好調", representativeValue: 1 },
      { name: "スキルカード使用数追加", representativeValue: 1 },
    ],
    score: 318,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = endTurn(gamePlay);

  // 残りターン数2
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 2, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 29,
    vitality: 1,
    modifiers: [
      { name: "好調", representativeValue: 6 },
      { name: "集中", representativeValue: 20 },
    ],
    score: 382,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数1
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 0, 1);
  gamePlay = addLessonSupport(gamePlay, 2, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 24,
    vitality: 0,
    modifiers: [
      { name: "好調", representativeValue: 11 },
      { name: "集中", representativeValue: 22 },
    ],
    score: 528,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // パーフェクト未達成でレッスン終了
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    score: 582,
  } as LessonDisplay);
});
