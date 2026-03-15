-- Predĺž VIP pre testovanie tier badge
UPDATE servers 
SET vip_expires_at = '2026-04-15T13:13:27.799624+00' 
WHERE name = 'PvPMania.eu';

-- Blockville tiež predĺž
UPDATE servers 
SET vip_expires_at = '2026-04-15T12:00:00+00',
    vote_cooldown_hours = 2
WHERE name = 'Blockville';