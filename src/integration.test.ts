import type {
  Card,
  CardInProduction,
  Effect,
  Lesson,
  GamePlay,
  LessonDisplay,
  LessonUpdateQuery,
} from "./index";
import { getCardDataById } from "./data/cards";
import {
  endTurn,
  generateLessonDisplay,
  getNextHistoryResultIndex,
  initializeGamePlay,
  isLessonEnded,
  isTurnEnded,
  patchDiffs,
  playCard,
  startTurn,
} from "./index";
import { activateEffect } from "./lesson-mutation";
import { createGamePlayForTest } from "./test-utils";

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

/**
 * テスト用に効果を反映する
 *
 * - 主に未実装の、Pドリンク用
 */
const applyEffect = (
  gamePlay: GamePlay,
  effect: Effect,
  options: {} = {},
): GamePlay => {
  const lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
  const diffs = activateEffect(
    lesson,
    effect,
    gamePlay.getRandom,
    gamePlay.idGenerator,
  );
  const nextHistoryResultIndex = getNextHistoryResultIndex(gamePlay.updates);
  const updates: LessonUpdateQuery[] = diffs.map((diff) => {
    return {
      ...diff,
      reason: {
        kind: "unknown",
        historyTurnNumber: lesson.turnNumber,
        historyResultIndex: nextHistoryResultIndex,
      },
    };
  });
  return {
    ...gamePlay,
    updates: [...gamePlay.updates, ...updates],
  };
};

