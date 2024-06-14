type RangedNumber =
  | { min: number }
  | { max: number }
  | { max: number; min: number };

type IdolParameters = {
  dance: number;
  visual: number;
  vocal: number;
};

type IdolParameterKind = keyof IdolParameters;

/**
 * プロデュース計画
 *
 * - ゲーム上は、出現するカードの種類・レッスンの小目標のパターン・コンテストのAIなど、広範に影響していそう
 * - 関連する原文は、「プロデュースの方向性を示すもので、〜」「〜を活用して育成するプラン」
 */
type ProducePlan =
  | {
      /** 「ロジック」 */
      kind: "logic";
      /** 「おすすめ効果」 */
      recommendedEffect: "motivation" | "positiveImpression";
    }
  | {
      /** 「センス」 */
      kind: "sense";
      recommendedEffect: "goodCondition" | "focus";
    };

/** スキルカードの提供元種別、"others" は現状はキャラ固有でもサポカ固有でも無いもの全て */
type CardProviderKind = "idol" | "others" | "supportCard";

/** Pアイテムの提供元種別、"others" は現状は中間試験後にもらえるもの */
type ProducerItemProviderKind = "idol" | "others" | "supportCard";

/** スキルカード所持種別、関連する原文は「プラン不一致」 */
type CardPossessionKind = ProducePlan["kind"] | "free";

/** Pアイテム所持種別 */
type ProducerItemPossessionKind = ProducePlan["kind"] | "free";

/**
 * カード概要種別
 *
 * - 値は原文の「アクティブスキルカード」「メンタルスキルカード」「トラブルカード」に準拠
 * - 現状は、パラメータ増加が設定されているものがアクティブへ分類されているよう
 *   - 一部例外があり、スキルカードデータのテストにメモしている
 */
type CardSummaryKind = "active" | "mental" | "trouble";

/**
 * 元気更新要求
 *
 * - 元気の値の更新要求を宣言的に定義できるようにしたもの
 *   - なお、状態修正については、現状は表記通りの数値の加減算しかないので、この構造は作っていない
 * - 原文の構文は、「[固定]元気+{value}[（レッスン中に使用したスキルカード1枚ごとに、元気増加量+{boostPerSkillCardUsed}）]」
 *   - 「未完の大器」は、「元気+2（レッスン中に使用したスキルカード1枚ごとに、元気増加量+3）」
 *   - 「おっきなおにぎり」は、「元気+2（レッスン中に使用したスキルカード1枚ごとに、元気増加量+5）」
 *   - 「演出計画」は、「以降、アクティブスキルカード使用時、固定元気+2」
 */
type VitalityUpdateQuery = {
  /** 使用したスキルカード1枚毎の効果量増加 */
  boostPerCardUsed?: number;
  /** 効果に記載した値をそのまま適用するか、原文は「固定元気」 */
  fixedValue?: boolean;
  value: number;
};

/**
 * 状態修正
 *
 * - レッスン中に画面左上に表示されるアイコン群のことを、状態修正(modifier)と呼ぶ
 * - 現在の状況を表現するのに使うのと共に、加算時の更新要求を表現するのにも使う
 *   - 加算の表現は、単に加算するしかできないので、その内無理になるかもしれない。元気は VitalityUpdateQuery が必要になった。
 *   - 減算の表現は含まない、減算は ActionCost 側で表現する
 * - 付与された順番で左側のアイコンとアイコンタップ時の説明リストに表示される
 *   - 「スキルカード使用数+1」のアイコンは別の場所に表示されるが、説明リストには追加された順に表示されている
 * - 種類は名詞句で表現する、原文が名詞だから
 */
