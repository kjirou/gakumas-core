import { ProducerItemData } from "../types";

export const findProducerItemDataById = (
  id: ProducerItemData["id"],
): ProducerItemData | undefined =>
  producerItems.find((producerItem) => producerItem.id === id);

export const getProducerItemDataById = (
  id: ProducerItemData["id"],
): ProducerItemData => {
  const producerItem = findProducerItemDataById(id);
  if (!producerItem) {
    throw new Error(`Producer item not found: ${id}`);
  }
  return producerItem;
};

export const getProducerItemDataByConstId = (
  id: ProducerItemDataId,
): ProducerItemData => getProducerItemDataById(id);

export const isProducerItemDataIdType = (
  id: string,
): id is ProducerItemDataId => producerItems.some((e) => e.id === id);

/**
 * Pアイテムデータの定義
 *
 * - データ定義のルール
 *   - id は、名称を機械的に変換したもの
 *     - 名称が日本語の時は、Pアイテム名をヘボン式のローマ字で表記し、記号は除去するかハイフンに置き換えたもの
 *       - ヘボン式ローマ字書式参考資料: https://www.ezairyu.mofa.go.jp/passport/hebon.html
 *     - 名称が英語の時は、スペルのまま小文字表記にする
 *   - レコードの定義順は、本家のP図鑑のPアイテムの「通常」表示順へ合わせる。現状は以下の順になってそう、上から優先順位が高い。
 *     - rarity: "r" > "sr" > "ssr"
 *     - producerItemProviderKind: "others" > "idol" > "supportCard"
 *     - アイドル固有なら: さき > てまり > なお > りなみ > せいか > ことね > ひろ > リーリヤ > ちな > うめ > (新規アイドルはおそらくは追加順)
 *     - producerItemPossessionKind: "free" > "sense" > "logic"
 *   - プロパティの定義順
 *     - 第1階層
 *       - id, name は先頭
 *       - base と enhanced を除いて、先にアルファベット順
 *       - base > enhanced
 *     - 第2階層以降
 *       - kind > *Kind > それ以外をアルファベット順
 * - Pアイテムは、スキルカードと異なり、未強化と強化済みが別レコードとして図鑑の一覧に並んでいる。今のところ影響はないが、本家のデータ構造はスキルカードと異なるのかもしれない。
 * - TODO: eslint
 */
