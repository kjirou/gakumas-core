import { MetaModifierData, ModifierData } from "../types";

export const metaModifierDictioanry = {
  additionalCardUsageCount: {
    kind: "additionalCardUsageCount",
    displayedRepresentativeValuePropertyName: "amount",
    label: "スキルカード使用数追加",
    nonAggregation: false,
  },
  debuffProtection: {
    kind: "debuffProtection",
    displayedRepresentativeValuePropertyName: "times",
    label: "低下状態無効",
    nonAggregation: false,
  },
  delayedEffect: {
    kind: "delayedEffect",
    displayedRepresentativeValuePropertyName: "delay",
    label: "発動予約",
    nonAggregation: true,
  },
  doubleEffect: {
    kind: "doubleEffect",
    /** 本家UIで、アイコン横に"1"と表示されているのは確認済み。それが回数を示すのか「もう1回発動」なのかは不明。一見回数のようだが、合算されない状態修正なのでそこと不整合。 */
    displayedRepresentativeValuePropertyName: "times",
    label: "スキルカード追加発動",
    nonAggregation: true,
  },
  doubleLifeConsumption: {
    kind: "doubleLifeConsumption",
    displayedRepresentativeValuePropertyName: "duration",
    label: "消費体力増加",
    nonAggregation: false,
  },
  excellentCondition: {
    kind: "excellentCondition",
    displayedRepresentativeValuePropertyName: "duration",
    label: "絶好調",
    nonAggregation: false,
  },
  effectActivationOnTurnEnd: {
    kind: "effectActivationOnTurnEnd",
    displayedRepresentativeValuePropertyName: undefined,
    // TODO: 本家では、状態修正の付与元のスキルカード名が表示される
    label: "ターン終了時持続効果",
    nonAggregation: true,
  },
  effectActivationBeforeCardEffectActivation: {
    kind: "effectActivationBeforeCardEffectActivation",
    displayedRepresentativeValuePropertyName: undefined,
    // TODO: 本家では、状態修正の付与元のスキルカード名が表示される
    label: "スキルカード発動前持続効果",
    nonAggregation: true,
  },
  focus: {
    kind: "focus",
    displayedRepresentativeValuePropertyName: "amount",
    label: "集中",
    nonAggregation: false,
  },
  goodCondition: {
    kind: "goodCondition",
    displayedRepresentativeValuePropertyName: "duration",
    label: "好調",
    nonAggregation: false,
  },
  halfLifeConsumption: {
    kind: "halfLifeConsumption",
    displayedRepresentativeValuePropertyName: "duration",
    label: "消費体力減少",
    nonAggregation: false,
  },
  lifeConsumptionReduction: {
    kind: "lifeConsumptionReduction",
    displayedRepresentativeValuePropertyName: "value",
    label: "消費体力削減",
    nonAggregation: false,
  },
  mightyPerformance: {
    kind: "mightyPerformance",
    displayedRepresentativeValuePropertyName: "duration",
    label: "パラメータ上昇量増加",
    nonAggregation: false,
  },
  motivation: {
    kind: "motivation",
    displayedRepresentativeValuePropertyName: "amount",
    label: "やる気",
    nonAggregation: false,
  },
  noVitalityIncrease: {
    kind: "noVitalityIncrease",
    displayedRepresentativeValuePropertyName: "duration",
    label: "元気増加無効",
    nonAggregation: false,
  },
  positiveImpression: {
    kind: "positiveImpression",
    displayedRepresentativeValuePropertyName: "amount",
    label: "好印象",
    nonAggregation: false,
  },
} as const satisfies Record<ModifierData["kind"], MetaModifierData>;
