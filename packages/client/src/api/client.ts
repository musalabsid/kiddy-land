export class ClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ClientError";
  }
}

export class ApiClient {
  constructor(
    public readonly origin: string,
    private token?: string,
  ) {}
  setToken(token: string | undefined) {
    this.token = token;
  }
  getToken() {
    return this.token;
  }
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    const isFormData =
      typeof FormData !== "undefined" && init.body instanceof FormData;
    if (init.body && !headers.has("Content-Type") && !isFormData)
      headers.set("Content-Type", "application/json");
    if (isFormData) headers.delete("Content-Type");
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    const response = await fetch(`${this.origin}${path}`, { ...init, headers });
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("json")
      ? await response.json()
      : await response.text();
    if (!response.ok) {
      const message =
        typeof body === "object" && body && "error" in body
          ? String(body.error)
          : `Request failed (${response.status})`;
      throw new ClientError(response.status, message, body);
    }
    return body as T;
  }
  get<T>(path: string, init?: RequestInit) {
    return this.request<T>(path, { ...init, method: "GET" });
  }
  post<T>(path: string, body: unknown, init?: RequestInit) {
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;
    return this.request<T>(path, {
      ...init,
      method: "POST",
      body: isFormData ? (body as BodyInit) : JSON.stringify(body),
    });
  }
  patch<T>(path: string, body: unknown, init?: RequestInit) {
    return this.request<T>(path, {
      ...init,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }
  put<T>(path: string, body: unknown, init?: RequestInit) {
    return this.request<T>(path, {
      ...init,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
  delete<T>(path: string, init?: RequestInit) {
    return this.request<T>(path, { ...init, method: "DELETE" });
  }
  async download(path: string) {
    const response = await fetch(`${this.origin}${path}`, {
      headers: { Authorization: this.token ? `Bearer ${this.token}` : "" },
    });
    if (!response.ok)
      throw new ClientError(
        response.status,
        `Request failed (${response.status})`,
      );
    return response.blob();
  }
}
