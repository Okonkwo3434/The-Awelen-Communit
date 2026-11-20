import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Shell';
import { CoursePage, SimplePage, SpacePage, TrackPage } from './pages/Pages';
import { AccountPage, JoinPage, ResetPasswordPage } from './pages/PublicPages';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); window.dispatchEvent(new Event('awelen:navigate')); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <Layout>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<SpacePage />} />
        <Route path="/space/:id" element={<SpacePage />} />
        <Route path="/track/:id" element={<TrackPage />} />
        <Route path="/course/:id" element={<CoursePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/plans" element={<SimplePage title="Teach on Awelen" text="Plans for other creators who want to teach on Awelen." />} />
        <Route path="/admin/*" element={<SimplePage title="Admin access" text="The admin portal will open only after a team sign-in through Supabase." />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
