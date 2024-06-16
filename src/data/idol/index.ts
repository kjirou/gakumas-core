import { IdolDefinition } from "../../types";

/**
 * プロデュースアイドルの定義
 *
 * - データ定義のルール
 *   - レコードの定義順は、本家の「コミュ」＞「アイドルコミュ」の順番に合わせる
 *     - なお、これはおそらく「アイドル」＞「Pアイドル育成」＞「アイドル」順、と同じ
 *   - プロパティの定義順は、アルファベット順
 * - TODO: eslint
 */
export const idols: IdolDefinition[] = [
  {
    characterId: "hanamisaki",
    producePlan: {
      kind: "sense",
      recommendedEffect: "goodCondition",
    },
    rarity: "ssr",
    specificCardId: "zettainimakenai",
    specificProducerItemId: "tomonitatakautaoru",
    title: "Fighting My Way",
  },
  {
    characterId: "hanamisaki",
    producePlan: {
      kind: "sense",
      recommendedEffect: "goodCondition",
    },
    rarity: "sr",
    specificCardId: "zettainimakenai",
    specificProducerItemId: "tomonitatakautaoru",
    title: "わたしが一番！",
  },
  {
    characterId: "hanamisaki",
    producePlan: {
      kind: "sense",
      recommendedEffect: "goodCondition",
    },
    rarity: "r",
    specificCardId: "shinshinkiei",
    specificProducerItemId: "bakuonraion",
    title: "学園生活",
  },
  {
    characterId: "tsukimuratemari",
    producePlan: {
      kind: "logic",
      recommendedEffect: "positiveImpression",
    },
    rarity: "ssr",
    specificCardId: "karamaruomoi",
    specificProducerItemId: "koregawatashi",
    title: "アイヴイ",
  },
  {
    characterId: "tsukimuratemari",
    producePlan: {
      kind: "sense",
      recommendedEffect: "focus",
    },
    rarity: "ssr",
    specificCardId: "sorezorenomichi",
    specificProducerItemId: "jibunwomamoruiyahon",
    title: "Luna say maybe",
  },
  {
    characterId: "tsukimuratemari",
    producePlan: {
      kind: "sense",
      recommendedEffect: "focus",
    },
    rarity: "sr",
    specificCardId: "ronurufu",
    specificProducerItemId: "watashinohatsunogakufu",
    title: "一匹狼",
  },
  {
    characterId: "tsukimuratemari",
    producePlan: {
      kind: "sense",
      recommendedEffect: "focus",
    },
    rarity: "r",
    specificCardId: "ijippari",
    specificProducerItemId: "hikkeisutenresubotoru",
    title: "学園生活",
  },
  {
    characterId: "fujitakotone",
    producePlan: {
      kind: "sense",
      recommendedEffect: "goodCondition",
    },
    rarity: "ssr",
    specificCardId: "adorenarinzenkai",
    specificProducerItemId: "saikonihappinominamoto",
    title: "Yellow Big Bang！",
  },
  {
    characterId: "fujitakotone",
    producePlan: {
      kind: "logic",
      recommendedEffect: "positiveImpression",
    },
    rarity: "ssr",
    specificCardId: "yosomihadame",
    specificProducerItemId: "biggudorimuchokimbako",
    title: "世界一可愛い私",
  },
  {
    characterId: "fujitakotone",
    producePlan: {
      kind: "logic",
      recommendedEffect: "positiveImpression",
    },
    rarity: "sr",
    specificCardId: "colorfulcute",
    specificProducerItemId: "okininosunika",
    title: "カワイイ♡はじめました",
  },
  {
    characterId: "fujitakotone",
    producePlan: {
      kind: "logic",
      recommendedEffect: "positiveImpression",
    },
    rarity: "r",
    specificCardId: "arubaita",
    specificProducerItemId: "chibidomotezukuriburesu",
    title: "学園生活",
  },
  {
    characterId: "arimuranao",
    producePlan: {
      kind: "sense",
      recommendedEffect: "goodCondition",
    },
    rarity: "ssr",
    specificCardId: "seisonohanagata",
    specificProducerItemId: "uchinaruhikarinomimikazari",
    title: "Fluorite",
  },
  {
    characterId: "arimuranao",
    producePlan: {
      kind: "sense",
      recommendedEffect: "goodCondition",
    },
    rarity: "sr",
    specificCardId: "rashisa",
    specificProducerItemId: "dearritorupurinsu",
    title: "はじまりはカッコよく",
  },
  {
    characterId: "arimuranao",
    producePlan: {
      kind: "sense",
      recommendedEffect: "goodCondition",
    },
    rarity: "r",
    specificCardId: "ritorupurinsu",
    specificProducerItemId: "shinshifuhankachifu",
    title: "学園生活",
  },
  {
    characterId: "katsuragiririya",
    producePlan: {
      kind: "logic",
      recommendedEffect: "positiveImpression",
    },
    rarity: "ssr",
    specificCardId: "mokowakunaikara",
    specificProducerItemId: "yumehenoraifurogu",
    title: "白線",
  },
  {
    characterId: "katsuragiririya",
    producePlan: {
      kind: "logic",
      recommendedEffect: "positiveImpression",
    },
    rarity: "sr",
    specificCardId: "jumpakunoyose",
    specificProducerItemId: "omoiderobo",
    title: "一つ踏み出した先に",
  },
  {
    characterId: "katsuragiririya",
    producePlan: {
      kind: "logic",
      recommendedEffect: "positiveImpression",
    },
    rarity: "r",
    specificCardId: "uchikikeishojo",
    specificProducerItemId: "midorinoosoroiburesu",
    title: "学園生活",
  },
  {
    characterId: "kuramotochina",
    producePlan: {
      kind: "logic",
      recommendedEffect: "motivation",
    },
    rarity: "ssr",
    specificCardId: "ojosamanoharebutai",
    specificProducerItemId: "himitsutokkunkade",
    title: "Wonder Scale",
  },
  {
    characterId: "kuramotochina",
    producePlan: {
      kind: "logic",
      recommendedEffect: "motivation",
    },
    rarity: "sr",
    specificCardId: "isshokemmei",
    specificProducerItemId: "shogenaihankachi",
    title: "胸を張って一歩ずつ",
  },
  {
    characterId: "kuramotochina",
    producePlan: {
      kind: "logic",
      recommendedEffect: "motivation",
    },
    rarity: "r",
    specificCardId: "genkiippai",
    specificProducerItemId: "negaiwokanaeruomamori",
    title: "学園生活",
  },
  {
    characterId: "shiunsumika",
    producePlan: {
      kind: "sense",
      recommendedEffect: "focus",
    },
    rarity: "ssr",
    specificCardId: "wammoasuteppu",
    specificProducerItemId: "gesennosenrihin",
    title: "Time-Lie-One-Step",
  },
  {
    characterId: "shiunsumika",
    producePlan: {
      kind: "sense",
      recommendedEffect: "focus",
    },
    rarity: "sr",
    specificCardId: "yukinoippo",
    specificProducerItemId: "hokagonorakugaki",
    title: "夢へのリスタート",
  },
  {
    characterId: "shiunsumika",
    producePlan: {
      kind: "sense",
      recommendedEffect: "focus",
    },
    rarity: "r",
    specificCardId: "furendori",
    specificProducerItemId: "pinkunoosoroiburesu",
    title: "学園生活",
  },
  {
    characterId: "shinosawahiro",
    producePlan: {
      kind: "logic",
      recommendedEffect: "motivation",
    },
    rarity: "ssr",
    specificCardId: "honkinoshumi",
    specificProducerItemId: "michikusakenkyunoto",
    title: "光景",
  },
  {
    characterId: "shinosawahiro",
    producePlan: {
      kind: "logic",
      recommendedEffect: "motivation",
    },
    rarity: "sr",
    specificCardId: "kurushinogasuki",
    specificProducerItemId: "daredemowakarunyumonsho",
    title: "一番向いてないこと",
  },
  {
    characterId: "shinosawahiro",
    producePlan: {
      kind: "logic",
      recommendedEffect: "motivation",
    },
    rarity: "r",
    specificCardId: "chokougakurekiaidoru",
    specificProducerItemId: "chozetsuammimmasuku",
    title: "学園生活",
  },
  {
    characterId: "hanamiume",
    producePlan: {
      kind: "logic",
      recommendedEffect: "motivation",
    },
    rarity: "ssr",
    specificCardId: "okkinaonigiri",
    specificProducerItemId: "korogaritsuzukerugenkinominamoto",
    title: "The Rolling Riceball",
  },
  {
    characterId: "hanamiume",
    producePlan: {
      kind: "logic",
      recommendedEffect: "motivation",
    },
    rarity: "sr",
    specificCardId: "datoonechan",
    specificProducerItemId: "shibainuposhetto",
    title: "アイドル、はじめっ！",
  },
  {
    characterId: "hanamiume",
    producePlan: {
      kind: "logic",
      recommendedEffect: "motivation",
    },
    rarity: "r",
    specificCardId: "mikannotaiki",
    specificProducerItemId: "tekunodoggu",
    title: "学園生活",
  },
];
