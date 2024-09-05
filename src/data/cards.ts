import { CardContentData, CardData, ProducePlan } from "../types";

export const findCardDataById = (id: CardData["id"]): CardData | undefined =>
  cards.find((card) => card.id === id);

export const getCardDataById = (id: CardData["id"]): CardData => {
  const card = findCardDataById(id);
  if (!card) {
    throw new Error(`Card not found: ${id}`);
  }
  return card;
};

export const getCardDataByConstId = (id: CardDataId): CardData =>
  getCardDataById(id);

export const isCardDataIdType = (id: string): id is CardDataId =>
  cards.some((e) => e.id === id);

/** 「ランダムな強化済みスキルカード（SSR）を、手札に生成」用の候補を返す */
export const filterGeneratableCardsData = (
  producePlanKind: ProducePlan["kind"],
) =>
  cards.filter(
    (card) =>
      card.cardProviderKind === "others" &&
      (card.cardPossessionKind === "free" ||
        card.cardPossessionKind === producePlanKind) &&
      card.rarity === "ssr",
  );

/** 全ての強化数の内容リストを返す */
export const getCardContentDataList = (
  card: CardData,
): [CardContentData, CardContentData, CardContentData, CardContentData] => {
  const noEnhanced = card.contents[0];
  if (card.contents[1] === undefined) {
    return [noEnhanced, noEnhanced, noEnhanced, noEnhanced];
  }
  const enhanced1: CardContentData = {
    ...noEnhanced,
    ...card.contents[1],
  };
  const enhanced2: CardContentData = {
    ...enhanced1,
    ...card.contents[2],
  };
  const enhanced3: CardContentData = {
    ...enhanced2,
    ...card.contents[3],
  };
  return [noEnhanced, enhanced1, enhanced2, enhanced3];
};

/**
 * プロデュース中やレッスン中の山札の整列順のための比較をする
 *
 * - 調査中だが、一部の判明した仕様は以下へまとめた
 *   - https://github.com/kjirou/gakumas-core/issues/55
 * - P図鑑の整列順とは異なる
 */
