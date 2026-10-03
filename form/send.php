<?php
/* =============================================================
   株式会社On Your Mark  フォーム送信処理
   -------------------------------------------------------------
   contact.html / download.html から fetch() でPOSTされます。
   JSON（{"ok":true} または {"ok":false,"message":"..."}）を返します。
   必要なもの：PHP 7.0 以上（一般的なレンタルサーバーで動きます）
   ============================================================= */
declare(strict_types=1);
mb_internal_encoding('UTF-8');
mb_language('uni');

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');

function oym_fail(string $message, int $status = 400): void {
    http_response_code($status);
    echo json_encode(array('ok' => false, 'message' => $message), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    oym_fail('不正なリクエストです。', 405);
}

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
    oym_fail('サーバー側の設定が未完了です（form/config.php がありません）。', 500);
}
$cfg = require $configPath;

/* ---- 同一オリジンからの送信かを簡易チェック（CSRF/外部フォーム対策） ---- */
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === '' && !empty($_SERVER['HTTP_REFERER'])) {
    $parts = parse_url($_SERVER['HTTP_REFERER']);
    if (!empty($parts['scheme']) && !empty($parts['host'])) {
        $origin = $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '');
    }
}
$self = (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off' ? 'http' : 'https') . '://' . ($_SERVER['HTTP_HOST'] ?? '');
if ($origin !== '' && $origin !== $self) {
    oym_fail('不正なリクエストです。', 403);
}

/* ---- ハニーポット（人には見えない項目。入力があれば静かに成功を返す） ---- */
if (trim((string)($_POST['website'] ?? '')) !== '') {
    echo json_encode(array('ok' => true), JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---- 連投制限 ---- */
$throttle = (int)($cfg['throttle_seconds'] ?? 0);
if ($throttle > 0) {
    $ip  = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $key = sys_get_temp_dir() . '/oym_throttle_' . sha1($ip);
    if (is_file($key) && (time() - (int)filemtime($key)) < $throttle) {
        oym_fail('送信の間隔が短すぎます。しばらくおいてからお試しください。', 429);
    }
    @touch($key);
}

/* ---- reCAPTCHA v3 ---- */
if (!empty($cfg['recaptcha_secret'])) {
    $token = (string)($_POST['recaptcha_token'] ?? '');
    if ($token === '') {
        oym_fail('スパム判定のためのチェックに失敗しました。ページを再読み込みしてお試しください。');
    }
    $verify = @file_get_contents(
        'https://www.google.com/recaptcha/api/siteverify',
        false,
        stream_context_create(array('http' => array(
            'method'  => 'POST',
            'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => http_build_query(array(
                'secret'   => $cfg['recaptcha_secret'],
                'response' => $token,
                'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
            )),
            'timeout' => 8,
        )))
    );
    $result = $verify ? json_decode($verify, true) : null;

    if (!is_array($result)) {
        /*
         * Googleの照会先に届かなかった（サーバーの外向き通信の障害、Google側の一時停止など）。
         * ここで送信を止めると、ボットではない普通のお問い合わせまで全部失われてしまう。
         * 原因がこちら側にあるときに機会損失を出すほうが損害が大きいので、
         * 照会できなかった場合だけは通し、記録だけ残す。
         * （この場合もハニーポット・連投制限・送信までの秒数チェックは効いている）
         */
        error_log('[OYM form] reCAPTCHA の照会に失敗したため、検証を省略して受け付けました。');
    } else {
        $minScore = (float)($cfg['recaptcha_min_score'] ?? 0.3);
        $score    = isset($result['score']) ? (float)$result['score'] : null;
        if (empty($result['success']) || ($score !== null && $score < $minScore)) {
            error_log(sprintf(
                '[OYM form] reCAPTCHA で拒否: success=%s score=%s errors=%s',
                empty($result['success']) ? 'false' : 'true',
                $score === null ? '-' : (string)$score,
                isset($result['error-codes']) ? implode(',', (array)$result['error-codes']) : '-'
            ));
            oym_fail('自動送信の疑いがあるため受け付けられませんでした。お手数ですが直接メールにてご連絡ください。');
        }
    }
}

/* ---- 入力値の取り出しと検証 ---- */
function oym_post(string $key, int $max = 1000): string {
    $v = (string)($_POST[$key] ?? '');
    $v = str_replace(array("\r\n", "\r"), "\n", trim($v));
    return mb_substr($v, 0, $max);
}

/**
 * メールヘッダ（件名・Reply-To等）に入れる値から制御文字を取り除く。
 * 改行が1つでも残ると、そこから任意のヘッダを注入できてしまうため、
 * ヘッダに使う値は必ずこの関数を通すこと。
 */
function oym_header_safe(string $v): string {
    // 改行・タブ・その他の制御文字をすべて除去（本文用の値には使わない）
    $v = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v);
    return trim((string)$v);
}

