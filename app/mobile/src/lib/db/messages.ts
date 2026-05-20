import type { Message } from '@/types';
import { read, write, withLock, uid } from './internal';
import { dateLocal } from './dates';

export const messages = {
  async listRecent(user_id: string, limit = 50): Promise<Message[]> {
    const rows = await read<Message>('messages');
    return rows
      .filter(m => m.conversation_id === user_id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(-limit);
  },
  async listAll(user_id: string): Promise<Message[]> {
    const rows = await read<Message>('messages');
    return rows.filter(m => m.conversation_id === user_id);
  },
  async count(user_id: string, role?: 'user' | 'mascot'): Promise<number> {
    const rows = await read<Message>('messages');
    return rows.filter(m => m.conversation_id === user_id && (!role || m.role === role)).length;
  },
  async add(m: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    return withLock('messages', async () => {
      const rows = await read<Message>('messages');
      const next: Message = { ...m, id: uid('msg_'), created_at: new Date().toISOString() };
      await write<Message>('messages', [...rows, next]);
      return next;
    });
  },
  async countUserToday(user_id: string, date: string): Promise<number> {
    const rows = await read<Message>('messages');
    return rows.filter(
      m => m.conversation_id === user_id
        && m.role === 'user'
        && dateLocal(new Date(m.created_at)) === date,
    ).length;
  },
  async clearConversation(user_id: string): Promise<void> {
    return withLock('messages', async () => {
      const rows = await read<Message>('messages');
      await write<Message>('messages', rows.filter(m => m.conversation_id !== user_id));
    });
  },
};
