/** Math.random と同じインターフェース */
export type GetRandom = () => number;

export type IdGenerator = () => string;

export type RangedNumber = Readonly<
  { min: number } | { max: number } | { max: number; min: number }
>;

type IdolParameters = Readonly<{
  dance: number;
  visual: number;
  vocal: number;
}>;

export type IdolParameterKind = keyof IdolParameters;

/**
 * プロデュース計画
 *
 * - ゲーム上は、出現するカードの種類・レッスンの小目標のパターン・コンテストのAIなど、広範に影響していそう
 * - 関連する原文は、「プロデュースの方向性を示すもので、〜」「〜を活用して育成するプラン」
 */
export type ProducePlan = Readonly<
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
    }
>;

/** スキルカードの提供元種別、"others" は現状はキャラ固有でもサポカ固有でも無いもの全て */
type CardProviderKind = "idol" | "others" | "supportCard";

/** Pアイテムの提供元種別、"others" は現状は中間試験後にもらえるもの */
type ProducerItemProviderKind = "idol" | "others" | "supportCard";

/** スキルカード所持種別、関連する原文は「プラン不一致」 */
type CardPossessionKind = ProducePlan["kind"] | "free";

/** Pアイテム所持種別 */
type ProducerItemPossessionKind = ProducePlan["kind"] | "free";

/**
 * スキルカード概要種別
 *
 * - 値は原文の「アクティブスキルカード」「メンタルスキルカード」「トラブルカード」に準拠
 * - 現状は、パラメータ増加が設定されているものがアクティブへ分類されているよう
 *   - 一部例外があり、スキルカードデータのテストにメモしている
 */
export type CardSummaryKind = "active" | "mental" | "trouble";

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
export type VitalityUpdateQuery = Readonly<{
  /** 使用したスキルカード1枚毎の効果量増加 */
  boostPerCardUsed?: number;
  /** 効果に記載した値をそのまま適用するか、原文は「固定元気」 */
  fixedValue?: boolean;
  value: number;
}>;

/**
 * 状態修正データ定義
 *
 * - Modifier をデータ定義で行う時の形式
 */
export type ModifierData = Readonly<
  | {
      /**
       * 「スキルカード使用数追加+{amount}」
       *
       * - 原文の例
       *   - 「私がスター」は、「スキルカード使用数追加+1」
       * - 本家UIでは、このアイコンは、画面左端の状態修正アイコンリストに並ばず、左下の個別の位置に表示される
       * - 内部的には効果時間の設定もありそう
       *   - 状態修正の詳細を見ると、「1 1ターン」のように表記されていることから
       *   - ただし、好調などの他の効果が「新規追加時は、効果時間の自然減少が発生しない」のに対してこれは1ターン後には消えるので、他とは異なる概念のよう
       */
      kind: "additionalCardUsageCount";
      amount: number;
    }
  | {
      /**
       * 「低下状態無効（{times}）回」
       *
       * - 原文の例
       *   - 「アイドル魂」は、「低下状態無効（1回）」
       * - TODO: 未実装。正確な効果が不明、何が対象なのか（消費体力増加を消してくれる説は見た）、また、付与を防ぐのか付与されているものを削除するのか
       */
      kind: "debuffProtection";
      times: number;
    }
  | {
      /**
       * 「(次のターン|{delay}ターン後)、{effect}」
       *
       * - 原文の例
       *   - 「心のアルバム」は、「次のターン、スキルカードを引く」「2ターン後、スキルカードを引く」
       *   - 「ダメダメクッキング」は、「次のターン、手札をすべてレッスン中強化」
       *   - 「成就」は、「次のターン、パラメータ+32」
       * - 本家の状態修正詳細のテキストは、ターンが進むごとに進んだ数が反映されて減っていく
       */
      kind: "delayedEffect";
      /** 追加時は 1 以上、更新時は -1 のみ */
      delay: number;
      /**
       * 遅れて発動する効果
       *
       * - 本家では、効果は常に1つであり、効果の種類は「スキルカードを引く」「「手札を全てレッスン中強化」「パラメータ+n」のみ存在する
       * - 本ライブラリの設計上は、他の効果も含めることができるが、止める
       *   - 解決優先度を定義しないといけない問題が発生する。例えば、スキルカードを引く→手札強化、の順番は固定だが、現在はそれをハードコーディングで表現している。
       */
      effect: Extract<
        Effect,
        { kind: "drawCards" | "enhanceHand" | "perform" }
      >;
    }
  | {
      /**
       * 「次に使用するスキルカードの効果をもう1回発動（1回）」
       *
       * - 上記は原文の通り
       *   - 後者の「（1回）」は、変数ではなく固定のよう。下記の通り、複数回付与しても合算されないことから。
       *   - 前者の「もう1回発動」は、もしかしたら変数かもしれないが、現状は1回固定として扱う
       * - この状態修正は合算されない、例えば「国民的アイドル」を2回連続で使うと、2つの状態修正として表示される
       */
      kind: "doubleEffect";
      /** 状態修正更新クエリとして使用する際に、1 なら追加、-1 は削除、の意味。0 は計算中の削除待ち状態であり得る。 */
      times: 1 | 0 | -1;
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
      kind: "effectActivationOnTurnEnd";
      effect: Effect;
    }
  | {
      /**
       * スキルカード使用時の主効果発動前に効果発動
       *
       * - 原文の構文は、「以降、(アクティブスキルカード|メンタルスキルカード)使用時、{effect}」
       *   - 「ファンシーチャーム」は、「以降、メンタルスキルカード使用時、好印象+1」
       *   - 「演出計画」は、「以降、アクティブスキルカード使用時、固定元気+2」
       */
      kind: "effectActivationBeforeCardEffectActivation";
      cardKind?: CardSummaryKind;
      effect: Effect;
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
      /**
       * 「パラメータ上昇量増加50%（{duration}ターン）」
       *
       * - 「ビジュアルレッスン・ビジュアルターンのみ」のような条件を伴うものが多いが、これは付与条件なので、状態修正としては付与されたら一律に効果を発する
       */
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
      /**
       * 「好印象+{amount}」
       *
       * - とても不思議だが、好調のように「ターン」表記ではないので、 amount にしている
       *   - 消費する時も、「私がスター」は「好印象消費2」の表記、一方で「国民的アイドル」は「好調消費1ターン」の表記
       */
      kind: "positiveImpression";
      amount: number;
    }
