import { MetaModifierData, ModifierData } from "../types";

export const metaModifierDictioanry = {
  additionalCardUsageCount: {
    kind: "additionalCardUsageCount",
    debuff: false,
    displayedRepresentativeValuePropertyName: "amount",
    label: "スキルカード使用数追加",
  },
  debuffProtection: {
    kind: "debuffProtection",
    debuff: false,
    displayedRepresentativeValuePropertyName: "times",
    label: "低下状態無効",
  },
  delayedEffect: {
    kind: "delayedEffect",
    debuff: false,
    /** 本家UIでは、アイコン横に"1回"と表示されている。ただし、現状発動予約効果に複数回発動がないので、本実装だと回数を設定してない。そのため固定値で1を出す。 */
    displayedRepresentativeValuePropertyName: "fixed1",
    label: "発動予約",
  },
  doubleEffect: {
    kind: "doubleEffect",
    debuff: false,
    /** 本家UIでは、アイコン横に"1"と表示されているのは確認済み。それが回数を示すのか「もう1回発動」なのかは不明。一見回数のようだが、合算されない状態修正なのでそこと不整合。 */
    displayedRepresentativeValuePropertyName: "fixed1",
    label: "スキルカード追加発動",
  },
  doubleLifeConsumption: {
    kind: "doubleLifeConsumption",
    debuff: true,
    displayedRepresentativeValuePropertyName: "duration",
    label: "消費体力増加",
  },
  excellentCondition: {
    kind: "excellentCondition",
    debuff: false,
    displayedRepresentativeValuePropertyName: "duration",
    label: "絶好調",
  },
  effectActivationOnTurnEnd: {
    kind: "effectActivationOnTurnEnd",
    debuff: false,
    displayedRepresentativeValuePropertyName: undefined,
    // TODO: 本家では、状態修正の付与元のスキルカード名が表示される
    label: "ターン終了時持続効果",
  },
  effectActivationBeforeCardEffectActivation: {
    kind: "effectActivationBeforeCardEffectActivation",
    debuff: false,
    displayedRepresentativeValuePropertyName: undefined,
    // TODO: 本家では、状態修正の付与元のスキルカード名が表示される
    label: "スキルカード発動前持続効果",
  },
  focus: {
    kind: "focus",
    debuff: false,
    displayedRepresentativeValuePropertyName: "amount",
    label: "集中",
  },
  goodCondition: {
    kind: "goodCondition",
    debuff: false,
    displayedRepresentativeValuePropertyName: "duration",
    label: "好調",
  },
  halfLifeConsumption: {
    kind: "halfLifeConsumption",
    debuff: false,
    displayedRepresentativeValuePropertyName: "duration",
    label: "消費体力減少",
  },
  lifeConsumptionReduction: {
    kind: "lifeConsumptionReduction",
    debuff: false,
    displayedRepresentativeValuePropertyName: "value",
    label: "消費体力削減",
  },
  mightyPerformance: {
    kind: "mightyPerformance",
    debuff: false,
    displayedRepresentativeValuePropertyName: "duration",
    label: "パラメータ上昇量増加",
  },
  motivation: {
    kind: "motivation",
    debuff: false,
    displayedRepresentativeValuePropertyName: "amount",
    label: "やる気",
  },
  noVitalityIncrease: {
    kind: "noVitalityIncrease",
    debuff: true,
    displayedRepresentativeValuePropertyName: "duration",
    label: "元気増加無効",
  },
  positiveImpression: {
    kind: "positiveImpression",
    debuff: false,
    displayedRepresentativeValuePropertyName: "amount",
    label: "好印象",
  },
} as const satisfies Record<ModifierData["kind"], MetaModifierData>;
