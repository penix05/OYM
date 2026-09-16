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

/* ============ demo data =============================================
   本番ではCMS（求人・NEWS・イベント）から出力する想定のサンプルデータです。
   内容はすべてダミーであり、実在の求人・記事ではありません。
   ==================================================================== */
var OYM_JOBS = [
  {
    id: "j001",
    title: "【サンプル求人】ITエンジニア（開発職・未経験可）",
    company: "サンプル株式会社A",
    industry: "IT・情報通信",
    jobtype: "エンジニア",
    location: "東京都",
    employment: "正社員",
    salary: "月給22万円〜（想定年収300万円〜）",
    summary: "自社サービスの開発・運用に携わるポジションです。入社後研修あり。",
    description: "Webアプリケーションの開発・テスト・運用補助からスタートし、経験に応じて設計工程へステップアップします。",
    requirements: "専門学校でITを学んだ方（2027年3月卒業見込み）。実務経験は不問です。",
    restricted: false
  },
  {
    id: "j002",
    title: "【サンプル求人】グラフィックデザイナー",
    company: "サンプル株式会社B",
    industry: "広告・デザイン",
    jobtype: "デザイナー",
    location: "東京都",
    employment: "正社員",
    salary: "月給21万円〜",
    summary: "広告・販促物のデザイン制作を担当します。ポートフォリオ選考あり。",
    description: "紙媒体・Webの両方のデザイン制作に携わります。先輩デザイナーの指導のもと、段階的に担当範囲を広げていきます。",
    requirements: "デザイン系学科で学んだ方。Illustrator / Photoshopの基本操作ができる方。",
    restricted: false
  },
  {
    id: "j003",
    title: "【サンプル求人】調理スタッフ（ホテルレストラン）",
    company: "サンプル株式会社C",
    industry: "ホテル・飲食",
    jobtype: "調理",
    location: "神奈川県",
    employment: "正社員",
    salary: "月給20万円〜",
    summary: "ホテル内レストランでの調理業務です。調理系学科の学びを活かせます。",
    description: "仕込み・調理・盛り付けを担当します。配属後はメンター制度で先輩がサポートします。",
    requirements: "調理系学科で学んだ方。調理師免許取得見込みの方歓迎。",
    restricted: false
  },
  {
    id: "j004",
    title: "【サンプル求人】自動車整備士",
    company: "サンプル株式会社D",
    industry: "自動車",
    jobtype: "整備士",
    location: "埼玉県",
    employment: "正社員",
    salary: "月給21.5万円〜",
    summary: "正規ディーラーでの整備業務。資格取得支援制度があります。",
    description: "点検・整備・車検業務を担当します。国家資格の上位級取得を会社が支援します。",
    requirements: "自動車整備系学科で学んだ方。二級整備士取得見込みの方歓迎。",
    restricted: false
  },
  {
    id: "j005",
    title: "【サンプル限定公開求人】医療事務（学校限定公開）",
    company: "サンプル医療法人E",
    industry: "医療・福祉",
    jobtype: "医療事務",
    location: "千葉県",
    employment: "正社員",
    salary: "月給19.5万円〜",
    summary: "特定の学校向けに限定公開しているサンプル求人です。",
    description: "受付・会計・レセプト業務を担当します。",
    requirements: "医療事務系学科で学んだ方。",
    restricted: true,
    accessKey: "demo-school"
  }
];

var OYM_NEWS = [
  {
    id: "n001", date: "2026-08-01", cat: "お知らせ",
    title: "【サンプル記事】コーポレートサイトをリニューアルしました",
    body: "<p>このたび、コーポレートサイトをリニューアルしました。専門学校の就職支援を中心とした当社のサービス内容を、わかりやすくお伝えできるよう構成を見直しています。</p><p>今後も、学校・学生・企業の皆さまに役立つ情報を発信してまいります。</p>"
  },
  {
    id: "n002", date: "2026-07-15", cat: "イベント",
    title: "【サンプル記事】学内企業説明会の開催について（専門学校向け）",
    body: "<p>専門学校の校内で実施する企業説明会のご案内です。学科の専門分野に合わせて参加企業を調整し、学生が在学中に企業と直接話せる機会をつくります。</p><p>開催をご希望の学校は、お問い合わせフォームよりご相談ください。</p>"
  },
  {
    id: "n003", date: "2026-06-30", cat: "イベント",
    title: "【サンプル記事】就活カフェのご案内（学生向け）",
    body: "<p>就職活動中の学生の皆さんが、気軽に相談に立ち寄れる「就活カフェ」を運営しています。履歴書の書き方や面接の不安など、どんな相談でも構いません。</p><p>開催日時・場所の詳細は、学校の就職担当の先生またはお問い合わせフォームよりご確認ください。</p>"
  },
  {
    id: "n004", date: "2026-06-01", cat: "お知らせ",
    title: "【サンプル記事】2027年卒 就職支援プログラムの受付を開始しました",
    body: "<p>2027年3月卒業見込みの学生を対象とした就職支援プログラムの受付を開始しました。学校単位でのご相談も承っています。</p>"
  }
];

