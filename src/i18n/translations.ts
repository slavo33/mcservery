export type Locale = "sk" | "cs" | "en" | "de" | "fr" | "ru" | "uk" | "es" | "pt" | "br" | "zh" | "ja";

export const localeNames: Record<Locale, string> = {
  sk: "🇸🇰 Slovenčina",
  cs: "🇨🇿 Čeština",
  en: "🇬🇧 English",
  de: "🇩🇪 Deutsch",
  fr: "🇫🇷 Français",
  ru: "🇷🇺 Русский",
  uk: "🇺🇦 Українська",
  es: "🇪🇸 Español",
  pt: "🇵🇹 Português",
  br: "🇧🇷 Brasileiro",
  zh: "🇨🇳 中文",
  ja: "🇯🇵 日本語",
};

export const localeFlags: Record<Locale, string> = {
  sk: "🇸🇰", cs: "🇨🇿", en: "🇬🇧", de: "🇩🇪", fr: "🇫🇷", ru: "🇷🇺",
  uk: "🇺🇦", es: "🇪🇸", pt: "🇵🇹", br: "🇧🇷", zh: "🇨🇳", ja: "🇯🇵",
};

type TranslationKeys = {
  // Nav
  nav_home: string;
  nav_servers: string;
  nav_add_server: string;
  nav_login: string;
  nav_profile: string;
  nav_logout: string;
  // Hero
  hero_title_1: string;
  hero_title_2: string;
  hero_subtitle: string;
  hero_browse: string;
  hero_add: string;
  stat_servers: string;
  stat_players: string;
  stat_online: string;
  // Servers page
  servers_title_1: string;
  servers_title_2: string;
  servers_subtitle: string;
  servers_none: string;
  servers_none_hint: string;
  // Filters
  filter_search_placeholder: string;
  filter_platform: string;
  filter_version: string;
  filter_software: string;
  filter_all: string;
  // Server detail
  detail_back: string;
  detail_added_by: string;
  detail_minigames: string;
  detail_copy: string;
  detail_copied: string;
  detail_warez: string;
  detail_original: string;
  detail_whitelist: string;
  detail_no_whitelist: string;
  detail_view_profile: string;
  detail_not_found: string;
  detail_delete_confirm: string;
  detail_delete_error: string;
  detail_delete_success: string;
  detail_edit_server: string;
  detail_delete_server: string;
  // Add server
  add_title_1: string;
  add_title_2: string;
  add_subtitle: string;
  add_name: string;
  add_ip: string;
  add_desc: string;
  add_platform: string;
  add_version: string;
  add_software: string;
  add_proxy: string;
  add_proxy_none: string;
  add_minigames: string;
  add_photos: string;
  add_photos_hint: string;
  add_photos_formats: string;
  add_submit: string;
  add_submitting: string;
  add_login_required: string;
  add_login_btn: string;
  add_warez: string;
  add_warez_desc: string;
  add_whitelist: string;
  add_whitelist_desc: string;
  add_links: string;
  add_discord: string;
  add_website: string;
  add_instagram: string;
  add_tiktok: string;
  add_youtube: string;
  add_twitter: string;
  // Auth
  auth_login: string;
  auth_register: string;
  auth_login_title: string;
  auth_register_title: string;
  auth_login_subtitle: string;
  auth_register_subtitle: string;
  auth_nickname: string;
  auth_email: string;
  auth_password: string;
  auth_submit_login: string;
  auth_submit_register: string;
  auth_no_account: string;
  auth_has_account: string;
  auth_switch_register: string;
  auth_switch_login: string;
  auth_login_success: string;
  auth_register_success: string;
  auth_nickname_required: string;
  // Profile
  profile_title_1: string;
  profile_title_2: string;
  profile_nickname: string;
  profile_email: string;
  profile_save: string;
  profile_saving: string;
  profile_avatar_hint: string;
  profile_uploading: string;
  profile_bio: string;
  profile_bio_placeholder: string;
  profile_nickname_empty: string;
  profile_save_error: string;
  profile_save_success: string;
  profile_avatar_too_large: string;
  profile_avatar_error: string;
  profile_avatar_success: string;
  // User profile
  user_profile_back: string;
  user_profile_not_found: string;
  user_profile_member_since: string;
  user_profile_servers: string;
  user_profile_no_servers: string;
  // Comments
  comments_title: string;
  comments_placeholder: string;
  comments_login_required: string;
  comments_login_hint: string;
  comments_none: string;
  comments_error: string;
  comments_deleted: string;
  comments_player: string;
  // Footer
  footer_desc: string;
  footer_nav: string;
  footer_legal: string;
  footer_terms: string;
  footer_privacy: string;
  footer_copyright: string;
  // Settings
  settings_language: string;
  // Favorites & My servers
  profile_tab_settings: string;
  profile_tab_favorites: string;
  profile_tab_my_servers: string;
  profile_favorites_empty: string;
  profile_my_servers_empty: string;
  // Featured
  featured_title: string;
  featured_pin: string;
  featured_unpin: string;
  featured_pinned: string;
  featured_unpinned: string;
  // Common
  loading: string;
  online: string;
  offline: string;
  players_online: string;
};