type Modifier =
  | {
      /**
       * 「スキルカード使用数+{amount}」
       *
       * - 原文の例
       *   - 「私がスター」は、「スキルカード使用数+1」
       * - アイコンは、左側のアイコンリストに並ばず、左下の個別の位置に表示される
       */
      kind: "additionalCardUsageCount";
      amount: number;
      /** レッスン中のアイコンからの説明を読むと、「1 1ターン」のように表記されており、効果時間も設定されていそう */
      duration: number;
    }
  | {
      /**
       * 「低下状態無効（{times}）回」
       *
       * - 原文の例
       *   - 「アイドル魂」は、「低下状態無効（1回）」
       * - TODO: 正確な効果が不明、何が対象なのか（消費体力増加を消してくれる説は見た）、また、付与を防ぐのか付与されているものを削除するのか
       */
      kind: "debuffProtection";
      times: number;
    }
  | {
      /**
       * 「次のターン、パラメータ+{value}」
       *
       * - 原文の例
       *   - 「成就」は、「次のターン、パラメータ+32」
       * - TODO: アイコン表示があるのか、内容はどうなってる？
       */
      kind: "delayedPerformance";
      value: number;
    }
  | {
      /**
       * 「次に使用するスキルカードの効果をもう1回発動（{times}回）」
       *
       * - 原文の例
       *   - 「国民的アイドル」は、「次に使用するスキルカードの効果をもう1回発動（1回）」
       * - 通常、状態修正群は、説明内でアイコン付きのタッチ可能なボタンになっているが、これはなっていない。しかし、アイコンから詳細を見ると普通に説明が書いてある。
       */
      kind: "doubleEffect";
      times: number;
    }
  | {
      /** 「消費体力増加{duration}ターン」 */
      kind: "doubleLifeConsumption";
      duration: number;
    }
  | {
      /**
       * ターン終了時に効果発動
       *
       * - 原文の構文は、「以降、ターン終了時、[{effect}]」
       *   - 「内気系少女」は、「以降、ターン終了時、好印象+1」
       *   - 「天真爛漫」は、「以降、ターン終了時、集中3以上の場合、集中+2」
       *   - 「厳選初星ブレンド」は、「以降、ターン終了時、やる気+1」
       */
      kind: "effectActivationAtEndOfTurn";
      effect: Effect;
    }
  | {
      /**
       * カード使用時に効果発動
       *
       * - 原文の構文は、「以降、(アクティブスキルカード|メンタルスキルカード)使用時、{effect}」
       *   - 「ファンシーチャーム」は、「以降、メンタルスキルカード使用時、好印象+1」
       *   - 「演出計画」は、「以降、アクティブスキルカード使用時、固定元気+2」
       */
      kind: "effectActivationUponCardUsage";
      cardKind?: CardSummaryKind;
      effect: Effect;
      times?: number;
    }
  | {
      /** 「絶好調{duration}ターン」 */
      kind: "excellentCondition";
      duration: number;
    }
  | {
      /** 「集中+{amount}」 */
      kind: "focus";
      amount: number;
    }
  | {
      /** 「好調{duration}ターン」 */
      kind: "goodCondition";
      duration: number;
    }
  | {
      /** 「消費体力減少{duration}ターン」、端数は切り上げ */
      kind: "halfLifeConsumption";
      duration: number;
    }
  | {
      /** 「消費体力削減{value}」 */
      kind: "lifeConsumptionReduction";
      value: number;
    }
  | {
      /** 「パラメータ上昇量増加50%（{duration}ターン）」、TODO: [仕様確認] 端数処理というか計算式 */
      kind: "mightyPerformance";
      duration: number;
    }
  | {
      /** 「やる気+{amount}」 */
      kind: "motivation";
      amount: number;
    }
  | {
      /** 「元気増加無効{duration}ターン」 */
      kind: "noVitalityIncrease";
      duration: number;
    }
  | {
      /** 「好印象+{amount}」 */
      kind: "positiveImpression";
      amount: number;
    };

/**
 * 効果発動条件
 *
 * - スキルカードの効果に対して設定する場合は、効果それぞれの発動条件を意味する
 * - Pアイテムの効果に対して設定する場合は、Pアイテムの効果全体に対する発動条件を意味する
 */
