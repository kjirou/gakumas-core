/**
 * テキスト生成モジュール
 *
 * - スキルカードやPアイテムの効果説明欄のテキストなどを動的に生成する
 *   - 基本的には、P図鑑の表記を参考にしている
 * - データとして定義する手段もあると思うが、少なくとも以下の点で動的な生成処理が必要になる
 *   - スキルカード使用プレビューでは、強化段階による効果の変化を反映する必要がある、また「レッスン中」という文言が「試験・ステージ中」へ変化する
 * - もし、多言語対応をするなら、このモジュール全体を言語別に作る必要がありそう
 * - TODO: 「レッスン中」を「試験・ステージ中」へ変化できるようにする
 */

import type {
  ActionCost,
  CardData,
  CardContentData,
  CardUsageCondition,
  Effect,
  EffectCondition,
  IdolParameterKind,
  ModifierData,
  ProducerItemContentData,
  RangedNumber,
  VitalityUpdateQuery,
  DrinkData,
  EffectWithoutCondition,
  ProducerItemData,
  MeasureValueConditionContent,
  ReactiveEffectTrigger,
} from "./types";
import { getCardDataByConstId } from "./data/cards";
import { metaModifierDictioanry } from "./data/modifiers";

/**
 * コストの後に配置する悪い効果かを判定する
 *
 * - Ver. 1.2.4 頃に追加された、Pドリンクの「特製ハツボシエキス」の効果説明は以下だった
 *   次に使用するアクティブスキルカードの効果をもう1回発動（1回・1ターン）
 *   体力消費2
 *   消費体力増加1ターン
 * - 上記テキストを分類すると、以下のようになり、コストの位置が効果リストの間に挟まる形だったのが本家仕様だった
 *   {効果1}
 *   {コスト}
 *   {効果2}
 * - スキルカードの効果説明欄は、コストは先頭に配置されているので、この仕様は無関係
 * - 本実装では、コストが最後に来るのだと推測していた
 *   - なお、処理上、コストは効果リストとは別枠の動きをしているので、少なくとも本実装では、効果の一つとしては分類しない
 *     - 例えば、通常は効果リストは先頭から後の効果に影響を与えるが、「消費体力減少」の後に「体力消費」が書いてあっても半分にはならない
 * - コストの後の効果は、悪い効果的なものを置いているようなので、本実装ではテキスト用に効果の良悪を分けて、コスト前後に効果テキストを出し分けることにした
 * - なお、Pアイテムも同様の仕様の可能性が高いが、上記ケースの効果がないので不明。本実装では一旦考慮しない。
 *   - スキルカードは、コストが先頭に配置されるので、別仕様だと思われる
 */
const isBadEffect = (effect: EffectWithoutCondition): boolean => {
  return (
    effect.kind === "getModifier" &&
    effect.modifier.kind === "doubleLifeConsumption"
  );
};

/**
 * 汎用的な数値範囲テキストを生成する
 *
 * - この後に、「の場合、」が続く想定
 * - 現状、本家に存在するのは、「n」と「n以上」のみである
 */
const generateRangedNumberText = (range: RangedNumber): string => {
  if ("min" in range && "max" in range) {
    if (range.min === range.max) {
      return `${range.min}`;
    }
    return `${range.min}以上${range.max}以下`;
  } else if ("min" in range && !("max" in range)) {
    return `${range.min}以上`;
  } else if (!("min" in range) && "max" in range) {
    return `${range.max}以下`;
  }
  throw new Error("Unreachable statement");
};

/**
 * パラメータ種別の表示名
 */
export const idolParameterKindNames = {
  dance: "ダンス",
  visual: "ビジュアル",
  vocal: "ボーカル",
} as const satisfies Record<IdolParameterKind, string>;

