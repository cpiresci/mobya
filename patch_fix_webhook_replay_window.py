#!/usr/bin/env python3
"""
Patch: adiciona janela de tempo (anti-replay) na verificação de assinatura
do webhook do Mercado Pago.

PROBLEMA (auditoria 2026-06-24):
  verifyMpWebhookSignature() valida o HMAC-SHA256 corretamente (timing-safe,
  bem testado), mas não checa se o `ts` embutido na assinatura é recente.
  Uma requisição de webhook legítima capturada uma vez (ex.: por um proxy
  comprometido, log exposto, ou replay de rede) pode ser reenviada
  indefinidamente e ainda passa a verificação, porque a assinatura em si
  nunca expira.

CORREÇÃO:
  Adiciona checagem de freshness: rejeita se |Date.now() - ts| > 5 minutos.
  Mantém todo o resto do comportamento (timing-safe compare, fallback de
  dev sem secret) intacto.

Uso (Termux), a partir da raiz do repo mobya-app-main:
  cp ~/storage/downloads/patch_fix_webhook_replay_window.py .
  python3 patch_fix_webhook_replay_window.py
"""
import subprocess
import sys

PATH = "src/services/monetization/mp-signature.service.js"
MARKER = "MP_WEBHOOK_MAX_SKEW_MS"


def abort(msg):
    print(f"❌ ABORT: {msg}")
    sys.exit(1)


with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

if MARKER in content:
    print("✅ Patch já aplicado anteriormente (marker encontrado). Nada a fazer.")
    sys.exit(0)

old = """export function verifyMpWebhookSignature({ secret, signatureHeader, requestId, dataId }) {
  if (!secret) return true;
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    String(signatureHeader)
      .split(',')
      .map((p) => p.split('=').map((s) => s.trim()))
      .filter((p) => p.length === 2)
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId || ''};request-id:${requestId || ''};ts:${ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  let expectedBuf;
  let gotBuf;
  try {
    expectedBuf = Buffer.from(expected, 'hex');
    gotBuf = Buffer.from(v1, 'hex');
  } catch {
    return false;
  }
  if (expectedBuf.length !== gotBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, gotBuf);
}"""

new = """// Janela máxima de tolerância entre o `ts` assinado e o momento da
// verificação. Acima disso, mesmo uma assinatura HMAC válida é rejeitada —
// isso fecha o replay de uma requisição legítima capturada e reenviada
// depois (a assinatura em si nunca expirava antes desse patch).
const MP_WEBHOOK_MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutos

export function verifyMpWebhookSignature({ secret, signatureHeader, requestId, dataId }) {
  if (!secret) return true;
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    String(signatureHeader)
      .split(',')
      .map((p) => p.split('=').map((s) => s.trim()))
      .filter((p) => p.length === 2)
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;
  if (Math.abs(Date.now() - tsNum) > MP_WEBHOOK_MAX_SKEW_MS) return false;

  const manifest = `id:${dataId || ''};request-id:${requestId || ''};ts:${ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  let expectedBuf;
  let gotBuf;
  try {
    expectedBuf = Buffer.from(expected, 'hex');
    gotBuf = Buffer.from(v1, 'hex');
  } catch {
    return false;
  }
  if (expectedBuf.length !== gotBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, gotBuf);
}"""

count = content.count(old)
if count == 0:
    abort("Função verifyMpWebhookSignature não encontrada no formato esperado — confira manualmente.")
if count > 1:
    abort(f"Bloco encontrado {count}x — ambíguo, abortando sem salvar.")

content = content.replace(old, new)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✅ Janela anti-replay de {5} min adicionada em {PATH}")

result = subprocess.run(["node", "--check", PATH], capture_output=True, text=True)
if result.returncode != 0:
    print("❌ node --check falhou:")
    print(result.stderr)
    sys.exit(1)

print("✅ node --check OK — sintaxe válida.")
print("\n🎉 Patch aplicado com sucesso em", PATH)

print(
    "\n⚠️  ATENÇÃO: os testes em mp-signature.service.test.js usam "
    "ts: String(Date.now()) na maioria dos casos (passam normalmente), mas "
    "o teste 'rejeita quando o v1 não corresponde ao manifest' e o de "
    "'replay com ts antigo' usam ts fixo (ex.: '1000' / '0') que agora vai "
    "cair fora da janela de 5 min e ser rejeitado por timestamp ANTES de "
    "chegar na checagem de HMAC — o resultado esperado (false) continua "
    "o mesmo, então os testes não devem quebrar, mas vale rodar "
    "`npm test -- mp-signature` pra confirmar."
)
