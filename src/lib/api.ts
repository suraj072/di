const API_BASE = import.meta.env.VITE_API_URL || '';

export const getToken = (): string | null => localStorage.getItem('auth_token');

const request = async (method: string, path: string, body?: unknown, isFormData = false): Promise<any> => {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined
      ? isFormData
        ? (body as FormData)
        : JSON.stringify(body)
      : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
};

export const api = {
  get:    (path: string)                   => request('GET',    path),
  post:   (path: string, body: unknown)    => request('POST',   path, body),
  patch:  (path: string, body: unknown)    => request('PATCH',  path, body),
  delete: (path: string)                   => request('DELETE', path),
  upload: (path: string, form: FormData)   => request('POST',   path, form, true),
};

export default api;
