<?php
/* =============================================================
   株式会社On Your Mark  資料PDFのワンタイム配信
   -------------------------------------------------------------
   send.php が発行した署名付きトークン（有効期限つき）を検証し、
   正しい場合だけPDFを返します。docs/ 直下は .htaccess で
   直接アクセスを禁止しているため、フォームを通さずには取得できません。
   ============================================================= */
declare(strict_types=1);

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
    http_response_code(500);
    exit('サーバー側の設定が未完了です。');
}
$cfg = require $configPath;

function oym_deny(string $msg): void {
    http_response_code(403);
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">'
       . '<meta name="robots" content="noindex,nofollow"><title>ダウンロードできません｜On Your Mark</title>'
       . '<meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<style>body{font-family:sans-serif;line-height:1.9;max-width:36em;margin:12vh auto;padding:0 24px;color:#3a3947}'
       . 'a{color:#e8467c}</style></head><body><h1 style="font-size:1.2rem">資料をダウンロードできませんでした</h1>'
       . '<p>' . htmlspecialchars($msg, ENT_QUOTES, 'UTF-8') . '</p>'
       . '<p><a href="/download.html">資料ダウンロードフォームへ</a>　/　<a href="/">トップページへ</a></p>'
       . '</body></html>';
    exit;
}

$token = (string)($_GET['t'] ?? '');
if ($token === '' || empty($cfg['token_secret'])) {
    oym_deny('ダウンロード用のURLが正しくありません。お手数ですが、フォームから再度お申し込みください。');
}

$raw = base64_decode(strtr($token, '-_', '+/') . str_repeat('=', (4 - strlen($token) % 4) % 4), true);
if ($raw === false) {
    oym_deny('ダウンロード用のURLが正しくありません。');
}
$parts = explode('|', $raw);
if (count($parts) !== 3) {
    oym_deny('ダウンロード用のURLが正しくありません。');
}
list($exp, $hash, $sig) = $parts;
$expected = hash_hmac('sha256', $exp . '|' . $hash, (string)$cfg['token_secret']);
if (!hash_equals($expected, $sig)) {
    oym_deny('ダウンロード用のURLが正しくありません。');
}
if ((int)$exp < time()) {
    oym_deny('ダウンロード用のURLの有効期限が切れています。お手数ですが、フォームから再度お申し込みください。');
}

$file = (string)($cfg['download_file'] ?? '');
if ($file === '' || !is_file($file)) {
    http_response_code(500);
    exit('配布ファイルが見つかりません。');
}

$name = (string)($cfg['download_name'] ?? basename($file));
header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="' . rawurlencode($name) . '"; filename*=UTF-8\'\'' . rawurlencode($name));
header('Content-Length: ' . (string)filesize($file));
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: private, no-store');
readfile($file);