/**
 * ゲーム全体を通じてキーワード化されている名称
 *
 * - 本家の各種テキスト内で、タップ可能なキーワードになるもの
 *   - 大体はアイコン付きでもあるが、「レッスン中1回」「重複無効」「眠気」などはアイコンが無い
 * - スキルカードの効果説明欄・レッスン中の状態修正一覧・レッスン中の履歴、で同じ表記になる
 * - キーワード化されていそうで無いものも多い
 *   - 例えば、「国民的アイドル」の「次に使用するスキルカードの効果をもう1回発動（1回）」など
 * - 現状、キーの大半は Modifier["kind"] や Effect["kind"] のプロパティ名で構成されているが、それらとの紐付けは守れないので情報として使わないこと
 *   - 1状態修正や1効果の中に複数のキーワードが含まれることも有り得る、また逆に、1キーワードが複数の状態修正や効果に含まれることも有り得る
 */
const globalKeywords = {
  additionalCardUsageCount:
    metaModifierDictioanry.additionalCardUsageCount.label,
  activeSkillCard: "アクティブスキルカード",
  debuffProtection: metaModifierDictioanry.debuffProtection.label,
  delayedEffect: metaModifierDictioanry.delayedEffect.label,
  doubleEffect: metaModifierDictioanry.doubleEffect.label,
  doubleLifeConsumption: metaModifierDictioanry.doubleLifeConsumption.label,
  drainMotivationModifier: "やる気減少",
  enhanceHand: "レッスン中強化",
  excellentCondition: metaModifierDictioanry.excellentCondition.label,
  fixedValueVitality: "固定元気",
  focus: metaModifierDictioanry.focus.label,
  generateCard: "生成",
  goodCondition: metaModifierDictioanry.goodCondition.label,
  halfLifeConsumption: metaModifierDictioanry.halfLifeConsumption.label,
  increaseRemainingTurns: "ターン追加",
  lifeConsumption: "体力消費",
  lifeConsumptionReduction:
    metaModifierDictioanry.lifeConsumptionReduction.label,
  mentalSkillCard: "メンタルスキルカード",
  mightyPerformance: metaModifierDictioanry.mightyPerformance.label,
  motivation: metaModifierDictioanry.motivation.label,
  noVitalityIncrease: metaModifierDictioanry.noVitalityIncrease.label,
  nonDuplicative: "重複不可",
  positiveImpression: metaModifierDictioanry.positiveImpression.label,
  usableOncePerLesson: "レッスン中1回",
  vitality: "元気",
} as const satisfies Record<string, string>;

const kwd = (key: keyof typeof globalKeywords) => {
  return `{{${globalKeywords[key]}}}`;
};

/** globalKeywords と同じ趣旨で、データ由来のキーワードを分けたもの */
export const globalDataKeywords = {
  cards: {
    adorenarinzenkai: getCardDataByConstId("adorenarinzenkai").name,
    hajimetenogohobi: getCardDataByConstId("hajimetenogohobi").name,
    nemuke: getCardDataByConstId("nemuke").name,
  },
} as const satisfies Record<string, Record<string, string>>;

type KeywordCardDataId = keyof typeof globalDataKeywords.cards;

const isKeywordCardDataIdType = (idLike: string): idLike is KeywordCardDataId =>
  idLike in globalDataKeywords.cards;

const cardKwd = (key: string): string => {
  if (isKeywordCardDataIdType(key)) {
    return `{{${globalDataKeywords.cards[key]}}}`;
  }
  throw new Error(`Global data keyword not found: ${key}`);
};

/**
 * スキルカード名を生成する
 */
export const generateCardName = (
  name: CardData["name"],
  enhancementCount: number,
): string => name + "+".repeat(enhancementCount);

