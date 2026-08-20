// Konfigurácia Lighthouse CI.
// URL sa načítajú z .lighthouseci/urls.json (generuje scripts/lighthouse-urls.ts),
// takže rozpočet LCP/CLS sa overuje aj na dynamickom detaile servera
// s najdlhším popisom a na formulári /add-server.
//
// Form factor sa volí cez LH_FORM_FACTOR=mobile|desktop (default: mobile).
// Throttling je explicitný (CPU aj sieť), nie iba preset, aby boli behy
// medzi jobmi a commitmi porovnateľné.

const { existsSync, readFileSync } = require("fs");
const { resolve } = require("path");

const ORIGIN = process.env.LH_ORIGIN || "http://localhost:4173";
const FORM_FACTOR = (process.env.LH_FORM_FACTOR || "mobile").toLowerCase() === "desktop" ? "desktop" : "mobile";
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

// Konzistentné profily throttlingu (simulované, deterministické naprieč behmi).
const PROFILES = {
  mobile: {
    budgetsPath: "./lighthouse-budget.mobile.json",
    formFactor: "mobile",
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
    emulatedUserAgent:
      "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    throttlingMethod: "simulate",
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      requestLatencyMs: 150 * 3.75,
      downloadThroughputKbps: 1638.4 * 0.9,
      uploadThroughputKbps: 675 * 0.9,
      cpuSlowdownMultiplier: 4,
    },
    thresholds: {
      performance: 0.75,
      lcp: 4000,
      fcp: 3000,
      tbt: 600,
      si: 5800,
      tti: 7000,
    },
  },
  desktop: {
    budgetsPath: "./lighthouse-budget.json",
    formFactor: "desktop",
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    emulatedUserAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    throttlingMethod: "simulate",
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      requestLatencyMs: 40 * 3.75,
      downloadThroughputKbps: 10240,
      uploadThroughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
    thresholds: {
      performance: 0.8,
      lcp: 2500,
      fcp: 1800,
      tbt: 300,
      si: 3400,
      tti: 3800,
    },
  },
};

const profile = PROFILES[FORM_FACTOR];
const t = profile.thresholds;

module.exports = {
  ci: {
    collect: {
      startServerCommand: "bunx vite preview --port 4173 --strictPort",
      startServerReadyPattern: "Local:",
      startServerReadyTimeout: 120000,
      url: urls,
      numberOfRuns: 3,
      settings: {
        budgetsPath: profile.budgetsPath,
        output: ["html", "json"],
        skipAudits: ["uses-http2", "canonical", "is-crawlable"],
        formFactor: profile.formFactor,
        screenEmulation: profile.screenEmulation,
        emulatedUserAgent: profile.emulatedUserAgent,
        throttlingMethod: profile.throttlingMethod,
        throttling: profile.throttling,
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: t.performance }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],

        "largest-contentful-paint": ["error", { maxNumericValue: t.lcp }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "first-contentful-paint": ["error", { maxNumericValue: t.fcp }],
        "total-blocking-time": ["error", { maxNumericValue: t.tbt }],
        "speed-index": ["warn", { maxNumericValue: t.si }],
        interactive: ["warn", { maxNumericValue: t.tti }],

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
      outputDir: `./.lighthouseci/reports/${FORM_FACTOR}`,
      reportFilenamePattern: `%%PATHNAME%%-${FORM_FACTOR}-%%DATETIME%%-report.%%EXTENSION%%`,
    },
  },
};
