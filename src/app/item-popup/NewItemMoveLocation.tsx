import React from 'react';
import { DimItem } from '../inventory/item-types';
import { DimStore } from '../inventory/store-types';
import { t } from 'i18next';

interface Props {
  item: DimItem;
  itemOwnerStore: DimStore;
  store: DimStore;
  moveItemTo(store: DimStore, equip?: boolean): void;
}

/**
 * Buttons for the ItemActions component. These show the applicable
 * actions for the given store to move/equip the given item.
 */
export default class NewItemMoveLocation extends React.PureComponent<Props> {
  render() {
    const { item, store } = this.props;

    const vaultAction = this.canShowVault(store);
    const equipAction = !(item.owner === store.id && item.equipped) && item.canBeEquippedBy(store);
    const storeAction = this.canShowStore(store);
    const anyAction = vaultAction || equipAction || storeAction;

    if (!anyAction) {
      return null;
    }

    return (
      <div className="locations" key={store.id}>
        <h2>
          <img src={store.icon} /> {store.name}
        </h2>
        <div className="buttons">
          {vaultAction && (
            <div className="move-button move-vault" title={store.name} onClick={this.moveItem}>
              <span>{t('MovePopup.Vault')}</span>
            </div>
          )}
          {equipAction && (
            <div className="move-button move-equip" title={store.name} onClick={this.equipItem}>
              <span>{t('MovePopup.Equip')}</span>
            </div>
          )}
          {storeAction && (
            <div className="move-button move-store" title={store.name} onClick={this.moveItem}>
              <span>{t('MovePopup.Store')}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  private moveItem = () => this.props.moveItemTo(this.props.store);
  private equipItem = () => this.props.moveItemTo(this.props.store, true);

  private canShowVault = (buttonStore: DimStore): boolean => {
    const { item, itemOwnerStore: store } = this.props;

    // If my store is the vault, don't show a vault button.
    // Can't vault a vaulted item.
    if (!store || store.isVault) {
      return false;
    }

    // If my buttonStore is not the vault, then show a vault button.
    if (!buttonStore.isVault) {
      return false;
    }

    // Can't move this item away from the current itemStore.
    if (item.notransfer) {
      return false;
    }

    if (item.location.inPostmaster) {
      return false;
    }

    return true;
  };

  private canShowStore = (buttonStore: DimStore): boolean => {
    const { item, itemOwnerStore: store } = this.props;

    // Can't store into a vault
    if (buttonStore.isVault || !store) {
      return false;
    }

    // Can pull items from the postmaster to the same character
    if (item.location.inPostmaster && item.location.type !== 'Engrams') {
      return store.id === buttonStore.id && item.isDestiny2() && item.canPullFromPostmaster;
    } else if (item.notransfer) {
      // Can store an equiped item in same itemStore
      if (item.equipped && store.id === buttonStore.id) {
        return true;
      }
    } else if (store.id !== buttonStore.id || item.equipped) {
      // In Destiny2, only show one store for account wide items
      if (item.isDestiny2() && item.bucket && item.bucket.accountWide && !buttonStore.current) {
        return false;
      } else {
        return true;
      }
    }

    return false;
  };
}
