import React from 'react';
import { D2ManifestDefinitions } from '../destiny2/d2-definitions';
import {
  DestinyProfileResponse,
  DestinyScope,
  DestinyRecordDefinition,
  DestinyRecordState,
  DestinyRecordComponent,
  DestinyUnlockValueUIStyle,
  DestinyObjectiveProgress
} from 'bungie-api-ts/destiny2';
import clsx from 'clsx';
import './Record.scss';
import Objective from '../progress/Objective';
import BungieImage from '../dim-ui/BungieImage';
import { t } from 'app/i18next-t';
import ishtarIcon from '../../images/ishtar-collective.svg';
import ExternalLink from '../dim-ui/ExternalLink';
import idx from 'idx';
import trackedIcon from 'images/trackedIcon.svg';
import catalystIcons from 'data/d2/catalyst-triumph-icons.json';
import { percent } from 'app/shell/filters';
import _ from 'lodash';

interface Props {
  recordHash: number;
  defs: D2ManifestDefinitions;
  profileResponse: DestinyProfileResponse;
  completedRecordsHidden: boolean;
  redactedRecordsRevealed: boolean;
}

interface RecordInterval {
  objective: DestinyObjectiveProgress;
  score: number;
  percentCompleted: number;
  isRedeemed: boolean;
}

interface TriumphInfo {
  redeemed: boolean;
  unlocked: boolean;
  obscured: boolean;
  tracked: boolean;

  recordIcon?: string;
  name?: string;
  description?: string;
  scoreValue?: JSX.Element;
  objectives?: DestinyObjectiveProgress[];
  loreLink?: string;
  intervals: RecordInterval[];
}

const overrideIcons = Object.keys(catalystIcons).map(Number);

export default function Record({
  recordHash,
  defs,
  profileResponse,
  completedRecordsHidden,
  redactedRecordsRevealed
}: Props) {
  const recordDef = defs.Record.get(recordHash);
  if (!recordDef) {
    return null;
  }

  const record = getRecordComponent(recordDef, profileResponse);
  if (record === undefined || record.state & DestinyRecordState.Invisible || recordDef.redacted) {
    return null;
  }

  const redeemed = Boolean(record.state & DestinyRecordState.RecordRedeemed);
  if (completedRecordsHidden && redeemed) {
    return null;
  }

  const intervals = getIntervals(recordDef, record);
  let scoreValue = recordDef.completionInfo && (
    <>{t('Progress.RecordValue', { value: recordDef.completionInfo.ScoreValue })}</>
  );
  if (intervals.length > 1) {
    const currentScore = _.sumBy(_.take(intervals, record.intervalsRedeemedCount), (i) => i.score);
    const totalScore = _.sumBy(intervals, (i) => i.score);
    scoreValue = (
      <>
        <span className="current">{currentScore}</span> /{' '}
        {t('Progress.RecordValue', { value: totalScore })}
      </>
    );
  }

  const objectives =
    intervals.length > 0
      ? [intervals[Math.min(record.intervalsRedeemedCount, intervals.length - 1)].objective]
      : record.objectives;
  const showObjectives =
    objectives &&
    (objectives.length > 1 ||
      (objectives.length === 1 &&
        !(
          defs.Objective.get(objectives[0].objectiveHash).valueStyle ===
            DestinyUnlockValueUIStyle.Checkbox ||
          (objectives[0].completionValue === 1 &&
            !defs.Objective.get(objectives[0].objectiveHash).allowOvercompletion)
        )));

  const triumph: TriumphInfo = {
    redeemed,
    unlocked: !redeemed && !(record.state & DestinyRecordState.ObjectiveNotCompleted),
    obscured: false,
    tracked: idx(profileResponse, (p) => p.profileRecords.data.trackedRecordHash) === recordHash,

    recordIcon: overrideIcons.includes(recordHash)
      ? catalystIcons[recordHash]
      : recordDef.displayProperties.icon,
    name: recordDef.displayProperties.name,
    description: recordDef.displayProperties.description,
    scoreValue,
    objectives: showObjectives ? objectives : undefined,
    loreLink: recordDef.loreHash
      ? `http://www.ishtar-collective.net/entries/${recordDef.loreHash}`
      : undefined,
    intervals
  };

  const obscured =
    !redactedRecordsRevealed &&
    !triumph.unlocked &&
    !triumph.redeemed &&
    Boolean(record.state & DestinyRecordState.Obscured);
  return renderTriumph(obscured ? obscure(triumph, recordDef) : triumph, defs);
}

