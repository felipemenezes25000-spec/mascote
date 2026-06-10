/**
 * /mascot-editor — editor manual do ProceduralGenome.
 *
 * Permite usuário ajustar:
 *  - Hue do corpo (0-360°)
 *  - Saturação acento (0-100%)
 *  - Quantidade de marks visíveis (0-MAX)
 *  - Toggle por accessory
 *
 * Salva como `proceduralGenome.userOverrides`. Render aplica overrides em
 * cima do genome IA (user-override sempre vence). Quando o genome IA é
 * regenerado (próximo trigger), overrides persistem.
 *
 * Ver spec § B.11.
 */

import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot2D } from '@/components/Mascot2D';
import { Typography } from '@/components/ui';
import { useStore } from '@/store';
import { useTheme } from '@/lib/useTheme';
import type { ProceduralGenome } from '@/types';

const MAX_MARKS = 5;

export default function MascotEditor() {
  const theme = useTheme();
  const mascot = useStore(s => s.mascot);
  const updateProceduralGenome = useStore(s => s.updateProceduralGenome);

  const initialOverrides = mascot?.procedural_genome?.userOverrides ?? {};
  const [bodyHue, setBodyHue] = useState<number | undefined>(initialOverrides.bodyHue);
  const [accentSaturation, setAccentSaturation] = useState<number | undefined>(initialOverrides.accentSaturation);
  const [markCount, setMarkCount] = useState<number>(
    initialOverrides.markCount ?? mascot?.procedural_genome?.marks.length ?? 0
  );
  const [disabledAccessories, setDisabledAccessories] = useState<string[]>(
    initialOverrides.disabledAccessories ?? []
  );

  const previewGenome: ProceduralGenome | null = useMemo(() => {
    if (!mascot?.procedural_genome) return null;
    return {
      ...mascot.procedural_genome,
      userOverrides: {
        ...(bodyHue !== undefined ? { bodyHue } : {}),
        ...(accentSaturation !== undefined ? { accentSaturation } : {}),
        markCount,
        disabledAccessories,
      },
    };
  }, [mascot?.procedural_genome, bodyHue, accentSaturation, markCount, disabledAccessories]);

  const handleSave = useCallback(async () => {
    if (!mascot || !mascot.procedural_genome) return;
    const updated: ProceduralGenome = {
      ...mascot.procedural_genome,
      userOverrides: {
        ...(bodyHue !== undefined ? { bodyHue } : {}),
        ...(accentSaturation !== undefined ? { accentSaturation } : {}),
        markCount,
        disabledAccessories,
      },
    };
    await updateProceduralGenome(updated);
    router.back();
  }, [mascot, bodyHue, accentSaturation, markCount, disabledAccessories, updateProceduralGenome]);

  const handleReset = useCallback(() => {
    setBodyHue(undefined);
    setAccentSaturation(undefined);
    setMarkCount(mascot?.procedural_genome?.marks.length ?? 0);
    setDisabledAccessories([]);
  }, [mascot]);

  const toggleAccessory = useCallback((id: string) => {
    setDisabledAccessories(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  if (!mascot) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]}>
        <Typography variant="body" style={{ color: theme.colors.textSecondary, padding: 16 }}>
          Mascote ainda não carregou.
        </Typography>
      </SafeAreaView>
    );
  }

  if (!mascot.procedural_genome) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]}>
        <View style={{ padding: 24, gap: 12 }}>
          <Typography variant="body" style={[styles.title, { color: theme.colors.text }]}>
            Sem genome procedural ainda
          </Typography>
          <Typography variant="body" style={{ color: theme.colors.textSecondary }}>
            Continue jogando — quando {mascot.name} atingir o próximo marco (evolução, streak ou conversa), o genome é gerado e você pode personalizar aqui.
          </Typography>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.btn, { backgroundColor: pressed ? theme.colors.primaryDeep ?? theme.colors.primary : theme.colors.primary }]}
            accessibilityRole="button"
          >
            <Typography variant="body" style={styles.btnLabel}>Voltar</Typography>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.previewWrap}>
          <Mascot2D
            personality={mascot.personality}
            phase={mascot.phase}
            mood={mascot.mood}
            size={220}
            dna={mascot.dna}
            proceduralGenome={previewGenome}
          />
        </View>

        <Section title="Cor do corpo" subtitle="Hue 0-360° (deixe em branco pra usar o IA)">
          <SliderRow
            label="Hue"
            value={bodyHue ?? mascot.procedural_genome.palette.body[0]}
            min={0}
            max={360}
            onChange={setBodyHue}
            theme={theme}
          />
          {bodyHue !== undefined && (
            <Pressable onPress={() => setBodyHue(undefined)} accessibilityRole="button" accessibilityLabel="Voltar cor do corpo ao gerado pela IA">
              <Typography variant="body" style={[styles.link, { color: theme.colors.primary }]}>
                Voltar ao IA
              </Typography>
            </Pressable>
          )}
        </Section>

        <Section title="Saturação do acento" subtitle="0 = mais sutil, 100 = vibrante">
          <SliderRow
            label="Saturação"
            value={accentSaturation ?? mascot.procedural_genome.palette.accent[1]}
            min={0}
            max={100}
            onChange={setAccentSaturation}
            theme={theme}
          />
          {accentSaturation !== undefined && (
            <Pressable onPress={() => setAccentSaturation(undefined)} accessibilityRole="button" accessibilityLabel="Voltar saturação do acento ao gerado pela IA">
              <Typography variant="body" style={[styles.link, { color: theme.colors.primary }]}>
                Voltar ao IA
              </Typography>
            </Pressable>
          )}
        </Section>

        <Section title="Marcas visíveis" subtitle={`Total IA gerou: ${mascot.procedural_genome.marks.length}`}>
          <SliderRow
            label={`${markCount} de ${MAX_MARKS}`}
            value={markCount}
            min={0}
            max={MAX_MARKS}
            onChange={setMarkCount}
            theme={theme}
            step={1}
          />
        </Section>

        {mascot.procedural_genome.accessories.length > 0 && (
          <Section title="Acessórios" subtitle="Desligue os que não gostou">
            {mascot.procedural_genome.accessories.map(a => (
              <View key={a.id} style={styles.accRow}>
                <View style={{ flex: 1 }}>
                  <Typography variant="body" style={{ color: theme.colors.text, fontWeight: '600' }}>
                    {a.id}
                  </Typography>
                  {a.origin ? (
                    <Typography variant="body" style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {a.origin}
                    </Typography>
                  ) : null}
                </View>
                <Switch
                  value={!disabledAccessories.includes(a.id)}
                  onValueChange={() => toggleAccessory(a.id)}
                />
              </View>
            ))}
          </Section>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.btnSecondary,
              {
                backgroundColor: pressed ? theme.colors.border : theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            accessibilityRole="button"
          >
            <Typography variant="body" style={{ color: theme.colors.text, fontWeight: '600' }}>
              Resetar pra IA
            </Typography>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.btn, { backgroundColor: pressed ? theme.colors.primaryDeep ?? theme.colors.primary : theme.colors.primary }]}
            accessibilityRole="button"
          >
            <Typography variant="body" style={styles.btnLabel}>Salvar</Typography>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Typography variant="body" style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body" style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
          {subtitle}
        </Typography>
      ) : null}
      {children}
    </View>
  );
}

