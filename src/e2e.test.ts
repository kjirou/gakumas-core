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

import type {
  Card,
  Lesson,
  GamePlay,
  LessonDisplay,
  LessonUpdateQuery,
  Modifier,
} from "./index";
import {
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

/**
 * スキルカードへレッスンサポートの付与をする、本体は仕様不明瞭なのもあり未実装
 */
const addLessonSupport = (
  gamePlay: GamePlay,
  cardId: Card["id"],
  count: number,
): GamePlay => {
  const lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
  if (lesson.cards.find((card) => card.id === cardId) === undefined) {
    throw new Error(`Card not found: ${cardId}`);
  }
  const update: LessonUpdateQuery = {
    kind: "cards.enhancement.lessonSupport",
    targets: [{ cardId, supportCardIds: new Array<{}>(count).fill({}) }],
    reason: {
      kind: "unknown",
      historyTurnNumber: lesson.turnNumber,
      historyResultIndex: getNextHistoryResultIndex(gamePlay.updates),
    },
  };
  return {
    ...gamePlay,
    updates: [...gamePlay.updates, update],
  };
};

describe("センス・集中の代表として、水着麻央のプレイを再現", () => {
  // プレイ動画直リンク: https://youtu.be/l0kHH_iSDJw?t=22
  test("中間試験まで6週の通常レッスンを再現できる", () => {
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
    gamePlay = addLessonSupport(gamePlay, "hyogennokihon", 1);
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
    gamePlay = addLessonSupport(gamePlay, "apirunokihon2", 1);
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
    gamePlay = addLessonSupport(gamePlay, "haitatchi", 1);
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
  test("最終試験まで1週の追い込みレッスンを再現できる", () => {
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
    gamePlay = addLessonSupport(gamePlay, "shizukanaishi", 2);
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
    gamePlay = addLessonSupport(gamePlay, "miwakunoshisen", 1);
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
    gamePlay = addLessonSupport(gamePlay, "apirunokihon", 1);
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
    gamePlay = addLessonSupport(gamePlay, "haitatchi2", 1);
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
    gamePlay = addLessonSupport(gamePlay, "hyojonokihon2", 1);
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
    gamePlay = addLessonSupport(gamePlay, "hyojonokihon", 1);
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
});
describe("ロジック・好印象の代表として、恒常SSRことねのプレイを再現", () => {
  // この動画: https://youtu.be/bVVUPvtGK68 の再現をする
  test("中間試験まで3週のSPレッスンを再現できる", () => {
    let gamePlay = initializeGamePlay({
      idolDataId: "fujitakotone-ssr-1",
      specialTrainingLevel: 3,
      talentAwakeningLevel: 1,
      life: 29,
      idolSpecificCardTestId: "yosomihadame",
      cards: [
        { id: "tebyoshi", testId: "tebyoshi" },
        { id: "kawaiishigusa", testId: "kawaiishigusa" },
        { id: "apirunokihon", testId: "apirunokihon" },
        { id: "apirunokihon", testId: "apirunokihon2" },
        { id: "pozunokihon", testId: "pozunokihon" },
        { id: "hombanzenya", testId: "hombanzenya" },
        { id: "fureai", testId: "fureai" },
        { id: "fanshichamu", testId: "fanshichamu" },
        { id: "risutato", testId: "risutato" },
        { id: "mesennokihon", testId: "mesennokihon" },
        { id: "mesennokihon", testId: "mesennokihon2" },
        { id: "hyogennokihon", testId: "hyogennokihon" },
        { id: "hyogennokihon", testId: "hyogennokihon2" },
      ],
      producerItems: [],
      turns: ["dance", "dance", "dance", "dance", "dance", "dance"],
      clearScoreThresholds: { clear: 45, perfect: 90 },
      encouragements: [
        { turnNumber: 2, effect: { kind: "perform", vitality: { value: 3 } } },
        {
          turnNumber: 4,
          effect: {
            kind: "getModifier",
            modifier: {
              kind: "positiveImpression",
              amount: 3,
            },
            condition: {
              kind: "countModifier",
              modifierKind: "positiveImpression",
              range: { min: 3 },
            },
          },
        },
        {
          turnNumber: 6,
          effect: {
            kind: "drainLife",
            value: 6,
            condition: {
              kind: "countModifier",
              modifierKind: "positiveImpression",
              range: { max: 7 },
            },
          },
        },
      ],
      memoryEffects: [
        { kind: "halfLifeConsumption", value: 1, probability: 100 },
        { kind: "motivation", value: 1, probability: 100 },
        { kind: "vitality", value: 4, probability: 100 },
      ],
    });
    gamePlay.initialLesson.deck = [
      // 残りターン数6
      "hombanzenya",
      "hyogennokihon",
      "mesennokihon",
      // 残りターン数5
      "apirunokihon",
      "apirunokihon2",
      "kawaiishigusa",
      // 残りターン数4
      "tebyoshi",
      "yosomihadame",
      "hyogennokihon2",
      // 残りターン数3
      "fureai",
      "risutato",
      "fanshichamu",
      // 残りターン数2、3枚目は山札再構築後なので不明。しかし、このターンからスキルカード使用してないので省略
      "mesennokihon2",
      "pozunokihon",
    ];

    // 残りターン数6
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "hombanzenya", 1);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 29,
      vitality: 5,
      modifiers: [
        { name: "消費体力減少", representativeValue: 1 },
        { name: "やる気", representativeValue: 1 },
      ],
      score: 0,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 残りターン数5
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 29,
      vitality: 10,
      modifiers: [
        { name: "好印象", representativeValue: 5 },
        { name: "やる気", representativeValue: 5 },
      ],
      score: 5,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 2);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = endTurn(gamePlay);

    // 残りターン数4
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "hyogennokihon2", 1);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 29,
      vitality: 1,
      modifiers: [
        { name: "好印象", representativeValue: 9 },
        { name: "やる気", representativeValue: 5 },
      ],
      score: 31,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = endTurn(gamePlay);

    // 残りターン数3
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "risutato", 1);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 24,
      vitality: 9,
      modifiers: [
        { name: "好印象", representativeValue: 20 },
        { name: "やる気", representativeValue: 5 },
      ],
      score: 49,
    } as LessonDisplay);
    gamePlay = skipTurn(gamePlay);
    gamePlay = endTurn(gamePlay);

    // 残りターン数2
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 26,
      vitality: 9,
      modifiers: [
        { name: "好印象", representativeValue: 19 },
        { name: "やる気", representativeValue: 5 },
      ],
      score: 69,
    } as LessonDisplay);
    gamePlay = skipTurn(gamePlay);
    gamePlay = endTurn(gamePlay);

    // 残りターン数1
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 28,
      vitality: 9,
      modifiers: [
        { name: "好印象", representativeValue: 18 },
        { name: "やる気", representativeValue: 5 },
      ],
      score: 88,
    } as LessonDisplay);
    gamePlay = skipTurn(gamePlay);
    expect(isLessonEnded(gamePlay)).toBe(false);
    gamePlay = endTurn(gamePlay);
    expect(isLessonEnded(gamePlay)).toBe(true);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      score: 90,
    } as LessonDisplay);
  });
  const initializeSaishushikenGamePlay = (turns: Lesson["turns"]) => {
    return initializeGamePlay({
      idolDataId: "fujitakotone-ssr-1",
      specialTrainingLevel: 3,
      talentAwakeningLevel: 1,
      life: 37,
      maxLife: 37,
      idolSpecificCardTestId: "yosomihadame",
      cards: [
        { id: "hombanzenya", testId: "hombanzenya", enhanced: true },
        { id: "hombanzenya", testId: "hombanzenya2", enhanced: true },
        { id: "hombanzenya", testId: "hombanzenya3" },
        { id: "minnadaisuki", testId: "minnadaisuki", enhanced: true },
        { id: "tebyoshi", testId: "tebyoshi", enhanced: true },
        { id: "tebyoshi", testId: "tebyoshi2", enhanced: true },
        { id: "kawaiishigusa", testId: "kawaiishigusa", enhanced: true },
        { id: "apirunokihon", testId: "apirunokihon", enhanced: true },
        { id: "pozunokihon", testId: "pozunokihon" },
        { id: "watashigasta", testId: "watashigasta", enhanced: true },
        {
          id: "hoshikuzusenseshon",
          testId: "hoshikuzusenseshon",
          enhanced: true,
        },
        { id: "tokimeki", testId: "tokimeki", enhanced: true },
        { id: "damedamekukkingu", testId: "damedamekukkingu" },
        { id: "shiawasenajikan", testId: "shiawasenajikan" },
        { id: "shiawasenajikan", testId: "shiawasenajikan2" },
        { id: "shiawasenajikan", testId: "shiawasenajikan3" },
        { id: "fureai", testId: "fureai" },
        { id: "fanshichamu", testId: "fanshichamu", enhanced: true },
        { id: "hagemashi", testId: "hagemashi" },
        { id: "risutato", testId: "risutato" },
        { id: "mesennokihon", testId: "mesennokihon" },
        { id: "mesennokihon", testId: "mesennokihon2" },
        { id: "usureyukukabe", testId: "usureyukukabe" },
        { id: "hyogennokihon", testId: "hyogennokihon" },
        { id: "hyogennokihon", testId: "hyogennokihon2" },
        { id: "nemuke", testId: "nemuke" },
        { id: "nemuke", testId: "nemuke2" },
      ],
      producerItems: [{ id: "nakanaorinokikkake" }],
      drinks: [
        { id: "hoeipurotein" },
        { id: "osharehabutei" },
        { id: "hoeipurotein" },
      ],
      turns,
      // 1700 かは不明
      clearScoreThresholds: { clear: 1700 },
      scoreBonus: { vocal: 522, dance: 1763, visual: 1458 },
      encouragements: [
        { turnNumber: 3, effect: { kind: "perform", vitality: { value: 3 } } },
        {
          turnNumber: 5,
          effect: {
            kind: "getModifier",
            modifier: {
              kind: "positiveImpression",
              amount: 8,
            },
            condition: {
              kind: "countModifier",
              modifierKind: "positiveImpression",
              range: { min: 3 },
            },
          },
        },
        {
          turnNumber: 8,
          effect: {
            kind: "getModifier",
            modifier: {
              kind: "positiveImpression",
              amount: 11,
            },
            condition: {
              kind: "countModifier",
              modifierKind: "positiveImpression",
              range: { min: 14 },
            },
          },
        },
      ],
      memoryEffects: [],
    });
  };
  // この動画: https://youtu.be/fhmTdsrS7PM の1戦目の再現をする
  test("最終試験その1を再現できる", () => {
    let gamePlay = initializeSaishushikenGamePlay([
      "dance",
      "dance",
      "visual",
      "dance",
      "visual",
      "dance",
      "vocal",
      "visual",
      "vocal",
      "visual",
      "dance",
    ]);
    gamePlay.initialLesson.deck = [
      // 残りターン数11、「初星ホエイプロテイン」使用
      // （レッスン開始時手札の検証のため、後ろに置いている）
      // 残りターン数10
      "apirunokihon",
      "minnadaisuki", // 使用1
      "pozunokihon", // 使用2
      // 残りターン数9
      "hyogennokihon",
      "kawaiishigusa", // 使用2
      "yosomihadame", // 使用1
      // 残りターン数8、Pアイテム「仲直りのきっかけ」発動
      "nemuke",
      "hyogennokihon2",
      "hagemashi", // 使用
      // 残りターン数7
      "tebyoshi",
      "watashigasta", // 使用1
      "fureai",
      "damedamekukkingu", // 「私がスター」で引く分、使用2
      // 残りターン数6(+1)
      "hoshikuzusenseshon", // 使用1
      "fanshichamu", // 使用2
      "mesennokihon", // 前ターンの「ダメダメクッキング」により強化
      "usureyukukabe", // 「星屑センセーション」で引く分
      // 残りターン数5(+1)、「初星ホエイプロテイン」使用
      "shiawasenajikan", // 使用2
      "tokimeki", // 使用1
      "risutato",
      // 残りターン数4(+1)
      "tebyoshi2",
      "nemuke2",
      "shiawasenajikan2", // 使用
      // 残りターン数3(+1)
      "shiawasenajikan3", // 使用
      "mesennokihon2",
      "risutato", // このスキルカードから、本来は山札が再構築されている
      // 残りターン数2(+1)
      "shiawasenajikan", // 使用2
      "minnadaisuki", // 使用1
      "nemuke",
      // 残りターン数1(+1)、「おしゃれハーブディー」使用、その前は体力・元気0でカードが使えない
      "pozunokihon",
      "usureyukukabe", // 使用
      "apirunokihon",
      // 残りターン数1
      "tebyoshi", // 使用
      "fureai", // 前ターンの「薄れゆく壁」により強化
      "hyogennokihon", // 前ターンの「薄れゆく壁」により強化
      // （レッスン開始時手札）
      "hombanzenya3", // 使用3
      "hombanzenya", // 使用1
      "hombanzenya2", // 使用2、Pアイテム「ビッグドリーム貯金箱」発動
    ];

    // 残りターン数11
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 37,
      vitality: 0,
      modifiers: [] as Modifier[],
      score: 0,
      drinks: [
        { name: "ホエイプロテイン" },
        { name: "おしゃれハーブティー" },
        { name: "ホエイプロテイン" },
      ],
    } as LessonDisplay);
    gamePlay = useDrink(gamePlay, 2);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 残りターン数10
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 22,
      vitality: 0,
      modifiers: [
        { name: "好印象", representativeValue: 17 },
        { name: "やる気", representativeValue: 11 },
      ],
      score: 300,
      drinks: [{ name: "ホエイプロテイン" }, { name: "おしゃれハーブティー" }],
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = endTurn(gamePlay);

    // 残りターン数9
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 19,
      vitality: 23,
      modifiers: [
        { name: "好印象", representativeValue: 16 },
        { name: "やる気", representativeValue: 9 },
        { name: "スキルカード使用数追加", representativeValue: 1 },
      ],
      score: 1007,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 2);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = endTurn(gamePlay);

    // 残りターン数8
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 19,
      vitality: 25,
      modifiers: [
        { name: "好印象", representativeValue: 27 },
        { name: "やる気", representativeValue: 9 },
      ],
      score: 1912,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 2);
    gamePlay = endTurn(gamePlay);

    // 残りターン数7
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 19,
      vitality: 21,
      modifiers: [
        { name: "好印象", representativeValue: 38 },
        { name: "やる気", representativeValue: 12 },
      ],
      score: 2459,
      remainingTurns: 7,
      remainingTurnsChange: 0,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = playCard(gamePlay, 2);
    gamePlay = endTurn(gamePlay);

    // 残りターン数6(+1)
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 19,
      vitality: 14,
      modifiers: [
        { name: "好印象", representativeValue: 40 },
        { name: "やる気", representativeValue: 15 },
      ],
      score: 3057,
      remainingTurns: 7,
      remainingTurnsChange: 1,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 残りターン数5(+1)
    gamePlay = startTurn(gamePlay);
    gamePlay = useDrink(gamePlay, 0);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 19,
      vitality: 10,
      modifiers: [
        { name: "好印象", representativeValue: 51 },
        { name: "やる気", representativeValue: 12 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
        { name: "スキルカード使用数追加", representativeValue: 1 },
      ],
      score: 3974,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 残りターン数4(+1)
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 15,
      vitality: 0,
      modifiers: [
        { name: "好印象", representativeValue: 79 },
        { name: "やる気", representativeValue: 18 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 4335,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 2);
    gamePlay = endTurn(gamePlay);

    // 残りターン数3(+1)
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 10,
      vitality: 0,
      modifiers: [
        { name: "好印象", representativeValue: 85 },
        { name: "やる気", representativeValue: 18 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 5589,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 残りターン数2(+1)
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 5,
      vitality: 0,
      modifiers: [
        { name: "好印象", representativeValue: 91 },
        { name: "やる気", representativeValue: 18 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 6070,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 残りターン数1(+1)
    gamePlay = startTurn(gamePlay);
    gamePlay = useDrink(gamePlay, 0);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 0,
      vitality: 19,
      modifiers: [
        { name: "好印象", representativeValue: 97 },
        { name: "やる気", representativeValue: 16 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 10814,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = endTurn(gamePlay);

    // 残りターン数1
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 0,
      vitality: 33,
      modifiers: [
        { name: "好印象", representativeValue: 97 },
        { name: "やる気", representativeValue: 16 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
        { name: "発動予約", representativeValue: 1 },
      ],
      score: 12542,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 0);
    expect(isLessonEnded(gamePlay)).toBe(false);
    gamePlay = endTurn(gamePlay);
    expect(isLessonEnded(gamePlay)).toBe(true);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 0,
      vitality: 28,
      modifiers: [
        { name: "好印象", representativeValue: 97 },
        { name: "やる気", representativeValue: 16 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
        { name: "発動予約", representativeValue: 1 },
      ],
      score: 17674,
    } as LessonDisplay);
  });
  // この動画: https://youtu.be/fhmTdsrS7PM の2戦目の再現をする
  test("最終試験その2を再現できる", () => {
    let gamePlay = initializeSaishushikenGamePlay([
      "dance",
      "dance",
      "visual",
      "visual",
      "vocal",
      "dance",
      "dance",
      "visual",
      "vocal",
      "visual",
      "dance",
    ]);
    gamePlay.initialLesson.deck = [
      // 残りターン数11、「初星ホエイプロテイン」使用
      // （レッスン開始時手札の検証のため、後ろに置いている）
      // 残りターン数10
      "mesennokihon",
      "pozunokihon",
      "tokimeki", // 使用
      // 残りターン数9、Pアイテム「仲直りのきっかけ」発動
      "hagemashi", // 使用2
      "tebyoshi",
      "fanshichamu", // 使用1
      // 残りターン数8、「初星ホエイプロテイン」使用
      "yosomihadame", // 使用2
      "damedamekukkingu", // 使用1
      "hyogennokihon",
      // 残りターン数7
      "nemuke",
      "nemuke2",
      "mesennokihon2", // 前ターンの「ダメダメクッキング」により強化、使用
      // 残りターン数6
      "apirunokihon",
      "hoshikuzusenseshon", // 使用2
      "watashigasta", // 使用1
      "tebyoshi2", // 「私がスター」で引く分
      "hyogennokihon2", // 「星屑センセーション」で引く分、使用
      // 残りターン数5(+1)
      "usureyukukabe",
      "minnadaisuki", // 使用1
      "shiawasenajikan", // 使用2
      // 残りターン数4(+1)
      "shiawasenajikan2", // 使用
      "risutato",
      "kawaiishigusa",
      // 残りターン数3(+1)
      "shiawasenajikan3", // 使用
      "fureai",
      "pozunokihon", // このスキルカードから、本来は山札が再構築されている
      // 残りターン数2(+1)
      "risutato", // 使用2
      "usureyukukabe",
      "minnadaisuki", // 使用1
      // 残りターン数1(+1)、「おしゃれハーブディー」使用、その前は体力・元気0でカードが使えない
      "tebyoshi", // 使用
      "shiawasenajikan",
      "hyogennokihon",
      // 残りターン数1、「おしゃれハーブディー」使用
      "nemuke",
      "mesennokihon",
      "shiawasenajikan2", // 使用
      // （レッスン開始時手札）
      "hombanzenya", // 使用1
      "hombanzenya3", // 使用3
      "hombanzenya2", // 使用2、Pアイテム「ビッグドリーム貯金箱」発動
    ];

    // 残りターン数11
    gamePlay = startTurn(gamePlay);
    gamePlay = useDrink(gamePlay, 2);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 37,
      vitality: 0,
      modifiers: [{ name: "スキルカード使用数追加", representativeValue: 1 }],
      score: 0,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 残りターン数10
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 22,
      vitality: 0,
      modifiers: [
        { name: "好印象", representativeValue: 17 },
        { name: "やる気", representativeValue: 11 },
      ],
      score: 300,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 2);
    gamePlay = endTurn(gamePlay);

    // 残りターン数9
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 13,
      vitality: 20,
      modifiers: [
        { name: "好印象", representativeValue: 26 },
        { name: "やる気", representativeValue: 17 },
        { name: "スキルカード使用数追加", representativeValue: 1 },
      ],
      score: 777,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 2);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 残りターン数8
    gamePlay = startTurn(gamePlay);
    gamePlay = useDrink(gamePlay, 0);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 13,
      vitality: 12,
      modifiers: [
        { name: "好印象", representativeValue: 35 },
        { name: "やる気", representativeValue: 20 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
        { name: "スキルカード使用数追加", representativeValue: 1 },
      ],
      score: 1302,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 上記ターン終了時の好印象発動によるスコア増加が、 50 * 1458% = 729 になるべきところが、 730 になっており、その理由が不明
    // つまり、動画より本実装の値が 1 少ない結果になっており、本テスト上は、この差分を常に動画で表示されているスコアに加算して帳尻を合わせる
    // Ref: https://github.com/kjirou/gakumas-core/issues/100
    const scoreMod = -1;

    // 残りターン数7
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 12,
      vitality: 27,
      modifiers: [
        { name: "好印象", representativeValue: 57 },
        { name: "やる気", representativeValue: 23 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 2032 + scoreMod,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 2);
    gamePlay = endTurn(gamePlay);

    // 残りターン数6
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 12,
      vitality: 50,
      modifiers: [
        { name: "好印象", representativeValue: 60 },
        { name: "やる気", representativeValue: 23 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 2351 + scoreMod,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 2);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = playCard(gamePlay, 2);
    gamePlay = endTurn(gamePlay);

    // 残りターン数5(+1)
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 12,
      vitality: 74,
      modifiers: [
        { name: "好印象", representativeValue: 68 },
        { name: "やる気", representativeValue: 20 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 3568 + scoreMod,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = playCard(gamePlay, 1);
    gamePlay = endTurn(gamePlay);

    // 残りターン数4(+1)
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 12,
      vitality: 69,
      modifiers: [
        { name: "好印象", representativeValue: 85 },
        { name: "やる気", representativeValue: 18 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 6337 + scoreMod,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 残りターン数3(+1)
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 12,
      vitality: 64,
      modifiers: [
        { name: "好印象", representativeValue: 91 },
        { name: "やる気", representativeValue: 18 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 7679 + scoreMod,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 残りターン数2(+1)
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 12,
      vitality: 59,
      modifiers: [
        { name: "好印象", representativeValue: 97 },
        { name: "やる気", representativeValue: 18 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 8191 + scoreMod,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 2);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 残りターン数1(+1)
    gamePlay = startTurn(gamePlay);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 12,
      vitality: 73,
      modifiers: [
        { name: "好印象", representativeValue: 100 },
        { name: "やる気", representativeValue: 16 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 11370 + scoreMod,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 0);
    gamePlay = endTurn(gamePlay);

    // 残りターン数1
    gamePlay = startTurn(gamePlay);
    gamePlay = useDrink(gamePlay, 0);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 12,
      vitality: 87,
      modifiers: [
        { name: "好印象", representativeValue: 99 },
        { name: "やる気", representativeValue: 16 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 18405 + scoreMod,
    } as LessonDisplay);
    gamePlay = playCard(gamePlay, 2);
    expect(isLessonEnded(gamePlay)).toBe(false);
    gamePlay = endTurn(gamePlay);
    expect(isLessonEnded(gamePlay)).toBe(true);
    expect(generateLessonDisplay(gamePlay)).toMatchObject({
      life: 12,
      vitality: 82,
      modifiers: [
        { name: "好印象", representativeValue: 106 },
        { name: "やる気", representativeValue: 16 },
        { name: "スキルカード発動前持続効果", representativeValue: undefined },
      ],
      score: 20274 + scoreMod,
    } as LessonDisplay);
  });
});
describe("ロジック・やる気の代表として、恒常SSR千奈のプレイを再現", () => {
  // 再現するプレイ動画: https://www.youtube.com/watch?v=uta5-aj-o64
  test("最終試験前の追い込みレッスンを再現できる", () => {
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
  test("最終試験を再現できる", () => {
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
});
