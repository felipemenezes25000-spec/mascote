/**
 * onboarding/identity.tsx — 3 perguntas que selam a identidade inicial do mascote.
 *
 * Cada resposta é mapeada para os tipos existentes do motor de evolução
 * (UserGoal, CommunicationTone, BondType) e encaminhada para /onboarding/mascot
 * que já gera o DNA. O usuário NÃO precisa saber dos tipos internos — só vê
 * os rótulos do spec (Guardião / Explorador / Sonhador / Focado / Criativo).
 *
 * Por que stepper interno em vez de 3 rotas: dá ritmo de magazine e a animação
 * fica fluída. Cada pergunta tem ~5s, então 3 perguntas em ~15s + pergunta
 * de boas-vindas anterior = 90s totais até o reveal do DNA, exatamente o que
 * o spec pede ("90 segundos para criar vínculo").
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { StaggeredView } from '@/components/StaggeredView';
import { mapGoalToUserGoal } from '@/lib/onboarding-evolution';
import { stepLabel } from '@/lib/onboarding-flow';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { BondType, CommunicationTone } from '@/game/evolution/EvolutionTypes';
import type { Personality } from '@/types';

type Step = 0 | 1 | 2;

interface Objetivo {
  id: string;
  label: string;
  goalId: string;
  icon: IconName;
}

interface Tom {
  id: string;
  label: string;
  desc: string;
  tone: CommunicationTone;
}

interface Mascote {
  id: 'bipo' | 'zip' | 'lulu' | 'aro';
  mascotName: string;
  label: string;
  tagline: string;
  personality: Personality;
  bond: BondType;
  icon: IconName;
}

const OBJETIVOS: Objetivo[] = [
  { id: 'energia',    label: 'Ter mais energia',         goalId: 'energia',   icon: 'zap' },
  { id: 'sono',       label: 'Dormir melhor',            goalId: 'sono',      icon: 'moon' },
  { id: 'mental',     label: 'Cuidar da saúde mental',   goalId: 'ansiedade', icon: 'heart' },
  { id: 'disciplina', label: 'Ser mais disciplinado',    goalId: 'rotina',    icon: 'target' },
  { id: 'rotina',     label: 'Criar uma rotina',         goalId: 'rotina',    icon: 'tree' },
  { id: 'estresse',   label: 'Reduzir estresse',         goalId: 'ansiedade', icon: 'wind' },
];

const TONS: Tom[] = [
  { id: 'fofo',       label: 'Fofo',       desc: 'Doce, acolhedor, com carinho',     tone: 'carinhoso' },
  { id: 'engracado',  label: 'Engraçado',  desc: 'Solta uma piada quando precisa',   tone: 'engracado' },
  { id: 'motivador',  label: 'Motivador',  desc: 'Empurra com leveza, sem grito',    tone: 'direto' },
  { id: 'calmo',      label: 'Calmo',      desc: 'Fala pausado, respira junto',      tone: 'poetico' },
  { id: 'direto',     label: 'Direto',     desc: 'Vai no ponto, sem rodeio',         tone: 'direto' },
];

// Substituído "Energia" abstrata pela escolha direta dos 4 mascotes oficiais —
// alinha com landing mascotevirtual.com.br. Bond é derivado do mascote pra
// alimentar o motor de DNA sem perder a essência procedural.
const MASCOTES: Mascote[] = [
  { id: 'bipo', mascotName: 'Bipo', label: 'O Calmo',       tagline: 'Presença que não corre.',  personality: 'calmo',     bond: 'companheiro',   icon: 'wind' },
  { id: 'zip',  mascotName: 'Zip',  label: 'O Motivador',   tagline: 'Energia que não bate.',    personality: 'motivador', bond: 'guardiao',      icon: 'zap' },
  { id: 'lulu', mascotName: 'Lulu', label: 'A Companheira', tagline: 'Carinho que escuta.',      personality: 'fofo',      bond: 'criatura_fofa', icon: 'heart' },
  { id: 'aro',  mascotName: 'Aro',  label: 'O Sábio',       tagline: 'Pergunta que ilumina.',    personality: 'sabio',     bond: 'espirito',      icon: 'sparkle' },
];

export default function IdentityOnboarding() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams<{ display_name?: string; age_band?: string; mood?: string }>();

  const [step, setStep] = useState<Step>(0);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [tom, setTom] = useState<Tom | null>(null);
  const [mascote, setMascote] = useState<Mascote | null>(null);

  const totalSteps = 3;
  const progress = ((step + 1) / totalSteps) * 100;

  const proceed = () => {
    if (step === 0 && objetivo) setStep(1);
    else if (step === 1 && tom) setStep(2);
    else if (step === 2 && mascote && objetivo && tom) finish(objetivo, tom, mascote);
  };

  const back = () => {
    if (step === 0) router.back();
    else setStep((step - 1) as Step);
  };

  const finish = (o: Objetivo, t: Tom, m: Mascote) => {
    // Pula goal/style/quick — identity já cobre o essencial. Personality
    // vem direta do mascote escolhido; bond viaja pra alimentar DNA mas
    // não decide mais a personalidade.
    router.push({
      pathname: '/onboarding/mascot',
      params: {
        ...params,
        goal: o.goalId,
        mood: params.mood ?? '4',
        style: 'soft',
        bond: m.bond,
        tone: t.tone,
        pronoun: 'ele',
        primaryGoal: mapGoalToUserGoal(o.goalId),
        personality: m.personality,
        // labels do spec — preservados pra UI/copy
        identity_objetivo: o.id,
        identity_tom: t.id,
        identity_mascote: m.id,
      },
    });
  };

  const canProceed =
    (step === 0 && !!objetivo) ||
    (step === 1 && !!tom) ||
    (step === 2 && !!mascote);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.headerRow}>
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.backBtn}>
            <Icon name="arrow-left" size={18} color={theme.colors.textSecondary} strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.kicker}>{stepLabel('quiz')} · {step + 1} de {totalSteps}</Text>
          <View style={styles.backBtn} />
        </View>

        {step === 0 && (
          <StepObjetivo
            theme={theme}
            styles={styles}
            selected={objetivo}
            onSelect={setObjetivo}
          />
        )}
        {step === 1 && (
          <StepTom
            theme={theme}
            styles={styles}
            selected={tom}
            onSelect={setTom}
          />
        )}
        {step === 2 && (
          <StepMascote
            theme={theme}
            styles={styles}
            selected={mascote}
            onSelect={setMascote}
          />
        )}

        <Button
          label={step === 2 ? 'Gerar meu mascote' : 'Continuar'}
          onPress={proceed}
          disabled={!canProceed}
        />
      </View>
    </SafeAreaView>
  );
}

function StepObjetivo({
  theme, styles, selected, onSelect,
}: { theme: Theme; styles: ReturnType<typeof makeStyles>; selected: Objetivo | null; onSelect: (o: Objetivo) => void }) {
  return (
    <>
      <StaggeredView index={0}>
        <Text style={styles.title}>O que tá te trazendo aqui hoje?</Text>
        <Text style={styles.subtitle}>Pode mudar depois. Vou usar pra começar pelo lugar certo.</Text>
      </StaggeredView>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
        {OBJETIVOS.map((o, i) => (
          <StaggeredView key={o.id} index={i + 1} step={40}>
            <PressableScale
              style={[styles.opt, selected?.id === o.id && styles.optSelected]}
              onPress={() => onSelect(o)}
              accessibilityLabel={o.label}
            >
              <View style={[styles.iconWrap, selected?.id === o.id && styles.iconWrapSelected]}>
                <Icon name={o.icon} size={18} color={selected?.id === o.id ? '#fff' : theme.colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={[styles.optLabel, selected?.id === o.id && styles.optLabelSelected]}>{o.label}</Text>
              {selected?.id === o.id && <Icon name="check" size={18} color="#fff" strokeWidth={2.8} />}
            </PressableScale>
          </StaggeredView>
        ))}
      </ScrollView>
    </>
  );
}

function StepTom({
  theme, styles, selected, onSelect,
}: { theme: Theme; styles: ReturnType<typeof makeStyles>; selected: Tom | null; onSelect: (t: Tom) => void }) {
  return (
    <>
      <StaggeredView index={0}>
        <Text style={styles.title}>Como você quer que ele fale com você?</Text>
        <Text style={styles.subtitle}>O jeito de falar muda quando seu mascote evolui — mas começa por aqui.</Text>
      </StaggeredView>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
        {TONS.map((t, i) => (
          <StaggeredView key={t.id} index={i + 1} step={40}>
            <PressableScale
              style={[styles.opt, selected?.id === t.id && styles.optSelected]}
              onPress={() => onSelect(t)}
              accessibilityLabel={t.label}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optLabel, selected?.id === t.id && styles.optLabelSelected]}>{t.label}</Text>
                <Text style={[styles.optDesc, selected?.id === t.id && styles.optDescSelected]}>{t.desc}</Text>
              </View>
              {selected?.id === t.id && <Icon name="check" size={18} color="#fff" strokeWidth={2.8} />}
            </PressableScale>
          </StaggeredView>
        ))}
      </ScrollView>
    </>
  );
}

function StepMascote({
  theme, styles, selected, onSelect,
}: { theme: Theme; styles: ReturnType<typeof makeStyles>; selected: Mascote | null; onSelect: (m: Mascote) => void }) {
  return (
    <>
      <StaggeredView index={0}>
        <Text style={styles.title}>Quem vai cuidar com você?</Text>
        <Text style={styles.subtitle}>Quatro almas, um mascote. Escolhe quem combina com seu momento.</Text>
      </StaggeredView>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
        {MASCOTES.map((m, i) => (
          <StaggeredView key={m.id} index={i + 1} step={40}>
            <PressableScale
              style={[styles.opt, selected?.id === m.id && styles.optSelected]}
              onPress={() => onSelect(m)}
              accessibilityLabel={`${m.mascotName} — ${m.label}`}
            >
              <View style={[styles.iconWrap, selected?.id === m.id && styles.iconWrapSelected]}>
                <Icon name={m.icon} size={18} color={selected?.id === m.id ? '#fff' : theme.colors.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optLabel, selected?.id === m.id && styles.optLabelSelected]}>
                  {m.mascotName} · {m.label}
                </Text>
                <Text style={[styles.optDesc, selected?.id === m.id && styles.optDescSelected]} numberOfLines={2}>
                  "{m.tagline}"
                </Text>
              </View>
              {selected?.id === m.id && <Icon name="check" size={18} color="#fff" strokeWidth={2.8} />}
            </PressableScale>
          </StaggeredView>
        ))}
      </ScrollView>
    </>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    progressBar: {
      height: 3,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'flex-start' },
    kicker: {
      fontSize: 10,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      fontFamily: 'JetBrainsMono_500Medium',
    },
    title: {
      ...theme.text.h1,
      color: theme.colors.text,
      marginTop: theme.spacing.sm,
      fontSize: 28,
      letterSpacing: -0.6,
      lineHeight: 32,
    },
    subtitle: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 15,
      lineHeight: 21,
    },
    opt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm,
    },
    optSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapSelected: { backgroundColor: 'rgba(255,255,255,0.22)' },
    optLabel: {
      ...theme.text.body,
      color: theme.colors.text,
      flex: 1,
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 15,
    },
    optLabelSelected: { color: '#fff', fontWeight: '700' },
    optDesc: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    optDescSelected: { color: 'rgba(255,255,255,0.85)' },
  });
}
