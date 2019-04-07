import React from 'react';
import { DimItem } from '../inventory/item-types';
import classNames from 'classnames';
import ExternalLink from '../dim-ui/ExternalLink';
import { settings } from '../settings/settings';
import styles from './NewItemPopupHeader.m.scss';
import { DestinyClass } from 'bungie-api-ts/destiny2';
import { AppIcon, lockIcon } from '../shell/icons';

export default function NewItemPopupHeader({ item }: { item: DimItem }) {
  // TODO: lock, track, rating, tag
  // TODO: is the subheader too large?
  // TODO: only show level if not all chars can get there?
  // TODO: use destiny-icons and add the release icon on the corner??
  // TODO: move the power stuff into the details tab???

  const classType =
    item.classType !== DestinyClass.Unknown &&
    // These already include the class name
    item.type !== 'ClassItem' &&
    item.type !== 'Artifact' &&
    item.type !== 'Class' &&
    item.classTypeNameLocalized[0].toUpperCase() + item.classTypeNameLocalized.slice(1);

  return (
    <div className={classNames(styles.itemHeader, `is-${item.tier}`)}>
      <div className={classNames(styles.titleContainer, { [styles.masterwork]: item.masterwork })}>
        <div className={styles.itemTitle}>
          <ExternalLink href={destinyDBLink(item)}>{item.name}</ExternalLink>
        </div>
        <div className={styles.subTitle}>
          <div>
            {classType ? classType + ' ' : ''}
            {item.typeName}
          </div>
          {/* TODO: use localized tier */}
          <div>
            <span>{item.tier}</span>
            {/* TODO: this is too close to the close button */}
            {item.locked && <AppIcon icon={lockIcon} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function destinyDBLink(item: DimItem) {
  // DTR 404s on the new D2 languages for D1 items
  let language = settings.language;
  if (item.destinyVersion === 1) {
    switch (language) {
      case 'es-mx':
        language = 'es';
        break;
      case 'pl':
      case 'ru':
      case 'zh-cht':
      case 'zh-chs':
        language = 'en';
        break;
    }
  } else {
    // For D2, DTR uses English for es-mx
    switch (language) {
      case 'es-mx':
        language = 'es';
        break;
    }
  }
  return `http://db.destinytracker.com/d${item.destinyVersion}/${settings.language}/items/${
    item.hash
  }`;
}
