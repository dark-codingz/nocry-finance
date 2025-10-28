// ============================================================================
// (public)/layout.tsx - Layout para Rotas Públicas
// ============================================================================
// PROPÓSITO:
// - Layout simples para rotas públicas (login, onboarding)
// - Não tem validação de auth (cada página decide suas regras)
// - Não inclui sidebar/AppShell
// ============================================================================

import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}