export const generateReactiveEffectTriggerText = (
  trigger: ReactiveEffectTrigger,
): string => {
  let idolParameterKindText = "";
  switch (trigger.idolParameterKind) {
    case "vocal":
      idolParameterKindText = "【ボイスレッスン・ボイスターンのみ】";
      break;
    case "dance":
      idolParameterKindText = "【ダンスレッスン・ダンスターンのみ】";
      break;
    case "visual":
      idolParameterKindText = "【ビジュアルレッスン・ビジュアルターンのみ】";
      break;
  }
  switch (trigger.kind) {
    case "afterCardEffectActivation":
    case "beforeCardEffectActivation": {
      let effectKindText = "";
      if (
        trigger.kind === "afterCardEffectActivation" &&
        trigger.effectKind !== undefined
      ) {
        switch (trigger.effectKind) {
          case "vitality": {
            effectKindText = kwd("vitality");
            break;
          }
          case "positiveImpression": {
            effectKindText = kwd("positiveImpression");
            break;
          }
          default: {
            const unreachable: never = trigger.effectKind;
            throw new Error(`Unreachable statement`);
          }
        }
        effectKindText += "効果の";
      }
      return [
        idolParameterKindText,
        effectKindText,
        trigger.cardDataId !== undefined
          ? cardKwd(trigger.cardDataId)
          : trigger.cardSummaryKind === "active"
            ? kwd("activeSkillCard")
            : trigger.cardSummaryKind === "mental"
              ? kwd("mentalSkillCard")
              : "スキルカード",
        `使用${trigger.kind === "beforeCardEffectActivation" ? "時" : "後"}`,
      ].join("");
    }
    case "beforeCardEffectActivationEveryNTimes": {
      return [
        idolParameterKindText,
        trigger.cardSummaryKind === "active"
          ? kwd("activeSkillCard")
          : trigger.cardSummaryKind === "mental"
            ? kwd("mentalSkillCard")
            : "スキルカード",
        `を${trigger.interval}回使用するごとに`,
      ].join("");
    }
    case "modifierIncrease": {
      return [
        idolParameterKindText,
        generateModifierKindText(trigger.modifierKind),
        trigger.modifierKind === "goodCondition" ? "の効果ターン" : "",
        "が増加後",
      ].join("");
    }
    case "lessonStart": {
      return idolParameterKindText + "レッスン開始時";
    }
    case "lifeDecrease": {
      return idolParameterKindText + "レッスン中に体力が減少した時";
    }
    case "turnEnd": {
      return idolParameterKindText + "ターン終了時";
    }
    case "turnStart": {
      return idolParameterKindText + "ターン開始時";
    }
    case "turnStartEveryNTurns": {
      return `${idolParameterKindText}${trigger.interval}ターンごとに`;
    }
    default: {
      const unreachable: never = trigger;
      throw new Error(`Unreachable statement`);
    }
  }
};

/**
 * 状態修正種別のみからキーワードを生成する
 *
 * - 基本的にこの関数を通す必要はない
 * - ModifierやEffectの単位よりさらに細かく生成したい場合に使う
 */
const generateModifierKindText = (
  modifierKind:
    | "focus"
    | "goodCondition"
    | "halfLifeConsumption"
    | "motivation"
    | "positiveImpression",
): string => {
  switch (modifierKind) {
    case "focus":
      return kwd("focus");
    case "goodCondition":
      return kwd("goodCondition");
    case "halfLifeConsumption":
      return kwd("halfLifeConsumption");
    case "motivation":
      return kwd("motivation");
    case "positiveImpression":
      return kwd("positiveImpression");
    default:
      const unreachable: never = modifierKind;
      throw new Error(`Unreachable statement`);
  }
};

/**
 * 一つの状態修正を表現したテキストを生成する
 */
