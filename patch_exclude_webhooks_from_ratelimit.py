#!/usr/bin/env python3
"""
Patch: exclui as rotas de webhook do Mercado Pago do rate limiter global.

PROBLEMA (auditoria 2026-06-24):
  app.use(rateLimit(...)) em app.js roda ANTES de todas as rotas, incluindo
  /api/v1/monetization/webhook/mp e /webhook/mp-emergency. O Mercado Pago
  reenvia notificações em rajada (retry agressivo) a partir de um conjunto
  pequeno de IPs. Se essas notificações baterem no limite de 100 req/15min
  do limiter global, o webhook começa a responder 429 e comissões/
  pagamentos de emergência deixam de ser confirmados — silenciosamente.

CORREÇÃO:
  Usa a opção `skip` do express-rate-limit para não contar requisições
  cujo path comece com /api/v1/monetization/webhook/. O limiter continua
  protegendo todo o resto da API normalmente.

Uso (Termux), a partir da raiz do repo mobya-app-main:
  cp ~/storage/downloads/patch_exclude_webhooks_from_ratelimit.py .
  python3 patch_exclude_webhooks_from_ratelimit.py
"""
import subprocess
import sys

PATH = "src/app.js"
MARKER = "skip: (req) =>"


def abort(msg):
    print(f"❌ ABORT: {msg}")
    sys.exit(1)


with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

if MARKER in content:
    print("✅ Patch já aplicado anteriormente (marker encontrado). Nada a fazer.")
    sys.exit(0)

old = """app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY', message: 'Muitas requisições.' } },
}));"""

new = """app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  // Webhooks do Mercado Pago (pagamentos normais e de emergência) ficam de
  // fora do limiter global. O MP reenvia notificações em rajada a partir de
  // poucos IPs próprios; se baterem no limite, comissões/pagamentos de
  // emergência deixam de ser confirmados — silenciosamente, já que o
  // handler do webhook sempre responde 200 mesmo em erro interno.
  skip: (req) => req.path.startsWith('/api/v1/monetization/webhook/'),
  message: { success: false, error: { code: 'TOO_MANY', message: 'Muitas requisições.' } },
}));"""

count = content.count(old)
if count == 0:
    abort("Bloco do rateLimit global não encontrado no formato esperado — confira manualmente.")
if count > 1:
    abort(f"Bloco encontrado {count}x — ambíguo, abortando sem salvar.")

content = content.replace(old, new)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✅ Webhooks do MP excluídos do rate limiter global em {PATH}")

result = subprocess.run(["node", "--check", PATH], capture_output=True, text=True)
if result.returncode != 0:
    print("❌ node --check falhou:")
    print(result.stderr)
    sys.exit(1)

print("✅ node --check OK — sintaxe válida.")
print("\n🎉 Patch aplicado com sucesso em", PATH)