export function getRecordComponent(
  recordDef: DestinyRecordDefinition,
  profileResponse: DestinyProfileResponse
): DestinyRecordComponent | undefined {
  return recordDef.scope === DestinyScope.Character
    ? profileResponse.characterRecords.data
      ? Object.values(profileResponse.characterRecords.data)[0].records[recordDef.hash]
      : undefined
    : profileResponse.profileRecords.data
    ? profileResponse.profileRecords.data.records[recordDef.hash]
    : undefined;
}

function getIntervals(
  definition: DestinyRecordDefinition,
  record: DestinyRecordComponent
): RecordInterval[] {
  const intervalDefinitions = idx(definition, (d) => d.intervalInfo.intervalObjectives) || [];
  const intervalObjectives = idx(record, (r) => r.intervalObjectives) || [];
  if (intervalDefinitions.length !== intervalObjectives.length) {
    return [];
  }

  const intervals: RecordInterval[] = [];
  let isPrevIntervalComplete = true;
  let prevIntervalProgress = 0;
  for (let i = 0; i < intervalDefinitions.length; i++) {
    const def = intervalDefinitions[i];
    const data = intervalObjectives[i];

    intervals.push({
      objective: data,
      score: def.intervalScoreValue,
      percentCompleted: isPrevIntervalComplete
        ? data.complete
          ? 1
          : Math.max(
              0,
              (data.progress - prevIntervalProgress) / (data.completionValue - prevIntervalProgress)
            )
        : 0,
      isRedeemed: record.intervalsRedeemedCount >= i + 1
    });

    isPrevIntervalComplete = data.complete;
    prevIntervalProgress = data.completionValue;
  }
  return intervals;
}

function obscure(triumph: TriumphInfo, definition: DestinyRecordDefinition): TriumphInfo {
  return {
    redeemed: triumph.redeemed,
    unlocked: triumph.unlocked,
    obscured: true,
    tracked: triumph.tracked,

    recordIcon: triumph.recordIcon,
    name: t('Progress.SecretTriumph'),
    description: definition.stateInfo.obscuredString,
    scoreValue: undefined,
    objectives: undefined,
    loreLink: undefined,
    intervals: []
  };
}

function renderTriumph(triumph: TriumphInfo, defs: D2ManifestDefinitions) {
  const intervalBarStyle = {
    width: `calc((100% / ${triumph.intervals.length}) - 2px)`
  };
  const allIntervalsCompleted = triumph.intervals.every((i) => i.percentCompleted >= 1.0);
  return (
    <div
      className={clsx('triumph-record', {
        redeemed: triumph.redeemed,
        unlocked: triumph.unlocked,
        obscured: triumph.obscured,
        tracked: triumph.tracked,
        multistep: triumph.intervals.length > 0
      })}
    >
      {triumph.recordIcon && <BungieImage className="record-icon" src={triumph.recordIcon} />}
      <div className="record-info">
        {triumph.scoreValue && <div className="record-value">{triumph.scoreValue}</div>}
        {triumph.name && <h3>{triumph.name}</h3>}
        {triumph.description && triumph.description.length > 0 && <p>{triumph.description}</p>}
        {triumph.objectives && (
          <div className="record-objectives">
            {triumph.objectives.map((objective) => (
              <Objective key={objective.objectiveHash} objective={objective} defs={defs} />
            ))}
          </div>
        )}
        {triumph.loreLink && (
          <div className="record-lore">
            <ExternalLink href={triumph.loreLink}>
              <img src={ishtarIcon} height="16" width="16" />
            </ExternalLink>
            <ExternalLink href={triumph.loreLink}>{t('MovePopup.ReadLore')}</ExternalLink>
          </div>
        )}
        {triumph.tracked && <img className="trackedIcon" src={trackedIcon} />}
      </div>
      {triumph.intervals.length > 0 && (
        <div
          className={clsx('record-interval-container', {
            complete: allIntervalsCompleted
          })}
        >
          {!allIntervalsCompleted &&
            triumph.intervals.map((i) => {
              const redeemed = i.isRedeemed;
              const unlocked = i.percentCompleted >= 1.0;
              return (
                <div
                  key={i.objective.objectiveHash}
                  className={clsx('record-interval', {
                    redeemed,
                    unlocked: unlocked && !redeemed
                  })}
                  style={intervalBarStyle}
                >
                  {!(redeemed || unlocked) && (
                    <div
                      className="record-interval unlocked"
                      style={{ width: percent(i.percentCompleted) }}
                    />
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
