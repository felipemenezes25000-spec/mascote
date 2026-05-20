import { View } from 'react-native';
import { useTheme } from '@/lib/useTheme';

interface Props {
  spacing?: number;
}

export function Divider({ spacing = 0 }: Props) {
  const theme = useTheme();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: spacing,
      }}
    />
  );
}
