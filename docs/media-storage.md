# Images and Cloudflare R2

Open **Administration → Settings → Images and storage** as a superadministrator
(`/admin/settings/media`). Changes apply to new uploads without restarting the
services. Existing files keep their URLs and storage; keep that storage available.
Files are not migrated automatically.

Compression defaults to WebP, quality 82, and a maximum side of 2560 pixels.
You can turn it off or keep the original format. Images retain their proportions
and transparency and are never enlarged. Quality applies to JPEG and WebP;
PNG in its original format uses lossless compression. GIF, animated WebP,
favicons and file attachments are kept unchanged. The existing upload limits
apply to the original file, before compression. Still images above 40 megapixels
are rejected when compression is enabled.

## Connect R2

1. Create a bucket in Cloudflare R2.
2. Create R2 S3 API credentials with object read and write permissions for that
   bucket. Save the **Access Key ID** and **Secret Access Key**. These are S3
   credentials, not the Cloudflare API token string.
3. Connect a public **Custom Domain**, for example `https://media.example.com`,
   to the bucket. An `r2.dev` public development URL can be used for testing.
4. Enable custom S3 storage in the administration form and select
   **Set up for Cloudflare R2**. Enter:
   - **S3 Endpoint:** the endpoint shown by Cloudflare, normally
     `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (use the jurisdiction-specific
     endpoint when Cloudflare supplies one).
   - **Region:** `auto`.
   - **Bucket:** the bucket name.
   - **Public file URL:** the Custom Domain URL, without the bucket name or an
     object path. The S3 API endpoint is not the public file URL.
   - Both S3 credential fields. Keep path-style addressing enabled.
5. Click **Test connection**, then **Save**. The test writes, reads and deletes
   a small random object under `connection-tests/`; it does not save settings
   or check public-domain routing. If deletion is denied, remove that test object
   manually. Verify the public URL by uploading an image after saving.

Uploads go through the server, so browser upload CORS rules are not required.
Changing the public domain reloads the administration page to update the browser's
image security policy. New page loads permit both current and historical storage
domains; existing browser tabs need a reload to use a newly added domain.

The same form supports other S3-compatible providers. Set their endpoint,
region, bucket and public base URL, and choose the addressing style they require.
Turning off custom storage restores the server-configured storage for new files.

## Credential storage

S3 credentials are write-only in the administration API. Blank credential fields
on a later save retain the saved credentials. They are never returned in settings
responses or written to browser storage. The server encrypts storage snapshots
with AES-256-GCM; files retain their storage snapshot so favicon reads and social
cover assets still work after switching buckets.

Set `MEDIA_SETTINGS_ENCRYPTION_KEY` to a stable random secret of at least 32
characters in the media service environment **before saving custom storage**.
Docker Compose passes this variable through. Back it up separately from the
database. If omitted, the service derives its encryption key from the existing
server `S3_SECRET_KEY` (the Compose MinIO root password). Changing the effective
encryption key makes previously saved storage credentials unreadable, including
snapshots needed by older files. Keep that key stable across deployments and
credential rotations. Do not add or change it after saving settings without
re-encrypting the saved snapshots.

References: [R2 S3 API](https://developers.cloudflare.com/r2/api/s3/api/),
[R2 API credentials](https://developers.cloudflare.com/r2/api/tokens/),
[public buckets and Custom Domains](https://developers.cloudflare.com/r2/buckets/public-buckets/).
