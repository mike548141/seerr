import AirDateBadge from '@app/components/AirDateBadge';
import Badge from '@app/components/Common/Badge';
import CachedImage from '@app/components/Common/CachedImage';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import type { SeasonWithEpisodes } from '@server/models/Tv';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages('components.TvDetails.Season', {
  somethingwentwrong: 'Something went wrong while retrieving season data.',
  noepisodes: 'Episode list unavailable.',
  status4k: '4K {status}',
  missing: 'Missing',
  availablesummary:
    '{available} of {aired} aired {aired, plural, one {episode} other {episodes}} available',
});

// TMDB air dates are date-only; compare at UTC midnight, as AirDateBadge does.
const hasAired = (airDate?: string | null) => {
  if (!airDate) {
    return false;
  }
  const aired = new Date(airDate);
  aired.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return aired.getTime() < today.getTime();
};

type SeasonProps = {
  seasonNumber: number;
  tvId: number;
};

const Season = ({ seasonNumber, tvId }: SeasonProps) => {
  const intl = useIntl();
  const { data, error } = useSWR<SeasonWithEpisodes>(
    `/api/v1/tv/${tvId}/season/${seasonNumber}`
  );

  if (!data && !error) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return <div>{intl.formatMessage(messages.somethingwentwrong)}</div>;
  }

  // `available` is only set when the server tracked this season, so an
  // untracked season shows neither the summary nor any Missing badge.
  const tracked = data.episodes.some(
    (episode) => episode.available !== undefined
  );
  const airedEpisodes = data.episodes.filter((episode) =>
    hasAired(episode.airDate)
  );
  const availableAired = airedEpisodes.filter(
    (episode) => episode.available === true
  ).length;

  return (
    <div className="flex flex-col justify-center divide-y divide-gray-700">
      {tracked && airedEpisodes.length > 0 && (
        <p className="pb-4 text-sm text-gray-400">
          {intl.formatMessage(messages.availablesummary, {
            available: availableAired,
            aired: airedEpisodes.length,
          })}
        </p>
      )}
      {data.episodes.length === 0 ? (
        <p>{intl.formatMessage(messages.noepisodes)}</p>
      ) : (
        data.episodes
          .slice()
          .reverse()
          .map((episode) => {
            return (
              <div
                className="flex flex-col space-y-4 py-4 xl:flex-row xl:space-x-4 xl:space-y-4"
                key={`season-${seasonNumber}-episode-${episode.episodeNumber}`}
              >
                <div className="flex-1">
                  <div className="flex flex-col space-y-2 xl:flex-row xl:items-center xl:space-x-2 xl:space-y-0">
                    <h3 className="text-lg">
                      {episode.episodeNumber} - {episode.name}
                    </h3>
                    {episode.airDate && (
                      <AirDateBadge airDate={episode.airDate} />
                    )}
                    {episode.available === true && (
                      <Badge badgeType="success">
                        {intl.formatMessage(globalMessages.available)}
                      </Badge>
                    )}
                    {episode.available === false &&
                      episode.available4k !== true &&
                      hasAired(episode.airDate) && (
                        <Badge badgeType="danger">
                          {intl.formatMessage(messages.missing)}
                        </Badge>
                      )}
                    {episode.available4k === true && (
                      <Badge badgeType="success">
                        {intl.formatMessage(messages.status4k, {
                          status: intl.formatMessage(globalMessages.available),
                        })}
                      </Badge>
                    )}
                  </div>
                  {episode.overview && <p>{episode.overview}</p>}
                </div>
                {episode.stillPath && (
                  <div className="relative aspect-video xl:h-32">
                    <CachedImage
                      type="tmdb"
                      className="rounded-lg object-contain"
                      src={episode.stillPath}
                      alt=""
                      fill
                    />
                  </div>
                )}
              </div>
            );
          })
      )}
    </div>
  );
};

export default Season;
