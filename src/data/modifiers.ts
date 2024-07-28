import { MetaModifierData, ModifierDefinition } from "../types";

export const metaModifierDictioanry = {
  additionalCardUsageCount: {
    kind: "additionalCardUsageCount",
    label: "スキルカード使用数追加",
    nonAggregation: false,
  },
  debuffProtection: {
    kind: "debuffProtection",
    label: "低下状態無効",
    nonAggregation: false,
  },
  delayedEffect: {
    kind: "delayedEffect",
    label: "発動予約",
    nonAggregation: true,
  },
  doubleEffect: {
    kind: "doubleEffect",
    label: "スキルカード追加発動",
    nonAggregation: true,
  },
  doubleLifeConsumption: {
    kind: "doubleLifeConsumption",
    label: "消費体力増加",
    nonAggregation: false,
  },
  excellentCondition: {
    kind: "excellentCondition",
    label: "絶好調",
    nonAggregation: false,
  },
  effectActivationOnTurnEnd: {
    kind: "effectActivationOnTurnEnd",
    // TODO: 本家では、状態修正の付与元のスキルカード名が表示される
    label: "ターン終了時持続効果",
    nonAggregation: true,
  },
  effectActivationBeforeCardEffectActivation: {
    kind: "effectActivationBeforeCardEffectActivation",
    // TODO: 本家では、状態修正の付与元のスキルカード名が表示される
    label: "スキルカード発動前持続効果",
    nonAggregation: true,
  },
  focus: {
    kind: "focus",
    label: "集中",
    nonAggregation: false,
  },
  goodCondition: {
    kind: "goodCondition",
    label: "好調",
    nonAggregation: false,
  },
  halfLifeConsumption: {
    kind: "halfLifeConsumption",
    label: "消費体力減少",
    nonAggregation: false,
  },
  lifeConsumptionReduction: {
    kind: "lifeConsumptionReduction",
    label: "消費体力削減",
    nonAggregation: false,
  },
  mightyPerformance: {
    kind: "mightyPerformance",
    label: "パラメータ上昇量増加",
    nonAggregation: false,
  },
  motivation: {
    kind: "motivation",
    label: "やる気",
    nonAggregation: false,
  },
  noVitalityIncrease: {
    kind: "noVitalityIncrease",
    label: "元気増加無効",
    nonAggregation: false,
  },
  positiveImpression: {
    kind: "positiveImpression",
    label: "好印象",
    nonAggregation: false,
  },
} as const satisfies Record<ModifierDefinition["kind"], MetaModifierData>;
