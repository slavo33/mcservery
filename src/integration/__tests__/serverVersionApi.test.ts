import { describe, it, expect, beforeAll } from "vitest";

/**
 * Integračné testy volajúce priamo REST API databázy (bez UI).
 * Overujú, že server-side validácia (`validate_server_version_trigger`)
 * zamietne neplatné kombinácie verzie, vráti kód `23514` a nič neuloží.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const IP_PREFIX = "invalid-version-itest";

const canRun = Boolean(SUPABASE_URL && SUPABASE_KEY);
const d = canRun ? describe : describe.skip;

const headers = {
  apikey: SUPABASE_KEY ?? "",
  Authorization: `Bearer ${SUPABASE_KEY ?? ""}`,
  "Content-Type": "application/json",
};

const insertServer = async (index: number, payload: Record<string, unknown>) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/servers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      owner_id: "00000000-0000-0000-0000-000000000000",
      name: "Integration test",
      description: "Integračný test neplatnej verzie.",
      ip: `${IP_PREFIX}-${index}.test`,
      software: "Paper",
      platform: ["java"],
      ...payload,
    }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const countTestRows = async () => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/servers?select=id&ip=like.${IP_PREFIX}*`,
    { headers }
  );
  const rows = await res.json();
  return Array.isArray(rows) ? rows.length : 0;
};

d("API: neplatné kombinácie verzie sa neuložia", () => {
  beforeAll(async () => {
    // Východiskový stav: v databáze nesmie byť žiadny testovací záznam.
    expect(await countTestRows()).toBe(0);
  });

  it("prázdna verzia → 23514 a žiadny zápis", async () => {
    const { status, body } = await insertServer(1, { version: "" });
    expect(status).toBe(400);
    expect(body.code).toBe("23514");
    expect(body.message).toMatch(/Verzia servera je povinná/i);
    expect(await countTestRows()).toBe(0);
  });

  it("nečíselná verzia → 23514 a žiadny zápis", async () => {
    const { status, body } = await insertServer(2, { version: "abc" });
    expect(status).toBe(400);
    expect(body.code).toBe("23514");
    expect(body.message).toMatch(/Neplatný formát verzie/i);
    expect(await countTestRows()).toBe(0);
  });

  it("26.2 + Bedrock → 23514 a žiadny zápis", async () => {
    const { status, body } = await insertServer(3, {
      version: "26.2",
      platform: ["bedrock"],
    });
    expect(status).toBe(400);
    expect(body.code).toBe("23514");
    expect(body.message).toMatch(/iba pre Java Edition/i);
    expect(await countTestRows()).toBe(0);
  });

  it("26.2 + nekompatibilný software → 23514 a žiadny zápis", async () => {
    const { status, body } = await insertServer(4, {
      version: "26.2",
      software: "BungeeCord",
    });
    expect(status).toBe(400);
    expect(body.code).toBe("23514");
    expect(body.message).toMatch(/nepodporuje verziu 26\.2/i);
    expect(await countTestRows()).toBe(0);
  });

  it("26.2 + nekompatibilná proxy → 23514 a žiadny zápis", async () => {
    const { status, body } = await insertServer(5, {
      version: "26.2",
      proxy: "BungeeCord",
    });
    expect(status).toBe(400);
    expect(body.code).toBe("23514");
    expect(body.message).toMatch(/Proxy .* nepodporuje verziu 26\.2/i);
    expect(await countTestRows()).toBe(0);
  });

  it("neprihlásený zápis platnej verzie zamietne RLS (42501)", async () => {
    const { status, body } = await insertServer(6, { version: "1.20.4" });
    expect(status).toBe(401);
    expect(body.code).toBe("42501");
    expect(await countTestRows()).toBe(0);
  });
});
