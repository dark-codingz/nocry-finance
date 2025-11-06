// /src/app/digital/page.tsx
'use client';

import { useEffect } from 'react';

export default function DigitalDashboardPage() {
  useEffect(() => {
    window.location.href = 'https://offers.theresnocry.com';
  }, []);

  return null;
}
