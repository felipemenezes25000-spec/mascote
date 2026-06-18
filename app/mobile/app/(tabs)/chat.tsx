import { router, Redirect } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatReplyRating } from '@/components/ChatReplyRating';
import { TypingIndicator } from '@/components/TypingIndicator';
import { trackAiReplyRated } from '@/analytics/trackAiReply';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { chatSuggestions } from '@/content/replies';
import { getPersonality } from '@/content/personalities';
import { dateLocal, messages as messagesDb, todayLocal } from '@/lib/db';
import { generateReply } from '@/lib/ai';
import { sendChatMessage } from '@/lib/ai/chat-engine';
import { getWorld, journeyPhaseFromXp } from '@/game/journey';
import { logger } from '@/lib/logger';
import { rememberFromMessage } from '@/lib/memory';
import { creatureMoments } from '@/lib/moments';
import {
  clearCrisisBannerCooldown,
  isCrisisBannerOnCooldown,
  markCrisisBannerDismissed,
} from '@/lib/crisisBannerCooldown';
import { entitlementService } from '@/services/subscription/EntitlementService';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import { color as dsColor } from '@/design-system/tokens';
import type { Theme } from '@/lib/themes';
import type { Message } from '@/types';

import { Typography } from '@/components/ui';
interface ListItem {
  kind: 'message' | 'date' | 'system';
  id: string;
  message?: Message;
  date?: string;
}

