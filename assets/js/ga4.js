/* =============================================================
   株式会社On Your Mark  GA4 計測スクリプト
   -------------------------------------------------------------
   head に置いた gtag スニペットが「ページの閲覧数」を自動で送ります。
   このファイルは、そこに乗らない「成果（コンバージョン）」を送ります。

     ・お問い合わせ完了         → generate_lead (form_type=contact)
     ・資料ダウンロード申込完了  → generate_lead (form_type=download)
     ・資料PDFの実ダウンロード   → file_download
     ・面談予約（STORES）へ      → reserve_click
     ・電話リンクのタップ        → tel_click（tel: リンクを置いた場合）
     ・フォームの入力開始        → form_start

   ※「離脱クリック」「スクロール」「.pdf のダウンロード」は GA4 の
     拡張計測が自動で送るため、ここでは重複させていません。

   仕組みの要点
     1) フォーム送信時に、その送信だけの使い捨てID（送信ID）を発行し、
        選ばれた種別（学校/企業/学生/その他）とあわせて sessionStorage に
        控えます。画面が変わると変数は消えるためです。
     2) 完了ページでは、その送信IDに対して一度だけ送ります。
        再読み込みやブラウザバックでは二重に数えません。
        一方、同じ人が2回問い合わせた場合は送信IDが変わるため、
        2件目もきちんと数えます。
     3) 送信IDが無いまま完了ページを開いた場合（ブックマーク、直接アクセス）は
        送りません。フォームを通っていない到達を成果として数えないためです。
     4) main.js には一切手を入れていません。差し替えるのはこのファイルと
        各ページの head だけです。
   ============================================================= */
