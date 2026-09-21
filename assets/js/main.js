/* =============================================
   株式会社On Your Mark  共通スクリプト
   ナビ開閉・スクロール表示・求人/ニュース描画・フォーム処理
   ============================================= */
// --- params + navigation helpers (work in both multi-page and single-file SPA) ---
function oymQuery() {
  var h = location.hash, i = h.indexOf('?');
  if (i >= 0) return new URLSearchParams(h.slice(i + 1));
  return new URLSearchParams(location.search);
}
function oymToHash(url) {
  // 'contact.html?type=school' -> '#/contact?type=school'; 'index.html' -> '#/'; 'x.html#flow' -> '#/x?at=flow'
  var frag = '', q = '';
  var hi = url.indexOf('#'); if (hi >= 0) { frag = url.slice(hi + 1); url = url.slice(0, hi); }
  var qi = url.indexOf('?'); if (qi >= 0) { q = url.slice(qi + 1); url = url.slice(0, qi); }
  var route = url.replace(/\.html$/, '');
  if (route === 'index' || route === '') route = '';
  var out = '#/' + route;
  var params = [];
  if (q) params.push(q);
  if (frag) params.push('at=' + frag);
  if (params.length) out += '?' + params.join('&');
  return out;
}
function oymGo(url) {
  if (window.__SPA) { location.hash = oymToHash(url); }
  else { location.href = url; }
}
/* ============ shared behaviour ============ */
document.addEventListener('DOMContentLoaded', function () {
  // mobile nav
  var t = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.gnav');
  if (t && nav) {
    t.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  // scroll reveal
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }
});


/* ---------- contact / download form ----------------------------------
   送信先は assets/js/config.js（OYM_FORM.endpoint）で切り替えます。
   endpoint が空のときは、従来どおり「デモモード」（送信せず完了ページへ遷移）。
   -------------------------------------------------------------------- */
function oymFormCfg() {
  var c = (typeof OYM_FORM !== 'undefined' && OYM_FORM) ? OYM_FORM : {};
  return {
    endpoint: c.endpoint || '',
    recaptchaSiteKey: c.recaptchaSiteKey || '',
    fallbackEmail: c.fallbackEmail || 'contact@oym.co.jp',
    minSubmitSeconds: typeof c.minSubmitSeconds === 'number' ? c.minSubmitSeconds : 3
  };
}

/* --- エラー表示のユーティリティ --- */
function oymFieldError(input, msg) {
  var row = input.closest('.form-row') || input.parentNode;
  var id = input.id + '-error';
  var el = document.getElementById(id);
  if (!el) {
    el = document.createElement('p');
    el.id = id;
    el.className = 'field-error';
    el.setAttribute('role', 'alert');
    row.appendChild(el);
  }
  el.textContent = msg;
  el.hidden = false;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', id);
}
function oymClearError(input) {
  var el = document.getElementById(input.id + '-error');
  if (el) { el.hidden = true; el.textContent = ''; }
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
}
function oymFormStatus(form, type, html) {
  var el = form.querySelector('.form-status');
  if (!el) {
    el = document.createElement('div');
    el.className = 'form-status';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    form.insertBefore(el, form.querySelector('button[type="submit"]'));
  }
  el.className = 'form-status is-' + type;
  el.innerHTML = html || '';
  el.hidden = !html;
  return el;
}

/* --- 入力チェック（ブラウザ標準のバブルではなく、項目の下に日本語で表示） --- */
function oymValidate(form) {
  var ok = true, first = null;
  var fields = form.querySelectorAll('input, textarea, select');
  Array.prototype.forEach.call(fields, function (f) {
    if (f.type === 'hidden' || f.name === 'website') return;
    oymClearError(f);
    var v = (f.value || '').trim();
    if (f.required && f.type === 'checkbox' && !f.checked) {
      oymFieldError(f, 'ご確認のうえチェックしてください。'); ok = false; first = first || f; return;
    }
    if (f.required && f.type !== 'checkbox' && !v) {
      oymFieldError(f, 'こちらは必須項目です。'); ok = false; first = first || f; return;
    }
    if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      oymFieldError(f, 'メールアドレスの形式をご確認ください。'); ok = false; first = first || f; return;
    }
    if (f.type === 'tel' && v && !/^[0-9+\-()\s]{8,20}$/.test(v)) {
      oymFieldError(f, '電話番号は数字とハイフンでご入力ください。'); ok = false; first = first || f; return;
    }
    if (f.tagName === 'TEXTAREA' && f.required && v.length < 5) {
      oymFieldError(f, 'もう少し詳しくご記入ください（5文字以上）。'); ok = false; first = first || f; return;
    }
  });
  if (first) { first.focus(); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  return ok;
}