const sk: TranslationKeys = {
  nav_home: "Domov",
  nav_servers: "Servery",
  nav_add_server: "Pridať server",
  nav_login: "Prihlásiť sa",
  nav_profile: "Môj profil",
  nav_logout: "Odhlásiť sa",
  hero_title_1: "Nájdi svoj",
  hero_title_2: "Minecraft",
  hero_subtitle: "Objavuj stovky serverov, zdieľaj ten svoj a pripoj sa ku komunite hráčov.",
  hero_browse: "Prehľadať servery",
  hero_add: "Pridať server",
  stat_servers: "Serverov",
  stat_players: "Hráčov",
  stat_online: "Online",
  servers_title_1: "Všetky",
  servers_title_2: "servery",
  servers_subtitle: "Prehľadaj a filtruj Minecraft servery",
  servers_none: "Žiadne servery nenájdené",
  servers_none_hint: "Skús zmeniť filtre alebo hľadaný výraz",
  filter_search_placeholder: "Hľadaj server podľa názvu alebo IP...",
  filter_platform: "Platforma",
  filter_version: "Verzia",
  filter_software: "Software",
  filter_all: "Všetky",
  detail_back: "Späť na servery",
  detail_added_by: "Pridané:",
  detail_minigames: "Minihry",
  detail_copy: "Kopírovať",
  detail_copied: "Skopírované!",
  detail_warez: "Warez",
  detail_original: "Originál",
  detail_whitelist: "Whitelist",
  detail_no_whitelist: "Bez whitelistu",
  detail_view_profile: "Zobraziť profil →",
  detail_not_found: "Server nenájdený",
  detail_delete_confirm: "Naozaj chceš zmazať tento server?",
  detail_delete_error: "Chyba pri mazaní servera",
  detail_delete_success: "Server bol zmazaný",
  detail_edit_server: "Upraviť server",
  detail_delete_server: "Zmazať server",
  add_title_1: "Pridať",
  add_title_2: "server",
  add_subtitle: "Zdieľaj svoj Minecraft server s komunitou",
  add_name: "Názov servera",
  add_ip: "IP adresa",
  add_desc: "Popis",
  add_platform: "Platforma",
  add_version: "Verzia",
  add_software: "Software",
  add_proxy: "Proxy",
  add_proxy_none: "Žiadny",
  add_minigames: "Minihry",
  add_photos: "Fotky / GIF",
  add_photos_hint: "Nahraj fotky alebo GIF zo servera",
  add_photos_formats: "PNG, JPG, GIF do 5MB",
  add_submit: "Pridať server",
  add_submitting: "Pridávam...",
  add_login_required: "Na pridanie servera sa musíš prihlásiť",
  add_login_btn: "Prihlásiť sa",
  add_warez: "Warez povolený",
  add_warez_desc: "Server podporuje nelegálne kópie hry",
  add_whitelist: "Whitelist",
  add_whitelist_desc: "Hráči potrebujú schválenie pred pripojením",
  add_links: "Odkazy a sociálne siete",
  add_discord: "Discord",
  add_website: "Webstránka",
  add_instagram: "Instagram",
  add_tiktok: "TikTok",
  add_youtube: "YouTube",
  add_twitter: "Twitter / X",
  auth_login: "Prihlásiť sa",
  auth_register: "Registrovať sa",
  auth_login_title: "Prihlásenie",
  auth_register_title: "Registrácia",
  auth_login_subtitle: "Vitaj späť, hráč!",
  auth_register_subtitle: "Vytvor si účet a zdieľaj servery",
  auth_nickname: "Prezývka",
  auth_email: "Email",
  auth_password: "Heslo",
  auth_submit_login: "Prihlásiť sa",
  auth_submit_register: "Vytvoriť účet",
  auth_no_account: "Nemáš účet?",
  auth_has_account: "Už máš účet?",
  auth_switch_register: "Zaregistruj sa",
  auth_switch_login: "Prihlás sa",
  auth_login_success: "Úspešne prihlásený!",
  auth_register_success: "Registrácia úspešná! Skontroluj email na potvrdenie.",
  auth_nickname_required: "Zadaj prezývku",
  profile_title_1: "Môj",
  profile_title_2: "profil",
  profile_nickname: "Prezývka",
  profile_email: "Email",
  profile_save: "Uložiť zmeny",
  profile_saving: "Ukladám...",
  profile_avatar_hint: "Klikni na zmenu avataru",
  profile_uploading: "Nahrávam...",
  profile_bio: "Bio",
  profile_bio_placeholder: "Napíš niečo o sebe...",
  profile_nickname_empty: "Prezývka nemôže byť prázdna",
  profile_save_error: "Chyba pri ukladaní",
  profile_save_success: "Profil uložený!",
  profile_avatar_too_large: "Obrázok je príliš veľký (max 2MB)",
  profile_avatar_error: "Chyba pri nahrávaní",
  profile_avatar_success: "Avatar nahraný!",
  user_profile_back: "Späť na servery",
  user_profile_not_found: "Profil nenájdený",
  user_profile_member_since: "Člen od",
  user_profile_servers: "Servery",
  user_profile_no_servers: "Tento hráč zatiaľ nepridal žiadne servery.",
  comments_title: "Komentáre",
  comments_placeholder: "Napíš komentár...",
  comments_login_required: "Musíš sa prihlásiť na komentovanie",
  comments_login_hint: "Prihlás sa pre komentovanie",
  comments_none: "Žiadne komentáre. Buď prvý!",
  comments_error: "Chyba pri pridávaní komentára",
  comments_deleted: "Komentár vymazaný",
  comments_player: "Hráč",
  footer_desc: "Najväčší katalóg Minecraft serverov. Nájdi svoj ideálny server alebo zdieľaj ten svoj.",
  footer_nav: "Navigácia",
  footer_legal: "Právne",
  footer_terms: "Podmienky používania",
  footer_privacy: "Ochrana súkromia",
  footer_copyright: "MCServery. Všetky práva vyhradené. Nie sme spojení s Mojang Studios.",
  settings_language: "Jazyk",
  profile_tab_settings: "Nastavenia",
  profile_tab_favorites: "Obľúbené",
  profile_tab_my_servers: "Moje servery",
  profile_favorites_empty: "Zatiaľ si nedal like žiadnemu serveru.",
  profile_my_servers_empty: "Zatiaľ si nepridal žiadny server.",
  featured_title: "Odporúčame",
  featured_pin: "Pripnúť do odporúčaných",
  featured_unpin: "Odopnúť z odporúčaných",
  featured_pinned: "Server pripnutý!",
  featured_unpinned: "Server odopnutý!",
  loading: "Načítavam...",
  online: "Online",
  offline: "Offline",
  players_online: "hráčov online",
};

const cs: TranslationKeys = {
  ...sk,
  nav_home: "Domů",
  nav_add_server: "Přidat server",
  nav_login: "Přihlásit se",
  nav_profile: "Můj profil",
  nav_logout: "Odhlásit se",
  hero_title_1: "Najdi svůj",
  hero_subtitle: "Objevuj stovky serverů, sdílej ten svůj a připoj se ke komunitě hráčů.",
  hero_browse: "Procházet servery",
  hero_add: "Přidat server",
  stat_servers: "Serverů",
  stat_players: "Hráčů",
  servers_title_1: "Všechny",
  servers_subtitle: "Procházej a filtruj Minecraft servery",
  servers_none: "Žádné servery nenalezeny",
  servers_none_hint: "Zkus změnit filtry nebo hledaný výraz",
  filter_search_placeholder: "Hledej server podle názvu nebo IP...",
  filter_platform: "Platforma",
  filter_version: "Verze",
  filter_software: "Software",
  filter_all: "Všechny",
  detail_back: "Zpět na servery",
  detail_added_by: "Přidal:",
  detail_copy: "Kopírovat",
  detail_copied: "Zkopírováno!",
  detail_no_whitelist: "Bez whitelistu",
  detail_view_profile: "Zobrazit profil →",
  detail_not_found: "Server nenalezen",
  detail_delete_confirm: "Opravdu chceš smazat tento server?",
  detail_delete_error: "Chyba při mazání serveru",
  detail_delete_success: "Server byl smazán",
  detail_edit_server: "Upravit server",
  detail_delete_server: "Smazat server",
  add_title_1: "Přidat",
  add_subtitle: "Sdílej svůj Minecraft server s komunitou",
  add_name: "Název serveru",
  add_desc: "Popis",
  add_version: "Verze",
  add_proxy_none: "Žádný",
  add_photos_hint: "Nahraj fotky nebo GIF ze serveru",
  add_submit: "Přidat server",
  add_submitting: "Přidávám...",
  add_login_required: "Pro přidání serveru se musíš přihlásit",
  add_login_btn: "Přihlásit se",
  add_warez: "Warez povolen",
  add_warez_desc: "Server podporuje nelegální kopie hry",
  add_whitelist_desc: "Hráči potřebují schválení před připojením",
  add_links: "Odkazy a sociální sítě",
  add_website: "Webstránka",
  auth_login: "Přihlásit se",
  auth_register: "Registrovat se",
  auth_login_title: "Přihlášení",
  auth_register_title: "Registrace",
  auth_login_subtitle: "Vítej zpět, hráči!",
  auth_register_subtitle: "Vytvoř si účet a sdílej servery",
  auth_nickname: "Přezdívka",
  auth_submit_login: "Přihlásit se",
  auth_submit_register: "Vytvořit účet",
  auth_no_account: "Nemáš účet?",
  auth_has_account: "Už máš účet?",
  auth_switch_register: "Zaregistruj se",
  auth_switch_login: "Přihlas se",
  auth_login_success: "Úspěšně přihlášen!",
  auth_register_success: "Registrace úspěšná! Zkontroluj email pro potvrzení.",
  auth_nickname_required: "Zadej přezdívku",
  profile_title_1: "Můj",
  profile_nickname: "Přezdívka",
  profile_save: "Uložit změny",
  profile_saving: "Ukládám...",
  profile_avatar_hint: "Klikni pro změnu avataru",
  profile_uploading: "Nahrávám...",
  profile_bio_placeholder: "Napiš něco o sobě...",
  profile_nickname_empty: "Přezdívka nemůže být prázdná",
  profile_save_error: "Chyba při ukládání",
  profile_save_success: "Profil uložen!",
  profile_avatar_too_large: "Obrázek je příliš velký (max 2MB)",
  profile_avatar_error: "Chyba při nahrávání",
  profile_avatar_success: "Avatar nahrán!",
  user_profile_back: "Zpět na servery",
  user_profile_not_found: "Profil nenalezen",
  user_profile_member_since: "Člen od",
  user_profile_no_servers: "Tento hráč zatím nepřidal žádné servery.",
  comments_title: "Komentáře",
  comments_placeholder: "Napiš komentář...",
  comments_login_required: "Musíš se přihlásit pro komentování",
  comments_login_hint: "Přihlas se pro komentování",
  comments_none: "Žádné komentáře. Buď první!",
  comments_error: "Chyba při přidávání komentáře",
  comments_deleted: "Komentář smazán",
  comments_player: "Hráč",
  footer_desc: "Největší katalog Minecraft serverů. Najdi svůj ideální server nebo sdílej ten svůj.",
  footer_nav: "Navigace",
  footer_legal: "Právní",
  footer_terms: "Podmínky používání",
  footer_privacy: "Ochrana soukromí",
  footer_copyright: "MCServery. Všechna práva vyhrazena. Nejsme spojeni s Mojang Studios.",
  loading: "Načítám...",
  players_online: "hráčů online",
  featured_title: "Doporučujeme",
  featured_pin: "Připnout do doporučených",
  featured_unpin: "Odepnout z doporučených",
  featured_pinned: "Server připnut!",
  featured_unpinned: "Server odepnut!",
};

