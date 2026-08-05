import { getStoredAdminToken } from "@/lib/auth";

export type ApiRequestOptions = RequestInit & {
  token?: string | null;
};

export async function authenticatedFetch<T>(
  input: string,
  options: ApiRequestOptions = {}
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const token = options.token ?? getStoredAdminToken();
  const headers = new Headers(options.headers ?? {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data,
      error: (data as { error?: string })?.error || "Something went wrong.",
    };
  }

  return {
    ok: true,
    status: response.status,
    data: (data as T) ?? null,
  };
}
