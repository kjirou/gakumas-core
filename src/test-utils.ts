import type {
  CardInProduction,
  IdolData,
  Lesson,
  LessonGamePlay,
  ProducerItemInProduction,
} from "./index";
import {
  createIdGenerator,
  createIdolInProduction,
  createLessonGamePlay,
} from "./index";

export const createLessonGamePlayForTest = (
  options: {
    clearScoreThresholds?: Lesson["clearScoreThresholds"];
    deck?: CardInProduction[];
    idolDataId?: IdolData["id"];
    producerItems?: ProducerItemInProduction[];
    specialTrainingLevel?: number | undefined;
    talentAwakeningLevel?: number | undefined;
    turns?: Lesson["turns"];
  } = {},
): LessonGamePlay => {
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
  return createLessonGamePlay({
    clearScoreThresholds,
    idGenerator,
    idolInProduction,
    turns,
  });
};
