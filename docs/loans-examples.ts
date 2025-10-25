// docs/loans-examples.ts
// ============================================================================
// Exemplos de Uso do Serviço de Empréstimos
// ============================================================================
// Este arquivo contém exemplos práticos de como usar o serviço de empréstimos.
// Não é código de produção, apenas documentação em formato de código.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import * as loansService from '@/services/loans';
import { formatBRL } from '@/lib/money';

// ============================================================================
// Exemplo 1: Fluxo Completo de Empréstimo Simples
// ============================================================================

async function example1_SimpleFlow(supabase: SupabaseClient, userId: string) {
  console.log('=== Exemplo 1: Empréstimo Simples ===\n');

  // 1. Criar o empréstimo
  const loan = await loansService.createLoan(supabase, userId, {
    person: 'João Silva',
    note: 'Empréstimo para comprar moto',
  });
  console.log('✅ Empréstimo criado:', loan.id);

  // 2. Registrar que emprestei R$ 5.000,00
  await loansService.addEvent(supabase, userId, {
    loanId: loan.id,
    type: 'out',
    amountCents: 500000, // R$ 5.000,00
    occurredAt: '2025-01-15',
    description: 'Transferência bancária',
  });
  console.log('✅ Evento "out" registrado: R$ 5.000,00');

  // 3. Registrar que recebi R$ 1.500,00 de volta
  await loansService.addEvent(supabase, userId, {
    loanId: loan.id,
    type: 'in',
    amountCents: 150000, // R$ 1.500,00
    occurredAt: '2025-02-15',
    description: 'Primeira parcela',
  });
  console.log('✅ Evento "in" registrado: R$ 1.500,00');

  // 4. Verificar o saldo atual
  const loans = await loansService.listLoansWithBalance(supabase, userId);
  const currentLoan = loans.find((l) => l.loanId === loan.id);

  if (currentLoan) {
    console.log('\n📊 Saldo Atual:');
    console.log(`   Pessoa: ${currentLoan.person}`);
    console.log(`   Emprestado: ${formatBRL(currentLoan.outCents)}`);
    console.log(`   Recebido: ${formatBRL(currentLoan.inCents)}`);
    console.log(`   Saldo Restante: ${formatBRL(currentLoan.balanceCents)}`);
    // Saída esperada: Saldo Restante: R$ 3.500,00
  }
}

// ============================================================================
// Exemplo 2: Empréstimo com Juros Mensais
// ============================================================================

async function example2_WithInterest(supabase: SupabaseClient, userId: string) {
  console.log('\n=== Exemplo 2: Empréstimo com Juros ===\n');

  // 1. Criar empréstimo
  const loan = await loansService.createLoan(supabase, userId, {
    person: 'Maria Santos',
    note: 'Empréstimo com juros de 2% ao mês',
  });

  // 2. Emprestei R$ 10.000,00 em janeiro
  await loansService.addEvent(supabase, userId, {
    loanId: loan.id,
    type: 'out',
    amountCents: 1000000, // R$ 10.000,00
    occurredAt: '2025-01-01',
    description: 'Empréstimo inicial',
  });
  console.log('✅ Empréstimo inicial: R$ 10.000,00');

  // 3. Juros de janeiro (2% de R$ 10.000,00 = R$ 200,00)
  await loansService.addEvent(supabase, userId, {
    loanId: loan.id,
    type: 'interest',
    amountCents: 20000, // R$ 200,00
    occurredAt: '2025-01-31',
    description: 'Juros de janeiro (2%)',
  });
  console.log('✅ Juros de janeiro: R$ 200,00');

  // 4. Juros de fevereiro (2% de R$ 10.200,00 = R$ 204,00)
  await loansService.addEvent(supabase, userId, {
    loanId: loan.id,
    type: 'interest',
    amountCents: 20400, // R$ 204,00
    occurredAt: '2025-02-28',
    description: 'Juros de fevereiro (2%)',
  });
  console.log('✅ Juros de fevereiro: R$ 204,00');

  // 5. Maria paga R$ 5.000,00
  await loansService.addEvent(supabase, userId, {
    loanId: loan.id,
    type: 'in',
    amountCents: 500000, // R$ 5.000,00
    occurredAt: '2025-03-05',
    description: 'Pagamento parcial',
  });
  console.log('✅ Pagamento recebido: R$ 5.000,00');

  // 6. Verificar saldo
  const loans = await loansService.listLoansWithBalance(supabase, userId);
  const currentLoan = loans.find((l) => l.loanId === loan.id);

  if (currentLoan) {
    console.log('\n📊 Resumo do Empréstimo:');
    console.log(`   Valor emprestado: ${formatBRL(currentLoan.outCents)}`);
    console.log(`   Juros acumulados: ${formatBRL(currentLoan.interestCents)}`);
    console.log(`   Total devedor: ${formatBRL(currentLoan.outCents + currentLoan.interestCents)}`);
    console.log(`   Já recebido: ${formatBRL(currentLoan.inCents)}`);
    console.log(`   Saldo restante: ${formatBRL(currentLoan.balanceCents)}`);
    // Saldo esperado: R$ 10.000,00 + R$ 404,00 - R$ 5.000,00 = R$ 5.404,00
  }
}