type EffectCondition =
  | {
      /**
       * 状態変化の数が指定数以上か
       *
       * - 原文は、「{modifierKind}が{min}以上の場合、」
       *   - 「飛躍」は、「集中が6以上の場合、パラメータ+15」
       *   - 「超高学歴アイドル」は、「やる気が6以上の場合、元気+3」
       *   - 「思い出し笑い」は、「好印象が3以上の場合、やる気+2」
       *   - 「必携ステンレスボトル」は、「ターン開始時集中が3以上の場合、集中+4」
       *   - 「ちびども手作りメダル」は、「ターン終了時好印象が6以上の場合、好印象+2」
       *   - 「テクノドッグ」は、「スキルカード使用後やる気が3以上の場合、やる気+2」
       */
      kind: "countModifier";
      modifierKind: "focus" | "motivation" | "positiveImpression";
      min: number;
    }
  | {
      /**
       * 残りターン数が指定数以下か
       *
       * - 原文の構文は、「(最終ターン|残り{max}ターン以内)の場合、」
       *   - 「超絶あんみんマスク」は、「ターン開始時最終ターンの場合、元気の50%分パラメータ上昇」
       *   - 「等身大のレディリップ」は、「ターン開始時残り2ターン以内の場合、パラメータ+5」
       * - 「ターン追加」による加算も含めた値に対して判定する
       */
      kind: "countReminingTurns";
      /** 1が最終ターンを意味する */
      max: number;
    }
  | {
      /**
       * 元気が指定数の範囲か
       *
       * - 原文の構文は、「元気が{range}の場合、」
       *   - 「私の「初」の楽譜」は、「ターン開始時元気が0の場合、体力減少1」
       *   - 「お気にのスニーカー」は、「ターン終了時元気が7以上の場合、好印象+4」
       */
      kind: "countVitality";
      range: RangedNumber;
    }
  | {
      /**
       * 好調が付与されているか
       *
       * - 原文の構文は、「好調状態の場合、」
       *   - 「勢い任せ」は、「好調状態の場合、集中+3」
       *   - 「ばくおんライオン」は、「ターン開始時好調状態の場合、パラメータ+6」
       */
      kind: "hasGoodCondition";
    }
  | {
      /**
       * 体力が最大体力に対して50%以上か
       *
       * - 原文の構文は、「体力が50%以上の場合、」
       *   - 「ファーストステップ」は、「体力が50%以上の場合、消費体力削減1」
       *   - 「いつものメイクポーチ」は、「アクティブスキルカード使用時体力が50%以上の場合、集中+2」
       * - TODO: [仕様確認] 端数処理
       */
      kind: "measureIfLifeIsEqualGreaterThanHalf";
    };

/**
 * レッスン中の効果
 *
 * - スキルカード・Pアイテム・Pドリンクの効果を分解して抽象化・構造化したもの
 * - おおよそ、本家の効果説明欄の1行に対応する
 *   - ただし、Pアイテムの1行目は条件も含まれるなど、この限りではない。詳細はそれぞれの型定義を参照。
 */
