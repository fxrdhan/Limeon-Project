import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatService } from './chat.service';
import { createThenableQuery } from '@/test/utils/supabaseMock';

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('chatService', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('fetches messages between users', async () => {
    const query = createThenableQuery({ data: [{ id: 'm1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await chatService.fetchMessagesBetweenUsers('u1', 'u2');
    expect(result.data?.[0].id).toBe('m1');
    expect(query.or).toHaveBeenCalled();
  });

  it('returns error when fetching messages fails', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await chatService.fetchMessagesBetweenUsers('u1', 'u2');
    expect(result.data).toBeNull();
  });

  it('returns empty list when no messages', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await chatService.fetchMessagesBetweenUsers('u1', 'u2');
    expect(result.data).toEqual([]);
  });

  it('handles fetch messages exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await chatService.fetchMessagesBetweenUsers('u1', 'u2');
    expect(result.data).toBeNull();
  });

  it('inserts and updates messages', async () => {
    const insertQuery = createThenableQuery({
      data: { id: 'm1' },
      error: null,
    });
    const updateQuery = createThenableQuery({
      data: { id: 'm1' },
      error: null,
    });
    fromMock.mockReturnValueOnce(insertQuery).mockReturnValueOnce(updateQuery);

    const insertResult = await chatService.insertMessage({
      sender_id: 'u1',
      receiver_id: 'u2',
      channel_id: null,
      message: 'Hi',
      message_type: 'text',
    });
    const updateResult = await chatService.updateMessage('m1', {
      is_read: true,
    });

    expect(insertResult.data?.id).toBe('m1');
    expect(updateResult.data?.id).toBe('m1');
  });

  it('handles insert/update errors', async () => {
    const insertQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    const updateQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValueOnce(insertQuery).mockReturnValueOnce(updateQuery);

    const insertResult = await chatService.insertMessage({
      sender_id: 'u1',
      receiver_id: 'u2',
      channel_id: null,
      message: 'Hi',
      message_type: 'text',
    });
    const updateResult = await chatService.updateMessage('m1', {
      is_read: true,
    });

    expect(insertResult.data).toBeNull();
    expect(updateResult.data).toBeNull();
  });

  it('deletes messages', async () => {
    const deleteQuery = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(deleteQuery);

    const result = await chatService.deleteMessage('m1');
    expect(result.error).toBeNull();
  });

  it('handles delete exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await chatService.deleteMessage('m1');
    expect(result.data).toBeNull();
  });

  it('manages user presence', async () => {
    const getQuery = createThenableQuery({
      data: { user_id: 'u1' },
      error: null,
    });
    const updateQuery = createThenableQuery({
      data: [{ user_id: 'u1' }],
      error: null,
    });
    const insertQuery = createThenableQuery({
      data: [{ user_id: 'u1' }],
      error: null,
    });

    fromMock
      .mockReturnValueOnce(getQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(insertQuery);

    const getResult = await chatService.getUserPresence('u1');
    const updateResult = await chatService.updateUserPresence('u1', {
      is_online: true,
    });
    const insertResult = await chatService.insertUserPresence({
      user_id: 'u1',
      is_online: true,
    });

    expect(getResult.data?.user_id).toBe('u1');
    expect(updateResult.data?.[0].user_id).toBe('u1');
    expect(insertResult.data?.[0].user_id).toBe('u1');
  });

  it('returns empty arrays when presence data missing', async () => {
    const getQuery = createThenableQuery({ data: null, error: null });
    const updateQuery = createThenableQuery({ data: null, error: null });
    const insertQuery = createThenableQuery({ data: null, error: null });
    fromMock
      .mockReturnValueOnce(getQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(insertQuery);

    const updateResult = await chatService.updateUserPresence('u1', {
      is_online: true,
    });
    const insertResult = await chatService.insertUserPresence({
      user_id: 'u1',
    });

    expect(updateResult.data).toEqual([]);
    expect(insertResult.data).toEqual([]);
  });

  it('handles presence errors', async () => {
    const getQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    const updateQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    const insertQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock
      .mockReturnValueOnce(getQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(insertQuery);

    const getResult = await chatService.getUserPresence('u1');
    const updateResult = await chatService.updateUserPresence('u1', {
      is_online: true,
    });
    const insertResult = await chatService.insertUserPresence({
      user_id: 'u1',
    });

    expect(getResult.data).toBeNull();
    expect(updateResult.data).toBeNull();
    expect(insertResult.data).toBeNull();
  });

  it('handles insert/update exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const insertResult = await chatService.insertMessage({
      sender_id: 'u1',
      receiver_id: 'u2',
      channel_id: null,
      message: 'Hi',
      message_type: 'text',
    });
    const updateResult = await chatService.updateMessage('m1', {
      is_read: true,
    });

    expect(insertResult.data).toBeNull();
    expect(updateResult.data).toBeNull();
  });

  it('handles presence exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const getResult = await chatService.getUserPresence('u1');
    const updateResult = await chatService.updateUserPresence('u1', {
      is_online: true,
    });
    const insertResult = await chatService.insertUserPresence({
      user_id: 'u1',
    });

    expect(getResult.data).toBeNull();
    expect(updateResult.data).toBeNull();
    expect(insertResult.data).toBeNull();
  });
});
