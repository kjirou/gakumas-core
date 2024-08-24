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
  hasActionEnded,
  generateLessonDisplay,
  initializeGamePlay,
  isLessonEnded,
  playCard,
  skipTurn,
  startTurn,
} from "../index";
import { addLessonSupport } from "../test-utils";

// プレイ動画直リンク: https://youtu.be/l0kHH_iSDJw?t=22
test("中間試験まで6週の通常レッスンを再現する", () => {
  let gamePlay = initializeGamePlay({
    idolDataId: "arimuramao-ssr-2",
    specialTrainingLevel: 4,
    talentAwakeningLevel: 2,
    life: 31,
    idolSpecificCardTestId: "hinyarihitoyasumi",
    cards: [
      { id: "apirunokihon", testId: "apirunokihon", enhanced: true },
      { id: "hyojonokihon", testId: "hyojonokihon" },
      { id: "hyogennokihon", testId: "hyogennokihon" },
      { id: "shikosakugo", testId: "shikosakugo" },
      { id: "pozunokihon", testId: "pozunokihon" },
      { id: "apirunokihon", testId: "apirunokihon2" },
      { id: "hyogennokihon", testId: "hyogennokihon2", enhanced: true },
      { id: "haitatchi", testId: "haitatchi" },
    ],
    producerItems: [],
    turns: ["visual", "visual", "visual", "visual", "visual"],
    clearScoreThresholds: { clear: 30, perfect: 60 },
    encouragements: [
      { turnNumber: 2, effect: { kind: "perform", vitality: { value: 1 } } },
      {
        turnNumber: 4,
        effect: {
          kind: "drainLife",
          value: 2,
          condition: {
            kind: "countModifier",
            modifierKind: "focus",
            range: { min: 1 },
          },
        },
      },
    ],
    memoryEffects: [
      { kind: "halfLifeConsumption", probability: 100, value: 1 },
      { kind: "vitality", probability: 100, value: 2 },
    ],
  });
  gamePlay.initialLesson.deck = [
    // 残りターン数5
    "apirunokihon",
    "hyojonokihon", // 使用
    "hyogennokihon", // レッスンサポート1発動
    // 残りターン数4
    "shikosakugo",
    "pozunokihon",
    "apirunokihon2", // レッスンサポート1発動、使用
    // 残りターン数3
    "hyogennokihon2",
    "hinyarihitoyasumi", // 使用
    "haitatchi", // レッスンサポート1発動
  ];

  // 残りターン数5
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 2, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 31,
    vitality: 2,
    modifiers: [{ name: "消費体力減少", representativeValue: 1 }],
    score: 0,
  } as LessonDisplay);
  expect(hasActionEnded(gamePlay)).toBe(false);
  gamePlay = playCard(gamePlay, 1);
  expect(hasActionEnded(gamePlay)).toBe(true);
  gamePlay = endTurn(gamePlay);

  // 残りターン数4
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 2, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 31,
    vitality: 3,
    modifiers: [{ name: "集中", representativeValue: 2 }],
    score: 0,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = endTurn(gamePlay);

  // 残りターン数3
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 2, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 31,
    vitality: 0,
    modifiers: [{ name: "集中", representativeValue: 2 }],
    score: 16,
  } as LessonDisplay);
  expect(isLessonEnded(gamePlay)).toBe(false);
  gamePlay = playCard(gamePlay, 1);
  expect(isLessonEnded(gamePlay)).toBe(true);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    score: 60,
  } as LessonDisplay);
});
// プレイ動画直リンク: https://youtu.be/l0kHH_iSDJw?t=1006
test("最終試験まで1週の追い込みレッスンを再現する", () => {
  let gamePlay = initializeGamePlay({
    idolDataId: "arimuramao-ssr-2",
    specialTrainingLevel: 4,
    talentAwakeningLevel: 2,
    life: 12,
    idolSpecificCardTestId: "hinyarihitoyasumi",
    cards: [
      { id: "shizukanaishi", testId: "shizukanaishi", enhanced: true },
      { id: "shizukanaishi", testId: "shizukanaishi2", enhanced: true },
      { id: "tokutaimu", testId: "tokutaimu", enhanced: true },
      { id: "usureyukukabe", testId: "usureyukukabe" },
      { id: "aidorusengen", testId: "aidorusengen" },
      { id: "nemuke", testId: "nemuke" },
      { id: "shupurehikoru", testId: "shupurehikoru", enhanced: true },
      { id: "koruresuponsu", testId: "koruresuponsu", enhanced: true },
      { id: "shinkokyu", testId: "shinkokyu", enhanced: true },
      { id: "hyojonokihon", testId: "hyojonokihon" },
      { id: "miwakunoshisen", testId: "miwakunoshisen", enhanced: true },
      {
        id: "kokumintekiaidoru",
        testId: "kokumintekiaidoru",
        enhanced: true,
      },
      { id: "shikosakugo", testId: "shikosakugo" },
      { id: "shinkokyu", testId: "shinkokyu2", enhanced: true },
      { id: "apirunokihon", testId: "apirunokihon" },
      { id: "sonzaikan", testId: "sonzaikan", enhanced: true },
      { id: "haitatchi", testId: "haitatchi", enhanced: true },
      { id: "hyogennokihon", testId: "hyogennokihon" },
      { id: "sutandopure", testId: "sutandopure" },
      { id: "haitatchi", testId: "haitatchi2", enhanced: true },
      { id: "iji", testId: "iji" },
      { id: "nemuke", testId: "nemuke2" },
      { id: "hyogennokihon", testId: "hyogennokihon2" },
      { id: "daiseien", testId: "daiseien", enhanced: true },
      { id: "hyojonokihon", testId: "hyojonokihon2", enhanced: true },
    ],
    producerItems: [],
    drinks: [
      { id: "bitamindorinku" },
      { id: "hatsuboshisupesharuaojiru" },
      { id: "furesshubinega" },
    ],
    turns: new Array(12).fill("visual"),
    clearScoreThresholds: { clear: 165, perfect: 600 },
    ignoreIdolParameterKindConditionAfterClearing: true,
    encouragements: [
      { turnNumber: 4, effect: { kind: "perform", vitality: { value: 3 } } },
      {
        turnNumber: 6,
        effect: {
          kind: "drainLife",
          value: 6,
          condition: {
            kind: "countModifier",
            modifierKind: "focus",
            range: { max: 8 },
          },
        },
      },
      {
        turnNumber: 8,
        effect: {
          kind: "getModifier",
          modifier: {
            kind: "focus",
            amount: 6,
          },
          condition: {
            kind: "countModifier",
            modifierKind: "focus",
            range: { min: 18 },
          },
        },
      },
      {
        turnNumber: 10,
        effect: {
          kind: "getModifier",
          modifier: {
            kind: "focus",
            amount: 7,
          },
          condition: {
            kind: "countModifier",
            modifierKind: "focus",
            range: { min: 25 },
          },
        },
      },
    ],
    memoryEffects: [],
  });
  gamePlay.initialLesson.deck = [
    // 残りターン数12
    "shizukanaishi", // レッスンサポート2発動、使用
    "shizukanaishi2",
    "hinyarihitoyasumi",
    // 残りターン数11
    "tokutaimu",
    "usureyukukabe", // 使用3
    "aidorusengen", // 使用1
    "nemuke", // 「アイドル宣言」で引く分
    "shupurehikoru", //「アイドル宣言」で引く分、使用2
    // 残りターン数10
    "koruresuponsu",
    "shinkokyu",
    "hyojonokihon", // 「薄れゆく壁」の効果で強化、使用
    // 残りターン数9
    "miwakunoshisen", // レッスンサポート1発動、使用1
    "kokumintekiaidoru",
    "shikosakugo", // 「薄れゆく壁」の効果で強化、使用2
    // 残りターン数8
    "shinkokyu2", // 使用2
    "apirunokihon", // レッスンサポート1発動
    "sonzaikan", // 使用1
    // 残りターン数7
    "haitatchi",
    "hyogennokihon",
    "sutandopure", // 使用
    // 残りターン数6
    "haitatchi2", // レッスンサポート1発動
    "iji", // 使用
    "nemuke2",
    // 残りターン数5
    "hyogennokihon2",
    "daiseien", // 使用
    "hyojonokihon2", // レッスンサポート1発動
    // 残りターン数4
    "apirunokihon", // おそらくこれから山札再構築後、最初にスキルカード一覧を見てないので確認できない
    "haitatchi", // 使用、クリア達成
    "shinkokyu",
    // 残りターン数3
    "shinkokyu2",
    "hyojonokihon", // レッスンサポート1発動
    "kokumintekiaidoru", // 使用、その後ターンスキップ
    // 残りターン数2
    "haitatchi2", // 使用
    "nemuke",
    "tokutaimu",
    // 残りターン数1
    "koruresuponsu",
    "hinyarihitoyasumi",
    // 「静かな意志+」も引いていたが、追加するとレッスン開始時手札として移動してしまうので、追加しない
  ];

  // 残りターン数12
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 0, 2);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 12,
    vitality: 0,
    modifiers: [] as Modifier[],
    score: 0,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = endTurn(gamePlay);

  // 残りターン数11
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 10,
    vitality: 14,
    modifiers: [
      { name: "集中", representativeValue: 4 },
      { name: "好調", representativeValue: 3 },
    ],
    score: 0,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = playCard(gamePlay, 3);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数10
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 9,
    vitality: 12,
    modifiers: [
      { name: "集中", representativeValue: 2 },
      { name: "好調", representativeValue: 5 },
      { name: "発動予約", representativeValue: 1 },
    ],
    score: 12,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = endTurn(gamePlay);

  // 残りターン数9
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 0, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 9,
    vitality: 15,
    modifiers: [
      { name: "集中", representativeValue: 5 },
      { name: "好調", representativeValue: 4 },
    ],
    score: 12,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数8
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 1, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 9,
    vitality: 12,
    modifiers: [
      { name: "集中", representativeValue: 2 },
      { name: "好調", representativeValue: 3 },
      { name: "絶好調", representativeValue: 6 },
      { name: "消費体力減少", representativeValue: 5 },
    ],
    score: 58,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = endTurn(gamePlay);

  // 残りターン数7
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 9,
    vitality: 10,
    modifiers: [
      { name: "集中", representativeValue: 10 },
      { name: "好調", representativeValue: 4 },
      { name: "絶好調", representativeValue: 5 },
      { name: "消費体力減少", representativeValue: 4 },
    ],
    score: 58,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = endTurn(gamePlay);

  // 残りターン数6
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 0, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 9,
    vitality: 14,
    modifiers: [
      { name: "集中", representativeValue: 15 },
      { name: "好調", representativeValue: 3 },
      { name: "絶好調", representativeValue: 4 },
      { name: "消費体力減少", representativeValue: 3 },
      { name: "消費体力増加", representativeValue: 2 },
    ],
    score: 100,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数5
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 0, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 9,
    vitality: 15,
    modifiers: [
      { name: "集中", representativeValue: 25 },
      { name: "好調", representativeValue: 2 },
      { name: "絶好調", representativeValue: 3 },
      { name: "消費体力減少", representativeValue: 2 },
      { name: "消費体力増加", representativeValue: 1 },
    ],
    score: 100,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数4
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 9,
    vitality: 20,
    modifiers: [
      { name: "集中", representativeValue: 25 },
      { name: "好調", representativeValue: 5 },
      { name: "絶好調", representativeValue: 2 },
      { name: "消費体力減少", representativeValue: 1 },
    ],
    score: 100,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 1);
  gamePlay = endTurn(gamePlay);

  // 残りターン数3
  gamePlay = startTurn(gamePlay);
  gamePlay = addLessonSupport(gamePlay, 1, 1);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 9,
    vitality: 18,
    modifiers: [
      { name: "集中", representativeValue: 32 },
      { name: "好調", representativeValue: 4 },
      { name: "絶好調", representativeValue: 1 },
    ],
    score: 246,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 2);
  gamePlay = skipTurn(gamePlay);
  gamePlay = endTurn(gamePlay);

  // 残りターン数2
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 11,
    vitality: 26,
    modifiers: [
      { name: "集中", representativeValue: 32 },
      { name: "好調", representativeValue: 2 },
      { name: "スキルカード追加発動", representativeValue: 1 },
    ],
    score: 246,
  } as LessonDisplay);
  gamePlay = playCard(gamePlay, 0);
  gamePlay = endTurn(gamePlay);

  // 残りターン数1
  gamePlay = startTurn(gamePlay);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    life: 11,
    vitality: 22,
    modifiers: [
      { name: "集中", representativeValue: 32 },
      { name: "好調", representativeValue: 1 },
    ],
    score: 508,
  } as LessonDisplay);
  expect(isLessonEnded(gamePlay)).toBe(false);
  gamePlay = playCard(gamePlay, 0);
  expect(isLessonEnded(gamePlay)).toBe(true);
  expect(generateLessonDisplay(gamePlay)).toMatchObject({
    score: 600,
  } as LessonDisplay);
});
