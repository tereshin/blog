'use client';

import { EditorScreen, type Draft } from '../../src/features/editor/editor-screen';

const empty: Draft = {
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a9',
  version: 1,
  title: '',
  text: '',
  category_id: null,
  language: null,
  images: [],
};

export default function WritePage() {
  return (
    <EditorScreen
      locale="en"
      status="default"
      draft={empty}
      categories={[{ id: '018f3c2a-7b10-7c3e-8f21-0000000000c1', name: 'Test Topic' }]}
      has_username
      on_publish={() => undefined}
    />
  );
}
