#!/usr/bin/env python3
"""
llms.txt を、サイトの実ファイルから自動生成する。
あわせて sitemap.xml が実ファイルと食い違っていないかを点検する。

デプロイのたびに実行されるので、コラムが増えても手で書き換える必要はない。

  python3 tools/build-llms.py           生成して書き出す
  python3 tools/build-llms.py --check   書き出さず、差分があれば終了コード1

点検に失敗する（＝サイトマップに漏れがある）場合はデプロイを止める。
黙って古い案内図を公開するより、気づけるほうがよい。
"""
import re, sys, pathlib, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL  = 'https://oym.co.jp/'
# 検索エンジンにもAIにも案内しないページ
EXCLUDE = {'404.html', 'thanks.html', 'dl-thanks.html'}


def meta(path: pathlib.Path):
    """<title> と <meta description> を取り出す。説明は1文目だけ使う。"""
    s = path.read_text(encoding='utf-8')
    m = re.search(r'<title>(.*?)</title>', s, re.S)
    title = html.unescape(m.group(1)).split('｜')[0].strip() if m else path.stem
    m = re.search(r'<meta name="description" content="(.*?)">', s, re.S)
    desc = html.unescape(m.group(1)).strip() if m else ''
    desc = re.split(r'(?<=。)', desc)[0]
    return title, desc


def columns():
    """コラム一覧ページの並び順（＝VOL降順）をそのまま使う。"""
    s = (ROOT / 'column/index.html').read_text(encoding='utf-8')
    return re.findall(
        r'<a href="([a-z0-9-]+\.html)">.*?'
        r'<span class="col-vol">(VOL\.\d+)</span>'
        r'<span class="col-tag">(.*?)</span>', s, re.S)


def pages(pattern):
    return sorted(p for p in ROOT.glob(pattern) if p.name not in EXCLUDE)


def build() -> str:
    L = ['# 株式会社On Your Mark（OYM）', '']
    L.append('> 専門学校の就職支援を中心に、新卒人材紹介・キャリア教育・学校行事・研修旅行まで行う'
             '総合支援会社です。学校・学生・企業の三者をつなぎ、専門学校の魅力と競争力を高めることを'
             '事業としています。首都圏（東京・神奈川・千葉・埼玉）を中心に、'
             '全国の専門学校・企業からの相談に対応しています。')
    L += ['', '株式会社On Your Mark／〒150-0034 東京都渋谷区代官山町9-10 SodaCCo 3F／TEL 03-6455-3217', '']
    cols = columns()
    L.append(f'このサイトの中心は、専門学校生の新卒採用について実務に即して書いたコラム{len(cols)}本です。'
             '「専門学校生を採用したい企業」と「企業とのつながりを増やしたい専門学校」の'
             '双方に向けた内容です。')
    L.append('')

    def section(head, files):
        L.append(f'## {head}')
        for f in files:
            p = ROOT / f if isinstance(f, str) else f
            rel = p.relative_to(ROOT).as_posix()
            t, d = meta(p)
            L.append(f'- [{t}]({URL}{rel})' + (f': {d}' if d else ''))
        L.append('')

    section('サービス', ['service-school.html', 'service-business.html', 'service-students.html',
                      'school-job.html', 'school-career.html', 'school-event.html', 'school-travel.html'])
    section('会社情報', ['company.html', 'privacy.html', 'travel-terms.html'])
    section('分野別の新卒採用', pages('business-*.html'))

    L.append('## コラム：専門学校生の新卒採用について')
    L.append(f'- [コラム一覧]({URL}column/): 全{len(cols)}回。新卒採用の実務について、'
             '採用設計・求人票・選考・定着・学校との接点の観点から書いています。')
    for f, vol, tag in cols:
        t, d = meta(ROOT / 'column' / f)
        L.append(f'- [{vol} {t}]({URL}column/{f}): 〔{tag}〕{d}')
    L.append('')

    L.append('## お問い合わせ')
    L.append(f'- [お問い合わせ]({URL}contact.html): 教育機関・企業・学生・その他からの相談を受け付けています。')
    L.append(f'- [資料ダウンロード]({URL}download.html): 教育機関向けのサービス案内資料（PDF）。')
    return '\n'.join(L) + '\n'


def check_sitemap() -> list:
    """サイトマップが実ファイルと食い違っていないか。"""
    sm = (ROOT / 'sitemap.xml').read_text(encoding='utf-8')
    listed = set()
    for u in re.findall(r'<loc>(.*?)</loc>', sm):
        rel = u.replace(URL, '')
        listed.add(rel if rel.endswith('.html') else rel + 'index.html')
    actual = {p.relative_to(ROOT).as_posix()
              for p in list(ROOT.glob('*.html')) + list(ROOT.glob('column/*.html'))} - EXCLUDE
    problems = []
    for x in sorted(actual - listed):
        problems.append(f'サイトマップに未掲載: {x}')
    for x in sorted(listed - actual):
        problems.append(f'サイトマップにあるが実体なし: {x}')
    return problems


if __name__ == '__main__':
    out = build()
    target = ROOT / 'llms.txt'
    problems = check_sitemap()
    for p in problems:
        print(f'::error::{p}' if '--ci' in sys.argv else f'  ✗ {p}')

    if '--check' in sys.argv:
        cur = target.read_text(encoding='utf-8') if target.exists() else ''
        if cur != out:
            print('  ✗ llms.txt が最新ではありません（tools/build-llms.py を実行してください）')
            problems.append('llms.txt stale')
        else:
            print('  ✓ llms.txt は最新です')
    else:
        target.write_text(out, encoding='utf-8')
        print(f'  ✓ llms.txt を生成しました（{len(out):,} バイト）')

    if not problems:
        print('  ✓ サイトマップと実ファイルは一致しています')
    sys.exit(1 if problems else 0)
