# Génère modulo-demo.html : un seul fichier autonome (CSS + JS intégrés), facile à envoyer ou à héberger.
import re, pathlib
d = pathlib.Path(__file__).parent
h = (d / 'index.html').read_text()
css = (d / 'styles.css').read_text()
js = (d / 'app.js').read_text().replace('</script', '<\\/script')
h = re.sub(r'<link rel="stylesheet" href="styles\.css[^"]*">', lambda m: f'<style>{css}</style>', h)
h = re.sub(r'<script src="app\.js[^"]*"></script>', lambda m: f'<script>{js}</script>', h)
(d / 'modulo-demo.html').write_text(h)
print('modulo-demo.html', round(len(h) / 1024), 'Ko')