export default function ChatTab() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const apiKey = useStore(s => s.openAiKey);
  const { tier, isPremium } = useSubscriptionTier();
  const [input, setInput] = useState('');
  const [list, setList] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  // Começa escondido até confirmar via AsyncStorage que NÃO está em cooldown.
  // Anti-flash: melhor banner aparecer 50ms depois do que piscar pra fechar
  // logo após em sessão recém-dismissed.
  const [showCvvBanner, setShowCvvBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const onCooldown = await isCrisisBannerOnCooldown();
      if (!cancelled) setShowCvvBanner(!onCooldown);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [ratedMessageIds, setRatedMessageIds] = useState<Set<string>>(() => new Set());
  // Mapa msg.id -> 'openai' | 'local'. Persistido SO em memoria (efemero):
  // o source nao vai pra DB pra nao virar artefato historico — o user pode
  // ter trocado modo entre sessoes e o badge "modo local" so faz sentido
  // pra mensagens da sessao atual. Em cold start o map fica vazio — bubbles
  // antigos nao mostram badge (comportamento esperado, sem ruido visual).
  const [messageSources, setMessageSources] = useState<Map<string, 'openai' | 'local'>>(() => new Map());
  const listRef = useRef<FlatList<ListItem>>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard contra duplo-greeting: StrictMode roda effects 2x em dev e o
  // load() pode rodar 2x antes do primeiro await terminar — dois greetings
  // duplicados na primeira abertura. Ref vinculada ao profile.id.
  const greetingCreatedForProfileRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
  }, []);

  function scheduleScrollToEnd(ms: number) {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      ms
    );
  }

  useEffect(() => {
    if (!profile) return;
    void load();
  }, [profile?.id]);

  async function load() {
    if (!profile || !mascot) return;
    const rows = await messagesDb.listRecent(profile.id, 80);
    if (rows.length === 0) {
      // Guard re-entrancia (StrictMode + race): se outro load() ja criou
      // greeting pra esse profile, refresh list e sai sem duplicar.
      if (greetingCreatedForProfileRef.current === profile.id) {
        const refreshed = await messagesDb.listRecent(profile.id, 80);
        setList(refreshed);
        return;
      }
      greetingCreatedForProfileRef.current = profile.id;
      const meta = getPersonality(mascot.personality);
      const greeting = await messagesDb.add({
        conversation_id: profile.id,
        role: 'mascot',
        content: meta.greeting,
        safety_flag: 'safe',
        cached: false,
      });
      setList([greeting]);
    } else {
      setList(rows);
    }
  }

  async function send(messageOverride?: string) {
    if (!profile || !mascot || sending) return;
    const text = (messageOverride ?? input).trim();
    if (!text) return;

    const dailyLimit = entitlementService.dailyChatLimit(tier);
    if (dailyLimit !== null) {
      const sentToday = await messagesDb.countUserToday(profile.id, todayLocal());
      if (sentToday >= dailyLimit) {
        router.push({ pathname: '/paywall', params: { trigger: 'premium_feature' } });
        return;
      }
    }

    setSending(true);
    setShowSuggestions(false);
    // try/catch/finally garante setSending(false) MESMO se messagesDb.add ou
    // generateReply falhar (AsyncStorage cheio, IA offline, etc). Sem o catch
    // visível, a mensagem do user "sumia" sem nenhum feedback.
    let userMsg: Message | null = null;
    try {
      userMsg = await messagesDb.add({
        conversation_id: profile.id,
        role: 'user',
        content: text,
        safety_flag: 'safe',
        cached: false,
      });
      setList(prev => [...prev, userMsg!]);
      if (!messageOverride) setInput('');

      // Fase 2 da evolução visível: a conversa molda o genoma DEVAGAR (drift por
      // tema/emoção, teto diário, pula crise). Fire-and-forget — não bloqueia a
      // resposta; a criatura muda sutilmente ao longo de semanas.
      void useStore.getState().driftDnaFromChat(text);

      // Extrai memórias da mensagem do user em background (não bloqueia resposta).
      // Quando algo se torna memória, emite 'chat.memory_saved' pra outros
      // sistemas reagirem (ex: ProgressPulse de "criatura aprendeu algo novo").
      void rememberFromMessage(profile.id, text)
        .then((memories) => {
          // rememberFromMessage retorna MemoryItem[] — `if (memory)` sobre o
          // array era SEMPRE truthy (mesmo []), então o moment disparava em TODA
          // mensagem e `.kind`/`.summary` (num array) eram undefined → caía no
          // fallback. Agora só emite quando algo foi REALMENTE memorizado, com o
          // payload do 1º item salvo. Auditoria 2026-06-11.
          const saved = memories?.[0];
          if (saved) {
            creatureMoments.emit('chat.memory_saved', {
              kind: (saved as { kind?: string }).kind ?? 'message',
              summary: (saved as { summary?: string; content?: string }).summary
                ?? (saved as { content?: string }).content
                ?? text.slice(0, 80),
            });
          }
        })
        .catch((err) => {
          // Falha em memory é não-fatal pro chat — mas catch silencioso
          // mascarava AsyncStorage cheio / embedding service offline em prod.
          logger.warn('[chat] rememberFromMessage failed (non-fatal)', {
            reason: err instanceof Error ? err.message : 'unknown',
          });
        });

      scheduleScrollToEnd(60);

      // build history (último 5 messages do mesmo conversation).
      // Inclui o userMsg recém persistido — `list` ainda é estado anterior
      // (setList é assíncrono), então `[...list, userMsg]` é a única forma
      // de a IA enxergar a mensagem que acabou de chegar como contexto.
      const history = [...list, userMsg].slice(-6).map(m => ({
        role: m.role === 'user' ? ('user' as const) : ('mascot' as const),
        content: m.content,
      }));

      const result = await generateReply(mascot.personality, text, {
        apiKey: apiKey ?? undefined,
        history,
        mascotName: mascot.name,
        userId: profile.id,
        // DNA injeta DESCRITORES SEMÂNTICOS no system prompt via
        // dnaPromptSection (NUNCA gene cru — provado em
        // tests/security/dna-privacy-ai.test.ts). Sem isso, IA fala como
        // persona genérica, ignorando a identidade da criatura.
        dna: mascot.dna,
      });
      const reply = await messagesDb.add({
        conversation_id: profile.id,
        role: 'mascot',
        content: result.reply,
        safety_flag: result.safety_flag,
        cached: false,
      });
      setList(prev => [...prev, reply]);
      // Plumba source pra UI exibir badge "modo local" em mensagens nao-IA.
      // Mapeamento: 'openai' -> cloud; 'mock' | 'fallback' -> local. fallback
      // inclui safety overrides (crisis_reply, diagnosis_redirect) e budget
      // exceeded — todos casos onde a IA real NAO foi quem respondeu.
      const uiSource: 'openai' | 'local' = result.source === 'openai' ? 'openai' : 'local';
      setMessageSources(prev => {
        const next = new Map(prev);
        next.set(reply.id, uiSource);
        return next;
      });
      // Emite moment — outros sistemas (analytics, animação, voz) podem reagir.
      creatureMoments.emit('chat.reply_received', {
        source: result.source as 'mock' | 'fallback' | 'openai' | 'proxy',
        safety_flag: result.safety_flag,
      });
      // Crise NOVA reabre o banner de CVV mesmo dentro do cooldown de 7 dias.
      // O cooldown é anti-nag pra um banner de conveniência; mas se o user voltar
      // a sinalizar crise, suprimir o caminho rápido pro CVV seria perigoso. Crise
      // é o sinal mais forte de que ele PRECISA do banner agora (auditoria jun/18).
      if (result.safety_flag === 'critical') {
        void clearCrisisBannerCooldown();
        setShowCvvBanner(true);
      }
      scheduleScrollToEnd(80);
    } catch (err) {
      // Algo falhou no pipeline (persist user msg, gerar resposta, persist
      // resposta). Tenta sendChatMessage como ultimo recurso — ele tem
      // fallback interno pro mock local e nao consome o pipeline de safety
      // (entao so chamamos quando o erro ja aconteceu depois do user msg
      // ter sido persistido com sucesso).
      logger.warn('[chat] send failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
      // Se o userMsg conseguiu ser persistido, vale tentar uma resposta
      // best-effort via sendChatMessage (que cai pro mockReply local).
      if (userMsg) {
        try {
          const fb = await sendChatMessage(text, {
            personality: mascot.personality,
            mascotName: mascot.name,
            // Consciência de progresso: a IA sabe a fase/mundo da Jornada
            // (conteúdo estático do app, não user-controlled — seguro).
            identity: {
              name: mascot.name,
              level: mascot.level,
              journey: {
                phase: journeyPhaseFromXp(mascot.xp).n,
                world: getWorld(journeyPhaseFromXp(mascot.xp).worldId).name,
              },
            },
          });
          const fbReply = await messagesDb.add({
            conversation_id: profile.id,
            role: 'mascot',
            content: fb.content,
            // Antes hardcodava 'safe': se generateReply quebrasse numa mensagem
            // de crise, o CRISIS_REPLY do fallback era gravado como 'safe' e a UI
            // de crise (estilo do ChatBubble + supressão do rating) não disparava.
            safety_flag: fb.safetyFlag,
            cached: false,
          });
          setList(prev => [...prev, fbReply]);
          setMessageSources(prev => {
            const next = new Map(prev);
            next.set(fbReply.id, fb.source);
            return next;
          });
          // Mesma reabertura de crise do happy-path: se o fallback gerou
          // CRISIS_REPLY, o banner de CVV volta mesmo dentro do cooldown.
          if (fb.safetyFlag === 'critical') {
            void clearCrisisBannerCooldown();
            setShowCvvBanner(true);
          }
          return;
        } catch {
          /* segue pro system msg padrao abaixo */
        }
      }
      try {
        const sysMsg = await messagesDb.add({
          conversation_id: profile.id,
          role: 'system',
          content: 'Não consegui responder agora. Tenta de novo em um instante.',
          safety_flag: 'safe',
          cached: false,
        });
        setList(prev => [...prev, sysMsg]);
      } catch {
        /* se nem o system msg salva, AsyncStorage tá com problema sério */
      }
    } finally {
      setSending(false);
    }
  }

  async function clearHistory() {
    if (!profile || !mascot) return;
    await messagesDb.clearConversation(profile.id);
    const meta = getPersonality(mascot.personality);
    const greeting = await messagesDb.add({
      conversation_id: profile.id,
      role: 'mascot',
      content: meta.greeting,
      safety_flag: 'safe',
      cached: false,
    });
    setList([greeting]);
    setShowSuggestions(true);
    setRatedMessageIds(new Set());
    setMessageSources(new Map());
  }

  function shouldShowRating(message: Message): boolean {
    if (message.role !== 'mascot') return false;
    if (message.safety_flag === 'critical') return false;
    if (ratedMessageIds.has(message.id)) return false;
    return true;
  }

  function handleReplyRated(messageId: string, helpful: boolean, repetition: boolean) {
    trackAiReplyRated(helpful, repetition);
    setRatedMessageIds(prev => new Set(prev).add(messageId));
  }

  // monta items com date separators (em horário LOCAL, consistente com todayLocal())
  const items = useMemo(() => {
    const out: ListItem[] = [];
    let lastDate = '';
    for (const m of list) {
      const d = dateLocal(new Date(m.created_at));
      if (d !== lastDate) {
        out.push({ kind: 'date', id: `d-${d}`, date: d });
        lastDate = d;
      }
      if (m.role === 'system') {
        out.push({ kind: 'system', id: m.id, message: m });
      } else {
        out.push({ kind: 'message', id: m.id, message: m });
      }
    }
    return out;
  }, [list]);

  if (!profile || !mascot) return <Redirect href="/splash" />;
  const meta = getPersonality(mascot.personality);
  const dailyLimit = entitlementService.dailyChatLimit(tier);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        {/* Avatar replica a paleta do mascote no Home: fundo laranja-brand
            (corpo do robô) + dot na cor da personalidade (acentos). Antes
            o chat mostrava só a cor da personalidade, dando impressão de
            "mascote diferente" entre as telas. */}
        <View style={[styles.avatarWrap, { backgroundColor: theme.colors.primary + '22', borderColor: theme.colors.primary + '40' }]}>
          <View style={[styles.dot, { backgroundColor: meta.primaryColor }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Typography variant="body" accessibilityRole="header" style={styles.headerTitle}>{mascot.name}</Typography>
          <View style={styles.headerSubRow}>
            <View style={[styles.statusDot, { backgroundColor: apiKey ? theme.colors.success : theme.colors.textDim }]} />
            <Typography variant="body" style={styles.headerSub}>
              {meta.label} · {apiKey ? 'IA conectada' : 'modo offline'}
              {!isPremium && dailyLimit !== null ? ` · ${dailyLimit} msgs/dia` : ''}
            </Typography>
          </View>
        </View>
        <PressableScale style={styles.iconBtn} onPress={clearHistory} hitSlop={6} accessibilityRole="button" accessibilityLabel="Nova conversa">
          <Icon name="sparkles" size={16} color={theme.colors.text} strokeWidth={2} />
        </PressableScale>
        <PressableScale
          style={[styles.iconBtn, styles.iconBtnDanger]}
          onPress={() => router.push('/help')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ajuda emocional"
        >
          <Icon name="heart" size={16} color={theme.colors.error} strokeWidth={2.2} fill={theme.colors.error} />
        </PressableScale>
      </View>

      {showCvvBanner && (
        <View style={styles.cvvBanner}>
          <Pressable
            style={styles.cvvMain}
            onPress={() => router.push('/safe-night')}
            accessibilityRole="button"
            accessibilityLabel="Tô em momento ruim · só presença"
            // cvvBanner tem paddingVertical 10 + Icon 14 → ~34px height. hitSlop
            // top/bottom 6 leva alvo pra ~46px sem encostar no input bar acima.
            hitSlop={{ top: 6, bottom: 6 }}
          >
            <Icon name="shield" size={14} color={theme.colors.warning} strokeWidth={2} />
            <Typography variant="body" style={styles.cvvText}>Tô em momento ruim · só presença</Typography>
          </Pressable>
          <Pressable
            onPress={() => {
              setShowCvvBanner(false);
              void markCrisisBannerDismissed();
            }}
            // Icon 14 sem padding → hitSlop 15 leva o alvo de toque a ~44px (mín. a11y),
            // crítico por estar no fluxo de crise/segurança.
            hitSlop={15}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <Icon name="x" size={14} color={theme.colors.text} strokeWidth={2.2} />
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !sending ? (
              <View style={styles.emptyWrap}>
                <Typography variant="body" style={styles.emptyTitle}>Conversa vazia por enquanto</Typography>
                <Typography variant="body" style={styles.emptyBody}>Escolha uma sugestão ou escreva como você está agora.</Typography>
              </View>
            ) : null
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={sending ? <TypingIndicator mascotColor={meta.primaryColor} /> : null}
          renderItem={({ item }) => {
            if (item.kind === 'date') {
              return (
                <View style={styles.dateSep}>
                  <View style={styles.dateLine} />
                  <Typography variant="body" style={styles.dateText}>{formatDate(item.date!)}</Typography>
                  <View style={styles.dateLine} />
                </View>
              );
            }
            if (item.kind === 'system') {
              return (
                <View style={styles.systemWrap}>
                  <Typography variant="body" style={styles.systemText}>{item.message!.content}</Typography>
                </View>
              );
            }
            const msg = item.message!;
            const isMascot = msg.role === 'mascot';
            const msgSource = messageSources.get(msg.id);
            const showLocalBadge = isMascot && msgSource === 'local';
            return (
              <View>
                <ChatBubble
                  role={isMascot ? 'mascot' : 'user'}
                  text={msg.content}
                  mascotColor={meta.primaryColor}
                  safetyFlag={msg.safety_flag}
                />
                {showLocalBadge ? (
                  <View style={styles.localBadgeWrap}>
                    <Typography
                      variant="body"
                      style={styles.localBadge}
                      accessibilityLabel="Resposta local sem IA na nuvem"
                    >
                      modo local
                    </Typography>
                  </View>
                ) : null}
                {isMascot && shouldShowRating(msg) ? (
                  <ChatReplyRating
                    onRate={(helpful, repetition) => handleReplyRated(msg.id, helpful, repetition)}
                  />
                ) : null}
              </View>
            );
          }}
        />

        {list.length >= 6 && !showSuggestions ? (
          <PressableScale
            style={styles.suggestionsToggle}
            onPress={() => setShowSuggestions(true)}
            accessibilityRole="button"
            accessibilityLabel="Mostrar sugestões de conversa"
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Typography variant="body" style={styles.suggestionsToggleText}>Sugestões ▸</Typography>
          </PressableScale>
        ) : null}
        {showSuggestions ? (
          <View>
            {list.length >= 6 ? (
              <PressableScale
                style={styles.suggestionsToggle}
                onPress={() => setShowSuggestions(false)}
                accessibilityRole="button"
                accessibilityLabel="Ocultar sugestões"
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              >
                <Typography variant="body" style={styles.suggestionsToggleText}>Sugestões ▾</Typography>
              </PressableScale>
            ) : null}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionsScroll}
              contentContainerStyle={styles.suggestionsRow}
            >
              {chatSuggestions.map(s => (
                <PressableScale
                  key={s.label}
                  style={styles.suggestionChip}
                  onPress={() => send(s.text)}
                  accessibilityRole="button"
                  // hitSlop 8 garante ~44px alvo de toque sem alterar visual.
                  // suggestionChip tem paddingVertical 8 + body ~22lh = ~38px.
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Typography variant="body" style={styles.suggestionText}>{s.label}</Typography>
                </PressableScale>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.inputBar}>
          <TextInput
            testID="chat_input"
            accessibilityLabel="Mensagem pro mascote"
            value={input}
            onChangeText={setInput}
            placeholder="Conta como você tá..."
            placeholderTextColor={theme.colors.textDim}
            style={styles.input}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            multiline
            maxLength={2000}
            // No web (multiline vira <textarea>), Enter quebra linha em vez de enviar;
            // Enter sozinho envia, Shift+Enter mantém nova linha.
            onKeyPress={(e: any) => {
              if (Platform.OS === 'web' && e?.nativeEvent?.key === 'Enter' && !e?.nativeEvent?.shiftKey) {
                e.preventDefault?.();
                if (input.trim() && !sending) send();
              }
            }}
          />
          <PressableScale
            onPress={() => send()}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            hitSlop={8}
          >
            {sending ? (
              <Typography variant="body" style={styles.sendText}>…</Typography>
            ) : (
              <Icon name="arrow-right" size={20} color="#fff" strokeWidth={2.6} />
            )}
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatDate(date: string): string {
  const today = todayLocal();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const ydStr = dateLocal(yesterday);
  if (date === today) return 'Hoje';
  if (date === ydStr) return 'Ontem';
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...theme.shadow.sm,
    },
    avatarWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    dot: { width: 12, height: 12, borderRadius: 6 },
    headerTitle: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 19,
      lineHeight: 22,
      letterSpacing: -0.2,
    },
    headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
    headerSub: { ...theme.text.xs, color: theme.colors.textSecondary, fontSize: 11 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconBtnDanger: { backgroundColor: theme.colors.error + dsColor.alpha20, borderColor: theme.colors.error + dsColor.alpha25 },
    cvvBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryTint,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.warning + dsColor.alpha33,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      gap: theme.spacing.sm,
    },
    cvvMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    cvvText: { flex: 1, ...theme.text.xs, color: theme.colors.text, fontWeight: '600' },
    listContent: { paddingVertical: theme.spacing.md, gap: 4 },
    emptyWrap: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: 4,
    },
    emptyTitle: { ...theme.text.bodyBold, color: theme.colors.text },
    emptyBody: { ...theme.text.sm, color: theme.colors.textSecondary, lineHeight: 18 },
    dateSep: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    dateLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
    dateText: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10,
    },
    systemWrap: {
      backgroundColor: theme.colors.border + '40',
      marginHorizontal: theme.spacing.md,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.md,
      marginVertical: 6,
      alignItems: 'center',
    },
    systemText: { ...theme.text.xs, color: theme.colors.textSecondary, lineHeight: 16, fontStyle: 'italic', fontFamily: 'InstrumentSerif_400Regular_Italic' },
    suggestionsScroll: { flexGrow: 0 },
    suggestionsRow: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
      alignItems: 'center',
    },
    suggestionsToggle: {
      alignSelf: 'center',
      marginVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    suggestionsToggleText: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    suggestionChip: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: theme.spacing.sm,
      ...theme.shadow.sm,
    },
    suggestionText: { ...theme.text.sm, color: theme.colors.text, fontWeight: '600' },
    inputBar: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      // Tab bar é position:absolute (height 68 + bottom 16 = 84). Sem este
      // marginBottom o input ficava ~40px atrás da tab bar floating em web/mobile
      // sem teclado aberto.
      marginBottom: 84,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.bg,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      fontSize: 15,
      color: theme.colors.text,
      maxHeight: 110,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadow.sm,
    },
    sendText: { color: '#fff', fontSize: 22, lineHeight: 24, fontWeight: '700' },
    // Chip "modo local" embaixo de bubbles do mascote quando a resposta
    // veio do mockReply (sem chave OpenAI ou fallback de safety). Texto
    // pequeno, monoespaco, alinhado com o bubble do mascote (esquerda).
    localBadgeWrap: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      marginTop: -2,
      marginBottom: 4,
    },
    localBadge: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      fontSize: 10,
      fontFamily: 'JetBrainsMono_400Regular',
      letterSpacing: 0.4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.border + '40',
    },
  });
}
