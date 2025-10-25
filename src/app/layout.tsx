// /src/app/layout.tsx

// Propósito: Definir o layout raiz da aplicação, incluindo a estrutura HTML
// e o provedor global de sessão do Supabase.

'use client';

import { Inter } from 'next/font/google';
import "./globals.css";
import SupabaseProvider from '@/components/SupabaseProvider';
import QueryProvider from '@/components/providers/QueryProvider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

// O componente agora é um Client Component para permitir o uso de Providers
// que utilizam Context API, como o SupabaseProvider.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A lógica de onAuthStateChange foi removida daqui e agora é gerenciada
  // implicitamente pelo SupabaseProvider e pelos hooks nos componentes
  // que precisam reagir a mudanças de autenticação.

  return (
    <html lang="pt-br">
      <head>
        <title>NoCry Finance</title>
        <meta name="description" content="Sua plataforma de finanças." />
      </head>
      <body className={inter.className}>
        <SupabaseProvider>
            <QueryProvider>
                {children}
                {/* Toast notifications (Sonner) */}
                <Toaster
                  position="top-right"
                  richColors
                  closeButton
                  theme="dark"
                />
            </QueryProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
