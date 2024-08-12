import type {
  Card,
  CardInProduction,
  Lesson,
  GamePlay,
  LessonUpdateQuery,
  ProducerItemInProduction,
} from "./types";
import { type IdolDataId } from "./data/idols";
import {
  createIdolInProduction,
  createGamePlay,
  getNextHistoryResultIndex,
  patchDiffs,
} from "./models";
import { createIdGenerator } from "./utils";

export const createGamePlayForTest = (
  options: {
    clearScoreThresholds?: Lesson["clearScoreThresholds"];
    deck?: CardInProduction[];
    idolDataId?: IdolDataId;
    producerItems?: ProducerItemInProduction[];
    specialTrainingLevel?: number | undefined;
    talentAwakeningLevel?: number | undefined;
    turns?: Lesson["turns"];
  } = {},
): GamePlay => {
  const clearScoreThresholds = options.clearScoreThresholds;
  // R広は、Pアイテムが最終ターンにならないと発動しないので、テストデータとして優秀
  const idolDataId = options.idolDataId ?? "shinosawahiro-r-1";
  const turns = options.turns ?? ["vocal", "vocal", "vocal", "vocal", "vocal"];
  const specialTrainingLevel = options.specialTrainingLevel ?? 1;
  const talentAwakeningLevel = options.talentAwakeningLevel ?? 1;
  const idGenerator = createIdGenerator();
  const idolInProduction = createIdolInProduction({
    idGenerator,
    idolDataId,
    specialTrainingLevel,
    talentAwakeningLevel,
    ...(options.deck ? { deck: options.deck } : {}),
    ...(options.producerItems ? { producerItems: options.producerItems } : {}),
  });
  return createGamePlay({
    clearScoreThresholds,
    idGenerator,
    idolInProduction,
    turns,
  });
};

export const createLessonForTest = (
  options: Parameters<typeof createGamePlayForTest>[0] = {},
): Lesson => {
  const gamePlay = createGamePlayForTest(options);
  return gamePlay.initialLesson;
};

/**
 * スキルカードへレッスンサポートの付与をする
 *
 * - 本体は未実装
 */
export const addLessonSupport = (
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