// ============================================================================
// Exemplo 3: Visualizar Timeline Completa
// ============================================================================

async function example3_Timeline(supabase: SupabaseClient, userId: string, loanId: string) {
  console.log('\n=== Exemplo 3: Timeline de Eventos ===\n');

  const timeline = await loansService.getLoanTimeline(supabase, userId, loanId);

  console.log('📅 Histórico de Movimentações:\n');

  timeline.forEach((event, index) => {
    const typeLabel =
      event.type === 'out' ? '🔴 Emprestei' : event.type === 'in' ? '🟢 Recebi' : '📈 Juros';
    const sign = event.type === 'out' ? '-' : '+';
    const value = formatBRL(event.amount_cents);

    console.log(`${index + 1}. ${event.occurred_at} | ${typeLabel} ${sign}${value}`);
    if (event.description) {
      console.log(`   "${event.description}"`);
    }
  });

  // Exemplo de saída:
  // 📅 Histórico de Movimentações:
  //
  // 1. 2025-03-05 | 🟢 Recebi +R$ 5.000,00
  //    "Pagamento parcial"
  // 2. 2025-02-28 | 📈 Juros +R$ 204,00
  //    "Juros de fevereiro (2%)"
  // 3. 2025-01-31 | 📈 Juros +R$ 200,00
  //    "Juros de janeiro (2%)"
  // 4. 2025-01-01 | 🔴 Emprestei -R$ 10.000,00
  //    "Empréstimo inicial"
}

// ============================================================================
// Exemplo 4: Atualizar Informações do Empréstimo
// ============================================================================

async function example4_UpdateLoan(supabase: SupabaseClient, userId: string, loanId: string) {
  console.log('\n=== Exemplo 4: Atualizar Empréstimo ===\n');

  // Atualizar o nome da pessoa e a nota
  await loansService.updateLoan(supabase, userId, loanId, {
    person: 'Maria Santos Silva', // Nome atualizado
    note: 'Empréstimo quitado em março/2025',
  });
  console.log('✅ Informações atualizadas');

  // Buscar e exibir os dados atualizados
  const loan = await loansService.getLoan(supabase, userId, loanId);
  if (loan) {
    console.log(`   Pessoa: ${loan.person}`);
    console.log(`   Nota: ${loan.note}`);
  }
}

// ============================================================================
// Exemplo 5: Listar Todos os Empréstimos
// ============================================================================

async function example5_ListAll(supabase: SupabaseClient, userId: string) {
  console.log('\n=== Exemplo 5: Listar Todos os Empréstimos ===\n');

  const loans = await loansService.listLoansWithBalance(supabase, userId);

  if (loans.length === 0) {
    console.log('❌ Nenhum empréstimo registrado.');
    return;
  }

  console.log(`📋 Total de empréstimos: ${loans.length}\n`);

  loans.forEach((loan, index) => {
    console.log(`${index + 1}. ${loan.person}`);
    console.log(`   Saldo: ${formatBRL(loan.balanceCents)}`);
    console.log(`   Emprestado: ${formatBRL(loan.outCents)}`);
    console.log(`   Recebido: ${formatBRL(loan.inCents)}`);

    if (loan.balanceCents > 0) {
      console.log(`   Status: ⏳ Pendente`);
    } else if (loan.balanceCents < 0) {
      console.log(`   Status: ⚠️  Você deve dinheiro`);
    } else {
      console.log(`   Status: ✅ Quitado`);
    }
    console.log('');
  });
}

// ============================================================================
// Exemplo 6: Deletar um Empréstimo
// ============================================================================

async function example6_DeleteLoan(supabase: SupabaseClient, userId: string, loanId: string) {
  console.log('\n=== Exemplo 6: Deletar Empréstimo ===\n');

  // Buscar informações antes de deletar
  const loan = await loansService.getLoan(supabase, userId, loanId);
  if (loan) {
    console.log(`⚠️  Deletando empréstimo com ${loan.person}`);
  }

  // Deletar (CASCADE remove todos os eventos também)
  await loansService.deleteLoan(supabase, userId, loanId);
  console.log('✅ Empréstimo e todos os eventos foram deletados');
}

