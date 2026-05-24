import { router, Redirect } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import { logger } from '@/lib/logger';
import { rememberFromMessage } from '@/lib/memory';
import { creatureMoments } from '@/lib/moments';
import { entitlementService } from '@/services/subscription/EntitlementService';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import { color as dsColor } from '@/design-system/tokens';
import type { Theme } from '@/lib/themes';
import type { Message } from '@/types';

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
  const [showCvvBanner, setShowCvvBanner] = useState(true);
  const [ratedMessageIds, setRatedMessageIds] = useState<Set<string>>(() => new Set());
  const listRef = useRef<FlatList<ListItem>>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // Extrai memórias da mensagem do user em background (não bloqueia resposta).
      // Quando algo se torna memória, emite 'chat.memory_saved' pra outros
      // sistemas reagirem (ex: ProgressPulse de "criatura aprendeu algo novo").
      void rememberFromMessage(profile.id, text)
        .then((memory) => {
          if (memory) {
            creatureMoments.emit('chat.memory_saved', {
              kind: (memory as { kind?: string }).kind ?? 'message',
              summary: (memory as { summary?: string; content?: string }).summary
                ?? (memory as { content?: string }).content
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
      // Emite moment — outros sistemas (analytics, animação, voz) podem reagir.
      creatureMoments.emit('chat.reply_received', {
        source: result.source as 'mock' | 'fallback' | 'openai' | 'proxy',
        safety_flag: result.safety_flag,
      });
      scheduleScrollToEnd(80);
    } catch (err) {
      // Algo falhou no pipeline (persist user msg, gerar resposta, persist
      // resposta). Avisa o usuário em vez de deixar a mensagem sumir silente.
      logger.warn('[chat] send failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
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
          <Text accessibilityRole="header" style={styles.headerTitle}>{mascot.name}</Text>
          <View style={styles.headerSubRow}>
            <View style={[styles.statusDot, { backgroundColor: apiKey ? theme.colors.success : theme.colors.textDim }]} />
            <Text style={styles.headerSub}>
              {meta.label} · {apiKey ? 'IA conectada' : 'modo offline'}
              {!isPremium && dailyLimit !== null ? ` · ${dailyLimit} msgs/dia` : ''}
            </Text>
          </View>
        </View>
        <PressableScale style={styles.iconBtn} onPress={clearHistory} hitSlop={6} accessibilityLabel="Nova conversa">
          <Icon name="sparkles" size={16} color={theme.colors.text} strokeWidth={2} />
        </PressableScale>
        <PressableScale
          style={[styles.iconBtn, styles.iconBtnDanger]}
          onPress={() => router.push('/help')}
          accessibilityLabel="Ajuda emocional"
        >
          <Icon name="heart" size={16} color={theme.colors.error} strokeWidth={2.2} fill={theme.colors.error} />
        </PressableScale>
      </View>

      {showCvvBanner && (
        <View style={styles.cvvBanner}>
          <Pressable style={styles.cvvMain} onPress={() => router.push('/safe-night')}>
            <Icon name="shield" size={14} color="#8C4F1F" strokeWidth={2} />
            <Text style={styles.cvvText}>Tô em momento ruim · só presença</Text>
          </Pressable>
          <Pressable onPress={() => setShowCvvBanner(false)} hitSlop={8} accessibilityLabel="Fechar">
            <Icon name="x" size={14} color="#8C4F1F" strokeWidth={2.2} />
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
                <Text style={styles.emptyTitle}>Conversa vazia por enquanto</Text>
                <Text style={styles.emptyBody}>Escolha uma sugestão ou escreva como você está agora.</Text>
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
                  <Text style={styles.dateText}>{formatDate(item.date!)}</Text>
                  <View style={styles.dateLine} />
                </View>
              );
            }
            if (item.kind === 'system') {
              return (
                <View style={styles.systemWrap}>
                  <Text style={styles.systemText}>{item.message!.content}</Text>
                </View>
              );
            }
            const msg = item.message!;
            const isMascot = msg.role === 'mascot';
            return (
              <View>
                <ChatBubble
                  role={isMascot ? 'mascot' : 'user'}
                  text={msg.content}
                  mascotColor={meta.primaryColor}
                  safetyFlag={msg.safety_flag}
                />
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
            accessibilityLabel="Mostrar sugestões de conversa"
          >
            <Text style={styles.suggestionsToggleText}>Sugestões ▸</Text>
          </PressableScale>
        ) : null}
        {showSuggestions ? (
          <View>
            {list.length >= 6 ? (
              <PressableScale
                style={styles.suggestionsToggle}
                onPress={() => setShowSuggestions(false)}
                accessibilityLabel="Ocultar sugestões"
              >
                <Text style={styles.suggestionsToggleText}>Sugestões ▾</Text>
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
                >
                  <Text style={styles.suggestionText}>{s.label}</Text>
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
            accessibilityLabel="Enviar mensagem"
            hitSlop={8}
          >
            {sending ? (
              <Text style={styles.sendText}>…</Text>
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
    cvvText: { flex: 1, ...theme.text.xs, color: '#8C4F1F', fontWeight: '600' },
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
  });
}
