'use client';

import { translate, type Locale } from '@blog/i18n';
import { editor_catalog } from '@blog/i18n/features/editor';
import { Button, Dropdown, Label, Skeleton, Toast, toast } from '@heroui/react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { EmptyState } from '../../shared/empty-state';

const rejected_block_types = ['embed', 'raw', 'rawHtml'];
const languages = ['en', 'sr-Latn', 'ru'] as const;

export type DraftImage = { media_id: string; url: string };

export type Draft = {
  id: string;
  version: number;
  title: string;
  text: string;
  category_id: string | null;
  language: string | null;
  images: DraftImage[];
};

export type UploadTicket = { upload_url: string; media_id: string; public_url: string };

export function EditorScreen({
  locale,
  status,
  draft,
  categories,
  has_username,
  error_code,
  server_version,
  on_save,
  on_publish,
  on_presign,
  on_put,
  on_attach,
}: {
  locale: Locale;
  status: string;
  draft: Draft;
  categories: Array<{ id: string; name: string }>;
  has_username: boolean;
  error_code?: string;
  server_version?: number;
  on_save?: (draft: Draft) => void;
  on_publish: (draft: Draft) => void;
  on_presign?: (file: File) => Promise<UploadTicket>;
  on_put?: (upload_url: string, file: File) => Promise<void>;
  on_attach?: (media_id: string) => void;
}) {
  const [title, set_title] = useState(draft.title);
  const [text, set_text] = useState(draft.text);
  const [category_id, set_category_id] = useState(draft.category_id);
  const [language, set_language] = useState(draft.language);
  const [images, set_images] = useState(draft.images);
  const [notice, set_notice] = useState<string | null>(null);
  const dirty = useRef(false);
  const conflict =
    error_code === 'ARTICLE_VERSION_CONFLICT'
      ? `${translate(locale, 'editor.version_conflict', editor_catalog)} ${server_version ?? ''}`
      : null;

  useEffect(() => {
    if (!dirty.current || !on_save) {
      return;
    }
    const snapshot: Draft = { ...draft, title, text, category_id, language, images };
    const timer = setTimeout(() => on_save(snapshot), 300);
    return () => clearTimeout(timer);
  }, [title, text, category_id, language, images, on_save, draft]);

  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'editor.loading', editor_catalog)}>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (status === 'unavailable' || status === 'not-found') {
    return (
      <main>
        <EmptyState
          title={translate(locale, status === 'not-found' ? 'editor.not_found' : 'editor.unavailable', editor_catalog)}
        />
      </main>
    );
  }

  function publish() {
    if (!category_id) {
      set_notice(translate(locale, 'editor.category_required', editor_catalog));
      return;
    }
    if (title.trim() === '') {
      set_notice(translate(locale, 'editor.title_required', editor_catalog));
      return;
    }
    if (text.trim() === '') {
      set_notice(translate(locale, 'editor.text_required', editor_catalog));
      return;
    }
    if (!language) {
      set_notice(translate(locale, 'editor.language_required', editor_catalog));
      return;
    }
    if (!has_username) {
      set_notice(translate(locale, 'editor.username_required', editor_catalog));
      return;
    }
    on_publish({ ...draft, title, text, category_id, language, images });
  }

  function changeText(value: string) {
    if (rejected_block_types.some((type) => value.includes(`"type":"${type}"`) || value.includes(`"type": "${type}"`))) {
      set_notice(translate(locale, 'editor.block_rejected', editor_catalog));
      return;
    }
    dirty.current = true;
    set_text(value);
  }

  return (
    <>
      <Toast.Provider />
      <Notice message={notice ?? conflict} />
      <main>
        <label>
          {translate(locale, 'editor.title', editor_catalog)}
          <input
            aria-label={translate(locale, 'editor.title', editor_catalog)}
            value={title}
            onChange={(event) => {
              dirty.current = true;
              set_title(event.target.value);
            }}
          />
        </label>
        <Dropdown>
          <Button aria-label={translate(locale, 'editor.category', editor_catalog)} variant="secondary">
            {categories.find((category) => category.id === category_id)?.name ??
              translate(locale, 'editor.category', editor_catalog)}
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu onAction={(key) => { dirty.current = true; set_category_id(String(key)); }}>
              {categories.map((category) => (
                <Dropdown.Item key={category.id} id={category.id} textValue={category.name}>
                  <Label>{category.name}</Label>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
        <Dropdown>
          <Button aria-label={translate(locale, 'editor.language', editor_catalog)} variant="secondary">
            {language ? translate(locale, `editor.language.${language}`, editor_catalog) : translate(locale, 'editor.language', editor_catalog)}
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu onAction={(key) => { dirty.current = true; set_language(String(key)); }}>
              {languages.map((key) => (
                <Dropdown.Item key={key} id={key} textValue={translate(locale, `editor.language.${key}`, editor_catalog)}>
                  <Label>{translate(locale, `editor.language.${key}`, editor_catalog)}</Label>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
        <textarea
          aria-label={translate(locale, 'editor.text', editor_catalog)}
          value={text}
          onChange={(event) => changeText(event.target.value)}
        />
        <input
          aria-label={translate(locale, 'editor.image', editor_catalog)}
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file || !on_presign) {
              return;
            }
            void upload(file);
          }}
        />
        <Button variant="primary" onPress={publish}>
          {translate(locale, 'editor.publish', editor_catalog)}
        </Button>
        <section aria-label={translate(locale, 'editor.preview', editor_catalog)}>
          <h1>{title}</h1>
          {text ? <p>{text}</p> : null}
          {images.map((image) => (
            <Image key={image.media_id} src={image.url} alt={title} width={640} height={360} unoptimized />
          ))}
        </section>
      </main>
    </>
  );

  async function upload(file: File) {
    if (!on_presign) {
      return;
    }
    const ticket = await on_presign(file);
    await on_put?.(ticket.upload_url, file);
    on_attach?.(ticket.media_id);
    dirty.current = true;
    set_images((current_images) => [...current_images, { media_id: ticket.media_id, url: ticket.public_url }]);
  }
}

function Notice({ message }: { message: string | null }) {
  useEffect(() => {
    if (!message) {
      return;
    }
    toast.danger(message);
  }, [message]);

  return null;
}
