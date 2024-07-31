import type {
  Card,
  CardInProduction,
  Effect,
  Lesson,
  GamePlay,
  LessonUpdateQuery,
} from "./index";
import { getCardDataById } from "./data/cards";
import {
  endTurn,
  getNextHistoryResultIndex,
  isLessonEnded,
  isTurnEnded,
  patchDiffs,
  playCard,
  startTurn,
} from "./index";
import { activateEffect as activateEffect_ } from "./lesson-mutation";
import { createGamePlayForTest } from "./test-utils";

/**
 * スキルカードへレッスンサポートの付与をする、本体は仕様不明瞭なのもあり未実装
 */
const addLessonSupport = (
  gamePlay: GamePlay,
  cardId: Card["id"],
  count: number,
): GamePlay => {
  const update: LessonUpdateQuery = {
    kind: "cards.enhancement.lessonSupport",
    targets: [{ cardId, supportCardIds: new Array<{}>(count).fill({}) }],
    reason: {
      kind: "unknown",
      historyTurnNumber:
        gamePlay.updates[gamePlay.updates.length - 1].reason.historyTurnNumber,
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
  const diffs = activateEffect_(
    lesson,
    effect,
    gamePlay.getRandom,
    gamePlay.idGenerator,
  );
  const nextHistoryResultIndex = getNextHistoryResultIndex(gamePlay.updates);
  if (!diffs) {
    throw new Error("Effect not activated");
  }
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
describe("水着麻央のプレイ再現", () => {
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
