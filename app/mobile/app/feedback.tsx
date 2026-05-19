import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
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
          <Text style={styles.kicker}>FEEDBACK</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.title}>Tá curtindo o Mascote?</Text>
        <Text style={styles.subtitle}>Sua resposta sincera ajuda a gente a fazer mais bonito.</Text>

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

        <View style={styles.field}>
          <Text style={styles.label}>O que te faria voltar amanhã?</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            style={styles.input}
            placeholder="Pode ser bobagem. Pode ser nada."
            placeholderTextColor={theme.colors.textDim}
            multiline
            maxLength={1000}
          />
        </View>

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
    kicker: { ...theme.text.xs, color: theme.colors.textSecondary, fontWeight: '800', letterSpacing: 1 },
    title: { ...theme.text.h1, color: theme.colors.text, marginTop: theme.spacing.lg },
    subtitle: { ...theme.text.body, color: theme.colors.textSecondary },
    npsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm, marginVertical: theme.spacing.lg },
    npsBtn: { flex: 1, aspectRatio: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
    npsBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    npsEmoji: { fontSize: 28 },
    field: { gap: theme.spacing.sm },
    label: { ...theme.text.sm, color: theme.colors.textSecondary, fontWeight: '600' },
    input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontSize: 14, color: theme.colors.text, minHeight: 120, textAlignVertical: 'top' },
  });
}
