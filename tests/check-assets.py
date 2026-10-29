"""Validate local HTML references, accounting for root-relative injected fragments."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
KNOWN = {f'assets/images/doctors/{name}.jpg' for name in ('andini', 'prasetyo', 'larasati')}
missing = []

class References(HTMLParser):
    def __init__(self, page):
        super().__init__()
        self.page = page

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key not in ('src', 'href') or not value:
                continue
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path:
                continue
            base = ROOT if self.page.parent.name == 'components' or value.startswith('/') else self.page.parent
            target = (base / unquote(url.path.lstrip('/'))).resolve()
            if not target.exists():
                missing.append((self.page.relative_to(ROOT), target.relative_to(ROOT)))

pages = [ROOT / 'index.html', *sorted((ROOT/'pages').glob('*.html')), *sorted((ROOT/'components').glob('*.html'))]
for page in pages:
    References(page).feed(page.read_text())
unexpected = []
for page, target in missing:
    known = str(target) in KNOWN
    print(f'{"KNOWN" if known else "MISSING"}: {page}: {target}')
    if not known:
        unexpected.append(target)
print(f'{len(pages)} HTML files checked; {len(unexpected)} new missing references; {len(missing)-len(unexpected)} known missing portraits.')
raise SystemExit(bool(unexpected))