>;

/**
 * メタ状態修正データ定義
 *
 * - 状態修正の種別に対する設定
 */
export type MetaModifierData = Readonly<{
  kind: ModifierData["kind"];
  label: string;
  /**
   * 同じ種別の状態修正を重複した時に合算するか
   *
   * - 「次に使用するスキルカードの効果をもう1回発動」や、いわゆる持続効果・発動予約は合算しない
   */
  nonAggregation: boolean;
}>;

/**
 * 状態修正
 *
 * - レッスン中に画面左上に表示されるアイコン群のことを、状態修正(modifier)と呼ぶ
 * - 現在の状況を表現するのに使うのと共に、更新を表現するのにも使う
 * - 付与された順番で左側のアイコンとアイコンタップ時の説明リストに表示される
 *   - 「スキルカード使用数+1」のアイコンは別の場所に表示されるが、説明リストには追加された順に表示されている
 * - 種類は名詞句で表現する、原文が名詞だから
 */
export type Modifier = Readonly<
  ModifierData & {
    /** 全てのインスタンスで一意のID */
    id: string;
    /** 既存インスタンスの更新時にのみ存在する、対象のID */
    updateTargetId?: string;
  }
>;

/**
 * 効果発動条件
 *
 * - スキルカードの効果に対して設定する場合は、効果それぞれの発動条件を意味する
 * - Pアイテムの効果に対して設定する場合は、Pアイテムの効果全体に対する発動条件を意味する
 * - 応援/トラブルの効果に対して設定する場合は、効果の発動条件を意味する
 *   - しかし、応援/トラブルは、1発動に対して1効果しか設定されていないので、発動条件であるとも言える
 */
export type EffectCondition = Readonly<
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
       * - 「好調nターン{(以上|以下)}」は、応援/トラブルのみに存在する
       * - "goodCondition" が min: 1 の時、実質は "hasGoodCondition" と同じ
       *   - 生成されるテキストは異なる
       */
      kind: "countModifier";
      modifierKind:
        | "focus"
        | "goodCondition"
        | "motivation"
        | "positiveImpression";
      /** 本家には、「a以上」または「a以下」のどちらかのみで、「a以上b以下」の指定はない */
      range: RangedNumber;
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
       */
      kind: "measureIfLifeIsEqualGreaterThanHalf";
    }
>;

/**
 * レッスン中の効果
 *
 * - スキルカード・Pアイテム・Pドリンクの効果を分解して抽象化・構造化したもの
 * - おおよそ、本家の効果説明欄の1行に対応する
 *   - ただし、Pアイテムの1行目は条件も含まれるなど、この限りではない。詳細はそれぞれの型定義を参照。
 */