const en: TranslationKeys = {
  nav_home: "Home",
  nav_servers: "Servers",
  nav_add_server: "Add Server",
  nav_login: "Sign In",
  nav_profile: "My Profile",
  nav_logout: "Sign Out",
  hero_title_1: "Find your",
  hero_title_2: "Minecraft",
  hero_subtitle: "Discover hundreds of servers, share yours and join the community of players.",
  hero_browse: "Browse Servers",
  hero_add: "Add Server",
  stat_servers: "Servers",
  stat_players: "Players",
  stat_online: "Online",
  servers_title_1: "All",
  servers_title_2: "servers",
  servers_subtitle: "Browse and filter Minecraft servers",
  servers_none: "No servers found",
  servers_none_hint: "Try changing the filters or search term",
  filter_search_placeholder: "Search server by name or IP...",
  filter_platform: "Platform",
  filter_version: "Version",
  filter_software: "Software",
  filter_all: "All",
  detail_back: "Back to servers",
  detail_added_by: "Added by:",
  detail_minigames: "Minigames",
  detail_copy: "Copy",
  detail_copied: "Copied!",
  detail_warez: "Warez",
  detail_original: "Original",
  detail_whitelist: "Whitelist",
  detail_no_whitelist: "No whitelist",
  detail_view_profile: "View profile →",
  detail_not_found: "Server not found",
  detail_delete_confirm: "Are you sure you want to delete this server?",
  detail_delete_error: "Error deleting server",
  detail_delete_success: "Server deleted",
  detail_edit_server: "Edit server",
  detail_delete_server: "Delete server",
  add_title_1: "Add",
  add_title_2: "server",
  add_subtitle: "Share your Minecraft server with the community",
  add_name: "Server name",
  add_ip: "IP address",
  add_desc: "Description",
  add_platform: "Platform",
  add_version: "Version",
  add_software: "Software",
  add_proxy: "Proxy",
  add_proxy_none: "None",
  add_minigames: "Minigames",
  add_photos: "Photos / GIF",
  add_photos_hint: "Upload photos or GIFs from your server",
  add_photos_formats: "PNG, JPG, GIF up to 5MB",
  add_submit: "Add server",
  add_submitting: "Adding...",
  add_login_required: "You need to sign in to add a server",
  add_login_btn: "Sign In",
  add_warez: "Warez allowed",
  add_warez_desc: "Server supports cracked game copies",
  add_whitelist: "Whitelist",
  add_whitelist_desc: "Players need approval before joining",
  add_links: "Links & social media",
  add_discord: "Discord",
  add_website: "Website",
  add_instagram: "Instagram",
  add_tiktok: "TikTok",
  add_youtube: "YouTube",
  add_twitter: "Twitter / X",
  auth_login: "Sign In",
  auth_register: "Sign Up",
  auth_login_title: "Sign In",
  auth_register_title: "Sign Up",
  auth_login_subtitle: "Welcome back, player!",
  auth_register_subtitle: "Create an account and share servers",
  auth_nickname: "Nickname",
  auth_email: "Email",
  auth_password: "Password",
  auth_submit_login: "Sign In",
  auth_submit_register: "Create Account",
  auth_no_account: "Don't have an account?",
  auth_has_account: "Already have an account?",
  auth_switch_register: "Sign Up",
  auth_switch_login: "Sign In",
  auth_login_success: "Successfully signed in!",
  auth_register_success: "Registration successful! Check your email to confirm.",
  auth_nickname_required: "Enter a nickname",
  profile_title_1: "My",
  profile_title_2: "profile",
  profile_nickname: "Nickname",
  profile_email: "Email",
  profile_save: "Save changes",
  profile_saving: "Saving...",
  profile_avatar_hint: "Click to change avatar",
  profile_uploading: "Uploading...",
  profile_bio: "Bio",
  profile_bio_placeholder: "Write something about yourself...",
  profile_nickname_empty: "Nickname cannot be empty",
  profile_save_error: "Error saving profile",
  profile_save_success: "Profile saved!",
  profile_avatar_too_large: "Image is too large (max 2MB)",
  profile_avatar_error: "Error uploading avatar",
  profile_avatar_success: "Avatar uploaded!",
  user_profile_back: "Back to servers",
  user_profile_not_found: "Profile not found",
  user_profile_member_since: "Member since",
  user_profile_servers: "Servers",
  user_profile_no_servers: "This player hasn't added any servers yet.",
  comments_title: "Comments",
  comments_placeholder: "Write a comment...",
  comments_login_required: "You need to sign in to comment",
  comments_login_hint: "Sign in to comment",
  comments_none: "No comments yet. Be the first!",
  comments_error: "Error adding comment",
  comments_deleted: "Comment deleted",
  comments_player: "Player",
  footer_desc: "The largest Minecraft server catalog. Find your ideal server or share yours.",
  footer_nav: "Navigation",
  footer_legal: "Legal",
  footer_terms: "Terms of Service",
  footer_privacy: "Privacy Policy",
  footer_copyright: "MCServery. All rights reserved. Not affiliated with Mojang Studios.",
  settings_language: "Language",
  profile_tab_settings: "Settings",
  profile_tab_favorites: "Favorites",
  profile_tab_my_servers: "My Servers",
  profile_favorites_empty: "You haven't liked any servers yet.",
  profile_my_servers_empty: "You haven't added any servers yet.",
  featured_title: "We Recommend",
  featured_pin: "Pin to featured",
  featured_unpin: "Unpin from featured",
  featured_pinned: "Server pinned!",
  featured_unpinned: "Server unpinned!",
  loading: "Loading...",
  online: "Online",
  offline: "Offline",
  players_online: "players online",
};

