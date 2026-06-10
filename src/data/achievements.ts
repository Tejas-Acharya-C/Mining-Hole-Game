import type { AchievementDef, AchievementId } from '../types';

export const ACHIEVEMENT_DEFS: Record<AchievementId, AchievementDef> = {
  // Exploration
  first_dig:      { id: 'first_dig',      label: 'First Strike',      description: 'Dig your first tile.',                        category: 'exploration', points: 5  },
  depth_10:       { id: 'depth_10',       label: 'Ankle Deep',        description: 'Reach depth 10.',                             category: 'exploration', points: 5  },
  depth_25:       { id: 'depth_25',       label: 'Going Down',        description: 'Reach depth 25.',                             category: 'exploration', points: 10 },
  depth_50:       { id: 'depth_50',       label: 'Spelunker',         description: 'Reach depth 50.',                             category: 'exploration', points: 15 },
  depth_100:      { id: 'depth_100',      label: 'Abyss Walker',      description: 'Reach depth 100.',                            category: 'exploration', points: 25 },
  depth_200:      { id: 'depth_200',      label: 'World Shaker',      description: 'Reach depth 200.',                            category: 'exploration', points: 40 },
  depth_500:      { id: 'depth_500',      label: 'To The Core',       description: 'Reach depth 500.',                            category: 'exploration', points: 100 },
  crystal_cavern: { id: 'crystal_cavern', label: 'Crystal Explorer',  description: 'Discover the Crystal Caverns biome.',         category: 'exploration', points: 20 },
  fossil_zone_found: { id: 'fossil_zone_found', label: 'Archaeologist', description: 'Discover the Fossil Zone biome.',           category: 'exploration', points: 15 },
  void_realm_found:  { id: 'void_realm_found',  label: 'Void Walker',   description: 'Enter the Void Realm.',                     category: 'exploration', points: 35 },
  biome_explorer: { id: 'biome_explorer',  label: 'Biome Collector',  description: 'Discover 5 different biomes.',                category: 'exploration', points: 30 },
  deep_diver:     { id: 'deep_diver',     label: 'Deep Diver',        description: 'Go from surface to depth 50 in one trip.',   category: 'exploration', points: 25 },
  surface_sprinter:{ id: 'surface_sprinter', label: 'Surface Sprinter', description: 'Return to the surface 20 times.',          category: 'exploration', points: 10 },
  jetpack_user:   { id: 'jetpack_user',   label: 'Skyward',           description: 'Use the jetpack upgrade.',                    category: 'exploration', points: 20 },

  // Economy
  first_sale:     { id: 'first_sale',     label: 'First Sale',        description: 'Sell items for the first time.',              category: 'economy', points: 5  },
  broke:          { id: 'broke',          label: 'Rock Bottom',       description: 'Have $0 after spending on an upgrade.',       category: 'economy', points: 5  },
  rich_1k:        { id: 'rich_1k',        label: 'Getting Somewhere', description: 'Earn $1,000 total.',                         category: 'economy', points: 10 },
  rich_10k:       { id: 'rich_10k',       label: 'Prospector',        description: 'Earn $10,000 total.',                        category: 'economy', points: 20 },
  rich_100k:      { id: 'rich_100k',      label: 'Magnate',           description: 'Earn $100,000 total.',                       category: 'economy', points: 50 },
  sell_10_times:  { id: 'sell_10_times',  label: 'Market Regular',    description: 'Sell items 10 times.',                       category: 'economy', points: 10 },
  sell_total_1k:  { id: 'sell_total_1k',  label: 'Merchant',          description: 'Sell a total of $1,000 worth.',              category: 'economy', points: 15 },
  sell_total_10k: { id: 'sell_total_10k', label: 'Trade Baron',       description: 'Sell a total of $10,000 worth.',             category: 'economy', points: 30 },
  sold_while_full:{ id: 'sold_while_full',label: 'Bulk Seller',       description: 'Sell a full inventory in one transaction.',  category: 'economy', points: 15 },

  // Upgrades
  first_upgrade:  { id: 'first_upgrade',  label: 'Upgrade!',          description: 'Buy your first upgrade.',                    category: 'completion', points: 5  },
  max_shovel:     { id: 'max_shovel',     label: 'Master Digger',     description: 'Max out the shovel.',                        category: 'completion', points: 30 },
  max_battery:    { id: 'max_battery',    label: 'Fully Charged',     description: 'Max out the battery.',                       category: 'completion', points: 25 },
  max_lantern:    { id: 'max_lantern',    label: 'Beacon',            description: 'Max out the lantern.',                       category: 'completion', points: 20 },
  all_upgrades:   { id: 'all_upgrades',   label: 'Fully Equipped',    description: 'Purchase every upgrade at least once.',      category: 'completion', points: 50 },

  // Collection
  collect_coal_50:{ id: 'collect_coal_50',  label: 'Coal Miner',      description: 'Collect 50 coal.',                           category: 'collection', points: 10 },
  collect_gold_25:{ id: 'collect_gold_25',  label: 'Gold Rush',       description: 'Collect 25 gold nuggets.',                   category: 'collection', points: 20 },
  collect_crystal_5:{ id: 'collect_crystal_5', label: 'Crystal Hoarder', description: 'Collect 5 void crystals.',               category: 'collection', points: 25 },
  found_relic:    { id: 'found_relic',    label: 'Relic Hunter',      description: 'Find a Strange Relic.',                      category: 'collection', points: 20 },
  found_artifact: { id: 'found_artifact', label: 'The Discovery',     description: 'Unearth the Lost Artifact.',                 category: 'collection', points: 100, hidden: true },
  found_void_crystal: { id: 'found_void_crystal', label: 'Void Touched', description: 'Collect a Void Shard.',                  category: 'collection', points: 30, hidden: true },
  found_ancient_coin: { id: 'found_ancient_coin', label: 'Numismatist', description: 'Find an Ancient Coin.',                   category: 'collection', points: 25, hidden: true },
  ore_collector:  { id: 'ore_collector',  label: 'Ore Collector',     description: 'Collect at least 1 of every ore type.',     category: 'collection', points: 40 },
  legendary_find: { id: 'legendary_find', label: 'Legendary Find',    description: 'Collect a legendary rarity item.',           category: 'collection', points: 35 },
  mythic_find:    { id: 'mythic_find',    label: 'Beyond Legend',     description: 'Collect a mythic rarity item.',              category: 'collection', points: 75, hidden: true },

  // Digging
  dig_100:        { id: 'dig_100',        label: 'Hundred Holes',     description: 'Dig 100 tiles.',                             category: 'completion', points: 10 },
  dig_500:        { id: 'dig_500',        label: 'Five Hundred',      description: 'Dig 500 tiles.',                             category: 'completion', points: 20 },
  dig_1000:       { id: 'dig_1000',       label: 'Thousand Cuts',     description: 'Dig 1,000 tiles.',                           category: 'completion', points: 30 },
  dig_5000:       { id: 'dig_5000',       label: 'Erosion',           description: 'Dig 5,000 tiles.',                           category: 'completion', points: 50 },

  // Speed
  speed_runner:   { id: 'speed_runner',   label: 'Speed Runner',      description: 'Find the artifact in under 15 minutes.',     category: 'speed', points: 50 },
  marathon_miner: { id: 'marathon_miner', label: 'Marathon Miner',    description: 'Play for 2 hours in one session.',           category: 'speed', points: 20 },
  insomniac:      { id: 'insomniac',      label: 'Insomniac',         description: 'Play for 4 hours total.',                    category: 'speed', points: 30 },

  // Quests
  quest_complete_3:  { id: 'quest_complete_3',  label: 'Quest Seeker',  description: 'Complete 3 quests.',                      category: 'completion', points: 15 },
  quest_complete_all:{ id: 'quest_complete_all', label: 'Quest Master', description: 'Complete all quests.',                     category: 'completion', points: 60 },

  // Secrets & Misc
  secret_hunter:  { id: 'secret_hunter',  label: 'Secret Hunter',     description: 'Find a secret hidden chamber.',             category: 'secrets', points: 40, hidden: true },
  inventory_full: { id: 'inventory_full', label: 'Pack Rat',          description: 'Fill your inventory to capacity.',          category: 'collection', points: 10 },
  no_energy_dig:  { id: 'no_energy_dig',  label: 'Determined',        description: 'Try to dig with 0 energy.',                 category: 'secrets', points: 5 },
  completionist:  { id: 'completionist',  label: 'Completionist',     description: 'Unlock every other achievement.',           category: 'completion', points: 200, hidden: true },
};
