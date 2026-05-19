import { describe, expect, it } from 'vitest';
import {
  STREAK_MILESTONES,
  buildInviteLink,
  buildInvitePayload,
  buildProgressShareText,
  buildInviteText,
  isStreakMilestone,
  nextMilestone,
} from '@/lib/share';

describe('lib/share', () => {
  describe('isStreakMilestone', () => {
    it('detecta cada milestone declarado', () => {
      for (const m of STREAK_MILESTONES) {
        expect(isStreakMilestone(m)).toBe(true);
      }
    });
    it('rejeita não-milestones', () => {
      expect(isStreakMilestone(0)).toBe(false);
      expect(isStreakMilestone(1)).toBe(false);
      expect(isStreakMilestone(2)).toBe(false);
      expect(isStreakMilestone(4)).toBe(false);
      expect(isStreakMilestone(31)).toBe(false);
      expect(isStreakMilestone(999)).toBe(false);
    });
  });

  describe('nextMilestone', () => {
    it('retorna o próximo milestone à frente', () => {
      expect(nextMilestone(0)).toBe(3);
      expect(nextMilestone(2)).toBe(3);
      expect(nextMilestone(3)).toBe(7);
      expect(nextMilestone(6)).toBe(7);
      expect(nextMilestone(7)).toBe(14);
      expect(nextMilestone(28)).toBe(30);
      expect(nextMilestone(180)).toBe(365);
    });
    it('retorna null acima do último milestone', () => {
      expect(nextMilestone(365)).toBe(null);
      expect(nextMilestone(1000)).toBe(null);
    });
  });

  describe('buildInviteLink', () => {
    it('usa os 6 últimos chars do userId como tag', () => {
      expect(buildInviteLink('abc123def456')).toBe('https://mascote.app/i/def456');
    });
    it('fallback amigo quando id ausente', () => {
      expect(buildInviteLink(undefined)).toBe('https://mascote.app/i/amigo');
      expect(buildInviteLink(null)).toBe('https://mascote.app/i/amigo');
      expect(buildInviteLink('')).toBe('https://mascote.app/i/amigo');
    });
    it('id curto vira o tag inteiro (não acessa slice indevido)', () => {
      expect(buildInviteLink('xyz')).toBe('https://mascote.app/i/xyz');
    });
    it('não vaza o userId completo (privacidade) — só os últimos 6 chars', () => {
      const link = buildInviteLink('user-abcdefghijklmnop');
      // userId tem 21 chars; o link deve conter só os últimos 6
      expect(link).not.toContain('user-abcdefghijklmn');
      expect(link).toContain('klmnop');
    });
  });

  describe('buildProgressShareText', () => {
    it('inclui prefix de milestone quando aplica', () => {
      const text = buildProgressShareText({ streak: 7, todayCount: 3 });
      expect(text).toMatch(/7 dias seguidos/);
      expect(text).toMatch(/3x/);
    });
    it('sem prefix em dia comum', () => {
      const text = buildProgressShareText({ streak: 5, todayCount: 1 });
      expect(text).not.toMatch(/dias seguidos!/);
      expect(text).toMatch(/Streak: 5 dias/);
    });
    it('isMilestone explícito sobrescreve detecção', () => {
      const text = buildProgressShareText({ streak: 5, todayCount: 1, isMilestone: true });
      expect(text).toMatch(/5 dias seguidos/);
    });
  });

  describe('buildInviteText', () => {
    it('usa nome do mascote e label da personalidade na voz', () => {
      const text = buildInviteText({
        personality: 'calmo',
        level: 5,
        mascotName: 'Bipo',
        link: 'https://mascote.app/i/abc123',
      });
      expect(text).toContain('Bipo');
      expect(text).toContain('nível 5');
      expect(text).toContain('https://mascote.app/i/abc123');
      expect(text).toMatch(/sem cobrança, sem culpa/i);
    });
  });

  describe('buildInvitePayload', () => {
    it('combina link + text num único payload', () => {
      const { link, text } = buildInvitePayload(
        { personality: 'motivador', level: 3, name: 'Zip' },
        'user-final123',
      );
      expect(link).toBe('https://mascote.app/i/nal123');
      expect(text).toContain('Zip');
      expect(text).toContain(link);
    });
  });
});