const de: TranslationKeys = {
  ...en,
  nav_home: "Startseite",
  nav_servers: "Server",
  nav_add_server: "Server hinzufügen",
  nav_login: "Anmelden",
  nav_profile: "Mein Profil",
  nav_logout: "Abmelden",
  hero_title_1: "Finde deinen",
  hero_subtitle: "Entdecke Hunderte von Servern, teile deinen und werde Teil der Spielergemeinschaft.",
  hero_browse: "Server durchsuchen",
  hero_add: "Server hinzufügen",
  stat_servers: "Server",
  stat_players: "Spieler",
  servers_title_1: "Alle",
  servers_title_2: "Server",
  servers_subtitle: "Durchsuche und filtere Minecraft-Server",
  servers_none: "Keine Server gefunden",
  servers_none_hint: "Versuche die Filter oder den Suchbegriff zu ändern",
  filter_search_placeholder: "Server nach Name oder IP suchen...",
  filter_platform: "Plattform",
  filter_version: "Version",
  filter_all: "Alle",
  detail_back: "Zurück zu Servern",
  detail_added_by: "Hinzugefügt von:",
  detail_minigames: "Minispiele",
  detail_copy: "Kopieren",
  detail_copied: "Kopiert!",
  detail_no_whitelist: "Keine Whitelist",
  detail_view_profile: "Profil ansehen →",
  detail_not_found: "Server nicht gefunden",
  detail_delete_confirm: "Möchtest du diesen Server wirklich löschen?",
  detail_delete_error: "Fehler beim Löschen",
  detail_delete_success: "Server gelöscht",
  detail_edit_server: "Server bearbeiten",
  detail_delete_server: "Server löschen",
  add_title_1: "Server",
  add_title_2: "hinzufügen",
  add_subtitle: "Teile deinen Minecraft-Server mit der Community",
  add_name: "Servername",
  add_ip: "IP-Adresse",
  add_desc: "Beschreibung",
  add_platform: "Plattform",
  add_proxy_none: "Keiner",
  add_minigames: "Minispiele",
  add_photos_hint: "Lade Fotos oder GIFs von deinem Server hoch",
  add_photos_formats: "PNG, JPG, GIF bis 5MB",
  add_submit: "Server hinzufügen",
  add_submitting: "Wird hinzugefügt...",
  add_login_required: "Du musst dich anmelden, um einen Server hinzuzufügen",
  add_login_btn: "Anmelden",
  add_warez: "Warez erlaubt",
  add_warez_desc: "Server unterstützt illegale Spielkopien",
  add_whitelist_desc: "Spieler brauchen Genehmigung vor dem Beitritt",
  add_links: "Links & soziale Medien",
  add_website: "Webseite",
  auth_login: "Anmelden",
  auth_register: "Registrieren",
  auth_login_title: "Anmeldung",
  auth_register_title: "Registrierung",
  auth_login_subtitle: "Willkommen zurück, Spieler!",
  auth_register_subtitle: "Erstelle ein Konto und teile Server",
  auth_nickname: "Spitzname",
  auth_email: "E-Mail",
  auth_password: "Passwort",
  auth_submit_login: "Anmelden",
  auth_submit_register: "Konto erstellen",
  auth_no_account: "Kein Konto?",
  auth_has_account: "Bereits ein Konto?",
  auth_switch_register: "Registrieren",
  auth_switch_login: "Anmelden",
  auth_login_success: "Erfolgreich angemeldet!",
  auth_register_success: "Registrierung erfolgreich! Überprüfe deine E-Mail.",
  auth_nickname_required: "Gib einen Spitznamen ein",
  profile_title_1: "Mein",
  profile_title_2: "Profil",
  profile_nickname: "Spitzname",
  profile_save: "Änderungen speichern",
  profile_saving: "Wird gespeichert...",
  profile_avatar_hint: "Klicke zum Ändern des Avatars",
  profile_uploading: "Wird hochgeladen...",
  profile_bio: "Bio",
  profile_bio_placeholder: "Schreib etwas über dich...",
  profile_nickname_empty: "Spitzname darf nicht leer sein",
  profile_save_error: "Fehler beim Speichern",
  profile_save_success: "Profil gespeichert!",
  profile_avatar_too_large: "Bild ist zu groß (max 2MB)",
  profile_avatar_error: "Fehler beim Hochladen",
  profile_avatar_success: "Avatar hochgeladen!",
  user_profile_back: "Zurück zu Servern",
  user_profile_not_found: "Profil nicht gefunden",
  user_profile_member_since: "Mitglied seit",
  user_profile_no_servers: "Dieser Spieler hat noch keine Server hinzugefügt.",
  comments_title: "Kommentare",
  comments_placeholder: "Kommentar schreiben...",
  comments_login_required: "Du musst dich anmelden, um zu kommentieren",
  comments_login_hint: "Melde dich an, um zu kommentieren",
  comments_none: "Keine Kommentare. Sei der Erste!",
  comments_error: "Fehler beim Hinzufügen des Kommentars",
  comments_deleted: "Kommentar gelöscht",
  comments_player: "Spieler",
  footer_desc: "Der größte Minecraft-Serverkatalog. Finde deinen idealen Server oder teile deinen.",
  footer_terms: "Nutzungsbedingungen",
  footer_privacy: "Datenschutz",
  footer_copyright: "MCServery. Alle Rechte vorbehalten. Nicht verbunden mit Mojang Studios.",
  settings_language: "Sprache",
  featured_title: "Wir empfehlen", featured_pin: "Anheften", featured_unpin: "Loslösen", featured_pinned: "Server angeheftet!", featured_unpinned: "Server losgelöst!",
  loading: "Laden...",
  players_online: "Spieler online",
};

const fr: TranslationKeys = {
  ...en,
  nav_home: "Accueil",
  nav_servers: "Serveurs",
  nav_add_server: "Ajouter un serveur",
  nav_login: "Se connecter",
  nav_profile: "Mon profil",
  nav_logout: "Se déconnecter",
  hero_title_1: "Trouve ton",
  hero_subtitle: "Découvre des centaines de serveurs, partage le tien et rejoins la communauté.",
  hero_browse: "Parcourir les serveurs",
  hero_add: "Ajouter un serveur",
  stat_servers: "Serveurs",
  stat_players: "Joueurs",
  stat_online: "En ligne",
  servers_title_1: "Tous les",
  servers_title_2: "serveurs",
  servers_subtitle: "Parcourir et filtrer les serveurs Minecraft",
  servers_none: "Aucun serveur trouvé",
  servers_none_hint: "Essaie de modifier les filtres ou le terme de recherche",
  filter_search_placeholder: "Rechercher par nom ou IP...",
  filter_platform: "Plateforme",
  filter_version: "Version",
  filter_software: "Logiciel",
  filter_all: "Tous",
  detail_back: "Retour aux serveurs",
  detail_added_by: "Ajouté par :",
  detail_minigames: "Mini-jeux",
  detail_copy: "Copier",
  detail_copied: "Copié !",
  detail_no_whitelist: "Sans whitelist",
  detail_view_profile: "Voir le profil →",
  detail_not_found: "Serveur introuvable",
  detail_delete_confirm: "Veux-tu vraiment supprimer ce serveur ?",
  detail_delete_error: "Erreur lors de la suppression",
  detail_delete_success: "Serveur supprimé",
  detail_edit_server: "Modifier le serveur",
  detail_delete_server: "Supprimer le serveur",
  add_title_1: "Ajouter un",
  add_title_2: "serveur",
  add_subtitle: "Partage ton serveur Minecraft avec la communauté",
  add_name: "Nom du serveur",
  add_ip: "Adresse IP",
  add_desc: "Description",
  add_platform: "Plateforme",
  add_software: "Logiciel",
  add_proxy_none: "Aucun",
  add_minigames: "Mini-jeux",
  add_photos_hint: "Télécharge des photos ou GIFs de ton serveur",
  add_photos_formats: "PNG, JPG, GIF jusqu'à 5 Mo",
  add_submit: "Ajouter le serveur",
  add_submitting: "Ajout en cours...",
  add_login_required: "Tu dois te connecter pour ajouter un serveur",
  add_login_btn: "Se connecter",
  add_warez: "Warez autorisé",
  add_warez_desc: "Le serveur accepte les copies piratées",
  add_whitelist_desc: "Les joueurs doivent être approuvés avant de rejoindre",
  add_links: "Liens et réseaux sociaux",
  add_website: "Site web",
  auth_login: "Se connecter",
  auth_register: "S'inscrire",
  auth_login_title: "Connexion",
  auth_register_title: "Inscription",
  auth_login_subtitle: "Content de te revoir, joueur !",
  auth_register_subtitle: "Crée un compte et partage tes serveurs",
  auth_nickname: "Pseudo",
  auth_password: "Mot de passe",
  auth_submit_login: "Se connecter",
  auth_submit_register: "Créer un compte",
  auth_no_account: "Pas de compte ?",
  auth_has_account: "Déjà un compte ?",
  auth_switch_register: "Inscris-toi",
  auth_switch_login: "Connecte-toi",
  auth_login_success: "Connexion réussie !",
  auth_register_success: "Inscription réussie ! Vérifie ton email.",
  auth_nickname_required: "Entre un pseudo",
  profile_title_1: "Mon",
  profile_nickname: "Pseudo",
  profile_save: "Enregistrer",
  profile_saving: "Enregistrement...",
  profile_avatar_hint: "Clique pour changer l'avatar",
  profile_uploading: "Téléchargement...",
  profile_bio_placeholder: "Écris quelque chose sur toi...",
  profile_nickname_empty: "Le pseudo ne peut pas être vide",
  profile_save_error: "Erreur lors de l'enregistrement",
  profile_save_success: "Profil enregistré !",
  profile_avatar_too_large: "Image trop grande (max 2Mo)",
  profile_avatar_error: "Erreur de téléchargement",
  profile_avatar_success: "Avatar téléchargé !",
  user_profile_back: "Retour aux serveurs",
  user_profile_not_found: "Profil introuvable",
  user_profile_member_since: "Membre depuis",
  user_profile_no_servers: "Ce joueur n'a pas encore ajouté de serveurs.",
  comments_title: "Commentaires",
  comments_placeholder: "Écris un commentaire...",
  comments_login_required: "Tu dois te connecter pour commenter",
  comments_login_hint: "Connecte-toi pour commenter",
  comments_none: "Aucun commentaire. Sois le premier !",
  comments_error: "Erreur lors de l'ajout du commentaire",
  comments_deleted: "Commentaire supprimé",
  comments_player: "Joueur",
  footer_desc: "Le plus grand catalogue de serveurs Minecraft. Trouve ton serveur idéal ou partage le tien.",
  footer_legal: "Mentions légales",
  footer_terms: "Conditions d'utilisation",
  footer_privacy: "Politique de confidentialité",
  footer_copyright: "MCServery. Tous droits réservés. Non affilié à Mojang Studios.",
  settings_language: "Langue",
  featured_title: "Nous recommandons", featured_pin: "Épingler", featured_unpin: "Désépingler", featured_pinned: "Serveur épinglé !", featured_unpinned: "Serveur désépinglé !",
  loading: "Chargement...",
  online: "En ligne",
  offline: "Hors ligne",
  players_online: "joueurs en ligne",
};

