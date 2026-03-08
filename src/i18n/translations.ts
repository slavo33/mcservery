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
  add_photos_resolution: string;
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
  auth_or: string;
  auth_google: string;
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
  footer_contact: string;
  footer_support: string;
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
  // Vote
  vote_title: string;
  vote_description: string;
  vote_nick_placeholder: string;
  vote_nick_required: string;
  vote_nick_invalid: string;
  vote_submit: string;
  vote_success: string;
  vote_thanks: string;
  vote_next_in_24h: string;
  vote_cooldown: string;
  vote_cooldown_timer: string;
  vote_error: string;
  vote_error_votifier_key: string;
  vote_error_votifier_connection: string;
  vote_count: string;
  vote_submit_big: string;
  top_voters_title: string;
  // Sort
  sort_label: string;
  sort_votes: string;
  sort_likes: string;
  sort_players: string;
  // Edit server
  edit_title_1: string;
  edit_title_2: string;
  edit_subtitle: string;
  edit_save: string;
  edit_saving: string;
  edit_save_error: string;
  edit_save_success: string;
  edit_fill_required: string;
  edit_not_found: string;
  edit_no_permission: string;
  // Vote API key
  edit_vote_api_key: string;
  edit_vote_api_desc: string;
  edit_vote_api_copied: string;
  edit_vote_api_endpoint: string;
  // Votifier config
  edit_votifier_title: string;
  edit_votifier_desc: string;
  edit_votifier_ip: string;
  edit_votifier_ip_placeholder: string;
  edit_votifier_port: string;
  edit_votifier_port_placeholder: string;
  edit_votifier_key: string;
  edit_votifier_key_placeholder: string;
  edit_votifier_saved: string;
  edit_votifier_ip_no_port: string;
  edit_votifier_port_invalid: string;
  edit_votifier_key_invalid: string;
  edit_votifier_key_valid: string;
  edit_votifier_key_invalid_format: string;
  edit_votifier_test: string;
  edit_votifier_testing: string;
  edit_votifier_test_success: string;
  edit_votifier_test_fail: string;
  edit_votifier_test_fill: string;
  edit_votifier_token_placeholder: string;
  edit_votifier_v2_recommended: string;
  edit_votifier_v2_active: string;
  filter_or: string;
  // Support popup
  support_popup_title: string;
  support_popup_desc: string;
  support_popup_btn: string;
  support_popup_close: string;
  // Reports & Admin
  nav_admin_panel: string;
  report_server: string;
  report_comment: string;
  report_reason_placeholder: string;
  report_submit: string;
  report_success: string;
  report_error: string;
  report_title: string;
  admin_title_1: string;
  admin_title_2: string;
  admin_subtitle: string;
  admin_no_reports: string;
  admin_report_type_server: string;
  admin_report_type_comment: string;
  admin_reported_by: string;
  admin_reason: string;
  admin_view_server: string;
  admin_view_comment: string;
  admin_delete_server: string;
  admin_delete_comment: string;
  admin_dismiss: string;
  admin_resolved: string;
  admin_server_deleted: string;
  admin_comment_deleted: string;
  admin_dismissed: string;
  admin_status_pending: string;
  admin_status_resolved: string;
  admin_status_dismissed: string;
  // Common
  loading: string;
  online: string;
  offline: string;
  players_online: string;
  // VIP
  nav_vip: string;
  vip_title_1: string;
  vip_title_2: string;
  vip_subtitle: string;
  vip_tier_basic: string;
  vip_tier_pro: string;
  vip_tier_max: string;
  vip_most_popular: string;
  vip_duration_prefix: string;
  vip_days: string;
  vip_feature_pinned: string;
  vip_feature_vote_cooldown: string;
  vip_feature_badge: string;
  vip_feature_priority: string;
  vip_buy_now: string;
  vip_select_server_label: string;
  vip_select_server: string;
  vip_login_required: string;
  vip_discount_code: string;
  vip_discount_placeholder: string;
  vip_discount_hint: string;
  vip_invalid_code: string;
  vip_code_expired: string;
  vip_error: string;
  vip_payment_methods: string;
  vip_verifying: string;
  vip_success_title: string;
  vip_success_desc: string;
  vip_try_again: string;
  filter_vip: string;
  // Terms & Privacy
  terms_section_1_title: string;
  terms_section_1_text: string;
  terms_section_2_title: string;
  terms_section_2_text: string;
  terms_section_3_title: string;
  terms_section_3_text: string;
  terms_section_4_title: string;
  terms_section_4_text: string;
  terms_section_5_title: string;
  terms_section_5_text: string;
  privacy_section_1_title: string;
  privacy_section_1_text: string;
  privacy_section_2_title: string;
  privacy_section_2_text: string;
  privacy_section_3_title: string;
  privacy_section_3_text: string;
  privacy_section_4_title: string;
  privacy_section_4_text: string;
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
  add_photos_resolution: "Odporúčané: 1280×720 px (16:9)",
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
  auth_or: "alebo",
  auth_google: "Prihlásiť sa cez Google",
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
  footer_contact: "Kontakt",
  footer_support: "Podporiť nás",
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
  vote_title: "Hlasovať",
  vote_description: "Zadaj svoj Minecraft nick a hlasuj za tento server. Hlasovať môžeš raz za 24 hodín.",
  vote_nick_placeholder: "Tvoj Minecraft nick",
  vote_nick_required: "Zadaj Minecraft nick",
  vote_nick_invalid: "Neplatný nick (3-16 znakov, písmená, čísla, _)",
  vote_submit: "Hlasovať",
  vote_success: "Hlas zaznamenaný!",
  vote_thanks: "Ďakujeme za hlas!",
  vote_next_in_24h: "Ďalší hlas môžeš dať o 24 hodín.",
  vote_cooldown: "Už si hlasoval za posledných 24 hodín.",
  vote_cooldown_timer: "Hlasovať môžeš za",
  vote_error: "Chyba pri hlasovaní",
  vote_error_votifier_key: "Votifier kľúč servera je neplatný. Kontaktujte majiteľa servera.",
  vote_error_votifier_connection: "Nepodarilo sa spojiť s Minecraft serverom. Skúste to neskôr.",
  vote_count: "hlasov",
  vote_submit_big: "HLASOVAŤ ZA SERVER",
  top_voters_title: "Top hlasujúci",
  sort_label: "Zoradiť podľa",
  sort_votes: "Hlasy",
  sort_likes: "Lajky",
  sort_players: "Hráči",
  edit_title_1: "Upraviť",
  edit_title_2: "server",
  edit_subtitle: "Uprav údaje svojho servera",
  edit_save: "Uložiť zmeny",
  edit_saving: "Ukladám...",
  edit_save_error: "Nepodarilo sa uložiť zmeny. Skús to znova.",
  edit_save_success: "Server bol aktualizovaný!",
  edit_fill_required: "Vyplň názov a IP adresu",
  edit_not_found: "Server nenájdený",
  edit_no_permission: "Nemáš oprávnenie upravovať tento server",
  edit_vote_api_key: "Vote API Key",
  edit_vote_api_desc: "Použi tento kľúč vo svojom Votifier/NuVotifier plugine na doručovanie odmien hráčom.",
  edit_vote_api_copied: "API kľúč skopírovaný!",
  edit_vote_api_endpoint: "Endpoint",
  edit_votifier_title: "Votifier / NuVotifier nastavenia",
  edit_votifier_desc: "Zadaj údaje z tvojho Votifier/NuVotifier pluginu pre prepojenie hlasovania s Minecraft serverom.",
  edit_votifier_ip: "Votifier IP",
  edit_votifier_ip_placeholder: "napr. play.mojserver.sk",
  edit_votifier_port: "Votifier Port",
  edit_votifier_port_placeholder: "napr. 8192",
  edit_votifier_key: "Votifier Public Key",
  edit_votifier_key_placeholder: "Vlož RSA public key z config.yml...",
  edit_votifier_saved: "Votifier nastavenia uložené!",
  edit_votifier_ip_no_port: "Votifier IP nesmie obsahovať port (napr. :8192). Zadaj iba IP adresu.",
  edit_votifier_port_invalid: "Votifier port musí byť číslo medzi 1 a 65535.",
  edit_votifier_key_invalid: "Votifier Public Key musí začínať na -----BEGIN PUBLIC KEY-----",
  edit_votifier_key_valid: "✓ Platný RSA kľúč",
  edit_votifier_key_invalid_format: "✗ Neplatný formát kľúča (príliš krátky alebo zlý base64)",
  edit_votifier_test: "Test Votifier spojenia",
  edit_votifier_testing: "Testujem...",
  edit_votifier_test_success: "Votifier spojenie úspešné! Server odpovedal.",
  edit_votifier_test_fail: "Votifier spojenie zlyhalo",
  edit_votifier_test_fill: "Vyplň IP, port a kľúč/token pred testovaním.",
  edit_votifier_token_placeholder: "Token z config.yml NuVotifier pluginu",
  edit_votifier_v2_recommended: "odporúčané",
  edit_votifier_v2_active: "bude použitý",
  filter_or: "alebo",
  support_popup_title: "Podpor MCServery ❤️",
  support_popup_desc: "MCServery je bezplatný projekt. Ak sa ti páči, môžeš nás podporiť cez Ko-fi. Každá podpora nám pomáha!",
  support_popup_btn: "Podporiť na Ko-fi",
  support_popup_close: "Teraz nie, ďakujem",
  nav_admin_panel: "Admin panel",
  report_server: "Nahlásiť server",
  report_comment: "Nahlásiť komentár",
  report_reason_placeholder: "Opíš dôvod nahlásenia (napr. nevhodný popis, profilovka...)",
  report_submit: "Odoslať nahlásenie",
  report_success: "Nahlásenie odoslané!",
  report_error: "Chyba pri nahlasovaní",
  report_title: "Nahlásiť",
  admin_title_1: "Admin",
  admin_title_2: "panel",
  admin_subtitle: "Správa nahlásení serverov a komentárov",
  admin_no_reports: "Žiadne nahlásenia",
  admin_report_type_server: "Server",
  admin_report_type_comment: "Komentár",
  admin_reported_by: "Nahlásil",
  admin_reason: "Dôvod",
  admin_view_server: "Zobraziť server",
  admin_view_comment: "Zobraziť komentár",
  admin_delete_server: "Zmazať server",
  admin_delete_comment: "Zmazať komentár",
  admin_dismiss: "Zamietnuť",
  admin_resolved: "Vyriešené",
  admin_server_deleted: "Server bol zmazaný!",
  admin_comment_deleted: "Komentár bol zmazaný!",
  admin_dismissed: "Nahlásenie zamietnuté",
  admin_status_pending: "Čakajúce",
  admin_status_resolved: "Vyriešené",
  admin_status_dismissed: "Zamietnuté",
  // VIP
  nav_vip: "VIP",
  vip_title_1: "Získaj",
  vip_title_2: "VIP",
  vip_subtitle: "Pripni svoj server do sekcie odporúčaných a získaj výhody pre hlasujúcich hráčov.",
  vip_tier_basic: "Basic",
  vip_tier_pro: "Pro",
  vip_tier_max: "Max",
  vip_most_popular: "Najobľúbenejší",
  vip_duration_prefix: "na",
  vip_days: "dní",
  vip_feature_pinned: "Server pripnutý v odporúčaných na hlavnej stránke",
  vip_feature_vote_cooldown: "Vote za server každých",
  vip_feature_badge: "VIP odznak pri serveri",
  vip_feature_priority: "Prioritné zobrazenie podľa hlasov",
  vip_buy_now: "Kúpiť teraz",
  vip_select_server_label: "Vyber server pre VIP",
  vip_select_server: "Vyber server",
  vip_login_required: "Na kúpu VIP sa musíš prihlásiť",
  vip_discount_code: "Zľavový kód",
  vip_discount_placeholder: "Zadaj zľavový kód...",
  vip_discount_hint: "Ak máš zľavový kód, zadaj ho pred kúpou pre 15% zľavu.",
  vip_invalid_code: "Neplatný zľavový kód",
  vip_code_expired: "Zľavový kód bol už vyčerpaný",
  vip_error: "Chyba pri spracovaní platby",
  vip_payment_methods: "Akceptujeme nasledovné platobné metódy:",
  vip_verifying: "Overujem platbu...",
  vip_success_title: "VIP aktivované!",
  vip_success_desc: "Tvoj server bol úspešne pripnutý do odporúčaných. Ďakujeme za podporu!",
  vip_try_again: "Skúsiť znova",
  filter_vip: "VIP servery",
  // Terms & Privacy
  terms_section_1_title: "1. Úvod",
  terms_section_1_text: "Tieto podmienky používania upravujú používanie webu mcservery.one. Používaním tohto webu súhlasíte s týmito podmienkami. MCServery je katalóg Minecraft serverov a nie je spojený s Mojang Studios ani Microsoft.",
  terms_section_2_title: "2. Používateľský účet",
  terms_section_2_text: "Na pridanie servera, komentovanie a hlasovanie je potrebná registrácia. Ste zodpovední za bezpečnosť svojho účtu. Zdieľanie účtu nie je povolené. Vyhradzujeme si právo zmazať účty, ktoré porušujú tieto podmienky.",
  terms_section_3_title: "3. Obsah a servery",
  terms_section_3_text: "Pridaním servera zaručujete, že máte oprávnenie ho zdieľať. Zakazuje sa pridávať servery s nelegálnym obsahom, podvodné servery alebo servery šíriace malware. Vyhradzujeme si právo odstrániť akýkoľvek server bez predchádzajúceho upozornenia.",
  terms_section_4_title: "4. VIP služby",
  terms_section_4_text: "VIP služby sú jednorazové platby za časovo obmedzené výhody. Platba je nevratná po aktivácii služby. Po uplynutí doby sa server automaticky odopne z odporúčaných, ale zostáva na webe. Zľavové kódy sú jednorázové a nemožno ich kombinovať.",
  terms_section_5_title: "5. Zodpovednosť",
  terms_section_5_text: "MCServery nezodpovedá za obsah serverov ani za škody spôsobené ich používaním. Neposkytujeme žiadne záruky ohľadom dostupnosti alebo kvality serverov v katalógu. Používanie webu je na vlastné riziko.",
  privacy_section_1_title: "1. Zhromažďované údaje",
  privacy_section_1_text: "Zhromažďujeme: email a prezývku pri registrácii, IP adresu pri hlasovaní (na prevenciu zneužitia), údaje o serveroch ktoré pridáte a informácie o platbách za VIP služby. Nezhromažďujeme citlivé osobné údaje nad rámec nevyhnutný pre fungovanie služby.",
  privacy_section_2_title: "2. Použitie údajov",
  privacy_section_2_text: "Vaše údaje používame výhradne na prevádzku služby: autentifikáciu, zobrazenie serverov, spracovanie hlasov a platby za VIP. IP adresy hlasujúcich sú viditeľné iba pre majiteľa servera. Údaje nepredávame tretím stranám.",
  privacy_section_3_title: "3. Cookies a úložisko",
  privacy_section_3_text: "Používame lokálne úložisko prehliadača na zapamätanie jazykových preferencií a prihlásenia. Nepoužívame sledovacie cookies tretích strán. Platby spracováva Stripe, ktorý má vlastnú politiku ochrany súkromia.",
  privacy_section_4_title: "4. Vaše práva",
  privacy_section_4_text: "Máte právo na prístup, opravu alebo vymazanie svojich údajov. Pre vymazanie účtu nás kontaktujte. Po vymazaní účtu budú vaše údaje odstránené, servery a komentáre budú zmazané. Údaje o platbách sú uchovávané v súlade so zákonom.",
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
  add_photos_resolution: "Doporučeno: 1280×720 px (16:9)",
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
  auth_or: "nebo",
  auth_google: "Přihlásit se přes Google",
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
  footer_contact: "Kontakt",
  footer_support: "Podpořte nás",
  loading: "Načítám...",
  players_online: "hráčů online",
  featured_title: "Doporučujeme",
  featured_pin: "Připnout do doporučených",
  featured_unpin: "Odepnout z doporučených",
  featured_pinned: "Server připnut!",
  featured_unpinned: "Server odepnut!",
  vote_title: "Hlasovat",
  vote_description: "Zadej svůj Minecraft nick a hlasuj pro tento server. Hlasovat můžeš jednou za 24 hodin.",
  vote_nick_placeholder: "Tvůj Minecraft nick",
  vote_nick_required: "Zadej Minecraft nick",
  vote_nick_invalid: "Neplatný nick (3-16 znaků, písmena, čísla, _)",
  vote_submit: "Hlasovat",
  vote_success: "Hlas zaznamenán!",
  vote_thanks: "Děkujeme za hlas!",
  vote_next_in_24h: "Další hlas můžeš dát za 24 hodin.",
  vote_cooldown: "Už jsi hlasoval za posledních 24 hodin.",
  vote_cooldown_timer: "Hlasovat můžeš za",
  vote_error: "Chyba při hlasování",
  vote_error_votifier_key: "Votifier klíč serveru je neplatný. Kontaktujte majitele serveru.",
  vote_error_votifier_connection: "Nepodařilo se spojit s Minecraft serverem. Zkuste to později.",
  vote_count: "hlasů",
  vote_submit_big: "HLASOVAT ZA SERVER",
  top_voters_title: "Top hlasující",
  sort_label: "Seřadit podle",
  sort_votes: "Hlasy",
  sort_likes: "Lajky",
  sort_players: "Hráči",
  edit_title_1: "Upravit",
  edit_title_2: "server",
  edit_subtitle: "Uprav údaje svého serveru",
  edit_save: "Uložit změny",
  edit_saving: "Ukládám...",
  edit_save_error: "Nepodařilo se uložit změny. Zkus to znovu.",
  edit_save_success: "Server byl aktualizován!",
  edit_fill_required: "Vyplň název a IP adresu",
  edit_not_found: "Server nenalezen",
  edit_no_permission: "Nemáš oprávnění upravovat tento server",
  edit_vote_api_key: "Vote API Key",
  edit_vote_api_desc: "Použij tento klíč ve svém Votifier/NuVotifier pluginu pro doručování odměn hráčům.",
  edit_vote_api_copied: "API klíč zkopírován!",
  edit_vote_api_endpoint: "Endpoint",
  edit_votifier_title: "Votifier / NuVotifier nastavení",
  edit_votifier_desc: "Zadej údaje z tvého Votifier/NuVotifier pluginu pro propojení hlasování s Minecraft serverem.",
  edit_votifier_ip: "Votifier IP",
  edit_votifier_ip_placeholder: "např. 123.45.67.89",
  edit_votifier_port: "Votifier Port",
  edit_votifier_port_placeholder: "např. 8192",
  edit_votifier_key: "Votifier Public Key",
  edit_votifier_key_placeholder: "Vlož RSA public key z config.yml...",
  edit_votifier_saved: "Votifier nastavení uloženo!",
  edit_votifier_ip_no_port: "Votifier IP nesmí obsahovat port (např. :8192). Zadej pouze IP adresu.",
  edit_votifier_port_invalid: "Votifier port musí být číslo mezi 1 a 65535.",
  edit_votifier_key_invalid: "Votifier Public Key musí začínat na -----BEGIN PUBLIC KEY-----",
  edit_votifier_key_valid: "✓ Platný RSA klíč",
  edit_votifier_key_invalid_format: "✗ Neplatný formát klíče (příliš krátký nebo špatný base64)",
  edit_votifier_test: "Test Votifier spojení",
  edit_votifier_testing: "Testuji...",
  edit_votifier_test_success: "Votifier spojení úspěšné! Server odpověděl.",
  edit_votifier_test_fail: "Votifier spojení selhalo",
  edit_votifier_test_fill: "Vyplň IP, port a klíč/token před testováním.",
  edit_votifier_token_placeholder: "Token z config.yml NuVotifier pluginu",
  edit_votifier_v2_recommended: "doporučeno",
  edit_votifier_v2_active: "bude použit",
  filter_or: "nebo",
  support_popup_title: "Podpoř MCServery ❤️",
  support_popup_desc: "MCServery je bezplatný projekt. Pokud se ti líbí, můžeš nás podpořit přes Ko-fi. Každá podpora nám pomáhá!",
  support_popup_btn: "Podpořit na Ko-fi",
  support_popup_close: "Teď ne, děkuji",
  // VIP
  vip_title_1: "Získej",
  vip_subtitle: "Připni svůj server do doporučených a odemkni výhody pro hlasující hráče.",
  vip_most_popular: "Nejoblíbenější",
  vip_duration_prefix: "na",
  vip_days: "dní",
  vip_feature_pinned: "Server připnutý v doporučených na hlavní stránce",
  vip_feature_vote_cooldown: "Hlasování za server každých",
  vip_feature_badge: "VIP odznak u serveru",
  vip_feature_priority: "Prioritní zobrazení podle hlasů",
  vip_buy_now: "Koupit nyní",
  vip_select_server_label: "Vyber server pro VIP",
  vip_select_server: "Vyber server",
  vip_login_required: "Pro koupi VIP se musíš přihlásit",
  vip_discount_code: "Slevový kód",
  vip_discount_placeholder: "Zadej slevový kód...",
  vip_discount_hint: "Pokud máš slevový kód, zadej ho před koupí pro 15% slevu.",
  vip_invalid_code: "Neplatný slevový kód",
  vip_code_expired: "Slevový kód byl vyčerpán",
  vip_error: "Chyba při zpracování platby",
  vip_payment_methods: "Přijímáme následující platební metody:",
  vip_verifying: "Ověřuji platbu...",
  vip_success_title: "VIP aktivováno!",
  vip_success_desc: "Tvůj server byl úspěšně připnut do doporučených. Děkujeme za podporu!",
  vip_try_again: "Zkusit znovu",
  filter_vip: "VIP servery",
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
  add_photos_resolution: "Recommended: 1280×720 px (16:9)",
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
  auth_or: "or",
  auth_google: "Sign in with Google",
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
  footer_contact: "Contact",
  footer_support: "Support us",
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
  vote_title: "Vote",
  vote_description: "Enter your Minecraft nick and vote for this server. You can vote once every 24 hours.",
  vote_nick_placeholder: "Your Minecraft nick",
  vote_nick_required: "Enter your Minecraft nick",
  vote_nick_invalid: "Invalid nick (3-16 chars, letters, numbers, _)",
  vote_submit: "Vote",
  vote_success: "Vote recorded!",
  vote_thanks: "Thanks for voting!",
  vote_next_in_24h: "You can vote again in 24 hours.",
  vote_cooldown: "You already voted in the last 24 hours.",
  vote_cooldown_timer: "You can vote again in",
  vote_error: "Error while voting",
  vote_error_votifier_key: "Server's Votifier key is invalid. Contact the server owner.",
  vote_error_votifier_connection: "Could not connect to the Minecraft server. Try again later.",
  vote_count: "votes",
  vote_submit_big: "VOTE FOR SERVER",
  top_voters_title: "Top Voters",
  sort_label: "Sort by",
  sort_votes: "Votes",
  sort_likes: "Likes",
  sort_players: "Players",
  edit_title_1: "Edit",
  edit_title_2: "server",
  edit_subtitle: "Update your server details",
  edit_save: "Save changes",
  edit_saving: "Saving...",
  edit_save_error: "Failed to save changes. Try again.",
  edit_save_success: "Server updated!",
  edit_fill_required: "Fill in the name and IP address",
  edit_not_found: "Server not found",
  edit_no_permission: "You don't have permission to edit this server",
  edit_vote_api_key: "Vote API Key",
  edit_vote_api_desc: "Use this key in your Votifier/NuVotifier plugin to deliver rewards to players.",
  edit_vote_api_copied: "API key copied!",
  edit_vote_api_endpoint: "Endpoint",
  edit_votifier_title: "Votifier / NuVotifier Settings",
  edit_votifier_desc: "Enter your Votifier/NuVotifier plugin details to connect voting with your Minecraft server.",
  edit_votifier_ip: "Votifier IP",
  edit_votifier_ip_placeholder: "e.g. play.myserver.com",
  edit_votifier_port: "Votifier Port",
  edit_votifier_port_placeholder: "e.g. 8192",
  edit_votifier_key: "Votifier Public Key",
  edit_votifier_key_placeholder: "Paste RSA public key from config.yml...",
  edit_votifier_saved: "Votifier settings saved!",
  edit_votifier_ip_no_port: "Votifier IP must not contain a port (e.g. :8192). Enter the IP address only.",
  edit_votifier_port_invalid: "Votifier port must be a number between 1 and 65535.",
  edit_votifier_key_invalid: "Votifier Public Key must start with -----BEGIN PUBLIC KEY-----",
  edit_votifier_key_valid: "✓ Valid RSA key",
  edit_votifier_key_invalid_format: "✗ Invalid key format (too short or bad base64)",
  edit_votifier_test: "Test Votifier Connection",
  edit_votifier_testing: "Testing...",
  edit_votifier_test_success: "Votifier connection successful! Server responded.",
  edit_votifier_test_fail: "Votifier connection failed",
  edit_votifier_test_fill: "Fill in IP, port and key/token before testing.",
  edit_votifier_token_placeholder: "Token from NuVotifier plugin config.yml",
  edit_votifier_v2_recommended: "recommended",
  edit_votifier_v2_active: "will be used",
  filter_or: "or",
  support_popup_title: "Support MCServery ❤️",
  support_popup_desc: "MCServery is a free project. If you enjoy it, you can support us on Ko-fi. Every contribution helps!",
  support_popup_btn: "Support on Ko-fi",
  support_popup_close: "Not now, thanks",
  nav_admin_panel: "Admin Panel",
  report_server: "Report server",
  report_comment: "Report comment",
  report_reason_placeholder: "Describe the reason for reporting (e.g. inappropriate description, profile picture...)",
  report_submit: "Submit report",
  report_success: "Report submitted!",
  report_error: "Error submitting report",
  report_title: "Report",
  admin_title_1: "Admin",
  admin_title_2: "Panel",
  admin_subtitle: "Manage server and comment reports",
  admin_no_reports: "No reports",
  admin_report_type_server: "Server",
  admin_report_type_comment: "Comment",
  admin_reported_by: "Reported by",
  admin_reason: "Reason",
  admin_view_server: "View server",
  admin_view_comment: "View comment",
  admin_delete_server: "Delete server",
  admin_delete_comment: "Delete comment",
  admin_dismiss: "Dismiss",
  admin_resolved: "Resolved",
  admin_server_deleted: "Server deleted!",
  admin_comment_deleted: "Comment deleted!",
  admin_dismissed: "Report dismissed",
  admin_status_pending: "Pending",
  admin_status_resolved: "Resolved",
  admin_status_dismissed: "Dismissed",
  // VIP
  nav_vip: "VIP",
  vip_title_1: "Get",
  vip_title_2: "VIP",
  vip_subtitle: "Pin your server to the recommended section and unlock voting benefits for your players.",
  vip_tier_basic: "Basic",
  vip_tier_pro: "Pro",
  vip_tier_max: "Max",
  vip_most_popular: "Most Popular",
  vip_duration_prefix: "for",
  vip_days: "days",
  vip_feature_pinned: "Server pinned in recommended on the homepage",
  vip_feature_vote_cooldown: "Vote for server every",
  vip_feature_badge: "VIP badge on server",
  vip_feature_priority: "Priority display by votes",
  vip_buy_now: "Buy Now",
  vip_select_server_label: "Select server for VIP",
  vip_select_server: "Select server",
  vip_login_required: "You need to sign in to purchase VIP",
  vip_discount_code: "Discount Code",
  vip_discount_placeholder: "Enter discount code...",
  vip_discount_hint: "If you have a discount code, enter it before purchase for 15% off.",
  vip_invalid_code: "Invalid discount code",
  vip_code_expired: "Discount code has been used up",
  vip_error: "Error processing payment",
  vip_payment_methods: "We accept the following payment methods:",
  vip_verifying: "Verifying payment...",
  vip_success_title: "VIP Activated!",
  vip_success_desc: "Your server has been successfully pinned to recommended. Thank you for your support!",
  vip_try_again: "Try again",
  filter_vip: "VIP Servers",
  // Terms & Privacy
  terms_section_1_title: "1. Introduction",
  terms_section_1_text: "These terms of service govern the use of mcservery.one. By using this website, you agree to these terms. MCServery is a Minecraft server catalog and is not affiliated with Mojang Studios or Microsoft.",
  terms_section_2_title: "2. User Account",
  terms_section_2_text: "Registration is required to add a server, comment, and vote. You are responsible for the security of your account. Account sharing is not permitted. We reserve the right to delete accounts that violate these terms.",
  terms_section_3_title: "3. Content & Servers",
  terms_section_3_text: "By adding a server, you guarantee that you have permission to share it. It is prohibited to add servers with illegal content, fraudulent servers, or servers distributing malware. We reserve the right to remove any server without prior notice.",
  terms_section_4_title: "4. VIP Services",
  terms_section_4_text: "VIP services are one-time payments for time-limited benefits. Payment is non-refundable after service activation. After the period expires, the server is automatically unpinned from recommended but remains on the website. Discount codes are single-use and cannot be combined.",
  terms_section_5_title: "5. Liability",
  terms_section_5_text: "MCServery is not responsible for server content or damages caused by their use. We provide no guarantees regarding availability or quality of servers in the catalog. Use of the website is at your own risk.",
  privacy_section_1_title: "1. Data Collected",
  privacy_section_1_text: "We collect: email and nickname during registration, IP address during voting (to prevent abuse), server data you add, and payment information for VIP services. We do not collect sensitive personal data beyond what is necessary for service operation.",
  privacy_section_2_title: "2. Data Usage",
  privacy_section_2_text: "Your data is used exclusively for service operation: authentication, server display, vote processing, and VIP payments. Voter IP addresses are visible only to the server owner. We do not sell data to third parties.",
  privacy_section_3_title: "3. Cookies & Storage",
  privacy_section_3_text: "We use browser local storage to remember language preferences and login. We do not use third-party tracking cookies. Payments are processed by Stripe, which has its own privacy policy.",
  privacy_section_4_title: "4. Your Rights",
  privacy_section_4_text: "You have the right to access, correct, or delete your data. Contact us for account deletion. After deletion, your data will be removed, servers and comments will be deleted. Payment data is retained in accordance with the law.",
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
  add_photos_resolution: "Empfohlen: 1280×720 px (16:9)",
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
  auth_or: "oder",
  auth_google: "Mit Google anmelden",
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
  footer_contact: "Kontakt",
  footer_support: "Unterstütze uns",
  settings_language: "Sprache",
  featured_title: "Wir empfehlen", featured_pin: "Anheften", featured_unpin: "Loslösen", featured_pinned: "Server angeheftet!", featured_unpinned: "Server losgelöst!",
  loading: "Laden...",
  players_online: "Spieler online",
  vote_title: "Abstimmen",
  vote_description: "Gib deinen Minecraft-Nick ein und stimme für diesen Server. Du kannst alle 24 Stunden abstimmen.",
  vote_nick_placeholder: "Dein Minecraft-Nick",
  vote_nick_required: "Gib deinen Minecraft-Nick ein",
  vote_nick_invalid: "Ungültiger Nick (3-16 Zeichen, Buchstaben, Zahlen, _)",
  vote_submit: "Abstimmen",
  vote_success: "Stimme gespeichert!",
  vote_thanks: "Danke für deine Stimme!",
  vote_next_in_24h: "Du kannst in 24 Stunden erneut abstimmen.",
  vote_cooldown: "Du hast bereits in den letzten 24 Stunden abgestimmt.",
  vote_cooldown_timer: "Du kannst wieder abstimmen in",
  vote_error: "Fehler beim Abstimmen",
  vote_error_votifier_key: "Der Votifier-Schlüssel des Servers ist ungültig. Kontaktiere den Serverbesitzer.",
  vote_error_votifier_connection: "Verbindung zum Minecraft-Server fehlgeschlagen. Versuche es später erneut.",
  vote_count: "Stimmen",
  vote_submit_big: "FÜR SERVER STIMMEN",
  top_voters_title: "Top-Wähler",
  sort_label: "Sortieren nach",
  sort_votes: "Stimmen",
  sort_likes: "Likes",
  sort_players: "Spieler",
  edit_title_1: "Server",
  edit_title_2: "bearbeiten",
  edit_subtitle: "Aktualisiere die Daten deines Servers",
  edit_save: "Änderungen speichern",
  edit_saving: "Wird gespeichert...",
  edit_save_error: "Änderungen konnten nicht gespeichert werden. Versuche es erneut.",
  edit_save_success: "Server aktualisiert!",
  edit_fill_required: "Fülle Name und IP-Adresse aus",
  edit_not_found: "Server nicht gefunden",
  edit_no_permission: "Du hast keine Berechtigung, diesen Server zu bearbeiten",
  edit_vote_api_key: "Vote API Key",
  edit_vote_api_desc: "Verwende diesen Schlüssel in deinem Votifier/NuVotifier-Plugin, um Spielern Belohnungen zuzustellen.",
  edit_vote_api_copied: "API-Schlüssel kopiert!",
  edit_vote_api_endpoint: "Endpoint",
  edit_votifier_title: "Votifier / NuVotifier Einstellungen",
  edit_votifier_desc: "Gib die Daten deines Votifier/NuVotifier-Plugins ein, um die Abstimmung mit deinem Minecraft-Server zu verbinden.",
  edit_votifier_ip: "Votifier IP",
  edit_votifier_ip_placeholder: "z.B. 123.45.67.89",
  edit_votifier_port: "Votifier Port",
  edit_votifier_port_placeholder: "z.B. 8192",
  edit_votifier_key: "Votifier Public Key",
  edit_votifier_key_placeholder: "RSA Public Key aus config.yml einfügen...",
  edit_votifier_saved: "Votifier-Einstellungen gespeichert!",
  edit_votifier_ip_no_port: "Votifier IP darf keinen Port enthalten (z.B. :8192). Gib nur die IP-Adresse ein.",
  edit_votifier_port_invalid: "Votifier Port muss eine Zahl zwischen 1 und 65535 sein.",
  edit_votifier_key_invalid: "Votifier Public Key muss mit -----BEGIN PUBLIC KEY----- beginnen",
  edit_votifier_key_valid: "✓ Gültiger RSA-Schlüssel",
  edit_votifier_key_invalid_format: "✗ Ungültiges Schlüsselformat (zu kurz oder ungültiges base64)",
  edit_votifier_test: "Votifier-Verbindung testen",
  edit_votifier_testing: "Teste...",
  edit_votifier_test_success: "Votifier-Verbindung erfolgreich! Server hat geantwortet.",
  edit_votifier_test_fail: "Votifier-Verbindung fehlgeschlagen",
  edit_votifier_test_fill: "Fülle IP, Port und Schlüssel/Token vor dem Testen aus.",
  edit_votifier_token_placeholder: "Token aus NuVotifier Plugin config.yml",
  edit_votifier_v2_recommended: "empfohlen",
  edit_votifier_v2_active: "wird verwendet",
  filter_or: "oder",
  support_popup_title: "Unterstütze MCServery ❤️",
  support_popup_desc: "MCServery ist ein kostenloses Projekt. Wenn es dir gefällt, kannst du uns auf Ko-fi unterstützen!",
  support_popup_btn: "Auf Ko-fi unterstützen",
  support_popup_close: "Jetzt nicht, danke",
  // VIP
  vip_title_1: "Hol dir",
  vip_subtitle: "Hefte deinen Server in die empfohlenen an und schalte Vorteile für Abstimmende frei.",
  vip_most_popular: "Beliebteste",
  vip_duration_prefix: "für",
  vip_days: "Tage",
  vip_feature_pinned: "Server in den Empfehlungen auf der Startseite angeheftet",
  vip_feature_vote_cooldown: "Für Server abstimmen alle",
  vip_feature_badge: "VIP-Abzeichen am Server",
  vip_feature_priority: "Prioritätsanzeige nach Stimmen",
  vip_buy_now: "Jetzt kaufen",
  vip_select_server_label: "Server für VIP auswählen",
  vip_select_server: "Server auswählen",
  vip_login_required: "Du musst dich anmelden, um VIP zu kaufen",
  vip_discount_code: "Rabattcode",
  vip_discount_placeholder: "Rabattcode eingeben...",
  vip_discount_hint: "Wenn du einen Rabattcode hast, gib ihn vor dem Kauf für 15% Rabatt ein.",
  vip_invalid_code: "Ungültiger Rabattcode",
  vip_code_expired: "Rabattcode wurde aufgebraucht",
  vip_error: "Fehler bei der Zahlungsverarbeitung",
  vip_payment_methods: "Wir akzeptieren folgende Zahlungsmethoden:",
  vip_verifying: "Zahlung wird überprüft...",
  vip_success_title: "VIP aktiviert!",
  vip_success_desc: "Dein Server wurde erfolgreich in den Empfehlungen angeheftet. Danke für deine Unterstützung!",
  vip_try_again: "Erneut versuchen",
  filter_vip: "VIP-Server",
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
  add_photos_resolution: "Recommandé : 1280×720 px (16:9)",
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
  auth_or: "ou",
  auth_google: "Se connecter avec Google",
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
  footer_contact: "Contact",
  footer_support: "Nous soutenir",
  settings_language: "Langue",
  featured_title: "Nous recommandons", featured_pin: "Épingler", featured_unpin: "Désépingler", featured_pinned: "Serveur épinglé !", featured_unpinned: "Serveur désépinglé !",
  loading: "Chargement...",
  online: "En ligne",
  offline: "Hors ligne",
  players_online: "joueurs en ligne",
  vote_title: "Voter",
  vote_description: "Entre ton pseudo Minecraft et vote pour ce serveur. Tu peux voter une fois toutes les 24 heures.",
  vote_nick_placeholder: "Ton pseudo Minecraft",
  vote_nick_required: "Entre ton pseudo Minecraft",
  vote_nick_invalid: "Pseudo invalide (3-16 caractères, lettres, chiffres, _)",
  vote_submit: "Voter",
  vote_success: "Vote enregistré !",
  vote_thanks: "Merci pour ton vote !",
  vote_next_in_24h: "Tu pourras revoter dans 24 heures.",
  vote_cooldown: "Tu as déjà voté dans les dernières 24 heures.",
  vote_cooldown_timer: "Tu pourras revoter dans",
  vote_error: "Erreur lors du vote",
  vote_error_votifier_key: "La clé Votifier du serveur est invalide. Contactez le propriétaire du serveur.",
  vote_error_votifier_connection: "Impossible de se connecter au serveur Minecraft. Réessayez plus tard.",
  vote_count: "votes",
  vote_submit_big: "VOTER POUR LE SERVEUR",
  top_voters_title: "Meilleurs votants",
  sort_label: "Trier par",
  sort_votes: "Votes",
  sort_likes: "Likes",
  sort_players: "Joueurs",
  edit_title_1: "Modifier le",
  edit_title_2: "serveur",
  edit_subtitle: "Mets à jour les informations de ton serveur",
  edit_save: "Enregistrer les modifications",
  edit_saving: "Enregistrement...",
  edit_save_error: "Impossible d'enregistrer les modifications. Réessaie.",
  edit_save_success: "Serveur mis à jour !",
  edit_fill_required: "Remplis le nom et l'adresse IP",
  edit_not_found: "Serveur introuvable",
  edit_no_permission: "Tu n'as pas la permission de modifier ce serveur",
  edit_vote_api_key: "Clé API Vote",
  edit_vote_api_desc: "Utilise cette clé dans ton plugin Votifier/NuVotifier pour distribuer des récompenses aux joueurs.",
  edit_vote_api_copied: "Clé API copiée !",
  edit_vote_api_endpoint: "Endpoint",
  edit_votifier_title: "Paramètres Votifier / NuVotifier",
  edit_votifier_desc: "Entre les données de ton plugin Votifier/NuVotifier pour connecter les votes à ton serveur Minecraft.",
  edit_votifier_ip: "IP Votifier",
  edit_votifier_ip_placeholder: "ex. 123.45.67.89",
  edit_votifier_port: "Port Votifier",
  edit_votifier_port_placeholder: "ex. 8192",
  edit_votifier_key: "Clé publique Votifier",
  edit_votifier_key_placeholder: "Colle la clé publique RSA depuis config.yml...",
  edit_votifier_saved: "Paramètres Votifier sauvegardés !",
  edit_votifier_ip_no_port: "L'IP Votifier ne doit pas contenir de port (ex. :8192). Entre uniquement l'adresse IP.",
  edit_votifier_port_invalid: "Le port Votifier doit être un nombre entre 1 et 65535.",
  edit_votifier_key_invalid: "La clé publique Votifier doit commencer par -----BEGIN PUBLIC KEY-----",
  edit_votifier_key_valid: "✓ Clé RSA valide",
  edit_votifier_key_invalid_format: "✗ Format de clé invalide (trop court ou base64 invalide)",
  edit_votifier_test: "Tester la connexion Votifier",
  edit_votifier_testing: "Test en cours...",
  edit_votifier_test_success: "Connexion Votifier réussie ! Le serveur a répondu.",
  edit_votifier_test_fail: "Échec de la connexion Votifier",
  edit_votifier_test_fill: "Remplis IP, port et clé/token avant de tester.",
  edit_votifier_token_placeholder: "Token du plugin NuVotifier config.yml",
  edit_votifier_v2_recommended: "recommandé",
  edit_votifier_v2_active: "sera utilisé",
  filter_or: "ou",
  support_popup_title: "Soutiens MCServery ❤️",
  support_popup_desc: "MCServery est un projet gratuit. Si tu l'apprécies, tu peux nous soutenir sur Ko-fi !",
  support_popup_btn: "Soutenir sur Ko-fi",
  support_popup_close: "Pas maintenant, merci",
  // VIP
  vip_title_1: "Obtiens",
  vip_subtitle: "Épingle ton serveur dans les recommandés et débloque des avantages pour les votants.",
  vip_most_popular: "Le plus populaire",
  vip_duration_prefix: "pour",
  vip_days: "jours",
  vip_feature_pinned: "Serveur épinglé dans les recommandés sur la page d'accueil",
  vip_feature_vote_cooldown: "Vote pour le serveur toutes les",
  vip_feature_badge: "Badge VIP sur le serveur",
  vip_feature_priority: "Affichage prioritaire par votes",
  vip_buy_now: "Acheter maintenant",
  vip_select_server_label: "Sélectionne un serveur pour VIP",
  vip_select_server: "Sélectionner un serveur",
  vip_login_required: "Tu dois te connecter pour acheter VIP",
  vip_discount_code: "Code de réduction",
  vip_discount_placeholder: "Entre le code de réduction...",
  vip_discount_hint: "Si tu as un code de réduction, entre-le avant l'achat pour 15% de réduction.",
  vip_invalid_code: "Code de réduction invalide",
  vip_code_expired: "Le code de réduction a été épuisé",
  vip_error: "Erreur lors du traitement du paiement",
  vip_payment_methods: "Nous acceptons les méthodes de paiement suivantes :",
  vip_verifying: "Vérification du paiement...",
  vip_success_title: "VIP activé !",
  vip_success_desc: "Ton serveur a été épinglé dans les recommandés. Merci pour ton soutien !",
  vip_try_again: "Réessayer",
  filter_vip: "Serveurs VIP",
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
  add_title_1: "Добавить", add_title_2: "сервер", add_subtitle: "Поделитесь своим Minecraft сервером с сообществом", add_name: "Название сервера", add_ip: "IP адрес", add_desc: "Описание", add_platform: "Платформа", add_version: "Версия", add_software: "ПО", add_proxy: "Прокси", add_proxy_none: "Нет", add_minigames: "Мини-игры", add_photos: "Фото / GIF", add_photos_hint: "Загрузите фото или GIF с вашего сервера", add_photos_formats: "PNG, JPG, GIF до 5МБ", add_photos_resolution: "Рекомендуется: 1280×720 px (16:9)", add_submit: "Добавить сервер", add_submitting: "Добавляю...", add_login_required: "Для добавления сервера нужно войти", add_login_btn: "Войти", add_warez: "Пиратка разрешена", add_warez_desc: "Сервер поддерживает нелицензионные копии", add_whitelist_desc: "Игрокам нужно одобрение для входа", add_links: "Ссылки и соцсети", add_website: "Сайт",
  auth_login: "Войти", auth_register: "Регистрация", auth_login_title: "Вход", auth_register_title: "Регистрация", auth_login_subtitle: "С возвращением, игрок!", auth_register_subtitle: "Создай аккаунт и делись серверами", auth_nickname: "Никнейм", auth_email: "Email", auth_password: "Пароль", auth_submit_login: "Войти", auth_submit_register: "Создать аккаунт", auth_no_account: "Нет аккаунта?", auth_has_account: "Уже есть аккаунт?", auth_switch_register: "Зарегистрируйся", auth_switch_login: "Войти", auth_login_success: "Успешный вход!", auth_register_success: "Регистрация успешна! Проверьте email.", auth_nickname_required: "Введите никнейм", auth_or: "или", auth_google: "Войти через Google",
  profile_title_1: "Мой", profile_title_2: "профиль", profile_nickname: "Никнейм", profile_email: "Email", profile_save: "Сохранить", profile_saving: "Сохраняю...", profile_avatar_hint: "Нажмите для смены аватара", profile_uploading: "Загрузка...", profile_bio: "О себе", profile_bio_placeholder: "Напишите о себе...", profile_nickname_empty: "Никнейм не может быть пустым", profile_save_error: "Ошибка сохранения", profile_save_success: "Профиль сохранён!", profile_avatar_too_large: "Изображение слишком большое (макс 2МБ)", profile_avatar_error: "Ошибка загрузки", profile_avatar_success: "Аватар загружен!",
  user_profile_back: "Назад к серверам", user_profile_not_found: "Профиль не найден", user_profile_member_since: "Участник с", user_profile_servers: "Серверы", user_profile_no_servers: "Этот игрок пока не добавил серверов.",
  comments_title: "Комментарии", comments_placeholder: "Напишите комментарий...", comments_login_required: "Войдите, чтобы комментировать", comments_login_hint: "Войдите для комментирования", comments_none: "Нет комментариев. Будьте первым!", comments_error: "Ошибка добавления комментария", comments_deleted: "Комментарий удалён", comments_player: "Игрок",
  footer_desc: "Крупнейший каталог серверов Minecraft. Найди свой идеальный сервер или поделись своим.", footer_nav: "Навигация", footer_legal: "Правовая информация", footer_terms: "Условия использования", footer_privacy: "Политика конфиденциальности", footer_copyright: "MCServery. Все права защищены. Не связано с Mojang Studios.", footer_contact: "Контакт", footer_support: "Поддержать нас",
  settings_language: "Язык", featured_title: "Рекомендуем", featured_pin: "Закрепить", featured_unpin: "Открепить", featured_pinned: "Сервер закреплён!", featured_unpinned: "Сервер откреплён!",
  loading: "Загрузка...", online: "Онлайн", offline: "Офлайн", players_online: "игроков онлайн",
  vote_title: "Голосовать", vote_description: "Введите свой Minecraft ник и проголосуйте за этот сервер. Голосовать можно раз в 24 часа.", vote_nick_placeholder: "Ваш Minecraft ник", vote_nick_required: "Введите Minecraft ник", vote_nick_invalid: "Неверный ник (3-16 символов, буквы, цифры, _)", vote_submit: "Голосовать", vote_success: "Голос записан!", vote_thanks: "Спасибо за голос!", vote_next_in_24h: "Следующий голос через 24 часа.", vote_cooldown: "Вы уже голосовали за последние 24 часа.", vote_cooldown_timer: "Голосовать снова через", vote_error: "Ошибка голосования", vote_count: "голосов", vote_submit_big: "ГОЛОСОВАТЬ ЗА СЕРВЕР", top_voters_title: "Лучшие голосующие",
  sort_label: "Сортировать по", sort_votes: "Голоса", sort_likes: "Лайки", sort_players: "Игроки",
  edit_title_1: "Редактировать", edit_title_2: "сервер", edit_subtitle: "Обновите данные вашего сервера", edit_save: "Сохранить изменения", edit_saving: "Сохраняю...", edit_save_error: "Не удалось сохранить изменения. Попробуйте снова.", edit_save_success: "Сервер обновлён!", edit_fill_required: "Заполните название и IP-адрес", edit_not_found: "Сервер не найден", edit_no_permission: "У вас нет прав для редактирования этого сервера", edit_vote_api_key: "Vote API Key", edit_vote_api_desc: "Используйте этот ключ в вашем Votifier/NuVotifier плагине для доставки наград игрокам.", edit_vote_api_copied: "API-ключ скопирован!", edit_vote_api_endpoint: "Endpoint",
  edit_votifier_title: "Настройки Votifier / NuVotifier", edit_votifier_desc: "Введите данные вашего плагина Votifier/NuVotifier для подключения голосования к Minecraft серверу.", edit_votifier_ip: "Votifier IP", edit_votifier_ip_placeholder: "напр. 123.45.67.89", edit_votifier_port: "Votifier порт", edit_votifier_port_placeholder: "напр. 8192", edit_votifier_key: "Публичный ключ Votifier", edit_votifier_key_placeholder: "Вставьте RSA публичный ключ из config.yml...", edit_votifier_saved: "Настройки Votifier сохранены!", edit_votifier_ip_no_port: "Votifier IP не должен содержать порт (напр. :8192). Введите только IP-адрес.", edit_votifier_port_invalid: "Порт Votifier должен быть числом от 1 до 65535.", edit_votifier_key_invalid: "Публичный ключ Votifier должен начинаться с -----BEGIN PUBLIC KEY-----",
  support_popup_title: "Поддержите MCServery ❤️", support_popup_desc: "MCServery — бесплатный проект. Если вам нравится, поддержите нас на Ko-fi!", support_popup_btn: "Поддержать на Ko-fi", support_popup_close: "Не сейчас, спасибо",
  // VIP
  nav_vip: "VIP",
  vip_title_1: "Получи",
  vip_title_2: "VIP",
  vip_subtitle: "Закрепи свой сервер в рекомендуемых и разблокируй преимущества для голосующих.",
  vip_most_popular: "Самый популярный",
  vip_duration_prefix: "на",
  vip_days: "дней",
  vip_feature_pinned: "Сервер закреплён в рекомендуемых на главной",
  vip_feature_vote_cooldown: "Голосование за сервер каждые",
  vip_feature_badge: "VIP значок у сервера",
  vip_feature_priority: "Приоритетное отображение по голосам",
  vip_buy_now: "Купить сейчас",
  vip_select_server_label: "Выбери сервер для VIP",
  vip_select_server: "Выбрать сервер",
  vip_login_required: "Для покупки VIP нужно войти",
  vip_discount_code: "Промокод",
  vip_discount_placeholder: "Введите промокод...",
  vip_discount_hint: "Если у вас есть промокод, введите его перед покупкой для скидки 15%.",
  vip_invalid_code: "Неверный промокод",
  vip_code_expired: "Промокод исчерпан",
  vip_error: "Ошибка обработки платежа",
  vip_payment_methods: "Мы принимаем следующие способы оплаты:",
  vip_verifying: "Проверка платежа...",
  vip_success_title: "VIP активирован!",
  vip_success_desc: "Ваш сервер был успешно закреплён в рекомендуемых. Спасибо за поддержку!",
  vip_try_again: "Попробовать снова",
  filter_vip: "VIP серверы",
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
  auth_login: "Увійти", auth_register: "Зареєструватися", auth_login_title: "Вхід", auth_register_title: "Реєстрація", auth_login_subtitle: "З поверненням, гравцю!", auth_register_subtitle: "Створи обліковий запис та ділись серверами", auth_nickname: "Нікнейм", auth_email: "Email", auth_password: "Пароль", auth_submit_login: "Увійти", auth_submit_register: "Створити обліковий запис", auth_no_account: "Немає облікового запису?", auth_has_account: "Вже є обліковий запис?", auth_switch_register: "Зареєструйся", auth_switch_login: "Увійди", auth_login_success: "Успішний вхід!", auth_register_success: "Реєстрація успішна! Перевірте email.", auth_nickname_required: "Введіть нікнейм", auth_or: "або", auth_google: "Увійти через Google",
  profile_title_1: "Мій", profile_title_2: "профіль", profile_nickname: "Нікнейм", profile_email: "Email", profile_save: "Зберегти зміни", profile_saving: "Зберігаю...", profile_avatar_hint: "Натисни для зміни аватара", profile_uploading: "Завантаження...", profile_bio: "Про себе", profile_bio_placeholder: "Напишіть щось про себе...", profile_nickname_empty: "Нікнейм не може бути порожнім", profile_save_error: "Помилка збереження", profile_save_success: "Профіль збережено!", profile_avatar_too_large: "Зображення занадто велике (макс 2МБ)", profile_avatar_error: "Помилка завантаження", profile_avatar_success: "Аватар завантажено!",
  user_profile_back: "Назад до серверів", user_profile_not_found: "Профіль не знайдено", user_profile_member_since: "Учасник з", user_profile_servers: "Сервери", user_profile_no_servers: "Цей гравець ще не додав серверів.",
  comments_title: "Коментарі", comments_placeholder: "Напишіть коментар...", comments_login_required: "Увійдіть, щоб коментувати", comments_login_hint: "Увійдіть для коментування", comments_none: "Немає коментарів. Будьте першим!", comments_error: "Помилка додавання коментаря", comments_deleted: "Коментар видалено", comments_player: "Гравець",
  footer_desc: "Найбільший каталог серверів Minecraft. Знайди свій ідеальний сервер або поділись своїм.", footer_nav: "Навігація", footer_legal: "Правова інформація", footer_terms: "Умови використання", footer_privacy: "Політика конфіденційності", footer_copyright: "MCServery. Усі права захищені. Не пов'язано з Mojang Studios.", footer_contact: "Контакт", footer_support: "Підтримати нас",
  settings_language: "Мова", featured_title: "Рекомендуємо", featured_pin: "Закріпити", featured_unpin: "Відкріпити", featured_pinned: "Сервер закріплено!", featured_unpinned: "Сервер відкріплено!",
  loading: "Завантаження...", online: "Онлайн", offline: "Офлайн", players_online: "гравців онлайн",
  vote_title: "Голосувати", vote_description: "Введіть свій Minecraft нік і проголосуйте за цей сервер. Голосувати можна раз на 24 години.", vote_nick_placeholder: "Ваш Minecraft нік", vote_nick_required: "Введіть Minecraft нік", vote_nick_invalid: "Невірний нік (3-16 символів, літери, цифри, _)", vote_submit: "Голосувати", vote_success: "Голос записано!", vote_thanks: "Дякуємо за голос!", vote_next_in_24h: "Наступний голос через 24 години.", vote_cooldown: "Ви вже голосували за останні 24 години.", vote_cooldown_timer: "Голосувати знову через", vote_error: "Помилка голосування", vote_count: "голосів", vote_submit_big: "ГОЛОСУВАТИ ЗА СЕРВЕР", top_voters_title: "Найкращі голосуючі",
  sort_label: "Сортувати за", sort_votes: "Голоси", sort_likes: "Лайки", sort_players: "Гравці",
  edit_title_1: "Редагувати", edit_title_2: "сервер", edit_subtitle: "Оновіть дані вашого сервера", edit_save: "Зберегти зміни", edit_saving: "Зберігаю...", edit_save_error: "Не вдалося зберегти зміни. Спробуйте ще раз.", edit_save_success: "Сервер оновлено!", edit_fill_required: "Заповніть назву та IP-адресу", edit_not_found: "Сервер не знайдено", edit_no_permission: "У вас немає дозволу редагувати цей сервер", edit_vote_api_key: "Vote API Key", edit_vote_api_desc: "Використовуйте цей ключ у вашому Votifier/NuVotifier плагіні для доставки нагород гравцям.", edit_vote_api_copied: "API-ключ скопійовано!", edit_vote_api_endpoint: "Endpoint",
  edit_votifier_title: "Налаштування Votifier / NuVotifier", edit_votifier_desc: "Введіть дані вашого плагіна Votifier/NuVotifier для підключення голосування до Minecraft сервера.", edit_votifier_ip: "Votifier IP", edit_votifier_ip_placeholder: "напр. 123.45.67.89", edit_votifier_port: "Votifier порт", edit_votifier_port_placeholder: "напр. 8192", edit_votifier_key: "Публічний ключ Votifier", edit_votifier_key_placeholder: "Вставте RSA публічний ключ з config.yml...", edit_votifier_saved: "Налаштування Votifier збережено!", edit_votifier_ip_no_port: "Votifier IP не повинен містити порт (напр. :8192). Введіть лише IP-адресу.", edit_votifier_port_invalid: "Порт Votifier має бути числом від 1 до 65535.", edit_votifier_key_invalid: "Публічний ключ Votifier має починатися з -----BEGIN PUBLIC KEY-----",
  support_popup_title: "Підтримайте MCServery ❤️", support_popup_desc: "MCServery — безкоштовний проект. Якщо вам подобається, підтримайте нас на Ko-fi!", support_popup_btn: "Підтримати на Ko-fi", support_popup_close: "Не зараз, дякую",
  // VIP
  vip_title_1: "Отримай",
  vip_subtitle: "Закріпи свій сервер у рекомендованих та розблокуй переваги для голосуючих.",
  vip_most_popular: "Найпопулярніший",
  vip_duration_prefix: "на",
  vip_days: "днів",
  vip_feature_pinned: "Сервер закріплений у рекомендованих на головній",
  vip_feature_vote_cooldown: "Голосування за сервер кожні",
  vip_feature_badge: "VIP значок біля сервера",
  vip_feature_priority: "Пріоритетне відображення за голосами",
  vip_buy_now: "Купити зараз",
  vip_select_server_label: "Обери сервер для VIP",
  vip_select_server: "Обрати сервер",
  vip_login_required: "Для покупки VIP потрібно увійти",
  vip_discount_code: "Промокод",
  vip_discount_placeholder: "Введіть промокод...",
  vip_discount_hint: "Якщо у вас є промокод, введіть його перед покупкою для знижки 15%.",
  vip_invalid_code: "Невірний промокод",
  vip_code_expired: "Промокод вичерпано",
  vip_error: "Помилка обробки платежу",
  vip_payment_methods: "Ми приймаємо наступні способи оплати:",
  vip_verifying: "Перевірка платежу...",
  vip_success_title: "VIP активовано!",
  vip_success_desc: "Ваш сервер було успішно закріплено у рекомендованих. Дякуємо за підтримку!",
  vip_try_again: "Спробувати знову",
  filter_vip: "VIP сервери",
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
  auth_login: "Iniciar sesión", auth_register: "Registrarse", auth_login_title: "Iniciar sesión", auth_register_title: "Registro", auth_login_subtitle: "¡Bienvenido de nuevo, jugador!", auth_register_subtitle: "Crea una cuenta y comparte servidores", auth_nickname: "Apodo", auth_password: "Contraseña", auth_submit_login: "Iniciar sesión", auth_submit_register: "Crear cuenta", auth_no_account: "¿No tienes cuenta?", auth_has_account: "¿Ya tienes cuenta?", auth_switch_register: "Regístrate", auth_switch_login: "Inicia sesión", auth_login_success: "¡Sesión iniciada!", auth_register_success: "¡Registro exitoso! Revisa tu email.", auth_nickname_required: "Ingresa un apodo", auth_or: "o", auth_google: "Iniciar sesión con Google",
  profile_title_1: "Mi", profile_title_2: "perfil", profile_nickname: "Apodo", profile_save: "Guardar cambios", profile_saving: "Guardando...", profile_avatar_hint: "Haz clic para cambiar el avatar", profile_uploading: "Subiendo...", profile_bio: "Bio", profile_bio_placeholder: "Escribe algo sobre ti...", profile_nickname_empty: "El apodo no puede estar vacío", profile_save_error: "Error al guardar", profile_save_success: "¡Perfil guardado!", profile_avatar_too_large: "Imagen demasiado grande (máx 2MB)", profile_avatar_error: "Error al subir", profile_avatar_success: "¡Avatar subido!",
  user_profile_back: "Volver a servidores", user_profile_not_found: "Perfil no encontrado", user_profile_member_since: "Miembro desde", user_profile_servers: "Servidores", user_profile_no_servers: "Este jugador aún no ha añadido servidores.",
  comments_title: "Comentarios", comments_placeholder: "Escribe un comentario...", comments_login_required: "Inicia sesión para comentar", comments_login_hint: "Inicia sesión para comentar", comments_none: "Sin comentarios. ¡Sé el primero!", comments_error: "Error al añadir comentario", comments_deleted: "Comentario eliminado", comments_player: "Jugador",
  footer_desc: "El mayor catálogo de servidores de Minecraft.", footer_terms: "Términos de uso", footer_privacy: "Política de privacidad", footer_copyright: "MCServery. Todos los derechos reservados. No afiliado a Mojang Studios.", footer_contact: "Contacto", footer_support: "Apóyanos",
  settings_language: "Idioma", featured_title: "Recomendamos", featured_pin: "Fijar", featured_unpin: "Desfijar", featured_pinned: "¡Servidor fijado!", featured_unpinned: "¡Servidor desfijado!",
  loading: "Cargando...", online: "En línea", offline: "Fuera de línea", players_online: "jugadores en línea",
  vote_title: "Votar", vote_description: "Ingresa tu nick de Minecraft y vota por este servidor. Puedes votar una vez cada 24 horas.", vote_nick_placeholder: "Tu nick de Minecraft", vote_nick_required: "Ingresa tu nick de Minecraft", vote_nick_invalid: "Nick inválido (3-16 caracteres, letras, números, _)", vote_submit: "Votar", vote_success: "¡Voto registrado!", vote_thanks: "¡Gracias por votar!", vote_next_in_24h: "Podrás votar de nuevo en 24 horas.", vote_cooldown: "Ya votaste en las últimas 24 horas.", vote_cooldown_timer: "Puedes votar de nuevo en", vote_error: "Error al votar", vote_count: "votos",
  sort_label: "Ordenar por", sort_votes: "Votos", sort_likes: "Likes", sort_players: "Jugadores",
  edit_title_1: "Editar", edit_title_2: "servidor", edit_subtitle: "Actualiza los datos de tu servidor", edit_save: "Guardar cambios", edit_saving: "Guardando...", edit_save_error: "No se pudieron guardar los cambios. Inténtalo de nuevo.", edit_save_success: "¡Servidor actualizado!", edit_fill_required: "Completa el nombre y la dirección IP", edit_not_found: "Servidor no encontrado", edit_no_permission: "No tienes permiso para editar este servidor", edit_vote_api_key: "Vote API Key", edit_vote_api_desc: "Usa esta clave en tu plugin Votifier/NuVotifier para entregar recompensas a los jugadores.", edit_vote_api_copied: "¡Clave API copiada!", edit_vote_api_endpoint: "Endpoint",
  edit_votifier_title: "Configuración Votifier / NuVotifier", edit_votifier_desc: "Introduce los datos de tu plugin Votifier/NuVotifier para conectar las votaciones con tu servidor de Minecraft.", edit_votifier_ip: "IP de Votifier", edit_votifier_ip_placeholder: "ej. 123.45.67.89", edit_votifier_port: "Puerto de Votifier", edit_votifier_port_placeholder: "ej. 8192", edit_votifier_key: "Clave pública de Votifier", edit_votifier_key_placeholder: "Pega la clave pública RSA de config.yml...", edit_votifier_saved: "¡Configuración de Votifier guardada!", edit_votifier_ip_no_port: "La IP de Votifier no debe contener un puerto (ej. :8192). Introduce solo la dirección IP.", edit_votifier_port_invalid: "El puerto de Votifier debe ser un número entre 1 y 65535.", edit_votifier_key_invalid: "La clave pública de Votifier debe comenzar con -----BEGIN PUBLIC KEY-----",
  // VIP
  vip_title_1: "Obtén",
  vip_subtitle: "Fija tu servidor en los recomendados y desbloquea ventajas para los votantes.",
  vip_most_popular: "Más popular",
  vip_duration_prefix: "por",
  vip_days: "días",
  vip_feature_pinned: "Servidor fijado en recomendados en la página principal",
  vip_feature_vote_cooldown: "Votar por el servidor cada",
  vip_feature_badge: "Insignia VIP en el servidor",
  vip_feature_priority: "Visualización prioritaria por votos",
  vip_buy_now: "Comprar ahora",
  vip_select_server_label: "Selecciona un servidor para VIP",
  vip_select_server: "Seleccionar servidor",
  vip_login_required: "Debes iniciar sesión para comprar VIP",
  vip_discount_code: "Código de descuento",
  vip_discount_placeholder: "Introduce el código de descuento...",
  vip_discount_hint: "Si tienes un código de descuento, introdúcelo antes de la compra para un 15% de descuento.",
  vip_invalid_code: "Código de descuento inválido",
  vip_code_expired: "El código de descuento se ha agotado",
  vip_error: "Error al procesar el pago",
  vip_payment_methods: "Aceptamos los siguientes métodos de pago:",
  vip_verifying: "Verificando pago...",
  vip_success_title: "¡VIP activado!",
  vip_success_desc: "Tu servidor ha sido fijado en los recomendados. ¡Gracias por tu apoyo!",
  vip_try_again: "Intentar de nuevo",
  filter_vip: "Servidores VIP",
};