/**
 * CSVに書き出す値を、表計算ソフトが数式として解釈しないようにする。
 * = + - @ やタブ・改行で始まる値は、Excel や Google スプレッドシートが
 * 数式とみなして実行することがある（CSVインジェクション）。
 * 先頭にシングルクォートを付けて、文字列として扱わせる。
 * ※ 電話番号の「+81…」なども '+81… になるが、表示上の問題にとどまる。
 */
function oym_csv_safe(string $v): string {
    if ($v !== '' && preg_match('/^[=+\-@\t\r\n]/', $v)) {
        return "'" . $v;
    }
    return $v;
}

$formType = oym_post('form_type', 20) === 'download' ? 'download' : 'contact';
$name     = oym_post('name', 100);
$org      = oym_post('org', 200);
$email    = oym_post('email', 200);
$tel      = oym_post('tel', 40);
$message  = oym_post('message', 4000);
$audience = oym_post('audience', 20);
$pageUrl  = oym_post('page_url', 500);
$consent  = isset($_POST['consent']);

$labels = array(
    'school'  => '教育機関の方', 'company' => '企業の方',
    'student' => '学生の方',     'other'   => 'その他',
);
$audienceLabel = $labels[$audience] ?? ($formType === 'download' ? '資料ダウンロード' : '未選択');

$errors = array();
if ($name === '')  { $errors[] = 'お名前'; }
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors[] = 'メールアドレス'; }
if ($formType === 'contact' && mb_strlen($message) < 5) { $errors[] = 'お問い合わせ内容'; }
if (!$consent) { $errors[] = '個人情報の取扱いへの同意'; }
if ($errors) {
    oym_fail('次の項目をご確認ください：' . implode('、', $errors));
}
// ヘッダに入る値（件名・Reply-To）に制御文字が含まれていないことを確認したうえで、
// 念のため除去した値をヘッダ組み立てに使う。
if (preg_match('/[\x00-\x1F\x7F]/u', $name . $org . $email)) {
    oym_fail('お名前・学校企業名・メールアドレスに使用できない文字が含まれています。');
}
$nameHdr = oym_header_safe($name);
$orgHdr  = oym_header_safe($org);

/* ---- 通知メールの作成 ---- */
$subjectWho = $nameHdr . ($orgHdr !== '' ? '（' . $orgHdr . '）' : '');
$subject = $formType === 'download'
    ? '【サイト】資料ダウンロード申込：' . $subjectWho
    : '【サイト】お問い合わせ（' . $audienceLabel . '）：' . $subjectWho;
$subject = mb_substr($subject, 0, 150);

$lines = array(
    'Webサイトのフォームから送信がありました。',
    '',
    '───────────────────────────',
    '種別　　　：' . ($formType === 'download' ? '資料ダウンロード' : 'お問い合わせ'),
    'お立場　　：' . $audienceLabel,
    'お名前　　：' . $name,
    '学校・企業：' . ($org !== '' ? $org : '（未入力）'),
    'メール　　：' . $email,
    '電話　　　：' . ($tel !== '' ? $tel : '（未入力）'),
    '───────────────────────────',
    '',
    '【内容】',
    ($message !== '' ? $message : '（未入力）'),
    '',
    '───────────────────────────',
    '送信ページ：' . $pageUrl,
    '送信日時　：' . date('Y-m-d H:i:s'),
    'IPアドレス：' . ($_SERVER['REMOTE_ADDR'] ?? ''),
    'UA　　　　：' . mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300),
);
$body = implode("\n", $lines);

$fromName = mb_encode_mimeheader((string)($cfg['from_name'] ?? 'On Your Mark'), 'UTF-8');
$from     = (string)($cfg['from'] ?? ('no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost')));
$headers  = array(
    'From: ' . $fromName . ' <' . $from . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: OYM-Site',
);