// ============================================================================
// Exemplo 7: Cenário Real - Empréstimo Parcelado
// ============================================================================

async function example7_RealScenario(supabase: SupabaseClient, userId: string) {
  console.log('\n=== Exemplo 7: Cenário Real - Empréstimo Parcelado ===\n');

  // Cenário: Emprestei R$ 3.000,00 para um amigo em 6 parcelas de R$ 550,00 (juros de 10% total)

  const loan = await loansService.createLoan(supabase, userId, {
    person: 'Carlos Mendes',
    note: 'Empréstimo em 6 parcelas de R$ 550,00',
  });

  // Registrar o empréstimo inicial
  await loansService.addEvent(supabase, userId, {
    loanId: loan.id,
    type: 'out',
    amountCents: 300000, // R$ 3.000,00
    occurredAt: '2025-01-10',
    description: 'Empréstimo inicial via PIX',
  });

  // Registrar juros totais (10% = R$ 300,00)
  await loansService.addEvent(supabase, userId, {
    loanId: loan.id,
    type: 'interest',
    amountCents: 30000, // R$ 300,00
    occurredAt: '2025-01-10',
    description: 'Juros de 10% acordados',
  });

  console.log('✅ Empréstimo de R$ 3.000,00 + R$ 300,00 de juros registrado');
  console.log('   Total a receber: R$ 3.300,00 em 6x de R$ 550,00\n');

  // Simular recebimento das parcelas
  const parcelas = [
    { mes: 'fev', data: '2025-02-10' },
    { mes: 'mar', data: '2025-03-10' },
    { mes: 'abr', data: '2025-04-10' },
    { mes: 'mai', data: '2025-05-10' },
    { mes: 'jun', data: '2025-06-10' },
    { mes: 'jul', data: '2025-07-10' },
  ];

  for (const [index, parcela] of parcelas.entries()) {
    await loansService.addEvent(supabase, userId, {
      loanId: loan.id,
      type: 'in',
      amountCents: 55000, // R$ 550,00
      occurredAt: parcela.data,
      description: `Parcela ${index + 1}/6 - ${parcela.mes}/2025`,
    });
    console.log(`✅ Parcela ${index + 1}/6 recebida em ${parcela.data}`);
  }

  // Verificar saldo final
  const loans = await loansService.listLoansWithBalance(supabase, userId);
  const finalLoan = loans.find((l) => l.loanId === loan.id);

  console.log('\n📊 Resultado Final:');
  console.log(`   Total emprestado: ${formatBRL(finalLoan?.outCents || 0)}`);
  console.log(`   Total de juros: ${formatBRL(finalLoan?.interestCents || 0)}`);
  console.log(`   Total recebido: ${formatBRL(finalLoan?.inCents || 0)}`);
  console.log(`   Saldo final: ${formatBRL(finalLoan?.balanceCents || 0)}`);
  console.log(finalLoan?.balanceCents === 0 ? '   ✅ QUITADO!' : '   ⏳ Pendente');
}

// ============================================================================
// Exemplo 8: Tratamento de Erros
// ============================================================================

async function example8_ErrorHandling(supabase: SupabaseClient, userId: string) {
  console.log('\n=== Exemplo 8: Tratamento de Erros ===\n');

  try {
    // Tentar criar empréstimo sem nome da pessoa
    await loansService.createLoan(supabase, userId, {
      person: '',
      note: 'Teste de validação',
    });
  } catch (error: any) {
    console.log('❌ Erro esperado:', error.message);
    // Saída: "O nome da pessoa é obrigatório."
  }

  try {
    // Tentar adicionar evento com valor negativo
    await loansService.addEvent(supabase, userId, {
      loanId: 'fake-loan-id',
      type: 'out',
      amountCents: -10000, // Valor inválido
      occurredAt: '2025-01-10',
    });
  } catch (error: any) {
    console.log('❌ Erro esperado:', error.message);
    // Saída: "O valor deve ser positivo."
  }

  try {
    // Tentar adicionar evento com data inválida
    await loansService.addEvent(supabase, userId, {
      loanId: 'fake-loan-id',
      type: 'out',
      amountCents: 10000,
      occurredAt: '10/01/2025', // Formato inválido
    });
  } catch (error: any) {
    console.log('❌ Erro esperado:', error.message);
    // Saída: "Data inválida. Use o formato YYYY-MM-DD."
  }

  console.log('\n✅ Validações funcionando corretamente!');
}

// ============================================================================
// Export para uso em testes/desenvolvimento
// ============================================================================

export {
  example1_SimpleFlow,
  example2_WithInterest,
  example3_Timeline,
  example4_UpdateLoan,
  example5_ListAll,
  example6_DeleteLoan,
  example7_RealScenario,
  example8_ErrorHandling,
};