export const compareDeckOrder = (a: CardData, b: CardData) => {
  if (a.cardSummaryKind !== b.cardSummaryKind) {
    const points = { active: 0, mental: 1, trouble: 2 };
    return points[a.cardSummaryKind] - points[b.cardSummaryKind];
  }
  if (a.cardPossessionKind !== b.cardPossessionKind) {
    // センスとロジックは同時に所有できないので、それらの間で比較されることはない
    // つまり、実質的には、センス＞フリーとロジック＞フリーの比較のみをしている
    const points = { sense: 0, logic: 1, free: 2 };
    return points[a.cardPossessionKind] - points[b.cardPossessionKind];
  }
  if (a.rarity !== b.rarity) {
    const points = { ssr: 0, sr: 1, r: 2, c: 3 };
    return points[a.rarity] - points[b.rarity];
  }
  if (a.cardProviderKind !== b.cardProviderKind) {
    const points = { idol: 0, others: 1, supportCard: 1 };
    return points[a.cardProviderKind] - points[b.cardProviderKind];
  }
  // この整列順は、本家の仕様に基づいてない
  // 少なくとも、同じ種別のカードを並べるために行なっている
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

/**
 * スキルカードデータの定義
 *
 * - データ定義のルール
 *   - id は、名称を機械的に変換したもの
 *     - 名称が日本語の時は、カード名をヘボン式のローマ字で表記し、記号は除去するかハイフンに置き換えたもの
 *       - ヘボン式ローマ字書式参考資料: https://www.ezairyu.mofa.go.jp/passport/hebon.html
 *     - 名称が英語の時は、スペルのまま小文字表記にする
 *   - レコードの定義順は、本家のP図鑑のスキルカードの「通常」表示順へ合わせる。現状は以下の順になってそう、上から優先順位が高い。
 *     - rarity: "c" > "r" > "sr" > "ssr"
 *     - 固有種別: 非固有 > アイドル固有 > サポカ固有
 *     - cardKind: "active" > "mental" > "trouble"
 *     - アイドル固有カードなら: さき > てまり > なお > りなみ > せいか > ことね > ひろ > リーリヤ > ちな > うめ > (新規アイドルはおそらくは追加順)
 *     - cardPossessionKind: "free" > "sense" > "logic"
 *     - necessaryProducerLevel: ASC
 *   - プロパティの定義順
 *     - 第1階層
 *       - id, name は先頭
 *       - contents を除いて、先にアルファベット順
 *     - 第2階層以降
 *       - kind > *Kind > それ以外をアルファベット順
 * - TODO: eslint
 */
export const cardsAsConst = [
  {
    id: "apirunokihon",
    name: "アピールの基本",
    basic: true,
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "c",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [{ kind: "perform", score: { value: 9 } }],
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [{ kind: "perform", score: { value: 14 } }],
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      {
        cost: { kind: "normal", value: 1 },
        effects: [{ kind: "perform", score: { value: 15 } }],
      },
    ],
  },
  {
    id: "pozunokihon",
    name: "ポーズの基本",
    basic: true,
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "c",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "perform",
            score: { value: 2 },
            vitality: { value: 2 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "perform",
            score: { value: 6 },
            vitality: { value: 4 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "perform",
            score: { value: 8 },
            vitality: { value: 5 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "perform",
            score: { value: 10 },
            vitality: { value: 6 },
          },
        ],
      },
    ],
  },
  {
    id: "chosen",
    name: "挑戦",
    basic: true,
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "c",
    contents: [
      {
        condition: { kind: "hasGoodCondition" },
        cost: { kind: "normal", value: 7 },
        effects: [{ kind: "perform", score: { value: 25 } }],
        usableOncePerLesson: true,
      },
      {
        effects: [{ kind: "perform", score: { value: 37 } }],
      },
      {
        effects: [{ kind: "perform", score: { value: 44 } }],
      },
      {
        effects: [{ kind: "perform", score: { value: 50 } }],
      },
    ],
  },
  {
    id: "shikosakugo",
    name: "試行錯誤",
    basic: true,
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "c",
    contents: [
      {
        cost: { kind: "normal", value: 7 },
        effects: [{ kind: "perform", score: { times: 2, value: 8 } }],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 5 },
        effects: [{ kind: "perform", score: { times: 2, value: 10 } }],
      },
      {
        cost: { kind: "normal", value: 4 },
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [{ kind: "perform", score: { times: 2, value: 11 } }],
      },
    ],
  },
  {
    id: "kawaiishigusa",
    name: "可愛い仕草",
    basic: true,
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "c",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          {
            kind: "getModifier",
            modifier: {
              kind: "positiveImpression",
              amount: 2,
            },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 100,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: {
              kind: "positiveImpression",
              amount: 3,
            },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 120,
          },
        ],
      },
      {
        cost: { kind: "normal", value: 4 },
      },
      {
        cost: { kind: "normal", value: 3 },
      },
    ],
  },
  {
    id: "kibuntenkan",
    name: "気分転換",
    basic: true,
    cardProviderKind: "others",
    cardPossessionKind: "logic",
    cardSummaryKind: "active",
    rarity: "c",
    contents: [
      {
        cost: { kind: "life", value: 5 },
        effects: [{ kind: "performLeveragingVitality", percentage: 100 }],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "life", value: 3 },
        effects: [{ kind: "performLeveragingVitality", percentage: 110 }],
      },
      {
        effects: [{ kind: "performLeveragingVitality", percentage: 130 }],
      },
      {
        effects: [{ kind: "performLeveragingVitality", percentage: 140 }],
      },
    ],
  },
  {
    id: "hyogennokihon",
    name: "表現の基本",
    basic: true,
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    rarity: "c",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [{ kind: "perform", vitality: { value: 4 } }],
        usableOncePerLesson: true,
      },
      {
        effects: [{ kind: "perform", vitality: { value: 7 } }],
      },
      {
        effects: [{ kind: "perform", vitality: { value: 8 } }],
      },
      {
        effects: [{ kind: "perform", vitality: { value: 10 } }],
      },
    ],
  },
  {
    id: "furumainokihon",
    name: "振る舞いの基本",
    basic: true,
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    rarity: "c",
    contents: [
      {
        cost: { kind: "normal", value: 1 },
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "hyojonokihon",
    name: "表情の基本",
    basic: true,
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    rarity: "c",
    contents: [
      {
        cost: { kind: "normal", value: 1 },
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
        ],
      },
    ],
  },
  {
    id: "mesennokihon",
    name: "目線の基本",
    basic: true,
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    rarity: "c",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 3 },
          },
        ],
      },
    ],
  },
  {
    id: "ishikinokihon",
    name: "意識の基本",
    basic: true,
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    rarity: "c",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 7 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
        ],
      },
    ],
  },
  {
    id: "nemuke",
    name: "眠気",
    basic: true,
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "trouble",
    rarity: "c",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [],
        usableOncePerLesson: true,
      },
    ],
  },
  {
    id: "karuiashidori",
    name: "軽い足取り",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", score: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 9 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
      },
      {
        cost: { kind: "normal", value: 2 },
      },
    ],
  },
  {
    id: "aikyo",
    name: "愛嬌",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [{ kind: "perform", score: { value: 13 } }],
      },
      {
        effects: [{ kind: "perform", score: { value: 21 } }],
      },
      {
        cost: { kind: "normal", value: 3 },
      },
      {
        cost: { kind: "normal", value: 2 },
      },
    ],
  },
  {
    id: "jumbiundo",
    name: "準備運動",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", score: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 9 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", score: { value: 10 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
      },
    ],
  },
  {
    id: "fansa",
    name: "ファンサ",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 2,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [{ kind: "perform", score: { value: 10 } }],
      },
      {
        effects: [{ kind: "perform", score: { value: 16 } }],
      },
      {
        effects: [{ kind: "perform", score: { value: 19 } }],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "ikioimakase",
    name: "勢い任せ",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 9,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", score: { value: 6 } },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            modifier: { kind: "focus", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 9 } },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            modifier: { kind: "focus", amount: 4 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", score: { value: 10 } },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            modifier: { kind: "focus", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 12 } },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            modifier: { kind: "focus", amount: 3 },
          },
        ],
      },
    ],
  },
  {
    id: "haitatchi",
    name: "ハイタッチ",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 13,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", score: { focusMultiplier: 1.5, value: 17 } },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { focusMultiplier: 2, value: 23 } },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", score: { focusMultiplier: 2, value: 24 } },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
      },
    ],
  },
  {
    id: "tokutaimu",
    name: "トークタイム",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 14,
    rarity: "r",
    contents: [
      {
        condition: { kind: "hasGoodCondition" },
        cost: { kind: "normal", value: 6 },
        effects: [{ kind: "perform", score: { value: 27 } }],
        usableOncePerLesson: true,
      },
      {
        effects: [{ kind: "perform", score: { value: 38 } }],
      },
      {
        effects: [{ kind: "perform", score: { value: 44 } }],
      },
      {
        effects: [{ kind: "perform", score: { value: 50 } }],
      },
    ],
  },
  {
    id: "kyomoohayo",
    name: "今日もおはよう",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", score: { value: 7 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 9 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 12 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 16 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
        ],
      },
    ],
  },
  {
    id: "yurufuwaoshaveri",
    name: "ゆるふわおしゃべり",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "r",
    contents: [
      {
        cost: { kind: "life", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
          { kind: "performLeveragingVitality", percentage: 60 },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 4 },
          },
          { kind: "performLeveragingVitality", percentage: 80 },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 4 },
          },
          { kind: "performLeveragingVitality", percentage: 100 },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "mosukoshidake",
    name: "もう少しだけ",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "perform", score: { value: 10 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 15 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 19 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 4 },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "tebyoshi",
    name: "手拍子",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 13,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 150,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 200,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 4 },
      },
      {
        cost: { kind: "normal", value: 3 },
      },
    ],
  },
  {
    id: "genkinaaisatsu",
    name: "元気な挨拶",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 14,
    rarity: "r",
    contents: [
      {
        cost: { kind: "life", value: 4 },
        effects: [{ kind: "performLeveragingVitality", percentage: 110 }],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "life", value: 3 },
        effects: [{ kind: "performLeveragingVitality", percentage: 120 }],
      },
      {
        effects: [{ kind: "performLeveragingVitality", percentage: 140 }],
      },
      {
        effects: [{ kind: "performLeveragingVitality", percentage: 150 }],
      },
    ],
  },
  {
    id: "kiaijubun",
    name: "気合十分！",
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 16,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 3 },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "fasutosuteppu",
    name: "ファーストステップ",
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 16,
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "getModifier",
            condition: {
              kind: "measureValue",
              criterionKind: "greaterEqual",
              valueKind: "life",
              percentage: 50,
            },
            modifier: { kind: "lifeConsumptionReduction", value: 1 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 6 } },
          {
            kind: "getModifier",
            condition: {
              kind: "measureValue",
              criterionKind: "greaterEqual",
              valueKind: "life",
              percentage: 50,
            },
            modifier: { kind: "lifeConsumptionReduction", value: 1 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 8 } },
          {
            kind: "getModifier",
            condition: {
              kind: "measureValue",
              criterionKind: "greaterEqual",
              valueKind: "life",
              percentage: 50,
            },
            modifier: { kind: "lifeConsumptionReduction", value: 1 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 9 } },
          {
            kind: "getModifier",
            condition: {
              kind: "measureValue",
              criterionKind: "greaterEqual",
              valueKind: "life",
              percentage: 50,
            },
            modifier: { kind: "lifeConsumptionReduction", value: 1 },
          },
        ],
      },
    ],
  },
  {
    id: "baransukankaku",
    name: "バランス感覚",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
        ],
      },
    ],
  },
  {
    id: "rakkanteki",
    name: "楽観的",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 4,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            modifier: { kind: "focus", amount: 1 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            modifier: { kind: "focus", amount: 1 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 1 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "shinkokyu",
    name: "深呼吸",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 19,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 2 },
          },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "focus",
              range: { min: 3 },
            },
            modifier: { kind: "goodCondition", duration: 3 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "focus",
              range: { min: 3 },
            },
            modifier: { kind: "goodCondition", duration: 3 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "focus",
              range: { min: 3 },
            },
            modifier: { kind: "goodCondition", duration: 3 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
      },
    ],
  },
  {
    id: "hitokokyu",
    name: "ひと呼吸",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 47,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 7 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 5 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "risutato",
    name: "リスタート",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 3 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      {
        cost: { kind: "normal", value: 1 },
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
        ],
      },
    ],
  },
  {
    id: "eieio",
    name: "えいえいおー",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 4 },
          },
        ],
      },
    ],
  },
  {
    id: "rizumikaru",
    name: "リズミカル",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 2,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [{ kind: "perform", vitality: { value: 6 } }],
        usableOncePerLesson: true,
      },
      {
        effects: [{ kind: "perform", vitality: { value: 8 } }],
      },
      {
        effects: [{ kind: "perform", vitality: { value: 10 } }],
      },
      {
        effects: [{ kind: "perform", vitality: { value: 12 } }],
      },
    ],
  },
  {
    id: "omoidashiwarai",
    name: "思い出し笑い",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 4,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 3 },
          },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "positiveImpression",
              range: { min: 3 },
            },
            modifier: { kind: "motivation", amount: 2 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "positiveImpression",
              range: { min: 3 },
            },
            modifier: { kind: "motivation", amount: 3 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "positiveImpression",
              range: { min: 1 },
            },
            modifier: { kind: "motivation", amount: 3 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "positiveImpression",
              range: { min: 1 },
            },
            modifier: { kind: "motivation", amount: 4 },
          },
        ],
      },
    ],
  },
  {
    id: "pasuterukibun",
    name: "パステル気分",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 9,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 3 },
            },
            modifier: { kind: "positiveImpression", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 7 } },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 3 },
            },
            modifier: { kind: "positiveImpression", amount: 4 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      {
        cost: { kind: "normal", value: 1 },
      },
    ],
  },
  {
    id: "hagemashi",
    name: "励まし",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 19,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "getModifier", modifier: { kind: "motivation", amount: 3 } },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 6 },
            },
            modifier: { kind: "positiveImpression", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "getModifier", modifier: { kind: "motivation", amount: 4 } },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 6 },
            },
            modifier: { kind: "positiveImpression", amount: 5 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      {
        cost: { kind: "normal", value: 1 },
      },
    ],
  },
  {
    id: "shiawasenoomajinai",
    name: "幸せのおまじない",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 46,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 8 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 7 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 9 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "shinshinkiei",
    name: "新進気鋭",
    cardPossessionKind: "sense",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [{ kind: "perform", score: { value: 17 } }],
        usableOncePerLesson: true,
      },
      {
        effects: [{ kind: "perform", score: { value: 25 } }],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "ijippari",
    name: "意地っ張り",
    cardPossessionKind: "sense",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          { kind: "perform", score: { value: 7 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 7 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 5 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "ritorupurinsu",
    name: "リトル・プリンス",
    cardPossessionKind: "sense",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", score: { value: 8 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            score: { value: 3 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 13 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            score: { value: 5 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 15 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            score: { value: 6 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 19 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            score: { value: 6 },
          },
        ],
      },
    ],
  },
  {
    id: "hoyoryoku",
    name: "包容力",
    cardPossessionKind: "sense",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [
          { kind: "perform", score: { value: 2 }, vitality: { value: 1 } },
          { kind: "recoverLife", value: 2 },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 3 }, vitality: { value: 4 } },
          { kind: "recoverLife", value: 2 },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "furendori",
    name: "フレンドリー",
    cardPossessionKind: "sense",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          { kind: "perform", score: { value: 10 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "focus",
              range: { min: 6 },
            },
            score: { value: 10 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [{ kind: "perform", score: { times: 2, value: 12 } }],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "hajimetenogohobi",
    name: "初めてのご褒美",
    cardPossessionKind: "sense",
    cardProviderKind: "idol",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 2 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 3 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "hajimetenochihei",
    name: "初めての地平",
    cardPossessionKind: "sense",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          {
            kind: "performLeveragingModifier",
            modifierKind: "goodCondition",
            valueKind: "score",
            percentage: 200,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "performLeveragingModifier",
            modifierKind: "goodCondition",
            valueKind: "score",
            percentage: 250,
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "arubaita",
    name: "アルバイター",
    cardPossessionKind: "logic",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          { kind: "perform", score: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 6 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 12 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 6 },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "chokougakurekiaidoru",
    name: "超高学歴アイドル",
    cardPossessionKind: "logic",
    cardProviderKind: "idol",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 6 },
            },
            vitality: { value: 2 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 6 },
            },
            vitality: { value: 5 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "uchikikeishojo",
    name: "内気系少女",
    cardPossessionKind: "logic",
    cardProviderKind: "idol",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 1 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "positiveImpression", amount: 1 },
              },
              representativeName: "内気系少女",
              trigger: { kind: "turnEnd" },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 2 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "positiveImpression", amount: 1 },
              },
              representativeName: "内気系少女",
              trigger: { kind: "turnEnd" },
            },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "genkiippai",
    name: "元気いっぱい",
    cardPossessionKind: "logic",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "life", value: 4 },
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          { kind: "performLeveragingVitality", percentage: 50 },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 2 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          { kind: "performLeveragingVitality", percentage: 70 },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          { kind: "performLeveragingVitality", percentage: 80 },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          { kind: "performLeveragingVitality", percentage: 90 },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
        ],
      },
    ],
  },
  {
    id: "mikannotaiki",
    name: "未完の大器",
    cardPossessionKind: "logic",
    cardProviderKind: "idol",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "life", value: 3 },
        effects: [
          { kind: "perform", vitality: { boostPerCardUsed: 3, value: 2 } },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { boostPerCardUsed: 3, value: 4 } },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "hajimetenomirai",
    name: "初めての未来",
    cardPossessionKind: "logic",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "life", value: 5 },
        effects: [
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 190,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "life", value: 3 },
        effects: [
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 200,
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "hajimetenobasho",
    name: "初めての場所",
    cardPossessionKind: "logic",
    cardProviderKind: "idol",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "r",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 6 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 8 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "zentoyoyo",
    name: "前途洋々",
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 3,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", score: { value: 8 }, vitality: { value: 7 } },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 12 }, vitality: { value: 10 } },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", score: { value: 13 }, vitality: { value: 10 } },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "kimepozu",
    name: "決めポーズ",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [{ kind: "perform", score: { value: 18 } }],
        usableOncePerLesson: true,
      },
      {
        effects: [{ kind: "perform", score: { value: 27 } }],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "adoribu",
    name: "アドリブ",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", score: { value: 5 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 9 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", score: { value: 11 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "jonetsutan",
    name: "情熱ターン",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          { kind: "perform", score: { value: 11 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 18 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "perform", score: { value: 19 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 4 },
      },
    ],
  },
  {
    id: "hiyaku",
    name: "飛躍",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 6,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "perform", score: { value: 13 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "focus",
              range: { min: 6 },
            },
            score: { value: 15 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      {
        cost: { kind: "normal", value: 1 },
      },
      {
        cost: { kind: "normal", value: 0 },
      },
    ],
  },
  {
    id: "shukufuku",
    name: "祝福",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 7,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "life", value: 4 },
        effects: [
          { kind: "perform", score: { value: 26 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 1 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 40 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 1 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 46 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 1 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 52 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 1 },
          },
        ],
      },
    ],
  },
  {
    id: "sutatodasshu",
    name: "スタートダッシュ",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 22,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "perform", score: { value: 30 }, vitality: { value: 10 } },
          {
            kind: "getModifier",
            modifier: { kind: "doubleLifeConsumption", duration: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 40 }, vitality: { value: 10 } },
          {
            kind: "getModifier",
            modifier: { kind: "doubleLifeConsumption", duration: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 45 }, vitality: { value: 10 } },
          {
            kind: "getModifier",
            modifier: { kind: "doubleLifeConsumption", duration: 2 },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "sutandopure",
    name: "スタンドプレー",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 24,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "perform", score: { value: 12 }, vitality: { value: 7 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "doubleLifeConsumption", duration: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 12 }, vitality: { value: 7 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 7 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "doubleLifeConsumption", duration: 2 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 4 },
      },
      {
        cost: { kind: "normal", value: 3 },
      },
    ],
  },
  {
    id: "shupurehikoru",
    name: "シュプレヒコール",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 33,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "focus", value: 3 },
        effects: [
          { kind: "perform", score: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        cost: { kind: "focus", value: 2 },
        effects: [
          { kind: "perform", score: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 12 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 16 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
    ],
  },
  {
    id: "tachiichichekku",
    name: "立ち位置チェック",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 51,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "focus", value: 3 },
        effects: [
          { kind: "perform", score: { value: 25 }, vitality: { value: 15 } },
          {
            kind: "getModifier",
            modifier: { kind: "noVitalityIncrease", duration: 2 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 40 }, vitality: { value: 15 } },
          {
            kind: "getModifier",
            modifier: { kind: "noVitalityIncrease", duration: 2 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "raburiuinku",
    name: "ラブリーウインク",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 60,
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 80,
          },
        ],
      },
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 90,
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 100,
          },
        ],
      },
    ],
  },
  {
    id: "arigatonokotoba",
    name: "ありがとうの言葉",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    rarity: "sr",
    contents: [
      {
        cost: { kind: "life", value: 3 },
        effects: [
          { kind: "perform", vitality: { value: 9 } },
          {
            kind: "performLeveragingVitality",
            percentage: 40,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 11 } },
          {
            kind: "performLeveragingVitality",
            percentage: 70,
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 14 } },
          {
            kind: "performLeveragingVitality",
            percentage: 70,
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 17 } },
          {
            kind: "performLeveragingVitality",
            percentage: 70,
          },
        ],
      },
    ],
  },
  {
    id: "hatonoaizu",
    name: "ハートの合図",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 6,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "life", value: 3 },
        effects: [
          {
            kind: "performLeveragingVitality",
            reductionKind: "halve",
            percentage: 130,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "performLeveragingVitality",
            reductionKind: "halve",
            percentage: 180,
          },
        ],
      },
      {
        effects: [
          {
            kind: "performLeveragingVitality",
            reductionKind: "halve",
            percentage: 200,
          },
        ],
      },
      {
        effects: [
          {
            kind: "performLeveragingVitality",
            reductionKind: "halve",
            percentage: 230,
          },
        ],
      },
    ],
  },
  {
    id: "kirameki",
    name: "キラメキ",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 24,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 200,
          },
          {
            kind: "getModifier",
            modifier: { kind: "doubleLifeConsumption", duration: 2 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 250,
          },
          {
            kind: "getModifier",
            modifier: { kind: "doubleLifeConsumption", duration: 2 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      {
        cost: { kind: "normal", value: 1 },
      },
    ],
  },
  {
    id: "minnadaisuki",
    name: "みんな大好き",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 34,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "motivation", value: 3 },
        effects: [
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 90,
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        cost: { kind: "motivation", value: 2 },
        effects: [
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 120,
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 140,
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 160,
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
    ],
  },
  {
    id: "aidorusengen",
    name: "アイドル宣言",
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 23,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "life", value: 1 },
        effects: [
          { kind: "drawCards", amount: 2 },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 0 },
        effects: [
          {
            kind: "drawCards",
            amount: 2,
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 1 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "drawCards",
            amount: 2,
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 2 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "drawCards",
            amount: 2,
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 3 },
          },
        ],
      },
    ],
  },
  {
    id: "haitenshon",
    name: "ハイテンション",
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 23,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [
          { kind: "perform", vitality: { value: 11 } },
          {
            kind: "getModifier",
            modifier: { kind: "noVitalityIncrease", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 3 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 13 } },
          {
            kind: "getModifier",
            modifier: { kind: "noVitalityIncrease", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 15 } },
          {
            kind: "getModifier",
            modifier: { kind: "noVitalityIncrease", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 17 } },
          {
            kind: "getModifier",
            modifier: { kind: "noVitalityIncrease", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 4 },
          },
        ],
      },
    ],
  },
  {
    id: "ganriki",
    name: "眼力",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", vitality: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 8 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 11 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 14 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
        ],
      },
    ],
  },
  {
    id: "daiseien",
    name: "大声援",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", vitality: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 8 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 11 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "enshutsukeikaku",
    name: "演出計画",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 17,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "perform",
                vitality: { fixedValue: true, value: 2 },
              },
              representativeName: "演出計画",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "active",
              },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 4 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "perform",
                vitality: { fixedValue: true, value: 2 },
              },
              representativeName: "演出計画",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "active",
              },
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 5 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "perform",
                vitality: { fixedValue: true, value: 2 },
              },
              representativeName: "演出計画",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "active",
              },
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 6 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "perform",
                vitality: { fixedValue: true, value: 2 },
              },
              representativeName: "演出計画",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "active",
              },
            },
          },
        ],
      },
    ],
  },
  {
    id: "negainochikara",
    name: "願いの力",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 18,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 2 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "focus", amount: 1 },
              },
              representativeName: "願いの力",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "active",
              },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "focus", amount: 1 },
              },
              representativeName: "願いの力",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "active",
              },
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "focus", amount: 1 },
              },
              representativeName: "願いの力",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "active",
              },
            },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "shizukanaishi",
    name: "静かな意志",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 20,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 2 },
          },
        ],
        innate: true,
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
      },
      {
        cost: { kind: "normal", value: 2 },
      },
    ],
  },
  {
    id: "hajimarinoaizu",
    name: "始まりの合図",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 28,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 5 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 7 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "iji",
    name: "意地",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 29,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 5 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 1 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "sonzaikan",
    name: "存在感",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 31,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "goodCondition", value: 2 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        cost: { kind: "goodCondition", value: 1 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 6 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 7 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
    ],
  },
  {
    id: "seikohenomichisuji",
    name: "成功への道筋",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 36,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "goodCondition", value: 2 },
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 7 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 9 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 10 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 11 },
          },
        ],
      },
    ],
  },
  {
    id: "supottoraito",
    name: "スポットライト",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 49,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "life", value: 3 },
        effects: [
          { kind: "perform", vitality: { value: 7 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 9 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 5 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "afureruomoide",
    name: "あふれる思い出",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 5 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 8 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 5 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 10 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 5 },
          },
        ],
      },
    ],
  },
  {
    id: "fureai",
    name: "ふれあい",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 10 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 13 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
        ],
      },
    ],
  },
  {
    id: "shiawasenajikan",
    name: "幸せな時間",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 7,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 6 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 8 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 4 },
      },
      {
        cost: { kind: "normal", value: 3 },
      },
    ],
  },
  {
    id: "fanshichamu",
    name: "ファンシーチャーム",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 17,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "positiveImpression", amount: 1 },
              },
              representativeName: "ファンシーチャーム",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "mental",
              },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "positiveImpression", amount: 1 },
              },
              representativeName: "ファンシーチャーム",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "mental",
              },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "wakuwakugatomaranai",
    name: "ワクワクが止まらない",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 18,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "motivation", amount: 1 },
              },
              representativeName: "ワクワクが止まらない",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "mental",
              },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "motivation", amount: 1 },
              },
              representativeName: "ワクワクが止まらない",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "mental",
              },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 6 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "motivation", amount: 1 },
              },
              representativeName: "ワクワクが止まらない",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "mental",
              },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 1 },
      },
    ],
  },
  {
    id: "hombanzenya",
    name: "本番前夜",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    keywords: ["honbanzenya"],
    necessaryProducerLevel: 20,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
        ],
        innate: true,
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 4 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 4 },
      },
      {
        cost: { kind: "normal", value: 3 },
      },
    ],
  },
  {
    id: "hinatabokko",
    name: "ひなたぼっこ",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 22,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [
          { kind: "perform", vitality: { value: 11 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "doubleLifeConsumption", duration: 2 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 11 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 7 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "doubleLifeConsumption", duration: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 13 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 7 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "doubleLifeConsumption", duration: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 15 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 7 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "doubleLifeConsumption", duration: 2 },
          },
        ],
      },
    ],
  },
  {
    id: "imetore",
    name: "イメトレ",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 28,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", vitality: { value: 7 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 4 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 11 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 5 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
      },
      {
        cost: { kind: "normal", value: 2 },
      },
    ],
  },
  {
    id: "yarukihamanten",
    name: "やる気は満点",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 29,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 1 },
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
        ],
      },
    ],
  },
  {
    id: "yumemigokochi",
    name: "ゆめみごこち",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 32,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "positiveImpression", value: 2 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 4 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        cost: { kind: "positiveImpression", value: 1 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 6 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 7 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
    ],
  },
  {
    id: "tomerarenaiomoi",
    name: "止められない想い",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 48,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "life", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 4 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "otomegokoro",
    name: "オトメゴコロ",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 52,
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "motivation", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        cost: { kind: "motivation", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "positiveImpression",
              range: { min: 10 },
            },
            modifier: { kind: "positiveImpression", amount: 2 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "ichibanhayuzuranai",
    name: "一番は譲らない",
    cardPossessionKind: "sense",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          { kind: "perform", score: { value: 18 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 26 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 5 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "ronurufu",
    name: "ローン・ウルフ",
    cardPossessionKind: "sense",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "perform", score: { value: 12 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "focus",
              range: { min: 3 },
            },
            score: { value: 12 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      {
        cost: { kind: "normal", value: 1 },
      },
      {
        cost: { kind: "normal", value: 0 },
      },
    ],
  },
  {
    id: "rashisa",
    name: "らしさ",
    cardPossessionKind: "sense",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [
          { kind: "perform", score: { value: 4 } },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            modifier: { kind: "focus", amount: 3 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 6 } },
          {
            kind: "getModifier",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            modifier: { kind: "focus", amount: 4 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "yorisokimochi",
    name: "寄り添う気持ち",
    cardPossessionKind: "sense",
    cardProviderKind: "idol",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          { kind: "perform", vitality: { value: 10 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "perform", vitality: { value: 12 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 5 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 16 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 5 },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "yukinoippo",
    name: "勇気の一歩",
    cardPossessionKind: "sense",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", score: { focusMultiplier: 2, value: 17 } },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { focusMultiplier: 2.5, value: 24 } },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { focusMultiplier: 2.5, value: 28 } },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { focusMultiplier: 2.5, value: 32 } },
        ],
      },
    ],
  },
  {
    id: "colorfulcute",
    // 半角のように見える、少なくとも「!」は「届いて！」の「！」より横幅が短い
    name: "Colorful Cute!",
    cardPossessionKind: "logic",
    cardProviderKind: "idol",
    cardSummaryKind: "mental",
    keywords: ["karafurukyuto"],
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 6 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 8 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
      },
      {
        cost: { kind: "normal", value: 2 },
      },
    ],
  },
  {
    id: "kurushinogasuki",
    name: "苦しいのが好き",
    cardPossessionKind: "logic",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", vitality: { value: 6 } },
          {
            kind: "performLeveragingModifier",
            modifierKind: "motivation",
            valueKind: "score",
            percentage: 250,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 7 } },
          {
            kind: "performLeveragingModifier",
            modifierKind: "motivation",
            valueKind: "score",
            percentage: 350,
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 11 } },
          {
            kind: "performLeveragingModifier",
            modifierKind: "motivation",
            valueKind: "score",
            percentage: 350,
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 14 } },
          {
            kind: "performLeveragingModifier",
            modifierKind: "motivation",
            valueKind: "score",
            percentage: 350,
          },
        ],
      },
    ],
  },
  {
    id: "jumpakunoyosei",
    name: "純白の妖精",
    cardPossessionKind: "logic",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    keywords: ["junpakunoyosei"],
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 2 },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 120,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 2 },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 160,
          },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "isshokemmei",
    name: "いっしょけんめい",
    cardPossessionKind: "logic",
    cardProviderKind: "idol",
    cardSummaryKind: "mental",
    keywords: ["isshokkenmei"],
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 5 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 6 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 7 },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "datoonechan",
    name: "打倒お姉ちゃん",
    cardPossessionKind: "logic",
    cardProviderKind: "idol",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "life", value: 4 },
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "performLeveragingVitality",
            percentage: 100,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "performLeveragingVitality",
            percentage: 140,
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "performLeveragingVitality",
            percentage: 160,
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          {
            kind: "performLeveragingVitality",
            percentage: 180,
          },
        ],
      },
    ],
  },
  {
    id: "onechandamono",
    name: "お姉ちゃんだもの！",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        condition: {
          kind: "measureValue",
          criterionKind: "lessEqual",
          valueKind: "score",
          percentage: 100,
        },
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", score: { value: 6 }, vitality: { value: 6 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 10 }, vitality: { value: 9 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          { kind: "perform", score: { value: 11 }, vitality: { value: 9 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 1 },
      },
    ],
  },
  {
    id: "oatsuishisen",
    name: "おアツイ視線",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        condition: { kind: "countVitalityZero" },
        cost: { kind: "normal", value: 0 },
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 8 } },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "goshidogobentatsu",
    name: "ご指導ご鞭撻",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        condition: {
          kind: "measureValue",
          criterionKind: "greaterEqual",
          valueKind: "life",
          percentage: 50,
        },
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "perform", score: { value: 4 }, vitality: { value: 5 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "enhanceHand" },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      {
        cost: { kind: "normal", value: 1 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "sutoretchidangi",
    name: "ストレッチ談義",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "active",
    keywords: ["sutorecchidangi"],
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        condition: {
          kind: "countTurnNumber",
          min: 3,
        },
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", score: { value: 3 } },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "enhanceHand" },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 0 },
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "zenryokusapoto",
    name: "全力サポート",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 2 },
            },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 2 },
            },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 2 },
            },
          },
        ],
      },
    ],
  },
  {
    id: "kimegaodejidori",
    name: "キメ顔で自撮り",
    cardPossessionKind: "sense",
    cardProviderKind: "supportCard",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 2 },
          },
          {
            kind: "getModifier",
            condition: {
              kind: "measureValue",
              criterionKind: "greaterEqual",
              valueKind: "life",
              percentage: 50,
            },
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 3 },
          },
          {
            kind: "getModifier",
            condition: {
              kind: "measureValue",
              criterionKind: "greaterEqual",
              valueKind: "life",
              percentage: 50,
            },
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
      },
      {
        cost: { kind: "normal", value: 2 },
      },
    ],
  },
  {
    id: "nanikiteruno",
    name: "なに聴いてるの？",
    cardPossessionKind: "logic",
    cardProviderKind: "supportCard",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "sr",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          { kind: "recoverLife", value: 3 },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          { kind: "recoverLife", value: 5 },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          { kind: "recoverLife", value: 6 },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "koruresuponsu",
    name: "コール＆レスポンス",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    keywords: ["koruandoresuponsu"],
    necessaryProducerLevel: 11,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          { kind: "perform", score: { value: 15 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "focus",
              range: { min: 3 },
            },
            score: { value: 15 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 15 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "focus",
              range: { min: 3 },
            },
            score: { value: 34, focusMultiplier: 1.5 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 5 },
      },
      {
        cost: { kind: "normal", value: 4 },
      },
    ],
  },
  {
    id: "bazuwado",
    name: "バズワード",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 12,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 7 },
        condition: { kind: "hasGoodCondition" },
        effects: [
          {
            kind: "perform",
            score: { value: 38 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "perform",
            score: { value: 54 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "perform",
            score: { value: 63 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "perform",
            score: { value: 71 },
          },
        ],
      },
    ],
  },
  {
    id: "joju",
    name: "成就",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 41,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 10 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "perform", score: { value: 32 } },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 7 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "perform", score: { value: 40 } },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 9 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 7 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "perform", score: { value: 44 } },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 8 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 7 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "perform", score: { value: 46 } },
            },
          },
        ],
      },
    ],
  },
  {
    id: "miwakunopafomansu",
    name: "魅惑のパフォーマンス",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 43,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        condition: { kind: "hasGoodCondition" },
        cost: { kind: "normal", value: 8 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "perform", score: { value: 38 } },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 7 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "perform", score: { value: 47 } },
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "perform", score: { value: 56 } },
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "perform", score: { value: 65 } },
            },
          },
        ],
      },
    ],
  },
  {
    id: "shikonoentame",
    name: "至高のエンタメ",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 50,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "focus", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: { kind: "perform", score: { value: 4 } },
              representativeName: "至高のエンタメ",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "active",
              },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "focus", value: 2 },
        effects: [
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: { kind: "perform", score: { value: 5 } },
              representativeName: "至高のエンタメ",
              trigger: {
                kind: "beforeCardEffectActivation",
                cardSummaryKind: "active",
              },
            },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "kakusei",
    name: "覚醒",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 53,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "goodCondition", value: 1 },
        effects: [
          { kind: "perform", score: { times: 2, value: 3 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 4 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { times: 2, value: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "focus", amount: 6 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "200sumairu",
    name: "２００％スマイル",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    keywords: ["nihyakupasentosumairu"],
    necessaryProducerLevel: 11,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 100,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 6 },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 170,
          },
        ],
      },
      {
        cost: { kind: "normal", value: 5 },
      },
      {
        cost: { kind: "normal", value: 4 },
      },
    ],
  },
  {
    id: "kaika",
    name: "開花",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 12,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 6 },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "motivation",
            valueKind: "score",
            percentage: 200,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 8 },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "motivation",
            valueKind: "score",
            percentage: 300,
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 9 },
          },
          {
            kind: "performLeveragingModifier",
            modifierKind: "motivation",
            valueKind: "score",
            percentage: 300,
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "todoite",
    name: "届いて！",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 44,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "life", value: 2 },
        effects: [
          {
            kind: "performLeveragingVitality",
            reductionKind: "zero",
            percentage: 160,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "performLeveragingVitality",
            reductionKind: "zero",
            percentage: 220,
          },
        ],
      },
      {
        effects: [
          {
            kind: "performLeveragingVitality",
            reductionKind: "zero",
            percentage: 250,
          },
        ],
      },
      {
        effects: [
          {
            kind: "performLeveragingVitality",
            reductionKind: "zero",
            percentage: 280,
          },
        ],
      },
    ],
  },
  {
    id: "kagayakukimihe",
    name: "輝くキミへ",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 50,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "motivation", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "performLeveragingModifier",
                modifierKind: "positiveImpression",
                valueKind: "score",
                percentage: 30,
              },
              representativeName: "輝くキミへ",
              trigger: { kind: "beforeCardEffectActivation" },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "performLeveragingModifier",
                modifierKind: "positiveImpression",
                valueKind: "score",
                percentage: 50,
              },
              representativeName: "輝くキミへ",
              trigger: { kind: "beforeCardEffectActivation" },
            },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "anotokinoyakusoku",
    name: "あのときの約束",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "active",
    necessaryProducerLevel: 54,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "positiveImpression", value: 4 },
        effects: [
          { kind: "perform", vitality: { value: 9 } },
          { kind: "performLeveragingVitality", percentage: 100 },
          {
            kind: "performLeveragingModifier",
            modifierKind: "motivation",
            valueKind: "score",
            percentage: 150,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 14 } },
          { kind: "performLeveragingVitality", percentage: 130 },
          {
            kind: "performLeveragingModifier",
            modifierKind: "motivation",
            valueKind: "score",
            percentage: 200,
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "terebishutsuen",
    name: "テレビ出演",
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 5,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 1 },
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 4 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 5 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 8 } },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 5 },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "kanaetaiyume",
    name: "叶えたい夢",
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 10,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "life", value: 1 },
        effects: [
          { kind: "perform", vitality: { value: 8 } },
          {
            kind: "getModifier",
            modifier: { kind: "lifeConsumptionReduction", value: 1 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 9 } },
          {
            kind: "getModifier",
            modifier: { kind: "lifeConsumptionReduction", value: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 12 } },
          {
            kind: "getModifier",
            modifier: { kind: "lifeConsumptionReduction", value: 2 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 15 } },
          {
            kind: "getModifier",
            modifier: { kind: "lifeConsumptionReduction", value: 2 },
          },
        ],
      },
    ],
  },
  {
    id: "aidorudamashii",
    name: "アイドル魂",
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    keywords: ["aidorutamashii"],
    necessaryProducerLevel: 35,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          { kind: "perform", vitality: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "debuffProtection", times: 1 },
          },
        ],
        innate: true,
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 6 } },
          {
            kind: "getModifier",
            modifier: { kind: "debuffProtection", times: 1 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "enhanceHand" },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 1 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "shikirinaoshi",
    name: "仕切り直し",
    cardPossessionKind: "free",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 40,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "exchangeHand" },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 4 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      {
        cost: { kind: "normal", value: 1 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "kokumintekiaidoru",
    name: "国民的アイドル",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 25,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "goodCondition", value: 1 },
        effects: [
          { kind: "getModifier", modifier: { kind: "doubleEffect" } },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 8 } },
          { kind: "getModifier", modifier: { kind: "doubleEffect" } },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 13 } },
          { kind: "getModifier", modifier: { kind: "doubleEffect" } },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 16 } },
          { kind: "getModifier", modifier: { kind: "doubleEffect" } },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
    ],
  },
  {
    id: "miwakunoshisen",
    name: "魅惑の視線",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 30,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "focus", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 4 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 5 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 5 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 6 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 5 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 7 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 6 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
    ],
  },
  {
    id: "nariyamanaihakushu",
    name: "鳴り止まない拍手",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 38,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "getModifier", modifier: { kind: "focus", amount: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 2 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "getModifier", modifier: { kind: "focus", amount: 5 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 3 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 4 },
      },
      {
        cost: { kind: "normal", value: 3 },
      },
    ],
  },
  {
    id: "tenshinramman",
    name: "天真爛漫",
    cardPossessionKind: "sense",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    keywords: ["tenshinranman"],
    necessaryProducerLevel: 45,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          { kind: "getModifier", modifier: { kind: "focus", amount: 1 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                condition: {
                  kind: "countModifier",
                  modifierKind: "focus",
                  range: { min: 3 },
                },
                modifier: { kind: "focus", amount: 2 },
              },
              representativeName: "天真爛漫",
              trigger: { kind: "turnEnd" },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 3 },
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "watashigasuta",
    name: "私がスター",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 25,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "positiveImpression", value: 2 },
        effects: [
          { kind: "increaseRemainingTurns", amount: 1 },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "positiveImpression", value: 1 },
        effects: [
          { kind: "increaseRemainingTurns", amount: 1 },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          { kind: "drawCards", amount: 1 },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          { kind: "increaseRemainingTurns", amount: 1 },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          { kind: "drawCards", amount: 1 },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          { kind: "increaseRemainingTurns", amount: 1 },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          { kind: "drawCards", amount: 1 },
        ],
      },
    ],
  },
  {
    id: "hoshikuzusenseshon",
    name: "星屑センセーション",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 30,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "motivation", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 7 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          { kind: "drawCards", amount: 1 },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 8 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          { kind: "drawCards", amount: 1 },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 9 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          { kind: "drawCards", amount: 2 },
        ],
      },
    ],
  },
  {
    id: "notonohashinoketsui",
    name: "ノートの端の決意",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 37,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 3 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 3 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
      },
      {
        cost: { kind: "normal", value: 2 },
      },
    ],
  },
  {
    id: "tegakinomesseji",
    name: "手書きのメッセージ",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 39,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "positiveImpression", value: 2 },
        effects: [
          { kind: "perform", vitality: { value: 9 } },
          { kind: "perform", vitality: { value: 9 } },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "positiveImpression", value: 1 },
        effects: [
          { kind: "perform", vitality: { value: 10 } },
          { kind: "perform", vitality: { value: 10 } },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 11 } },
          { kind: "perform", vitality: { value: 11 } },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "tokimeki",
    name: "トキメキ",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 42,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 10 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 8 },
          },
          { kind: "getModifier", modifier: { kind: "motivation", amount: 5 } },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 9 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 10 },
          },
          { kind: "getModifier", modifier: { kind: "motivation", amount: 6 } },
        ],
      },
      {
        cost: { kind: "normal", value: 8 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 10 },
          },
          { kind: "getModifier", modifier: { kind: "motivation", amount: 7 } },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "nijiirodorima",
    name: "虹色ドリーマー",
    cardPossessionKind: "logic",
    cardProviderKind: "others",
    cardSummaryKind: "mental",
    necessaryProducerLevel: 45,
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 9 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 1 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                condition: {
                  kind: "countModifier",
                  modifierKind: "positiveImpression",
                  range: { min: 3 },
                },
                modifier: { kind: "positiveImpression", amount: 3 },
              },
              representativeName: "虹色ドリーマー",
              trigger: { kind: "turnEnd" },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                condition: {
                  kind: "countModifier",
                  modifierKind: "positiveImpression",
                  range: { min: 3 },
                },
                modifier: { kind: "positiveImpression", amount: 3 },
              },
              representativeName: "虹色ドリーマー",
              trigger: { kind: "turnEnd" },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 8 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                condition: {
                  kind: "countModifier",
                  modifierKind: "positiveImpression",
                  range: { min: 3 },
                },
                modifier: { kind: "positiveImpression", amount: 3 },
              },
              representativeName: "虹色ドリーマー",
              trigger: { kind: "turnEnd" },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 7 },
      },
    ],
  },
  {
    id: "zettainimakenai",
    name: "絶対に負けない",
    cardPossessionKind: "sense",
    cardSummaryKind: "active",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [{ kind: "perform", score: { value: 34 } }],
        usableOncePerLesson: true,
      },
      {
        effects: [{ kind: "perform", score: { value: 48 } }],
      },
      {
        cost: { kind: "normal", value: 5 },
        effects: [{ kind: "perform", score: { value: 49 } }],
      },
      {
        cost: { kind: "normal", value: 4 },
        effects: [{ kind: "perform", score: { value: 50 } }],
      },
    ],
  },
  {
    id: "sorezorenomichi",
    name: "それぞれの道",
    cardPossessionKind: "sense",
    cardSummaryKind: "active",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 7 },
        effects: [
          { kind: "perform", score: { value: 14 } },
          { kind: "getModifier", modifier: { kind: "focus", amount: 5 } },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", score: { value: 15 } },
          { kind: "getModifier", modifier: { kind: "focus", amount: 5 } },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", score: { value: 16 } },
          { kind: "getModifier", modifier: { kind: "focus", amount: 5 } },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          { kind: "perform", score: { value: 17 } },
          { kind: "getModifier", modifier: { kind: "focus", amount: 5 } },
        ],
      },
    ],
  },
  {
    id: "seisonohanagata",
    name: "盛装の華形",
    cardPossessionKind: "sense",
    cardSummaryKind: "active",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "perform", score: { value: 12 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            score: { value: 14 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 18 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            score: { value: 20 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 22 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            score: { value: 23 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 25 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "goodCondition",
              range: { min: 1 },
            },
            score: { value: 26 },
          },
        ],
      },
    ],
  },
  {
    id: "kyorikan",
    name: "距離感",
    cardPossessionKind: "sense",
    cardSummaryKind: "mental",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "getModifier", modifier: { kind: "focus", amount: 4 } },
          { kind: "recoverLife", value: 4 },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "getModifier", modifier: { kind: "focus", amount: 5 } },
          { kind: "recoverLife", value: 5 },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "wammoasuteppu",
    name: "ワンモアステップ",
    cardPossessionKind: "sense",
    cardSummaryKind: "active",
    cardProviderKind: "idol",
    keywords: ["wanmoasuteppu"],
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", score: { times: 2, value: 7 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "focus",
              range: { min: 6 },
            },
            score: { value: 7 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", score: { times: 2, value: 9 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "focus",
              range: { min: 6 },
            },
            score: { value: 9 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          { kind: "perform", score: { times: 2, value: 10 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "focus",
              range: { min: 6 },
            },
            score: { value: 9 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 1 },
      },
    ],
  },
  {
    id: "adorenarinzenkai",
    name: "アドレナリン全開",
    cardPossessionKind: "sense",
    cardSummaryKind: "mental",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 4 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 5 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 6 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 5 },
          },
        ],
      },
    ],
  },
  {
    id: "hinyarihitoyasumi",
    name: "ひんやり一休み",
    cardPossessionKind: "sense",
    cardSummaryKind: "active",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 8 },
        effects: [{ kind: "perform", score: { times: 3, value: 9 } }],
        usableOncePerLesson: true,
      },
      {
        effects: [{ kind: "perform", score: { times: 3, value: 14 } }],
      },
      {
        effects: [{ kind: "perform", score: { times: 3, value: 17 } }],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "nyudogumotokimi",
    name: "入道雲と、きみ",
    cardPossessionKind: "sense",
    cardSummaryKind: "mental",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
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
            modifier: { kind: "goodCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 2 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 5 },
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
            modifier: { kind: "goodCondition", duration: 5 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 2 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "basuniyurarete",
    name: "バスに揺られて",
    cardPossessionKind: "sense",
    cardSummaryKind: "active",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          // TODO: パラメータ追加と元気が1効果内なのか2効果なのかが不明、効果説明欄の改行の具合から判別できない
          { kind: "perform", score: { focusMultiplier: 2.3, value: 5 } },
          {
            kind: "perform",
            condition: {
              kind: "measureValue",
              valueKind: "life",
              criterionKind: "lessEqual",
              percentage: 50,
            },
            vitality: { value: 6 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { focusMultiplier: 2.6, value: 8 } },
          {
            kind: "perform",
            condition: {
              kind: "measureValue",
              valueKind: "life",
              criterionKind: "lessEqual",
              percentage: 50,
            },
            vitality: { value: 12 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "hajimetenoramune",
    name: "はじめてのラムネ",
    cardPossessionKind: "sense",
    cardSummaryKind: "active",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        condition: { kind: "hasGoodCondition" },
        effects: [
          { kind: "perform", score: { value: 9 } },
          {
            kind: "performLeveragingModifier",
            modifierKind: "goodCondition",
            valueKind: "score",
            percentage: 200,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 12 } },
          {
            kind: "performLeveragingModifier",
            modifierKind: "goodCondition",
            valueKind: "score",
            percentage: 300,
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "ochakaiheyokoso",
    name: "お茶会へようこそ♪",
    cardPossessionKind: "sense",
    cardSummaryKind: "mental",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "additionalCardUsageCount", amount: 1 },
          },
          { kind: "drawCards", amount: 1 },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          {
            kind: "getModifier",
            modifier: { kind: "excellentCondition", duration: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "additionalCardUsageCount", amount: 1 },
          },
          { kind: "drawCards", amount: 1 },
        ],
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "yosomihadame",
    name: "よそ見はダメ♪",
    cardPossessionKind: "logic",
    cardSummaryKind: "mental",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 7 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 9 },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 5 },
      },
      {
        cost: { kind: "normal", value: 4 },
      },
    ],
  },
  {
    id: "honkinoshumi",
    name: "本気の趣味",
    cardPossessionKind: "logic",
    cardSummaryKind: "mental",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 3 },
            },
            vitality: { value: 4 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 7 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 3 },
            },
            vitality: { value: 7 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 8 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 3 },
            },
            vitality: { value: 8 },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 10 } },
          {
            kind: "perform",
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 3 },
            },
            vitality: { value: 9 },
          },
        ],
      },
    ],
  },
  {
    id: "mokowakunaikara",
    name: "もう怖くないから",
    cardPossessionKind: "logic",
    cardSummaryKind: "mental",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 3 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "positiveImpression", amount: 1 },
              },
              representativeName: "もう怖くないから",
              trigger: { kind: "turnEnd" },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "positiveImpression", amount: 1 },
              },
              representativeName: "もう怖くないから",
              trigger: { kind: "turnEnd" },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 1 },
      },
      {
        cost: { kind: "normal", value: 0 },
      },
    ],
  },
  {
    id: "ojosamanoharebutai",
    name: "お嬢様の晴れ舞台",
    cardPossessionKind: "logic",
    cardSummaryKind: "active",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "life", value: 4 },
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          { kind: "performLeveragingVitality", percentage: 100 },
          { kind: "getModifier", modifier: { kind: "motivation", amount: 2 } },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 5 } },
          { kind: "performLeveragingVitality", percentage: 120 },
          { kind: "getModifier", modifier: { kind: "motivation", amount: 3 } },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 8 } },
          { kind: "performLeveragingVitality", percentage: 130 },
          { kind: "getModifier", modifier: { kind: "motivation", amount: 3 } },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 11 } },
          { kind: "performLeveragingVitality", percentage: 140 },
          { kind: "getModifier", modifier: { kind: "motivation", amount: 3 } },
        ],
      },
    ],
  },
  {
    id: "karamaruomoi",
    name: "絡まる想い",
    cardPossessionKind: "logic",
    cardSummaryKind: "mental",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 8 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 8 },
          },
        ],
        innate: true,
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 10 },
          },
        ],
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 11 },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "pow",
    name: "pow",
    cardPossessionKind: "logic",
    cardSummaryKind: "active",
    cardProviderKind: "idol",
    keywords: ["pau"],
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "life", value: 5 },
        effects: [
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 250,
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "life", value: 3 },
        effects: [
          {
            kind: "performLeveragingModifier",
            modifierKind: "positiveImpression",
            valueKind: "score",
            percentage: 260,
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "okkinaonigiri",
    name: "おっきなおにぎり",
    cardPossessionKind: "logic",
    cardSummaryKind: "mental",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "life", value: 3 },
        effects: [
          { kind: "perform", vitality: { boostPerCardUsed: 5, value: 2 } },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { boostPerCardUsed: 8, value: 2 } },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { boostPerCardUsed: 9, value: 2 } },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { boostPerCardUsed: 10, value: 2 } },
        ],
      },
    ],
  },
  {
    id: "hirusagarinosoyokaze",
    name: "昼下がりのそよ風",
    cardPossessionKind: "logic",
    cardSummaryKind: "mental",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "life", value: 3 },
        effects: [
          { kind: "getModifier", modifier: { kind: "motivation", amount: 7 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 3 },
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 3 },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "getModifier", modifier: { kind: "motivation", amount: 8 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 5 },
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 3 },
            },
          },
        ],
      },
      {
        effects: [
          { kind: "getModifier", modifier: { kind: "motivation", amount: 9 } },
          {
            kind: "getModifier",
            modifier: { kind: "motivation", amount: 6 },
            condition: {
              kind: "countModifier",
              modifierKind: "motivation",
              range: { min: 3 },
            },
          },
        ],
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "kingyosukuideshobu",
    name: "金魚すくいで勝負",
    cardPossessionKind: "logic",
    cardSummaryKind: "mental",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "life", value: 2 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 3 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "additionalCardUsageCount", amount: 1 },
          },
          { kind: "drawCards", amount: 1 },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          {
            kind: "getModifier",
            modifier: { kind: "additionalCardUsageCount", amount: 1 },
          },
          { kind: "drawCards", amount: 1 },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "natsunoyoinosenkohanabi",
    name: "夏の宵の線香花火",
    cardPossessionKind: "logic",
    cardSummaryKind: "mental",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "life", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 3 },
          },
          { kind: "getModifier", modifier: { kind: "motivation", amount: 2 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "positiveImpression", amount: 1 },
              },
              representativeName: "夏の宵の線香花火",
              trigger: {
                kind: "afterCardEffectActivation",
                effectKind: "vitality",
              },
            },
          },
        ],
        innate: true,
        usableOncePerLesson: true,
      },
      {
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
          { kind: "getModifier", modifier: { kind: "motivation", amount: 3 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "reactiveEffect",
              effect: {
                kind: "getModifier",
                modifier: { kind: "positiveImpression", amount: 1 },
              },
              representativeName: "夏の宵の線香花火",
              trigger: {
                kind: "afterCardEffectActivation",
                effectKind: "vitality",
              },
            },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "sapparihitoiki",
    name: "さっぱりひといき",
    cardPossessionKind: "logic",
    cardSummaryKind: "active",
    cardProviderKind: "idol",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "life", value: 5 },
        effects: [
          {
            kind: "perform",
            vitality: { motivationMultiplier: 2.3, value: 2 },
          },
          {
            kind: "performLeveragingVitality",
            percentage: 50,
          },
          {
            kind: "getModifier",
            modifier: { kind: "lifeConsumptionReduction", value: 1 },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "life", value: 4 },
        effects: [
          {
            kind: "perform",
            vitality: { motivationMultiplier: 2.3, value: 2 },
          },
          {
            kind: "performLeveragingVitality",
            percentage: 90,
          },
          {
            kind: "getModifier",
            modifier: { kind: "lifeConsumptionReduction", value: 1 },
          },
        ],
      },
      // TODO: ++
      {},
      // TODO: +++
      {},
    ],
  },
  {
    id: "hanamoyukisetsu",
    name: "花萌ゆ季節",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          { kind: "generateCard" },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 1 },
      },
      {
        cost: { kind: "normal", value: 0 },
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          { kind: "generateCard" },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
      },
    ],
  },
  {
    id: "hidamarinoseitokaishitsu",
    name: "陽だまりの生徒会室",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          { kind: "recoverLife", value: 3 },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 2 },
        effects: [
          { kind: "recoverLife", value: 5 },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 1 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "kokoronoarubamu",
    name: "心のアルバム",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "active",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 0 },
        effects: [
          { kind: "perform", score: { value: 3 }, vitality: { value: 3 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 2,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", score: { value: 6 }, vitality: { value: 5 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 2,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 7 }, vitality: { value: 7 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 2,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", score: { value: 8 }, vitality: { value: 8 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 2,
              effect: { kind: "drawCards", amount: 1 },
            },
          },
        ],
      },
    ],
  },
  {
    id: "teipatei",
    name: "ティーパーティ",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          { kind: "enhanceHand" },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 1 },
        effects: [
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          { kind: "drawCards", amount: 1 },
          { kind: "enhanceHand" },
        ],
      },
      {
        cost: { kind: "normal", value: 0 },
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
          { kind: "drawCards", amount: 1 },
          { kind: "enhanceHand" },
        ],
      },
    ],
  },
  {
    id: "hikarinosuteji",
    name: "光のステージ",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 3 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "lifeConsumptionReduction", value: 1 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 0 },
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 1 } },
          {
            kind: "getModifier",
            modifier: { kind: "lifeConsumptionReduction", value: 1 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 2 } },
          {
            kind: "getModifier",
            modifier: { kind: "lifeConsumptionReduction", value: 1 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
    ],
  },
  {
    id: "shinseitokaibakutan",
    name: "新生徒会爆誕！",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
        innate: true,
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 4 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "halfLifeConsumption", duration: 4 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 3 },
      },
      {
        cost: { kind: "normal", value: 2 },
      },
    ],
  },
  {
    id: "usureyukukabe",
    name: "薄れゆく壁",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 5 },
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "enhanceHand" },
            },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 2,
              effect: { kind: "enhanceHand" },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 2 },
      },
      {
        cost: { kind: "normal", value: 1 },
      },
      {
        cost: { kind: "normal", value: 0 },
      },
    ],
  },
  {
    id: "mizutamarisuteppu",
    name: "みずたまりステップ",
    cardPossessionKind: "free",
    cardProviderKind: "supportCard",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "life", value: 1 },
        effects: [
          { kind: "perform", vitality: { value: 3 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 8 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 10 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
      {
        effects: [
          { kind: "perform", vitality: { value: 12 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "additionalCardUsageCount",
              amount: 1,
            },
          },
        ],
      },
    ],
  },
  {
    id: "kenkasuruhodonakagaii",
    name: "喧嘩するほど仲がいい",
    cardPossessionKind: "sense",
    cardProviderKind: "supportCard",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          { kind: "getModifier", modifier: { kind: "focus", amount: 3 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 2 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "enhanceHand" },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        effects: [
          { kind: "getModifier", modifier: { kind: "focus", amount: 4 } },
          {
            kind: "getModifier",
            modifier: { kind: "goodCondition", duration: 4 },
          },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "enhanceHand" },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 5 },
      },
      // TODO: +++
      {},
    ],
  },
  {
    id: "damedamekukkingu",
    name: "ダメダメクッキング",
    cardPossessionKind: "logic",
    cardProviderKind: "supportCard",
    cardSummaryKind: "mental",
    nonDuplicative: true,
    rarity: "ssr",
    contents: [
      {
        cost: { kind: "normal", value: 7 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 4 },
          },
          { kind: "getModifier", modifier: { kind: "motivation", amount: 3 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "enhanceHand" },
            },
          },
        ],
        usableOncePerLesson: true,
      },
      {
        cost: { kind: "normal", value: 6 },
        effects: [
          {
            kind: "getModifier",
            modifier: { kind: "positiveImpression", amount: 5 },
          },
          { kind: "getModifier", modifier: { kind: "motivation", amount: 4 } },
          {
            kind: "getModifier",
            modifier: {
              kind: "delayedEffect",
              delay: 1,
              effect: { kind: "enhanceHand" },
            },
          },
        ],
      },
      {
        cost: { kind: "normal", value: 5 },
      },
      {
        cost: { kind: "normal", value: 4 },
      },
    ],
  },
] as const satisfies CardData[];

export type CardDataId = (typeof cardsAsConst)[number]["id"];

export const cards: CardData[] = cardsAsConst;
