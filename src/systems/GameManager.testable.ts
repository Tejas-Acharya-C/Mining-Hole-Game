/**
 * Thin re-export shim that makes GameManager functions available
 * in the test environment without triggering audio, DOM, or browser APIs.
 */
export {
  createInitialState,
  tryDig,
  tryMove,
  sellInventory,
  buyUpgrade,
  tickEnergy,
  tickFloatTexts,
  tickScreenShake,
  revealAround,
  updateBiome,
  spawnFloat,
  unlockAchievement,
  playerDepth,
  tickEvents,
  consumeEnergyCell,
  updateQuestProgress,
  useTeleport,
  tickBiomeTransition,
  triggerDiscoveryAlert,
  interactAncientTerminal,
  interactResonanceStabilizer,
  triggerEnding,
  tryCollectItem,
  tickHazards,
  startNewExpedition,
} from './GameManager';
