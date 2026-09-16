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

  /* reCAPTCHA v3 のサイトキー（公開してよい値）。
     空のままならreCAPTCHAなしで動作します。
     設定する場合は contact.html / download.html の
     <script src="https://www.google.com/recaptcha/api.js?render=..."> も有効化してください。 */
  recaptchaSiteKey: "",

  /* 送信に失敗したときに案内するメールアドレス */
  fallbackEmail: "contact@oym.co.jp",

  /* 入力開始からこの秒数より早い送信はボット判定して弾く */
  minSubmitSeconds: 3
};
