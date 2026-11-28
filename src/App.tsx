import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Shell';
import { SpacePage, TrackPage } from './pages/Pages';
import { CoursePage } from './pages/CoursePage';
import { PlansPage } from './pages/PlansPage';
import { AccountPage, JoinPage, ResetPasswordPage } from './pages/PublicPages';
import { AdminPage } from './pages/admin/Admin';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const lesson = /^\/course\/[^/]+\/[^/]+/.test(pathname) && document.getElementById('lesson');
    if (lesson) lesson.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
    window.dispatchEvent(new Event('awelen:navigate'));
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <Layout>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<SpacePage />} />
        <Route path="/space/:id" element={<SpacePage />} />
        <Route path="/space/:id/:sub" element={<SpacePage />} />
        <Route path="/space/:id/:sub/:sub2" element={<SpacePage />} />
        <Route path="/track/:id" element={<TrackPage />} />
        <Route path="/course/:id" element={<CoursePage />} />
        <Route path="/course/:id/:lessonId" element={<CoursePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/:tab" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
