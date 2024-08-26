import { DrinkData } from "../types";

export const findDrinkDataById = (id: DrinkData["id"]): DrinkData | undefined =>
  drinks.find((drink) => drink.id === id);

export const getDrinkDataById = (id: DrinkData["id"]): DrinkData => {
  const drink = findDrinkDataById(id);
  if (!drink) {
    throw new Error(`Drink not found: ${id}`);
  }
  return drink;
};

export const getDrinkDataByConstId = (id: DrinkDataId): DrinkData =>
  getDrinkDataById(id);

export const isDrinkDataIdType = (id: string): id is DrinkDataId =>
  drinks.some((e) => e.id === id);

/**
 * Pドリンクの定義
 *
 * - データ定義のルール
 *   - id は、名称を機械的に変換したもの
 *     - 名称が日本語の時は、Pアイテム名をヘボン式のローマ字で表記し、記号は除去するかハイフンに置き換えたもの
 *       - ヘボン式ローマ字書式参考資料: https://www.ezairyu.mofa.go.jp/passport/hebon.html
 *     - 名称が英語の時は、スペルのまま小文字表記にする
 *   - レコードの定義順は、本家のP図鑑のPアイテムの「通常」表示順へ合わせる。
 *   - プロパティの定義順は、スキルカードに合わせる
 * - TODO: eslint
 */
