import { MediaStatus } from '@server/constants/media';

export interface TrackedEpisode {
  episodeNumber: number;
  status: MediaStatus;
  status4k: MediaStatus;
}

export type SeasonEpisodeAvailability =
  // Nothing tracked for this season, or the provider lists no episodes.
  | { result: 'untracked' }
  // Too many tracked numbers the provider does not know: likely a different
  // episode ordering, so no badge can be trusted.
  | { result: 'mismatch'; unknownEpisodeNumbers: number[] }
  | {
      result: 'tracked';
      available: Record<number, boolean>;
      available4k: Record<number, boolean>;
      // Tracked numbers the provider does not list (extras, double episodes,
      // E0). They get no badge; reported for logging.
      unknownEpisodeNumbers: number[];
    };

// Above this share of unknown numbers the library and the provider are more
// likely numbering the season differently than holding a few extras, so no
// badge can be trusted and the season is left unbadged.
const MAX_UNKNOWN_SHARE = 1 / 3;

/**
 * Per-episode badges for one season.
 *
 * A few tracked numbers the provider lacks do not hide the whole season:
 * on a real library that rule hid 1,513 correctly tracked episodes over
 * 85 seasons for the sake of 1-3 extras each.
 */
export const getSeasonEpisodeAvailability = (
  trackedEpisodes: TrackedEpisode[],
  metadataEpisodeNumbers: Set<number>
): SeasonEpisodeAvailability => {
  const tracked = trackedEpisodes.filter(
    (episode) => episode.status !== MediaStatus.DELETED
  );
  if (tracked.length === 0 || metadataEpisodeNumbers.size === 0) {
    return { result: 'untracked' };
  }

  const unknownEpisodeNumbers = tracked
    .filter((episode) => !metadataEpisodeNumbers.has(episode.episodeNumber))
    .map((episode) => episode.episodeNumber);
  if (unknownEpisodeNumbers.length > tracked.length * MAX_UNKNOWN_SHARE) {
    return { result: 'mismatch', unknownEpisodeNumbers };
  }

  const available: Record<number, boolean> = {};
  const available4k: Record<number, boolean> = {};
  for (const episode of tracked) {
    if (!metadataEpisodeNumbers.has(episode.episodeNumber)) {
      continue;
    }
    available[episode.episodeNumber] = episode.status === MediaStatus.AVAILABLE;
    available4k[episode.episodeNumber] =
      episode.status4k === MediaStatus.AVAILABLE;
  }

  return { result: 'tracked', available, available4k, unknownEpisodeNumbers };
};
