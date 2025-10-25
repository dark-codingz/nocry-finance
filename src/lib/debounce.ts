// src/lib/debounce.ts

import { useState, useEffect } from 'react';

// Motivação: Evitar dependências externas como `lodash` para uma funcionalidade
// simples. Isso reduz o tamanho do bundle e previne potenciais problemas de
// compatibilidade com futuras versões do React (ex: React 19) e SSR.

/**
 * Cria uma versão "debounced" de uma função, que atrasa sua execução até que
 * um certo tempo tenha passado sem que ela seja chamada novamente.
 *
 * @param fn A função a ser "debounced".
 * @param delay O tempo de espera em milissegundos.
 * @returns A nova função "debounced".
 */
export function debounce<F extends (...args: any[]) => void>(fn: F, delay: number): F {
  let timeoutId: NodeJS.Timeout | null = null;
  
  const debounced = function(this: any, ...args: any[]) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };

  return debounced as F;
}

/**
 * Um hook do React que atrasa a atualização de um valor. Útil para "debouncing"
 * em inputs controlados, evitando re-renderizações ou chamadas de API excessivas
 * enquanto o usuário está digitando.
 *
 * @param value O valor a ser "debounced".
 * @param delay O tempo de espera em milissegundos (padrão: 300ms).
 * @returns O valor após o tempo de espera.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
    useEffect(() => {
      // Configura um timer para atualizar o valor "debounced"
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
  
      // Limpa o timer se o valor ou o delay mudarem antes do tempo expirar.
      // Isso é o que efetivamente "atrasa" a atualização.
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
  
    return debouncedValue;
}



