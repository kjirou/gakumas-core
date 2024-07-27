import type {
  ActionCost,
  Card,
  CardEnhancement,
  CardInProduction,
  Effect,
  Idol,
  Lesson,
  LessonGamePlay,
  LessonUpdateQuery,
  Modifier,
} from "./index";
import {
  createIdGenerator,
  createIdolInProduction,
  createLessonGamePlay,
  endLessonTurn,
  getCardContentDefinition,
  getHand,
  getModifiers,
  getNextHistoryResultIndex,
  isLessonEnded,
  isTurnEnded,
  patchUpdates,
  playCard,
  previewCardPlay,
  startLessonTurn,
} from "./index";
import { getCardDataById } from "./data/cards";
import {
  activateEffect as activateEffect_,
  calculateCostConsumption,
} from "./lesson-mutation";

describe("getModifiers", () => {
  const testCases: Array<{
    args: Parameters<typeof getModifiers>;
    expected: ReturnType<typeof getModifiers>;
    name: string;
  }> = [
    {
      name: "状態修正が存在する時、大体動く",
      args: [
        {
          initialLesson: {
            idol: {
              modifiers: [{ kind: "focus", amount: 1, id: "m1" }],
            },
          },
          updates: [] as LessonUpdateQuery[],
        } as LessonGamePlay,
      ],
      expected: [
        {
          id: "m1",
          kind: "focus",
          amount: 1,
          label: "集中",
          description: expect.any(String),
        },
      ],
    },
    {
      name: "状態修正が存在しない時、空配列を返す",
      args: [
        {
          initialLesson: {
            idol: {
              modifiers: [] as Modifier[],
            },
          },
          updates: [] as LessonUpdateQuery[],
        } as LessonGamePlay,
      ],
      expected: [],
    },
  ];
  test.each(testCases)("$name", ({ args, expected }) => {
    expect(getModifiers(...args)).toStrictEqual(expected);
  });
});

/**
 * スキルカードへレッスンサポートの付与をする、本体は仕様不明瞭なのもあり未実装
 */
