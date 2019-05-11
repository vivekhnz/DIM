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

export interface ArmorSet {
  id: number;
  // An array of arrays of items, each of which could satisfy the given slot
  armor: D2Item[][];
  stats: { [statType in StatTypes]: number };
  statChoices: number[][];
}

// bucket lookup, also used for ordering of the buckets.
export const LockableBuckets = {
  helmet: 3448274439,
  gauntlets: 3551918588,
  chest: 14239492,
  leg: 20886954,
  classitem: 1585787867,
  ghost: 4023194814
};
