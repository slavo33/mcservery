// Konfigurácia Lighthouse CI.
// URL sa načítajú z .lighthouseci/urls.json (generuje scripts/lighthouse-urls.ts),
// takže rozpočet LCP/CLS sa overuje aj na dynamickom detaile servera
// s najdlhším popisom a na formulári /add-server.

const { existsSync, readFileSync } = require("fs");
const { resolve } = require("path");

const ORIGIN = process.env.LH_ORIGIN || "http://localhost:4173";
const FALLBACK_PATHS = ["/", "/servers", "/staff", "/add-server"];

function loadPaths() {
  const file = resolve(__dirname, ".lighthouseci/urls.json");
  if (!existsSync(file)) return FALLBACK_PATHS;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(parsed) && parsed.length ? parsed : FALLBACK_PATHS;
  } catch {
    return FALLBACK_PATHS;
  }
}

const urls = loadPaths().map((p) => `${ORIGIN}${p}`);

module.exports = {
  ci: {
    collect: {
      startServerCommand: "bunx vite preview --port 4173 --strictPort",
      startServerReadyPattern: "Local:",
      startServerReadyTimeout: 120000,
      url: urls,
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        budgetsPath: "./lighthouse-budget.json",
        output: ["html", "json"],
        skipAudits: ["uses-http2", "canonical", "is-crawlable"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],

        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "first-contentful-paint": ["error", { maxNumericValue: 1800 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
        "speed-index": ["warn", { maxNumericValue: 3400 }],
        interactive: ["warn", { maxNumericValue: 3800 }],

        "performance-budget": "error",
        "resource-summary:script:size": ["warn", { maxNumericValue: 700000 }],
        "resource-summary:total:size": ["warn", { maxNumericValue: 2000000 }],

        "uses-responsive-images": "warn",
        "unused-javascript": "warn",
        "render-blocking-resources": "warn",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci/reports",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%",
    },
  },
};
