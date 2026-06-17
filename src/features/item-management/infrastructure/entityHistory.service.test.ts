import { describe, expect, it } from 'vite-plus/test';
import {
  mapEntityHistoryItem,
  type EntityHistoryItem,
} from './entityHistory.service';

const createHistoryItem = (
  overrides: Partial<EntityHistoryItem> = {}
): EntityHistoryItem => ({
  id: 'history-1',
  entity_table: 'items',
  entity_id: 'item-1',
  version_number: 1,
  action_type: 'UPDATE',
  changed_by: 'user-1',
  changed_at: '2026-06-15T00:00:00.000Z',
  entity_data: {},
  ...overrides,
});

describe('entity history mapping', () => {
  it('normalizes joined user relation arrays to display fields', () => {
    expect(
      mapEntityHistoryItem(
        createHistoryItem({
          users: [
            {
              name: 'Admin',
              profilephoto: 'https://example.com/avatar.png',
            },
          ],
        })
      )
    ).toMatchObject({
      user_name: 'Admin',
      user_photo: 'https://example.com/avatar.png',
    });
  });

  it('keeps display fields null when no user relation exists', () => {
    expect(
      mapEntityHistoryItem(
        createHistoryItem({
          users: [],
        })
      )
    ).toMatchObject({
      user_name: null,
      user_photo: null,
    });
  });
});
