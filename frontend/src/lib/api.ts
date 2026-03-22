import { supabase } from './supabase';

export const API_BASE = 'https://speakeasy-101830418970.us-east1.run.app';

export type UploadResponse = {
  upload_id: string;
  status: string;
  bucket: string;
  path: string;
  video_url: string | null;
};

export type ClipCategory = 'minecraft' | 'drone' | 'both';

export type ClipResponse = {
  id: string;
  category: Exclude<ClipCategory, 'both'>;
  duration_s: number | null;
  file_size: number | null;
  video_url: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { Accept: 'application/json' };
  // #region agent log
  if (session?.access_token) {
    try {
      const _hdr = JSON.parse(atob(session.access_token.split('.')[0]));
      console.log('[DEBUG-636875] JWT header:', JSON.stringify(_hdr));
    } catch (_e) { console.log('[DEBUG-636875] Could not decode JWT header'); }
  } else {
    console.log('[DEBUG-636875] No access token in session');
  }
  // #endregion
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

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
    // #region agent log
    fetch('http://127.0.0.1:7921/ingest/d49ba14d-c13e-4e83-98b7-1d5f20ece947',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'636875'},body:JSON.stringify({sessionId:'636875',location:'api.ts:parseJsonOrThrow',message:'API error response',data:{status:res.status,detail,url:res.url},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return body;
}

export async function uploadVideo(
  fileUri: string,
  filename: string,
): Promise<UploadResponse> {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: filename,
    type: 'video/mp4',
  } as unknown as Blob);

  const res = await fetch(`${API_BASE}/v1/uploads`, {
    method: 'POST',
    body: formData,
    headers,
  });

  const body = await parseJsonOrThrow(res);
  return body as UploadResponse;
}

export async function listUploads(): Promise<UploadResponse[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/uploads`, {
    method: 'GET',
    headers,
  });
  const body = await parseJsonOrThrow(res);
  return body as UploadResponse[];
}

export async function getUpload(uploadId: string): Promise<UploadResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/uploads/${uploadId}`, {
    method: 'GET',
    headers,
  });
  const body = await parseJsonOrThrow(res);
  return body as UploadResponse;
}

export async function listClips(category: ClipCategory = 'both'): Promise<ClipResponse[]> {
  const params = new URLSearchParams();
  params.set('category', category);
  const res = await fetch(`${API_BASE}/v1/clips?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const body = await parseJsonOrThrow(res);
  return body as ClipResponse[];
}