export type Effect = Readonly<
  (
    | {
        /**
         * 体力を減少する
         *
         * - 原文の構文は、「体力減少{value}」
         *   - 「私の「初」の楽譜」は、「ターン開始時元気が0の場合、体力減少1」
         * - 現状はスキルカードには存在しない効果、上記のPアイテムとトラブルにのみ存在する
         * - TODO: 体力を直接減少するのではなくて、normalコスト相当かもしれない
         */
        kind: "drainLife";
        value: number;
      }
    | {
        /**
         * スキルカードを引く
         *
         * - 原文の構文は、「スキルカードを[{amount}枚]引く」
         *   - 「アイドル宣言」は、「スキルカードを2枚引く」
         *   - 「心のアルバム」は、「次のターン、スキルカードを引く」「2ターン後、スキルカードを引く」
         */
        kind: "drawCards";
        amount: number;
      }
    | {
        /**
         * 手札を強化する
         *
         * - 原文の構文は、「手札を全てレッスン中強化」
         *   - 「ティーパーティー」は、「手札を全てレッスン中強化」
         *   - 「薄れゆく壁」は、「次のターン、手札を全てレッスン中強化」「2ターン後、手札を全てレッスン中強化」
         */
        kind: "enhanceHand";
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
         * - 「重複不可」は無視して対象を選択する
         */
        kind: "generateCard";
      }
    | {
        /**
         * トラブルスキルカードを生成して山札へ入れる
         *
         * - 原文は、「眠気を山札のランダムな位置に生成」
         * - 現状は、原文通り「眠気」のみ
         * - 「山札のランダムな位置」がどこかは実際は不明
         *   - 普通に考えて、例えば、山札が2枚なら、1枚目の前・1枚目の後・2枚目の後、だと推測している
         */
        kind: "generateTroubleCard";
      }
    | {
        /**
         * レッスン終了までのターン数を追加する
         *
         * - 原文の構文は、「ターン追加+{amount}」
         * - この効果は、状態修正ではなさそう
         *   - 左アイコンリストにもそれをタップしたリストにもない
         */
        kind: "increaseRemainingTurns";
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
        modifier: ModifierData;
      }
    | {
        /**
         * 状態修正を乗算する
         *
         * - 原文の構文は、「{modifierKind}{multiplier}倍」
         *   - 「夢へのライフログ」は、「好印象1.5倍」
         * - 少なくとも、1.5倍の時の端数は切り上げ
         *   - 「夢へのライフログ」の参考動画: https://www.youtube.com/live/DDZaGs2xkNo?si=Ig8yc0Q9MK4bLdj_&t=3474
         *     - 好印象が 5 -> 8 になっている
         *   - 現状は「夢へのライフログ」の1.5倍しかないので、本実装では切り上げる
         */
        kind: "multiplyModifier";
        modifierKind: "positiveImpression";
        multiplier: number;
      }
    | {
        /**
         * スコアまたは元気またはその両方を増加する
         *
         * - 原文の構文は、「[パラメータ+{value}][（集中効果を{focusMultiplier}倍適用）][（{times}回）][{vitality}]」
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
         * - 割合計算上生じるスコアの端数は切り上げ
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
         * - 割合計算上生じるスコアの端数は切り上げ
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
  }
>;

/**
 * メモリーのアビリティの効果
 *
 * - 本家仕様を正確に表現はしない
 *   - 本実装は主にレッスンシュミレーター用なので、第一に必要になるのは「100%で何かを発生すること」で、他の重要度は低い
 */
export type MemoryEffect = Readonly<{
  kind:
    | "focus"
    | "halfLifeConsumption"
    | "goodCondition"
    | "motivation"
    | "positiveImpression"
    | "vitality";
  /** 発生確率、単位は%、0-100の範囲 */
  probability: number;
  /** 各効果の値、正の数のみ */
  value: number;
}>;

/**
 * 応援/トラブル
 *
 * - TODO: 今はプロデュース時に登場するものだけを考慮している。コンテストやアイドルの道のより複雑なものは対象外。
 */
export type Encouragement = Readonly<{
  effect: Effect;
  turnNumber: number;
}>;

/**
 * カードを使用する際の条件
 *
 * - 原文は、「{condition}」が効果欄の先頭へ記載される
 *   - コスト表記との前後は不明、現状は同時に記載されているスキルカードは無い
 * - 本条件とコストを満たす状態であるかで、カード使用の可否が決まる
 */
export type CardUsageCondition = Readonly<
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
       * - 本家の端数処理は未調査、現状は「以上」は切り上げ、「以下」は切り捨てで判定している。
       */
      kind: "measureValue";
      valueKind: "life" | "score";
      criterionKind: "greaterEqual" | "lessEqual";
      percentage: number;
    }
>;

/**
 * コストとして消費されることがある状態修正の種類
 */
export type ActionCostModifierKind =
  | "focus"
  | "goodCondition"
  | "motivation"
  | "positiveImpression";

/**
 * レッスン中の各種コスト
 *
 * - スキルカードの使用コスト及び一部のPアイテム効果欄にあるコストを構造化したもの
 * - コストに関してはほぼ全てがこの構造に収まる。現状の唯一の例外は、Pアイテムの「私の「初」の楽譜」の「体力減少1」という表記、Effect の "drainLife" を参照。
 * - 原文の構文は、1)通常コストの場合は表記無し、2)それ以外は、「(体力|{modifier})消費{value}」
 *   - スキルカードの場合は、スキルカード右下のアイコンと、効果欄の1行目に記載される
 *   - Pアイテムで通常コストを消費する場合に表記はどうなるのか？という疑問はあるが、現状そのようなPアイテムはない
 */
export type ActionCost = Readonly<{
  /**
   * コストの種類
   *
   * - "normal" は通常コストで体力または元気を消費する、"life" は体力のみを消費する
   */
  kind: "life" | "normal" | ActionCostModifierKind;
  value: number;
}>;

export type CardContentData = Readonly<{
  condition?: CardUsageCondition;
  cost: ActionCost;
  effects: Effect[];
  /**
   * レッスン開始時に手札に入るか
   *
   * - 原文は、「レッスン開始時手札に入る」
   * - 4枚以上を所持した時に手札の状況例
   *   - 4枚所持: 1ターン目:レッスン開始時手札4枚
   *   - 5枚所持: 1ターン目:レッスン開始時手札5枚
   *   - 6枚所持: 1ターン目:レッスン開始時手札5枚, 2ターン目:レッスン開始時手札1枚
   *   - 7枚所持: 1ターン目:レッスン開始時手札5枚, 2ターン目:レッスン開始時手札2枚
   *   - 8枚以上所持は、仕様が不明瞭で要調査。本実装では、とりあえず、あるだけ山札の先頭へ積むようにしている。
   *     - Ref: https://github.com/kjirou/gakumas-core/issues/37
   *     - Ref: https://github.com/kjirou/gakumas-core/issues/42
   */
  innate?: boolean;
  /** 使用後に除外するか、原文は「レッスン中1回」、デフォルトは false */
  usableOncePerLesson?: boolean;
}>;

/**
 * スキルカードデータ定義
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
export type CardData = Readonly<{
  /** 基本的なカードか、原文は「〜の基本」、デフォルトは false */
  basic?: boolean;
  cardPossessionKind: CardPossessionKind;
  cardProviderKind: CardProviderKind;
  cardSummaryKind: CardSummaryKind;
  /**
   * スキルカードの内容
   *
   * - 要素番号が、強化段階に対応する
   *   - 0 番目: 未強化
   *   - 1 番目: +
   *   - 2 番目: ++
   *   - 3 番目: +++
   * - 強化の値は、差分がある値のキーのみのオブジェクトで表現する
   *   - `最終的な内容 = {...基礎, ...強化1, ...強化2, ...強化3}` のような結合を行う
   * - トラブルカード以外は、3段階目まで強化が存在するよう
   */
  contents:
    | [CardContentData]
    | [
        CardContentData,
        Partial<CardContentData>,
        Partial<CardContentData>,
        Partial<CardContentData>,
      ];
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
}>;

/**
 * プロデュース中のスキルカード
 *
 * - 所持している、または所持の選択肢として表示するカード
 * - 所持中のスキルカードは、プロデュース開始時に生成され、プロデュース終了時に破棄される
 */
