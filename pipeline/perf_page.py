"""Builds performance/index.html (GitHub Pages: /prepay-dashboard/performance/) from pipeline/perf_page.html + out/perf_data.json."""
import datetime, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

def main():
    import perf; perf.build()  # always rebuild from pipeline/state (out/ is not in git)
    fp = os.path.join(HERE, 'out', 'perf_data.json')
    if not os.path.exists(fp): print('perf page: no data'); return
    data = open(fp, encoding='utf-8').read().replace('</', '<\\/')
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=7)
    html = open(os.path.join(HERE, 'perf_page.html'), encoding='utf-8').read().replace('__DATA__', data, 1) \
        .replace('__BUILT__', f'{now.day} {TH[now.month - 1]} {now.year + 543} {now:%H:%M} น.', 1)
    os.makedirs(os.path.join(ROOT, 'performance'), exist_ok=True); out = os.path.join(ROOT, 'performance', 'index.html')
    open(out, 'w', encoding='utf-8').write(html); print(out, os.path.getsize(out))

if __name__ == '__main__':
    import sys; sys.path.insert(0, HERE); main()