(function () {
  'use strict';

  /* gtag が無い環境（広告ブロッカー等）でもエラーで止まらないようにする */
  function send(name, params) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, params || {});
      }
    } catch (e) { /* 計測の失敗でサイトを壊さない */ }
  }

  /* --- sessionStorage の読み書き（使えない環境でも落ちないように） --- */
  function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* noop */ } }

  /* その送信だけの使い捨てID。二重計上を防ぎつつ、2回目の送信は数えるために使う */
  function newSubmitId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* --- いま見ているのがどのページか ---------------------------------
     通常のページ遷移でも、main.js の SPA モード（#/thanks）でも
     同じように判定できるようにします。
     ※ SPAモードは現在どこからも有効化されていないため実際には通りませんが、
        将来有効にしたときのために残してあります。 */
  function currentRoute() {
    var h = location.hash || '';
    if (h.indexOf('#/') === 0) {
      return h.slice(2).split('?')[0].replace(/\/$/, '') || 'index';
    }
    var p = location.pathname.replace(/\/$/, '/index.html');
    var f = p.slice(p.lastIndexOf('/') + 1);
    return f.replace(/\.html$/, '') || 'index';
  }

  /* ダウンロード完了ページのワンタイムトークン。
     これがあれば「フォームを通ってきた」ことの裏づけになる。 */
  function dlToken() {
    var m = location.search.match(/[?&]t=([^&]+)/);
    return m ? m[1] : '';
  }

  /* --- フォーム種別の記憶 --------------------------------------------
     contact.html と download.html は同じ id="contact-form" を使い、
     ボタンの文言だけが違います。audience ラジオの有無で見分けます。 */
  function watchForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var hasAudience = !!form.querySelector('input[name="audience"]');
    var formType = hasAudience ? 'contact' : 'download';

    /* 入力開始（最初の1回だけ）。どこで離脱しているかを見るために取ります。 */
    var started = false;
    form.addEventListener('input', function () {
      if (started) return;
      started = true;
      send('form_start', { form_type: formType });
    }, true);

    /* 送信時に、その送信だけのIDと種別を控える。
       ここはバリデーションの成否に関わらず走りますが、控えるだけなので
       数値には影響しません。実際にイベントを送るのは完了ページです。
       バリデーションで弾かれて再送信した場合はIDが振り直されますが、
       完了ページに着くのは1回なので二重には数えません。 */
    form.addEventListener('submit', function () {
      var a = form.querySelector('input[name="audience"]:checked');
      ssSet('oym_ga4_sid', newSubmitId());
      ssSet('oym_ga4_form_type', formType);
      ssSet('oym_ga4_audience', a ? a.value : '');
    }, true);
  }

  /* --- 完了ページでコンバージョンを送る ------------------------------
     thanks / dl-thanks に着いたときだけ、その送信につき一度きり送ります。 */
  function fireConversion() {
    var route = currentRoute();
    if (route !== 'thanks' && route !== 'dl-thanks') return;

    /* フォームを通ってきた証拠。
         ・送信ID          … 通常はこちら
         ・ワンタイムトークン … sessionStorage が使えない環境の保険
       どちらも無ければ、ブックマークや直接アクセスとみなして送りません。 */
    var sid = ssGet('oym_ga4_sid');
    var token = (route === 'dl-thanks') ? dlToken() : '';
    if (!sid && !token) return;

    /* 二重計上よけ。リロードやブラウザバックでは送りません。
       送信ごとにIDが変わるので、2回目の送信は別件として数えます。 */
    var guard = 'oym_ga4_sent_' + (sid || ('t_' + token));
    if (ssGet(guard)) return;
    ssSet(guard, '1');

    var formType = ssGet('oym_ga4_form_type') || (route === 'dl-thanks' ? 'download' : 'contact');
    var audience = ssGet('oym_ga4_audience') || '';

    send('generate_lead', {
      form_type: formType,                   // contact / download
      audience: audience || '(not_set)',     // school / company / student / other
      page_location: location.href
    });
  }

  /* --- リンククリックの計測 -------------------------------------------
     ページ内のどこにリンクが増えても拾えるよう、document で受けます。
     「離脱クリック」と「.pdf などのファイルDL」は GA4 の拡張計測が
     自動で送るため、ここでは二重にならないものだけを扱います。 */
  function hostOf(href) {
    try { return new URL(href, location.href).host; } catch (e) { return ''; }
  }

  function watchLinks() {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var host = hostOf(href);

      /* 面談予約（STORES）。外部リンクなので拡張計測の click も付きますが、
         「予約導線だけ」を見たいので、専用の名前でも残します。 */
      if (host && host.indexOf('stores.jp') >= 0) {
        send('reserve_click', {
          link_url: href,
          link_text: (a.textContent || '').trim().slice(0, 100),
          page_location: location.href
        });
        return;
      }

      /* 資料PDFの実ダウンロード。
         本番はワンタイムトークン付きの form/download.php になり、拡張子が
         .pdf ではないため拡張計測では拾えません。ここだけ手当てします。
         期限切れでリンクが download.html に差し替わったときは送りません。 */
      if (/download\.php/i.test(href)) {
        send('file_download', {
          file_name: 'OYM_service-guide.pdf',
          link_url: href,
          page_location: location.href
        });
        return;
      }

      /* 電話（※ tel: リンクが設置されている場合のみ動きます） */
      if (href.indexOf('tel:') === 0) {
        send('tel_click', { link_url: href, page_location: location.href });
      }
    }, true);
  }

  /* --- SPA モードのページ閲覧 -----------------------------------------
     main.js の __SPA が立っているとき、画面は hash だけで切り替わり、
     gtag は「1ページしか見られていない」と判断してしまいます。
     hash が変わったら、自分で page_view を送って埋めます。
     ※ 現在 __SPA はどこからも有効化されていないため、この処理は動きません。 */
  function watchSpa() {
    if (!window.__SPA) return;
    window.addEventListener('hashchange', function () {
      if (typeof window.gtag !== 'function') return;
      window.gtag('event', 'page_view', {
        page_location: location.href,
        page_title: document.title,
        page_path: '/' + currentRoute() + '.html'
      });
      fireConversion();
    });
  }

  function init() {
    watchForm();
    watchLinks();
    watchSpa();
    fireConversion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
