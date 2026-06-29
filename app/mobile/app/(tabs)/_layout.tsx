import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/lib/useTheme';
import { makeShadow } from '@/lib/themes';
import { t } from '@/lib/i18n';

/**
 * Tab bar oficial: 4 abas (Home / Conversar / Evolução / Relatório).
 * Glass effect via BlurView (nativo) ou backdrop-filter (web).
 * Ícones SVG line — sem emojis (consistência visual premium).
 */
export default function TabsLayout() {
  const theme = useTheme();
  const isDark = theme.mode === 'dark';

  const renderIcon = (name: IconName) => ({ color, focused }: { color: string; focused: boolean }) => (
    <Icon name={name} size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textDim,
        tabBarStyle: {
          position: 'absolute',
          // Trick pra centralizar tab bar absoluta com maxWidth em web/RN:
          // left:0/right:0 + maxWidth + marginHorizontal:'auto'. Em mobile
          // (<560) o conteúdo já preenche os 100% via width:'92%'; em iPad
          // (≥768) o cap em 536 mantém alinhado com o ScrollView do Home.
          left: 0,
          right: 0,
          width: '92%',
          maxWidth: 536,
          marginHorizontal: 'auto',
          bottom: 16,
          height: 68,
          paddingTop: 10,
          paddingBottom: 12,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)',
          ...makeShadow('#28200F', 0, 12, 32, isDark ? 0.4 : 0.14, 10),
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            {Platform.OS === 'web' ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: isDark ? 'rgba(34,28,22,0.82)' : 'rgba(255,255,255,0.85)',
                    borderRadius: 26,
                  } as any,
                  {
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  } as any,
                ]}
              />
            ) : (
              <BlurView
                tint={isDark ? 'dark' : 'light'}
                intensity={85}
                style={[StyleSheet.absoluteFill, { borderRadius: 26, overflow: 'hidden' }]}
              />
            )}
          </View>
        ),
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 0.3,
          fontFamily: 'PlusJakartaSans_700Bold',
          marginTop: 2,
        },
        tabBarItemStyle: { paddingTop: 2 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: renderIcon('home'),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabs.chat'),
          tabBarIcon: renderIcon('message-circle'),
        }}
      />
      <Tabs.Screen
        name="evolution"
        options={{
          title: t('tabs.evolution'),
          tabBarIcon: renderIcon('sparkles'),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: t('tabs.report'),
          tabBarIcon: renderIcon('bar-chart'),
        }}
      />
    </Tabs>
  );
}
