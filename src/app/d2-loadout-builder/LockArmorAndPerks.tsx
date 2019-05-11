import React, { useMemo, useState } from 'react';
import { t } from 'app/i18next-t';
import _ from 'lodash';
import { toggleLockedItem, filterPlugs, getFilteredPerks } from './generated-sets/utils';
import { LockableBuckets, LockedItemType, BurnItem } from './types';
import { DestinyInventoryItemDefinition, DestinyClass } from 'bungie-api-ts/destiny2';
import { InventoryBuckets, InventoryBucket } from 'app/inventory/inventory-buckets';
import { D2Item, DimItem } from 'app/inventory/item-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { storesSelector } from 'app/inventory/reducer';
import { RootState } from 'app/store/reducers';
import { DimStore } from 'app/inventory/store-types';
import BungieImageAndAmmo from 'app/dim-ui/BungieImageAndAmmo';
import { AppIcon } from 'app/shell/icons';
import { faPlusCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import LoadoutBucketDropTarget from './locked-armor/LoadoutBucketDropTarget';
import { showItemPicker } from 'app/item-picker/item-picker';
import PerkPicker from './PerkPicker';
import ReactDOM from 'react-dom';
import ClosableContainer from './ClosableContainer';
import DraggableInventoryItem from 'app/inventory/DraggableInventoryItem';
import ItemPopupTrigger from 'app/inventory/ItemPopupTrigger';
import ConnectedInventoryItem from 'app/inventory/ConnectedInventoryItem';

interface ProvidedProps {
  selectedStore: DimStore;
  items: Readonly<{
    [classType: number]: Readonly<{
      [bucketHash: number]: Readonly<{ [itemHash: number]: readonly D2Item[] }>;
    }>;
  }>;
  lockedMap: Readonly<{ [bucketHash: number]: readonly LockedItemType[] }>;
  onLockedMapChanged(lockedMap: ProvidedProps['lockedMap']): void;
}

interface StoreProps {
  buckets: InventoryBuckets;
  perks: Readonly<{
    [classType: number]: Readonly<{
      [bucketHash: number]: readonly DestinyInventoryItemDefinition[];
    }>;
  }>;
  stores: DimStore[];
  isPhonePortrait: boolean;
}

type Props = ProvidedProps & StoreProps;

function mapStateToProps() {
  const perksSelector = createSelector(
    storesSelector,
    (stores) => {
      const perks: {
        [classType: number]: { [bucketHash: number]: DestinyInventoryItemDefinition[] };
      } = {};
      for (const store of stores) {
        for (const item of store.items) {
          if (
            !item ||
            !item.isDestiny2() ||
            !item.sockets ||
            // Armor and Ghosts
            (!item.bucket.inArmor && item.bucket.hash !== 4023194814)
          ) {
            continue;
          }
          for (const classType of item.classType === DestinyClass.Unknown
            ? [DestinyClass.Hunter, DestinyClass.Titan, DestinyClass.Warlock]
            : [item.classType]) {
            if (!perks[classType]) {
              perks[classType] = {};
            }
            if (!perks[classType][item.bucket.hash]) {
              perks[classType][item.bucket.hash] = [];
            }
            // build the filtered unique perks item picker
            item.sockets.sockets.filter(filterPlugs).forEach((socket) => {
              socket.plugOptions.forEach((option) => {
                perks[classType][item.bucket.hash].push(option.plugItem);
              });
            });
          }
        }
      }

      // sort exotic perks first, then by index
      Object.keys(perks).forEach((classType) =>
        Object.keys(perks[classType]).forEach((bucket) => {
          const bucketPerks = _.uniq<DestinyInventoryItemDefinition>(perks[classType][bucket]);
          bucketPerks.sort((a, b) => b.index - a.index);
          bucketPerks.sort((a, b) => b.inventory.tierType - a.inventory.tierType);
          perks[classType][bucket] = bucketPerks;
        })
      );

      return perks;
    }
  );

  return (state: RootState): StoreProps => {
    return {
      buckets: state.inventory.buckets!,
      perks: perksSelector(state),
      stores: storesSelector(state),
      isPhonePortrait: state.shell.isPhonePortrait
    };
  };
}

function LockArmorAndPerks({
  selectedStore,
  lockedMap,
  items,
  buckets,
  perks,
  stores,
  isPhonePortrait,
  onLockedMapChanged
}: Props) {
  const [filterPerksOpen, setFilterPerksOpen] = useState(false);

  const filteredPerks = useMemo(() => getFilteredPerks(selectedStore.classType, lockedMap, items), [
    selectedStore.classType,
    lockedMap,
    items
  ]);

  /**
   * Lock currently equipped items on a character
   * Recomputes matched sets
   */
  const lockEquipped = () => {
    const newLockedMap: { [bucketHash: number]: LockedItemType[] } = {};
    selectedStore.items.forEach((item) => {
      if (item.isDestiny2() && item.equipped && item.bucket.inArmor) {
        newLockedMap[item.bucket.hash] = [
          {
            type: 'item',
            item
          }
        ];
      }
    });

    onLockedMapChanged({ ...lockedMap, ...newLockedMap });
  };

  /**
   * Reset all locked items and recompute for all sets
   * Recomputes matched sets
   */
  const resetLocked = () => {
    onLockedMapChanged({});
  };

  /**
   * Adds an item to the locked map bucket
   * Recomputes matched sets
   */
  const updateLockedArmor = (bucket: InventoryBucket, locked: LockedItemType[]) =>
    onLockedMapChanged({ ...lockedMap, [bucket.hash]: locked });

  // TODO: use useReducer for locked map mutations, and simplify the data model?

  const setLockedItem = (item: D2Item) => {
    // TODO: check to see that there's not another locked item with that type, and if there is, replace it!
    onLockedMapChanged({
      ...lockedMap,
      [item.bucket.hash]: [
        ...(lockedMap[item.bucket.hash] || []),
        {
          type: 'item',
          item
        }
      ]
    });
  };
  const setExcludedItem = (item: D2Item) => {
    onLockedMapChanged({
      ...lockedMap,
      [item.bucket.hash]: [
        ...(lockedMap[item.bucket.hash] || []),
        {
          type: 'exclude',
          item
        }
      ]
    });
  };
  const removeExcludedItem = (lockedItem: LockedItemType) => {
    const bucketHash = (lockedItem.item as D2Item).bucket.hash;

    onLockedMapChanged({
      ...lockedMap,
      [bucketHash]: (lockedMap[bucketHash] || []).filter(
        (li) => li.type !== 'exclude' || (li.item as D2Item).id !== (lockedItem.item as D2Item).id
      )
    });
  };
  const removeLockedItem = (lockedItem: LockedItemType) => {
    const bucketHash = (lockedItem.item as D2Item).bucket.hash;

    onLockedMapChanged({
      ...lockedMap,
      [bucketHash]: (lockedMap[bucketHash] || []).filter(
        (li) => li.type !== 'item' || (li.item as D2Item).id !== (lockedItem.item as D2Item).id
      )
    });
  };
  const removeLockedPerk = (lockedItem: LockedItemType) => {
    onLockedMapChanged(
      _.mapValues(lockedMap, (values) =>
        values.filter(
          (li) =>
            li.type !== 'perk' ||
            (li.item as DestinyInventoryItemDefinition).hash !==
              (lockedItem.item as DestinyInventoryItemDefinition).hash
        )
      )
    );
  };
  const removeLockedBurn = (lockedItem: LockedItemType) => {
    onLockedMapChanged(
      _.mapValues(lockedMap, (values) =>
        values.filter(
          (li) =>
            li.type !== 'burn' ||
            (li.item as BurnItem).index !== (lockedItem.item as BurnItem).index
        )
      )
    );
  };

  const chooseItem = (updateFunc: (item: D2Item) => void) => async (e) => {
    e.preventDefault();

    try {
      const { item } = await showItemPicker({
        hideStoreEquip: true,
        filterItems: (item: DimItem) =>
          Boolean(item.bucket.inArmor && item.canBeEquippedBy(selectedStore))
      });

      updateFunc(item as D2Item);
    } catch (e) {}
  };

  const onPerkSelected = (item: LockedItemType, bucket: InventoryBucket) => {
    toggleLockedItem(item, bucket, updateLockedArmor, lockedMap[bucket.hash]);
  };

  const chooseLockItem = chooseItem(setLockedItem);
  const chooseExcludeItem = chooseItem(setExcludedItem);

  let flatLockedMap = _.groupBy(
    Object.values(lockedMap).flatMap((items) => items),
    (item) => item.type
  );

  const order = Object.values(LockableBuckets);
  flatLockedMap = _.mapValues(flatLockedMap, (items, key) =>
    key === 'item' || key === 'exclude'
      ? _.sortBy(items, (i) => order.indexOf((i.item as D2Item).bucket.hash))
      : items
  );

  const storeIds = stores.filter((s) => !s.isVault).map((s) => s.id);
  const bucketTypes = buckets.byCategory.Armor.map((b) => b.type!);

  return (
    <div>
      <h3>{t('LoadoutBuilder.SelectLockedItems')}</h3>
      <LoadoutBucketDropTarget
        className="area"
        storeIds={storeIds}
        bucketTypes={bucketTypes}
        onItemLocked={setLockedItem}
      >
        {(!flatLockedMap.item || flatLockedMap.item.length === 0) && (
          <div>Drop items here to lock</div>
        )}
        <div className="item-grid">
          {(flatLockedMap.item || []).map((lockedItem) => (
            <LockedItem
              key={(lockedItem.item as D2Item).id}
              lockedItem={lockedItem}
              onRemove={removeLockedItem}
            />
          ))}
        </div>
        <button className="dim-button" onClick={chooseLockItem}>
          <AppIcon icon={faPlusCircle} /> Lock Item
        </button>
        <button className="dim-button" onClick={lockEquipped}>
          <AppIcon icon={faPlusCircle} /> {t('LoadoutBuilder.LockEquipped')}
        </button>
      </LoadoutBucketDropTarget>
      <LoadoutBucketDropTarget
        className="area"
        storeIds={storeIds}
        bucketTypes={bucketTypes}
        onItemLocked={setExcludedItem}
      >
        {(!flatLockedMap.exclude || flatLockedMap.exclude.length === 0) && (
          <div>Drop items here to exclude</div>
        )}
        <div className="item-grid">
          {(flatLockedMap.exclude || []).map((lockedItem) => (
            <LockedItem
              key={(lockedItem.item as D2Item).id}
              lockedItem={lockedItem}
              onRemove={removeExcludedItem}
            />
          ))}
        </div>
        <button className="dim-button" onClick={chooseExcludeItem}>
          <AppIcon icon={faTimesCircle} /> Exclude Item
        </button>
      </LoadoutBucketDropTarget>
      <div className="area">
        <div className="item-grid">
          {(flatLockedMap.perk || []).map((lockedItem) => (
            <LockedItem
              key={(lockedItem.item as DestinyInventoryItemDefinition).index}
              lockedItem={lockedItem}
              onRemove={removeLockedPerk}
            />
          ))}
          {(flatLockedMap.burn || []).map((lockedItem) => (
            <LockedItem
              key={(lockedItem.item as BurnItem).index}
              lockedItem={lockedItem}
              onRemove={removeLockedBurn}
            />
          ))}
        </div>
        <button className="dim-button" onClick={() => setFilterPerksOpen(true)}>
          <AppIcon icon={faPlusCircle} /> Lock Perk
          {filterPerksOpen &&
            ReactDOM.createPortal(
              <PerkPicker
                perks={perks[selectedStore.classType]}
                filteredPerks={filteredPerks}
                lockedMap={lockedMap}
                buckets={buckets}
                isPhonePortrait={isPhonePortrait}
                onClose={() => setFilterPerksOpen(false)}
                onPerkSelected={onPerkSelected}
              />,
              document.body
            )}
        </button>
      </div>
      <button className="dim-button" onClick={resetLocked}>
        {t('LoadoutBuilder.ResetLocked')}
      </button>
    </div>
  );
}

export default connect<StoreProps>(mapStateToProps)(LockArmorAndPerks);

function LockedItem({
  lockedItem,
  onRemove
}: {
  lockedItem: LockedItemType;
  onRemove(item: LockedItemType): void;
}) {
  switch (lockedItem.type) {
    case 'item':
    case 'exclude':
      return (
        <ClosableContainer
          onClose={() => onRemove(lockedItem)}
          key={(lockedItem.item as D2Item).id}
        >
          <DraggableInventoryItem item={lockedItem.item as D2Item}>
            <ItemPopupTrigger item={lockedItem.item as D2Item}>
              <ConnectedInventoryItem item={lockedItem.item as D2Item} />
            </ItemPopupTrigger>
          </DraggableInventoryItem>
        </ClosableContainer>
      );

    case 'perk':
      return (
        <ClosableContainer
          onClose={() => onRemove(lockedItem)}
          key={(lockedItem.item as DestinyInventoryItemDefinition).index}
        >
          <BungieImageAndAmmo
            hash={(lockedItem.item as DestinyInventoryItemDefinition).hash}
            className="empty-item"
            title={(lockedItem.item as DestinyInventoryItemDefinition).displayProperties.name}
            src={(lockedItem.item as DestinyInventoryItemDefinition).displayProperties.icon}
          />
        </ClosableContainer>
      );

    case 'burn':
      return (
        <ClosableContainer
          onClose={() => onRemove(lockedItem)}
          key={(lockedItem.item as BurnItem).index}
        >
          <img
            key={(lockedItem.item as BurnItem).index}
            className={`empty-item ${(lockedItem.item as BurnItem).index}`}
            title={(lockedItem.item as BurnItem).displayProperties.name}
            src={(lockedItem.item as BurnItem).displayProperties.icon}
          />
        </ClosableContainer>
      );
  }
}
