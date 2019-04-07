import React from 'react';
import { t } from 'i18next';
import styles from './ItemSubDetails.m.scss';
import { DestinyAmmunitionType } from 'bungie-api-ts/destiny2';
import { DimItem } from '../inventory/item-types';
import { DimStore } from '../inventory/store-types';
import ItemTagSelector from './ItemTagSelector';
import ExpandedRating from './ExpandedRating';

// TODO: localize
const ammoNames = {
  [DestinyAmmunitionType.Primary]: 'Primary',
  [DestinyAmmunitionType.Special]: 'Special',
  [DestinyAmmunitionType.Heavy]: 'Heavy'
};
/* TODO: handle consumables/bounties/etc differently */

const ammoClasses = {
  [DestinyAmmunitionType.Primary]: styles.primaryAmmo,
  [DestinyAmmunitionType.Special]: styles.specialAmmo,
  [DestinyAmmunitionType.Heavy]: styles.heavyAmmo
};

const elements = {
  arc: styles.arcIcon,
  void: styles.voidIcon,
  solar: styles.solarIcon
};

// TODO: this is a bad name

/** This is the light and element info for an item. */
export default function ItemSubDetails({ item, stores }: { item: DimItem; stores: DimStore[] }) {
  const light = item.primStat ? item.primStat.value.toString() : undefined;

  const showRequiredLevel =
    item.equipRequiredLevel > 0 && stores.some((s) => s.level < item.equipRequiredLevel);

  return (
    <div className={styles.subSection}>
      {showRequiredLevel && (
        <div className={styles.requiredLevel}>Requires Level {item.equipRequiredLevel}</div>
      )}
      <div className={styles.powerInfo}>
        <div className={elements[item.dmg] || styles.powerElement}>
          {item.dmg && item.dmg !== 'kinetic' && <div className={styles.element} />} {light}
          {(!item.isDestiny2() || item.ammoType === 0) && (
            <span className={styles.primaryStatName}>Power</span>
          )}
        </div>
        {item.isDestiny2() && item.ammoType > 0 && (
          <div className={styles.ammo}>
            <div className={ammoClasses[item.ammoType]} />
            {ammoNames[item.ammoType]}
          </div>
        )}
        <div className={styles.extraStuff}>
          {item.objectives && !item.hidePercentage && (
            <div>{t('ItemService.PercentComplete', { percent: item.percentComplete })}</div>
          )}

          {item.taggable && <ItemTagSelector item={item} />}

          {item.reviewable && <ExpandedRating item={item} />}
        </div>
      </div>
    </div>
  );
}