const generateModifierText = (modifier: ModifierData): string => {
  switch (modifier.kind) {
    case "additionalCardUsageCount":
      return `${kwd("additionalCardUsageCount")}+${modifier.amount}`;
    case "debuffProtection":
      return `${kwd("debuffProtection")}（${modifier.times}回）`;
    case "delayedEffect":
      return (
        (modifier.delay === 1
          ? `次のターン、`
          : `${modifier.delay}ターン後、`) + generateEffectText(modifier.effect)
      );
    case "doubleEffect":
      const cardText =
        modifier.cardSummaryKind === undefined
          ? "スキルカード"
          : modifier.cardSummaryKind === "active"
            ? kwd("activeSkillCard")
            : kwd("mentalSkillCard");
      const durationText =
        modifier.duration !== undefined ? `・${modifier.duration}ターン` : "";
      return `次に使用する${cardText}の効果をもう1回発動（1回${durationText}）`;
    case "doubleLifeConsumption":
      return `${kwd("doubleLifeConsumption")}${modifier.duration}ターン`;
    case "excellentCondition":
      return `${kwd("excellentCondition")}${modifier.duration}ターン`;
    case "focus":
      return `${kwd("focus")}+${modifier.amount}`;
    case "goodCondition":
      return `${kwd("goodCondition")}${modifier.duration}ターン`;
    case "halfLifeConsumption":
      return `${kwd("halfLifeConsumption")}${modifier.duration}ターン`;
    case "lifeConsumptionReduction":
      return `${kwd("lifeConsumptionReduction")}${modifier.value}`;
    case "mightyPerformance":
      return `${kwd("mightyPerformance")}${modifier.percentage}%（${modifier.duration}ターン）`;
    case "motivation":
      return `${kwd("motivation")}+${modifier.amount}`;
    case "noVitalityIncrease":
      return `${kwd("noVitalityIncrease")}${modifier.duration}ターン`;
    case "positiveImpression":
      return `${kwd("positiveImpression")}+${modifier.amount}`;
    case "reactiveEffect":
      return [
        "以降、",
        generateReactiveEffectTriggerText(modifier.trigger),
        // 条件がない場合のみ「、」を挿入する
        // 「内気系少女」は、「以降、ターン終了時、好印象+1」
        // 「天真爛漫」は、「以降、ターン終了時集中が3以上の場合、集中+2」
        modifier.effect.condition ? "" : "、",
        generateEffectText(modifier.effect),
      ].join("");
    default:
      const unreachable: never = modifier;
      throw new Error(`Unreachable statement`);
  }
};

const generateVitalityUpdateQueryText = (
  query: VitalityUpdateQuery,
): string => {
  return (
    (query.fixedValue === true ? kwd("fixedValueVitality") : kwd("vitality")) +
    `+${query.value}` +
    (query.boostPerCardUsed !== undefined
      ? `（レッスン中に使用したスキルカード1枚ごとに、${kwd("vitality")}増加量+${query.boostPerCardUsed}）`
      : "") +
    (query.motivationMultiplier !== undefined
      ? `（${kwd("motivation")}効果を${query.motivationMultiplier}倍適用）`
      : "")
  );
};

export const generateActionCostText = (
  cost: ActionCost,
): string | undefined => {
  switch (cost.kind) {
    case "focus":
      return `${kwd("focus")}消費${cost.value}`;
    case "goodCondition":
      return `${kwd("goodCondition")}消費${cost.value}ターン`;
    case "life":
      return `${kwd("lifeConsumption")}${cost.value}`;
    case "motivation":
      return `${kwd("motivation")}消費${cost.value}`;
    case "normal":
      // 通常コストは文字列で表示している箇所がないため。表示はスキルカード左下のアイコンのみ。
      return undefined;
    case "positiveImpression":
      return `${kwd("positiveImpression")}消費${cost.value}`;
    default:
      const unreachable: never = cost.kind;
      throw new Error(`Unreachable statement`);
  }
};

const generateMeasureValueText = (condition: MeasureValueConditionContent) => {
  return [
    condition.valueKind === "life" ? "体力が" : "レッスンCLEARの",
    `${condition.percentage}%`,
    condition.criterionKind === "greaterEqual" ? "以上" : "以下",
    "の場合",
  ].join("");
};

const generateEffectConditionText = (condition: EffectCondition): string => {
  switch (condition.kind) {
    case "countModifier": {
      const isDuration =
        condition.modifierKind === "goodCondition" ||
        condition.modifierKind === "halfLifeConsumption";
      const unitText = isDuration ? "ターン" : "";
      let rangeText = "";
      if (
        "min" in condition.range &&
        !("max" in condition.range) &&
        isDuration &&
        condition.range.min === 1
      ) {
        rangeText = "状態";
      } else {
        rangeText += "が";
        if ("min" in condition.range) {
          rangeText += `${condition.range.min}${unitText}以上`;
        }
        if ("max" in condition.range) {
          rangeText += `${condition.range.max}${unitText}以下`;
        }
      }
      return `${generateModifierKindText(condition.modifierKind)}${rangeText}の場合`;
    }
    case "countRemainingTurns":
      return condition.max === 1
        ? "最終ターンの場合"
        : `残り${condition.max}ターン以内の場合`;
    case "countVitality":
      return `${kwd("vitality")}が${generateRangedNumberText(condition.range)}の場合`;
    case "measureValue":
      return generateMeasureValueText(condition);
    default:
      const unreachable: never = condition;
      throw new Error(`Unreachable statement`);
  }
};

