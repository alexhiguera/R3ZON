import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// ─── Mock de createAdminClient ────────────────────────────────────────────────
const rpcMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: rpcMock }),
}));

process.env.GOOGLE_CLIENT_ID     = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
process.env.NEXT_PUBLIC_SUPABASE_URL  = "http://localhost";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";

import {
  loadTokensFor,
  googleFetchAdmin,
  persistSyncTokenFor,
  type AdminTokens,
} from "@/lib/google-admin";

const fakeTokens = (overrides: Partial<AdminTokens> = {}): AdminTokens => ({
  access_token:  "access-1",
  refresh_token: "refresh-1",
  expires_at:    new Date(Date.now() + 60_000).toISOString(),
  sync_token:    null,
  email:         "u@example.com",
  negocio_id:    "neg-1",
  ...overrides,
});

beforeEach(() => {
  rpcMock.mockReset();
  vi.spyOn(globalThis, "fetch");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadTokensFor", () => {
  it("devuelve la primera fila de get_google_tokens_admin", async () => {
    rpcMock.mockResolvedValueOnce({ data: [fakeTokens()], error: null });
    const t = await loadTokensFor("user-1");
    expect(t?.access_token).toBe("access-1");
    expect(rpcMock).toHaveBeenCalledWith("get_google_tokens_admin", { p_user_id: "user-1" });
  });

  it("devuelve null si la RPC retorna error", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "rls" } });
    expect(await loadTokensFor("user-x")).toBeNull();
  });

  it("devuelve null si data está vacío", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    expect(await loadTokensFor("user-x")).toBeNull();
  });
});

describe("persistSyncTokenFor", () => {
  it("invoca set_google_sync_token_admin con userId y token", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await persistSyncTokenFor("user-1", "sync-abc");
    expect(rpcMock).toHaveBeenCalledWith("set_google_sync_token_admin", {
      p_user_id: "user-1",
      p_sync_token: "sync-abc",
    });
  });
});

describe("googleFetchAdmin", () => {
  it("usa el access_token vigente sin refrescar si no ha expirado", async () => {
    const tokens = fakeTokens();
    (globalThis.fetch as any).mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await googleFetchAdmin("user-1", "/calendars/primary/events", {}, tokens);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (globalThis.fetch as any).mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer access-1");
  });

  it("refresca proactivamente si el token está expirado y persiste el nuevo", async () => {
    const tokens = fakeTokens({
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });

    (globalThis.fetch as any)
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ access_token: "access-2", expires_in: 3600 }),
        { status: 200, headers: { "content-type": "application/json" } },
      ))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    rpcMock.mockResolvedValueOnce({ data: null, error: null }); // update_google_access_token_admin

    const res = await googleFetchAdmin("user-1", "/calendars/primary/events", {}, tokens);
    expect(res.status).toBe(200);

    // 1ª llamada: token endpoint
    const [tokenUrl] = (globalThis.fetch as any).mock.calls[0];
    expect(tokenUrl).toBe("https://oauth2.googleapis.com/token");

    // 2ª llamada: API real con el nuevo Bearer
    const [, apiInit] = (globalThis.fetch as any).mock.calls[1];
    expect(apiInit.headers.Authorization).toBe("Bearer access-2");

    // El token nuevo se persistió
    expect(rpcMock).toHaveBeenCalledWith(
      "update_google_access_token_admin",
      expect.objectContaining({ p_user_id: "user-1", p_access_token: "access-2" }),
    );
  });

  it("ante 401 reactivo, refresca y reintenta una vez", async () => {
    const tokens = fakeTokens();
    (globalThis.fetch as any)
      .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))   // primer intento
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ access_token: "access-retry", expires_in: 3600 }),
        { status: 200 },
      ))                                                                       // refresh
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));            // retry

    rpcMock.mockResolvedValueOnce({ data: null, error: null });

    const res = await googleFetchAdmin("user-1", "/calendars/primary/events", {}, tokens);
    expect(res.status).toBe(200);
    expect((globalThis.fetch as any).mock.calls).toHaveLength(3);
    const [, retryInit] = (globalThis.fetch as any).mock.calls[2];
    expect(retryInit.headers.Authorization).toBe("Bearer access-retry");
  });

  it("propaga error sin filtrar el body si Google rechaza el refresh", async () => {
    const tokens = fakeTokens({ expires_at: new Date(Date.now() - 1000).toISOString() });
    (globalThis.fetch as any).mockResolvedValueOnce(
      new Response("invalid_grant", { status: 400 }),
    );

    await expect(
      googleFetchAdmin("user-1", "/calendars/primary/events", {}, tokens),
    ).rejects.toThrow(/google_refresh_admin_failed_400/);
  });

  it("lanza si no hay tokens para el usuario", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await expect(googleFetchAdmin("ghost", "/x")).rejects.toThrow(/No google connection/);
  });
});
