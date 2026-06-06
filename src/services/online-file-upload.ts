/**
 * Uploads a text blob (typically Readability-extracted page content) to the
 * backend's OpenWebUI-compatible file endpoint. Returns the file id, which the
 * extension then references from chat completion requests via
 * `files: [{type: 'file', id }]` so the backend can run RAG over it.
 *
 * Contract: docs/backend-api.md → "Files".
 */

import {
  BACKEND_FILES_URL,
  BACKEND_API_KEY,
} from '../sidebar/constants/backend-config';

export interface UploadedFile {
  id: string;
  filename: string;
}

export async function uploadTextAsFile(
  text: string,
  filename: string,
): Promise<UploadedFile> {
  const blob = new Blob([text], { type: 'text/plain' });
  const form = new FormData();
  form.append('file', blob, filename);

  const headers: Record<string, string> = {};
  if (BACKEND_API_KEY) headers.Authorization = `Bearer ${BACKEND_API_KEY}`;

  const response = await fetch(BACKEND_FILES_URL, {
    method: 'POST',
    body: form,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Upload failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    );
  }

  const json = await response.json();
  if (!json?.id) throw new Error('Upload succeeded but response missing id');
  return { id: String(json.id), filename: String(json.filename ?? filename) };
}
