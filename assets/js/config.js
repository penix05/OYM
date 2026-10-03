/* =============================================================
   株式会社On Your Mark  フォーム設定ファイル
   -------------------------------------------------------------
   ここだけを書き換えれば、フォームの送信先を切り替えられます。
   このファイルはブラウザから読めます。APIキーなど「秘密の値」は
   絶対に書かないでください（サーバー側の form/config.php に置きます）。
   ============================================================= */
var OYM_FORM = {

  /* 送信先エンドポイント。
     空文字 "" のままだと「デモモード」（送信せず完了ページへ遷移）で動きます。
       ・同梱のPHPを使う場合      : "form/send.php"
       ・Formspree等を使う場合    : "https://formspree.io/f/xxxxxxxx"
       ・WordPress(CF7)を使う場合 : "https://oym.co.jp/wp-json/contact-form-7/v1/contact-forms/123/feedback" */
  endpoint: "form/send.php",

  /* reCAPTCHA v3 のサイトキー（公開してよい値。HTMLに埋め込まれます）。
     空にするとブラウザ側はトークンを送らなくなります。
     ※ 対になる「シークレットキー」はサーバー上の form/config.php に置きます。
        このファイルはブラウザから丸ごと読めるので、絶対に書かないこと。 */
  recaptchaSiteKey: "6LcaId0tAAAAADbezCcaSzWSl9AQg3hR618Odc8a",

  /* 送信に失敗したときに案内するメールアドレス */
  fallbackEmail: "contact@oym.co.jp",

  /* 入力開始からこの秒数より早い送信はボット判定して弾く */
  minSubmitSeconds: 3
};
