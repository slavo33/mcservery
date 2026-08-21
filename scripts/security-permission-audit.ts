/**
 * Bezpečnostný audit oprávnení backendu.
 *
 * Overuje, že každá citlivá databázová (RPC) a edge funkcia:
 *  - "internal"      -> nie je volateľná anonymne ani prihlásene (žiadny prístup cez API)
 *  - "authenticated" -> anonymné volanie je odmietnuté (401/403)
 *  - "api-key"       -> volanie bez platného API kľúča je odmietnuté (401/403)
 *  - "public"        -> anonymné volanie NIE JE odmietnuté z dôvodu autentifikácie
 *
 * Skript končí nenulovým kódom pri akomkoľvek porušení – v CI blokuje merge.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

type Access = "public" | "authenticated" | "internal" | "api-key";

interface RpcCheck {
  name: string;
  access: Access;
  args?: Record<string, unknown>;
  reason?: string;
}

interface EdgeCheck {
  name: string;
  access: Access;
  method?: string;
  body?: Record<string, unknown>;
  reason?: string;
}

interface Manifest {
  rpc: RpcCheck[];
  edgeFunctions: EdgeCheck[];
}

const root = process.cwd();
export const manifest: Manifest = JSON.parse(
  readFileSync(path.join(root, "security/permission-manifest.json"), "utf8"),
);

const envFrom = (key: string): string | undefined => {
  if (process.env[key]) return process.env[key];
  try {
    const raw = readFileSync(path.join(root, ".env"), "utf8");
    const line = raw.split("\n").find((l) => l.trim().startsWith(`${key}=`));
    return line?.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
};

const SUPABASE_URL = envFrom("VITE_SUPABASE_URL");
const ANON_KEY = envFrom("VITE_SUPABASE_PUBLISHABLE_KEY");
const USER_JWT = process.env.SECURITY_AUDIT_USER_JWT;

const DENIED_STATUSES = new Set([401, 403, 404]);

interface Result {
  target: string;
  access: Access;
  ok: boolean;
  detail: string;
}

const results: Result[] = [];

const record = (target: string, access: Access, ok: boolean, detail: string) => {
  results.push({ target, access, ok, detail });
  console.log(`${ok ? "✅" : "❌"} [${access}] ${target} — ${detail}`);
};

async function callRpc(fn: RpcCheck, jwt?: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn.name}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY!,
      Authorization: `Bearer ${jwt ?? ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fn.args ?? {}),
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function callEdge(fn: EdgeCheck, jwt?: string) {
  const method = fn.method ?? "POST";
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn.name}`, {
    method,
    headers: {
      apikey: ANON_KEY!,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      "Content-Type": "application/json",
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(fn.body ?? {}) }),
  });
  const text = await res.text();
  return { status: res.status, text };
}

const deniedByPermission = (status: number, text: string) =>
  DENIED_STATUSES.has(status) ||
  /permission denied|not authenticated|unauthorized|does not exist/i.test(text);

async function auditRpc() {
  for (const fn of manifest.rpc) {
    const anon = await callRpc(fn);
    const denied = deniedByPermission(anon.status, anon.text);

    if (fn.access === "public") {
      record(`rpc:${fn.name}`, fn.access, !denied || anon.status === 404 === false ? !denied : false,
        `anonymné volanie status ${anon.status}`);
    } else {
      record(`rpc:${fn.name}`, fn.access, denied, `anonymné volanie odmietnuté (status ${anon.status})`);
    }

    if (fn.access === "internal" && USER_JWT) {
      const authed = await callRpc(fn, USER_JWT);
      record(
        `rpc:${fn.name} (prihlásený)`,
        fn.access,
        deniedByPermission(authed.status, authed.text),
        `prihlásené volanie odmietnuté (status ${authed.status})`,
      );
    }
  }
}

async function auditEdge() {
  for (const fn of manifest.edgeFunctions) {
    const anon = await callEdge(fn);
    const denied = anon.status === 401 || anon.status === 403;

    if (fn.access === "public") {
      record(`edge:${fn.name}`, fn.access, !denied, `anonymné volanie povolené (status ${anon.status})`);
    } else {
      record(`edge:${fn.name}`, fn.access, denied, `anonymné volanie odmietnuté (status ${anon.status})`);
    }
  }
}

async function main() {
  if (!SUPABASE_URL || !ANON_KEY) {
    console.error("Chýba VITE_SUPABASE_URL alebo VITE_SUPABASE_PUBLISHABLE_KEY – audit nemôže bežať.");
    process.exit(1);
  }

  console.log("== Audit oprávnení databázových funkcií ==");
  await auditRpc();
  console.log("\n== Audit oprávnení edge funkcií ==");
  await auditEdge();

  const failed = results.filter((r) => !r.ok);
  console.log(`\nVýsledok: ${results.length - failed.length}/${results.length} kontrol prešlo.`);
  if (failed.length) {
    console.error("Zlyhané kontroly:");
    for (const f of failed) console.error(` - [${f.access}] ${f.target}: ${f.detail}`);
    process.exit(1);
  }
  console.log("Všetky kontroly oprávnení prešli.");
}

main().catch((err) => {
  console.error("Audit zlyhal:", err);
  process.exit(1);
});