type Effect = (
  | {
      /**
       * 体力を減少する
       *
       * - 原文の構文は、「体力減少{value}」
       *   - 「私の「初」の楽譜」は、「ターン開始時元気が0の場合、体力減少1」
       * - 現状は上記のPアイテムのみで使う効果
       */
      kind: "drainLife";
      value: number;
    }
  | {
      /**
       * スキルカードを引く
       *
       * - 原文の構文は、「[(次のターン|{delay}ターン後)、]スキルカードを[{amount}枚]引く」
       *   - 「アイドル宣言」は、「スキルカードを2枚引く」
       *   - 「心のアルバム」は、「次のターン、スキルカードを引く」「2ターン後、スキルカードを引く」
       */
      kind: "drawCards";
      amount: number;
      /** 0の場合は即座、デフォルトは 0 */
      delay?: number;
    }
  | {
      /**
       * 手札を強化する
       *
       * - 原文の構文は、「[(次のターン|{delay}ターン後)、]手札を全てレッスン中強化」
       *   - 「ティーパーティー」は、「手札を全てレッスン中強化」
       *   - 「薄れゆく壁」は、「次のターン、手札を全てレッスン中強化」「2ターン後、手札を全てレッスン中強化」
       */
      kind: "enhanceHand";
      /** 0の場合は即座 */
      delay?: number;
    }
  | {
      /**
       * 手札を交換する
       *
       * - 原文は、「手札をすべて入れ替える」
       * - 手札の枚数分しか引き直せない
       */
      kind: "exchangeHand";
    }
  | {
      /**
       * 手札を生成する
       *
       * - 原文は、「ランダムな強化済みスキルカード（SSR）を、手札に生成」
       */
      kind: "generateCard";
    }
  | {
      /**
       * スキルカード使用数を追加する
       *
       * - 原文の構文は、「スキルカード使用数追加+{amount}」
       */
      kind: "increaseCardUsageLimit";
      amount: number;
    }
  | {
      /**
       * レッスン終了までのターン数を追加する
       *
       * - 原文の構文は、「ターン追加+{amount}」
       */
      kind: "increaseTurns";
      amount: number;
    }
  | {
      /**
       * 状態修正を取得する
       *
       * - 原文の構文は、「{modifier}」
       *   - 「勢い任せ」は、「好調状態の場合、集中+3」
       * - 1行の効果説明内で複数の状態変化を付与するスキルカードはなかった
       */
      kind: "getModifier";
      modifier: Modifier;
    }
  | {
      /**
       * 状態修正を乗算する
       *
       * - 原文の構文は、「{modifierKind}{multiplier}倍」
       *   - 「夢へのライフログ」は、「好印象1.5倍」
       * - TODO: [仕様確認] 端数処理
       */
      kind: "multiplyModifier";
      modifierKind: "positiveImpression";
      multiplier: number;
    }
  | {
      /**
       * スコアまたは元気またはその両方を増加する
       *
       * - 原文の構文は、「[パラメータ+{value}][（集中効果を{focusMultiplier}倍適用）][（{times}回）][元気+{amount}]」
       *   - 「ポーズの基本」は、「パラメータ+2元気+2」
       *   - 「盛装の華形」は、「好調状態の場合、パラメータ+14」
       *   - 「ワンモアステップ」は、「パラメータ+7（2回）」「集中が6以上の場合、パラメータ+7」
       *   - 「ハイタッチ」（未強化）は、「パラメータ+17（集中効果を1.5倍適用）」
       *   - 「ハイタッチ」（強化済み）は、「パラメータ+23（集中効果を2倍適用）」
       *   - 「試行錯誤」は、「パラメータ+8（2回）」
       *   - 「本気の趣味」は、「やる気が3以上の場合、元気+4」
       * - 「スコア」という表記は、原文では「パラメータ」に相当するもの
       * - 1行の効果説明内で複数の元気を付与するスキルカードはなかった
       */
      kind: "perform";
      score?: {
        /**
         * 集中適用倍率
         *
         * - 端数計算は切り上げ、現状は0.5倍単位でしか値が存在しないので四捨五入かもしれない
         *   - 計算例
         *     - 「ハイタッチ」（パラメータ+17、集中適用倍率1.5倍）を、集中+11、好調中に使った時に、スコアが51だった
         *       - `集中11 * 1.5 = 16.5 => 17 ; (パラメータ17 + 集中分17) * 好調1.5 = 51`
         */
        focusMultiplier?: number;
        /** 複数回攻撃 */
        times?: number;
        value: number;
      };
      vitality?: VitalityUpdateQuery;
    }
  | {
      /**
       * 状態修正値を基底としてパラメータを増加する
       *
       * - 原文の構文は、「{modifierKind}の{percentage}%分パラメータ上昇」
       *   - 「200%スマイル」は、「好印象の100%分パラメータ上昇」
       *   - 「開花」は、「やる気の200%分パラメータ上昇」
       * - TODO: そのスキルカード使用時に別効果で含まれる状態修正を含むのか？
       */
      kind: "performLeveragingModifier";
      modifierKind: "motivation" | "positiveImpression";
      /** 状態修正値に対するパーセント表記の乗数 */
      percentage: number;
    }
  | {
      /** 元気を基底としたパラメータ増加 */
      kind: "performLeveragingVitality";
      /**
       * 実行後に参照した状態修正値を減少するか
       *
       * - 原文は「元気を{modifierReductionKind}にして、減少前の元気の{percentage}%分パラメータ上昇」
       *   - 「ハートの合図」は「元気を半分にして、減少前の元気の130%分パラメータ上昇」
       *   - 「届いて！」は「元気を0にして、減少前の元気の160%分パラメータ上昇」
       */
      reductionKind?: "halve" | "zero";
      /** 状態修正値に対するパーセント表記の乗数、原文は「元気の{percentage}%分パラメータ上昇」 */
      percentage: number;
    }
  | {
      /**
       * 体力を回復する
       *
       * - 原文の構文は、「体力回復{value}」
       */
      kind: "recoverLife";
      value: number;
    }
) & {
  /**
   * 効果発動条件
   *
   * - この効果のみの発動条件
   * - 行動前の状態と条件を比較する。例えば、複数効果があり2つ目に条件が設定されている時、1つ目の効果は条件の判定には反映されない。
   * - 原作の構文は、「{condition}{effect}」
   *   - 「思い出し笑い」は、「好印象が3以上の場合、やる気+2」
   */
  condition?: EffectCondition;
};

