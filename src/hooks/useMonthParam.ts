// /src/hooks/useMonthParam.ts
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Hook para gerenciar o parâmetro de busca `?m=YYYY-MM` na URL.
 * - Lê o parâmetro 'm'.
 * - Se ausente, retorna o mês atual no formato 'YYYY-MM'.
 * - Expõe uma função `setMonth` para atualizar o parâmetro na URL.
 */
export function useMonthParam() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const monthParam = searchParams.get('m');

    const currentMonth = monthParam || new Date().toISOString().slice(0, 7);

    const setMonth = useCallback((newMonth: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('m', newMonth);
        router.replace(`${pathname}?${params.toString()}`);
    }, [searchParams, router, pathname]);

    return { month: currentMonth, setMonth };
}



