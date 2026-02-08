import PocketBase from "pocketbase";

const BASE_URL = import.meta.env.VITE_POCKETBASE_URL;

export const pb = new PocketBase(BASE_URL);

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: any;
};

export async function pbRequest<T>(path: string, options: RequestOptions = {}) {
  if (!BASE_URL) {
    throw new Error("PocketBase URL ontbreekt.");
  }

  const headers = new Headers(options.headers ?? {});
  if (pb.authStore.token) {
    headers.set("Authorization", pb.authStore.token);
  }

  const isFormData = options.body instanceof FormData;
  if (options.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body
      ? isFormData
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T & { message?: string }) : null;

  if (!response.ok) {
    throw new Error(payload?.message ?? "Serverfout.");
  }

  return payload as T;
}

type ListResponse<T> = {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: T[];
};

export async function pbListAll<T>(
  collection: string,
  query: Record<string, string> = {}
) {
  const items: T[] = [];
  const perPage = 200;
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await pb.collection(collection).getList<T>(page, perPage, query);

    items.push(...(data?.items ?? []));
    totalPages = data?.totalPages ?? 1;
    page += 1;
  }

  return items;
}

export async function pbListPage<T>(
  collection: string,
  query: Record<string, string> = {}
) {
  const page = Number(query.page ?? 1);
  const perPage = Number(query.perPage ?? 30);
  const { page: _page, perPage: _perPage, ...options } = query;

  return pb.collection(collection).getList<T>(page, perPage, options);
}