const pt: TranslationKeys = {
  ...en,
  nav_home: "Início", nav_servers: "Servidores", nav_add_server: "Adicionar servidor", nav_login: "Entrar", nav_profile: "Meu perfil", nav_logout: "Sair",
  hero_title_1: "Encontre o seu", hero_subtitle: "Descubra centenas de servidores, partilhe o seu e junte-se à comunidade.", hero_browse: "Explorar servidores", hero_add: "Adicionar servidor",
  stat_servers: "Servidores", stat_players: "Jogadores",
  servers_title_1: "Todos os", servers_title_2: "servidores", servers_subtitle: "Pesquise e filtre servidores de Minecraft",
  filter_search_placeholder: "Pesquisar servidor por nome ou IP...", filter_platform: "Plataforma", filter_version: "Versão", filter_all: "Todos",
  detail_view_profile: "Ver perfil →", detail_not_found: "Servidor não encontrado", detail_delete_confirm: "Tem certeza que deseja excluir este servidor?", detail_delete_error: "Erro ao excluir", detail_delete_success: "Servidor excluído", detail_edit_server: "Editar servidor", detail_delete_server: "Excluir servidor",
  auth_login_title: "Entrar", auth_register_title: "Cadastro", auth_login_subtitle: "Bem-vindo de volta, jogador!", auth_register_subtitle: "Crie uma conta e compartilhe servidores", auth_nickname: "Apelido", auth_password: "Senha", auth_submit_login: "Entrar", auth_submit_register: "Criar conta", auth_no_account: "Não tem conta?", auth_has_account: "Já tem conta?", auth_switch_register: "Cadastre-se", auth_switch_login: "Entre", auth_login_success: "Login realizado!", auth_register_success: "Cadastro realizado! Verifique seu email.", auth_nickname_required: "Digite um apelido", auth_or: "ou", auth_google: "Entrar com Google",
  profile_bio: "Bio", profile_bio_placeholder: "Escreva algo sobre você...", profile_nickname_empty: "O apelido não pode estar vazio", profile_save_error: "Erro ao salvar", profile_save_success: "Perfil salvo!", profile_avatar_too_large: "Imagem muito grande (máx 2MB)", profile_avatar_error: "Erro ao fazer upload", profile_avatar_success: "Avatar enviado!",
  user_profile_back: "Voltar aos servidores", user_profile_not_found: "Perfil não encontrado", user_profile_member_since: "Membro desde", user_profile_servers: "Servidores", user_profile_no_servers: "Este jogador ainda não adicionou servidores.",
  comments_title: "Comentários", comments_placeholder: "Escreva um comentário...", comments_login_required: "Entre para comentar", comments_login_hint: "Entre para comentar", comments_none: "Sem comentários. Seja o primeiro!", comments_error: "Erro ao adicionar comentário", comments_deleted: "Comentário excluído", comments_player: "Jogador",
  settings_language: "Idioma", featured_title: "Recomendamos", featured_pin: "Fixar", featured_unpin: "Desfixar", featured_pinned: "Servidor fixado!", featured_unpinned: "Servidor desfixado!",
  loading: "A carregar...", players_online: "jogadores online",
  footer_contact: "Contacto",
  footer_support: "Apoie-nos",
  vote_title: "Votar", vote_description: "Digite seu nick do Minecraft e vote neste servidor. Você pode votar uma vez a cada 24 horas.", vote_nick_placeholder: "Seu nick do Minecraft", vote_nick_required: "Digite seu nick do Minecraft", vote_nick_invalid: "Nick inválido (3-16 caracteres, letras, números, _)", vote_submit: "Votar", vote_success: "Voto registrado!", vote_thanks: "Obrigado pelo voto!", vote_next_in_24h: "Você poderá votar novamente em 24 horas.", vote_cooldown: "Você já votou nas últimas 24 horas.", vote_cooldown_timer: "Pode votar novamente em", vote_error: "Erro ao votar", vote_count: "votos",
  sort_label: "Ordenar por", sort_votes: "Votos", sort_likes: "Likes", sort_players: "Jogadores",
  edit_title_1: "Editar", edit_title_2: "servidor", edit_subtitle: "Atualize os dados do seu servidor", edit_save: "Salvar alterações", edit_saving: "Salvando...", edit_save_error: "Não foi possível salvar as alterações. Tente novamente.", edit_save_success: "Servidor atualizado!", edit_fill_required: "Preencha o nome e o endereço IP", edit_not_found: "Servidor não encontrado", edit_no_permission: "Você não tem permissão para editar este servidor", edit_vote_api_key: "Vote API Key", edit_vote_api_desc: "Use esta chave no seu plugin Votifier/NuVotifier para entregar recompensas aos jogadores.", edit_vote_api_copied: "Chave API copiada!", edit_vote_api_endpoint: "Endpoint",
  edit_votifier_title: "Configurações Votifier / NuVotifier", edit_votifier_desc: "Insira os dados do seu plugin Votifier/NuVotifier para conectar as votações ao seu servidor Minecraft.", edit_votifier_ip: "IP do Votifier", edit_votifier_ip_placeholder: "ex. 123.45.67.89", edit_votifier_port: "Porta do Votifier", edit_votifier_port_placeholder: "ex. 8192", edit_votifier_key: "Chave pública do Votifier", edit_votifier_key_placeholder: "Cole a chave pública RSA do config.yml...", edit_votifier_saved: "Configurações do Votifier salvas!", edit_votifier_ip_no_port: "O IP do Votifier não deve conter porta (ex. :8192). Insira apenas o endereço IP.", edit_votifier_port_invalid: "A porta do Votifier deve ser um número entre 1 e 65535.", edit_votifier_key_invalid: "A chave pública do Votifier deve começar com -----BEGIN PUBLIC KEY-----",
  // VIP
  vip_title_1: "Obtém",
  vip_subtitle: "Fixa o teu servidor nos recomendados e desbloqueia vantagens para quem vota.",
  vip_most_popular: "Mais popular",
  vip_duration_prefix: "por",
  vip_days: "dias",
  vip_feature_pinned: "Servidor fixado nos recomendados na página principal",
  vip_feature_vote_cooldown: "Votar pelo servidor a cada",
  vip_feature_badge: "Distintivo VIP no servidor",
  vip_feature_priority: "Exibição prioritária por votos",
  vip_buy_now: "Comprar agora",
  vip_select_server_label: "Seleciona um servidor para VIP",
  vip_select_server: "Selecionar servidor",
  vip_login_required: "Precisas de entrar para comprar VIP",
  vip_discount_code: "Código de desconto",
  vip_discount_placeholder: "Introduz o código de desconto...",
  vip_discount_hint: "Se tens um código de desconto, introduz-o antes da compra para 15% de desconto.",
  vip_invalid_code: "Código de desconto inválido",
  vip_code_expired: "O código de desconto foi esgotado",
  vip_error: "Erro ao processar o pagamento",
  vip_payment_methods: "Aceitamos os seguintes métodos de pagamento:",
  vip_verifying: "A verificar o pagamento...",
  vip_success_title: "VIP ativado!",
  vip_success_desc: "O teu servidor foi fixado nos recomendados. Obrigado pelo apoio!",
  vip_try_again: "Tentar novamente",
  filter_vip: "Servidores VIP",
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
  auth_login: "登录", auth_register: "注册", auth_login_title: "登录", auth_register_title: "注册", auth_login_subtitle: "欢迎回来，玩家！", auth_register_subtitle: "创建账号并分享服务器", auth_nickname: "昵称", auth_email: "邮箱", auth_password: "密码", auth_submit_login: "登录", auth_submit_register: "创建账号", auth_no_account: "没有账号？", auth_has_account: "已有账号？", auth_switch_register: "注册", auth_switch_login: "登录", auth_login_success: "登录成功！", auth_register_success: "注册成功！请查看邮件确认。", auth_nickname_required: "请输入昵称", auth_or: "或", auth_google: "使用Google登录",
  profile_title_1: "我的", profile_title_2: "资料", profile_nickname: "昵称", profile_email: "邮箱", profile_save: "保存更改", profile_saving: "保存中...", profile_avatar_hint: "点击更换头像", profile_uploading: "上传中...", profile_bio: "简介", profile_bio_placeholder: "写点关于自己的...", profile_nickname_empty: "昵称不能为空", profile_save_error: "保存失败", profile_save_success: "资料已保存！", profile_avatar_too_large: "图片太大（最大2MB）", profile_avatar_error: "上传失败", profile_avatar_success: "头像已上传！",
  user_profile_back: "返回服务器列表", user_profile_not_found: "未找到资料", user_profile_member_since: "加入于", user_profile_servers: "服务器", user_profile_no_servers: "该玩家尚未添加服务器。",
  comments_title: "评论", comments_placeholder: "写评论...", comments_login_required: "请登录后评论", comments_login_hint: "登录后评论", comments_none: "暂无评论，来第一个！", comments_error: "添加评论失败", comments_deleted: "评论已删除", comments_player: "玩家",
  footer_desc: "最大的Minecraft服务器目录。", footer_terms: "使用条款", footer_privacy: "隐私政策", footer_copyright: "MCServery。保留所有权利。与Mojang Studios无关。", footer_contact: "联系方式", footer_support: "支持我们",
  settings_language: "语言", featured_title: "推荐", featured_pin: "置顶", featured_unpin: "取消置顶", featured_pinned: "服务器已置顶！", featured_unpinned: "服务器已取消置顶！",
  loading: "加载中...", online: "在线", offline: "离线", players_online: "在线玩家",
  vote_title: "投票", vote_description: "输入你的Minecraft昵称并为此服务器投票。每24小时可投票一次。", vote_nick_placeholder: "你的Minecraft昵称", vote_nick_required: "请输入Minecraft昵称", vote_nick_invalid: "无效昵称（3-16个字符，字母、数字、_）", vote_submit: "投票", vote_success: "投票成功！", vote_thanks: "感谢投票！", vote_next_in_24h: "24小时后可再次投票。", vote_cooldown: "你在过去24小时内已投过票。", vote_error: "投票出错", vote_count: "票",
  sort_label: "排序方式", sort_votes: "投票", sort_likes: "点赞", sort_players: "玩家",
  edit_title_1: "编辑", edit_title_2: "服务器", edit_subtitle: "更新你的服务器信息", edit_save: "保存更改", edit_saving: "保存中...", edit_save_error: "无法保存更改，请重试。", edit_save_success: "服务器已更新！", edit_fill_required: "请填写名称和IP地址", edit_not_found: "服务器未找到", edit_no_permission: "你没有权限编辑此服务器", edit_vote_api_key: "Vote API Key", edit_vote_api_desc: "在你的Votifier/NuVotifier插件中使用此密钥来为玩家发放奖励。", edit_vote_api_copied: "API密钥已复制！", edit_vote_api_endpoint: "Endpoint",
  edit_votifier_title: "Votifier / NuVotifier 设置", edit_votifier_desc: "输入你的 Votifier/NuVotifier 插件数据，将投票与你的 Minecraft 服务器连接。", edit_votifier_ip: "Votifier IP", edit_votifier_ip_placeholder: "例如 123.45.67.89", edit_votifier_port: "Votifier 端口", edit_votifier_port_placeholder: "例如 8192", edit_votifier_key: "Votifier 公钥", edit_votifier_key_placeholder: "粘贴 config.yml 中的 RSA 公钥...", edit_votifier_saved: "Votifier 设置已保存！", edit_votifier_ip_no_port: "Votifier IP 不能包含端口（例如 :8192）。请仅输入 IP 地址。", edit_votifier_port_invalid: "Votifier 端口必须是 1 到 65535 之间的数字。", edit_votifier_key_invalid: "Votifier 公钥必须以 -----BEGIN PUBLIC KEY----- 开头",
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
  auth_login: "ログイン", auth_register: "新規登録", auth_login_title: "ログイン", auth_register_title: "新規登録", auth_login_subtitle: "おかえりなさい、プレイヤー！", auth_register_subtitle: "アカウントを作成してサーバーを共有", auth_nickname: "ニックネーム", auth_email: "メール", auth_password: "パスワード", auth_submit_login: "ログイン", auth_submit_register: "アカウント作成", auth_no_account: "アカウントがない？", auth_has_account: "すでにアカウントがある？", auth_switch_register: "登録する", auth_switch_login: "ログインする", auth_login_success: "ログイン成功！", auth_register_success: "登録成功！メールを確認してください。", auth_nickname_required: "ニックネームを入力してください", auth_or: "または", auth_google: "Googleでログイン",
  profile_title_1: "マイ", profile_title_2: "プロフィール", profile_nickname: "ニックネーム", profile_email: "メール", profile_save: "変更を保存", profile_saving: "保存中...", profile_avatar_hint: "クリックしてアバターを変更", profile_uploading: "アップロード中...", profile_bio: "自己紹介", profile_bio_placeholder: "自己紹介を書いてください...", profile_nickname_empty: "ニックネームは空にできません", profile_save_error: "保存エラー", profile_save_success: "プロフィール保存！", profile_avatar_too_large: "画像が大きすぎます（最大2MB）", profile_avatar_error: "アップロードエラー", profile_avatar_success: "アバターがアップロードされました！",
  user_profile_back: "サーバー一覧に戻る", user_profile_not_found: "プロフィールが見つかりません", user_profile_member_since: "メンバー登録日", user_profile_servers: "サーバー", user_profile_no_servers: "このプレイヤーはまだサーバーを追加していません。",
  comments_title: "コメント", comments_placeholder: "コメントを書く...", comments_login_required: "コメントするにはログインしてください", comments_login_hint: "コメントするにはログイン", comments_none: "コメントなし。最初のコメントを！", comments_error: "コメント追加エラー", comments_deleted: "コメント削除済み", comments_player: "プレイヤー",
  footer_desc: "最大のMinecraftサーバーカタログ。", footer_terms: "利用規約", footer_privacy: "プライバシーポリシー", footer_copyright: "MCServery。全著作権所有。Mojang Studiosとは無関係。", footer_contact: "お問い合わせ", footer_support: "サポートする",
  settings_language: "言語", featured_title: "おすすめ", featured_pin: "ピン留め", featured_unpin: "ピン解除", featured_pinned: "サーバーをピン留めしました！", featured_unpinned: "ピン留めを解除しました！",
  loading: "読み込み中...", online: "オンライン", offline: "オフライン", players_online: "オンラインプレイヤー",
  vote_title: "投票する", vote_description: "Minecraftのニックネームを入力してこのサーバーに投票しましょう。24時間ごとに1回投票できます。", vote_nick_placeholder: "Minecraftニックネーム", vote_nick_required: "Minecraftニックネームを入力してください", vote_nick_invalid: "無効なニックネーム（3-16文字、英数字、_）", vote_submit: "投票する", vote_success: "投票完了！", vote_thanks: "投票ありがとうございます！", vote_next_in_24h: "24時間後に再投票できます。", vote_cooldown: "過去24時間以内にすでに投票しています。", vote_error: "投票エラー", vote_count: "票",
  sort_label: "並び替え", sort_votes: "投票数", sort_likes: "いいね", sort_players: "プレイヤー",
  edit_title_1: "サーバーを", edit_title_2: "編集", edit_subtitle: "サーバー情報を更新", edit_save: "変更を保存", edit_saving: "保存中...", edit_save_error: "変更を保存できませんでした。もう一度お試しください。", edit_save_success: "サーバーが更新されました！", edit_fill_required: "名前とIPアドレスを入力してください", edit_not_found: "サーバーが見つかりません", edit_no_permission: "このサーバーを編集する権限がありません", edit_vote_api_key: "Vote API Key", edit_vote_api_desc: "Votifier/NuVotifierプラグインでこのキーを使用して、プレイヤーに報酬を配布します。", edit_vote_api_copied: "APIキーをコピーしました！", edit_vote_api_endpoint: "Endpoint",
  edit_votifier_title: "Votifier / NuVotifier 設定", edit_votifier_desc: "Votifier/NuVotifierプラグインのデータを入力して、投票をMinecraftサーバーに接続します。", edit_votifier_ip: "Votifier IP", edit_votifier_ip_placeholder: "例: 123.45.67.89", edit_votifier_port: "Votifier ポート", edit_votifier_port_placeholder: "例: 8192", edit_votifier_key: "Votifier 公開鍵", edit_votifier_key_placeholder: "config.ymlからRSA公開鍵を貼り付け...", edit_votifier_saved: "Votifier設定を保存しました！", edit_votifier_ip_no_port: "Votifier IPにはポートを含めないでください（例: :8192）。IPアドレスのみ入力してください。", edit_votifier_port_invalid: "Votifierポートは1から65535の数字である必要があります。", edit_votifier_key_invalid: "Votifier公開鍵は -----BEGIN PUBLIC KEY----- で始まる必要があります",
};

export const translations: Record<Locale, TranslationKeys> = { sk, cs, en, de, fr, ru, uk, es, pt, br, zh, ja };
