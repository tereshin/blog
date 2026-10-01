import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AdminApp } from './admin-app';
import { ComplaintListScreen } from './features/moderation/complaint-list-screen';
import { StaffArticleScreen } from './features/moderation/staff-article-screen';
import { AdminFrame } from './shell/admin-frame';
import './styles.css';

const article_id = '018f3c2a-7b10-7c3e-8f21-0000000000a1';
const category_id = '018f3c2a-7b10-7c3e-8f21-0000000000c2';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AdminApp />} />
          <Route
            path="/complaints"
            element={
              <AdminFrame>
                <ComplaintListScreen locale="en" status="empty" complaints={[]} has_next={false} on_next={() => undefined} />
              </AdminFrame>
            }
          />
          <Route
            path="/articles/:articleId"
            element={
              <AdminFrame>
                <StaffArticleScreen
                  locale="en"
                  status="default"
                  role="moderator"
                  article={{
                    id: article_id,
                    title: 'Staff copy',
                    body: 'The full staff text',
                    status: 'published',
                    removed_by: null,
                    category_id,
                  }}
                  categories={[{ id: category_id, name: 'Essays' }]}
                  on_move={() => undefined}
                  on_remove={() => undefined}
                />
              </AdminFrame>
            }
          />
        </Routes>
      </BrowserRouter>
    </StrictMode>,
  );
}
