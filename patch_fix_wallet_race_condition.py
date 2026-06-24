#!/usr/bin/env python3
"""
Patch: corrige race condition no wallet.service.js.

PROBLEMA (auditoria 2026-06-24):
  Todas as funções de crédito/débito de carteira faziam:
    1. SELECT walletBalance/walletPending (leitura solta, sem lock de linha)
    2. Calcula novo valor em JS (balanceAfter = balanceBefore + amount)
    3. UPDATE com o valor já calculado

  Mesmo dentro de prisma.$transaction, o passo 1 (SELECT puro) não trava a
  linha no MySQL/InnoDB em REPEATABLE READ — só o UPDATE trava. Duas
  chamadas concorrentes (ex.: webhook do MP duplicado, ou dois cliques de
  saque) podem ler o MESMO saldo antes de qualquer uma escrever, e a
  segunda escrita sobrescreve a primeira (lost update). Isso é dinheiro
  real podendo ser perdido ou duplicado.

CORREÇÃO:
  Troca o padrão "ler em JS, calcular, escrever valor fixo" por increment/
  decrement atômico do Prisma (UPDATE SET col = col + X), que delega o
  lock de linha pro próprio SQL. debitForWithdrawal ganha além disso uma
  checagem condicional atômica (WHERE walletBalance >= amount no mesmo
  UPDATE) pra impedir dois saques concorrentes de passarem pela checagem
  de saldo com o mesmo valor lido.

Uso (Termux), a partir da raiz do repo mobya-app-main:
  cp ~/storage/downloads/patch_fix_wallet_race_condition.py .
  python3 patch_fix_wallet_race_condition.py
"""
import re
import subprocess
import sys

PATH = "src/services/wallet.service.js"
MARKER = "Atualização atômica via increment do Prisma"


def abort(msg):
    print(f"❌ ABORT: {msg}")
    sys.exit(1)


with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

if MARKER in content:
    print("✅ Patch já aplicado anteriormente (marker encontrado). Nada a fazer.")
    sys.exit(0)

replacements = []

# ── 1. creditPendingRental: run() ──────────────────────────────────────────
old_1 = '''    const pendingBefore = provider.walletPending;
    const pendingAfter  = +(pendingBefore + amount).toFixed(2);

    await tx.monetizationProvider.update({
      where: { id: provider.id },
      data:  { walletPending: pendingAfter },
    });

    const txRecord = await tx.walletTransaction.create({
      data: {
        providerId:    provider.id,
        type:          'CREDIT_RENTAL_PENDING',
        amount,
        balanceBefore: provider.walletBalance,
        balanceAfter:  provider.walletBalance,
        pendingBefore,
        pendingAfter,
        description:   `Repasse de aluguel (reserva ${bookingId}) — retido ${WALLET_RETENTION_DAYS} dias`,
        emergencyId:   null,
        releaseAt,
      },
    });'''

new_1 = '''    // Atualização atômica via increment do Prisma — o lock de linha fica a
    // cargo do próprio UPDATE SQL (SET walletPending = walletPending + X),
    // eliminando a janela de corrida do padrão antigo "ler em JS, escrever
    // valor calculado" (que perdia incrementos concorrentes).
    const updated = await tx.monetizationProvider.update({
      where: { id: provider.id },
      data:  { walletPending: { increment: amount } },
      select: { walletBalance: true, walletPending: true },
    });

    const txRecord = await tx.walletTransaction.create({
      data: {
        providerId:    provider.id,
        type:          'CREDIT_RENTAL_PENDING',
        amount,
        balanceBefore: updated.walletBalance,
        balanceAfter:  updated.walletBalance,
        pendingBefore: +(updated.walletPending - amount).toFixed(2),
        pendingAfter:  updated.walletPending,
        description:   `Repasse de aluguel (reserva ${bookingId}) — retido ${WALLET_RETENTION_DAYS} dias`,
        emergencyId:   null,
        releaseAt,
      },
    });'''
replacements.append(("creditPendingRental", old_1, new_1))

