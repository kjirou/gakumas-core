import { IdolData } from "../types";

export const findIdolDataById = (id: IdolData["id"]): IdolData | undefined =>
  idols.find((idol) => idol.id === id);

export const getIdolDataById = (id: IdolData["id"]): IdolData => {
  const card = findIdolDataById(id);
  if (!card) {
    throw new Error(`Idol not found: ${id}`);
  }
  return card;
};

export const getIdolDataByConstId = (id: IdolDataId): IdolData =>
  getIdolDataById(id);

export const isIdolDataIdType = (id: string): id is IdolDataId =>
  idols.some((e) => e.id === id);

/**
 * プロデュースアイドルの定義
 *
 * - データ定義のルール
 *   - レコードの定義順は、本家の「コミュ」＞「アイドルコミュ」の順番に合わせる
 *     - なお、これはおそらく「アイドル」＞「Pアイドル育成」＞「アイドル」順、と同じ
 *   - プロパティの定義順は、アルファベット順
 * - TODO: eslint
 */
export const idolsAsConst = [
  {
    id: "hanamisaki-ssr-3",
    characterId: "hanamisaki",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "positiveImpression",
    },
    rarity: "ssr",
    specificCardId: "kingyosukuideshobu",
    specificProducerItemId: "yabureshirazunopoi",
    title: "冠菊",
  },
  {
    id: "hanamisaki-ssr-2",
    characterId: "hanamisaki",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "positiveImpression",
    },
    rarity: "ssr",
    specificCardId: "pow",
    specificProducerItemId: "kachihenokodawari",
    title: "Boom Boom Pow",
  },
  {
    id: "hanamisaki-ssr-1",
    characterId: "hanamisaki",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "ssr",
    specificCardId: "zettainimakenai",
    specificProducerItemId: "tomonitatakautaoru",
    title: "Fighting My Way",
  },
  {
    id: "hanamisaki-sr-1",
    characterId: "hanamisaki",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "sr",
    specificCardId: "ichibanhayuzuranai",
    specificProducerItemId: "sakinokanzenshokureshipi",
    title: "わたしが一番！",
  },
  {
    id: "hanamisaki-r-2",
    characterId: "hanamisaki",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "positiveImpression",
    },
    rarity: "r",
    specificCardId: "hajimetenomirai",
    specificProducerItemId: "hatsukoenoakashisaki",
    title: "初声",
  },
  {
    id: "hanamisaki-r-1",
    characterId: "hanamisaki",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "r",
    specificCardId: "shinshinkiei",
    specificProducerItemId: "bakuonraion",
    title: "学園生活",
  },
  {
    id: "tsukimuratemari-ssr-2",
    characterId: "tsukimuratemari",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "positiveImpression",
    },
    rarity: "ssr",
    specificCardId: "karamaruomoi",
    specificProducerItemId: "koregawatashi",
    title: "アイヴイ",
  },
  {
    id: "tsukimuratemari-ssr-1",
    characterId: "tsukimuratemari",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "focus",
    },
    rarity: "ssr",
    specificCardId: "sorezorenomichi",
    specificProducerItemId: "jibunwomamoruiyahon",
    title: "Luna say maybe",
  },
  {
    id: "tsukimuratemari-sr-1",
    characterId: "tsukimuratemari",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "focus",
    },
    rarity: "sr",
    specificCardId: "ronurufu",
    specificProducerItemId: "watashinohatsunogakufu",
    title: "一匹狼",
  },
  {
    id: "tsukimuratemari-r-2",
    characterId: "tsukimuratemari",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "positiveImpression",
    },
    rarity: "r",
    specificCardId: "hajimetenobasho",
    specificProducerItemId: "hatsukoenoakashitemari",
    title: "初声",
  },
  {
    id: "tsukimuratemari-r-1",
    characterId: "tsukimuratemari",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "focus",
    },
    rarity: "r",
    specificCardId: "ijippari",
    specificProducerItemId: "hikkeisutenresubotoru",
    title: "学園生活",
  },
  {
    id: "fujitakotone-ssr-3",
    characterId: "fujitakotone",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "ssr",
    specificCardId: "natsunoyoinosenkohanabi",
    specificProducerItemId: "pachipachisenkohanabi",
    title: "冠菊",
  },
  {
    id: "fujitakotone-ssr-2",
    characterId: "fujitakotone",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "ssr",
    specificCardId: "adorenarinzenkai",
    specificProducerItemId: "saikonihappinominamoto",
    title: "Yellow Big Bang！",
  },
  {
    id: "fujitakotone-ssr-1",
    characterId: "fujitakotone",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "positiveImpression",
    },
    rarity: "ssr",
    specificCardId: "yosomihadame",
    specificProducerItemId: "piggudorimuchokimbako",
    title: "世界一可愛い私",
  },
  {
    id: "fujitakotone-sr-1",
    characterId: "fujitakotone",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "positiveImpression",
    },
    rarity: "sr",
    specificCardId: "colorfulcute",
    specificProducerItemId: "okininosunika",
    title: "カワイイ♡はじめました",
  },
  {
    id: "fujitakotone-r-2",
    characterId: "fujitakotone",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "r",
    specificCardId: "hajimetenogohobi",
    specificProducerItemId: "hatsukoenoakashikotone",
    title: "初声",
  },
  {
    id: "fujitakotone-r-1",
    characterId: "fujitakotone",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "positiveImpression",
    },
    rarity: "r",
    specificCardId: "arubaita",
    specificProducerItemId: "chibidomotezukurimedaru",
    title: "学園生活",
  },
  {
    id: "arimuramao-ssr-3",
    characterId: "arimuramao",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "positiveImpression",
    },
    rarity: "ssr",
    specificCardId: "tsukiyonoranuei",
    specificProducerItemId: "sutairisshumodo",
    title: "Feel Jewel Dream",
  },
  {
    id: "arimuramao-ssr-2",
    characterId: "arimuramao",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "focus",
    },
    rarity: "ssr",
    specificCardId: "hinyarihitoyasumi",
    specificProducerItemId: "saigononatsunoomoide",
    title: "キミとセミブルー",
  },
  {
    id: "arimuramao-ssr-1",
    characterId: "arimuramao",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "ssr",
    specificCardId: "seisonohanagata",
    specificProducerItemId: "uchinaruhikarinomimikazari",
    title: "Fluorite",
  },
  {
    id: "arimuramao-sr-1",
    characterId: "arimuramao",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "sr",
    specificCardId: "rashisa",
    specificProducerItemId: "dearritorupurinsu",
    title: "はじまりはカッコよく",
  },
  {
    id: "arimuramao-r-1",
    characterId: "arimuramao",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "r",
    specificCardId: "ritorupurinsu",
    specificProducerItemId: "shinshifuhankachifu",
    title: "学園生活",
  },
  {
    id: "katsuragiririya-ssr-2",
    characterId: "katsuragiririya",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "ssr",
    specificCardId: "hajimetenoramune",
    specificProducerItemId: "binnonakanokirameki",
    title: "冠菊",
  },
  {
    id: "katsuragiririya-ssr-1",
    characterId: "katsuragiririya",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "positiveImpression",
    },
    rarity: "ssr",
    specificCardId: "mokowakunaikara",
    specificProducerItemId: "yumehenoraifurogu",
    title: "白線",
  },
  {
    id: "katsuragiririya-sr-1",
    characterId: "katsuragiririya",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "positiveImpression",
    },
    rarity: "sr",
    specificCardId: "jumpakunoyosei",
    specificProducerItemId: "omoiderobo",
    title: "一つ踏み出した先に",
  },
  {
    id: "katsuragiririya-r-2",
    characterId: "katsuragiririya",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "r",
    specificCardId: "hajimetenochihei",
    specificProducerItemId: "shoshinnoakashiririya",
    title: "初心",
  },
  {
    id: "katsuragiririya-r-1",
    characterId: "katsuragiririya",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "positiveImpression",
    },
    rarity: "r",
    specificCardId: "uchikikeishojo",
    specificProducerItemId: "midorinoosoroiburesu",
    title: "学園生活",
  },
  {
    id: "kuramotochina-ssr-3",
    characterId: "kuramotochina",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "focus",
    },
    rarity: "ssr",
    specificCardId: "kokuritohitokuchi",
    specificProducerItemId: "onsennoatonootanoshimi",
    title: "ようこそ初星温泉",
  },
  {
    id: "kuramotochina-ssr-2",
    characterId: "kuramotochina",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "ssr",
    specificCardId: "ochakaiheyokoso",
    specificProducerItemId: "tokimekinoippai",
    title: "日々、発見的ステップ！",
  },
  {
    id: "kuramotochina-ssr-1",
    characterId: "kuramotochina",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "ssr",
    specificCardId: "ojosamanoharebutai",
    specificProducerItemId: "himitsutokkunkade",
    title: "Wonder Scale",
  },
  {
    id: "kuramotochina-sr-1",
    characterId: "kuramotochina",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "sr",
    specificCardId: "isshokemmei",
    specificProducerItemId: "shogenaihankachi",
    title: "胸を張って一歩ずつ",
  },
  {
    id: "kuramotochina-r-2",
    characterId: "kuramotochina",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "r",
    specificCardId: "hajimetenoiro",
    specificProducerItemId: "shoshinnoakashichina",
    title: "初心",
  },
  {
    id: "kuramotochina-r-1",
    characterId: "kuramotochina",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "r",
    specificCardId: "genkiippai",
    specificProducerItemId: "negaiwokanaeruomamori",
    title: "学園生活",
  },
  {
    id: "shiunsumika-ssr-2",
    characterId: "shiunsumika",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "ssr",
    specificCardId: "hirusagarinosoyokaze",
    specificProducerItemId: "kaerujirushinosempuki",
    title: "キミとセミブルー",
  },
  {
    id: "shiunsumika-ssr-1",
    characterId: "shiunsumika",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "focus",
    },
    rarity: "ssr",
    specificCardId: "wammoasuteppu",
    specificProducerItemId: "gesennosenrihin",
    title: "Time-Lie-One-Step",
  },
  {
    id: "shiunsumika-sr-1",
    characterId: "shiunsumika",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "focus",
    },
    rarity: "sr",
    specificCardId: "yukinoippo",
    specificProducerItemId: "hokagonorakugaki",
    title: "夢へのリスタート",
  },
  {
    id: "shiunsumika-r-1",
    characterId: "shiunsumika",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "focus",
    },
    rarity: "r",
    specificCardId: "furendori",
    specificProducerItemId: "pinkunoosoroiburesu",
    title: "学園生活",
  },
  {
    id: "shinosawahiro-ssr-2",
    characterId: "shinosawahiro",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "focus",
    },
    rarity: "ssr",
    specificCardId: "basuniyurarete",
    specificProducerItemId: "madaminusekaihe",
    title: "コントラスト",
  },
  {
    id: "shinosawahiro-ssr-1",
    characterId: "shinosawahiro",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "ssr",
    specificCardId: "honkinoshumi",
    specificProducerItemId: "michikusakenkyunoto",
    title: "光景",
  },
  {
    id: "shinosawahiro-sr-1",
    characterId: "shinosawahiro",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "sr",
    specificCardId: "kurushinogasuki",
    specificProducerItemId: "daredemowakarunyumonsho",
    title: "一番向いてないこと",
  },
  {
    id: "shinosawahiro-r-1",
    characterId: "shinosawahiro",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "r",
    specificCardId: "chokougakurekiaidoru",
    specificProducerItemId: "chozetsuammimmasuku",
    title: "学園生活",
  },
  {
    id: "hanamiume-ssr-1",
    characterId: "hanamiume",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "ssr",
    specificCardId: "okkinaonigiri",
    specificProducerItemId: "korogaritsuzukerugenkinominamoto",
    title: "The Rolling Riceball",
  },
  {
    id: "hanamiume-sr-1",
    characterId: "hanamiume",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "sr",
    specificCardId: "datoonechan",
    specificProducerItemId: "shibainuposhetto",
    title: "アイドル、はじめっ！",
  },
  {
    id: "hanamiume-r-1",
    characterId: "hanamiume",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "r",
    specificCardId: "mikannotaiki",
    specificProducerItemId: "tekunodoggu",
    title: "学園生活",
  },
  {
    id: "himesakirinami-ssr-3",
    characterId: "himesakirinami",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "ssr",
    specificCardId: "sapparihitoiki",
    specificProducerItemId: "patapatauchiwa",
    title: "ようこそ初星温泉",
  },
  {
    id: "himesakirinami-ssr-2",
    characterId: "himesakirinami",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "goodCondition",
    },
    rarity: "ssr",
    specificCardId: "nyudogumotokimi",
    specificProducerItemId: "kimitowakeaunatsu",
    title: "キミとセミブルー",
  },
  {
    id: "himesakirinami-ssr-1",
    characterId: "himesakirinami",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "focus",
    },
    rarity: "ssr",
    specificCardId: "kyorikan",
    specificProducerItemId: "toshindainoredeirippu",
    title: "clumsy trick",
  },
  {
    id: "himesakirinami-sr-1",
    characterId: "himesakirinami",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "focus",
    },
    rarity: "sr",
    specificCardId: "yorisokimochi",
    specificProducerItemId: "kimihenosashiire",
    title: "「私らしさ」のはじまり",
  },
  {
    id: "himesakirinami-r-2",
    characterId: "himesakirinami",
    producePlan: {
      kind: "logic",
      recommendedModifierKind: "motivation",
    },
    rarity: "r",
    specificCardId: "hajimetenooaite",
    specificProducerItemId: "shoshinnoakashirinami",
    title: "初心",
  },
  {
    id: "himesakirinami-r-1",
    characterId: "himesakirinami",
    producePlan: {
      kind: "sense",
      recommendedModifierKind: "focus",
    },
    rarity: "r",
    specificCardId: "hoyoryoku",
    specificProducerItemId: "itsumonomeikupochi",
    title: "学園生活",
  },
] as const satisfies IdolData[];

export type IdolDataId = (typeof idolsAsConst)[number]["id"];

export const idols: IdolData[] = idolsAsConst;