// Slider simples — sem dep externa (RN não vem com Slider stable).
// Usa Pressable em row com posicionamento por toques. UX modesta mas funcional;
// decision documentada na spec: drag-and-drop SVG é overhead alto.
function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
  theme,
  step,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  theme: ReturnType<typeof useTheme>;
  /** Incremento por tap. Default: ~5% do range (mínimo 1) — assim hue 0-360
   *  anda em saltos de 18, markCount 0-5 anda de 1 em 1. O default antigo
   *  (step*5 com step=1) saltava 5 em todos os sliders, fazendo markCount
   *  pular min→max num único tap. */
  step?: number;
}) {
  const effectiveStep = step ?? Math.max(1, Math.round((max - min) / 20));
  const stepDown = () => onChange(Math.max(min, value - effectiveStep));
  const stepUp = () => onChange(Math.min(max, value + effectiveStep));
  return (
    <View style={styles.sliderRow}>
      <Pressable
        onPress={stepDown}
        style={({ pressed }) => [styles.sliderBtn, { backgroundColor: pressed ? theme.colors.border : theme.colors.bg }]}
        accessibilityRole="button"
        accessibilityLabel={`Diminuir ${label}`}
      >
        <Typography variant="body" style={{ color: theme.colors.text, fontWeight: '700' }}>−</Typography>
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Typography variant="body" style={{ color: theme.colors.text }}>{label}: {Math.round(value)}</Typography>
        <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
          <View
            style={[
              styles.thumb,
              {
                left: `${((value - min) / (max - min)) * 100}%`,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        </View>
      </View>
      <Pressable
        onPress={stepUp}
        style={({ pressed }) => [styles.sliderBtn, { backgroundColor: pressed ? theme.colors.border : theme.colors.bg }]}
        accessibilityRole="button"
        accessibilityLabel={`Aumentar ${label}`}
      >
        <Typography variant="body" style={{ color: theme.colors.text, fontWeight: '700' }}>+</Typography>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  previewWrap: { alignItems: 'center', paddingVertical: 16 },
  title: { fontSize: 22, fontWeight: '800' },
  section: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sliderBtn: {
    width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
  },
  track: { height: 4, borderRadius: 2, marginTop: 8, alignSelf: 'stretch', position: 'relative' },
  thumb: { position: 'absolute', top: -6, width: 16, height: 16, borderRadius: 8, marginLeft: -8 },
  link: { fontSize: 13, marginTop: 4 },
  accRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  btn: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  btnSecondary: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 999, alignItems: 'center', borderWidth: 1 },
  btnLabel: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
