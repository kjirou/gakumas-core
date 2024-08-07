import type { Card, CardData, ProducerItemData } from "./types";
import {
  type CardDataId,
  findCardDataById,
  getCardContentDataList,
  getCardDataByConstId,
} from "./data/cards";
import { type DrinkDataId, getDrinkDataByConstId } from "./data/drinks";
import {
  getProducerItemDataByConstId,
  ProducerItemDataId,
} from "./data/producer-items";
import {
  generateActionCostText,
  generateCardDescription,
  generateCardName,
  generateCardUsageConditionText,
  generateDrinkDescription,
  generateEffectText,
  generateProducerItemDescription,
  generateProducerItemTriggerAndConditionText,
  globalDataKeywords,
} from "./text-generation";

describe("globalDataKeywords", () => {
  describe("`cards`のキーがデータ定義のidに存在する", () => {
    const testCases = Object.keys(globalDataKeywords.cards).map((key) => ({
      key,
    }));
    test.each(testCases)("$key", ({ key }) => {
      expect(findCardDataById(key)).not.toBeUndefined();
    });
  });
});
describe("generateCardName", () => {
  const testCases: Array<{
    args: Parameters<typeof generateCardName>;
    expected: ReturnType<typeof generateCardName>;
  }> = [
    {
      args: [
        {
          original: {
            data: getCardDataByConstId("apirunokihon"),
          },
          enhancements: [] as any,
        } as Card,
      ],
      expected: "アピールの基本",
    },
    {
      args: [
        {
          original: {
            data: getCardDataByConstId("apirunokihon"),
          },
          enhancements: [{ kind: "original" }],
        } as Card,
      ],
      expected: "アピールの基本+",
    },
    {
      args: [
        {
          original: {
            data: getCardDataByConstId("apirunokihon"),
          },
          enhancements: [{ kind: "effect" }, { kind: "lessonSupport" }],
        } as Card,
      ],
      expected: "アピールの基本++",
    },
    {
      args: [
        {
          original: {
            data: getCardDataByConstId("apirunokihon"),
          },
          enhancements: [
            { kind: "effect" },
            { kind: "lessonSupport" },
            { kind: "lessonSupport" },
          ],
        } as Card,
      ],
      expected: "アピールの基本+++",
    },
  ];
  test.each(testCases)(
    '$args.0.enhancements => "$expected"',
    ({ args, expected }) => {
      expect(generateCardName(...args)).toBe(expected);
    },
  );
});
describe("generateEffectText", () => {
  const testCases: Array<{
    args: Parameters<typeof generateEffectText>;
    expected: ReturnType<typeof generateEffectText>;
    name: string;
  }> = [
    {
      args: [{ kind: "drainLife", value: 1 }],
      expected: "体力減少1",
      name: "drainLife",
    },
    {
      args: [{ kind: "drawCards", amount: 1 }],
      expected: "スキルカードを引く",
      name: "drawCards - 1枚の時",
    },
    {
      args: [{ kind: "drawCards", amount: 2 }],
      expected: "スキルカードを2枚引く",
      name: "drawCards - 2枚の時",
    },
    {
      args: [{ kind: "enhanceHand" }],
      expected: "手札をすべて{{レッスン中強化}}",
      name: "enhanceHand",
    },
    {
      args: [{ kind: "exchangeHand" }],
      expected: "手札をすべて入れ替える",
      name: "exchangeHand",
    },
    {
      args: [{ kind: "generateCard" }],
      expected: "ランダムな強化済みスキルカード（SSR）を、手札に{{生成}}",
      name: "generateCard",
    },
    {
      args: [{ kind: "generateTroubleCard" }],
      expected: "{{眠気}}を山札のランダムな位置に{{生成}}",
      name: "generateTroubleCard",
    },
    {
      args: [{ kind: "increaseRemainingTurns", amount: 1 }],
      expected: "{{ターン追加}}+1",
      name: "increaseRemainingTurns",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: {
            kind: "additionalCardUsageCount",
            amount: 1,
          },
        },
      ],
      expected: "{{スキルカード使用数追加}}+1",
      name: "getModifier - additionalCardUsageCount",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "debuffProtection", times: 1 },
        },
      ],
      expected: "{{低下状態無効}}（1回）",
      name: "getModifier - debuffProtection",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: {
            kind: "delayedEffect",
            delay: 1,
            effect: { kind: "perform", score: { value: 1 } },
          },
        },
      ],
      expected: "次のターン、パラメータ+1",
      name: "getModifier - delayedEffect - 次のターンに perform",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: {
            kind: "delayedEffect",
            delay: 2,
            effect: { kind: "drawCards", amount: 1 },
          },
        },
      ],
      expected: "2ターン後、スキルカードを引く",
      name: "getModifier - delayedEffect - 2ターン後に drawCards",
    },
    {
      args: [{ kind: "getModifier", modifier: { kind: "doubleEffect" } }],
      expected: "次に使用するスキルカードの効果をもう1回発動（1回）",
      name: "getModifier - doubleEffect",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "doubleEffect", cardSummaryKind: "active" },
        },
      ],
      expected:
        "次に使用する{{アクティブスキルカード}}の効果をもう1回発動（1回）",
      name: "getModifier - doubleEffect - cardSummaryKind 有り",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "doubleEffect", duration: 1 },
        },
      ],
      expected: "次に使用するスキルカードの効果をもう1回発動（1回・1ターン）",
      name: "getModifier - doubleEffect - duration 有り",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "doubleLifeConsumption", duration: 1 },
        },
      ],
      expected: "{{消費体力増加}}1ターン",
      name: "getModifier - doubleLifeConsumption",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: {
            kind: "effectActivationOnTurnEnd",
            effect: {
              kind: "getModifier",
              modifier: { kind: "positiveImpression", amount: 1 },
            },
          },
        },
      ],
      expected: "以降、ターン終了時、{{好印象}}+1",
      name: "getModifier - effectActivationOnTurnEnd",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: {
            kind: "effectActivationBeforeCardEffectActivation",
            cardKind: "active",
            effect: {
              kind: "perform",
              vitality: { fixedValue: true, value: 1 },
            },
          },
        },
      ],
      expected: "以降、{{アクティブスキルカード}}使用時、{{固定元気}}+1",
      name: "getModifier - effectActivationBeforeCardEffectActivation - active",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: {
            kind: "effectActivationBeforeCardEffectActivation",
            cardKind: "mental",
            effect: {
              kind: "getModifier",
              modifier: { kind: "positiveImpression", amount: 1 },
            },
          },
        },
      ],
      expected: "以降、{{メンタルスキルカード}}使用時、{{好印象}}+1",
      name: "getModifier - effectActivationBeforeCardEffectActivation - mental",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "excellentCondition", duration: 1 },
        },
      ],
      expected: "{{絶好調}}1ターン",
      name: "getModifier - excellentCondition",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "focus", amount: 1 },
        },
      ],
      expected: "{{集中}}+1",
      name: "getModifier - focus",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 1 },
        },
      ],
      expected: "{{好調}}1ターン",
      name: "getModifier - goodCondition",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "halfLifeConsumption", duration: 1 },
        },
      ],
      expected: "{{消費体力減少}}1ターン",
      name: "getModifier - halfLifeConsumption",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "lifeConsumptionReduction", value: 1 },
        },
      ],
      expected: "{{消費体力削減}}1",
      name: "getModifier - lifeConsumptionReduction",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "mightyPerformance", duration: 1, percentage: 50 },
        },
      ],
      expected: "{{パラメータ上昇量増加}}50%（1ターン）",
      name: "getModifier - mightyPerformance",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 1 },
        },
      ],
      expected: "{{やる気}}+1",
      name: "getModifier - motivation",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "noVitalityIncrease", duration: 1 },
        },
      ],
      expected: "{{元気増加無効}}1ターン",
      name: "getModifier - noVitalityIncrease",
    },
    {
      args: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 1 },
        },
      ],
      expected: "{{好印象}}+1",
      name: "getModifier - positiveImpression",
    },
    {
      args: [
        {
          kind: "multiplyModifier",
          modifierKind: "positiveImpression",
          multiplier: 1.5,
        },
      ],
      expected: "{{好印象}}1.5倍",
      name: "multiplyModifier",
    },
    {
      args: [{ kind: "perform", score: { value: 1 } }],
      expected: "パラメータ+1",
      name: "perform - score",
    },
    {
      args: [{ kind: "perform", score: { focusMultiplier: 1.5, value: 1 } }],
      expected: "パラメータ+1（{{集中}}効果を1.5倍適用）",
      name: "perform - score - focusMultiplier",
    },
    {
      args: [{ kind: "perform", score: { times: 2, value: 1 } }],
      expected: "パラメータ+1（2回）",
      name: "perform - score - times",
    },
    {
      args: [{ kind: "perform", vitality: { value: 1 } }],
      expected: "{{元気}}+1",
      name: "perform - vitality",
    },
    {
      args: [{ kind: "perform", vitality: { fixedValue: true, value: 1 } }],
      expected: "{{固定元気}}+1",
      name: "perform - vitality - fixedValue",
    },
    {
      args: [{ kind: "perform", vitality: { boostPerCardUsed: 2, value: 1 } }],
      expected:
        "{{元気}}+1（レッスン中に使用したスキルカード1枚ごとに、{{元気}}増加量+2）",
      name: "perform - vitality - boostPerCardUsed",
    },
    {
      args: [{ kind: "perform", score: { value: 1 }, vitality: { value: 2 } }],
      expected: "パラメータ+1{{元気}}+2",
      name: "perform - score & vitality",
    },
    {
      args: [
        {
          kind: "perform",
          score: { focusMultiplier: 2, times: 3, value: 1 },
          vitality: { boostPerCardUsed: 12, fixedValue: true, value: 11 },
        },
      ],
      expected:
        "パラメータ+1（{{集中}}効果を2倍適用）（3回）{{固定元気}}+11（レッスン中に使用したスキルカード1枚ごとに、{{元気}}増加量+12）",
      name: "perform - 全てのオプションを付与",
    },
    {
      args: [
        {
          kind: "performLeveragingModifier",
          modifierKind: "positiveImpression",
          percentage: 100,
        },
      ],
      expected: "{{好印象}}の100%分パラメータ上昇",
      name: "performLeveragingModifier",
    },
    {
      args: [{ kind: "performLeveragingVitality", percentage: 100 }],
      expected: "{{元気}}の100%分パラメータ上昇",
      name: "performLeveragingVitality",
    },
    {
      args: [
        {
          kind: "performLeveragingVitality",
          reductionKind: "halve",
          percentage: 100,
        },
      ],
      expected: "{{元気}}を半分にして、減少前の{{元気}}の100%分パラメータ上昇",
      name: "performLeveragingVitality - reductionKind - halve",
    },
    {
      args: [
        {
          kind: "performLeveragingVitality",
          reductionKind: "zero",
          percentage: 100,
        },
      ],
      expected: "{{元気}}を0にして、減少前の{{元気}}の100%分パラメータ上昇",
      name: "performLeveragingVitality - reductionKind - zero",
    },
    {
      args: [
        {
          kind: "perform",
          score: { value: 10 },
          condition: {
            kind: "countModifier",
            modifierKind: "focus",
            range: { min: 1 },
          },
        },
      ],
      expected: "{{集中}}が1以上の場合、パラメータ+10",
      name: "condition - countModifier - range - min",
    },
    {
      args: [
        {
          kind: "perform",
          score: { value: 10 },
          condition: {
            kind: "countModifier",
            modifierKind: "focus",
            range: { max: 2 },
          },
        },
      ],
      expected: "{{集中}}が2以下の場合、パラメータ+10",
      name: "condition - countModifier - range - max",
    },
    {
      args: [
        {
          kind: "perform",
          score: { value: 10 },
          condition: {
            kind: "countModifier",
            modifierKind: "focus",
            range: { min: 1, max: 2 },
          },
        },
      ],
      expected: "{{集中}}が1以上2以下の場合、パラメータ+10",
      name: "condition - countModifier - range - min & max",
    },
    {
      args: [
        {
          kind: "perform",
          score: { value: 10 },
          condition: { kind: "countReminingTurns", max: 1 },
        },
      ],
      expected: "最終ターンの場合、パラメータ+10",
      name: "condition - countReminingTurns - 1",
    },
    {
      args: [
        {
          kind: "perform",
          score: { value: 10 },
          condition: { kind: "countReminingTurns", max: 2 },
        },
      ],
      expected: "残り2ターン以内の場合、パラメータ+10",
      name: "condition - countReminingTurns - 2",
    },
    {
      args: [
        {
          kind: "perform",
          score: { value: 10 },
          condition: { kind: "countVitality", range: { min: 1 } },
        },
      ],
      expected: "{{元気}}が1以上の場合、パラメータ+10",
      name: "condition - countVitality - min",
    },
    {
      args: [
        {
          kind: "perform",
          score: { value: 10 },
          condition: { kind: "countVitality", range: { min: 2, max: 2 } },
        },
      ],
      expected: "{{元気}}が2の場合、パラメータ+10",
      name: "condition - countVitality - min & max",
    },
    {
      args: [
        {
          kind: "perform",
          score: { value: 10 },
          condition: { kind: "hasGoodCondition" },
        },
      ],
      expected: "{{好調}}状態の場合、パラメータ+10",
      name: "condition - hasGoodCondition",
    },
    {
      args: [
        {
          kind: "perform",
          score: { value: 10 },
          condition: { kind: "measureIfLifeIsEqualGreaterThanHalf" },
        },
      ],
      expected: "体力が50%以上の場合、パラメータ+10",
      name: "condition - measureIfLifeIsEqualGreaterThanHalf",
    },
    {
      args: [
        {
          kind: "perform",
          score: { value: 1 },
          condition: { kind: "measureIfLifeIsEqualGreaterThanHalf" },
        },
        { hasSeparator: false },
      ],
      expected: "体力が50%以上の場合パラメータ+1",
      name: "condition - 読点を挿入しない",
    },
  ];
  test.each(testCases)('$name => "$expected"', ({ args, expected }) => {
    expect(generateEffectText(...args)).toBe(expected);
  });
});
describe("generateCardUsageConditionText", () => {
  const testCases: Array<{
    args: Parameters<typeof generateCardUsageConditionText>;
    expected: ReturnType<typeof generateCardUsageConditionText>;
    name: string;
  }> = [
    {
      args: [{ kind: "countTurnNumber", min: 1 }],
      expected: "1ターン目以降の場合、使用可",
      name: "countTurnNumber",
    },
    {
      args: [{ kind: "countVitalityZero" }],
      expected: "{{元気}}が0の場合、使用可",
      name: "countVitalityZero",
    },
    {
      args: [{ kind: "hasGoodCondition" }],
      expected: "{{好調}}状態の場合、使用可",
      name: "hasGoodCondition",
    },
    {
      args: [
        {
          kind: "measureValue",
          criterionKind: "greaterEqual",
          percentage: 50,
          valueKind: "life",
        },
      ],
      expected: "体力の50%以上の場合、使用可",
      name: "measureValue - 1",
    },
    {
      args: [
        {
          kind: "measureValue",
          criterionKind: "lessEqual",
          percentage: 100,
          valueKind: "score",
        },
      ],
      expected: "レッスンCLEARの100%以下の場合、使用可",
      name: "measureValue - 2",
    },
  ];
  test.each(testCases)('$name => "$expected"', ({ args, expected }) => {
    expect(generateCardUsageConditionText(...args)).toBe(expected);
  });
});
describe("generateActionCostText", () => {
  const testCases: Array<{
    args: Parameters<typeof generateActionCostText>;
    expected: ReturnType<typeof generateActionCostText>;
  }> = [
    { args: [{ kind: "focus", value: 1 }], expected: "{{集中}}消費1" },
    {
      args: [{ kind: "goodCondition", value: 1 }],
      expected: "{{好調}}消費1ターン",
    },
    { args: [{ kind: "life", value: 1 }], expected: "{{体力消費}}1" },
    { args: [{ kind: "motivation", value: 1 }], expected: "{{やる気}}消費1" },
    { args: [{ kind: "normal", value: 1 }], expected: undefined },
    {
      args: [{ kind: "positiveImpression", value: 1 }],
      expected: "{{好印象}}消費1",
    },
  ];
  test.each(testCases)('$args.0 => "$expected"', ({ args, expected }) => {
    expect(generateActionCostText(...args)).toBe(expected);
  });
});
describe("generateCardDescription", () => {
  const testCases: Array<{
    cardId: CardDataId;
    expected: ReturnType<typeof generateCardDescription>;
  }> = [
    {
      cardId: "apirunokihon",
      expected: ["パラメータ+9"].join("\n"),
    },
    {
      cardId: "pozunokihon",
      expected: ["パラメータ+2{{元気}}+2"].join("\n"),
    },
    {
      cardId: "chosen",
      expected: [
        "{{好調}}状態の場合、使用可",
        "パラメータ+25",
        "{{レッスン中1回}}",
      ].join("\n"),
    },
    {
      cardId: "shikosakugo",
      expected: ["パラメータ+8（2回）", "{{レッスン中1回}}"].join("\n"),
    },
    {
      cardId: "kawaiishigusa",
      expected: [
        "{{好印象}}+2",
        "{{好印象}}の100%分パラメータ上昇",
        "{{レッスン中1回}}",
      ].join("\n"),
    },
    {
      cardId: "kibuntenkan",
      expected: [
        "{{体力消費}}5",
        "{{元気}}の100%分パラメータ上昇",
        "{{レッスン中1回}}",
      ].join("\n"),
    },
    {
      cardId: "hyogennokihon",
      expected: ["{{元気}}+4", "{{レッスン中1回}}"].join("\n"),
    },
    {
      cardId: "furumainokihon",
      expected: ["{{元気}}+1", "{{好調}}2ターン"].join("\n"),
    },
    {
      cardId: "mesennokihon",
      expected: ["{{元気}}+1", "{{好印象}}+2"].join("\n"),
    },
    {
      cardId: "ishikinokihon",
      expected: ["{{元気}}+1", "{{やる気}}+2"].join("\n"),
    },
    {
      cardId: "nemuke",
      expected: ["{{レッスン中1回}}"].join("\n"),
    },
    {
      cardId: "ikioimakase",
      expected: ["パラメータ+6", "{{好調}}状態の場合、{{集中}}+3"].join("\n"),
    },
    {
      cardId: "haitatchi",
      expected: [
        "パラメータ+17（{{集中}}効果を1.5倍適用）",
        "{{レッスン中1回}}",
      ].join("\n"),
    },
    {
      cardId: "fasutosuteppu",
      expected: [
        "{{元気}}+3",
        "体力が50%以上の場合、{{消費体力削減}}1",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "hoyoryoku",
      expected: [
        "パラメータ+2{{元気}}+1",
        "体力回復2",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "uchikikeishojo",
      expected: [
        "{{好印象}}+1",
        "以降、ターン終了時、{{好印象}}+1",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "mikannotaiki",
      expected: [
        "{{体力消費}}3",
        "{{元気}}+2（レッスン中に使用したスキルカード1枚ごとに、{{元気}}増加量+3）",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "shupurehikoru",
      expected: [
        "{{集中}}消費3",
        "パラメータ+6",
        "{{好調}}2ターン",
        "{{スキルカード使用数追加}}+1",
        "{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "hatonoaizu",
      expected: [
        "{{体力消費}}3",
        "{{元気}}を半分にして、減少前の{{元気}}の130%分パラメータ上昇",
        "{{レッスン中1回}}",
      ].join("\n"),
    },
    {
      cardId: "enshutsukeikaku",
      expected: [
        "{{絶好調}}3ターン",
        "以降、{{アクティブスキルカード}}使用時、{{固定元気}}+2",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "shizukanaishi",
      expected: [
        "レッスン開始時手札に入る",
        "{{集中}}+3",
        "{{好調}}2ターン",
        "{{レッスン中1回}}",
      ].join("\n"),
    },
    {
      cardId: "onechandamono",
      expected: [
        "レッスンCLEARの100%以下の場合、使用可",
        "パラメータ+6{{元気}}+6",
        "次のターン、スキルカードを引く",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "sutoretchidangi",
      expected: [
        "3ターン目以降の場合、使用可",
        "パラメータ+3",
        "{{消費体力減少}}2ターン",
        "次のターン、手札をすべて{{レッスン中強化}}",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "kimegaodejidori",
      expected: [
        "{{好調}}3ターン",
        "{{集中}}+2",
        "体力が50%以上の場合、次のターン、スキルカードを引く",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "shikirinaoshi",
      expected: [
        "手札をすべて入れ替える",
        "{{消費体力減少}}4ターン",
        "{{スキルカード使用数追加}}+1",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "kokumintekiaidoru",
      expected: [
        "{{好調}}消費1ターン",
        "次に使用するスキルカードの効果をもう1回発動（1回）",
        "{{スキルカード使用数追加}}+1",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "tenshinramman",
      expected: [
        "{{集中}}+1",
        "以降、ターン終了時{{集中}}が3以上の場合、{{集中}}+2",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "wammoasuteppu",
      expected: [
        "パラメータ+7（2回）",
        "{{集中}}が6以上の場合、パラメータ+7",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
    {
      cardId: "usureyukukabe",
      expected: [
        "{{元気}}+3",
        "次のターン、手札をすべて{{レッスン中強化}}",
        "2ターン後、手札をすべて{{レッスン中強化}}",
        "{{レッスン中1回}}{{重複不可}}",
      ].join("\n"),
    },
  ];
  test.each(testCases)('$cardId => "$expected"', ({ cardId, expected }) => {
    const card = getCardDataByConstId(cardId);
    const contents = getCardContentDataList(card);
    expect(
      generateCardDescription({
        cost: contents[0].cost,
        condition: contents[0].condition,
        effects: contents[0].effects,
        innate: contents[0].innate,
        usableOncePerLesson: contents[0].usableOncePerLesson,
        nonDuplicative: card.nonDuplicative,
      }),
    ).toBe(expected);
  });
});
describe("generateProducerItemTriggerAndConditionText", () => {
  const testCases: Array<{
    args: Parameters<typeof generateProducerItemTriggerAndConditionText>;
    expected: ReturnType<typeof generateProducerItemTriggerAndConditionText>;
    name: string;
  }> = [
    {
      args: [
        {
          trigger: { kind: "beforeCardEffectActivation" },
        },
      ],
      expected: "スキルカード使用時、",
      name: "beforeCardEffectActivation - no options",
    },
    {
      args: [
        {
          trigger: {
            kind: "beforeCardEffectActivation",
            cardSummaryKind: "active",
          },
        },
      ],
      expected: "{{アクティブスキルカード}}使用時、",
      name: "beforeCardEffectActivation - cardSummaryKind: active",
    },
    {
      args: [
        {
          trigger: {
            kind: "beforeCardEffectActivation",
            cardSummaryKind: "mental",
          },
        },
      ],
      expected: "{{メンタルスキルカード}}使用時、",
      name: "beforeCardEffectActivation - cardSummaryKind: mental",
    },
    {
      args: [
        {
          trigger: {
            kind: "beforeCardEffectActivation",
            cardDataId: "adorenarinzenkai",
          },
        },
      ],
      expected: "{{アドレナリン全開}}使用時、",
      name: "beforeCardEffectActivation - cardDataId",
    },
    {
      args: [
        {
          condition: { kind: "measureIfLifeIsEqualGreaterThanHalf" },
          trigger: { kind: "beforeCardEffectActivation" },
        },
      ],
      expected: "スキルカード使用時体力が50%以上の場合、",
      name: "beforeCardEffectActivation - condition - not countModifier",
    },
    {
      args: [
        {
          trigger: { kind: "afterCardEffectActivation" },
        },
      ],
      expected: "スキルカード使用後、",
      name: "afterCardEffectActivation - no options",
    },
    {
      args: [
        {
          trigger: {
            kind: "afterCardEffectActivation",
            cardSummaryKind: "active",
          },
        },
      ],
      expected: "{{アクティブスキルカード}}使用後、",
      name: "afterCardEffectActivation - cardSummaryKind: active",
    },
    {
      args: [
        {
          trigger: {
            kind: "afterCardEffectActivation",
            cardSummaryKind: "mental",
          },
        },
      ],
      expected: "{{メンタルスキルカード}}使用後、",
      name: "afterCardEffectActivation - cardSummaryKind: mental",
    },
    {
      args: [
        {
          trigger: { kind: "turnStartEveryTwoTurns" },
        },
      ],
      expected: "2ターンごとに、",
      name: "turnStartEveryTwoTurns",
    },
    {
      args: [
        {
          condition: { kind: "hasGoodCondition" },
          trigger: { kind: "turnStartEveryTwoTurns" },
        },
      ],
      expected: "2ターンごとに{{好調}}状態の場合、",
      name: "turnStartEveryTwoTurns - condition",
    },
    {
      args: [
        {
          trigger: { kind: "modifierIncrease", modifierKind: "focus" },
        },
      ],
      expected: "{{集中}}が増加後、",
      name: "modifierIncrease - not goodCondition",
    },
    {
      args: [
        {
          trigger: { kind: "modifierIncrease", modifierKind: "goodCondition" },
        },
      ],
      expected: "{{好調}}の効果ターンが増加後、",
      name: "modifierIncrease - goodCondition",
    },
    {
      args: [
        {
          condition: { kind: "hasGoodCondition" },
          trigger: { kind: "modifierIncrease", modifierKind: "focus" },
        },
      ],
      expected: "{{集中}}が増加後{{好調}}状態の場合、",
      name: "modifierIncrease - condition",
    },
    {
      args: [
        {
          trigger: { kind: "turnEnd" },
        },
      ],
      expected: "ターン終了時、",
      name: "turnEnd",
    },
    {
      args: [
        {
          condition: { kind: "hasGoodCondition" },
          trigger: { kind: "turnEnd" },
        },
      ],
      expected: "ターン終了時{{好調}}状態の場合、",
      name: "turnEnd - condition",
    },
    {
      args: [
        {
          trigger: { kind: "turnStart" },
        },
      ],
      expected: "ターン開始時、",
      name: "turnStart",
    },
    {
      args: [
        {
          condition: { kind: "hasGoodCondition" },
          trigger: { kind: "turnStart" },
        },
      ],
      expected: "ターン開始時{{好調}}状態の場合、",
      name: "turnStart - condition",
    },
    {
      args: [
        {
          trigger: { kind: "turnStart", idolParameterKind: "vocal" },
        },
      ],
      expected: "【ボイスレッスン・ボイスターンのみ】ターン開始時、",
      name: "idolParameterKind - vocal",
    },
    {
      args: [
        {
          trigger: { kind: "turnStart", idolParameterKind: "dance" },
        },
      ],
      expected: "【ダンスレッスン・ダンスターンのみ】ターン開始時、",
      name: "idolParameterKind - dance",
    },
    {
      args: [
        {
          trigger: { kind: "turnStart", idolParameterKind: "visual" },
        },
      ],
      expected: "【ビジュアルレッスン・ビジュアルターンのみ】ターン開始時、",
      name: "idolParameterKind - visual",
    },
  ];
  test.each(testCases)('$name => "$expected"', ({ args, expected }) => {
    expect(generateProducerItemTriggerAndConditionText(...args)).toBe(expected);
  });
});
describe("generateProducerItemDescription", () => {
  const testCases: Array<{
    expected: ReturnType<typeof generateProducerItemDescription>;
    producerItemId: ProducerItemDataId;
  }> = [
    {
      producerItemId: "itsumonomeikupochi",
      expected: [
        "{{アクティブスキルカード}}使用時体力が50%以上の場合、{{集中}}+2",
        "（レッスン内1回）",
      ].join("\n"),
    },
    {
      producerItemId: "pinkunoosoroiburesu",
      expected: ["ターン開始時、{{集中}}+1", "（レッスン内2回）"].join("\n"),
    },
    {
      producerItemId: "chibidomotezukurimedaru",
      expected: [
        "ターン終了時{{好印象}}が6以上の場合、{{好印象}}+2",
        "（レッスン内2回）",
      ].join("\n"),
    },
    {
      producerItemId: "chozetsuammimmasuku",
      expected: [
        "ターン開始時最終ターンの場合、{{元気}}の50%分パラメータ上昇",
        "{{体力消費}}1",
      ].join("\n"),
    },
    {
      producerItemId: "watashinohatsunogakufu",
      expected: [
        "ターン開始時{{元気}}が0の場合、体力減少1",
        "{{集中}}+3",
        "（レッスン内2回）",
      ].join("\n"),
    },
    {
      producerItemId: "saikonihappinominamoto",
      expected: [
        "{{アドレナリン全開}}使用時、{{好調}}3ターン",
        "{{固定元気}}+5",
        "（レッスン内1回）",
      ].join("\n"),
    },
    {
      producerItemId: "korogaritsuzukerugenkinominamoto",
      expected: [
        "{{メンタルスキルカード}}使用後{{やる気}}が5以上の場合、{{やる気}}+3",
        "{{スキルカード使用数追加}}+1",
        "（レッスン内1回）",
      ].join("\n"),
    },
    {
      producerItemId: "etainoshirenaimono",
      expected: [
        "【ビジュアルレッスン・ビジュアルターンのみ】ターン開始時、{{パラメータ上昇量増加}}50%（1ターン）",
        "（レッスン内3回）",
      ].join("\n"),
    },
  ];
  test.each(testCases)(
    '$producerItemId => "$expected"',
    ({ expected, producerItemId }) => {
      const producerItem = getProducerItemDataByConstId(producerItemId);
      expect(
        generateProducerItemDescription({
          cost: producerItem.base.cost,
          condition: producerItem.base.condition,
          effects: producerItem.base.effects,
          times: producerItem.base.times,
          trigger: producerItem.base.trigger,
        }),
      ).toBe(expected);
    },
  );
});
describe("generateDrinkDescription", () => {
  const testParameters: Array<{
    drinkDataId: DrinkDataId;
    expected: ReturnType<typeof generateDrinkDescription>;
  }> = [
    {
      drinkDataId: "busutoekisu",
      expected: [
        "{{パラメータ上昇量増加}}30%（3ターン）",
        "{{消費体力減少}}3ターン",
        "{{体力消費}}2",
      ].join("\n"),
    },
    {
      drinkDataId: "gensenhatsuboshiburendo",
      expected: ["以降、ターン終了時、{{やる気}}+1"].join("\n"),
    },
    {
      drinkDataId: "tokuseihatsuboshiekisu",
      expected: [
        "次に使用する{{アクティブスキルカード}}の効果をもう1回発動（1回・1ターン）",
        "{{体力消費}}2",
        "{{消費体力増加}}1ターン",
      ].join("\n"),
    },
  ];
  test.each(testParameters)(
    '$drinkDataId => "$expected"',
    ({ drinkDataId, expected }) => {
      const drinkData = getDrinkDataByConstId(drinkDataId);
      expect(
        generateDrinkDescription({
          cost: drinkData.cost,
          effects: drinkData.effects,
        }),
      ).toBe(expected);
    },
  );
});