$to   = (array)($cfg['to'] ?? array('contact@oym.co.jp'));
$sent = mb_send_mail(implode(', ', $to), $subject, $body, implode("\r\n", $headers), '-f' . $from);
if (!$sent) {
    oym_fail('メールサーバーでエラーが発生しました。お手数ですが直接メールにてご連絡ください。', 500);
}

/* ---- 自動返信 ---- */
if (!empty($cfg['autoreply'])) {
    $replyBody = implode("\n", array(
        $name . ' 様',
        '',
        'この度は株式会社On Your Markへお問い合わせいただき、誠にありがとうございます。',
        '以下の内容で受け付けいたしました。担当者より改めてご連絡いたします。',
        '',
        '───────────────────────────',
        'お名前　　：' . $name,
        '学校・企業：' . ($org !== '' ? $org : '（未入力）'),
        'メール　　：' . $email,
        '電話　　　：' . ($tel !== '' ? $tel : '（未入力）'),
        '',
        '【内容】',
        ($message !== '' ? $message : '（未入力）'),
        '───────────────────────────',
        '',
        '※本メールは自動送信ですが、このままご返信いただければ担当者に届きます。',
        '',
        '株式会社On Your Mark',
        '〒150-0034 東京都渋谷区代官山町9-10 SodaCCo 3F',
        'TEL：03-6455-3217',
        'https://oym.co.jp/',
    ));
    // 自動返信の Reply-To は「お問い合わせ窓口」に向ける。
    // 通知メール用の $headers を流用すると Reply-To が受信者自身になり、返信が迷子になる。
    $replyHeaders = array(
        'From: ' . $fromName . ' <' . $from . '>',
        'Reply-To: ' . $to[0],
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Auto-Submitted: auto-replied',
        'X-Mailer: OYM-Site',
    );
    @mb_send_mail($email, (string)($cfg['autoreply_subject'] ?? 'お問い合わせありがとうございます'),
        $replyBody, implode("\r\n", $replyHeaders), '-f' . $from);
}

/* ---- 送信記録（CSV） ---- */
if (!empty($cfg['log_file'])) {
    $logFile = (string)$cfg['log_file'];
    $dir = dirname($logFile);
    if (!is_dir($dir)) { @mkdir($dir, 0700, true); }

    clearstatcache(true, $logFile);
    $isNew = !is_file($logFile) || filesize($logFile) === 0;

    if ($fh = @fopen($logFile, 'a')) {
        if ($isNew) {
            /*
             * ファイルを新しく作るときだけ、先頭に2つ置く。
             *
             * 1) BOM（\xEF\xBB\xBF）
             *    日本語版のExcelはCSVを既定でShift_JISとして開くため、
             *    UTF-8のまま渡すと日本語が文字化けする。先頭にBOMがあると
             *    ExcelがUTF-8と判別してくれるので、ダブルクリックで開ける。
             * 2) 見出し行
             *    どの列が何かを、ファイル単体で分かるようにしておく。
             */
            @fwrite($fh, "\xEF\xBB\xBF");
            @fputcsv($fh, array(
                '送信日時', 'フォーム', 'お立場', 'お名前', '学校名・会社名',
                'メールアドレス', '電話番号', 'ご相談内容', 'IPアドレス',
            ));
            // 個人情報を含むファイルなので、所有者だけが読める権限にする
            @chmod($logFile, 0600);
        }
        $row = array(date('c'), $formType, $audienceLabel, $name, $org, $email, $tel, $message, $_SERVER['REMOTE_ADDR'] ?? '');
        @fputcsv($fh, array_map('oym_csv_safe', $row));
        @fclose($fh);
    }
}

/* ---- 資料ダウンロード用のワンタイムトークンを発行 ---- */
$response = array('ok' => true);
if ($formType === 'download' && !empty($cfg['token_secret'])) {
    $exp     = time() + (int)($cfg['token_ttl'] ?? 3600);
    $payload = $exp . '|' . sha1($email);
    $sig     = hash_hmac('sha256', $payload, (string)$cfg['token_secret']);
    $response['token'] = rtrim(strtr(base64_encode($payload . '|' . $sig), '+/', '-_'), '=');
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
