import { t } from 'app/i18next-t';
import React, { useMemo } from 'react';
import { D2Store } from '../../inventory/store-types';
import { ArmorSet, MinMax, StatTypes } from '../types';
import TierSelect from './TierSelect';
import _ from 'lodash';
import { D2ManifestDefinitions } from 'app/destiny2/d2-definitions.service';
import styles from './FilterBuilds.m.scss';

export default function FilterBuilds({
  sets,
  minimumPower,
  selectedStore,
  stats,
  defs,
  order,
  onMinimumPowerChanged,
  onStatOrderChanged,
  onStatFiltersChanged
}: {
  sets: readonly ArmorSet[];
  minimumPower: number;
  selectedStore: D2Store;
  stats: { [statType in StatTypes]: MinMax };
  defs: D2ManifestDefinitions;
  order: StatTypes[];
  onMinimumPowerChanged(minimumPower: number): void;
  onStatOrderChanged(order: StatTypes[]): void;
  onStatFiltersChanged(stats: { [statType in StatTypes]: MinMax }): void;
}) {
  const statRanges = useMemo(() => {
    const statRanges = {
      Mobility: { min: 10, max: 0 },
      Resilience: { min: 10, max: 0 },
      Recovery: { min: 10, max: 0 }
    };
    for (const set of sets) {
      for (const prop of ['Mobility', 'Resilience', 'Recovery']) {
        statRanges[prop].min = Math.min(set.stats[prop], statRanges[prop].min);
        statRanges[prop].max = Math.max(set.stats[prop], statRanges[prop].max);
      }
    }
    return statRanges;
  }, [sets]);

  const powerLevelOptions = useMemo(
    () => _.range(selectedStore.stats.maxBasePower!.tierMax || 0, -1, -1),
    [selectedStore]
  );

  const setMinimumPower: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    onMinimumPowerChanged(parseInt(event.target.value, 10));
  };

  return (
    <div>
      <h3>{t('LoadoutBuilder.SelectFilters')}</h3>
      <div className={styles.filters}>
        <TierSelect
          rowClassName={styles.row}
          stats={stats}
          statRanges={statRanges}
          defs={defs}
          order={order}
          onStatFiltersChanged={onStatFiltersChanged}
          onStatOrderChanged={onStatOrderChanged}
        />
        <div className={styles.row}>
          <span className={styles.power}>{t('LoadoutBuilder.SelectPower')}</span>
          <select value={minimumPower} onChange={setMinimumPower}>
            {powerLevelOptions.map((power) => {
              if (power === 0) {
                return (
                  <option value={0} key={power}>
                    {t('LoadoutBuilder.SelectPowerMinimum')}
                  </option>
                );
              }
              return <option key={power}>{power}</option>;
            })}
          </select>
        </div>
      </div>
    </div>
  );
}
