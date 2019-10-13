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
  redeemedScore?: number;
  totalScore?: number;
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
  const isMultiStep = intervals.length > 1;
  const objectives =
    intervals.length > 0
      ? [intervals[Math.min(record.intervalsRedeemedCount, intervals.length - 1)].objective]
      : record.objectives;

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
    redeemedScore: isMultiStep
      ? _.sumBy(_.take(intervals, record.intervalsRedeemedCount), (i) => i.score)
      : undefined,
    totalScore: isMultiStep
      ? _.sumBy(intervals, (i) => i.score)
      : recordDef.completionInfo && recordDef.completionInfo.ScoreValue,
    objectives: shouldShowObjectives(objectives, defs) ? objectives : undefined,
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

function shouldShowObjectives(objectives: DestinyObjectiveProgress[], defs: D2ManifestDefinitions) {
  if (!objectives || objectives.length === 0) {
    return false;
  }

  // display objectives if we have more than one
  if (objectives.length > 1) {
    return true;
  }

  const objective = objectives[0];
  const def = defs.Objective.get(objective.objectiveHash);

  // don't show objective if it is simply a checkbox
  if (def.valueStyle === DestinyUnlockValueUIStyle.Checkbox) {
    return false;
  }

  // don't show objective if it's completion value is 1 and it doesn't support over-completion
  if (!def.allowOvercompletion && def.completionValue === 1) {
    return false;
  }

  return true;
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
    redeemedScore: undefined,
    totalScore: undefined,
    objectives: undefined,
    loreLink: undefined,
    intervals: []
  };
}

function renderTriumph(triumph: TriumphInfo, defs: D2ManifestDefinitions) {
  const intervalBarStyle = {
    width: `calc((100% / ${triumph.intervals.length}) - 2px)`
  };
  const totalScore = t('Progress.RecordValue', { value: triumph.totalScore });
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
        {(triumph.totalScore || undefined) && (
          <div className="record-value">
            {triumph.redeemedScore === undefined ? (
              totalScore
            ) : (
              <>
                <span className="current">{triumph.redeemedScore}</span> / {totalScore}
              </>
            )}
          </div>
        )}
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
      {triumph.intervals.length > 0 &&
        (triumph.intervals[triumph.intervals.length - 1].percentCompleted >= 1.0 ? (
          <div className="record-interval-container complete" />
        ) : (
          <div className="record-interval-container">
            {triumph.intervals.map((i) => {
              return i.isRedeemed ? (
                <div
                  key={i.objective.objectiveHash}
                  style={intervalBarStyle}
                  className="record-interval redeemed"
                />
              ) : i.percentCompleted >= 1.0 ? (
                <div
                  key={i.objective.objectiveHash}
                  style={intervalBarStyle}
                  className="record-interval unlocked"
                />
              ) : (
                <div
                  key={i.objective.objectiveHash}
                  style={intervalBarStyle}
                  className="record-interval"
                >
                  <div
                    className="record-interval unlocked"
                    style={{ width: percent(i.percentCompleted) }}
                  />
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}
