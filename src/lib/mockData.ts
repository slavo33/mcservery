export interface MinecraftServer {
  id: string;
  name: string;
  description: string;
  ip: string;
  image: string;
  players: { online: number; max: number };
  version: string;
  platform: ("java" | "bedrock")[];
  proxy?: string;
  software: string;
  minigames: string[];
  likes: number;
  tags: string[];
  isOnline: boolean;
}

export const mockServers: MinecraftServer[] = [
  {
    id: "1",
    name: "CraftLegends",
    description: "Najväčší slovenský survival server s custom enchantmi, quest systémom a priateľskou komunitou. Pripoj sa k nám!",
    ip: "play.craftlegends.sk",
    image: "",
    players: { online: 342, max: 500 },
    version: "1.20.4",
    platform: ["java"],
    proxy: "Velocity",
    software: "Paper",
    minigames: ["SkyWars", "BedWars", "Survival"],
    likes: 1247,
    tags: ["Survival", "PvP", "Economy"],
    isOnline: true,
  },
  {
    id: "2",
    name: "NetherRealm",
    description: "Hardcore PvP server s custom mapami a turnajovým systémom. Každý týždeň nové eventy a odmeny.",
    ip: "mc.netherrealm.eu",
    image: "",
    players: { online: 189, max: 300 },
    version: "1.21",
    platform: ["java", "bedrock"],
    proxy: "BungeeCord",
    software: "Purpur",
    minigames: ["KitPvP", "Duels", "UHC"],
    likes: 893,
    tags: ["PvP", "Hardcore", "Events"],
    isOnline: true,
  },
  {
    id: "3",
    name: "PixelWorld",
    description: "Kreatívny server s plotmi, WorldEdit prístupom a build súťažami. Ukáž svoju kreativitu!",
    ip: "pixel.world.cz",
    image: "",
    players: { online: 56, max: 200 },
    version: "1.20.2",
    platform: ["java"],
    software: "Spigot",
    minigames: ["BuildBattle", "Creative"],
    likes: 456,
    tags: ["Creative", "Building", "Plots"],
    isOnline: true,
  },
  {
    id: "4",
    name: "SkyNetwork",
    description: "SkyBlock server s vlastným ostrovným systémom, shopom a rebríčkami. Staň sa najlepším!",
    ip: "sky.network.sk",
    image: "",
    players: { online: 0, max: 150 },
    version: "1.19.4",
    platform: ["java"],
    proxy: "Velocity",
    software: "Paper",
    minigames: ["SkyBlock", "SkyWars"],
    likes: 312,
    tags: ["SkyBlock", "Economy", "Islands"],
    isOnline: false,
  },
  {
    id: "5",
    name: "CrossPlay CZ",
    description: "Multiplatformový server pre Java aj Bedrock hráčov. Survival, minihy a veľa zábavy!",
    ip: "cross.play.cz",
    image: "",
    players: { online: 98, max: 250 },
    version: "1.20.4",
    platform: ["java", "bedrock"],
    proxy: "Velocity",
    software: "Paper",
    minigames: ["Survival", "BedWars", "Parkour"],
    likes: 734,
    tags: ["Crossplay", "Survival", "Minigames"],
    isOnline: true,
  },
  {
    id: "6",
    name: "VanillaCraft",
    description: "Čistý vanilla zážitok bez zbytočných pluginov. Pre skutočných Minecraft fajnšmekrov.",
    ip: "vanilla.craft.sk",
    image: "",
    players: { online: 23, max: 50 },
    version: "1.21",
    platform: ["java"],
    software: "Bukkit",
    minigames: ["Vanilla Survival"],
    likes: 189,
    tags: ["Vanilla", "Survival", "Community"],
    isOnline: true,
  },
];

export const versions = ["1.21", "1.20.4", "1.20.2", "1.19.4", "1.18.2"];
export const platforms = ["Java", "Bedrock"];
export const proxies = ["BungeeCord", "Velocity", "Žiadny"];
export const softwareOptions = ["Paper", "Spigot", "Purpur", "Bukkit", "Forge", "Fabric"];
export const minigameOptions = ["Survival", "SkyWars", "BedWars", "KitPvP", "Creative", "Parkour", "UHC", "SkyBlock", "Duels", "BuildBattle"];