export const drinksAsConst = [
  {
    // 読み方不明
    id: "hatsuboshimizu",
    name: "初星水",
    drinkPossessionKind: "free",
    rarity: "r",
    effects: [{ kind: "perform", score: { value: 10 } }],
  },
  {
    id: "uroncha",
    name: "烏龍茶",
    drinkPossessionKind: "free",
    rarity: "r",
    effects: [{ kind: "perform", vitality: { value: 7 } }],
  },
  {
    id: "bitamindorinku",
    name: "ビタミンドリンク",
    drinkPossessionKind: "sense",
    rarity: "r",
    effects: [
      { kind: "getModifier", modifier: { kind: "goodCondition", duration: 3 } },
    ],
  },
  {
    id: "aisukohi",
    name: "アイスコーヒー",
    drinkPossessionKind: "sense",
    rarity: "r",
    effects: [{ kind: "getModifier", modifier: { kind: "focus", amount: 3 } }],
  },
  {
    id: "ruibosutei",
    name: "ルイボスティー",
    drinkPossessionKind: "logic",
    rarity: "r",
    effects: [
      {
        kind: "getModifier",
        modifier: { kind: "positiveImpression", amount: 3 },
      },
    ],
  },
  {
    id: "hottokohi",
    name: "ホットコーヒー",
    drinkPossessionKind: "logic",
    rarity: "r",
    effects: [
      { kind: "getModifier", modifier: { kind: "motivation", amount: 3 } },
    ],
  },
  {
    id: "mikkususumuji",
    name: "ミックススムージー",
    drinkPossessionKind: "free",
    necessaryProducerLevel: 8,
    rarity: "sr",
    effects: [{ kind: "exchangeHand" }, { kind: "recoverLife", value: 2 }],
  },
  {
    id: "rikabaridorinku",
    name: "リカバリドリンク",
    drinkPossessionKind: "free",
    necessaryProducerLevel: 15,
    rarity: "sr",
    effects: [{ kind: "recoverLife", value: 6 }],
  },
  {
    id: "furesshubinega",
    name: "フレッシュビネガー",
    drinkPossessionKind: "free",
    rarity: "sr",
    effects: [{ kind: "enhanceHand" }, { kind: "recoverLife", value: 3 }],
  },
  {
    id: "busutoekisu",
    name: "ブーストエキス",
    drinkPossessionKind: "free",
    necessaryProducerLevel: 55,
    rarity: "sr",
    cost: { kind: "life", value: 2 },
    effects: [
      {
        kind: "getModifier",
        modifier: { kind: "mightyPerformance", duration: 3, percentage: 30 },
      },
      {
        kind: "getModifier",
        modifier: { kind: "halfLifeConsumption", duration: 3 },
      },
    ],
  },
  {
    id: "sutaminabakuhatsudorinku",
    name: "スタミナ爆発ドリンク",
    drinkPossessionKind: "sense",
    necessaryProducerLevel: 21,
    rarity: "sr",
    effects: [
      {
        kind: "getModifier",
        modifier: { kind: "excellentCondition", duration: 1 },
      },
      { kind: "perform", vitality: { value: 9 } },
    ],
  },
  {
    id: "osharehabutei",
    name: "おしゃれハーブティー",
    drinkPossessionKind: "logic",
    necessaryProducerLevel: 21,
    rarity: "sr",
    effects: [
      {
        kind: "performLeveragingModifier",
        modifierKind: "positiveImpression",
        percentage: 100,
      },
      { kind: "perform", vitality: { value: 3 } },
    ],
  },
  {
    id: "hoeipurotein",
    name: "ホエイプロテイン",
    drinkPossessionKind: "free",
    rarity: "ssr",
    effects: [
      {
        kind: "getModifier",
        modifier: { kind: "additionalCardUsageCount", amount: 1 },
      },
    ],
  },
  {
    id: "hatsuboshisupesharuaojiru",
    name: "初星スペシャル青汁",
    drinkPossessionKind: "free",
    necessaryProducerLevel: 15,
    rarity: "ssr",
    effects: [{ kind: "generateCard" }],
  },
  {
    id: "gensenhatsuboshimakiato",
    name: "厳選初星マキアート",
    drinkPossessionKind: "sense",
    necessaryProducerLevel: 27,
    rarity: "ssr",
    effects: [
      {
        kind: "getModifier",
        modifier: {
          kind: "reactiveEffect",
          reactiveEffect: {
            trigger: { kind: "turnEnd" },
            effect: {
              kind: "getModifier",
              modifier: { kind: "focus", amount: 1 },
            },
          },
          representativeName: "厳選初星マキアート",
        },
      },
    ],
  },
  {
    id: "hatsuboshibusutoenaji",
    name: "初星ブーストエナジ",
    drinkPossessionKind: "sense",
    necessaryProducerLevel: 26,
    rarity: "ssr",
    effects: [
      {
        kind: "getModifier",
        modifier: { kind: "excellentCondition", duration: 2 },
      },
      { kind: "enhanceHand" },
    ],
  },
  {
    id: "gensenhatsuboshitei",
    name: "厳選初星ティー",
    drinkPossessionKind: "logic",
    necessaryProducerLevel: 27,
    rarity: "ssr",
    effects: [
      {
        kind: "getModifier",
        modifier: {
          kind: "reactiveEffect",
          reactiveEffect: {
            trigger: { kind: "turnEnd" },
            effect: {
              kind: "getModifier",
              modifier: { kind: "positiveImpression", amount: 1 },
            },
          },
          representativeName: "厳選初星ティー",
        },
      },
    ],
  },
  {
    id: "gensenhatsuboshiburendo",
    name: "厳選初星ブレンド",
    drinkPossessionKind: "logic",
    necessaryProducerLevel: 26,
    rarity: "ssr",
    effects: [
      {
        kind: "getModifier",
        modifier: {
          kind: "reactiveEffect",
          reactiveEffect: {
            trigger: { kind: "turnEnd" },
            effect: {
              kind: "getModifier",
              modifier: { kind: "motivation", amount: 1 },
            },
          },
          representativeName: "厳選初星ブレンド",
        },
      },
    ],
  },
  {
    id: "tokuseihatsuboshiekisu",
    name: "特製初星エキス",
    drinkPossessionKind: "logic",
    necessaryProducerLevel: 55,
    rarity: "ssr",
    cost: { kind: "life", value: 2 },
    effects: [
      {
        kind: "getModifier",
        modifier: {
          kind: "doubleEffect",
          cardSummaryKind: "active",
          duration: 1,
        },
      },
      {
        kind: "getModifier",
        modifier: { kind: "doubleLifeConsumption", duration: 1 },
      },
    ],
  },
] as const satisfies DrinkData[];

export type DrinkDataId = (typeof drinksAsConst)[number]["id"];

export const drinks: DrinkData[] = drinksAsConst;
