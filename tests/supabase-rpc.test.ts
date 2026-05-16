import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock del cliente server-side. Devolvemos un objeto con `rpc` espiado.
const rpcMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: rpcMock }),
}));

import { loadTokens, persistSyncToken, saveTokens } from "@/lib/google";

beforeEach(() => {
  rpcMock.mockReset();
});

describe("RPC wrappers — google.ts", () => {
  it("loadTokens devuelve la primera fila de get_google_tokens", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          access_token: "a",
          refresh_token: "r",
          expires_at: new Date().toISOString(),
          sync_token: null,
          email: "x@y.com",
        },
      ],
      error: null,
    });
    const t = await loadTokens();
    expect(t?.access_token).toBe("a");
    expect(rpcMock).toHaveBeenCalledWith("get_google_tokens");
  });

  it("loadTokens devuelve null si la RPC falla", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "rls denied" } });
    expect(await loadTokens()).toBeNull();
  });

  it("saveTokens propaga error si la RPC falla", async () => {
    rpcMock.mockResolvedValueOnce({ error: { message: "encryption_failed" } });
    await expect(
      saveTokens({
        accessToken: "a",
        refreshToken: "r",
        expiresAt: new Date("2026-01-01"),
        email: "x@y.com",
      }),
    ).rejects.toThrow(/encryption_failed/);
  });

  it("saveTokens pasa los parámetros correctos a set_google_tokens", async () => {
    rpcMock.mockResolvedValueOnce({ error: null });
    const expiresAt = new Date("2026-05-03T10:00:00Z");
    await saveTokens({
      accessToken: "tok",
      refreshToken: "ref",
      expiresAt,
      email: "u@e.com",
      scope: "calendar.events",
    });
    expect(rpcMock).toHaveBeenCalledWith("set_google_tokens", {
      p_access_token: "tok",
      p_refresh_token: "ref",
      p_expires_at: expiresAt.toISOString(),
      p_email: "u@e.com",
      p_scope: "calendar.events",
    });
  });

  it("persistSyncToken invoca set_google_sync_token", async () => {
    rpcMock.mockResolvedValueOnce({ error: null });
    await persistSyncToken("sync-123");
    expect(rpcMock).toHaveBeenCalledWith("set_google_sync_token", { p_sync_token: "sync-123" });
  });
});
