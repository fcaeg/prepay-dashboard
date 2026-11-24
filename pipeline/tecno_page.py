"""Builds tecno/index.html (GitHub Pages: /prepay-dashboard/tecno/) from pipeline/tecno_page.html + out/tecno_data.json."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)

def main():
    sys.path.insert(0, HERE); import tecno; tecno.build()  # always rebuild from pipeline/state
    import json
    d = json.load(open(os.path.join(HERE, 'out', 'tecno_data.json'), encoding='utf-8'))
    # stock card added back (Nami 24 Nov): sellable stock = MAIN_STOCK + SUB_STOCK; DEMO shown apart; CREDIT_NOTE left out
    d['stock'] = [r for r in d['stock'] if r[3] != 'CREDIT_NOTE']
    sold = {r[1] for r in d['sales']} | {r[0] for r in d['stock']}; d['shops'] = [x for x in d['shops'] if x['c'] in sold]
    ms = {r[2] for r in d['sales']} | {r[1] for rs in d.get('targets', {}).values() for r in rs} | {r[1] for r in d['stock'] if r[3] != 'DEMO'}
    d['models'] = [x for x in d['models'] if x['k'] in ms]; d['stock'] = [r for r in d['stock'] if r[1] in ms]
    data = json.dumps(d, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    html = open(os.path.join(HERE, 'tecno_page.html'), encoding='utf-8').read().replace('__DATA__', data, 1)
    os.makedirs(os.path.join(ROOT, 'tecno'), exist_ok=True); out = os.path.join(ROOT, 'tecno', 'index.html')
    open(out, 'w', encoding='utf-8').write(html); print(out, os.path.getsize(out))

if __name__ == '__main__': main()