const ru: TranslationKeys = {
  ...en,
  nav_home: "Главная", nav_servers: "Серверы", nav_add_server: "Добавить сервер", nav_login: "Войти", nav_profile: "Мой профиль", nav_logout: "Выйти",
  hero_title_1: "Найди свой", hero_subtitle: "Открывай сотни серверов, делись своим и присоединяйся к сообществу игроков.", hero_browse: "Обзор серверов", hero_add: "Добавить сервер",
  stat_servers: "Серверов", stat_players: "Игроков", stat_online: "Онлайн",
  servers_title_1: "Все", servers_title_2: "серверы", servers_subtitle: "Просматривайте и фильтруйте серверы Minecraft", servers_none: "Серверы не найдены", servers_none_hint: "Попробуйте изменить фильтры или поисковый запрос",
  filter_search_placeholder: "Поиск сервера по имени или IP...", filter_platform: "Платформа", filter_version: "Версия", filter_software: "ПО", filter_all: "Все",
  detail_back: "Назад к серверам", detail_added_by: "Добавил:", detail_minigames: "Мини-игры", detail_copy: "Копировать", detail_copied: "Скопировано!", detail_warez: "Пиратка", detail_original: "Лицензия", detail_whitelist: "Белый список", detail_no_whitelist: "Без белого списка",
  detail_view_profile: "Посмотреть профиль →", detail_not_found: "Сервер не найден", detail_delete_confirm: "Вы уверены, что хотите удалить этот сервер?", detail_delete_error: "Ошибка при удалении", detail_delete_success: "Сервер удалён", detail_edit_server: "Редактировать сервер", detail_delete_server: "Удалить сервер",
  add_title_1: "Добавить", add_title_2: "сервер", add_subtitle: "Поделитесь своим Minecraft сервером с сообществом", add_name: "Название сервера", add_ip: "IP адрес", add_desc: "Описание", add_platform: "Платформа", add_version: "Версия", add_software: "ПО", add_proxy: "Прокси", add_proxy_none: "Нет", add_minigames: "Мини-игры", add_photos: "Фото / GIF", add_photos_hint: "Загрузите фото или GIF с вашего сервера", add_photos_formats: "PNG, JPG, GIF до 5МБ", add_submit: "Добавить сервер", add_submitting: "Добавляю...", add_login_required: "Для добавления сервера нужно войти", add_login_btn: "Войти", add_warez: "Пиратка разрешена", add_warez_desc: "Сервер поддерживает нелицензионные копии", add_whitelist_desc: "Игрокам нужно одобрение для входа", add_links: "Ссылки и соцсети", add_website: "Сайт",
  auth_login: "Войти", auth_register: "Регистрация", auth_login_title: "Вход", auth_register_title: "Регистрация", auth_login_subtitle: "С возвращением, игрок!", auth_register_subtitle: "Создай аккаунт и делись серверами", auth_nickname: "Никнейм", auth_email: "Email", auth_password: "Пароль", auth_submit_login: "Войти", auth_submit_register: "Создать аккаунт", auth_no_account: "Нет аккаунта?", auth_has_account: "Уже есть аккаунт?", auth_switch_register: "Зарегистрируйся", auth_switch_login: "Войти", auth_login_success: "Успешный вход!", auth_register_success: "Регистрация успешна! Проверьте email.", auth_nickname_required: "Введите никнейм",
  profile_title_1: "Мой", profile_title_2: "профиль", profile_nickname: "Никнейм", profile_email: "Email", profile_save: "Сохранить", profile_saving: "Сохраняю...", profile_avatar_hint: "Нажмите для смены аватара", profile_uploading: "Загрузка...", profile_bio: "О себе", profile_bio_placeholder: "Напишите о себе...", profile_nickname_empty: "Никнейм не может быть пустым", profile_save_error: "Ошибка сохранения", profile_save_success: "Профиль сохранён!", profile_avatar_too_large: "Изображение слишком большое (макс 2МБ)", profile_avatar_error: "Ошибка загрузки", profile_avatar_success: "Аватар загружен!",
  user_profile_back: "Назад к серверам", user_profile_not_found: "Профиль не найден", user_profile_member_since: "Участник с", user_profile_servers: "Серверы", user_profile_no_servers: "Этот игрок пока не добавил серверов.",
  comments_title: "Комментарии", comments_placeholder: "Напишите комментарий...", comments_login_required: "Войдите, чтобы комментировать", comments_login_hint: "Войдите для комментирования", comments_none: "Нет комментариев. Будьте первым!", comments_error: "Ошибка добавления комментария", comments_deleted: "Комментарий удалён", comments_player: "Игрок",
  footer_desc: "Крупнейший каталог серверов Minecraft. Найди свой идеальный сервер или поделись своим.", footer_nav: "Навигация", footer_legal: "Правовая информация", footer_terms: "Условия использования", footer_privacy: "Политика конфиденциальности", footer_copyright: "MCServery. Все права защищены. Не связано с Mojang Studios.",
  settings_language: "Язык", featured_title: "Рекомендуем", featured_pin: "Закрепить", featured_unpin: "Открепить", featured_pinned: "Сервер закреплён!", featured_unpinned: "Сервер откреплён!",
  loading: "Загрузка...", online: "Онлайн", offline: "Офлайн", players_online: "игроков онлайн",
};

