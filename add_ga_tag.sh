#!/data/data/com.termux/files/usr/bin/bash
set -e

# Ajuste o caminho abaixo se seu repo do frontend tiver outro nome
cd ~/mobya-main 2>/dev/null || cd ~/Mobya

if [ ! -f index.html ]; then
  echo "ERRO: index.html não encontrado em $(pwd)"
  exit 1
fi

if grep -q "G-BKSY0GM1LM" index.html; then
  echo "A tag do Google já está presente em index.html — nada a fazer."
  exit 0
fi

python3 - << 'PYEOF'
import re

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

tag = '''  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-BKSY0GM1LM"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-BKSY0GM1LM');
  </script>
'''

if "<head>" in content:
    content = content.replace("<head>", "<head>\n" + tag, 1)
else:
    raise SystemExit("ERRO: tag <head> não encontrada em index.html")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

print("Tag inserida com sucesso.")
PYEOF

git add index.html
git commit -m "chore: add Google Analytics (gtag.js) tracking tag"
git push origin main

echo "OK: tag do Analytics adicionada e enviada para o repositório."
