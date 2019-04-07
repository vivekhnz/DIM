import React from 'react';
import { DimItem } from '../inventory/item-types';
import { t } from 'i18next';
import ItemDetails from './ItemDetails';
import { ItemPopupExtraInfo } from './item-popup';
import classNames from 'classnames';
import ItemReviews from '../item-review/ItemReviews';
import { percent } from '../shell/filters';
import { Frame, Track, View, ViewPager } from 'react-view-pager';
import { ItemPopupTab } from './ItemPopupBody';
import NewItemActions from './NewItemActions';
import { DimStore } from '../inventory/store-types';
import NewItemDetails from './NewItemDetails';

/** The main portion of the item popup, with pages of info (Actions, Details, Reviews) */
export default function NewItemPopupBody({
  item,
  failureStrings,
  extraInfo,
  tab,
  isPhonePortrait,
  stores,
  onTabChanged
}: {
  item: DimItem;
  failureStrings?: string[];
  extraInfo?: ItemPopupExtraInfo;
  tab: ItemPopupTab;
  isPhonePortrait: boolean;
  stores: DimStore[];
  onTabChanged(tab: ItemPopupTab): void;
}) {
  failureStrings = Array.from(failureStrings || []);
  if (!item.canPullFromPostmaster && item.location.inPostmaster) {
    failureStrings.push(t('MovePopup.CantPullFromPostmaster'));
  }

  const tabs = [
    {
      tab: ItemPopupTab.Overview,
      title: t('MovePopup.OverviewTab'),
      component: $featureFlags.newItemPopup ? (
        <NewItemDetails item={item} extraInfo={extraInfo} stores={stores} />
      ) : (
        <ItemDetails item={item} extraInfo={extraInfo} />
      )
    }
  ];
  if (isPhonePortrait) {
    tabs.unshift({
      tab: ItemPopupTab.Actions,
      title: t('MovePopup.ActionsTab'),
      component: <NewItemActions item={item} />
    });
  }
  if (item.reviewable) {
    tabs.push({
      tab: ItemPopupTab.Reviews,
      title: t('MovePopup.ReviewsTab'),
      component: <ItemReviews item={item} />
    });
  }

  const onViewChange = (indices) => {
    onTabChanged(tabs[indices[0]].tab);
  };

  const onRest = () => onTabChanged(tab);

  return (
    <div>
      {/* TODO: Should these be in the details? Or in the header? */}
      {item.percentComplete !== 0 && !item.complete && (
        <div className="item-xp-bar" style={{ width: percent(item.percentComplete) }} />
      )}
      {failureStrings.map(
        (failureString) =>
          failureString.length > 0 && (
            <div className="item-details failure-reason" key={failureString}>
              {failureString}
            </div>
          )
      )}

      <div className="move-popup-details">
        {tabs.length > 1 ? (
          <>
            <div className="move-popup-tabs">
              {tabs.map((ta) => (
                <span
                  key={ta.tab}
                  className={classNames('move-popup-tab', {
                    selected: tab === ta.tab
                  })}
                  onClick={() => onTabChanged(ta.tab)}
                >
                  {ta.title}
                </span>
              ))}
            </div>
            <ViewPager>
              <Frame className="frame" autoSize="height">
                <Track
                  currentView={tab.toString()}
                  contain={false}
                  className="track"
                  onViewChange={onViewChange}
                  onRest={onRest}
                >
                  {tabs.map((ta) => (
                    <View key={ta.tab.toString()}>{ta.component}</View>
                  ))}
                </Track>
              </Frame>
            </ViewPager>
          </>
        ) : (
          tabs[0].component
        )}
      </div>
    </div>
  );
}