/* ---------- jobs list rendering ---------- */
function oymRenderJobs(rootId) {
  var root = document.getElementById(rootId);
  if (!root) return;
  var fInd = document.getElementById('f-industry');
  var fLoc = document.getElementById('f-location');
  var fEmp = document.getElementById('f-employment');
  var fKw = document.getElementById('f-keyword');
  var pub = OYM_JOBS.filter(function (j) { return !j.restricted; });

  function fill(sel, key) {
    if (!sel) return;
    var vals = [];
    pub.forEach(function (j) { if (vals.indexOf(j[key]) < 0) vals.push(j[key]); });
    vals.forEach(function (v) {
      var o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o);
    });
  }
  fill(fInd, 'industry'); fill(fLoc, 'location'); fill(fEmp, 'employment');

  function draw() {
    var kw = fKw ? fKw.value.trim() : '';
    var list = pub.filter(function (j) {
      if (fInd && fInd.value && j.industry !== fInd.value) return false;
      if (fLoc && fLoc.value && j.location !== fLoc.value) return false;
      if (fEmp && fEmp.value && j.employment !== fEmp.value) return false;
      if (kw && (j.title + j.company + j.summary + j.jobtype).indexOf(kw) < 0) return false;
      return true;
    });
    root.innerHTML = '';
    if (!list.length) {
      root.innerHTML = '<p class="note">条件に合う求人が見つかりませんでした。条件を変えて検索するか、<a href="contact.html">お問い合わせ</a>からご相談ください。</p>';
      return;
    }
    list.forEach(function (j) {
      var el = document.createElement('article');
      el.className = 'card lane job-card reveal in';
      el.innerHTML =
        '<span class="tag">' + j.industry + '</span>' +
        '<h3>' + j.title + '</h3>' +
        '<p class="company">' + j.company + '</p>' +
        '<div class="meta"><span>' + j.location + '</span><span>' + j.employment + '</span><span>' + j.jobtype + '</span></div>' +
        '<p class="salary">' + j.salary + '</p>' +
        '<p>' + j.summary + '</p>' +
        '<a class="btn btn-primary btn-small detail" href="job-detail.html?id=' + j.id + '">求人詳細を見る</a>';
      root.appendChild(el);
    });
  }
  [fInd, fLoc, fEmp].forEach(function (s) { if (s) s.addEventListener('change', draw); });
  if (fKw) fKw.addEventListener('input', draw);
  draw();
}

/* ---------- job detail rendering ---------- */
function oymRenderJobDetail(rootId) {
  var root = document.getElementById(rootId);
  if (!root) return;
  var p = oymQuery();
  var id = p.get('id');
  var key = p.get('key');
  var j = null;
  for (var i = 0; i < OYM_JOBS.length; i++) if (OYM_JOBS[i].id === id) j = OYM_JOBS[i];
  if (!j) { j = OYM_JOBS[0]; } // プレビュー用フォールバック（idなしで開いた場合）
  if (j.restricted && j.accessKey !== key) {
    root.innerHTML = '<div class="card"><h3>この求人は限定公開です</h3><p>この求人情報は、対象の学校・企業の皆さまに個別にお渡ししている専用URLからのみご覧いただけます。URLをお持ちでない場合は、学校の就職担当の先生、または当社までお問い合わせください。</p><p style="margin-top:14px"><a class="btn btn-primary btn-small" href="contact.html">お問い合わせ</a></p></div>';
    document.title = '限定公開求人｜On Your Mark';
    return;
  }
  var h = '';
  if (j.restricted) h += '<p style="margin-bottom:12px"><span class="badge-limited">限定公開求人</span></p>';
  h += '<h2 class="job-ttl" style="font-family:var(--serif);color:var(--ink);font-size:1.5rem;line-height:1.7;margin-bottom:6px">' + j.title + '</h2>';
  h += '<p class="company" style="color:#666;margin-bottom:22px">' + j.company + '</p>';
  h += '<table class="def-table"><tbody>' +
    '<tr><th>業種</th><td>' + j.industry + '</td></tr>' +
    '<tr><th>職種</th><td>' + j.jobtype + '</td></tr>' +
    '<tr><th>勤務地</th><td>' + j.location + '</td></tr>' +
    '<tr><th>雇用形態</th><td>' + j.employment + '</td></tr>' +
    '<tr><th>給与</th><td>' + j.salary + '</td></tr>' +
    '<tr><th>仕事内容</th><td>' + j.description + '</td></tr>' +
    '<tr><th>応募条件</th><td>' + j.requirements + '</td></tr>' +
    '</tbody></table>';
  h += '<div class="hero-cta" style="margin-top:30px"><a class="btn btn-primary" href="contact.html?type=student">この求人について相談する</a>' +
       '<a class="btn btn-ghost dark" href="jobs.html">求人一覧に戻る</a></div>';
  root.innerHTML = h;
  document.title = j.title + '｜求人情報｜On Your Mark';
}