const uk: TranslationKeys = {
  ...en,
  nav_home: "Головна", nav_servers: "Сервери", nav_add_server: "Додати сервер", nav_login: "Увійти", nav_profile: "Мій профіль", nav_logout: "Вийти",
  hero_title_1: "Знайди свій", hero_subtitle: "Відкривай сотні серверів, ділись своїм та приєднуйся до спільноти гравців.", hero_browse: "Переглянути сервери", hero_add: "Додати сервер",
  stat_servers: "Серверів", stat_players: "Гравців", stat_online: "Онлайн",
  servers_title_1: "Усі", servers_title_2: "сервери", servers_subtitle: "Переглядай та фільтруй сервери Minecraft", servers_none: "Серверів не знайдено", servers_none_hint: "Спробуй змінити фільтри або пошуковий запит",
  filter_search_placeholder: "Пошук сервера за назвою або IP...", filter_platform: "Платформа", filter_version: "Версія", filter_software: "ПЗ", filter_all: "Усі",
  detail_back: "Назад до серверів", detail_added_by: "Додав:", detail_minigames: "Міні-ігри", detail_copy: "Копіювати", detail_copied: "Скопійовано!", detail_warez: "Пірат", detail_original: "Ліцензія", detail_whitelist: "Білий список", detail_no_whitelist: "Без білого списку",
  detail_view_profile: "Переглянути профіль →", detail_not_found: "Сервер не знайдено", detail_delete_confirm: "Ви впевнені, що хочете видалити цей сервер?", detail_delete_error: "Помилка видалення", detail_delete_success: "Сервер видалено", detail_edit_server: "Редагувати сервер", detail_delete_server: "Видалити сервер",
  add_title_1: "Додати", add_title_2: "сервер", add_subtitle: "Поділися своїм Minecraft сервером зі спільнотою", add_name: "Назва сервера", add_ip: "IP адреса", add_desc: "Опис", add_platform: "Платформа", add_version: "Версія", add_software: "ПЗ", add_proxy: "Проксі", add_proxy_none: "Немає", add_minigames: "Міні-ігри", add_photos: "Фото / GIF", add_photos_hint: "Завантаж фото або GIF з твого сервера", add_photos_formats: "PNG, JPG, GIF до 5МБ", add_submit: "Додати сервер", add_submitting: "Додаю...", add_login_required: "Для додавання сервера потрібно увійти", add_login_btn: "Увійти", add_warez: "Пірат дозволений", add_warez_desc: "Сервер підтримує неліцензійні копії", add_whitelist_desc: "Гравцям потрібен дозвіл для входу", add_links: "Посилання та соцмережі", add_website: "Сайт",
  auth_login: "Увійти", auth_register: "Зареєструватися", auth_login_title: "Вхід", auth_register_title: "Реєстрація", auth_login_subtitle: "З поверненням, гравцю!", auth_register_subtitle: "Створи обліковий запис та ділись серверами", auth_nickname: "Нікнейм", auth_email: "Email", auth_password: "Пароль", auth_submit_login: "Увійти", auth_submit_register: "Створити обліковий запис", auth_no_account: "Немає облікового запису?", auth_has_account: "Вже є обліковий запис?", auth_switch_register: "Зареєструйся", auth_switch_login: "Увійди", auth_login_success: "Успішний вхід!", auth_register_success: "Реєстрація успішна! Перевірте email.", auth_nickname_required: "Введіть нікнейм",
  profile_title_1: "Мій", profile_title_2: "профіль", profile_nickname: "Нікнейм", profile_email: "Email", profile_save: "Зберегти зміни", profile_saving: "Зберігаю...", profile_avatar_hint: "Натисни для зміни аватара", profile_uploading: "Завантаження...", profile_bio: "Про себе", profile_bio_placeholder: "Напишіть щось про себе...", profile_nickname_empty: "Нікнейм не може бути порожнім", profile_save_error: "Помилка збереження", profile_save_success: "Профіль збережено!", profile_avatar_too_large: "Зображення занадто велике (макс 2МБ)", profile_avatar_error: "Помилка завантаження", profile_avatar_success: "Аватар завантажено!",
  user_profile_back: "Назад до серверів", user_profile_not_found: "Профіль не знайдено", user_profile_member_since: "Учасник з", user_profile_servers: "Сервери", user_profile_no_servers: "Цей гравець ще не додав серверів.",
  comments_title: "Коментарі", comments_placeholder: "Напишіть коментар...", comments_login_required: "Увійдіть, щоб коментувати", comments_login_hint: "Увійдіть для коментування", comments_none: "Немає коментарів. Будьте першим!", comments_error: "Помилка додавання коментаря", comments_deleted: "Коментар видалено", comments_player: "Гравець",
  footer_desc: "Найбільший каталог серверів Minecraft. Знайди свій ідеальний сервер або поділись своїм.", footer_nav: "Навігація", footer_legal: "Правова інформація", footer_terms: "Умови використання", footer_privacy: "Політика конфіденційності", footer_copyright: "MCServery. Усі права захищені. Не пов'язано з Mojang Studios.",
  settings_language: "Мова", featured_title: "Рекомендуємо", featured_pin: "Закріпити", featured_unpin: "Відкріпити", featured_pinned: "Сервер закріплено!", featured_unpinned: "Сервер відкріплено!",
  loading: "Завантаження...", online: "Онлайн", offline: "Офлайн", players_online: "гравців онлайн",
};

