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

export const versions = [
  "26.1.2", "26.1.1", "26.1",
  "1.21.11", "1.21.10", "1.21.9", "1.21.8", "1.21.7", "1.21.6",
  "1.21.5", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21",
  "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20",
  "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19",
  "1.18.2", "1.18.1", "1.18",
  "1.17.1", "1.17",
  "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.16",
  "1.15.2", "1.15.1", "1.15",
  "1.14.4", "1.14.3", "1.14.2", "1.14.1", "1.14",
  "1.13.2", "1.13.1", "1.13",
  "1.12.2", "1.12.1", "1.12",
  "1.11.2", "1.11.1", "1.11",
  "1.10.2", "1.10.1", "1.10",
  "1.9.4", "1.9.2", "1.9",
  "1.8.9", "1.8.8", "1.8",
  "1.7.10", "1.7.5", "1.7.2",
  "1.6.4", "1.6.2",
  "1.5.2", "1.5.1",
  "1.4.7", "1.4.6",
  "1.3.2", "1.2.5",
];

export const platforms = ["Java", "Bedrock"];

export const softwareOptions = [
  // Vanilla & Bukkit
  "Vanilla", "CraftBukkit", "Bukkit", "Spigot", "Paper", "Purpur", "Pufferfish", "Folia",
  // Forge
  "Forge", "NeoForge", "Magma", "Mohist", "CatServer", "Arclight",
  // Fabric
  "Fabric", "Quilt",
  // Sponge
  "SpongeVanilla", "SpongeForge",
  // Bedrock
  "Bedrock Dedicated Server", "PocketMine-MP", "Nukkit", "PowerNukkitX",
  // Hybrid
  "Glowstone",
];

export const proxyOptions = [
  "Žiadny",
  "BungeeCord",
  "Waterfall",
  "Velocity",
  "Gate",
  "Infrared",
  "Travertine",
  "FlameCord",
  "HexaCord",
  "NullCordX",
  "Aegis",
  "Geyser (Standalone)",
];

export const minigameOptions = [
  "Survival", "SkyWars", "BedWars", "EggWars", "KitPvP", "Creative", "Parkour",
  "UHC", "SkyBlock", "Duels", "BuildBattle", "Party Games", "Pillars of Fortune",
  "Murder Mystery", "TNT Run", "TNT Tag", "Hide and Seek", "Capture the Flag",
  "Hunger Games", "Factions", "Prison", "Towny", "RPG", "Anarchy",
  "OneBlock", "AcidIsland", "Lucky Block", "Bridge", "TheBridge",
  "Cops and Robbers", "Spleef", "Wool Wars", "Blitz Survival Games",
  "Mega Walls", "Warlords", "Speed UHC", "The Pit", "Zombies",
  "Build Battle Pro", "Draw It", "Pixel Painters", "Arena Brawl",
  "Quake Craft", "VampireZ", "Smash Heroes", "Turbo Kart Racers",
  "Dropper", "MineStrike", "Races", "Skyfall", "Economy", "Vanilla Survival",
];