const generateEffectWithoutConditionText = (effect: Effect): string => {
  switch (effect.kind) {
    case "drainLife":
      return `体力減少${effect.value}`;
    case "drainModifier":
      // TODO: 現状はやる気だけなので決め打ち
      return `${kwd("drainMotivationModifier")}${effect.value}`;
    case "drawCards":
      return effect.amount === 1
        ? "スキルカードを引く"
        : `スキルカードを${effect.amount}枚引く`;
    case "enhanceHand":
      return `手札をすべて${kwd("enhanceHand")}`;
    case "exchangeHand":
      return "手札をすべて入れ替える";
    case "generateCard":
      return `ランダムな強化済みスキルカード（SSR）を、手札に${kwd("generateCard")}`;
    case "generateTroubleCard":
      return `${cardKwd("nemuke")}を山札のランダムな位置に${kwd("generateCard")}`;
    case "increaseRemainingTurns":
      return `${kwd("increaseRemainingTurns")}+${effect.amount}`;
    case "getModifier":
      return generateModifierText(effect.modifier);
    case "multiplyModifier":
      return `${generateModifierKindText(effect.modifierKind)}${effect.multiplier}倍`;
    case "perform":
      return [
        effect.score ? `パラメータ+${effect.score.value}` : "",
        effect.score && effect.score.focusMultiplier !== undefined
          ? `（${kwd("focus")}効果を${effect.score.focusMultiplier}倍適用）`
          : "",
        effect.score && effect.score.boostPerCardUsed !== undefined
          ? `（レッスン中に使用したスキルカード1枚ごとに、パラメータ上昇量+${effect.score.boostPerCardUsed}）`
          : "",
        effect.score && effect.score.times !== undefined
          ? `（${effect.score.times}回）`
          : "",
        effect.vitality ? generateVitalityUpdateQueryText(effect.vitality) : "",
      ].join("");
    case "performLeveragingModifier": {
      const valueKindText =
        effect.valueKind === "score"
          ? "パラメータ上昇"
          : kwd("vitality") + "増加";
      return `${generateModifierKindText(effect.modifierKind)}の${effect.percentage}%分${valueKindText}`;
    }
    case "performLeveragingVitality":
      return (
        (() => {
          switch (effect.reductionKind) {
            case "halve":
              return `${kwd("vitality")}を半分にして、減少前の`;
            case "zero":
              return `${kwd("vitality")}を0にして、減少前の`;
            default:
              return "";
          }
        })() + `${kwd("vitality")}の${effect.percentage}%分パラメータ上昇`
      );
    case "recoverLife":
      return `体力回復${effect.value}`;
    default:
      const unreachable: never = effect;
      throw new Error(`Unreachable statement`);
  }
};

/**
 * 一つの効果を表現したテキストを生成する
 *
 * @param options.hasSeparator 条件と効果の間に "、" を挿入するか。応援/トラブルの効果説明はそれが存在しない。
 */
export const generateEffectText = (
  effect: Effect,
  options: { hasSeparator: boolean } = { hasSeparator: true },
): string => {
  return [
    ...(effect.condition
      ? [
          generateEffectConditionText(effect.condition) +
            (options.hasSeparator ? "、" : ""),
        ]
      : []),
    generateEffectWithoutConditionText(effect),
  ].join("");
};

