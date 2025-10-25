// /src/app/api/webhooks/kiwify/route.ts

// Propósito: Endpoint para receber webhooks da Kiwify, validar sua autenticidade,
// processar os dados e registrá-los como vendas no sistema.

// NOTAS DE ARQUITETURA E SEGURANÇA:
// 1. Leitura do Raw Body (`req.text()`):
//    É crucial ler o corpo da requisição como texto bruto ANTES de fazer o parse
//    para JSON. A assinatura HMAC é calculada sobre o texto exato do payload,
//    e qualquer modificação (como o parse) invalidaria a assinatura.
//
// 2. Uso do Cliente de Serviço (`supabaseAdmin`):
//    Este endpoint opera sem a sessão de um usuário logado. Usamos o cliente de
//    serviço (service_role) que bypassa as políticas de RLS. A segurança é garantida
//    pela validação da assinatura do webhook. Para o MVP (mono-usuário), o
//    `WEBHOOK_DEFAULT_USER_ID` é usado para atribuir a venda ao dono da conta.
//
// 3. Idempotência:
//    O índice único `(user_id, source, order_id)` no banco de dados e o uso de `upsert`
//    garantem que, mesmo que a Kiwify envie o mesmo webhook várias vezes, a venda
//    será criada apenas uma vez e atualizada nas chamadas subsequentes, evitando duplicatas.
//
// 4. TODOs para Multi-Tenancy:
//    - O mapeamento `product.id` -> `offer.id` é a chave para um sistema multi-usuário.
//      A abordagem atual de fallback (buscar por nome ou criar oferta) é uma simplificação.
//    - A solução ideal seria ter uma tabela `offer_integrations` que mapeia explicitamente
//      o ID externo de um produto de uma plataforma a uma oferta interna e a um `user_id`.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import * as crypto from 'crypto';
import * as z from 'zod';

// Schema Zod para validar a estrutura mínima do payload da Kiwify.
const kiwifyPayloadSchema = z.object({
  order_id: z.string(),
  "Order[event]": z.string(),
  "Order[total]": z.string(), // O valor vem como string
  "Order[paid_at]": z.string().datetime(),
  "Product[name]": z.string(),
  "Customer[email]": z.string().email().optional(),
  "Payment[method]": z.string().optional(),
});

/**
 * Valida a assinatura HMAC-SHA256 do webhook.
 */
function isSignatureValid(signature: string, payload: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = hmac.digest('hex');
  return digest === signature;
}

/**
 * Mapeia o status do evento da Kiwify para o status interno do nosso sistema.
 */
function mapKiwifyStatus(kiwifyStatus: string): 'approved' | 'refunded' | 'chargeback' | 'ignored' {
    const approvedStates = ['purchase_approved', 'pix_approved', 'charge_approved'];
    if (approvedStates.includes(kiwifyStatus)) return 'approved';
    if (kiwifyStatus === 'refund') return 'refunded';
    if (kiwifyStatus === 'chargeback') return 'chargeback';
    return 'ignored';
}

/**
 * Encontra uma oferta correspondente ou cria uma nova.
 */
async function findOrCreateOffer(productId: string, productName: string, userId: string): Promise<string> {
    // 1. Tenta encontrar a oferta pelo ID externo.
    let { data: offer } = await supabaseAdmin
        .from('offers')
        .select('id')
        .eq('user_id', userId)
        .eq('external_id', productId)
        .single();
    if (offer) return offer.id;

    // 2. Fallback: Tenta encontrar pelo nome (case-insensitive).
    let { data: offerByName } = await supabaseAdmin
        .from('offers')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', productName)
        .single();
    if (offerByName) return offerByName.id;

    // 3. Fallback final: Cria uma nova oferta.
    const { data: newOffer, error: createError } = await supabaseAdmin
        .from('offers')
        .insert({
            user_id: userId,
            name: productName,
            external_id: productId,
            status: 'active'
        })
        .select('id')
        .single();
    
    if (createError) throw new Error(`Falha ao criar nova oferta: ${createError.message}`);
    return newOffer.id;
}


export async function POST(req: Request) {
    const kiwifySecret = process.env.KIWIFY_WEBHOOK_SECRET;
    if (!kiwifySecret) {
        console.error('KIWIFY_WEBHOOK_SECRET não está definido.');
        return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
    }

    // 1. Ler o corpo bruto para validação da assinatura
    const rawBody = await req.text();
    const signature = req.headers.get('x-kiwify-signature');
    
    // Bypass de segurança para desenvolvimento local com `dev=1`
    const isDevBypass = process.env.NEXT_PUBLIC_DEV_TOOLS === 'true' && new URL(req.url).searchParams.get('dev') === '1';

    if (!isDevBypass && (!signature || !isSignatureValid(signature, rawBody, kiwifySecret))) {
        console.warn('Assinatura de webhook inválida recebida.');
        return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
    }
    
    try {
        const payload = JSON.parse(rawBody);
        const validatedPayload = kiwifyPayloadSchema.parse(payload);
        
        const status = mapKiwifyStatus(validatedPayload["Order[event]"]);
        if (status === 'ignored') {
            return NextResponse.json({ message: 'Evento ignorado.', event: validatedPayload["Order[event]"] });
        }
        
        const userId = process.env.WEBHOOK_DEFAULT_USER_ID;
        if (!userId) throw new Error('WEBHOOK_DEFAULT_USER_ID não definido.');

        const offerId = await findOrCreateOffer(
            payload["Product[id]"] || validatedPayload["Product[name]"], // Usa o nome como ID se o ID não vier
            validatedPayload["Product[name]"],
            userId
        );

        const saleData = {
            user_id: userId,
            offer_id: offerId,
            source: 'kiwify',
            order_id: validatedPayload.order_id,
            amount_cents: Math.round(Number(validatedPayload["Order[total]"]) * 100),
            status: status,
            date: new Date(validatedPayload["Order[paid_at]"]).toISOString(),
            customer_email: validatedPayload["Customer[email]"],
            payment_method: validatedPayload["Payment[method]"],
        };
        
        const { data, error } = await supabaseAdmin
            .from('sales')
            .upsert(saleData, { onConflict: 'sales_user_id_source_order_id_key' })
            .select('id')
            .single();

        if (error) {
            console.error('Erro no upsert da venda:', error);
            throw new Error(`Erro ao salvar no banco: ${error.message}`);
        }

        return NextResponse.json({ ok: true, saleId: data.id });

    } catch (error: any) {
        console.error('Erro ao processar webhook da Kiwify:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Payload inválido.', details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Erro interno no servidor.', message: error.message }, { status: 500 });
    }
}