# ── 2. creditPendingFromJob ─────────────────────────────────────────────────
old_2 = '''    const pendingBefore = provider.walletPending;
    const pendingAfter  = +(pendingBefore + netAmount).toFixed(2);

    await tx.monetizationProvider.update({
      where: { id: providerId },
      data:  { walletPending: pendingAfter, completedJobs: { increment: 1 } },
    });

    const txRecord = await tx.walletTransaction.create({
      data: {
        providerId,
        type:          'CREDIT_JOB',
        amount:        netAmount,
        balanceBefore: provider.walletBalance,
        balanceAfter:  provider.walletBalance,
        pendingBefore,
        pendingAfter,
        description:   `Job concluído — comissão ${(commissionRate * 100).toFixed(0)}% descontada`,
        emergencyId,
        releaseAt,
      },
    });'''

new_2 = '''    const updated = await tx.monetizationProvider.update({
      where: { id: providerId },
      data:  { walletPending: { increment: netAmount }, completedJobs: { increment: 1 } },
      select: { walletBalance: true, walletPending: true },
    });

    const txRecord = await tx.walletTransaction.create({
      data: {
        providerId,
        type:          'CREDIT_JOB',
        amount:        netAmount,
        balanceBefore: updated.walletBalance,
        balanceAfter:  updated.walletBalance,
        pendingBefore: +(updated.walletPending - netAmount).toFixed(2),
        pendingAfter:  updated.walletPending,
        description:   `Job concluído — comissão ${(commissionRate * 100).toFixed(0)}% descontada`,
        emergencyId,
        releaseAt,
      },
    });'''
replacements.append(("creditPendingFromJob", old_2, new_2))

# ── 3. releasePendingBalances — loop 1 (CREDIT_JOB / CREDIT_RENTAL_PENDING) ─
old_3 = '''        const provider = await tx.monetizationProvider.findUnique({
          where: { id: t.providerId },
          select: { walletBalance: true, walletPending: true },
        });
        if (!provider) return;

        const balanceBefore = provider.walletBalance;
        const balanceAfter  = +(balanceBefore + t.amount).toFixed(2);
        const pendingBefore = provider.walletPending;
        const pendingAfter  = Math.max(0, +(pendingBefore - t.amount).toFixed(2));

        await tx.monetizationProvider.update({
          where: { id: t.providerId },
          data:  { walletBalance: balanceAfter, walletPending: pendingAfter },
        });

        // Zera o releaseAt para marcar como processado
        await tx.walletTransaction.update({
          where: { id: t.id },
          data:  { releaseAt: null },
        });

        await tx.walletTransaction.create({
          data: {
            providerId:    t.providerId,
            type:          'RELEASE_PENDING',
            amount:        t.amount,
            balanceBefore,
            balanceAfter,
            pendingBefore,
            pendingAfter,
            description:   `Liberação automática de retenção (${WALLET_RETENTION_DAYS} dias)`,
            emergencyId:   null,
            releaseAt:     null,
          },
        });'''

new_3 = '''        const updated = await tx.monetizationProvider.update({
          where: { id: t.providerId },
          data:  { walletBalance: { increment: t.amount }, walletPending: { decrement: t.amount } },
          select: { walletBalance: true, walletPending: true },
        });

        // Clamp defensivo: walletPending nunca deveria ficar negativo, mas
        // o decrement atômico não tem cláusula MAX(0, ...) nativa do SQL.
        // Corrige numa segunda escrita só no caso raro de desvio histórico.
        let pendingAfter = updated.walletPending;
        if (pendingAfter < 0) {
          pendingAfter = 0;
          await tx.monetizationProvider.update({ where: { id: t.providerId }, data: { walletPending: 0 } });
        }

        const balanceAfter  = updated.walletBalance;
        const balanceBefore = +(balanceAfter - t.amount).toFixed(2);
        const pendingBefore = +(pendingAfter + t.amount).toFixed(2);

        // Zera o releaseAt para marcar como processado
        await tx.walletTransaction.update({
          where: { id: t.id },
          data:  { releaseAt: null },
        });

        await tx.walletTransaction.create({
          data: {
            providerId:    t.providerId,
            type:          'RELEASE_PENDING',
            amount:        t.amount,
            balanceBefore,
            balanceAfter,
            pendingBefore,
            pendingAfter,
            description:   `Liberação automática de retenção (${WALLET_RETENTION_DAYS} dias)`,
            emergencyId:   null,
            releaseAt:     null,
          },
        });'''
replacements.append(("releasePendingBalances (loop CREDIT_JOB)", old_3, new_3))