/* --- reCAPTCHA v3 トークン取得（未設定なら空文字を返す） --- */
function oymRecaptchaToken(cfg, action) {
  if (!cfg.recaptchaSiteKey || typeof grecaptcha === 'undefined') return Promise.resolve('');
  return new Promise(function (resolve) {
    try {
      grecaptcha.ready(function () {
        grecaptcha.execute(cfg.recaptchaSiteKey, { action: action || 'submit' })
          .then(resolve, function () { resolve(''); });
      });
    } catch (e) { resolve(''); }
  });
}

function oymContactInit(redirect, opts) {
  var form = document.getElementById('contact-form');
  if (!form) return;
  opts = opts || {};
  redirect = redirect || 'thanks.html';
  var cfg = oymFormCfg();
  var formType = opts.formType || (redirect.indexOf('dl-') >= 0 ? 'download' : 'contact');
  var startedAt = Date.now();

  // deep link: ?type=school|company|student|other で種別を初期選択
  var p = oymQuery();
  var t = p.get('type');
  var valid = ['school', 'company', 'student', 'other'];
  var init = valid.indexOf(t) >= 0 ? t : 'school';
  var target = form.querySelector('input[name="audience"][value="' + init + '"]');
  if (target) target.checked = true;

  // 入力し直したらエラー表示を消す
  form.addEventListener('input', function (e) {
    if (e.target && e.target.id) oymClearError(e.target);
  });

  var btn = form.querySelector('button[type="submit"]');
  var btnLabel = btn ? btn.textContent : '';

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // ボット対策1: ハニーポット（人には見えない項目に入力があれば破棄）
    var hp = form.querySelector('input[name="website"]');
    if (hp && hp.value) return;
    // ボット対策2: 表示直後の即時送信を弾く
    if ((Date.now() - startedAt) / 1000 < cfg.minSubmitSeconds) {
      oymFormStatus(form, 'error', '送信が早すぎます。数秒おいてから、もう一度お試しください。');
      return;
    }
    if (!oymValidate(form)) {
      oymFormStatus(form, 'error', '入力内容にエラーがあります。赤字の項目をご確認ください。');
      return;
    }
    oymFormStatus(form, '', '');

    // 送信先が未設定 → デモモード（従来どおり完了ページへ遷移）
    if (!cfg.endpoint) {
      if (window.console) console.warn('[OYM] assets/js/config.js の endpoint が未設定のため、デモモードで動作しています。メールは送信されません。');
      oymGo(redirect);
      return;
    }

    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = '送信中…'; }

    oymRecaptchaToken(cfg, formType).then(function (token) {
      var fd = new FormData(form);
      fd.append('form_type', formType);
      fd.append('page_url', location.href);
      fd.append('elapsed', String(Math.round((Date.now() - startedAt) / 1000)));
      if (token) fd.append('recaptcha_token', token);

      return fetch(cfg.endpoint, {
        method: 'POST',
        body: fd,
        headers: { 'Accept': 'application/json' }
      }).then(function (res) {
        return res.json().catch(function () { return { ok: res.ok }; })
          .then(function (data) { return { res: res, data: data }; });
      });
    }).then(function (r) {
      if (r.res.ok && r.data && r.data.ok !== false) {
        var url = redirect;
        // 資料ダウンロードは、サーバーが発行したワンタイムトークンを完了ページへ引き渡す
        if (r.data.token) url += (url.indexOf('?') < 0 ? '?' : '&') + 't=' + encodeURIComponent(r.data.token);
        oymGo(url);
        return;
      }
      throw new Error((r.data && r.data.message) || '送信に失敗しました。');
    }).catch(function (err) {
      if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = btnLabel; }
      oymFormStatus(form, 'error',
        '申し訳ありません。送信に失敗しました（' + (err && err.message ? err.message : '通信エラー') + '）。<br>' +
        'お手数ですが、時間をおいて再度お試しいただくか、' +
        '<a href="mailto:' + cfg.fallbackEmail + '">' + cfg.fallbackEmail + '</a> まで直接ご連絡ください。');
    });
  });
}

/* ---------- 資料ダウンロード完了ページ ----------------------------------
   フォーム送信時にサーバーが発行したワンタイムトークンを受け取り、
   PDFへのリンクを組み立てます。トークンがない（＝フォームを通っていない）
   場合は、資料ダウンロードページへ案内します。
   ---------------------------------------------------------------------- */
function oymDownloadInit(linkId) {
  var link = document.getElementById(linkId || 'dl-link');
  if (!link) return;
  var cfg = oymFormCfg();
  var token = oymQuery().get('t');
  if (token) {
    link.href = 'form/download.php?t=' + encodeURIComponent(token);
    return;
  }
  // デモモード（endpoint未設定）のときは、同梱PDFへの直リンクのままプレビューできる
  if (!cfg.endpoint) return;
  var note = document.getElementById('dl-note');
  link.setAttribute('href', 'download.html');
  link.textContent = '資料ダウンロードフォームへ';
  if (note) note.textContent = 'ダウンロード用のリンクの有効期限が切れています。お手数ですが、フォームから再度お申し込みください。';
}

