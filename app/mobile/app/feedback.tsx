import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Typography, Input } from '@/components/ui';
import { logger } from '@/lib/logger';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

const NPS_LABELS = ['😞', '😕', '😐', '🙂', '😄'];

const FEEDBACK_STORAGE_KEY = 'mascote:feedback:queue';
const MAX_QUEUE = 50;

type FeedbackEntry = { score: number; text: string; created_at: string };

async function persistFeedback(entry: FeedbackEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_STORAGE_KEY);
    const arr: FeedbackEntry[] = raw ? (JSON.parse(raw) as FeedbackEntry[]) : [];
    arr.push(entry);
    // Manter no máx 50 entradas (drop oldest) — evita inflar AsyncStorage.
    const next = arr.slice(-MAX_QUEUE);
    await AsyncStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    logger.warn('[feedback] persist failed', { reason: err instanceof Error ? err.message : 'unknown' });
    throw err;
  }
}

export default function FeedbackScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [score, setScore] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!score || submitting) return;
    setSubmitting(true);
    try {
      await persistFeedback({
        score,
        text: text.trim(),
        created_at: new Date().toISOString(),
      });
      Alert.alert('Obrigado!', 'Seu feedback foi anotado.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(
        'Não consegui salvar',
        'Tenta de novo em alguns segundos.',
        [{ text: 'OK' }],
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Typography variant="mono" tone="secondary" style={styles.kicker}>FEEDBACK</Typography>
          <View style={{ width: 36 }} />
        </View>

        <Typography variant="title" style={{ marginTop: theme.spacing.lg }}>Tá curtindo o Mascote?</Typography>
        <Typography tone="secondary">Sua resposta sincera ajuda a gente a fazer mais bonito.</Typography>

        <View style={styles.npsRow}>
          {NPS_LABELS.map((emoji, i) => (
            <Pressable
              key={i}
              style={[styles.npsBtn, score === i + 1 && styles.npsBtnActive]}
              onPress={() => setScore(i + 1)}
              accessibilityRole="button"
              accessibilityLabel={`Nota ${i + 1} de 5`}
              accessibilityState={{ selected: score === i + 1 }}
            >
              <Text style={styles.npsEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        <Input
          label="O que te faria voltar amanhã?"
          value={text}
          onChangeText={setText}
          placeholder="Pode ser bobagem. Pode ser nada."
          multiline
          maxLength={1000}
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />

        <Button label={submitting ? 'Enviando...' : 'Enviar'} onPress={submit} disabled={!score || submitting} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { padding: theme.spacing.lg, gap: theme.spacing.md },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    close: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
    closeText: { fontSize: 16, color: theme.colors.text },
    kicker: { fontWeight: '800', letterSpacing: 1 },
    npsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm, marginVertical: theme.spacing.lg },
    npsBtn: { flex: 1, aspectRatio: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
    npsBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    npsEmoji: { fontSize: 28 },
  });
}