/**
 * カードを使用する際の条件
 *
 * - 原文は、「{condition}」が効果欄の先頭へ記載される
 *   - コスト表記との前後は不明、現状は同時に記載されているスキルカードは無い
 * - 本条件とコストを満たす状態であるかで、カード使用の可否が決まる
 */
type CardUsageCondition =
  | {
      /**
       * ターン数が指定数以降か
       *
       * - 原文は、「{min}ターン目以降の場合、使用可」
       *   - 「ストレッチ談義」は、「3ターン目以降の場合、使用可」
       */
      kind: "countTurnNumber";
      min: number;
    }
  | {
      /**
       * 元気が0か
       *
       * - 原文は、以下の通り
       *   - 「おアツイ視線」は、「元気が0の場合、使用可」
       */
      kind: "countVitalityZero";
    }
  | {
      /**
       * 好調が付与されているか
       *
       * - 原文は、以下の通り
       *   - 「バズワード」は、「好調状態の場合、使用可」
       * - 好調付与時は、スコア計算時に、`パラメータ+集中`に対して1.5倍（端数切り上げ）を乗ずる
       *   - 計算例
       *     - 「アピールの基本」（パラメータ+9）を、好調中に使うと、`9 * 1.5 = 13.5 => 14` となる
       */
      kind: "hasGoodCondition";
    }
  | {
      /**
       * 現在値が基準値に対して指定比率の範囲内か
       *
       * - 原文は、「{valueKind}が{percentage}%{criterionKind}の場合、使用可」
       *   - 「ご指導ご鞭撻」は、「体力の50%以上の場合、使用可」
       *   - 「お姉ちゃんだもの！」は、「レッスンCLEARの100%以下の場合、使用可」
       * - TODO: [仕様確認] 端数処理
       */
      kind: "measureValue";
      valueKind: "life" | "score";
      criterionKind: "greaterEqual" | "lessEqual";
      percentage: number;
    };

/**
 * レッスン中の各種コスト
 *
 * - スキルカードの使用コスト及び一部のPアイテム効果欄にあるコストを抽象化・構造化したもの
 * - コストに関しては全てがこの構造に収まる。現状の唯一の例外は、Pアイテムの「私の「初」の楽譜」の「体力減少1」という表記、Effect の "drainLife" を参照。
 * - 原文の構文は、1)通常コストの場合は表記無し、2)それ以外は、「(体力|{modifier})消費{value}」
 *   - スキルカードの場合は、スキルカード右下のアイコンと、効果欄の1行目に記載される
 *   - Pアイテムで通常コストを消費する場合に表記はどうなるのか？という疑問はあるが、現状そのようなPアイテムはない
 */
type ActionCost = {
  /**
   * コストの種類
   *
   * - "normal" は通常コストで体力または元気を消費する、"life" は体力のみを消費する
   */
  kind:
    | "focus"
    | "goodCondition"
    | "life"
    | "motivation"
    | "normal"
    | "positiveImpression";
  value: number;
};

