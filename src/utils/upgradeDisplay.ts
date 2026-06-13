import type { UpgradeId } from '../types';
import {
  UPGRADE_DEFS, shovelDamage, maxEnergy, energyRegen,
  inventoryCapacity, lightRadius, moveCooldown, critChance,
  energyCostReduction,
} from '../data/upgrades';

/** Human-readable before → after stat line for shop cards and purchase feedback. */
export function getUpgradeStatComparison(id: UpgradeId, level: number): string | null {
  const next = level + 1;
  switch (id) {
    case 'shovel':
      return `Damage: ${shovelDamage(level)} ➔ ${shovelDamage(next)}`;
    case 'backpack':
      return `Cargo: ${inventoryCapacity(level)} ➔ ${inventoryCapacity(next)} slots`;
    case 'battery':
      return `Energy: ${maxEnergy(level)} max / +${energyRegen(level)} regen ➔ ${maxEnergy(next)} max / +${energyRegen(next)} regen`;
    case 'lantern':
      return `Light Radius: ${lightRadius(level)} ➔ ${lightRadius(next)} tiles`;
    case 'boots':
      return `Move Cooldown: ${moveCooldown(level)}ms ➔ ${moveCooldown(next)}ms`;
    case 'drill':
      return `Drill Chance: ${level * 25}% ➔ ${next * 25}%`;
    case 'critical_chance':
      return `Crit Chance: ${Math.round(critChance(level) * 100)}% ➔ ${Math.round(critChance(next) * 100)}%`;
    case 'reinforced_picks':
      return `Dig Energy Cost: -${energyCostReduction(level)} ➔ -${energyCostReduction(next)}`;
    case 'ore_detector':
      return `Glow Range: ${level * 3} tiles ➔ ${next * 3} tiles`;
    case 'scanner':
      return `Scan Range: ${level * 4} tiles ➔ ${next * 4} tiles`;
    case 'teleport':
      return `Charges: ${level} ➔ ${next}`;
    case 'artifact_sense':
      return `Objective Range: ${level * 50}m ➔ ${next * 50}m`;
    case 'market_uplink':
      return 'Uplink: Remote Selling Unlocked';
    case 'jetpack':
      return 'Flight: Controls Restriction Removed';
    default:
      return null;
  }
}

export function getUpgradePurchaseLabel(id: UpgradeId, level: number): string {
  const def = UPGRADE_DEFS[id];
  const comparison = getUpgradeStatComparison(id, level);
  return comparison ? `${def.icon} ${comparison}` : `${def.icon} ${def.label} upgraded`;
}
