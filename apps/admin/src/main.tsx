import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AdminApp } from './admin-app';
import { BlockPreview } from './features/block/block-preview';
import { CategoryScreen } from './features/catalog/category-screen';
import { ComplaintListScreen } from './features/moderation/complaint-list-screen';
import { AuditScreen } from './features/oversight/audit-screen';
import { StatisticsScreen } from './features/oversight/statistics-screen';
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
            path="/categories"
            element={
              <AdminFrame>
                <CategoryScreen locale="en" status="default" role="administrator" on_create={() => undefined} />
              </AdminFrame>
            }
          />
          <Route
            path="/users/:userId/block"
            element={
              <AdminFrame>
                <BlockPreview user_id="018f3c2a-7b10-7c3e-8f21-0000000000b2" />
              </AdminFrame>
            }
          />
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
          <Route
            path="/statistics"
            element={
              <AdminFrame>
                <StatisticsScreen
                  locale="en"
                  status="default"
                  figures={{
                    users_signed_in_today: 0,
                    users_signed_in_last_30_days: 4,
                    new_users: 1,
                    articles_published: 2,
                    comments_written: 3,
                    open_complaints: 1,
                    public_site_answering: true,
                  }}
                />
              </AdminFrame>
            }
          />
          <Route
            path="/audit"
            element={
              <AdminFrame>
                <AuditScreen locale="en" status="empty" rows={[]} has_next={false} on_next={() => undefined} />
              </AdminFrame>
            }
          />
        </Routes>
      </BrowserRouter>
    </StrictMode>,
  );
}
