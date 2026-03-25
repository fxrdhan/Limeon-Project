import { describe, expect, it } from 'vite-plus/test';
import { buildRetainedChannelImageAssetScopeIds } from '../utils/channel-image-asset-cache';

describe('channel-image-asset-cache retention', () => {
  it('keeps a small recent working set of channel scopes', () => {
    let retainedChannelIds = buildRetainedChannelImageAssetScopeIds({
      activeChannelId: 'channel-1',
    });

    retainedChannelIds = buildRetainedChannelImageAssetScopeIds({
      activeChannelId: 'channel-2',
      previousRetainedChannelIds: retainedChannelIds,
    });
    retainedChannelIds = buildRetainedChannelImageAssetScopeIds({
      activeChannelId: 'channel-3',
      previousRetainedChannelIds: retainedChannelIds,
    });
    retainedChannelIds = buildRetainedChannelImageAssetScopeIds({
      activeChannelId: 'channel-4',
      previousRetainedChannelIds: retainedChannelIds,
    });

    expect(retainedChannelIds).toEqual(['channel-4', 'channel-3', 'channel-2']);

    retainedChannelIds = buildRetainedChannelImageAssetScopeIds({
      activeChannelId: 'channel-3',
      previousRetainedChannelIds: retainedChannelIds,
    });

    expect(retainedChannelIds).toEqual(['channel-3', 'channel-4', 'channel-2']);
  });

  it('does not drop the retained working set when no active scope is provided', () => {
    expect(
      buildRetainedChannelImageAssetScopeIds({
        activeChannelId: null,
        previousRetainedChannelIds: ['channel-2', 'channel-1'],
      })
    ).toEqual(['channel-2', 'channel-1']);
  });
});
