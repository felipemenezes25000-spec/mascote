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
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { chatSuggestions } from '@/content/replies';
import { getPersonality } from '@/content/personalities';
import { dateLocal, messages as messagesDb, todayLocal } from '@/lib/db';
import { generateReply } from '@/lib/ai';
import { rememberFromMessage } from '@/lib/memory';
import { entitlementService } from '@/services/subscription/EntitlementService';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
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
    // try/finally garante setSending(false) MESMO se messagesDb.add falhar
    // (AsyncStorage cheio, JSON.stringify estourar limite, etc). Sem isso,
    // o botão de enviar ficava desabilitado pra sempre e o user não tinha como
    // se recuperar a não ser fechar o app.
    try {
      const userMsg = await messagesDb.add({
        conversation_id: profile.id,
        role: 'user',
        content: text,
        safety_flag: 'safe',
        cached: false,
      });
      setList(prev => [...prev, userMsg]);
      if (!messageOverride) setInput('');

      // Extrai memórias da mensagem do user em background (não bloqueia resposta).
      void rememberFromMessage(profile.id, text).catch(() => {});

      scheduleScrollToEnd(60);

      // build history (último 5 messages do mesmo conversation)
      const history = list.slice(-6).map(m => ({
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
      scheduleScrollToEnd(80);
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
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
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
            return (
              <ChatBubble
                role={item.message!.role === 'user' ? 'user' : 'mascot'}
                text={item.message!.content}
                mascotColor={meta.primaryColor}
                safetyFlag={item.message!.safety_flag}
              />
            );
          }}
        />

        {showSuggestions && list.length < 6 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // `flexGrow: 0` impede o ScrollView de esticar verticalmente em
            // flex-column. Sem isso, no web RN os chips viravam pills altíssimas
            // que ocupavam todo o espaço entre as mensagens e o input.
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
        )}

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
    iconBtnDanger: { backgroundColor: theme.colors.error + '12', borderColor: theme.colors.error + '30' },
    cvvBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF1E8',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.warning + '55',
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