export const generateCardUsageConditionText = (
  condition: CardUsageCondition,
): string => {
  switch (condition.kind) {
    case "countTurnNumber":
      return `${condition.min}ターン目以降の場合、使用可`;
    case "countVitalityZero":
      return `${kwd("vitality")}が0の場合、使用可`;
    case "hasGoodCondition":
      return `${kwd("goodCondition")}状態の場合、使用可`;
    case "measureValue":
      return generateMeasureValueText(condition) + "、使用可";
    default:
      const unreachable: never = condition;
      throw new Error(`Unreachable statement`);
  }
};

/**
 * スキルカードの効果説明欄のテキストを生成する
 */
export const generateCardDescription = (params: {
  cost: CardContentData["cost"];
  condition: CardContentData["condition"];
  effects: CardContentData["effects"];
  innate?: CardContentData["innate"];
  nonDuplicative?: CardData["nonDuplicative"];
  usableOncePerLesson?: CardContentData["usableOncePerLesson"];
}): string => {
  let lines: string[] = [];
  const costText = generateActionCostText(params.cost);
  if (costText !== undefined) {
    lines = [...lines, costText];
  }
  if (params.innate) {
    lines = [...lines, "レッスン開始時手札に入る"];
  }
  if (params.condition) {
    lines = [...lines, generateCardUsageConditionText(params.condition)];
  }
  lines = [...lines, ...params.effects.map((e) => generateEffectText(e))];
  const lastLine =
    (params.usableOncePerLesson === true ? kwd("usableOncePerLesson") : "") +
    (params.nonDuplicative === true ? kwd("nonDuplicative") : "");
  if (lastLine) {
    lines = [...lines, lastLine];
  }
  return lines.join("\n");
};

/**
 * Pアイテム名を生成する
 */
export const generateProducerItemName = (
  name: ProducerItemData["name"],
  enhanced: boolean,
): string => name + (enhanced ? "+" : "");

const generateProducerItemTimesText = (
  times: ProducerItemContentData["times"],
): string => {
  return `（レッスン内${times}回）`;
};

/**
 * Pアイテムの効果説明欄のテキストを生成する
 */
export const generateProducerItemDescription = (params: {
  condition?: ProducerItemContentData["condition"];
  cost?: ProducerItemContentData["cost"];
  effects: ProducerItemContentData["effects"];
  times?: ProducerItemContentData["times"];
  trigger: ProducerItemContentData["trigger"];
}): string => {
  let lines: string[] = [];
  let triggerAndConditionText = generateReactiveEffectTriggerText(
    params.trigger,
  );
  if (params.condition) {
    triggerAndConditionText += generateEffectConditionText(params.condition);
  }
  triggerAndConditionText += "、";
  const effectTexts = params.effects.map((e) => generateEffectText(e));
  lines = [
    ...lines,
    triggerAndConditionText + effectTexts[0],
    ...effectTexts.slice(1, effectTexts.length),
  ];
  if (params.cost !== undefined) {
    const costText = generateActionCostText(params.cost);
    // 通常コストの時に表記がなくなるが、現状Pアイテムに通常コストは存在しないので考慮しない
    if (costText !== undefined) {
      lines = [...lines, costText];
    }
  }
  if (params.times !== undefined) {
    lines = [...lines, generateProducerItemTimesText(params.times)];
  }
  return lines.join("\n");
};

/**
 * Pドリンクの効果説明欄のテキストを生成する
 */
export const generateDrinkDescription = (params: {
  cost?: DrinkData["cost"];
  effects: DrinkData["effects"];
}): string => {
  const goodEffectTexts = params.effects
    .filter((e) => !isBadEffect(e))
    .map((e) => generateEffectText(e));
  const badEffectTexts = params.effects
    .filter((e) => isBadEffect(e))
    .map((e) => generateEffectText(e));
  let lines = goodEffectTexts;
  if (params.cost !== undefined) {
    const costText = generateActionCostText(params.cost);
    // 通常コストの時に表記がなくなるが、現状Pドリンクに通常コストは存在しないので考慮しない
    if (costText !== undefined) {
      lines = [...lines, costText];
    }
  }
  lines = [...lines, ...badEffectTexts];
  return lines.join("\n");
};