type CardDefinitionContent = {
  condition?: CardUsageCondition;
  cost: ActionCost;
  effects: Effect[];
  /**
   * レッスン開始時に手札に入るか
   *
   * - 原文は、「レッスン開始時手札に入る」
   * - 4枚以上所持している時は、初期手札に4枚入る
   *   - TODO: [仕様確認] 手札最大の5枚を超えた時にどうなるか、特に溢れた分が山札に残るか捨札になるか
   */
  innate?: boolean;
  /** 使用後に除外するか、原文は「レッスン中1回」、デフォルトは false */
  usableOncePerLesson?: boolean;
};

/**
 * スキルカード定義
 *
 * - 原文の「スキルカード」の定義を構造化したもの
 * - 効果説明欄の原文の構文は、以下の通り
 *   - コスト   : [{cost}]
 *   - 効果リスト: {effect.n}
 *   - その他   : [レッスン中1回][重複不可]
 * - 原文の中で、参考になる効果説明欄を抜粋
 *   - 「表現の基本」、元気のみが存在する場合の例
 *     元気+4
 *     レッスン中1回
 *   - 「気分転換」、体力消費コストが存在する場合の例
 *     体力消費5
 *     元気の100%分パラメータ上昇
 *     レッスン中1回
 *   - 「シュプレヒコール」、状態修正コストが存在する場合の例
 *     集中消費3
 *     パラメータ+6
 *     好調2ターン
 *     スキルカード使用数追加+1
 *     重複不可
 *   - 「スタンドプレー」、色々な要素が同時に存在する場合の例
 *     パラメータ+12 元気+7
 *     集中+5
 *     消費体力増加2ターン
 *     重複不可
 */
export type CardDefinition = {
  /** 未強化時の内容 */
  base: CardDefinitionContent;
  /** 基本的なカードか、原文は「〜の基本」、デフォルトは false */
  basic?: boolean;
  cardPossessionKind: CardPossessionKind;
  cardSummaryKind: CardSummaryKind;
  // TODO: Pアイテム側と同じくenumにする
  /** キャラクター固有のカードか */
  characterSpecific?: boolean;
  /** 強化済み時の内容 */
  enhanced?: CardDefinitionContent;
  id: string;
  name: string;
  /** カード出現に必要なPLv、原文は「解放PLv」、デフォルトは 1 */
  necessaryProducerLevel?: number;
  /** 2枚以上所持できないか、原文は「重複不可」、デフォルトは false */
  nonDuplicative?: boolean;
  /**
   * レアリティ
   *
   * - 本家だと、アイコンの色のみで表現されていて、「レアリティ」の表記がなさそう
   */
  rarity: "c" | "r" | "sr" | "ssr";
  /** サポートカード固有のカードか */
  supportCardSpecific?: boolean;
};

/**
 * プロデュース中のスキルカード
 *
 * - 所持している、または所持の選択肢として表示するカード
 * - 所持中のスキルカードは、プロデュース開始時に生成され、プロデュース終了時に破棄される
 */
export type CardInProduction = {
  definition: CardDefinition;
  enhanced: boolean;
};

/**
 * レッスン中のスキルカード
 *
 * - レッスン開始前に生成され、レッスン終了時に破棄される
 */
export type Card = {
  original: CardInProduction;
  /**
   * レッスン中の一時的な強化状態
   *
   * - 「レッスン中強化」や、その他の強化
   * - TODO: [仕様確認] サポカによるレッスン中のカード強化の仕様がわからない
   *   - 「静かな意志」が、カードの強化＆サポカ強化1で、コストが4から3に下がっていたのは確認した
   */
  temporaryEnhancements: Array<{}>;
};