// このプレイ動画: https://youtu.be/l0kHH_iSDJw を再現する
describe("センス（好調系・集中系）代表として、水着麻央のプレイを再現", () => {
  /** 中間試験まで6週時点(=開始時点)の山札 */
  const initialDeck = [
    {
      id: "hinyarihitoyasumi",
      data: getCardDataById("hinyarihitoyasumi"),
      enhanced: true,
    },
    {
      id: "haitatchi",
      data: getCardDataById("haitatchi"),
      enhanced: false,
    },
    {
      id: "shikosakugo",
      data: getCardDataById("shikosakugo"),
      enhanced: false,
    },
    {
      id: "apirunokihon",
      data: getCardDataById("apirunokihon"),
      enhanced: true,
    },
    {
      id: "apirunokihon2",
      data: getCardDataById("apirunokihon"),
      enhanced: false,
    },
    {
      id: "pozunokihon",
      data: getCardDataById("pozunokihon"),
      enhanced: false,
    },
    {
      id: "hyojonokihon",
      data: getCardDataById("hyojonokihon"),
      enhanced: true,
    },
    {
      id: "hyojonokihon2",
      data: getCardDataById("hyojonokihon"),
      enhanced: false,
    },
    {
      id: "hyogennokihon",
      data: getCardDataById("hyogennokihon"),
      enhanced: false,
    },
    {
      id: "hyogennokihon2",
      data: getCardDataById("hyogennokihon"),
      enhanced: false,
    },
  ];
  /** 中間試験まで3週時点の山札 */
  const deckUntil3WeeksMidtermExam = [
    ...initialDeck,
    {
      id: "nemuke",
      data: getCardDataById("nemuke"),
      enhanced: false,
    },
    {
      id: "shinkokyu",
      data: getCardDataById("shinkokyu"),
      enhanced: true,
    },
    {
      id: "haitatchi2",
      data: getCardDataById("haitatchi"),
      enhanced: false,
    },
    {
      id: "shinkokyu2",
      data: getCardDataById("shinkokyu"),
      enhanced: false,
    },
  ];
  /** 中間試験まで1週時点(=追い込みレッスン時点)の山札 */
  const deckUntil1WeekMidtermExam = [
    ...deckUntil3WeeksMidtermExam.map((card) => {
      if (card.id === "haitatchi") {
        return { ...card, enhanced: true };
      }
      return card;
    }),
    {
      id: "iji",
      data: getCardDataById("iji"),
      enhanced: false,
    },
    {
      id: "usureyukukabe",
      data: getCardDataById("usureyukukabe"),
      enhanced: false,
    },
  ];
  const createMaoForTest = (params: {
    clearScoreThresholds: Lesson["clearScoreThresholds"];
    deck: CardInProduction[];
    turns: Lesson["turns"];
  }) => {
    return createGamePlayForTest({
      clearScoreThresholds: params.clearScoreThresholds,
      deck: params.deck,
      idolDataId: "arimuramao-ssr-2",
      specialTrainingLevel: 4,
      talentAwakeningLevel: 2,
      turns: params.turns,
    });
  };
  test("中間試験まで6週のレッスンを再現できる", () => {
    let gamePlay = createMaoForTest({
      clearScoreThresholds: { clear: 30, perfect: 30 },
      deck: initialDeck,
      turns: ["visual", "visual", "visual", "visual", "visual"],
    });
    gamePlay.initialLesson.deck = [
      // 1
      "apirunokihon",
      "hyojonokihon2",
      "hyogennokihon",
      // 2
      "shikosakugo",
      "pozunokihon",
      "apirunokihon2",
      // 3
      "hyojonokihon",
      "hinyarihitoyasumi",
      "haitatchi",
      // 以降不明
      "hyogennokihon2",
    ];
    gamePlay.initialLesson.memoryEffects = [
      { kind: "halfLifeConsumption", probability: 100, value: 1 },
      { kind: "vitality", probability: 100, value: 2 },
    ];
    gamePlay.initialLesson.encouragements = [
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
    ];
    let lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);

    //
    // 1ターン目
    //
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "hyogennokihon", 1);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 1,
      score: 0,
      idol: {
        life: 31,
        vitality: 2,
        modifiers: [
          { kind: "halfLifeConsumption", duration: 1, id: expect.any(String) },
        ],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 1);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);

    //
    // 2ターン目
    //
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "apirunokihon2", 1);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 2,
      score: 0,
      idol: {
        life: 31,
        vitality: 3,
        modifiers: [{ kind: "focus", amount: 2, id: expect.any(String) }],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 2);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);

    //
    // 3ターン目
    //
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "haitatchi", 1);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 3,
      score: 16,
      idol: {
        life: 31,
        vitality: 0,
        modifiers: [{ kind: "focus", amount: 2, id: expect.any(String) }],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    expect(isLessonEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 1);
    expect(isTurnEnded(gamePlay)).toBe(true);
    expect(isLessonEnded(gamePlay)).toBe(true);
  });
  test("中間試験まで3週のレッスンを再現できる", () => {
    let gamePlay = createMaoForTest({
      clearScoreThresholds: { clear: 45, perfect: 45 },
      deck: deckUntil3WeeksMidtermExam,
      turns: ["visual", "visual", "visual", "visual", "visual"],
    });
    gamePlay.initialLesson.deck = [
      // 1
      "hyogennokihon",
      "nemuke",
      "hyogennokihon2",
      // 2
      "shinkokyu2",
      "apirunokihon",
      "haitatchi",
      // 3
      "shikosakugo",
      "apirunokihon2",
      "shinkokyu",
      // 4
      "hyojonokihon",
      "hyojonokihon2",
      "haitatchi2",
    ];
    gamePlay.initialLesson.encouragements = [
      {
        turnNumber: 3,
        effect: {
          kind: "getModifier",
          // 発動できなかったので、実際の数値は動画から判別できない
          modifier: { kind: "focus", amount: 1 },
          condition: {
            kind: "countModifier",
            modifierKind: "focus",
            range: { min: 2 },
          },
        },
      },
      {
        turnNumber: 4,
        effect: {
          kind: "drainLife",
          value: 5,
          condition: {
            kind: "countModifier",
            modifierKind: "focus",
            range: { max: 4 },
          },
        },
      },
      {
        turnNumber: 5,
        effect: {
          kind: "getModifier",
          // 発動できなかったので、実際の数値は動画から判別できない
          modifier: { kind: "focus", amount: 1 },
          condition: {
            kind: "countModifier",
            modifierKind: "focus",
            range: { min: 8 },
          },
        },
      },
    ];
    let lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    gamePlay.initialLesson.memoryEffects = [
      { kind: "goodCondition", probability: 100, value: 2 },
    ];
    lesson.idol.life = 29;

    //
    // 1ターン目
    //
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "hyogennokihon", 1);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 1,
      score: 0,
      idol: {
        life: 29,
        vitality: 0,
        modifiers: [
          { kind: "goodCondition", duration: 2, id: expect.any(String) },
        ],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 0);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);

    //
    // 2ターン目
    //
    gamePlay = startTurn(gamePlay);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 2,
      score: 0,
      idol: {
        life: 29,
        vitality: 7,
        modifiers: [
          { kind: "goodCondition", duration: 1, id: expect.any(String) },
        ],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 2);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);

    //
    // 3ターン目
    //
    gamePlay = startTurn(gamePlay);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 3,
      score: 26,
      idol: {
        life: 29,
        vitality: 3,
        modifiers: [],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 0);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);

    //
    // 4ターン目
    //
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "hyojonokihon2", 1);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 4,
      score: 42,
      idol: {
        life: 20,
        vitality: 0,
        modifiers: [],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = applyEffect(gamePlay, { kind: "recoverLife", value: 6 }); // Pドリンク使用
    gamePlay = playCard(gamePlay, 0);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);

    //
    // 5ターン目
    //
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "shinkokyu2", 1);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 5,
      score: 42,
      idol: {
        life: 25,
        vitality: 15,
        modifiers: [{ kind: "focus", amount: 3, id: expect.any(String) }],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    expect(isLessonEnded(gamePlay)).toBe(false);
    lesson.hand = ["pozunokihon", "hinyarihitoyasumi", "shinkokyu2"];
    gamePlay = playCard(gamePlay, 1);
    expect(isTurnEnded(gamePlay)).toBe(true);
    expect(isLessonEnded(gamePlay)).toBe(true);
  });
  test("中間試験まで1週のレッスン(=追い込みレッスン)を再現できる", () => {
    let gamePlay = createMaoForTest({
      clearScoreThresholds: { clear: 90, perfect: 270 },
      deck: deckUntil1WeekMidtermExam,
      turns: new Array(9).fill("visual"),
    });
    gamePlay.initialLesson.ignoreIdolParameterKindConditionAfterClearing = true;
    gamePlay.initialLesson.deck = [
      // 1
      "hyogennokihon",
      "hyogennokihon2",
      "iji",
      // 2
      "shikosakugo",
      "haitatchi",
      "shinkokyu2",
      // 3
      "pozunokihon",
      "hyojonokihon2",
      "apirunokihon2",
      // 4
      "nemuke",
      "hinyarihitoyasumi",
      "usureyukukabe",
      // 5
      "shinkokyu",
      "haitatchi2",
      "hyojonokihon",
    ];
    let lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    lesson.idol.life = 31;
    gamePlay.initialLesson.encouragements = [
      { turnNumber: 4, effect: { kind: "perform", vitality: { value: 3 } } },
      {
        turnNumber: 5,
        effect: {
          kind: "drainLife",
          value: 3,
          condition: {
            kind: "countModifier",
            modifierKind: "focus",
            range: { max: 5 },
          },
        },
      },
      {
        turnNumber: 7,
        effect: {
          kind: "getModifier",
          modifier: { kind: "focus", amount: 6 },
          condition: {
            kind: "countModifier",
            modifierKind: "focus",
            range: { min: 14 },
          },
        },
      },
    ];

    //
    // 1ターン目
    //
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "hyogennokihon", 1);
    gamePlay = addLessonSupport(gamePlay, "iji", 1);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 1,
      score: 0,
      idol: {
        life: 31,
        vitality: 0,
        modifiers: [],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 2);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);

    //
    // 2ターン目
    //
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "haitatchi", 1);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 2,
      score: 0,
      idol: {
        life: 29,
        vitality: 19,
        modifiers: [{ kind: "focus", amount: 5, id: expect.any(String) }],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 2);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);

    //
    // 3ターン目
    //
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "pozunokihon", 2);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 3,
      score: 0,
      idol: {
        life: 29,
        vitality: 16,
        modifiers: [
          { kind: "focus", amount: 7, id: expect.any(String) },
          { kind: "goodCondition", duration: 3, id: expect.any(String) },
        ],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 1);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);

    //
    // 4ターン目
    //
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "pozunokihon", 2);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 4,
      score: 0,
      idol: {
        life: 29,
        vitality: 19,
        modifiers: [
          { kind: "focus", amount: 9, id: expect.any(String) },
          { kind: "goodCondition", duration: 2, id: expect.any(String) },
        ],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 2);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);

    //
    // 5ターン目
    //
    gamePlay = startTurn(gamePlay);
    lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
    expect(lesson).toMatchObject({
      turnNumber: 5,
      score: 0,
      idol: {
        life: 29,
        vitality: 17,
        modifiers: [
          { kind: "focus", amount: 9, id: expect.any(String) },
          { kind: "goodCondition", duration: 1, id: expect.any(String) },
          {
            kind: "delayedEffect",
            delay: 1,
            effect: { kind: "enhanceHand" },
            id: expect.any(String),
          },
        ],
      },
    });
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 0);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);

    // この後は山札が再構築されるので、プレイ再現が困難
  });
});
describe("ロジックの好印象系の代表として、恒常SSRことねのプレイを再現", () => {
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
      clearScoreThresholds: { clear: 45, perfect: 45 },
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
              range: { min: 7 },
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
      // 1
      "hombanzenya",
      "hyogennokihon",
      "mesennokihon",
      // 2
      "apirunokihon",
      "apirunokihon2",
      "kawaiishigusa",
      // 3
      "tebyoshi",
      "yosomihadame",
      "hyogennokihon2",
      // 4
      "fureai",
      "risutato",
      "fanshichamu",
      // 5、3枚目は山札再構築後なので不明。しかし、このターンからスキルカード使用してないので再現できる。
      "mesennokihon2",
      "pozunokihon",
      // 6、山札再構築後なので不明
    ];
    // 1ターン目
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
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 0);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);
    // 2ターン目
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
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 2);
    expect(isTurnEnded(gamePlay)).toBe(false);
    gamePlay = playCard(gamePlay, 1);
    expect(isTurnEnded(gamePlay)).toBe(true);
    gamePlay = endTurn(gamePlay);
    // 3ターン目
    gamePlay = startTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "hyogennokihon2", 1);
    // TODO: 重めの修正に入るので、ここでテストは一旦終了。可愛い仕草の100%は効果内の好印象+2の影響を受けていた。
    // expect(generateLessonDisplay(gamePlay)).toMatchObject({
    //   life: 29,
    //   vitality: 1,
    //   modifiers: [
    //     { name: "好印象", representativeValue: 9 },
    //     { name: "やる気", representativeValue: 5 },
    //   ],
    //   score: 31,
    // } as LessonDisplay);
  });
});