/* ----------------------------------------------------------------------
   コラムの横スクロール（TOPページ）

   左右のボタンで1枚ずつ送ります。ボタンが無い環境（スマホなど）でも、
   指でスワイプすれば操作できます。

   自動送りは、次の条件で動かします。
     ・7秒ごとに1枚ずつ進む（連続して動かさない）
     ・カーソルを乗せている間、キーボードで操作している間は止まる
     ・利用者が自分で操作したら、そこで自動送りをやめる
     ・画面に入っていないときは動かさない
     ・端末の「視差効果を減らす」設定が入っていれば、最初から動かさない
     ・端まで来たら先頭に戻る
   ---------------------------------------------------------------------- */
(function () {
  var INTERVAL = 5000;   // 送る間隔
  var FIRST    = 1200;   // 帯が画面に入ってから、最初の1枚を送るまで
  var strips = document.querySelectorAll('[data-col-strip]');

  Array.prototype.forEach.call(strips, function (strip) {
    var track = strip.querySelector('[data-col-track]');
    var prev  = strip.querySelector('[data-col-prev]');
    var next  = strip.querySelector('[data-col-next]');
    if (!track) return;

    function step() {
      var first = track.querySelector('li');
      if (!first) return 320;
      var gap = parseFloat(getComputedStyle(track).columnGap || '20') || 20;
      return first.getBoundingClientRect().width + gap;
    }
    function maxScroll() { return track.scrollWidth - track.clientWidth; }
    function update() {
      if (!prev || !next) return;
      prev.hidden = track.scrollLeft <= 2;
      next.hidden = track.scrollLeft >= maxScroll() - 2;
    }
    function move(dir) { track.scrollBy({ left: dir * step(), behavior: 'smooth' }); }

    if (prev) prev.addEventListener('click', function () { stop(); move(-1); });
    if (next) next.addEventListener('click', function () { stop(); move(1); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    /* ---- ここから自動送り ---- */
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    var timer = null, paused = false, stopped = false, visible = true, greeted = false;

    function tick() {
      if (paused || hovering || stopped || !visible || document.hidden) return;
      // 読み込み直後など、まだ送る余地がないときは何もしない（次の回で再判定する）
      if (maxScroll() <= 2) return;
      if (track.scrollLeft >= maxScroll() - 2) {
        track.scrollTo({ left: 0, behavior: 'smooth' });   // 端まで来たら先頭へ
      } else {
        move(1);
      }
    }
    function start() { if (!timer && !stopped) timer = setInterval(tick, INTERVAL); }
    function stop()  { stopped = true; if (timer) { clearInterval(timer); timer = null; } }

    /* カーソルが帯の上に「置かれているだけ」では止めない。
       ページを縦にスクロールすると、その場に残ったカーソルの下を帯が通り過ぎる。
       このとき Chrome などは座標の変わらない pointermove を出すため、
       それを hover と見なすと、何もしていないのに止まってしまう。
       実際にカーソルが動いたときだけ、読んでいる／狙っていると判断する。 */
    var hovering = false, lastX = null, lastY = null;
    strip.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (lastX !== null && (Math.abs(e.clientX - lastX) > 2 || Math.abs(e.clientY - lastY) > 2)) {
        hovering = true;
      }
      lastX = e.clientX; lastY = e.clientY;
    }, { passive: true });
    strip.addEventListener('pointerleave', function () {
      hovering = false; lastX = null; lastY = null;
    }, { passive: true });

    strip.addEventListener('focusin',  function () { paused = true; });
    strip.addEventListener('focusout', function () { paused = false; });

    /* 利用者が「この帯を自分で横に動かした」ときだけ自動送りをやめる。
       ページを縦にスクロールしただけ、カードを押しただけでは止めない。 */
    var downX = 0, downY = 0, dragging = false;
    track.addEventListener('pointerdown', function (e) {
      downX = e.clientX; downY = e.clientY; dragging = true;
    }, { passive: true });
    track.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { dragging = false; stop(); }
    }, { passive: true });
    track.addEventListener('pointerup',     function () { dragging = false; }, { passive: true });
    track.addEventListener('pointercancel', function () { dragging = false; }, { passive: true });

    // 横向きのホイール操作だけを「自分で動かした」とみなす
    track.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) stop();
    }, { passive: true });

    // 矢印キーなどで横に動かしたときも同じ
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
          e.key === 'Home' || e.key === 'End') stop();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        // 帯が画面に入ったら、最初の1枚は早めに送る（動くことが伝わるように）
        if (visible && !greeted && !stopped) {
          greeted = true;
          setTimeout(tick, FIRST);
        }
      }, { threshold: 0.25 }).observe(strip);
    }
    start();
  });
})();
