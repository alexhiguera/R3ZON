import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const rpcMock = vi.fn();
const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: rpcMock,
    auth: { getUser: getUserMock },
  }),
}));

process.env.GOOGLE_CLIENT_ID     = "cid";
process.env.GOOGLE_CLIENT_SECRET = "csec";

import { GET } from "@/app/api/integrations/google/callback/route";
import { NextRequest } from "next/server";

const ORIGIN = "http://localhost";

function makeReq(url: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(url, { method: "GET" });
  for (const [k, v] of Object.entries(cookies)) {
    req.cookies.set(k, v);
  }
  return req;
}

beforeEach(() => {
  rpcMock.mockReset();
  getUserMock.mockReset();
  vi.spyOn(globalThis, "fetch");
});
afterEach(() => vi.restoreAllMocks());

describe("OAuth callback — validaciones de seguridad", () => {
  it("redirige con error si Google devuelve `error` en la query", async () => {
    const req = makeReq(`${ORIGIN}/api/integrations/google/callback?error=access_denied`);
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toMatch(/google_error=access_denied/);
  });

  it("rechaza con `invalid_state` si el state no coincide con la cookie", async () => {
    const req = makeReq(
      `${ORIGIN}/api/integrations/google/callback?code=abc&state=remoto`,
      { g_oauth_state: "local-distinto" },
    );
    const res = await GET(req);
    expect(res.headers.get("location")).toMatch(/google_error=invalid_state/);
  });

  it("redirige a /login si el usuario no está autenticado", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const req = makeReq(
      `${ORIGIN}/api/integrations/google/callback?code=abc&state=s1`,
      { g_oauth_state: "s1" },
    );
    const res = await GET(req);
    expect(res.headers.get("location")).toMatch(/\/login/);
  });

  it("rechaza con `no_refresh_token` si Google no devuelve refresh_token", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    (globalThis.fetch as any).mockResolvedValueOnce(new Response(
      JSON.stringify({ access_token: "a", expires_in: 3600 }),
      { status: 200 },
    ));

    const req = makeReq(
      `${ORIGIN}/api/integrations/google/callback?code=abc&state=s1`,
      { g_oauth_state: "s1" },
    );
    const res = await GET(req);
    expect(res.headers.get("location")).toMatch(/google_error=no_refresh_token/);
  });

  it("flujo completo: intercambia code y persiste vía set_google_tokens", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    (globalThis.fetch as any).mockResolvedValueOnce(new Response(
      JSON.stringify({
        access_token:  "ACC",
        refresh_token: "REF",
        expires_in:    3600,
        scope:         "calendar.events",
      }),
      { status: 200 },
    ));
    rpcMock.mockResolvedValueOnce({ error: null });

    const req = makeReq(
      `${ORIGIN}/api/integrations/google/callback?code=abc&state=s1`,
      { g_oauth_state: "s1" },
    );
    const res = await GET(req);

    // El POST a Google fue con grant_type=authorization_code
    const [, init] = (globalThis.fetch as any).mock.calls[0];
    expect(String(init.body)).toContain("grant_type=authorization_code");
    expect(String(init.body)).toContain("code=abc");

    expect(rpcMock).toHaveBeenCalledWith("set_google_tokens", expect.objectContaining({
      p_access_token:  "ACC",
      p_refresh_token: "REF",
      p_scope:         "calendar.events",
    }));
    expect(res.headers.get("location")).toMatch(/google=connected/);
  });
});