const es: TranslationKeys = {
  ...en,
  nav_home: "Inicio", nav_servers: "Servidores", nav_add_server: "Añadir servidor", nav_login: "Iniciar sesión", nav_profile: "Mi perfil", nav_logout: "Cerrar sesión",
  hero_title_1: "Encuentra tu", hero_subtitle: "Descubre cientos de servidores, comparte el tuyo y únete a la comunidad.", hero_browse: "Explorar servidores", hero_add: "Añadir servidor",
  stat_servers: "Servidores", stat_players: "Jugadores", stat_online: "En línea",
  servers_title_1: "Todos los", servers_title_2: "servidores", servers_subtitle: "Busca y filtra servidores de Minecraft", servers_none: "No se encontraron servidores", servers_none_hint: "Intenta cambiar los filtros",
  filter_search_placeholder: "Buscar servidor por nombre o IP...", filter_platform: "Plataforma", filter_version: "Versión", filter_all: "Todos",
  detail_back: "Volver a servidores", detail_added_by: "Añadido por:", detail_minigames: "Minijuegos", detail_copy: "Copiar", detail_copied: "¡Copiado!", detail_no_whitelist: "Sin whitelist",
  detail_view_profile: "Ver perfil →", detail_not_found: "Servidor no encontrado", detail_delete_confirm: "¿Seguro que quieres eliminar este servidor?", detail_delete_error: "Error al eliminar", detail_delete_success: "Servidor eliminado", detail_edit_server: "Editar servidor", detail_delete_server: "Eliminar servidor",
  add_title_1: "Añadir", add_title_2: "servidor", add_subtitle: "Comparte tu servidor de Minecraft con la comunidad", add_name: "Nombre del servidor", add_ip: "Dirección IP", add_desc: "Descripción", add_platform: "Plataforma", add_proxy_none: "Ninguno", add_minigames: "Minijuegos", add_photos_hint: "Sube fotos o GIFs de tu servidor", add_photos_formats: "PNG, JPG, GIF hasta 5MB", add_submit: "Añadir servidor", add_submitting: "Añadiendo...", add_login_required: "Inicia sesión para añadir un servidor", add_login_btn: "Iniciar sesión", add_warez: "Warez permitido", add_warez_desc: "El servidor acepta copias piratas", add_whitelist_desc: "Los jugadores necesitan aprobación", add_links: "Enlaces y redes sociales", add_website: "Sitio web",
  auth_login: "Iniciar sesión", auth_register: "Registrarse", auth_login_title: "Iniciar sesión", auth_register_title: "Registro", auth_login_subtitle: "¡Bienvenido de nuevo, jugador!", auth_register_subtitle: "Crea una cuenta y comparte servidores", auth_nickname: "Apodo", auth_password: "Contraseña", auth_submit_login: "Iniciar sesión", auth_submit_register: "Crear cuenta", auth_no_account: "¿No tienes cuenta?", auth_has_account: "¿Ya tienes cuenta?", auth_switch_register: "Regístrate", auth_switch_login: "Inicia sesión", auth_login_success: "¡Sesión iniciada!", auth_register_success: "¡Registro exitoso! Revisa tu email.", auth_nickname_required: "Ingresa un apodo",
  profile_title_1: "Mi", profile_title_2: "perfil", profile_nickname: "Apodo", profile_save: "Guardar cambios", profile_saving: "Guardando...", profile_avatar_hint: "Haz clic para cambiar el avatar", profile_uploading: "Subiendo...", profile_bio: "Bio", profile_bio_placeholder: "Escribe algo sobre ti...", profile_nickname_empty: "El apodo no puede estar vacío", profile_save_error: "Error al guardar", profile_save_success: "¡Perfil guardado!", profile_avatar_too_large: "Imagen demasiado grande (máx 2MB)", profile_avatar_error: "Error al subir", profile_avatar_success: "¡Avatar subido!",
  user_profile_back: "Volver a servidores", user_profile_not_found: "Perfil no encontrado", user_profile_member_since: "Miembro desde", user_profile_servers: "Servidores", user_profile_no_servers: "Este jugador aún no ha añadido servidores.",
  comments_title: "Comentarios", comments_placeholder: "Escribe un comentario...", comments_login_required: "Inicia sesión para comentar", comments_login_hint: "Inicia sesión para comentar", comments_none: "Sin comentarios. ¡Sé el primero!", comments_error: "Error al añadir comentario", comments_deleted: "Comentario eliminado", comments_player: "Jugador",
  footer_desc: "El mayor catálogo de servidores de Minecraft.", footer_terms: "Términos de uso", footer_privacy: "Política de privacidad", footer_copyright: "MCServery. Todos los derechos reservados. No afiliado a Mojang Studios.",
  settings_language: "Idioma", featured_title: "Recomendamos", featured_pin: "Fijar", featured_unpin: "Desfijar", featured_pinned: "¡Servidor fijado!", featured_unpinned: "¡Servidor desfijado!",
  loading: "Cargando...", online: "En línea", offline: "Fuera de línea", players_online: "jugadores en línea",
};

const pt: TranslationKeys = {
  ...en,
  nav_home: "Início", nav_servers: "Servidores", nav_add_server: "Adicionar servidor", nav_login: "Entrar", nav_profile: "Meu perfil", nav_logout: "Sair",
  hero_title_1: "Encontre o seu", hero_subtitle: "Descubra centenas de servidores, partilhe o seu e junte-se à comunidade.", hero_browse: "Explorar servidores", hero_add: "Adicionar servidor",
  stat_servers: "Servidores", stat_players: "Jogadores",
  servers_title_1: "Todos os", servers_title_2: "servidores", servers_subtitle: "Pesquise e filtre servidores de Minecraft",
  filter_search_placeholder: "Pesquisar servidor por nome ou IP...", filter_platform: "Plataforma", filter_version: "Versão", filter_all: "Todos",
  detail_view_profile: "Ver perfil →", detail_not_found: "Servidor não encontrado", detail_delete_confirm: "Tem certeza que deseja excluir este servidor?", detail_delete_error: "Erro ao excluir", detail_delete_success: "Servidor excluído", detail_edit_server: "Editar servidor", detail_delete_server: "Excluir servidor",
  auth_login_title: "Entrar", auth_register_title: "Cadastro", auth_login_subtitle: "Bem-vindo de volta, jogador!", auth_register_subtitle: "Crie uma conta e compartilhe servidores", auth_nickname: "Apelido", auth_password: "Senha", auth_submit_login: "Entrar", auth_submit_register: "Criar conta", auth_no_account: "Não tem conta?", auth_has_account: "Já tem conta?", auth_switch_register: "Cadastre-se", auth_switch_login: "Entre", auth_login_success: "Login realizado!", auth_register_success: "Cadastro realizado! Verifique seu email.", auth_nickname_required: "Digite um apelido",
  profile_bio: "Bio", profile_bio_placeholder: "Escreva algo sobre você...", profile_nickname_empty: "O apelido não pode estar vazio", profile_save_error: "Erro ao salvar", profile_save_success: "Perfil salvo!", profile_avatar_too_large: "Imagem muito grande (máx 2MB)", profile_avatar_error: "Erro ao fazer upload", profile_avatar_success: "Avatar enviado!",
  user_profile_back: "Voltar aos servidores", user_profile_not_found: "Perfil não encontrado", user_profile_member_since: "Membro desde", user_profile_servers: "Servidores", user_profile_no_servers: "Este jogador ainda não adicionou servidores.",
  comments_title: "Comentários", comments_placeholder: "Escreva um comentário...", comments_login_required: "Entre para comentar", comments_login_hint: "Entre para comentar", comments_none: "Sem comentários. Seja o primeiro!", comments_error: "Erro ao adicionar comentário", comments_deleted: "Comentário excluído", comments_player: "Jogador",
  settings_language: "Idioma", featured_title: "Recomendamos", featured_pin: "Fixar", featured_unpin: "Desfixar", featured_pinned: "Servidor fixado!", featured_unpinned: "Servidor desfixado!",
  loading: "A carregar...", players_online: "jogadores online",
};

const br: TranslationKeys = {
  ...pt,
  hero_subtitle: "Descubra centenas de servidores, compartilhe o seu e junte-se à comunidade de jogadores.",
  loading: "Carregando...",
};

