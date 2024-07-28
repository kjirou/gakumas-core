import type { CardSetDefinition, ProducePlan } from "../types";

export const findCardSetDataById = (
  id: CardSetDefinition["id"],
): CardSetDefinition | undefined =>
  cardSets.find((cardSet) => cardSet.id === id);

export const getCardSetDataById = (
  id: CardSetDefinition["id"],
): CardSetDefinition => {
  const cardSet = findCardSetDataById(id);
  if (!cardSet) {
    throw new Error(`Card set not found: ${id}`);
  }
  return cardSet;
};

/** 初期スキルカードセットを返す */
export const getDefaultCardSetData = (
  proeducePlan: ProducePlan,
): CardSetDefinition => {
  if (proeducePlan.kind === "logic") {
    return proeducePlan.recommendedEffect === "motivation"
      ? getCardSetDataById("defaultLogicMotivation")
      : getCardSetDataById("defaultLogicPositiveImpression");
  } else {
    return proeducePlan.recommendedEffect === "focus"
      ? getCardSetDataById("defaultSenseFocus")
      : getCardSetDataById("defaultSenseGoodCondition");
  }
};

export const cardSets: CardSetDefinition[] = [
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
];