export type CardInProduction = Readonly<{
  data: CardData;
  /**
   * 有効か
   *
   * - 削除・変換・強化した場合、対象は false になる。強化は、新しいスキルカードとして追加する。
   */
  enabled: boolean;
  enhanced: boolean;
  /**
   * IdolInProduction["cards"] 内で一意のID
   *
   * - 本番では、常に IdGenerator で生成する
   * - テストでは、IdGenerator 生成と被らない任意の値の設定が可能
   */
  id: string;
}>;

export type CardEnhancement = Readonly<
  | {
      /** レッスン中の強化により付与された強化、原文の「レッスン中強化」に相当、"original"や既に"effect"がある場合は付与されない */
      kind: "effect";
    }
  | {
      /**
       * レッスンサポート
       *
       * - TODO: サポカのアイコンを表示するために、それを指定できるIDが必要
       */
      kind: "lessonSupport";
    }
  | {
      /** プロデュース中のスキルカードに付与されている強化 */
      kind: "original";
    }
>;

/**
 * レッスン中のスキルカード
 *
 * - レッスン開始前に生成され、レッスン終了時に破棄される
 */
export type Card = {
  /**
   * カード強化状態
   *
   * - スキルカードは、以下の強化状態を持つ。
   *   - A) プロデュース中の所持手札上で反映されている強化、ここでは「通常強化」と呼ぶ
   *   - B) 「レッスン中強化」
   *   - C) レッスンサポートによる強化、なおゲーム内のヘルプに解説がある
   * - A と B は排他でどちらかだけ有効になる、それに C の数を加えたものが、そのカードの強化数になる
   * - 強化数は最大で 3
   *   - カード名末尾に強化数分の "+" が付与される
   *     - レッスンサポートで付与された "+" は、青色になる
   */
  enhancements: CardEnhancement[];
  /**
   * スキルカードID
   *
   * - 1レッスン内で一意
   * - レッスン前に所持しているスキルカードについては CardInProduction["id"] を複製する
   *   - テストコード内で IdGenerator を渡さないで良いようにするため
   * - 一方で、生成したスキルカードは新たにIDを生成して割り振る
   */
  id: string;
  original: CardInProduction;
};

/**
 * カードセット定義
 */
export type CardSetData = Readonly<{
  cardDataIds: Array<CardData["id"]>;
  id: string;
}>;

