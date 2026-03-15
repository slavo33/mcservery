-- Dočasná zmena pre testovanie VIP tierov
-- Crownix.eu bude mať Pro tier (4h cooldown)
UPDATE servers SET vote_cooldown_hours = 4 WHERE name = 'Crownix.eu';

-- PvPMania.eu bude mať Max tier (2h cooldown)  
UPDATE servers SET vote_cooldown_hours = 2 WHERE name = 'PvPMania.eu';

-- Blockville bude mať Max tier (2h cooldown)
UPDATE servers SET vote_cooldown_hours = 2 WHERE name = 'Blockville';