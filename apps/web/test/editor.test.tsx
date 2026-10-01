import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorScreen, type Draft } from '../src/features/editor/editor-screen';

const categories = [{ id: '018f3c2a-7b10-7c3e-8f21-0000000000c1', name: 'Test Topic' }];

const ready: Draft = {
  id: '018f3c2a-7b10-7c3e-8f21-0000000000a1',
  version: 3,
  title: 'Morning note',
  text: 'The published text',
  category_id: categories[0].id,
  language: 'en',
  images: [],
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('editor', () => {
  it('keeps the draft in the second preview and autosaves the current version', () => {
    vi.useFakeTimers();
    const on_save = vi.fn();
    render(
      <EditorScreen
        locale="en"
        status="default"
        draft={{ ...ready, title: '', text: '' }}
        categories={categories}
        has_username
        on_save={on_save}
        on_publish={() => undefined}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Morning note' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Article text' }), { target: { value: 'A paragraph' } });
    expect(screen.getByRole('heading', { name: 'Morning note' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Preview' }).textContent).toContain('A paragraph');
    expect(screen.queryByRole('link', { name: 'Earlier versions' })).toBeNull();
    expect(on_save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(on_save).toHaveBeenCalledWith(
      expect.objectContaining({ version: 3, title: 'Morning note', text: 'A paragraph' }),
    );
    vi.useRealTimers();
  });

  it('blocks publish without one category, a title, or text', async () => {
    const user = userEvent.setup();
    const on_publish = vi.fn();
    render(
      <EditorScreen
        locale="en"
        status="category-required"
        draft={{ ...ready, category_id: null, title: 'Morning note', text: 'A paragraph' }}
        categories={categories}
        has_username
        on_publish={on_publish}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText('An article must belong to exactly one category')).toBeTruthy();
    expect(on_publish).not.toHaveBeenCalled();

    cleanup();
    render(
      <EditorScreen
        locale="en"
        status="title-required"
        draft={{ ...ready, title: '' }}
        categories={categories}
        has_username
        on_publish={on_publish}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText('The title must be present')).toBeTruthy();

    cleanup();
    render(
      <EditorScreen
        locale="en"
        status="text-required"
        draft={{ ...ready, text: '' }}
        categories={categories}
        has_username
        on_publish={on_publish}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText('The text must be present')).toBeTruthy();
    expect(on_publish).not.toHaveBeenCalled();
  });

  it('rejects an embed block and does not keep it', async () => {
    render(
      <EditorScreen locale="en" status="default" draft={ready} categories={categories} has_username on_publish={() => undefined} />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Article text' }), {
      target: { value: '{"type":"embed","data":"nope"}' },
    });
    expect(await screen.findByText('That block is not allowed')).toBeTruthy();
    expect(screen.queryByText('nope')).toBeNull();
    expect(screen.getByRole('region', { name: 'Preview' }).textContent).toContain('The published text');
  });

  it('shows the server version on conflict and keeps the local draft', async () => {
    render(
      <EditorScreen
        locale="en"
        status="version-conflict"
        draft={ready}
        categories={categories}
        has_username
        error_code="ARTICLE_VERSION_CONFLICT"
        server_version={7}
        on_publish={() => undefined}
      />,
    );
    expect(await screen.findByText('The server has version 7')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveProperty('value', 'Morning note');
  });

  it('asks for a username and publishes with no image', async () => {
    const user = userEvent.setup();
    const on_publish = vi.fn();
    render(
      <EditorScreen
        locale="en"
        status="default"
        draft={{ ...ready, images: [] }}
        categories={categories}
        has_username={false}
        on_publish={on_publish}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText('A username is required first')).toBeTruthy();
    expect(on_publish).not.toHaveBeenCalled();

    cleanup();
    render(
      <EditorScreen
        locale="en"
        status="default"
        draft={{ ...ready, images: [] }}
        categories={categories}
        has_username
        on_publish={on_publish}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(on_publish).toHaveBeenCalledWith(expect.objectContaining({ title: 'Morning note', images: [] }));
  });

  it('uploads a file to the presigned URL and then attaches it', async () => {
    const user = userEvent.setup();
    const on_presign = vi.fn().mockResolvedValue({ upload_url: 'https://media.local/put', media_id: 'media-1', public_url: 'https://media.local/cover' });
    const on_put = vi.fn().mockResolvedValue(undefined);
    const on_attach = vi.fn();
    render(
      <EditorScreen
        locale="en"
        status="default"
        draft={ready}
        categories={categories}
        has_username
        on_publish={() => undefined}
        on_presign={on_presign}
        on_put={on_put}
        on_attach={on_attach}
      />,
    );
    const file = new File(['bytes'], 'cover.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Image'), file);
    expect(on_presign).toHaveBeenCalledOnce();
    expect(on_put).toHaveBeenCalledWith('https://media.local/put', file);
    expect(on_attach).toHaveBeenCalledWith('media-1');
    expect(await screen.findByRole('img', { name: 'Morning note' })).toBeTruthy();
  });

  it('publishes after the category and language are chosen on the screen', async () => {
    const user = userEvent.setup();
    const on_publish = vi.fn();
    render(
      <EditorScreen
        locale="en"
        status="default"
        draft={{ ...ready, category_id: null, language: null }}
        categories={categories}
        has_username
        on_publish={on_publish}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Category' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Test Topic' }));
    await user.click(screen.getByRole('button', { name: 'Content language' }));
    await user.click(await screen.findByRole('menuitem', { name: 'English' }));
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(on_publish).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: categories[0].id, language: 'en', title: 'Morning note' }),
    );
  });

  it('hides a draft from someone who does not own it', () => {
    render(
      <EditorScreen
        locale="en"
        status="unavailable"
        draft={ready}
        categories={categories}
        has_username={false}
        on_publish={() => undefined}
      />,
    );
    expect(screen.getByText('This article is not available')).toBeTruthy();
    expect(screen.queryByText('The published text')).toBeNull();
    expect(screen.queryByText(/draft/i)).toBeNull();
  });
});