export type ProducerItemTrigger = (
  | {
      /**
       * スキルカードを使用した時
       *
       * - 原文の構文は、「(スキルカード使用後|(アクティブ|メンタル)スキルカード使用時)」
       *   - 「テクノドッグ」は、「スキルカード使用後やる気が3以上の場合、やる気+2」
       *   - 「いつものメイクポーチ」は、「アクティブスキルカード使用時体力が50%以上の場合、集中+2」
       *   - 「転がり続ける元気の源」は、「メンタルスキルカード使用時、やる気が5以上の場合、やる気+3」
       *   - 「最高にハッピーの源」は、「アドレナリン全開使用時、好調3ターン」
       */
      kind: "cardUsage";
      cardDefinitionId?: CardDefinition["id"];
      cardSummaryKind?: CardSummaryKind;
    }
  | {
      /**
       * 2ターン毎のターン終了時
       *
       * - 原文の構文は、「2ターンごと」
       *   - 「柴犬ポシェット」は、「2ターンごと、元気+5」
       * - TODO: [仕様確認] 「ターン終了時」と全く同じ時点なのか、別扱いで処理が前後するのか
       */
      kind: "everyTwoTurns";
    }
  | {
      /**
       * レッスンを開始した時
       *
       * - 原文の構文は、「レッスン開始時」
       *   - 「ゲーセンの戦利品」は、「レッスン開始時、集中+3」
       */
      kind: "lessonStart";
    }
  | {
      /**
       * 状態修正が増加した時
       *
       * - 原文の構文は、「{modifierKind}が増加後」
       *   - 「緑のお揃いブレス」は、「好印象が増加後、好印象+3」
       *   - 「願いを叶えるお守り」は、「やる気が増加後、やる気+2」
       *   - 「Dearリトルプリンス」は、「好調の効果ターンが増加後、好調3ターン」
       *   - 「放課後のらくがき」は、「集中が増加後体力が50%以上の場合、集中+2」
       */
      kind: "modifierIncrease";
      modifierKind:
        | "focus"
        | "goodCondition"
        | "motivation"
        | "positiveImpression";
    }
  | {
      /**
       * ターンが終了した時
       *
       * - 原文の構文は、「ターン終了時」
       *   - 「ちびども手作りメダル」は、「ターン終了時好印象が6以上の場合、好印象+2」
       */
      kind: "turnEnd";
    }
  | {
      /**
       * ターンが開始した時
       *
       * - 原文の構文は、「ターン開始時」
       *   - 「ばくおんライオン」は、「ターン開始時好調状態の場合、パラメータ+6」
       */
      kind: "turnStart";
    }
) & {
  /**
   * 一部のアイドルパラメータ種別のみで有効か
   *
   * - 原文の構文は、「【(ボイス|ダンス|ビジュアル)レッスン・(ボイス|ダンス|ビジュアル)ターンのみ】」
   *   - 「得体のしれないモノ」は、「【ビジュアルレッスン・ビジュアルターンのみ】ターン開始時、パラメータ上昇量増加50%（1ターン）」
   *   - 「悔しさの象徴」は、「【ダンスレッスン・ダンスターンのみ】ターン開始時、パラメータ上昇量増加50%（1ターン）」
   *   - 「曇りをぬぐったタオル」は、「【ボーカルレッスン・ボーカルターンのみ】アクティブスキルカード使用時、体力回復2」
   */
  idolParameterKind?: IdolParameterKind;
};

type ProducerItemDefinitionContent = {
  /**
   * 効果発動条件
   *
   * - Pアイテム全体の効果発動条件を意味する
   *   - 原文の効果説明欄の構造上は、複数の効果があるときも、効果1行目に埋め込まれて記載されているよう
   * - TODO: [仕様確認] 「私の「初」の楽譜」の効果に「体力減少1」があるが、体力が0の時発動するのか
   * - TODO: [仕様確認] 「超絶あんみんマスク」の効果に「体力消費1」があるが、体力が0の時発動するのか
   */
  condition?: EffectCondition;
  cost?: ActionCost;
  /**
   * 効果リスト
   *
   * - 現状、各効果それぞれへ条件を設定しているPアイテムはないので、 condition プロパティは設定する必要がない
   */
  effects: Effect[];
  /**
   * レッスン中に発動する回数
   *
   * - 原文の構文は、「（レッスン内{times}回）」
   * - 少なくとも表記上は、回数指定がないものがある
   *   - ほとんどの場合は、最終ターンに発動するはずの「超絶あんみんマスク」など
   *     - TODO: 最終ターンが1でこれを発動して、そのターンにターン追加+1をしたら、再び発動するの？
   */
  times?: number;
  trigger: ProducerItemTrigger;
};

