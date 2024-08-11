import type { CardSetData, ProducePlan } from "../types";

export const findCardSetDataById = (
  id: CardSetData["id"],
): CardSetData | undefined => cardSets.find((cardSet) => cardSet.id === id);

export const getCardSetDataById = (id: CardSetData["id"]): CardSetData => {
  const cardSet = findCardSetDataById(id);
  if (!cardSet) {
    throw new Error(`Card set not found: ${id}`);
  }
  return cardSet;
};

export const getCardSetDataByConstId = (id: CardSetDataId): CardSetData =>
  getCardSetDataById(id);

/** 初期スキルカードセットを返す */
export const getDefaultCardSetData = (
  proeducePlan: ProducePlan,
): CardSetData => {
  if (proeducePlan.kind === "logic") {
    return proeducePlan.recommendedModifierKind === "motivation"
      ? getCardSetDataById("defaultLogicMotivation")
      : getCardSetDataById("defaultLogicPositiveImpression");
  } else {
    return proeducePlan.recommendedModifierKind === "focus"
      ? getCardSetDataById("defaultSenseFocus")
      : getCardSetDataById("defaultSenseGoodCondition");
  }
};

const cardSetsAsConst = [
  {
    id: "defaultLogicMotivation",
    cardDataIds: [
      "apirunokihon",
      "apirunokihon",
      "hyogennokihon",
      "hyogennokihon",
      "ishikinokihon",
      "ishikinokihon",
      "kibuntenkan",
      "pozunokihon",
    ],
  },
  {
    id: "defaultLogicPositiveImpression",
    cardDataIds: [
      "apirunokihon",
      "apirunokihon",
      "hyogennokihon",
      "hyogennokihon",
      "kawaiishigusa",
      "mesennokihon",
      "mesennokihon",
      "pozunokihon",
    ],
  },
  {
    id: "defaultSenseFocus",
    cardDataIds: [
      "apirunokihon",
      "apirunokihon",
      "hyogennokihon",
      "hyogennokihon",
      "hyojonokihon",
      "hyojonokihon",
      "pozunokihon",
      "shikosakugo",
    ],
  },
  {
    id: "defaultSenseGoodCondition",
    cardDataIds: [
      "apirunokihon",
      "apirunokihon",
      "chosen",
      "furumainokihon",
      "furumainokihon",
      "hyogennokihon",
      "hyogennokihon",
      "pozunokihon",
    ],
  },
] as const satisfies CardSetData[];

export type CardSetDataId = (typeof cardSetsAsConst)[number]["id"];

export const cardSets: CardSetData[] = cardSetsAsConst;