const addLessonSupport = (
  gamePlay: LessonGamePlay,
  cardId: Card["id"],
  count: number,
): LessonGamePlay => {
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
  gamePlay: LessonGamePlay,
  effect: Effect,
  options: {} = {},
): LessonGamePlay => {
  const lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
      definition: getCardDataById("hinyarihitoyasumi"),
      enhanced: true,
      enabled: true,
    },
    {
      id: "haitatchi",
      definition: getCardDataById("haitatchi"),
      enhanced: false,
      enabled: true,
    },
    {
      id: "shikosakugo",
      definition: getCardDataById("shikosakugo"),
      enhanced: false,
      enabled: true,
    },
    {
      id: "apirunokihon",
      definition: getCardDataById("apirunokihon"),
      enhanced: true,
      enabled: true,
    },
    {
      id: "apirunokihon2",
      definition: getCardDataById("apirunokihon"),
      enhanced: false,
      enabled: true,
    },
    {
      id: "pozunokihon",
      definition: getCardDataById("pozunokihon"),
      enhanced: false,
      enabled: true,
    },
    {
      id: "hyojonokihon",
      definition: getCardDataById("hyojonokihon"),
      enhanced: true,
      enabled: true,
    },
    {
      id: "hyojonokihon2",
      definition: getCardDataById("hyojonokihon"),
      enhanced: false,
      enabled: true,
    },
    {
      id: "hyogennokihon",
      definition: getCardDataById("hyogennokihon"),
      enhanced: false,
      enabled: true,
    },
    {
      id: "hyogennokihon2",
      definition: getCardDataById("hyogennokihon"),
      enhanced: false,
      enabled: true,
    },
  ];
  /** 中間試験まで3週時点の山札 */
  const deckUntil3WeeksMidtermExam = [
    ...initialDeck,
    {
      id: "nemuke",
      definition: getCardDataById("nemuke"),
      enhanced: false,
      enabled: true,
    },
    {
      id: "shinkokyu",
      definition: getCardDataById("shinkokyu"),
      enhanced: true,
      enabled: true,
    },
    {
      id: "haitatchi2",
      definition: getCardDataById("haitatchi"),
      enhanced: false,
      enabled: true,
    },
    {
      id: "shinkokyu2",
      definition: getCardDataById("shinkokyu"),
      enhanced: false,
      enabled: true,
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
      definition: getCardDataById("iji"),
      enhanced: false,
      enabled: true,
    },
    {
      id: "usureyukukabe",
      definition: getCardDataById("usureyukukabe"),
      enhanced: false,
      enabled: true,
    },
  ];
  const createLessonGamePlayForTest = (params: {
    clearScoreThresholds: Lesson["clearScoreThresholds"];
    deck: CardInProduction[];
    turns: Lesson["turns"];
  }) => {
    const idGenerator = createIdGenerator();
    const idolInProduction = createIdolInProduction({
      deck: params.deck,
      idGenerator,
      idolDefinitionId: "arimuramao-ssr-2",
      specialTrainingLevel: 4,
      talentAwakeningLevel: 2,
    });
    return createLessonGamePlay({
      clearScoreThresholds: params.clearScoreThresholds,
      idGenerator,
      idolInProduction,
      turns: params.turns,
    });
  };
  test("中間試験まで6週のレッスンを再現できる", () => {
    let gamePlay = createLessonGamePlayForTest({
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
    let lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);

    //
    // 1ターン目
    //
    gamePlay = startLessonTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "hyogennokihon", 1);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    gamePlay = endLessonTurn(gamePlay);

    //
    // 2ターン目
    //
    gamePlay = startLessonTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "apirunokihon2", 1);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    gamePlay = endLessonTurn(gamePlay);

    //
    // 3ターン目
    //
    gamePlay = startLessonTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "haitatchi", 1);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    let gamePlay = createLessonGamePlayForTest({
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
    let lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
    gamePlay.initialLesson.memoryEffects = [
      { kind: "goodCondition", probability: 100, value: 2 },
    ];
    lesson.idol.life = 29;

    //
    // 1ターン目
    //
    gamePlay = startLessonTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "hyogennokihon", 1);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    gamePlay = endLessonTurn(gamePlay);

    //
    // 2ターン目
    //
    gamePlay = startLessonTurn(gamePlay);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    gamePlay = endLessonTurn(gamePlay);

    //
    // 3ターン目
    //
    gamePlay = startLessonTurn(gamePlay);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    gamePlay = endLessonTurn(gamePlay);

    //
    // 4ターン目
    //
    gamePlay = startLessonTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "hyojonokihon2", 1);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    gamePlay = endLessonTurn(gamePlay);

    //
    // 5ターン目
    //
    gamePlay = startLessonTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "shinkokyu2", 1);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    let gamePlay = createLessonGamePlayForTest({
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
    let lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    gamePlay = startLessonTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "hyogennokihon", 1);
    gamePlay = addLessonSupport(gamePlay, "iji", 1);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    gamePlay = endLessonTurn(gamePlay);

    //
    // 2ターン目
    //
    gamePlay = startLessonTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "haitatchi", 1);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    gamePlay = endLessonTurn(gamePlay);

    //
    // 3ターン目
    //
    gamePlay = startLessonTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "pozunokihon", 2);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    gamePlay = endLessonTurn(gamePlay);

    //
    // 4ターン目
    //
    gamePlay = startLessonTurn(gamePlay);
    gamePlay = addLessonSupport(gamePlay, "pozunokihon", 2);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    gamePlay = endLessonTurn(gamePlay);

    //
    // 5ターン目
    //
    gamePlay = startLessonTurn(gamePlay);
    lesson = patchUpdates(gamePlay.initialLesson, gamePlay.updates);
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
    gamePlay = endLessonTurn(gamePlay);

    // この後は山札が再構築されるので、プレイ再現が困難
  });
});
