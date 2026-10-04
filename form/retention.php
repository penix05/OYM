<?php
/* =============================================================
   株式会社On Your Mark  送信記録の保管期間チェック
   -------------------------------------------------------------
   送信記録のCSVを調べ、保管期間（既定3年）を過ぎた行があれば
   メールでお知らせします。サーバーのcronから月に1回実行します。

   【実行方法】
     php /home/（アカウント名）/oym.co.jp/public_html/form/retention.php

   【オプション】
     （なし）     調べてお知らせするだけ。削除はしません
     --delete    期間を過ぎた行を削除します。削除前に控えを残します
     --always    期間を過ぎた行が無くてもメールを送ります（動作確認用）
     --dry-run   --delete と併用し、削除せずに結果だけ表示します

   ※ このファイルはコマンドラインからのみ実行できます。
      ブラウザから開かれても何もしません。
   ============================================================= */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('This script runs from the command line only.');
}

mb_internal_encoding('UTF-8');
mb_language('uni');

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
    fwrite(STDERR, "form/config.php がありません。\n");
    exit(1);
}
$cfg = require $configPath;

$years    = (int)($cfg['retention_years'] ?? 3);
$doDelete = in_array('--delete', $argv, true);
$dryRun   = in_array('--dry-run', $argv, true);
$always   = in_array('--always', $argv, true);

$logFile = (string)($cfg['log_file'] ?? '');
if ($logFile === '') {
    fwrite(STDERR, "config.php の log_file が未設定です。\n");
    exit(1);
}
$dir = dirname($logFile);
if (!is_dir($dir)) {
    fwrite(STDERR, "記録の保存先が見つかりません: {$dir}\n");
    exit(1);
}

/* 期限。これより古い送信日時の行が対象。 */
$limit     = strtotime("-{$years} years");
$limitText = date('Y年n月j日', $limit);

/* 保存先のCSVをすべて見る（ファイル名を変えて保管されている場合に備える） */
$files = glob($dir . '/*.csv') ?: array();
sort($files);

$report  = array();
$total   = 0;
$oldest  = null;

foreach ($files as $file) {
    $fh = @fopen($file, 'r');
    if (!$fh) { continue; }

    $keep = array();      // 残す行
    $old  = 0;            // 期間を過ぎた行の数
    $head = null;         // 見出し行（あれば）
    $bom  = false;
    $first = true;

    while (($row = fgetcsv($fh)) !== false) {
        if ($row === array(null) ) { continue; }          // 空行
        if ($first) {
            $first = false;
            if (isset($row[0]) && strncmp($row[0], "\xEF\xBB\xBF", 3) === 0) {
                $bom = true;
                $row[0] = substr($row[0], 3);
            }
            if (isset($row[0]) && $row[0] === '送信日時') {  // 見出し行
                $head = $row;
                continue;
            }
        }
        $t = isset($row[0]) ? strtotime((string)$row[0]) : false;
        if ($t === false) { $keep[] = $row; continue; }    // 日付として読めない行は残す
        if ($oldest === null || $t < $oldest) { $oldest = $t; }
        if ($t < $limit) { $old++; } else { $keep[] = $row; }
    }
    fclose($fh);

    if ($old > 0) {
        $report[] = array('file' => $file, 'old' => $old, 'keep' => count($keep));
        $total += $old;

        if ($doDelete && !$dryRun) {
            // 削除する前に、必ず控えを残す
            $backup = $file . '.bak-' . date('Ymd');
            if (!@copy($file, $backup)) {
                fwrite(STDERR, "控えを作れませんでした: {$backup}\n");
                continue;
            }
            @chmod($backup, 0600);

            $tmp = $file . '.tmp';
            if ($out = @fopen($tmp, 'w')) {
                if ($bom)  { fwrite($out, "\xEF\xBB\xBF"); }
                if ($head) { fputcsv($out, $head); }
                foreach ($keep as $r) { fputcsv($out, $r); }
                fclose($out);
                @rename($tmp, $file);
                @chmod($file, 0600);
            }
        }
    }
}

/* ---- 結果 ---- */
$lines = array();
if ($total > 0) {
    $lines[] = "お問い合わせの送信記録に、保管期間（{$years}年）を過ぎたものがあります。";
    $lines[] = '';
    $lines[] = "{$limitText} より前に受け取った記録が、合計 {$total} 件あります。";
    $lines[] = '';
    foreach ($report as $r) {
        $lines[] = '  ' . basename($r['file']) . "　期間を過ぎた行 {$r['old']} 件 / 残る行 {$r['keep']} 件";
    }
    $lines[] = '';
    if ($doDelete && !$dryRun) {
        $lines[] = '上記の行は削除しました。削除前の控えを、同じ場所に .bak-' . date('Ymd') . ' という名前で残しています。';
        $lines[] = '内容を確認したうえで、控えも不要であれば削除してください。';
    } elseif ($dryRun) {
        $lines[] = '（--dry-run のため、削除はしていません）';
    } else {
        $lines[] = 'プライバシーポリシー第9条でお約束している保管期間を過ぎています。';
        $lines[] = '内容をご確認のうえ、削除をご検討ください。';
        $lines[] = '';
        $lines[] = '削除する場合は、サーバーで次を実行してください（控えが自動で残ります）。';
        $lines[] = '  php ' . __FILE__ . ' --delete';
    }
} else {
    $lines[] = "保管期間（{$years}年）を過ぎた送信記録はありません。";
    if ($oldest !== null) {
        $lines[] = 'いちばん古い記録は ' . date('Y年n月j日', $oldest) . ' です。';
    }
}
$body = implode("\n", $lines) . "\n";

echo $body;

/* ---- メール通知 ---- */
if ($total > 0 || $always) {
    $to = $cfg['to'] ?? array();
    if (!is_array($to)) { $to = array($to); }
    $to = implode(', ', $to);
    if ($to !== '') {
        $from    = (string)($cfg['from'] ?? '');
        $subject = $total > 0
            ? "【On Your Mark】送信記録に保管期間（{$years}年）を過ぎたものがあります"
            : "【On Your Mark】送信記録の保管期間チェック（対象なし）";
        $headers = array('X-Mailer: OYM-Site');
        if ($from !== '') {
            $headers[] = 'From: ' . mb_encode_mimeheader('On Your Mark サイト') . ' <' . $from . '>';
        }
        @mb_send_mail($to, $subject, $body, implode("\r\n", $headers),
                      $from !== '' ? '-f' . $from : null);
    }
}

exit(0);
