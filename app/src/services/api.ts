export class ErrorApi extends Error {
  status: number;
  cuerpo: unknown;

  constructor(status: number, cuerpo: unknown, mensaje?: string) {
    super(mensaje ?? `Error HTTP ${status}`);
    this.name = 'ErrorApi';
    this.status = status;
    this.cuerpo = cuerpo;
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  token?: string | null;
  onUnauthorized?: () => void | Promise<void>;
}

function construirUrl(
  ruta: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
  const path = ruta.startsWith('/') ? ruta : `/${ruta}`;
  const fullUrl = `${base}${path}`;

  if (!params) return fullUrl;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value) !== '') {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${fullUrl}?${queryString}` : fullUrl;
}

export async function api<T>(ruta: string, options: ApiOptions = {}): Promise<T | null> {
  const { method = 'GET', body, params, token, onUnauthorized } = options;
  const url = construirUrl(ruta, params);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    let cuerpo: unknown = null;
    if (contentType.includes('application/json')) {
      cuerpo = await response.json().catch(() => null);
    } else {
      const texto = await response.text().catch(() => '');
      cuerpo = texto || null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        if (onUnauthorized) {
          await onUnauthorized();
        }
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }

      const mensajeApi =
        typeof cuerpo === 'object' && cuerpo !== null && 'mensaje' in cuerpo
          ? String((cuerpo as { mensaje?: unknown }).mensaje)
          : typeof cuerpo === 'object' && cuerpo !== null && 'message' in cuerpo
            ? String((cuerpo as { message?: unknown }).message)
            : `Error HTTP ${response.status}`;

      throw new ErrorApi(response.status, cuerpo, mensajeApi);
    }

    return cuerpo as T;
  } catch (err) {
    if (err instanceof ErrorApi) {
      throw err;
    }
    const esAborto = err instanceof DOMException && err.name === 'AbortError';
    throw new ErrorApi(
      0,
      null,
      esAborto ? 'Tiempo de espera agotado (10s)' : 'No se pudo conectar con el servidor'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
