import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MediaStatus } from '@server/constants/media';
import { getSeasonEpisodeAvailability } from '@server/lib/episodeAvailability';

const available = (episodeNumber: number) => ({
  episodeNumber,
  status: MediaStatus.AVAILABLE,
  status4k: MediaStatus.UNKNOWN,
});

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('getSeasonEpisodeAvailability', () => {
  it('badges every tracked episode when the numbers match', () => {
    const result = getSeasonEpisodeAvailability(
      [available(1), available(2)],
      new Set([1, 2, 3])
    );

    assert.equal(result.result, 'tracked');
    assert.deepEqual(result.result === 'tracked' && result.available, {
      1: true,
      2: true,
    });
  });

  it('keeps badges when the library holds a few extras the provider lacks', () => {
    // Shape seen on a real library: the library holds 28, the provider lists 25.
    const result = getSeasonEpisodeAvailability(
      range(1, 28).map(available),
      new Set(range(1, 25))
    );

    assert.equal(result.result, 'tracked');
    if (result.result !== 'tracked') return;
    assert.equal(Object.keys(result.available).length, 25);
    assert.equal(result.available[26], undefined);
    assert.deepEqual(result.unknownEpisodeNumbers, [26, 27, 28]);
  });

  it('hides the season when over a third of the numbers are unknown', () => {
    // A different ordering: half of what the library holds is unknown.
    const result = getSeasonEpisodeAvailability(
      range(1, 20).map(available),
      new Set(range(1, 10))
    );

    assert.equal(result.result, 'mismatch');
    assert.deepEqual(
      result.result === 'mismatch' && result.unknownEpisodeNumbers,
      range(11, 20)
    );
  });

  it('keeps badges at exactly one third unknown', () => {
    const result = getSeasonEpisodeAvailability(
      range(1, 3).map(available),
      new Set([1, 2])
    );

    assert.equal(result.result, 'tracked');
  });

  it('ignores rows available on neither tier when counting and badging', () => {
    const result = getSeasonEpisodeAvailability(
      [
        available(1),
        {
          episodeNumber: 40,
          status: MediaStatus.DELETED,
          status4k: MediaStatus.UNKNOWN,
        },
        {
          episodeNumber: 41,
          status: MediaStatus.DELETED,
          status4k: MediaStatus.UNKNOWN,
        },
      ],
      new Set([1, 2])
    );

    assert.equal(result.result, 'tracked');
    assert.deepEqual(result.result === 'tracked' && result.available, {
      1: true,
    });
  });

  it('reports 4K availability separately', () => {
    const result = getSeasonEpisodeAvailability(
      [
        {
          episodeNumber: 1,
          status: MediaStatus.UNKNOWN,
          status4k: MediaStatus.AVAILABLE,
        },
      ],
      new Set([1])
    );

    assert.equal(result.result, 'tracked');
    if (result.result !== 'tracked') return;
    assert.equal(result.available[1], false);
    assert.equal(result.available4k[1], true);
  });

  it('is untracked with no live rows or no provider episodes', () => {
    assert.equal(
      getSeasonEpisodeAvailability([], new Set([1])).result,
      'untracked'
    );
    assert.equal(
      getSeasonEpisodeAvailability([available(1)], new Set()).result,
      'untracked'
    );
  });
});
