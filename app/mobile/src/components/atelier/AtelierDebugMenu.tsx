/**
 * AtelierDebugMenu — utilitários internos pra QA/dev, ocultos em prod.
 *
 * Render: botão pequeno "🐞 dev" sempre visível em DEV, opens BottomSheet com:
 *   - Reset onboarding (mostra wizard de novo na próxima visita)
 *   - Dump auto-save raw (Alert com JSON do storage)
 *   - Limpar TODOS os looks
 *   - Resetar customization pra DNA puro (chama customizationDb.reset)
 *
 * NÃO renderiza em production builds — gate `if (!__DEV__) return null` no top.
 */

import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Typography } from '@/components/ui';
import { BottomSheet } from '@/components/ui/ModalShell';
import { atelierLooks, customization as customizationDb, dnaMutations, mascots as mascotsDb } from '@/lib/db';
import { MUTATION_CATALOG } from '@/lib/dna/mutations';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

const ONBOARDED_KEY = 'mascote:atelier_onboarded:v1';

export interface AtelierDebugMenuProps {
  userId: string;
  /** Chamado após mudança que invalida draft atual (refresh do parent). */
  onAfterAction: () => void;
}

export function AtelierDebugMenu({ userId, onAfterAction }: AtelierDebugMenuProps) {
  if (!__DEV__) return null;
  return <AtelierDebugMenuImpl userId={userId} onAfterAction={onAfterAction} />;
}

function AtelierDebugMenuImpl({ userId, onAfterAction }: AtelierDebugMenuProps) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const handleResetOnboarding = async (): Promise<void> => {
    await AsyncStorage.removeItem(ONBOARDED_KEY);
    Alert.alert('OK', 'Onboarding resetado. Reabra o Atelier pra ver o wizard.');
    setOpen(false);
  };

  const handleDumpAutoSave = async (): Promise<void> => {
    const raw = await AsyncStorage.getItem(`mascote:atelier_draft:${userId}`);
    Alert.alert(
      'Auto-save raw',
      raw ?? '(vazio)',
      [{ text: 'OK' }],
    );
  };

  const handleClearLooks = (): void => {
    Alert.alert(
      'Apagar TODOS os looks?',
      'Não dá pra desfazer. Customization atual fica intacta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            const all = await atelierLooks.list(userId);
            for (const l of all) {
              await atelierLooks.delete(userId, l.id);
            }
            Alert.alert('OK', `${all.length} look(s) removido(s).`);
            setOpen(false);
            onAfterAction();
          },
        },
      ],
    );
  };

  const handleResetCustomization = (): void => {
    Alert.alert(
      'Resetar customization?',
      'Volta tudo pro DNA puro (persiste imediato, sem precisar salvar).',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar',
          style: 'destructive',
          onPress: async () => {
            await customizationDb.reset(userId);
            Alert.alert('OK', 'Customization resetada.');
            setOpen(false);
            onAfterAction();
          },
        },
      ],
    );
  };

  const handleSimulateMutation = (): void => {
    // Pega 5 mutations random pra escolher uma
    const sample = [...MUTATION_CATALOG].sort(() => Math.random() - 0.5).slice(0, 5);
    Alert.alert(
      'Simular mutation unlock',
      'Escolha uma das 5 mutations aleatórias:',
      [
        ...sample.map(mut => ({
          text: `${mut.name} (${mut.rarity})`,
          onPress: async () => {
            await dnaMutations.unlock(userId, mut.id);
            Alert.alert('Unlocked', mut.name);
            setOpen(false);
            onAfterAction();
          },
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  };

  const handleAdvancePhase = (): void => {
    const phases = ['ovo', 'bebe', 'crianca', 'adolescente', 'adulto', 'evoluido'] as const;
    Alert.alert(
      'Forçar fase do mascote',
      'Escolha pra qual fase pular:',
      [
        ...phases.map(p => ({
          text: p,
          onPress: async () => {
            const current = await mascotsDb.forUser(userId);
            if (!current) {
              Alert.alert('Erro', 'Mascote não encontrado.');
              return;
            }
            await mascotsDb.upsert({ user_id: userId, phase: p });
            Alert.alert('OK', `Mascote agora está em fase: ${p}`);
            setOpen(false);
            onAfterAction();
          },
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  };

  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        style={[styles.fab, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="Menu debug (dev only)"
      >
        <Typography variant="mono" tone="dim" style={{ fontSize: 10 }}>
          🐞 dev
        </Typography>
      </PressableScale>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Debug Atelier">
        <View style={styles.actions}>
          <DebugAction
            icon="refresh-cw"
            label="Resetar onboarding"
            description="Mostra wizard de novo"
            onPress={handleResetOnboarding}
            theme={theme}
          />
          <DebugAction
            icon="info"
            label="Dump auto-save raw"
            description="Vê o JSON salvo agora"
            onPress={handleDumpAutoSave}
            theme={theme}
          />
          <DebugAction
            icon="x"
            label="Apagar todos os looks"
            description="Destrutivo — pede confirmação"
            onPress={handleClearLooks}
            theme={theme}
            danger
          />
          <DebugAction
            icon="x"
            label="Reset customization → DNA puro"
            description="Persiste imediato (sem precisar salvar)"
            onPress={handleResetCustomization}
            theme={theme}
            danger
          />
          <DebugAction
            icon="info"
            label="Simular mutation unlock"
            description="Desbloqueia uma mutation aleatória do catálogo"
            onPress={handleSimulateMutation}
            theme={theme}
          />
          <DebugAction
            icon="info"
            label="Forçar fase do mascote"
            description="Pula direto pra ovo/bebe/crianca/adolescente/adulto/evoluido"
            onPress={handleAdvancePhase}
            theme={theme}
          />
        </View>
        <Typography variant="caption" tone="dim" align="center">
          Esse menu não aparece em release builds.
        </Typography>
      </BottomSheet>
    </>
  );
}

interface DebugActionProps {
  icon: 'refresh-cw' | 'info' | 'x';
  label: string;
  description: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  danger?: boolean;
}

function DebugAction({ icon, label, description, onPress, theme, danger }: DebugActionProps) {
  // Fallback de icon — refresh-cw não existe no Icon set; usa arrow-left.
  const safeIcon = icon === 'refresh-cw' ? 'arrow-left' : icon;
  return (
    <PressableScale
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: danger ? theme.colors.error + '40' : theme.colors.border,
        backgroundColor: danger ? theme.colors.error + '08' : theme.colors.surface,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon
        name={safeIcon}
        size={16}
        color={danger ? theme.colors.error : theme.colors.text}
        strokeWidth={2}
      />
      <View style={{ flex: 1 }}>
        <Typography variant="bodyBold" style={{ color: danger ? theme.colors.error : theme.colors.text }}>
          {label}
        </Typography>
        <Typography variant="caption" tone="dim">
          {description}
        </Typography>
      </View>
    </PressableScale>
  );
}

function makeStyles(_theme: Theme) {
  return StyleSheet.create({
    fab: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      zIndex: 999,
    },
    actions: {
      gap: 8,
    },
  });
}