export const producerItemsAsConst = [
  {
    id: "bakuonraion",
    name: "ばくおんライオン",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 1 },
      },
      effects: [{ kind: "perform", score: { value: 6 } }],
      times: 1,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 1 },
      },
      effects: [{ kind: "perform", score: { value: 11 } }],
      times: 1,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "hikkeisutenresubotoru",
    name: "必携ステンレスボトル",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "focus",
        range: { min: 3 },
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 4 } },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "focus",
        range: { min: 3 },
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 6 } },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "shinshifuhankachifu",
    name: "紳士風ハンカチーフ",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 1 },
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 1 } },
      ],
      times: 2,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 1 },
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 2 } },
      ],
      times: 2,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "itsumonomeikupochi",
    name: "いつものメイクポーチ",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      condition: {
        kind: "measureValue",
        criterionKind: "greaterEqual",
        valueKind: "life",
        percentage: 50,
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 2 } },
      ],
      times: 1,
      trigger: {
        kind: "beforeCardEffectActivation",
        cardSummaryKind: "active",
      },
    },
    enhanced: {
      condition: {
        kind: "measureValue",
        criterionKind: "greaterEqual",
        valueKind: "life",
        percentage: 50,
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 3 } },
      ],
      times: 1,
      trigger: {
        kind: "beforeCardEffectActivation",
        cardSummaryKind: "active",
      },
    },
  },
  {
    id: "pinkunoosoroiburesu",
    name: "ピンクのお揃いブレス",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 1 } },
      ],
      times: 2,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 1 } },
      ],
      times: 3,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "hatsukoenoakashikotone",
    name: "初声の証・ことね",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 2 },
        },
      ],
      times: 1,
      trigger: {
        kind: "beforeCardEffectActivation",
        cardDataId: "hajimetenogohobi",
      },
    },
    enhanced: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 2 },
        },
        { kind: "perform", vitality: { fixedValue: true, value: 5 } },
      ],
      times: 1,
      trigger: {
        kind: "beforeCardEffectActivation",
        cardDataId: "hajimetenogohobi",
      },
    },
  },
  {
    id: "shoshinnoakashiririya",
    name: "初心の証・リーリヤ",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 6 },
      },
      cost: { kind: "life", value: 1 },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 2 },
        },
      ],
      times: 2,
      trigger: { kind: "turnEnd" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 6 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 2 },
        },
      ],
      times: 2,
      trigger: { kind: "turnEnd" },
    },
  },
  {
    id: "shoshinnoakashichina",
    name: "初心の証・千奈",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      condition: { kind: "countRemainingTurns", max: 1 },
      cost: { kind: "life", value: 1 },
      effects: [
        {
          kind: "perform",
          score: { value: 2, boostPerCardUsed: 1 },
        },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: { kind: "countRemainingTurns", max: 1 },
      cost: { kind: "life", value: 1 },
      effects: [
        {
          kind: "perform",
          score: { value: 6, boostPerCardUsed: 1 },
        },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "chibidomotezukurimedaru",
    name: "ちびども手作りメダル",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 6 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 2 },
        },
      ],
      times: 2,
      trigger: { kind: "turnEnd" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 6 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 2 },
        },
      ],
      times: 3,
      trigger: { kind: "turnEnd" },
    },
  },
  {
    id: "chozetsuammimmasuku",
    name: "超絶安眠マスク",
    keywords: ["chozetsuanminmasuku"],
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      condition: { kind: "countRemainingTurns", max: 1 },
      cost: { kind: "life", value: 1 },
      effects: [{ kind: "performLeveragingVitality", percentage: 50 }],
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: { kind: "countRemainingTurns", max: 1 },
      cost: { kind: "life", value: 1 },
      effects: [{ kind: "performLeveragingVitality", percentage: 70 }],
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "midorinoosoroiburesu",
    name: "緑のお揃いブレス",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 3 },
        },
      ],
      times: 1,
      trigger: { kind: "modifierIncrease", modifierKind: "positiveImpression" },
    },
    enhanced: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 5 },
        },
      ],
      times: 1,
      trigger: { kind: "modifierIncrease", modifierKind: "positiveImpression" },
    },
  },
  {
    id: "negaiwokanaeruomamori",
    name: "願いを叶えるお守り",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 2 },
        },
      ],
      times: 1,
      trigger: { kind: "modifierIncrease", modifierKind: "motivation" },
    },
    enhanced: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 3 },
        },
      ],
      times: 1,
      trigger: { kind: "modifierIncrease", modifierKind: "motivation" },
    },
  },
  {
    id: "tekunodoggu",
    name: "テクノドッグ",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "motivation",
        range: { min: 3 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 2 },
        },
      ],
      times: 1,
      trigger: { kind: "afterCardEffectActivation" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "motivation",
        range: { min: 3 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 3 },
        },
      ],
      times: 1,
      trigger: { kind: "afterCardEffectActivation" },
    },
  },
  {
    id: "hatsukoenoakashisaki",
    name: "初声の証・咲季",
    keywords: ["hatsugoenoakashisaki"],
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 2 },
        },
      ],
      times: 2,
      trigger: { kind: "lifeDecrease" },
    },
    enhanced: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 2 },
        },
      ],
      times: 3,
      trigger: { kind: "lifeDecrease" },
    },
  },
  {
    id: "hatsukoenoakashitemari",
    name: "初声の証・手毬",
    keywords: ["hatsugoenoakashitemari"],
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 6 },
      },
      effects: [
        {
          kind: "performLeveragingModifier",
          modifierKind: "positiveImpression",
          valueKind: "score",
          percentage: 100,
        },
      ],
      times: 2,
      trigger: { kind: "turnEnd" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 6 },
      },
      effects: [
        {
          kind: "performLeveragingModifier",
          modifierKind: "positiveImpression",
          valueKind: "score",
          percentage: 100,
        },
      ],
      times: 3,
      trigger: { kind: "turnEnd" },
    },
  },
  {
    id: "shoshinnoakashirinami",
    name: "初心の証・莉波",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "r",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 2 },
        },
      ],
      times: 2,
      trigger: { kind: "beforeCardEffectActivationEveryNTimes", interval: 3 },
    },
    enhanced: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 3 },
        },
      ],
      times: 2,
      trigger: { kind: "beforeCardEffectActivationEveryNTimes", interval: 3 },
    },
  },
  {
    id: "sakinokanzenshokureshipi",
    name: "咲季の完全食レシピ",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "sr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 1 },
      },
      effects: [{ kind: "perform", vitality: { value: 9 } }],
      times: 1,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 1 },
      },
      effects: [{ kind: "perform", vitality: { value: 12 } }],
      times: 1,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "watashinohatsunogakufu",
    name: "私の「初」の楽譜",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "sr",
    base: {
      condition: { kind: "countVitality", range: { max: 0, min: 0 } },
      effects: [
        { kind: "drainLife", value: 1 },
        { kind: "getModifier", modifier: { kind: "focus", amount: 3 } },
      ],
      times: 2,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: { kind: "countVitality", range: { max: 0, min: 0 } },
      effects: [
        { kind: "drainLife", value: 1 },
        { kind: "getModifier", modifier: { kind: "focus", amount: 4 } },
      ],
      times: 2,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "dearritorupurinsu",
    name: "Dearリトルプリンス",
    keywords: ["deiaritorupurinsu"],
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "sr",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 3 },
        },
      ],
      times: 1,
      trigger: { kind: "modifierIncrease", modifierKind: "goodCondition" },
    },
    enhanced: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 4 },
        },
      ],
      times: 1,
      trigger: { kind: "modifierIncrease", modifierKind: "goodCondition" },
    },
  },
  {
    id: "kimihenosashiire",
    name: "きみへの差し入れ",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "sr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "focus",
        range: { min: 5 },
      },
      effects: [{ kind: "recoverLife", value: 2 }],
      times: 3,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "focus",
        range: { min: 5 },
      },
      effects: [{ kind: "recoverLife", value: 4 }],
      times: 3,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "hokagonorakugaki",
    name: "放課後のらくがき",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "sr",
    base: {
      condition: {
        kind: "measureValue",
        criterionKind: "greaterEqual",
        valueKind: "life",
        percentage: 50,
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 2 } },
      ],
      times: 2,
      trigger: { kind: "modifierIncrease", modifierKind: "focus" },
    },
    enhanced: {
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 2 } },
      ],
      times: 2,
      trigger: { kind: "modifierIncrease", modifierKind: "focus" },
    },
  },
  {
    id: "okininosunika",
    name: "お気にのスニーカー",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "sr",
    base: {
      condition: { kind: "countVitality", range: { min: 7 } },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 4 },
        },
      ],
      times: 1,
      trigger: { kind: "turnEnd" },
    },
    enhanced: {
      condition: { kind: "countVitality", range: { min: 7 } },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 5 },
        },
      ],
      times: 1,
      trigger: { kind: "turnEnd" },
    },
  },
  {
    id: "daredemowakarunyumonsho",
    name: "だれでもわかる入門書",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "sr",
    base: {
      condition: { kind: "countVitality", range: { min: 7 } },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 5 },
        },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: { kind: "countVitality", range: { min: 7 } },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 6 },
        },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "omoiderobo",
    name: "思い出ロボ",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "sr",
    base: {
      condition: {
        kind: "measureValue",
        criterionKind: "greaterEqual",
        valueKind: "life",
        percentage: 50,
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 3 },
        },
      ],
      times: 1,
      trigger: { kind: "turnEnd" },
    },
    enhanced: {
      condition: {
        kind: "measureValue",
        criterionKind: "greaterEqual",
        valueKind: "life",
        percentage: 50,
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 4 },
        },
      ],
      times: 1,
      trigger: { kind: "turnEnd" },
    },
  },
  {
    id: "shogenaihankachi",
    name: "しょげないハンカチ",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "sr",
    base: {
      effects: [
        { kind: "performLeveragingVitality", percentage: 60 },
        { kind: "drainLife", value: 2 },
      ],
      times: 2,
      trigger: {
        kind: "afterCardEffectActivation",
        cardSummaryKind: "active",
      },
    },
    enhanced: {
      effects: [
        { kind: "performLeveragingVitality", percentage: 70 },
        { kind: "drainLife", value: 2 },
      ],
      times: 2,
      trigger: {
        kind: "afterCardEffectActivation",
        cardSummaryKind: "active",
      },
    },
  },
  {
    id: "shibainuposhetto",
    name: "柴犬ポシェット",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "sr",
    base: {
      effects: [{ kind: "perform", vitality: { value: 5 } }],
      times: 2,
      trigger: { kind: "turnStartEveryNTurns", interval: 2 },
    },
    enhanced: {
      effects: [{ kind: "perform", vitality: { value: 5 } }],
      times: 3,
      trigger: { kind: "turnStartEveryNTurns", interval: 2 },
    },
  },
  {
    id: "hatsuboshitecho",
    name: "はつぼし手帳",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "others",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "focus",
        range: { min: 5 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: {
            kind: "additionalCardUsageCount",
            amount: 1,
          },
        },
        { kind: "getModifier", modifier: { kind: "focus", amount: 2 } },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "hatsuboshitshatsu",
    name: "はつぼしTシャツ",
    keywords: ["hatsuboshiteishatsu"],
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "others",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 1 },
      },
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
          modifier: { kind: "goodCondition", duration: 2 },
        },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "hatsuboshikihoruda",
    name: "はつぼしキーホルダー",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "others",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 3 },
      },
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
          modifier: { kind: "positiveImpression", amount: 3 },
        },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "masukottohikonin",
    name: "マスコット（非公認）",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "others",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "motivation",
        range: { min: 5 },
      },
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
          modifier: { kind: "motivation", amount: 3 },
        },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "tomonitatakautaoru",
    name: "共に戦うタオル",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 1 },
        },
        {
          kind: "getModifier",
          modifier: {
            kind: "additionalCardUsageCount",
            amount: 1,
          },
        },
      ],
      times: 1,
      trigger: {
        kind: "afterCardEffectActivation",
        cardSummaryKind: "active",
      },
    },
    enhanced: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 1 },
        },
        {
          kind: "getModifier",
          modifier: {
            kind: "additionalCardUsageCount",
            amount: 1,
          },
        },
        { kind: "perform", vitality: { value: 5 } },
      ],
      times: 1,
      trigger: {
        kind: "afterCardEffectActivation",
        cardSummaryKind: "active",
      },
    },
  },
  {
    id: "jibunwomamoruiyahon",
    name: "自分を守るイヤホン",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "focus",
        range: { min: 5 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: {
            kind: "additionalCardUsageCount",
            amount: 1,
          },
        },
        { kind: "getModifier", modifier: { kind: "focus", amount: 1 } },
      ],
      times: 1,
      trigger: { kind: "beforeCardEffectActivation" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "focus",
        range: { min: 5 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: {
            kind: "additionalCardUsageCount",
            amount: 1,
          },
        },
        { kind: "getModifier", modifier: { kind: "focus", amount: 3 } },
      ],
      times: 1,
      trigger: { kind: "beforeCardEffectActivation" },
    },
  },
  {
    id: "uchinaruhikarinomimikazari",
    name: "内なる光の耳飾り",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 1 },
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 2 } },
        { kind: "perform", vitality: { value: 1 } },
      ],
      times: 2,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 1 },
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 3 } },
        { kind: "perform", vitality: { value: 1 } },
      ],
      times: 2,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "toshindainoredeirippu",
    name: "等身大のレディリップ",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: { kind: "countRemainingTurns", max: 2 },
      effects: [{ kind: "perform", score: { value: 5 } }],
      times: 2,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: { kind: "countRemainingTurns", max: 3 },
      effects: [{ kind: "perform", score: { value: 5 } }],
      times: 3,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "gesennosenrihin",
    name: "ゲーセンの戦利品",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 3 } },
      ],
      times: 1,
      trigger: { kind: "lessonStart" },
    },
    enhanced: {
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 4 } },
      ],
      times: 1,
      trigger: { kind: "lessonStart" },
    },
  },
  {
    id: "saikonihappinominamoto",
    name: "最高にハッピーの源",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 3 },
        },
        { kind: "perform", vitality: { fixedValue: true, value: 5 } },
      ],
      times: 1,
      trigger: {
        kind: "beforeCardEffectActivation",
        cardDataId: "adorenarinzenkai",
      },
    },
    enhanced: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 3 },
        },
        { kind: "perform", vitality: { fixedValue: true, value: 11 } },
      ],
      times: 1,
      trigger: {
        kind: "beforeCardEffectActivation",
        cardDataId: "adorenarinzenkai",
      },
    },
  },
  {
    id: "saigononatsunoomoide",
    name: "最後の夏の思い出",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "focus",
        range: { min: 3 },
      },
      effects: [{ kind: "perform", vitality: { value: 10 } }],
      times: 1,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "focus",
        range: { min: 3 },
      },
      effects: [{ kind: "perform", vitality: { value: 14 } }],
      times: 1,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "kimitowakeaunatsu",
    name: "きみと分け合う夏",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "halfLifeConsumption",
        range: { min: 1 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "excellentCondition", duration: 1 },
        },
        { kind: "drawCards", amount: 1 },
      ],
      times: 2,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "halfLifeConsumption",
        range: { min: 1 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "excellentCondition", duration: 1 },
        },
        { kind: "drawCards", amount: 1 },
      ],
      times: 3,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "madaminusekaihe",
    name: "まだ見ぬ世界へ",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "measureValue",
        valueKind: "life",
        criterionKind: "lessEqual",
        percentage: 50,
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 5 } },
        {
          kind: "getModifier",
          modifier: { kind: "lifeConsumptionReduction", value: 2 },
        },
        { kind: "enhanceHand" },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: {
        kind: "measureValue",
        valueKind: "life",
        criterionKind: "lessEqual",
        percentage: 50,
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "focus", amount: 7 } },
        {
          kind: "getModifier",
          modifier: { kind: "lifeConsumptionReduction", value: 3 },
        },
        { kind: "enhanceHand" },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "binnonakanokirameki",
    name: "瓶の中のきらめき",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 6 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 2 },
        },
      ],
      times: 3,
      trigger: { kind: "turnEnd" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "goodCondition",
        range: { min: 3 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "goodCondition", duration: 2 },
        },
      ],
      times: 4,
      trigger: { kind: "turnEnd" },
    },
  },
  {
    id: "tokimekinoippai",
    name: "ときめきのいっぱい",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countRemainingTurns",
        max: 1,
      },
      cost: { kind: "life", value: 2 },
      effects: [
        {
          kind: "perform",
          score: { boostPerCardUsed: 3, value: 3 },
        },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: {
        kind: "countRemainingTurns",
        max: 1,
      },
      effects: [
        {
          kind: "perform",
          score: { boostPerCardUsed: 3, value: 5 },
        },
      ],
      times: 1,
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "onsennoatonootanoshimi",
    name: "温泉の後のお楽しみ",
    producerItemPossessionKind: "sense",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      effects: [
        {
          kind: "multiplyModifier",
          modifierKind: "focus",
          multiplier: 1.3,
        },
        {
          kind: "perform",
          vitality: { fixedValue: true, value: 2 },
        },
      ],
      times: 2,
      trigger: { kind: "beforeCardEffectActivationEveryNTimes", interval: 4 },
    },
    enhanced: {
      effects: [
        {
          kind: "multiplyModifier",
          modifierKind: "focus",
          multiplier: 1.3,
        },
        {
          kind: "perform",
          vitality: { fixedValue: true, value: 7 },
        },
      ],
      times: 2,
      trigger: { kind: "beforeCardEffectActivationEveryNTimes", interval: 4 },
    },
  },
  {
    id: "piggudorimuchokimbako",
    name: "ピッグドリーム貯金箱",
    keywords: ["piggudorimuchokinbako", "biggudorimuchokinbako"],
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 6 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 3 },
        },
        {
          kind: "getModifier",
          modifier: {
            kind: "additionalCardUsageCount",
            amount: 1,
          },
        },
      ],
      times: 1,
      trigger: { kind: "afterCardEffectActivation" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 6 },
      },
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
      times: 1,
      trigger: { kind: "afterCardEffectActivation" },
    },
  },
  {
    id: "michikusakenkyunoto",
    name: "みちくさ研究ノート",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: { kind: "countRemainingTurns", max: 2 },
      effects: [
        { kind: "performLeveragingVitality", percentage: 50 },
        { kind: "drainLife", value: 1 },
      ],
      trigger: { kind: "turnStart" },
    },
    enhanced: {
      condition: { kind: "countRemainingTurns", max: 2 },
      effects: [
        { kind: "performLeveragingVitality", percentage: 65 },
        { kind: "drainLife", value: 1 },
      ],
      trigger: { kind: "turnStart" },
    },
  },
  {
    id: "yumehenoraifurogu",
    name: "夢へのライフログ",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: { kind: "countVitality", range: { min: 7 } },
      effects: [
        {
          kind: "multiplyModifier",
          modifierKind: "positiveImpression",
          multiplier: 1.5,
        },
        {
          kind: "performLeveragingModifier",
          modifierKind: "positiveImpression",
          valueKind: "score",
          percentage: 30,
        },
      ],
      times: 1,
      trigger: { kind: "turnEnd" },
    },
    enhanced: {
      condition: { kind: "countVitality", range: { min: 7 } },
      effects: [
        {
          kind: "multiplyModifier",
          modifierKind: "positiveImpression",
          multiplier: 1.5,
        },
        {
          kind: "performLeveragingModifier",
          modifierKind: "positiveImpression",
          valueKind: "score",
          percentage: 100,
        },
      ],
      times: 1,
      trigger: { kind: "turnEnd" },
    },
  },
  {
    id: "himitsutokkunkade",
    name: "ひみつ特訓カーデ",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      effects: [
        { kind: "getModifier", modifier: { kind: "motivation", amount: 3 } },
      ],
      times: 2,
      trigger: { kind: "modifierIncrease", modifierKind: "motivation" },
    },
    enhanced: {
      effects: [
        { kind: "getModifier", modifier: { kind: "motivation", amount: 3 } },
      ],
      times: 3,
      trigger: { kind: "modifierIncrease", modifierKind: "motivation" },
    },
  },
  {
    id: "koregawatashi",
    name: "これが、私",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 10 },
      },
      effects: [
        {
          kind: "performLeveragingModifier",
          modifierKind: "positiveImpression",
          valueKind: "score",
          percentage: 100,
        },
        { kind: "perform", vitality: { value: 3 } },
      ],
      times: 2,
      trigger: { kind: "turnEnd" },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 10 },
      },
      effects: [
        {
          kind: "performLeveragingModifier",
          modifierKind: "positiveImpression",
          valueKind: "score",
          percentage: 100,
        },
        { kind: "perform", vitality: { value: 3 } },
      ],
      times: 3,
      trigger: { kind: "turnEnd" },
    },
  },
  {
    id: "korogaritsuzukerugenkinominamoto",
    name: "転がり続ける元気の源",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "motivation",
        range: { min: 5 },
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "motivation", amount: 3 } },
        {
          kind: "getModifier",
          modifier: {
            kind: "additionalCardUsageCount",
            amount: 1,
          },
        },
      ],
      times: 1,
      trigger: {
        kind: "afterCardEffectActivation",
        cardSummaryKind: "mental",
      },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "motivation",
        range: { min: 5 },
      },
      effects: [
        { kind: "getModifier", modifier: { kind: "motivation", amount: 5 } },
        {
          kind: "getModifier",
          modifier: {
            kind: "additionalCardUsageCount",
            amount: 1,
          },
        },
      ],
      times: 1,
      trigger: {
        kind: "afterCardEffectActivation",
        cardSummaryKind: "mental",
      },
    },
  },
  {
    id: "kachihenokodawari",
    name: "勝ちへのこだわり",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 2 },
        },
      ],
      times: 4,
      trigger: { kind: "lifeDecrease" },
    },
    enhanced: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 2 },
        },
      ],
      trigger: { kind: "lifeDecrease" },
    },
  },
  {
    id: "kaerujirushinosempuki",
    name: "カエル印の扇風機",
    keywords: ["kaerushirushinosenpuki"],
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "motivation",
        range: { min: 12 },
      },
      cost: { kind: "life", value: 2 },
      effects: [
        {
          kind: "performLeveragingModifier",
          modifierKind: "motivation",
          valueKind: "score",
          percentage: 270,
        },
      ],
      times: 4,
      trigger: {
        kind: "afterCardEffectActivation",
        cardSummaryKind: "active",
      },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "motivation",
        range: { min: 12 },
      },
      cost: { kind: "life", value: 2 },
      effects: [
        {
          kind: "performLeveragingModifier",
          modifierKind: "motivation",
          valueKind: "score",
          percentage: 340,
        },
      ],
      times: 4,
      trigger: {
        kind: "afterCardEffectActivation",
        cardSummaryKind: "active",
      },
    },
  },
  {
    id: "yabureshirazunopoi",
    name: "敗れ知らずのポイ",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 6 },
      },
      effects: [
        {
          kind: "recoverLife",
          value: 4,
        },
      ],
      times: 2,
      trigger: {
        kind: "turnStart",
      },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 6 },
      },
      effects: [
        {
          kind: "recoverLife",
          value: 5,
        },
      ],
      times: 2,
      trigger: {
        kind: "turnStart",
      },
    },
  },
  {
    id: "pachipachisenkohanabi",
    name: "ぱちぱち線香花火",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 6 },
      },
      cost: { kind: "life", value: 1 },
      effects: [
        {
          kind: "performLeveragingModifier",
          modifierKind: "positiveImpression",
          valueKind: "vitality",
          percentage: 100,
        },
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 2 },
        },
      ],
      times: 4,
      trigger: {
        kind: "turnStartEveryNTurns",
        interval: 3,
      },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "positiveImpression",
        range: { min: 6 },
      },
      cost: { kind: "life", value: 1 },
      effects: [
        {
          kind: "performLeveragingModifier",
          modifierKind: "positiveImpression",
          valueKind: "vitality",
          percentage: 100,
        },
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 3 },
        },
      ],
      trigger: {
        kind: "turnStartEveryNTurns",
        interval: 3,
      },
    },
  },
  {
    id: "patapatauchiwa",
    name: "ぱたぱたうちわ",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      effects: [
        {
          kind: "perform",
          vitality: { value: 1 },
        },
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 3 },
        },
      ],
      times: 2,
      trigger: {
        kind: "beforeCardEffectActivationEveryNTimes",
        interval: 3,
      },
    },
    enhanced: {
      effects: [
        {
          kind: "perform",
          vitality: { value: 2 },
        },
        {
          kind: "getModifier",
          modifier: { kind: "motivation", amount: 4 },
        },
      ],
      times: 2,
      trigger: {
        kind: "beforeCardEffectActivationEveryNTimes",
        interval: 3,
      },
    },
  },
  {
    id: "sutairisshumodo",
    name: "スタイリッシュモード",
    producerItemPossessionKind: "logic",
    producerItemProviderKind: "idol",
    rarity: "ssr",
    base: {
      condition: {
        kind: "countModifier",
        modifierKind: "motivation",
        range: { min: 3 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 3 },
        },
        {
          kind: "drainModifier",
          modifierKind: "motivation",
          value: 1,
        },
      ],
      times: 3,
      trigger: {
        kind: "turnStart",
      },
    },
    enhanced: {
      condition: {
        kind: "countModifier",
        modifierKind: "motivation",
        range: { min: 3 },
      },
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "positiveImpression", amount: 3 },
        },
        {
          kind: "drainModifier",
          modifierKind: "motivation",
          value: 1,
        },
      ],
      times: 4,
      trigger: {
        kind: "turnStart",
      },
    },
  },
  {
    id: "etainoshirenaimono",
    name: "得体の知れないモノ",
    producerItemPossessionKind: "free",
    producerItemProviderKind: "supportCard",
    rarity: "ssr",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "mightyPerformance", duration: 1, percentage: 50 },
        },
      ],
      times: 3,
      trigger: { kind: "turnStart", idolParameterKind: "visual" },
    },
  },
  {
    id: "hoshinoritorupurinsu",
    name: "星のリトルプリンス",
    producerItemPossessionKind: "free",
    producerItemProviderKind: "supportCard",
    rarity: "ssr",
    base: {
      effects: [{ kind: "perform", vitality: { fixedValue: true, value: 2 } }],
      times: 3,
      trigger: { kind: "turnStart", idolParameterKind: "visual" },
    },
  },
  {
    id: "kuyashisanoshocho",
    name: "悔しさの象徴",
    producerItemPossessionKind: "free",
    producerItemProviderKind: "supportCard",
    rarity: "ssr",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: { kind: "mightyPerformance", duration: 1, percentage: 50 },
        },
      ],
      times: 3,
      trigger: { kind: "turnStart", idolParameterKind: "dance" },
    },
  },
  {
    id: "kumoriwonuguttataoru",
    name: "曇りをぬぐったタオル",
    producerItemPossessionKind: "free",
    producerItemProviderKind: "supportCard",
    rarity: "ssr",
    base: {
      effects: [{ kind: "recoverLife", value: 2 }],
      times: 3,
      trigger: {
        kind: "beforeCardEffectActivation",
        cardSummaryKind: "active",
        idolParameterKind: "vocal",
      },
    },
  },
  {
    id: "sukautosaegiribo",
    name: "スカウト遮り帽",
    producerItemPossessionKind: "free",
    producerItemProviderKind: "supportCard",
    rarity: "ssr",
    base: {
      effects: [
        { kind: "drawCards", amount: 1 },
        { kind: "perform", vitality: { fixedValue: true, value: 2 } },
      ],
      times: 3,
      trigger: { kind: "turnStart", idolParameterKind: "vocal" },
    },
  },
  {
    id: "mankaipeaheapin",
    name: "満開ペアヘアピン",
    producerItemPossessionKind: "free",
    producerItemProviderKind: "supportCard",
    rarity: "ssr",
    base: {
      effects: [{ kind: "recoverLife", value: 2 }],
      times: 3,
      trigger: {
        kind: "beforeCardEffectActivation",
        cardSummaryKind: "active",
        idolParameterKind: "visual",
      },
    },
  },
  {
    id: "nakanaorinokikkake",
    name: "仲直りのきっかけ",
    producerItemPossessionKind: "free",
    producerItemProviderKind: "supportCard",
    rarity: "ssr",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: {
            kind: "additionalCardUsageCount",
            amount: 1,
          },
        },
      ],
      times: 1,
      trigger: { kind: "turnStart", idolParameterKind: "visual" },
    },
  },
  {
    id: "yumeniafuretaoonimotsu",
    name: "夢にあふれた大荷物",
    producerItemPossessionKind: "free",
    producerItemProviderKind: "supportCard",
    rarity: "ssr",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: {
            kind: "additionalCardUsageCount",
            amount: 1,
          },
        },
      ],
      times: 1,
      trigger: { kind: "turnStart", idolParameterKind: "dance" },
    },
  },
  {
    id: "amakawaramemmeguri",
    name: "天川ラーメン巡り",
    keywords: ["tenkawaramenmeguri"],
    producerItemPossessionKind: "free",
    producerItemProviderKind: "supportCard",
    rarity: "ssr",
    base: {
      effects: [
        {
          kind: "getModifier",
          modifier: {
            kind: "additionalCardUsageCount",
            amount: 1,
          },
        },
      ],
      times: 1,
      trigger: { kind: "turnStart", idolParameterKind: "vocal" },
    },
  },
  {
    id: "nijikakerukurosu",
    name: "虹かけるクロス",
    producerItemPossessionKind: "free",
    producerItemProviderKind: "supportCard",
    rarity: "ssr",
    base: {
      effects: [{ kind: "recoverLife", value: 2 }],
      times: 3,
      trigger: {
        kind: "beforeCardEffectActivation",
        cardSummaryKind: "active",
        idolParameterKind: "dance",
      },
    },
  },
] as const satisfies ProducerItemData[];

export type ProducerItemDataId = (typeof producerItemsAsConst)[number]["id"];

export const producerItems: ProducerItemData[] = producerItemsAsConst;
