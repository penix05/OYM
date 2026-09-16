<?php
/* =============================================================
   株式会社On Your Mark  フォーム サーバー側設定（サンプル）
   -------------------------------------------------------------
   このファイルを「config.php」という名前でコピーし、値を書き換えてください。
   config.php はブラウザから読めないよう .htaccess で保護しています。
   ============================================================= */
return array(

  // 通知の送信先（複数指定可）
  //   例: array('contact@oym.co.jp', 'eigyo@oym.co.jp')
  'to'            => array('contact@oym.co.jp'),

  // 送信元アドレス。必ず「自社ドメインの実在するアドレス」にしてください。
  // 入力者のアドレスを From に使うとなりすまし扱いになり、迷惑メール判定されます。
  // contact@oym.co.jp（= 受信先と同じ）でも問題ありません。むしろ自動返信の差出人も
  // このアドレスになるため、お客様が自動返信にそのまま返信しても担当者に届きます。
  'from'          => 'contact@oym.co.jp',
  'from_name'     => 'On Your Mark サイト',

  // 自動返信メールを送るか
  'autoreply'         => true,
  'autoreply_subject' => '【On Your Mark】お問い合わせありがとうございます',

  // 送信記録をCSVに残す（不要なら空文字に）。Web公開領域の外を推奨。
  'log_file'      => __DIR__ . '/logs/submissions.csv',

  // reCAPTCHA v3（使わない場合は空文字のまま）
  'recaptcha_secret'    => '',
  'recaptcha_min_score' => 0.5,

  // 資料ダウンロードのワンタイムURL用の秘密鍵。
  // 必ずランダムな長い文字列に変更してください（例: openssl rand -base64 48）
  'token_secret'  => 'CHANGE-ME-TO-A-LONG-RANDOM-STRING',
  'token_ttl'     => 3600, // ダウンロードURLの有効期間（秒）

  // 配布するPDF（Web公開領域の外に置くのが理想）
  'download_file' => __DIR__ . '/../docs/OYM_教育機関向けサービス案内.pdf',
  'download_name' => 'OYM_教育機関向けサービス案内.pdf',

  // 同一IPからの連続送信を制限（秒）
  'throttle_seconds' => 30,
);
