/**
 * Fetch wrapper with timeouts and clear error messages
 */

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public bodySnippet?: string
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let bodySnippet: string | undefined;
      try {
        const text = await response.text();
        bodySnippet = text.length > 200 ? text.slice(0, 200) + '...' : text;
      } catch {
        // Ignore body read errors
      }

      throw new FetchError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText,
        bodySnippet
      );
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof FetchError) {
      throw error;
    }

    if ((error as Error).name === 'AbortError') {
      throw new FetchError(`Request timeout after ${timeout}ms`);
    }

    throw new FetchError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, options);

  try {
    return await response.json() as T;
  } catch (error) {
    throw new FetchError(
      `Invalid JSON response: ${error instanceof Error ? error.message : 'Parse error'}`
    );
  }
}