/**
 * Pアイテム定義
 *
 * - 原文の「Pアイテム」の定義を構造化したもの
 * - 効果説明欄の原文の構文は、以下の通り
 *   - 効果1つ目   : {trigger}[{condition}]{effect.0}
 *   - 効果2つ目以降: {effect.n}
 *   - コスト      : [{cost}]
 *   - 発動回数    : [（レッスン内{times}回）]
 * - 原文の中で、参考になる効果説明欄を抜粋
 *   - 「ピンクのお揃いブレス」、 condition が無い場合の例
 *     ターン開始時、集中+1
 *     （レッスン内2回）
 *   - 「ちびども手作りメダル」、 condition がある場合の例
 *     ターン終了時好印象が6以上の場合、好印象+2
 *     （レッスン内2回）
 *   - 「超絶あんみんマスク」、コストがある場合と、発動回数がない場合の例
 *     ターン開始時最終ターンの場合、元気の50%分パラメータ上昇
 *     体力消費1
 *   - 「私の「初」の楽譜」、効果が2つある場合と、効果として体力減少がある場合の例
 *     ターン開始時元気が0の場合、体力減少1
 *     集中+3
 *     （レッスン内2回）
 *   - 「得体のしれないモノ」、 idolParameterKind がある場合の例
 *     【ビジュアルレッスン・ビジュアルターンのみ】ターン開始時、パラメータ上昇量増加50%（1ターン）
 *     （レッスン内3回）
 * - レッスン中に効果を及ぼさないものは、一旦除外している
 * - TODO: [仕様確認] 右側アイコンに並ぶ順番は取得した順番か？
 */
export type ProducerItemDefinition = {
  /** 未強化時の内容 */
  base: ProducerItemDefinitionContent;
  /** 強化済み時の内容 */
  enhanced?: ProducerItemDefinitionContent;
  id: string;
  name: string;
  producerItemPossessionKind: ProducerItemPossessionKind;
  producerItemProviderKind: ProducerItemProviderKind;
  /**
   * レアリティ
   *
   * - 本家だと、アイコンの色のみで表現されていて、「レアリティ」の表記がなさそう
   */
  rarity: "r" | "sr" | "ssr";
};

/**
 * プロデュース中のPアイテム
 *
 * - プロデュース開始時に生成され、プロデュース終了時に破棄される
 */
export type ProducerItemInProduction = {
  definition: ProducerItemDefinition;
};

/**
 * レッスン中のPアイテム
 *
 * - レッスン開始前に生成され、レッスン終了時に破棄される
 */
export type ProducerItem = {
  original: ProducerItemInProduction;
};

/**
 * プロデュースアイドル定義
 */
export type IdolDefinition = {
  producePlan: ProducePlan;
};

/**
 * プロデュース中のプロデュースアイドル
 *
 * - プロデュース開始時に生成され、プロデュース終了時に破棄される
 */
export type IdolInProduction = {
  definition: IdolDefinition;
  idolParameters: IdolParameters;
  life: number;
  maxLife: number;
};

/**
 * レッスン中のプロデュースアイドル
 *
 * - レッスン開始前に生成され、レッスン終了時に破棄される
 */
export type Idol = {
  life: number;
  original: IdolInProduction;
  /** 本レッスン中にスキルカードを使用した回数、関連する原文は「レッスン中に使用したスキルカード{n}枚ごとに、」 */
  totalCardUsageCount: number;
  /**
   * 元気
   *
   * - 原文は、「元気」
   * - 元気をModifierの一つとして表現することも出来るが、構造化が難しかったのでとりあえず分離した
   *   - 「元気を半分にして」や「レッスン中に使用したスキルカード1枚ごとに」で値の参照が必要になるが、Modifierのどの値が対象かを別途定義する必要がある
   */
  vitality: number;
};

/**
 * レッスン
 *
 * - レッスン開始前に生成され、レッスン終了時に破棄される
 */
type Lesson = {
  score: number;
  /** ターン数、最初のターンは1、関連する原文は「{turnNumber}目以降の場合、使用可」 */
  turnNumber: number;
};
