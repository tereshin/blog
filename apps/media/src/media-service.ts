import { uuidV7 } from './uuid-v7';

export type MediaObject = {
  id: string;
  owner_user_id: string;
  object_key: string;
  content_type: string | null;
  status: 'pending' | 'ready';
  upload_url: string;
};

export interface MediaStore {
  insert(object: MediaObject): Promise<void>;
  findById(media_id: string): Promise<MediaObject | null>;
  markReady(media_id: string): Promise<void>;
}

export class MemoryMediaStore implements MediaStore {
  readonly objects: MediaObject[] = [];

  async insert(object: MediaObject): Promise<void> {
    this.objects.push({ ...object });
  }

  async findById(media_id: string): Promise<MediaObject | null> {
    return this.objects.find((object) => object.id === media_id) ?? null;
  }

  async markReady(media_id: string): Promise<void> {
    const object = this.objects.find((row) => row.id === media_id);
    if (object) {
      object.status = 'ready';
    }
  }
}

export class MediaService {
  now: () => Date = () => new Date();

  constructor(private readonly store: MediaStore) {}

  async issue(input: { owner_user_id: string; content_type: string }): Promise<MediaObject> {
    const id = uuidV7(this.now().getTime());
    const object_key = `articles/${input.owner_user_id}/${id}`;
    const object: MediaObject = {
      id,
      owner_user_id: input.owner_user_id,
      object_key,
      content_type: input.content_type,
      status: 'pending',
      upload_url: `https://media.local/${object_key}?signature=presign`,
    };
    await this.store.insert(object);
    return object;
  }

  async complete(media_id: string): Promise<MediaObject | null> {
    await this.store.markReady(media_id);
    return this.store.findById(media_id);
  }
}