/* ---------- news list & detail ---------- */
function oymRenderNews(rootId, opts) {
  var root = document.getElementById(rootId);
  if (!root) return;
  opts = opts || {};
  var cat = opts.cat || '';
  var limit = opts.limit || 0;
  var sel = document.getElementById('news-cat');
  function draw() {
    var c = sel ? sel.value : cat;
    var list = OYM_NEWS.filter(function (n) { return !c || n.cat === c; });
    if (limit) list = list.slice(0, limit);
    root.innerHTML = '';
    list.forEach(function (n) {
      var li = document.createElement('li');
      var cls = n.cat === 'イベント' ? 'cat event' : 'cat';
      li.innerHTML = '<a href="news-detail.html?id=' + n.id + '"><time datetime="' + n.date + '">' + n.date.replace(/-/g, '.') + '</time><span class="' + cls + '">' + n.cat + '</span><span class="ttl">' + n.title + '</span></a>';
      root.appendChild(li);
    });
    if (!list.length) root.innerHTML = '<li style="padding:16px 4px">該当する記事はありません。</li>';
  }
  if (sel) sel.addEventListener('change', draw);
  draw();
}

function oymRenderNewsDetail(rootId) {
  var root = document.getElementById(rootId);
  if (!root) return;
  var p = oymQuery();
  var id = p.get('id');
  var n = null;
  for (var i = 0; i < OYM_NEWS.length; i++) if (OYM_NEWS[i].id === id) n = OYM_NEWS[i];
  if (!n) n = OYM_NEWS[0];
  var cls = n.cat === 'イベント' ? 'cat event' : 'cat';
  var h = '<p style="display:flex;gap:14px;align-items:center;margin-bottom:14px"><time style="font-family:var(--num);color:#666" datetime="' + n.date + '">' + n.date.replace(/-/g, '.') + '</time><span class="' + cls + '" style="font-size:.7rem;font-weight:700;border:1px solid;border-radius:3px;padding:2px 8px;' + (n.cat === 'イベント' ? 'color:var(--red);border-color:var(--red)' : 'color:var(--ink);border-color:var(--ink)') + '">' + n.cat + '</span></p>';
  h += '<h2 style="font-family:var(--serif);color:var(--ink);font-size:1.5rem;line-height:1.8;margin-bottom:24px">' + n.title + '</h2>';
  h += '<div class="news-body" style="background:var(--white);border:1px solid var(--line);border-radius:6px;padding:32px 30px">' + n.body + '</div>';
  // 関連記事
  var rel = OYM_NEWS.filter(function (x) { return x.id !== n.id && x.cat === n.cat; }).slice(0, 3);
  if (rel.length) {
    h += '<h2 style="font-family:var(--serif);color:var(--ink);font-size:1.1rem;margin:36px 0 12px">関連記事</h2><ul class="news-list">';
    rel.forEach(function (r) {
      var c2 = r.cat === 'イベント' ? 'cat event' : 'cat';
      h += '<li><a href="news-detail.html?id=' + r.id + '"><time datetime="' + r.date + '">' + r.date.replace(/-/g, '.') + '</time><span class="' + c2 + '">' + r.cat + '</span><span class="ttl">' + r.title + '</span></a></li>';
    });
    h += '</ul>';
  }
  h += '<div class="hero-cta" style="margin-top:34px"><a class="btn btn-primary" href="contact.html">お問い合わせ・お申込み</a><a class="btn btn-ghost dark" href="news.html">一覧に戻る</a></div>';
  root.innerHTML = h;
  document.title = n.title + '｜イベント・NEWS｜On Your Mark';
}

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