# ── 4. releasePendingBalances — loop 2 (rental payout) ──────────────────────
old_4 = '''        const provider = await tx.monetizationProvider.findFirst({ where: { ownerId: b.hostId } });
        if (!provider) {
          logger.error(`[WalletJob] Provider não encontrado para host ${b.hostId} (reserva ${b.id}) — repasse não liberado.`);
          return;
        }

        const balanceBefore = provider.walletBalance;
        const balanceAfter  = +(balanceBefore + b.hostPayoutAmount).toFixed(2);
        const pendingBefore = provider.walletPending;
        const pendingAfter  = Math.max(0, +(pendingBefore - b.hostPayoutAmount).toFixed(2));

        await tx.monetizationProvider.update({
          where: { id: provider.id },
          data:  { walletBalance: balanceAfter, walletPending: pendingAfter },
        });

        await tx.walletTransaction.create({
          data: {
            providerId:    provider.id,
            type:          'RELEASE_PENDING_RENTAL',
            amount:        b.hostPayoutAmount,
            balanceBefore,
            balanceAfter,
            pendingBefore,
            pendingAfter,
            description:   `Liberação automática de repasse de aluguel (reserva ${b.id})`,
            emergencyId:   null,
            releaseAt:     null,
          },
        });'''

new_4 = '''        const provider = await tx.monetizationProvider.findFirst({ where: { ownerId: b.hostId }, select: { id: true } });
        if (!provider) {
          logger.error(`[WalletJob] Provider não encontrado para host ${b.hostId} (reserva ${b.id}) — repasse não liberado.`);
          return;
        }

        const updated = await tx.monetizationProvider.update({
          where: { id: provider.id },
          data:  { walletBalance: { increment: b.hostPayoutAmount }, walletPending: { decrement: b.hostPayoutAmount } },
          select: { walletBalance: true, walletPending: true },
        });

        let pendingAfter = updated.walletPending;
        if (pendingAfter < 0) {
          pendingAfter = 0;
          await tx.monetizationProvider.update({ where: { id: provider.id }, data: { walletPending: 0 } });
        }

        const balanceAfter  = updated.walletBalance;
        const balanceBefore = +(balanceAfter - b.hostPayoutAmount).toFixed(2);
        const pendingBefore = +(pendingAfter + b.hostPayoutAmount).toFixed(2);

        await tx.walletTransaction.create({
          data: {
            providerId:    provider.id,
            type:          'RELEASE_PENDING_RENTAL',
            amount:        b.hostPayoutAmount,
            balanceBefore,
            balanceAfter,
            pendingBefore,
            pendingAfter,
            description:   `Liberação automática de repasse de aluguel (reserva ${b.id})`,
            emergencyId:   null,
            releaseAt:     null,
          },
        });'''
replacements.append(("releasePendingBalances (loop rental payout)", old_4, new_4))

# ── 5. debitForWithdrawal — checagem + débito atômicos ──────────────────────
old_5 = '''export async function debitForWithdrawal(providerId, amount, withdrawalId) {
  await prisma.$transaction(async (tx) => {
    const provider = await tx.monetizationProvider.findUnique({
      where: { id: providerId },
      select: { walletBalance: true, walletPending: true },
    });
    if (!provider) throw new Error('Prestador não encontrado');
    if (provider.walletBalance < amount) throw new Error('Saldo insuficiente');

    const balanceBefore = provider.walletBalance;
    const balanceAfter  = +(balanceBefore - amount).toFixed(2);

    await tx.monetizationProvider.update({
      where: { id: providerId },
      data:  { walletBalance: balanceAfter },
    });

    await tx.walletTransaction.create({
      data: {
        providerId,
        type:          'DEBIT_WITHDRAWAL',
        amount,
        balanceBefore,
        balanceAfter,
        pendingBefore: provider.walletPending,
        pendingAfter:  provider.walletPending,
        description:   `Saque processado — pedido ${withdrawalId}`,
        emergencyId:   null,
        releaseAt:     null,
      },
    });
  });
}'''

