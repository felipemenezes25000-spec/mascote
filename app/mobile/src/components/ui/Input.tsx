/**
 * Input padronizado — text input com tokens.
 * Substitui patterns ad-hoc de TextInput style direto.
 */
import { useState } from 'react';
import { TextInput, View, type TextInputProps, StyleSheet } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { Typography } from './Typography';

interface Props extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string;
}

export function Input({ label, helper, error, style, onFocus, onBlur, ...rest }: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Typography variant="caption" tone="secondary" style={styles.label}>{label}</Typography> : null}
      <TextInput
        {...rest}
        placeholderTextColor={theme.colors.textDim}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          style,
        ]}
      />
      {error ? (
        <Typography variant="caption" tone="error" style={styles.helper}>{error}</Typography>
      ) : helper ? (
        <Typography variant="caption" tone="dim" style={styles.helper}>{helper}</Typography>
      ) : null}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    label: { letterSpacing: 0.4 },
    input: {
      ...theme.text.body,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      minHeight: 48,
    },
    inputFocused: {
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    helper: { marginTop: 2 },
  });
}
