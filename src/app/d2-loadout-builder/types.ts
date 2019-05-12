import { D2Item } from '../inventory/item-types';
import { DestinyInventoryItemDefinition } from 'bungie-api-ts/destiny2';

export type StatTypes = 'Mobility' | 'Resilience' | 'Recovery';
export type BurnTypes = 'arc' | 'solar' | 'void';

export interface MinMax {
  min: number;
  max: number;
}

export interface BurnItem {
  index: BurnTypes;
  displayProperties: {
    name: string;
    icon: string;
  };
}

// TODO: use a tagged union (or just store them separately)
export interface LockedItemType {
  type: 'item' | 'perk' | 'burn' | 'exclude';
  item: D2Item | DestinyInventoryItemDefinition | BurnItem;
}

/**
 * An individual "stat mix" of loadouts where each slot has a list of items with the same stat options.
 */
export interface ArmorSet {
  id: number;
  /** For each armor type (see LockableBuckets), this is the list of items that could interchangeably be put into this loadout. */
  armor: D2Item[][];
  /** The overall stats for the loadout as a whole. */
  stats: { [statType in StatTypes]: number };
  /** The chosen stats for each armor type, as a list in the order Mobility/Resiliency/Recovery. */
  statChoices: number[][];
}

/**
 * Bucket lookup, also used for ordering of the buckets.
 */
export const LockableBuckets = {
  helmet: 3448274439,
  gauntlets: 3551918588,
  chest: 14239492,
  leg: 20886954,
  classitem: 1585787867,
  ghost: 4023194814
};
