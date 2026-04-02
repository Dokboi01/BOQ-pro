const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const toSaveTimestamp = (value) => {
  if (!value) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value?.toMillis) return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

export const formatRelativeSaveTime = (value) => {
  const timestamp = toSaveTimestamp(value);
  if (!timestamp) return 'just now';

  const diff = Date.now() - timestamp;
  if (diff < MINUTE_MS) return 'just now';
  if (diff < HOUR_MS) return `${Math.max(1, Math.round(diff / MINUTE_MS))} min ago`;
  if (diff < DAY_MS) return `${Math.max(1, Math.round(diff / HOUR_MS))} hr ago`;

  return new Date(timestamp).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
  });
};

const buildFallbackStatus = (project, globalSyncState = 'synced') => {
  const isLocalProject = String(project?.id || '').startsWith('local_');
  if (globalSyncState === 'offline' && isLocalProject) return 'offline';
  if (isLocalProject) return 'local-only';
  if (globalSyncState === 'pending') return 'pending';
  if (globalSyncState === 'syncing') return 'syncing';
  if (globalSyncState === 'offline') return 'offline';
  return 'synced';
};

export const getProjectSavePresentation = (project, { globalSyncState = 'synced' } = {}) => {
  const saveMeta = project?.saveMeta || {};
  const status = saveMeta.status || buildFallbackStatus(project, globalSyncState);
  const lastLocalSaveAt = toSaveTimestamp(saveMeta.lastLocalSaveAt || project?.updatedAt);
  const lastCloudSyncAt = toSaveTimestamp(saveMeta.lastCloudSyncAt || project?.updated_at);
  const referenceTime = lastCloudSyncAt || lastLocalSaveAt || Date.now();
  const cloudLinked = saveMeta.cloudLinked === true || !String(project?.id || '').startsWith('local_');
  const retryCount = Number(saveMeta.retryCount) || 0;
  const lastSyncError = String(saveMeta.lastSyncError || '').trim();

  if (status === 'syncing') {
    return {
      status,
      tone: 'info',
      badgeLabel: 'Saving now',
      detail: 'Publishing latest project changes to the cloud',
      timestampLabel: `Saved ${formatRelativeSaveTime(lastLocalSaveAt || referenceTime)}`,
    };
  }

  if (status === 'pending') {
    return {
      status,
      tone: 'warning',
      badgeLabel: cloudLinked ? 'Sync queued' : 'Local draft',
      detail: cloudLinked
        ? `Saved ${formatRelativeSaveTime(lastLocalSaveAt || referenceTime)} and queued for cloud backup`
        : `Saved locally ${formatRelativeSaveTime(lastLocalSaveAt || referenceTime)} while cloud setup completes`,
      timestampLabel: `Saved ${formatRelativeSaveTime(lastLocalSaveAt || referenceTime)}`,
    };
  }

  if (status === 'offline') {
    return {
      status,
      tone: 'muted',
      badgeLabel: 'Offline draft',
      detail: `Saved ${formatRelativeSaveTime(lastLocalSaveAt || referenceTime)} and waiting for connection`,
      timestampLabel: `Saved ${formatRelativeSaveTime(lastLocalSaveAt || referenceTime)}`,
    };
  }

  if (status === 'attention') {
    return {
      status,
      tone: 'danger',
      badgeLabel: 'Needs review',
      detail: lastSyncError || `Automatic backup retried ${retryCount} time${retryCount === 1 ? '' : 's'}`,
      timestampLabel: lastLocalSaveAt ? `Saved ${formatRelativeSaveTime(lastLocalSaveAt)}` : 'Review sync status',
    };
  }

  if (status === 'local-only') {
    return {
      status,
      tone: 'muted',
      badgeLabel: 'Saved locally',
      detail: `Saved ${formatRelativeSaveTime(lastLocalSaveAt || referenceTime)}. Cloud backup starts after sign-in and sync`,
      timestampLabel: `Saved ${formatRelativeSaveTime(lastLocalSaveAt || referenceTime)}`,
    };
  }

  return {
    status: 'synced',
    tone: 'success',
    badgeLabel: 'Cloud backed up',
    detail: `Backed up ${formatRelativeSaveTime(lastCloudSyncAt || referenceTime)}`,
    timestampLabel: `Backed up ${formatRelativeSaveTime(lastCloudSyncAt || referenceTime)}`,
  };
};
