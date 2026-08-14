import type {
  Client,
  ClientPayload,
  Paginated,
  Product,
  ProductCategory,
  ProductPayload,
  Quote,
  QuotePayload,
  QuoteStatus,
} from "@facturier/shared";

const base = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listClients(params: { q?: string; type?: string; status?: string; pageSize?: number }) {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.type) qs.set("type", params.type);
    if (params.status) qs.set("status", params.status);
    if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<Paginated<Client>>(`/clients${suffix}`);
  },
  getClient(id: string) {
    return request<Client>(`/clients/${id}`);
  },
  createClient(payload: ClientPayload) {
    return request<Client>("/clients", { method: "POST", body: JSON.stringify(payload) });
  },
  updateClient(id: string, payload: ClientPayload) {
    return request<Client>(`/clients/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteClient(id: string) {
    return request<{ ok: boolean }>(`/clients/${id}`, { method: "DELETE" });
  },
  duplicateClient(id: string) {
    return request<Client>(`/clients/${id}/duplicate`, { method: "POST" });
  },
  exportClientsCsv() {
    return fetch(`${base}/clients/export`).then(async (res) => {
      if (!res.ok) throw new Error("Export impossible");
      return res.blob();
    });
  },
  listProducts(params: { q?: string; type?: string; status?: string; categoryId?: string; pageSize?: number }) {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.type) qs.set("type", params.type);
    if (params.status) qs.set("status", params.status);
    if (params.categoryId) qs.set("categoryId", params.categoryId);
    if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<Paginated<Product>>(`/products${suffix}`);
  },
  listProductCategories() {
    return request<ProductCategory[]>("/products/categories");
  },
  getProduct(id: string) {
    return request<Product>(`/products/${id}`);
  },
  createProduct(payload: ProductPayload) {
    return request<Product>("/products", { method: "POST", body: JSON.stringify(payload) });
  },
  updateProduct(id: string, payload: ProductPayload) {
    return request<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteProduct(id: string) {
    return request<{ ok: boolean }>(`/products/${id}`, { method: "DELETE" });
  },
  duplicateProduct(id: string) {
    return request<Product>(`/products/${id}/duplicate`, { method: "POST" });
  },
  exportProductsCsv() {
    return fetch(`${base}/products/export`).then(async (res) => {
      if (!res.ok) throw new Error("Export impossible");
      return res.blob();
    });
  },
  listQuotes(params: { q?: string; status?: string; clientId?: string }) {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.status) qs.set("status", params.status);
    if (params.clientId) qs.set("clientId", params.clientId);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<Paginated<Quote>>(`/quotes${suffix}`);
  },
  getQuote(id: string) {
    return request<Quote>(`/quotes/${id}`);
  },
  createQuote(payload: QuotePayload) {
    return request<Quote>("/quotes", { method: "POST", body: JSON.stringify(payload) });
  },
  updateQuote(id: string, payload: QuotePayload) {
    return request<Quote>(`/quotes/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteQuote(id: string) {
    return request<{ ok: boolean }>(`/quotes/${id}`, { method: "DELETE" });
  },
  duplicateQuote(id: string) {
    return request<Quote>(`/quotes/${id}/duplicate`, { method: "POST" });
  },
  changeQuoteStatus(id: string, status: QuoteStatus) {
    return request<Quote>(`/quotes/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
  },
};
