import { Routes, Route } from 'react-router';
import { useEffect } from 'react';
import { useAuthStore, RequireAuth } from '@event-tickets/shared-auth';
import { UserRole } from '@event-tickets/shared-types';
import { ScanPage } from './pages/scan/scan-page';
import { ScanResultPage } from './pages/scan/scan-result-page';
import { HistoryPage } from './pages/scan/history-page';
import { SignInPage } from './pages/auth/sign-in-page';

export function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route path="auth/sign-in" element={<SignInPage />} />
      <Route path="scan" element={<RequireAuth allowedRoles={[UserRole.ADMIN, UserRole.GREETER]}><ScanPage /></RequireAuth>} />
      <Route path="scan/result" element={<RequireAuth allowedRoles={[UserRole.ADMIN, UserRole.GREETER]}><ScanResultPage /></RequireAuth>} />
      <Route path="history" element={<RequireAuth allowedRoles={[UserRole.ADMIN, UserRole.GREETER]}><HistoryPage /></RequireAuth>} />
      <Route index element={<RequireAuth allowedRoles={[UserRole.ADMIN, UserRole.GREETER]}><ScanPage /></RequireAuth>} />
    </Routes>
  );
}
