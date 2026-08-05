import { softwareOptions, proxyOptions, versions } from "@/lib/mockData";

/**
 * Next-gen Minecraft verzie (26.x) sú zatiaľ len pre Java Edition.
 * Bedrock software / loadery, ktoré tieto verzie nepodporujú, sa nemajú
 * vôbec ponúkať a formulár sa s takou kombináciou nesmie dať uložiť.
 */
export const NEXT_GEN_PREFIX = "26.";

export const isNextGenVersion = (version: string) =>
  version.startsWith(NEXT_GEN_PREFIX);

/** Software podporujúci 26.x (Java-only, moderné buildy) */
const NEXT_GEN_SOFTWARE = [
  "Vanilla",
  "Spigot",
  "Paper",
  "Purpur",
  "Pufferfish",
  "Folia",
  "Fabric",
  "Quilt",
  "NeoForge",
];

/** Proxy podporujúce 26.x */
const NEXT_GEN_PROXY = ["Žiadny", "Velocity", "Gate", "Infrared"];

export const getAvailablePlatforms = (version: string): string[] =>
  isNextGenVersion(version) ? ["Java"] : ["Java", "Bedrock"];

export const getAvailableSoftware = (version: string): string[] =>
  isNextGenVersion(version)
    ? softwareOptions.filter((s) => NEXT_GEN_SOFTWARE.includes(s))
    : softwareOptions;

export const getAvailableProxies = (version: string): string[] =>
  isNextGenVersion(version)
    ? proxyOptions.filter((p) => NEXT_GEN_PROXY.includes(p))
    : proxyOptions;

export type CompatibilityInput = {
  version: string;
  software: string;
  proxy: string;
  platform: string[];
};

/** Pomôcka: pekne vypíše zoznam odporúčaní (max 5, aby hláška nebola dlhá). */
const suggest = (options: string[]) => {
  const shown = options.filter(Boolean).slice(0, 5);
  const rest = options.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} a ďalšie` : shown.join(", ");
};

/** Vráti chybovú hlášku, ak je kombinácia neplatná, inak null. */
export const validateVersionCombination = ({
  version,
  software,
  proxy,
  platform,
}: CompatibilityInput): string | null => {
  if (!version || !isNextGenVersion(version)) return null;

  const badPlatform = platform.filter(
    (p) => !getAvailablePlatforms(version).includes(p)
  );
  if (badPlatform.length) {
    return `Platforma ${badPlatform.join(", ")} sa nedá použiť s verziou ${version} — táto verzia zatiaľ vyšla len pre Java Edition. Zruš výber ${badPlatform.join(", ")} a nechaj označenú iba Java, alebo zvoľ staršiu verziu (napr. 1.21.x), ktorá Bedrock podporuje.`;
  }

  if (software && !getAvailableSoftware(version).includes(software)) {
    return `Software ${software} zatiaľ nemá build pre verziu ${version}, preto by server nenaštartoval. Vyber niektorý z podporovaných: ${suggest(
      getAvailableSoftware(version)
    )} — alebo zmeň verziu na staršiu, kde ${software} funguje.`;
  }

  if (proxy && !getAvailableProxies(version).includes(proxy)) {
    return `Proxy ${proxy} nepodporuje verziu ${version} (staršie proxy ako BungeeCord/Waterfall nemajú protokol pre 26.x). Použi ${suggest(
      getAvailableProxies(version).filter((p) => p !== "Žiadny")
    )}, alebo nastav proxy na „Žiadny“.`;
  }

  return null;
};

/** Očistí výbery, ktoré k danej verzii nepasujú. */
export const sanitizeForVersion = (input: CompatibilityInput) => ({
  platform: input.platform.filter((p) =>
    getAvailablePlatforms(input.version).includes(p)
  ),
  software: getAvailableSoftware(input.version).includes(input.software)
    ? input.software
    : "",
  proxy: getAvailableProxies(input.version).includes(input.proxy)
    ? input.proxy
    : "",
});

/** Overí, že verzia je jedna z podporovaných hodnôt zo zoznamu. */
export const isKnownVersion = (version?: string | null): boolean => {
  const v = (version ?? "").trim().replace(/^v/i, "");
  return !!v && versions.includes(v);
};

/** Validácia povinnej verzie vo formulári. */
export const validateVersionSelection = (version?: string | null): string | null => {
  if (!(version ?? "").trim())
    return `Vyber verziu Minecraftu — bez nej sa server neuloží. Najnovšie dostupné sú ${suggest(
      versions.slice(0, 4)
    )}.`;
  if (!isKnownVersion(version))
    return `Verzia „${version}“ nie je v zozname podporovaných verzií. Vyber jednu z ponuky, napr. ${suggest(
      versions.slice(0, 4)
    )}.`;
  return null;
};
