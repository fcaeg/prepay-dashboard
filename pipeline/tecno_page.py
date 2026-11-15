"""Builds tecno/index.html (GitHub Pages: /prepay-dashboard/tecno/) from pipeline/tecno_page.html + out/tecno_data.json."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)

def main():
    sys.path.insert(0, HERE); import tecno; tecno.build()  # always rebuild from pipeline/state
    data = open(os.path.join(HERE, 'out', 'tecno_data.json'), encoding='utf-8').read().replace('</', '<\\/')
    html = open(os.path.join(HERE, 'tecno_page.html'), encoding='utf-8').read().replace('__DATA__', data, 1)
    os.makedirs(os.path.join(ROOT, 'tecno'), exist_ok=True); out = os.path.join(ROOT, 'tecno', 'index.html')
    open(out, 'w', encoding='utf-8').write(html); print(out, os.path.getsize(out))

if __name__ == '__main__': main()