export type ProducerItemTrigger = Readonly<
  (
    | {
        /**
         * スキルカード使用時の主効果発動後
         *
         * - 原文の構文は、「(アクティブ|メンタル)スキルカード使用後」
         *   - 「テクノドッグ」は、「スキルカード使用後やる気が3以上の場合、やる気+2」
         *   - 「ビッグドリーム貯金箱」は、「スキルカード使用後好印象が6以上の場合、好印象+3」
         *   - 「転がり続ける元気の源」は、「メンタルスキルカード使用後やる気が5以上の場合、やる気+3」
         * - 現状の本家では、状態修正値の条件を必ず伴っているが、本実装では任意にしている
         */
        kind: "afterCardEffectActivation";
        cardSummaryKind?: CardSummaryKind;
      }
    | {
        /**
         * スキルカード使用時の主効果発動前
         *
         * - 原文の構文は、「(アクティブ|メンタル)スキルカード使用時」
         *   - 「いつものメイクポーチ」は、「アクティブスキルカード使用時体力が50%以上の場合、集中+2」
         *   - 「最高にハッピーの源」は、「アドレナリン全開使用時、好調3ターン」
         *   - 「曇りをぬぐったタオル」は、「【ボーカルレッスン・ボーカルターンのみ】アクティブスキルカード使用時、体力回復2」
         */
        kind: "beforeCardEffectActivation";
        cardDataId?: CardData["id"];
        cardSummaryKind?: CardSummaryKind;
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
         * スキルカードの主効果により状態修正が増加した時
         *
         * - 原文の構文は、「{modifierKind}が増加後」
         *   - 「緑のお揃いブレス」は、「好印象が増加後、好印象+3」
         *   - 「願いを叶えるお守り」は、「やる気が増加後、やる気+2」
         *   - 「Dearリトルプリンス」は、「好調の効果ターンが増加後、好調3ターン」
         *   - 「放課後のらくがき」は、「集中が増加後体力が50%以上の場合、集中+2」
         *   - 「ひみつ特訓カーデ」は、「やる気が増加後、やる気+3」
         * - おそらくは、スキルカードの主効果による状態修正の増加のみを対象としている
         *   - 状態修正の継続効果による増加では発動しない
         *     - 例えば、「ひみつ特訓カーデ」は、「ワクワクが止まらない」の効果によるやる気増加では発動しない
         *       - 参考動画: https://www.youtube.com/live/zUdOzAkUVRY?si=5v6jyo5BoXUkwCC5&t=5916
         *       - 「厳選初星ブレンド」の継続効果も同じだった
         *   - Pドリンクの効果による増加では発動しない
         *     - 例えば、「ひみつ特訓カーデ」は、「ホットコーヒー」の効果によるやる気増加では発動しない
         *       - 参考動画: https://www.youtube.com/live/zUdOzAkUVRY?si=ioUWJCIpHTBUYk7W&t=6052
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
    | {
        /**
         * 2ターン毎のターン開始時
         *
         * - 原文の構文は、「2ターンごと」
         *   - 「柴犬ポシェット」は、「2ターンごと、元気+5」
         */
        kind: "turnStartEveryTwoTurns";
      }
  ) & {
    /**
     * 一部のアイドルパラメータ種別のみで有効か
     *
     * - 原文の構文は、「【(ボイス|ダンス|ビジュアル)レッスン・(ボイス|ダンス|ビジュアル)ターンのみ】」
     *   - 「得体のしれないモノ」は、「【ビジュアルレッスン・ビジュアルターンのみ】ターン開始時、パラメータ上昇量増加50%（1ターン）」
     *   - 「悔しさの象徴」は、「【ダンスレッスン・ダンスターンのみ】ターン開始時、パラメータ上昇量増加50%（1ターン）」
     *   - 「曇りをぬぐったタオル」は、「【ボーカルレッスン・ボーカルターンのみ】アクティブスキルカード使用時、体力回復2」
     * - 追い込みレッスンのクリア以降のパーフェクト狙い中（ボーナス中ともいう）は、この条件を常に満たすようになる
     *   - Ref: https://x.com/ondeath_id/status/1792068212634669195
     *   - Ref: https://gameo.jp/gkmas/1116
     */
    idolParameterKind?: IdolParameterKind;
  }
>;

export type ProducerItemContentData = Readonly<{
  /**
   * 効果発動条件
   *
   * - Pアイテム全体の効果発動条件を意味する
   *   - 原文の効果説明欄の構造上は、複数の効果があるときも、効果1行目に埋め込まれて記載されているよう
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
}>;

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
 */
export type ProducerItemData = Readonly<{
  /** 未強化時の内容 */
  base: ProducerItemContentData;
  /** 強化済み時の内容 */
  enhanced?: ProducerItemContentData;
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
}>;

/**
 * プロデュース中のPアイテム
 *
 * - プロデュース開始時に生成され、プロデュース終了時に破棄される
 */
export type ProducerItemInProduction = Readonly<{
  data: ProducerItemData;
  enhanced?: boolean;
  /**
   * IdolInProduction["producerItems"] 内で一意のID
   *
   * - 本番では、常に IdGenerator で生成する
   * - テストでは、IdGenerator 生成と被らない任意の値の設定が可能
   */
  id: string;
}>;

/**
 * レッスン中のPアイテム
 *
 * - レッスン開始前に生成され、レッスン終了時に破棄される
 */
export type ProducerItem = {
  /** 発動した回数 */
  activationCount: number;
  /**
   * PアイテムID
   *
   * - 1レッスン内で一意
   * - ProducerItemInProduction["id"] を複製する
   *   - テストコード内で IdGenerator を渡さないで良いようにするため
   */
  id: string;
  original: ProducerItemInProduction;
};

/**
 * アイドル個性定義
 */
export type CharacterData = Readonly<{
  firstName: string;
  id: string;
  lastName: string;
  /**
   * 最大体力
   *
   * - True End アチーブメント効果込み
   * - サポートカードでも変動するので、レッスンシミュレーター上ではあくまで参考値になりそう
   */
  maxLife: number;
}>;

/**
 * プロデュースアイドル定義
 */
export type IdolData = Readonly<{
  characterId: CharacterData["id"];
  id: string;
  producePlan: ProducePlan;
  rarity: "r" | "sr" | "ssr";
  specificCardId: CardData["id"];
  specificProducerItemId: ProducerItemData["id"];
  /** プロデュースアイドルのタイトル。例えば、咲季SSRなら"Fighting My Way"。 */
  title: string;
}>;

/**
 * プロデュース中のプロデュースアイドル
 *
 * - プロデュース開始時に生成され、プロデュース終了時に破棄される
 */
export type IdolInProduction = Readonly<{
  data: IdolData;
  deck: CardInProduction[];
  // NOTE: まだ使わないので一旦コメントアウト
  // idolParameters: IdolParameters;
  life: number;
  maxLife: number;
  /**
   * Pアイテムリスト
   *
   * - 上からプロデュース中に取得した順になる
   *   - 参考動画: https://www.youtube.com/live/DDZaGs2xkNo?si=5bPmJB51PRPnODv_&t=2245
   *     - たくさんPアイテムを取得しているプレイなのでわかりやすい
   */
  producerItems: ProducerItemInProduction[];
}>;

/**
 * レッスン中のプロデュースアイドル
 *
 * - レッスン開始前に生成され、レッスン終了時に破棄される
 */
export type Idol = {
  /**
   * アクションポイント
   *
   * - アイドルの1ターン内の行動回数、本家にあるのか不明な概念、現状は1か0のみ
   * - 1消費することで、スキルカードを1回使用するかスキップを1回できる
   * - 本家では、スキルカード使用数バフが残った状態でスキップをすると、その瞬間はスキルカード使用数は消えない
   *   - つまり、これに相当する概念とスキルカード使用数は別に管理されている可能性が高い
   *     - なお、その後の残ったスキルカード使用数は、ターン終了処理の効果時間切れで消えているよう
   *   - 「ターン終了フラグ」も考えたが、コンテストで複数のアイドルがいる状況を考えると、アイドル側に持たせた方が良さそう
   */
  actionPoints: number;
  life: number;
  /**
   * ターン開始時に付与されている状態修正IDリスト
   *
   * - ターン中に付与された状態修正の効果時間は、そのターンは減少しないという仕様がある
   * - そのため、ターン開始時に存在する状態修正を保持して、次ターン開始時に参照することで、そこにない状態修正の効果は減少させない
   */
  modifierIdsAtTurnStart: Array<Modifier["id"]>;
  modifiers: Modifier[];
  original: IdolInProduction;
  /**
   * Pアイテムリスト
   *
   * - 上からプロデュース中に取得した順になり、かつレッスン中に使える可能性のあるもののみに絞り込まれる
   *   - 参考動画: https://www.youtube.com/live/DDZaGs2xkNo?si=5bPmJB51PRPnODv_&t=2245
   *     - たくさんPアイテムを取得しているプレイなのでわかりやすい
   */
  producerItems: ProducerItem[];
  /**
   * スコアボーナス
   *
   * - 値はパーセンテージ
   * - 計算は、パラメータとしての値を一旦整数へ丸めた上で、その後にスコアボーナスで乗算し、端数を切り上げる
   *   - 例えば、好調中にパラメータ追加+9をして、スコアボーナスが175%なら、以下のように2回切り上げが発生する
   *     - `9 * 1.5 = 13.5 => 14`
   *     - `14 * 1.75 = 24.5 => 25`
   *   - 検証: https://github.com/kjirou/gakumas-core/issues/81
   */
  scoreBonus: Record<IdolParameterKind, number> | undefined;
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
 * ある時点のレッスンの状態
 *
 * - 本家では、「レッスン」「試験」「コンテスト」として表現されているもの
 */
export type Lesson = {
  /** レッスン内に存在するスキルカードリスト */
  cards: Card[];
  /**
   * レッスンのクリアに必要なスコア
   *
   * - 本家の仕様
   *   - レッスン
   *     - 通常/SPレッスンは、クリアスコアの倍がバーフェクトスコア
   *     - 中間試験追い込みレッスンは、90/270
   *     - 最終試験追い込みレッスンは、165/600
   *   - 中間試験
   *     - クリアスコアは不明
   *     - パーフェクトスコアは1700、ゲーム内に「スコア1700以上で中間試験突破」という記述がある
   *   - 最終試験・コンテスト・アイドルの道
   *     - クリアスコアはそれぞれ不明
   *     - パーフェクトスコアはなさそう
   */
  clearScoreThresholds:
    | {
        clear: number;
        /** clear の数値を含む合計で指定する、本家の表現へ合わせている */
        perfect?: number;
      }
    | undefined;
  /** 山札、原文でも「山札」 */
  deck: Array<Card["id"]>;
  /** 捨札、原文でも「捨札」、山札の再生成時に含まれるカード群 */
  discardPile: Array<Card["id"]>;
  /**
   * 応援/トラブルリスト
   *
   * - 1ターン番号に対しては、1つの設定のみ
   */
  encouragements: Encouragement[];
  /** 手札、原文でも「手札」、最大5枚 */
  hand: Array<Card["id"]>;
  idol: Idol;
  /**
   * レッスンクリア以降はパラメータ属性が全属性になるか
   *
   * - クリア以降は、【ボイスレッスン・ボイスターンのみ】などのパラメータ属性条件を無視し、条件を常に満たすようになる設定
   *   - 本家の「追い込みレッスン」の仕様
   */
  ignoreIdolParameterKindConditionAfterClearing: boolean;
  memoryEffects: MemoryEffect[];
  /**
   * 山札が0枚の時にプレイされたスキルカードIDリスト
   *
   * - 本家仕様には、不具合だと思われる、妙な仕様がある
   *   - それは「山札が0枚の時にターン終了し、ターン開始時の手札を引いた時、前ターンの最後に使用したスキルカードと使わなかった手札は、山札の再構築に含まれず次の捨札になる」というもの
   * - これを再現するために、この条件に合致する使用されたスキルカードを保持する
   *   - 次のターン開始処理の手札を引く時に参照して、山札の再構築の候補から外して、直接捨札へ配置する
   * - 補足:
   *   - ターン最後のスキルカードを、スキルカード使用数追加がある状態で使用し、その後にスキップした場合もこの仕様の影響を受ける
   *   - 山札0枚時に「仕切り直し」を使った時は、この現象は発生しない
   *     - 仕様確認動画: https://www.youtube.com/watch?v=OfLUwt2eIDs
   *   - 除外に入る札は、結果的にこの仕様の影響を受けないので、ここには含めない
   */
  playedCardsOnEmptyDeck: Array<Card["id"]>;
  /** 最終ターン数への修正、現状は「ターン追加」効果により増加する状況しか考慮していない、つまり常に正の数 */
  remainingTurns: number;
  /** 除外されたカード群、原文は「除外」、山札の再生成時に含まれないカード群 */
  removedCardPile: Array<Card["id"]>;
  /**
   * スコア
   *
   * - 原文では、レッスン時は「パラメータ」、試験・コンテスト時は「スコア」と表記されているもの
   */
  score: number;
  /** ターン番号、初期化時は0でプレイヤー行動可能時点で1になる、関連する原文は「{turnNumber}目以降の場合、使用可」 */
  turnNumber: number;
  /**
   * ターン別のパラメータ種別リスト
   *
   * - 0要素目が1ターン目で、末尾要素が最終ターンになる
   * - 「ターン追加」の効果は、この値には含まれない
   */
  turns: Array<IdolParameterKind>;
};

/**
 * レッスン履歴レコード
 *
 * TODO: 本家のレッスン履歴の再現は、全般的に後回し。表示パターンの精査に対して個別のkindを割り振ることから始める必要がある。
 *
 * - 本家で、レッスン中に右下のボタンから表示できる履歴を再現するためのもの
 * - 原文の構文は、以下の通り
 *   - ターン別にセクションになっており、ヘッドラインと結果レコードリストがある。結果レコードの中には体力・元気・状態変化別の差分レコードがある。
 *   - 好調や好印象などのターン毎の自然減少は、どの階層のセクションにも表示されない
 *   - ヘッドライン:
 *     - 「残りターン数{n}」「{n}ターン目」「{スコアボーナス}%」
 *   - 結果レコードのヘッドライン:
 *     - 「スキルカード「{名称}」」
 *     - 「Pアイテム「{名称}」」
 *     - 「Pドリンク「{名称}」」
 *     - 「持続効果「{名称}」」
 *       - 「厳選初星マキアート」などのターン毎に状態変化を追加する効果、好印象によるスコア加算、遅延付き効果、などが含まれる
 *     - 「応援」
 *     - 「トラブル」
 *     - スキルカード未使用時は、結果レコードのヘッドラインなし
 *       - 差分レコードの1行目に「スキルカード未使用」
 *   - 差分レコードのヘッドライン:
 *     - 「{Pアイテム名}」
 *       - 状態変化などのトリガーによりPアイテムが発動したとき
 *   - 差分レコード
 *     - 「(スコア|元気|好調|集中|好印象|やる気|スキルカード使用数追加) {before} → {after}」
 *       - 値は3桁毎のカンマ区切り無し
 *       - 増加と減少で色が違う
 *       - スコアの際は、複数回発動の時は各れコードが別で残る
 *         - 「コール＆レスポンス」の効果が分かれている2回も、「試行錯誤」の効果が1つの2回も、同様に別れコードで残った
 *     - 「発動予約が付与」
 *     - 「スキルカード 「{名称}」を1枚山札から引いた」
 *     - 「スキルカード 「{名称}」を強化」
 *       - 強化済みカードを強化しても履歴には残る
 *     - 「ターンを{n}ターン追加」
 *     - 「{固有名詞}が付与」
 *       - Pドリンクの「厳選初星マキアート」を使った時は「厳選初星マキアートが付与」という表記だった
 *       - 「烏龍茶」の時は、元気の表記だったので、一部の効果はこうなるよう
 * - TODO: 手札情報ボタンの内容
 */
type LessonHistoryRecord =
  | {
      kind: "cardUsage";
    }
  | {
      kind: "cheering";
    }
  | {
      kind: "trouble";
    };

export type LessonUpdateQueryReason = Readonly<
  (
    | {
        /** スキルカード使用 */
        kind: "cardUsage";
        cardId: Card["id"];
      }
    | {
        /** スキルカード使用.残りスキルカード使用数消費 */
        kind: "cardUsage.remainingCardUsageCountConsumption";
      }
    | {
        /** スキルカード使用.効果発動 */
        kind: "cardUsage.mainEffectActivation";
        cardId: Card["id"];
        effectIndex: number;
      }
    | {
        /** スキルカード使用プレビュー */
        kind: "cardUsagePreview";
      }
    | {
        /** スキルカード使用時トリガーにより発動した効果 */
        kind: "cardUsageTrigger";
        cardId: Card["id"];
      }
    | {
        /** レッスン終了 */
        kind: "lessonEnd";
      }
    | {
        /** レッスン生成直後 */
        kind: "lessonInitialization";
      }
    | {
        /** レッスン開始時トリガーにより発動した効果 */
        kind: "lessonStartTrigger";
      }
    | {
        /** 状態修正増加トリガーにより発動した効果 */
        kind: "modifierIncreaseTrigger";
      }
    | {
        /**
         * ターン終了時トリガーにより発動した効果
         *
         * - 好調や好印象などのターン経過毎の減少もこれで表現する
         */
        kind: "turnEndTrigger";
      }
    | {
        /** ターンのスキップ */
        kind: "turnSkip";
      }
    | {
        /** ターン開始時トリガーにより発動した効果 */
        kind: "turnStartTrigger";
      }
    | {
        /** テストのダミー値としてや開発時に一時的に設定 */
        kind: "unknown";
      }
  ) & {
    /**
     * レッスン履歴上のターン数
     *
     * - historyResultIndex 含めて、ゲーム内のレッスン履歴のどこに含まれるかを表現したもの
     * - レッスン履歴を生成する時だけではく、タイムトラベル機能を作るときの程よい区切りにも使う予定
     * - ターン数なので、1から始まる連番
     *   - 0 から始まり、必ず漏れがない。ターン数増加も1レコードになっているため。
     */
    historyTurnNumber: number;
    /**
     * レッスン履歴の1ターン内の結果インデックス
     *
     * - ゲーム内のレッスン履歴内の1ターン内の結果レコードリストの何番目に含まれるかを表現したもの
     * - 1から始まる連番
     * - 本家のレッスン履歴へ表示されないものも、データ上は1レコードとして含める。例えば、手札の配布・好調や好印象のターン毎の自然減少、など。
     */
    historyResultIndex: number;
  }
>;

export type LessonUpdateQueryDiff = Readonly<
  | {
      kind: "actionPoints";
      amount: number;
    }
  | {
      /**
       * カード配置の上書き
       *
       * - 変化のあった配置のみプロパティが存在する
       */
      kind: "cardPlacement";
      deck?: Array<Card["id"]>;
      discardPile?: Array<Card["id"]>;
      hand?: Array<Card["id"]>;
      removedCardPile?: Array<Card["id"]>;
    }
  | {
      /** スキルカードの追加 */
      kind: "cards.addition";
      card: Card;
    }
  | {
      /** スキルカードの強化、「レッスン中強化」効果によるもの */
      kind: "cards.enhancement.effect";
      cardIds: Array<Card["id"]>;
    }
  | {
      /**
       * スキルカードの強化、レッスンサポートによるもの
       *
       * - supportCardIds は、要素数で強化数を表現している。サポートカードのID自体はまだ未実装
       */
      kind: "cards.enhancement.lessonSupport";
      targets: Array<{
        cardId: Card["id"];
        supportCardIds: Array<{}>;
      }>;
    }
  | {
      /** レッスンサポートの削除 */
      kind: "cards.removingLessonSupports";
      cardIds: Array<Card["id"]>;
    }
  | {
      kind: "life";
      /** アイドルの状態へ実際に影響を与える数値。例えば、残り体力1の時に、トラブルの体力減少で3減らされた時は1になる。 */
      actual: number;
      /** アイドルの状態へ本来影響を影響を与えはずだった数値。例えば、残り体力1の時に、トラブルの体力減少で3減らされた時は3になる。 */
      max: number;
    }
  | {
      /** ターン開始時に付与されている状態修正IDリストの上書き */
      kind: "modifierIdsAtTurnStart";
      modifierIdsAtTurnStart: Array<Modifier["id"]>;
    }
  | {
      /**
       * 状態修正の差分
       */
      kind: "modifier";
      actual: Modifier;
      max: Modifier;
    }
  | {
      kind: "playedCardsOnEmptyDeck";
      cardIds: Lesson["playedCardsOnEmptyDeck"];
    }
  | {
      kind: "producerItem.activationCount";
      producerItemId: ProducerItem["id"];
      value: ProducerItem["activationCount"];
    }
  | {
      kind: "remainingTurns";
      amount: number;
    }
  | {
      kind: "score";
      /** レッスンなどでパラメータの上限値が決まっている場合に、超過した分を差し引いた実際に上昇した数値 */
      actual: number;
      max: number;
    }
  | {
      kind: "turnNumberIncrease";
    }
  | {
      kind: "vitality";
      actual: number;
      max: number;
    }
>;

/**
 * レッスン更新クエリ
 *
 * - TODO: ゲーム内履歴のスキルカード使用時トリガーは、スキルカード使用の子として表現されているので、クエリ上は別レコードにするならそれぞれの関連を表現する必要がある
 *
 * - Lesson に対しての1更新を、patch可能なレコードで表現したもの
 * - スキルカード使用・Pアイテム発動・Pアイテム使用・応援/トラブルなどによる、レッスンの状態変化を表現する
 * - このクエリを集計して、UIその他の各種機能に利用することもある
 *   - 具体的には、スキルカード選択時のプレビュー・ゲーム内のレッスン履歴表示・インタラクションやアニメーションなどに利用する
 */
export type LessonUpdateQuery = LessonUpdateQueryDiff & {
  reason: LessonUpdateQueryReason;
};

/**
 * レッスンのプレイ記録
 */
export type LessonGamePlay = {
  getRandom: GetRandom;
  idGenerator: IdGenerator;
  /**
   * 開始時点のレッスンの状態
   *
   * - 現在の状態や履歴は、 `updates` を適用して算出する
   */
  initialLesson: Lesson;
  updates: LessonUpdateQuery[];
};

/**
 * 応援/トラブルの表示用情報
 *
 * - 主に、本家アイドルの道の各ステージ画面にある、右上の応援/トラブル詳細のリストに使用することを想定している
 */
export type EncouragementDisplay = Encouragement & {
  description: string;
};

/**
 * レッスン中の手札の表示用情報
 *
 * - 各値は、基本的には各種効果による変動を含めた値
 */
export type CardInHandDisplay = {
  cost: ActionCost;
  /**
   * 効果概要リスト
   *
   * - 本家UIでは左下の縦並びのアイコンリストで表現している内容
   * - スコアと元気に関しては、条件付きの時のみここへ表示する
   */
  effects: Array<{
    kind:
      | Exclude<Effect, { kind: "getModifier" } | { kind: "perform" }>["kind"]
      | `modifier-${Modifier["kind"]}`
      | "perform-score"
      | "perform-vitality";
    /** 効果適用条件を満たすか、本家UIだと右にx印が付く */
    applyable: boolean;
  }>;
  enhancements: CardEnhancement[];
  /** スキルカードの名称、末尾に強化数分の"+"が付く */
  name: string;
  /** 使用条件を満たすか */
  playable: boolean;
  /** スコア、レッスンのスコア条件を考慮しない最大値 */
  scores: Array<{ value: number; times: number }>;
  /**
   * 元気
   *
   * - 1回目に発動する元気のみの値
   *   - 例えば、「本気の趣味」の2回目の元気の適用条件を満たしていても、1回目の元気の値のみ含める
   *   - おそらく本家仕様だと、1回目ではなく効果適用条件の無い元気が選ばれているが、現状のデータ上は1つ目に条件の無いものが定義されていて同じ結果なので、一旦気にしない
   */
  vitality: number | undefined;
};

/**
 * レッスン中のPアイテムの表示用情報
 *
 * - 主に、本家レッスン画面の、右上のアイコンリストをタッチした時の詳細情報に使用することを想定している
 */
export type ProducerItemDisplay = ProducerItem & {
  description: string;
  name: string;
  /** 残り発動回数 */
  remainingTimes: number | undefined;
};

/**
 * レッスン中の状態修正の表示用情報
 *
 * - 主に、本家レッスン画面の、左上のアイコンリストをタッチした時の詳細情報に使用することを想定している
 * - TODO: 本家だと、1つ目に必ず「おすすめ効果」がある、おすすめ効果は状態修正を付与していなくても表示される
 */
export type ModifierDisplay = ModifierData & {
  /**
   * 効果の1行説明
   *
   * - 例えば、「好調」なら「スコア上昇量を50%増加 nターン」など
   * - TODO: 未実装
   */
  description: string;
  id: Modifier["id"];
  label: string;
};

/**
 * レッスン中の各ターンの表示用情報
 *
 * - 主に、本家レッスン画面の、左上の現在ターンをタッチした時の詳細情報に使用することを想定している
 */
export type TurnDisplay = {
  encouragement?: EncouragementDisplay;
  idolParameterKind: IdolParameterKind;
  idolParameterLabel: string;
  turnNumber: number;
  /** 現在のターンとの差、1が1ターン後、-1が1ターン前 */
  turnNumberDiff: number;
};

/**
 * レッスンの表示用情報
 */
export type LessonDisplay = {
  hand: CardInHandDisplay[];
  life: Idol["life"];
  modifiers: ModifierDisplay[];
  producerItems: ProducerItemDisplay[];
  remainingTurns: Lesson["remainingTurns"];
  scoreBonus: number | undefined;
  turnNumber: number;
  /** ターン追加を反映した長さのターンリスト */
  turns: TurnDisplay[];
  vitality: Idol["vitality"];
};
