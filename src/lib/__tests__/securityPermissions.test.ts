import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(
  readFileSync(path.join(root, "security/permission-manifest.json"), "utf8"),
) as {
  rpc: { name: string; access: string; reason?: string }[];
  edgeFunctions: { name: string; access: string }[];
};

const ALLOWED = ["public", "authenticated", "internal", "api-key"];

describe("manifest oprávnení backendu", () => {
  it("každá edge funkcia v repozitári má deklarovaný prístupový model", () => {
    const dir = path.join(root, "supabase/functions");
    const fns = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
      .map((d) => d.name);
    const declared = new Set(manifest.edgeFunctions.map((f) => f.name));
    const missing = fns.filter((f) => !declared.has(f));
    expect(missing, `Nedeklarované edge funkcie: ${missing.join(", ")}`).toEqual([]);
  });

  it("manifest neobsahuje edge funkcie, ktoré v repozitári neexistujú", () => {
    const stale = manifest.edgeFunctions.filter(
      (f) => !existsSync(path.join(root, "supabase/functions", f.name, "index.ts")),
    );
    expect(stale.map((f) => f.name)).toEqual([]);
  });

  it("používa iba známe prístupové modely", () => {
    for (const entry of [...manifest.rpc, ...manifest.edgeFunctions]) {
      expect(ALLOWED, `${entry.name}`).toContain(entry.access);
    }
  });

  it("neverejné edge funkcie majú v kóde kontrolu autentifikácie", () => {
    for (const fn of manifest.edgeFunctions.filter((f) => f.access !== "public")) {
      const src = readFileSync(
        path.join(root, "supabase/functions", fn.name, "index.ts"),
        "utf8",
      );
      const hasAuthCheck =
        /status:\s*401/.test(src) || /status:\s*403/.test(src) || /401/.test(src);
      expect(hasAuthCheck, `${fn.name} nemá kontrolu 401/403`).toBe(true);
    }
  });

  it("verejné RPC funkcie sú explicitne odôvodnené", () => {
    for (const fn of manifest.rpc.filter((f) => f.access === "public")) {
      expect(fn.reason && fn.reason.length > 10, `${fn.name} chýba zdôvodnenie`).toBe(true);
    }
  });
});
