import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Typography, Input } from '@/components/ui';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

const NPS_LABELS = ['😞', '😕', '😐', '🙂', '😄'];

export default function FeedbackScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [score, setScore] = useState<number | null>(null);
  const [text, setText] = useState('');

  function submit() {
    Alert.alert('Obrigado!', 'Seu feedback foi anotado localmente. Em produção, vai pra equipe.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
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

        <Button label="Enviar" onPress={submit} disabled={!score} />
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