const zh: TranslationKeys = {
  ...en,
  nav_home: "首页", nav_servers: "服务器", nav_add_server: "添加服务器", nav_login: "登录", nav_profile: "我的资料", nav_logout: "退出",
  hero_title_1: "找到你的", hero_subtitle: "发现数百个服务器，分享你的服务器，加入玩家社区。", hero_browse: "浏览服务器", hero_add: "添加服务器",
  stat_servers: "服务器", stat_players: "玩家", stat_online: "在线",
  servers_title_1: "所有", servers_title_2: "服务器", servers_subtitle: "浏览和筛选Minecraft服务器", servers_none: "未找到服务器", servers_none_hint: "尝试更改筛选条件",
  filter_search_placeholder: "按名称或IP搜索服务器...", filter_platform: "平台", filter_version: "版本", filter_software: "软件", filter_all: "全部",
  detail_back: "返回服务器列表", detail_added_by: "添加者：", detail_minigames: "小游戏", detail_copy: "复制", detail_copied: "已复制！", detail_warez: "盗版", detail_original: "正版", detail_whitelist: "白名单", detail_no_whitelist: "无白名单",
  detail_view_profile: "查看资料 →", detail_not_found: "服务器未找到", detail_delete_confirm: "确定要删除此服务器吗？", detail_delete_error: "删除失败", detail_delete_success: "服务器已删除", detail_edit_server: "编辑服务器", detail_delete_server: "删除服务器",
  add_title_1: "添加", add_title_2: "服务器", add_subtitle: "与社区分享你的Minecraft服务器", add_name: "服务器名称", add_ip: "IP地址", add_desc: "描述", add_platform: "平台", add_version: "版本", add_software: "软件", add_proxy: "代理", add_proxy_none: "无", add_minigames: "小游戏", add_photos: "照片/GIF", add_photos_hint: "上传服务器截图或GIF", add_photos_formats: "PNG, JPG, GIF 最大5MB", add_submit: "添加服务器", add_submitting: "添加中...", add_login_required: "请登录以添加服务器", add_login_btn: "登录", add_warez: "允许盗版", add_warez_desc: "服务器支持非正版游戏", add_whitelist_desc: "玩家需要批准才能加入", add_links: "链接和社交媒体", add_website: "网站",
  auth_login: "登录", auth_register: "注册", auth_login_title: "登录", auth_register_title: "注册", auth_login_subtitle: "欢迎回来，玩家！", auth_register_subtitle: "创建账号并分享服务器", auth_nickname: "昵称", auth_email: "邮箱", auth_password: "密码", auth_submit_login: "登录", auth_submit_register: "创建账号", auth_no_account: "没有账号？", auth_has_account: "已有账号？", auth_switch_register: "注册", auth_switch_login: "登录", auth_login_success: "登录成功！", auth_register_success: "注册成功！请查看邮件确认。", auth_nickname_required: "请输入昵称",
  profile_title_1: "我的", profile_title_2: "资料", profile_nickname: "昵称", profile_email: "邮箱", profile_save: "保存更改", profile_saving: "保存中...", profile_avatar_hint: "点击更换头像", profile_uploading: "上传中...", profile_bio: "简介", profile_bio_placeholder: "写点关于自己的...", profile_nickname_empty: "昵称不能为空", profile_save_error: "保存失败", profile_save_success: "资料已保存！", profile_avatar_too_large: "图片太大（最大2MB）", profile_avatar_error: "上传失败", profile_avatar_success: "头像已上传！",
  user_profile_back: "返回服务器列表", user_profile_not_found: "未找到资料", user_profile_member_since: "加入于", user_profile_servers: "服务器", user_profile_no_servers: "该玩家尚未添加服务器。",
  comments_title: "评论", comments_placeholder: "写评论...", comments_login_required: "请登录后评论", comments_login_hint: "登录后评论", comments_none: "暂无评论，来第一个！", comments_error: "添加评论失败", comments_deleted: "评论已删除", comments_player: "玩家",
  footer_desc: "最大的Minecraft服务器目录。", footer_terms: "使用条款", footer_privacy: "隐私政策", footer_copyright: "MCServery。保留所有权利。与Mojang Studios无关。",
  settings_language: "语言", featured_title: "推荐", featured_pin: "置顶", featured_unpin: "取消置顶", featured_pinned: "服务器已置顶！", featured_unpinned: "服务器已取消置顶！",
  loading: "加载中...", online: "在线", offline: "离线", players_online: "在线玩家",
};

const ja: TranslationKeys = {
  ...en,
  nav_home: "ホーム", nav_servers: "サーバー", nav_add_server: "サーバー追加", nav_login: "ログイン", nav_profile: "マイプロフィール", nav_logout: "ログアウト",
  hero_title_1: "あなたの", hero_subtitle: "数百のサーバーを発見し、あなたのサーバーを共有してプレイヤーコミュニティに参加しましょう。", hero_browse: "サーバーを探す", hero_add: "サーバーを追加",
  stat_servers: "サーバー", stat_players: "プレイヤー", stat_online: "オンライン",
  servers_title_1: "すべての", servers_title_2: "サーバー", servers_subtitle: "Minecraftサーバーを閲覧・フィルタリング", servers_none: "サーバーが見つかりません", servers_none_hint: "フィルターや検索語を変更してみてください",
  filter_search_placeholder: "名前またはIPでサーバーを検索...", filter_platform: "プラットフォーム", filter_version: "バージョン", filter_software: "ソフトウェア", filter_all: "すべて",
  detail_back: "サーバー一覧に戻る", detail_added_by: "追加者：", detail_minigames: "ミニゲーム", detail_copy: "コピー", detail_copied: "コピーしました！", detail_warez: "割れ", detail_original: "正規版", detail_whitelist: "ホワイトリスト", detail_no_whitelist: "ホワイトリストなし",
  detail_view_profile: "プロフィールを見る →", detail_not_found: "サーバーが見つかりません", detail_delete_confirm: "このサーバーを削除しますか？", detail_delete_error: "削除エラー", detail_delete_success: "サーバーが削除されました", detail_edit_server: "サーバーを編集", detail_delete_server: "サーバーを削除",
  add_title_1: "サーバーを", add_title_2: "追加", add_subtitle: "あなたのMinecraftサーバーをコミュニティと共有しましょう", add_name: "サーバー名", add_ip: "IPアドレス", add_desc: "説明", add_platform: "プラットフォーム", add_version: "バージョン", add_software: "ソフトウェア", add_proxy_none: "なし", add_minigames: "ミニゲーム", add_photos_hint: "サーバーの写真やGIFをアップロード", add_photos_formats: "PNG, JPG, GIF 最大5MB", add_submit: "サーバーを追加", add_submitting: "追加中...", add_login_required: "サーバーを追加するにはログインが必要です", add_login_btn: "ログイン", add_warez: "割れ許可", add_warez_desc: "サーバーは非正規版をサポート", add_whitelist_desc: "参加には承認が必要", add_links: "リンク＆SNS", add_website: "ウェブサイト",
  auth_login: "ログイン", auth_register: "新規登録", auth_login_title: "ログイン", auth_register_title: "新規登録", auth_login_subtitle: "おかえりなさい、プレイヤー！", auth_register_subtitle: "アカウントを作成してサーバーを共有", auth_nickname: "ニックネーム", auth_email: "メール", auth_password: "パスワード", auth_submit_login: "ログイン", auth_submit_register: "アカウント作成", auth_no_account: "アカウントがない？", auth_has_account: "すでにアカウントがある？", auth_switch_register: "登録する", auth_switch_login: "ログインする", auth_login_success: "ログイン成功！", auth_register_success: "登録成功！メールを確認してください。", auth_nickname_required: "ニックネームを入力してください",
  profile_title_1: "マイ", profile_title_2: "プロフィール", profile_nickname: "ニックネーム", profile_email: "メール", profile_save: "変更を保存", profile_saving: "保存中...", profile_avatar_hint: "クリックしてアバターを変更", profile_uploading: "アップロード中...", profile_bio: "自己紹介", profile_bio_placeholder: "自己紹介を書いてください...", profile_nickname_empty: "ニックネームは空にできません", profile_save_error: "保存エラー", profile_save_success: "プロフィール保存！", profile_avatar_too_large: "画像が大きすぎます（最大2MB）", profile_avatar_error: "アップロードエラー", profile_avatar_success: "アバターがアップロードされました！",
  user_profile_back: "サーバー一覧に戻る", user_profile_not_found: "プロフィールが見つかりません", user_profile_member_since: "メンバー登録日", user_profile_servers: "サーバー", user_profile_no_servers: "このプレイヤーはまだサーバーを追加していません。",
  comments_title: "コメント", comments_placeholder: "コメントを書く...", comments_login_required: "コメントするにはログインしてください", comments_login_hint: "コメントするにはログイン", comments_none: "コメントなし。最初のコメントを！", comments_error: "コメント追加エラー", comments_deleted: "コメント削除済み", comments_player: "プレイヤー",
  footer_desc: "最大のMinecraftサーバーカタログ。", footer_terms: "利用規約", footer_privacy: "プライバシーポリシー", footer_copyright: "MCServery。全著作権所有。Mojang Studiosとは無関係。",
  settings_language: "言語", featured_title: "おすすめ", featured_pin: "ピン留め", featured_unpin: "ピン解除", featured_pinned: "サーバーをピン留めしました！", featured_unpinned: "ピン留めを解除しました！",
  loading: "読み込み中...", online: "オンライン", offline: "オフライン", players_online: "オンラインプレイヤー",
};

export const translations: Record<Locale, TranslationKeys> = { sk, cs, en, de, fr, ru, uk, es, pt, br, zh, ja };
