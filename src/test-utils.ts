import type {
  Card,
  Lesson,
  GamePlay,
  LessonUpdateQuery,
  ProducerItem,
  GetRandom,
} from "./types";
import { type IdolDataId } from "./data/idols";
import { createLesson, getNextHistoryResultIndex, patchDiffs } from "./models";
import { createIdGenerator } from "./utils";

export const createLessonForTest = (
  options: {
    clearScoreThresholds?: Lesson["clearScoreThresholds"];
    cards?: Card[];
    idolDataId?: IdolDataId;
    producerItems?: ProducerItem[];
    turns?: Lesson["turns"];
  } = {},
): Lesson => {
  // R広は、Pアイテムが最終ターンにならないと発動しないので、テストデータとして優秀
  const idolDataId = options.idolDataId ?? "shinosawahiro-r-1";
  const turns = options.turns ?? ["vocal", "vocal", "vocal", "vocal", "vocal"];
  return createLesson({
    cards: options.cards ?? [],
    clearScoreThresholds: options.clearScoreThresholds,
    idGenerator: createIdGenerator(),
    idolDataId,
    producerItems: options.producerItems ?? [],
    turns,
  });
};

export const createGamePlayForTest = (
  options: Parameters<typeof createLessonForTest>[0] & {
    getRandom?: GetRandom;
  } = {},
): GamePlay => {
  return {
    getRandom: options.getRandom ?? (() => 0),
    idGenerator: createIdGenerator(),
    initialLesson: createLessonForTest(options),
    updates: [],
  };
};

/**
 * スキルカードへレッスンサポートの付与をする
 *
 * - 本体は未実装
 */
export const addLessonSupport = (
  gamePlay: GamePlay,
  index: number,
  count: number,
): GamePlay => {
  const lesson = patchDiffs(gamePlay.initialLesson, gamePlay.updates);
  const cardId = lesson.hand[index];
  if (cardId === undefined) {
    throw new Error(`Card not found: ${index}`);
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
