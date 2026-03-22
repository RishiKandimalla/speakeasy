export const API_BASE = 'https://speakeasy-101830418970.us-east1.run.app';

export type UploadResponse = {
  upload_id: string;
  status: string;
  bucket: string;
  path: string;
  video_url: string | null;
};

async function parseJsonOrThrow(res: Response): Promise<unknown> {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail =
      typeof body === 'object' && body !== null && 'detail' in body
        ? String((body as { detail: unknown }).detail)
        : text || res.statusText;
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return body;
}

export async function uploadVideo(
  fileUri: string,
  filename: string,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: filename,
    type: 'video/mp4',
  } as unknown as Blob);

  const res = await fetch(`${API_BASE}/v1/uploads`, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  });

  const body = await parseJsonOrThrow(res);
  return body as UploadResponse;
}

export async function listUploads(): Promise<UploadResponse[]> {
  const res = await fetch(`${API_BASE}/v1/uploads`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const body = await parseJsonOrThrow(res);
  return body as UploadResponse[];
}

export async function getUpload(uploadId: string): Promise<UploadResponse> {
  const res = await fetch(`${API_BASE}/v1/uploads/${uploadId}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const body = await parseJsonOrThrow(res);
  return body as UploadResponse;
}
