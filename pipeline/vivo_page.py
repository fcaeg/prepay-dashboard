"""Builds vivo/index.html (GitHub Pages: /prepay-dashboard/vivo/) from pipeline/vivo_page.html + out/vivo_data.json."""
import base64, datetime, json, os, zlib

def seal(raw, lock):
    """zlib + AES-256-GCM with a fresh key, the key wrapped with the RSA public key in vivo_lock.json.
    Only someone with the page password can unwrap the private key (in the browser) and read the data."""
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    key = AESGCM.generate_key(256); iv = os.urandom(12)
    ct = AESGCM(key).encrypt(iv, zlib.compress(raw, 9), None)
    pub = serialization.load_der_public_key(base64.b64decode(lock['pub']))
    ek = pub.encrypt(key, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    b = lambda x: base64.b64encode(x).decode()
    return {'ek': b(ek), 'iv': b(iv), 'ct': b(ct), 'lock': {k: lock[k] for k in ('salt', 'iter', 'iv', 'wpriv')}}
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

def main():
    fp = os.path.join(HERE, 'out', 'vivo_data.json')
    # always rebuild from pipeline/state (out/ is not in git, so a local copy can be stale)
    import vivo; vivo.build()
    data = open(fp, encoding='utf-8').read()
    lock = json.load(open(os.path.join(HERE, 'vivo_lock.json')))
    payload = json.dumps(seal(data.encode('utf-8'), lock), separators=(',', ':'))
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=7)
    pako = open(os.path.join(HERE, 'vendor', 'pako_inflate.min.js'), encoding='utf-8').read()
    html = open(os.path.join(HERE, 'vivo_page.html'), encoding='utf-8').read().replace('__DATA__', payload, 1).replace('/*__PAKO__*/', pako, 1) \
        .replace('__BUILT__', f'{now.day} {TH[now.month - 1]} {now.year + 543} {now:%H:%M} น.', 1)
    os.makedirs(os.path.join(ROOT, 'vivo'), exist_ok=True); out = os.path.join(ROOT, 'vivo', 'index.html')
    open(out, 'w', encoding='utf-8').write(html); print(out, os.path.getsize(out))

if __name__ == '__main__':
    import sys; sys.path.insert(0, HERE); main()