new_5 = '''export async function debitForWithdrawal(providerId, amount, withdrawalId) {
  await prisma.$transaction(async (tx) => {
    // Débito condicional atômico: a cláusula walletBalance >= amount roda
    // dentro do próprio UPDATE do MySQL, então checagem de saldo e
    // decremento acontecem como uma única operação atômica no banco — dois
    // saques concorrentes não conseguem mais os dois passarem pela
    // checagem de saldo lendo o mesmo valor (lost update clássico).
    const { count } = await tx.monetizationProvider.updateMany({
      where: { id: providerId, walletBalance: { gte: amount } },
      data:  { walletBalance: { decrement: amount } },
    });
    if (count === 0) {
      const exists = await tx.monetizationProvider.findUnique({ where: { id: providerId }, select: { id: true } });
      if (!exists) throw new Error('Prestador não encontrado');
      throw new Error('Saldo insuficiente');
    }

    const provider = await tx.monetizationProvider.findUnique({
      where: { id: providerId },
      select: { walletBalance: true, walletPending: true },
    });
    const balanceAfter  = provider.walletBalance;
    const balanceBefore = +(balanceAfter + amount).toFixed(2);

    await tx.walletTransaction.create({
      data: {
        providerId,
        type:          'DEBIT_WITHDRAWAL',
        amount,
        balanceBefore,
        balanceAfter,
        pendingBefore: provider.walletPending,
        pendingAfter:  provider.walletPending,
        description:   `Saque processado — pedido ${withdrawalId}`,
        emergencyId:   null,
        releaseAt:     null,
      },
    });
  });
}'''
replacements.append(("debitForWithdrawal", old_5, new_5))

# ── 6. refundRejectedWithdrawal ──────────────────────────────────────────────
old_6 = '''export async function refundRejectedWithdrawal(providerId, amount, withdrawalId, reason) {
  return prisma.$transaction(async (tx) => {
    const provider = await tx.monetizationProvider.findUnique({
      where: { id: providerId },
      select: { walletBalance: true, walletPending: true },
    });
    if (!provider) throw new Error('Prestador não encontrado');

    const balanceBefore = provider.walletBalance;
    const balanceAfter  = +(balanceBefore + amount).toFixed(2);

    await tx.monetizationProvider.update({
      where: { id: providerId },
      data:  { walletBalance: balanceAfter },
    });

    return tx.walletTransaction.create({
      data: {
        providerId,
        type:          'REFUND_WITHDRAWAL',
        amount,
        balanceBefore,
        balanceAfter,
        pendingBefore: provider.walletPending,
        pendingAfter:  provider.walletPending,
        description:   `Estorno de saque rejeitado — pedido ${withdrawalId} — ${reason || 'sem motivo'}`,
        emergencyId:   null,
        releaseAt:     null,
      },
    });
  });
}'''

new_6 = '''export async function refundRejectedWithdrawal(providerId, amount, withdrawalId, reason) {
  return prisma.$transaction(async (tx) => {
    let updated;
    try {
      updated = await tx.monetizationProvider.update({
        where: { id: providerId },
        data:  { walletBalance: { increment: amount } },
        select: { walletBalance: true, walletPending: true },
      });
    } catch (e) {
      if (e.code === 'P2025') throw new Error('Prestador não encontrado');
      throw e;
    }

    const balanceAfter  = updated.walletBalance;
    const balanceBefore = +(balanceAfter - amount).toFixed(2);

    return tx.walletTransaction.create({
      data: {
        providerId,
        type:          'REFUND_WITHDRAWAL',
        amount,
        balanceBefore,
        balanceAfter,
        pendingBefore: updated.walletPending,
        pendingAfter:  updated.walletPending,
        description:   `Estorno de saque rejeitado — pedido ${withdrawalId} — ${reason || 'sem motivo'}`,
        emergencyId:   null,
        releaseAt:     null,
      },
    });
  });
}'''
replacements.append(("refundRejectedWithdrawal", old_6, new_6))

# ── Aplica tudo, com diff e checagem de unicidade ───────────────────────────
applied = 0
for name, old, new in replacements:
    count = content.count(old)
    if count == 0:
        abort(f"Bloco '{name}' não encontrado em {PATH} — talvez o arquivo já tenha sido alterado. Confira manualmente.")
    if count > 1:
        abort(f"Bloco '{name}' encontrado {count}x — ambíguo, abortando sem salvar.")
    content = content.replace(old, new)
    applied += 1
    print(f"  ✓ {name}")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n✅ {applied} blocos corrigidos em {PATH}")

# ── Validação de sintaxe via node --check ───────────────────────────────────
result = subprocess.run(["node", "--check", PATH], capture_output=True, text=True)
if result.returncode != 0:
    print("❌ node --check falhou — revertendo NÃO É automático, confira o erro:")
    print(result.stderr)
    sys.exit(1)

print("✅ node --check OK — sintaxe válida.")
print("\n🎉 Patch aplicado com sucesso em", PATH)
