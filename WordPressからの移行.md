# 現行WordPress → 新サイト（静的HTML）への切り替え

`/oym.co.jp/public_html/` で現行WordPressが稼働している前提の手順です。

---

## 結論：静的HTMLで問題ありません

新サイトがWordPressに適していないのではなく、**このサイトにWordPressが過剰**です。

| | WordPress | 静的HTML（新サイト） |
|---|---|---|
| 表示速度 | PHP+DB処理が毎回走る | ファイルを返すだけ。圧倒的に速い |
| 保守 | 本体・プラグイン・PHPの更新が継続的に必要 | 不要 |
| セキュリティ | 更新を止めると改ざんの標的になる | 攻撃対象がほぼない |
| 更新作業 | 管理画面から誰でも | HTMLを編集（またはGitHubにpush） |
| 月額コスト | サーバー代＋保守 | サーバー代のみ |

更新頻度が低いコーポレートサイトでは、静的が合理的です。
**お問い合わせフォームはXserverのPHPで動くので、WordPressは不要です。**

判断が変わるのは、**記事を月に何度も更新したい場合**だけです。その場合は下の「ニュース更新をどうするか」を参照してください。

---

## ただし、丸ごと入れ替える前に必ず確認する2点

### ① URLが変わると検索流入が消えます ← 最大のリスク

現行WordPressと新サイトでは、URLの形が違う可能性が高いです。

| 現行（例） | 新サイト |
|---|---|
| `https://oym.co.jp/service/` | `https://oym.co.jp/service-school.html` |
| `https://oym.co.jp/company/` | `https://oym.co.jp/company.html` |
| `https://oym.co.jp/contact/` | `https://oym.co.jp/contact.html` |

**何もしないと、Googleの検索結果・名刺・配布資料・他サイトからのリンクが全部404になります。**
検索順位もゼロから積み直しになります。

対策は **301リダイレクト**（旧URL → 新URLへ恒久的に転送）です。
これを入れれば、訪問者も検索評価も新URLへ引き継がれます。

#### 現行のURL一覧を取得する方法（どれか1つ）

1. **Google Search Console** →「ページ」レポート … 最も正確。実際に検索対象になっているURLが分かります
2. ブラウザで **`https://oym.co.jp/wp-sitemap.xml`** を開く（WordPress標準のサイトマップ）
   - 見つからない場合は `sitemap_index.xml` `sitemap.xml` も試してください
3. Googleで **`site:oym.co.jp`** と検索
4. WordPress管理画面 → 「固定ページ」「投稿」の一覧

**取得したURL一覧を共有いただければ、`.htaccess` に書く301リダイレクトを作成します。**

#### リダイレクトの書き方（イメージ）

`.htaccess` に、新サイトのルールより**前**に書きます。

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On

  # 旧URL → 新URL（301＝恒久的な移転）
  RewriteRule ^service/?$              /service-school.html   [R=301,L]
  RewriteRule ^company/?$              /company.html          [R=301,L]
  RewriteRule ^contact/?$              /contact.html          [R=301,L]
  RewriteRule ^privacy-policy/?$       /privacy.html          [R=301,L]

  # 廃止したページは、消えた旨を返すより近いページへ寄せる
  RewriteRule ^blog/.*$                /                      [R=301,L]
</IfModule>
```

> `R=301` は「恒久的に移転した」という意味です。`302`（一時的）にすると
> 検索評価が引き継がれないので、必ず301にしてください。

### ② WordPressにしかないコンテンツはありませんか

- ブログ記事・お知らせ
- 実績紹介・導入事例
- 採用情報
- 問い合わせの過去ログ（Contact Form 7のDB保存プラグインを使っている場合）

新サイトの `news.html` は現状**クローズド設定＋ダミーデータ**なので、
現行に記事があると**移行先がありません**。消す前に必ず棚卸ししてください。

---

## ニュース更新をどうするか

| 更新頻度 | おすすめ |
|---|---|
| 月1回以下 | **静的のまま**。`news.html` を公開設定に変えてHTMLを直接編集 |
| 月数回以上 | **`/blog/` だけWordPressを残す**。トップと会社案内は静的、ブログのみWP |
| 管理画面は欲しいが保守は嫌 | **microCMS等のヘッドレスCMS**。静的サイトのまま更新画面を持てる |

`/blog/` だけ残す場合、デプロイのワークフローは `public_html/` 直下に転送するので、
`public_html/blog/` 配下のWordPressはそのまま共存できます。

---

## 切り替えの手順

```
1. new/ で先行公開して全ページ確認
   DEPLOY_DIR = /oym.co.jp/public_html/new/
   → https://oym.co.jp/new/ で表示・フォーム送信を確認

2. 現行URL一覧を取得し、301リダイレクトの対応表を作る

3. バックアップを取得（サーバーパネル →「バックアップ」）
   ★ WordPressは「ファイル」と「データベース（MySQL）」の両方が必要です
     ファイルだけ取っても記事は復元できません

4. DEPLOY_DIR を /oym.co.jp/public_html/ に変更して本番デプロイ

5. .htaccess を設置（.htaccess.sample の内容 + 上で作った301リダイレクト）

6. WordPressのファイルを手動で削除
   ★ 特に index.php と WordPressの .htaccess は必ず消してください。
     残っているとリクエストがWordPressへ回され、表示がおかしくなります
   ★ wp-config.php にはDB接続情報が入っています。削除前にバックアップを

7. Search Console でサイトマップを再送信し、
   「ページ」レポートで404が急増していないか1〜2週間は観察
```

> ステップ6は、自動デプロイでは行われません（`wp-*` を除外しているため）。
> これは**事故で消さないための保険**であって、共存させる設計ではありません。
> バックアップを確認したうえで、手動で削除してください。

**WordPressのファイルは、切り替え後1〜2か月は削除せずサーバー外に保管**しておくと、
「あのページの文章が必要だった」となったときに戻せます。

---

## 切り替え後のチェック

- [ ] 旧URLにアクセスして、新URLへ301で転送される
- [ ] トップページがWordPressではなく新サイトになっている（`index.php` の残骸に注意）
- [ ] お問い合わせフォームから実際に送信でき、`contact@oym.co.jp` に届く
- [ ] 資料ダウンロードが動作し、PDFの直リンクが403になる
- [ ] Search Console でサイトマップを再送信した
- [ ] Search Console の「ページ」レポートで404が急増していない（1〜2週間観察）
- [ ] WordPress管理画面のURL（`/wp-admin/`）にアクセスできなくなっている
