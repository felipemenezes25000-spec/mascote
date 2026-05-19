import { StyleSheet, Text, View } from 'react-native';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { addDays, dateLocal, todayLocal } from '@/lib/db';

interface Props {
  countsByDate: Record<string, number>; // YYYY-MM-DD -> count
  weeks?: number;
}

const cellSize = 14;
const cellGap = 3;

// Abreviações de 3 letras: D/S/T/Q/Q/S/S vira ambíguo (2× S, 2× Q).
// 'Dom Seg Ter Qua Qui Sex Sáb' diferencia direito e ainda cabe no rail.
const DOW_LABELS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function Heatmap({ countsByDate, weeks = 12 }: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const today = todayLocal();
  const todayDate = new Date(today + 'T00:00:00');
  const todayDow = todayDate.getDay();

  const endSunday = new Date(todayDate);
  endSunday.setDate(endSunday.getDate() + (6 - todayDow));

  const startSunday = new Date(endSunday);
  startSunday.setDate(startSunday.getDate() - (weeks * 7 - 1));

  const days: string[][] = Array.from({ length: 7 }, () => []);
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(startSunday);
      date.setDate(date.getDate() + w * 7 + d);
      days[d].push(dateLocal(date));
    }
  }

  let max = 1;
  for (const v of Object.values(countsByDate)) if (v > max) max = v;

  function bgFor(count: number, isFuture: boolean): string {
    if (isFuture) return theme.colors.border + '40';
    if (count === 0) return theme.colors.border;
    const t = Math.min(1, count / Math.max(2, max));
    const alpha = 0.25 + 0.75 * t;
    return primaryWithAlpha(theme.colors.primary, alpha);
  }

  const monthLabels = computeMonthLabels(startSunday, weeks);

  return (
    <View style={styles.wrap}>
      <View style={styles.monthRow}>
        {/* Spacer alinhado com a largura da coluna de DOW (28) + gap (6) = 34 */}
        <View style={{ width: 34 }} />
        {monthLabels.map((m, i) => (
          <Text key={i} style={[styles.monthText, { width: m.width * (cellSize + cellGap) }]}>
            {m.label}
          </Text>
        ))}
      </View>
      <View style={styles.gridRow}>
        <View style={styles.dowCol}>
          {DOW_LABELS_PT.map((label, i) => (
            <Text key={i} style={styles.dowText}>{label}</Text>
          ))}
        </View>
        <View style={styles.grid}>
          {days.map((row, d) => (
            <View key={d} style={styles.row}>
              {row.map(date => {
                const count = countsByDate[date] ?? 0;
                const isFuture = date > today;
                return (
                  <View
                    key={date}
                    style={[styles.cell, { backgroundColor: bgFor(count, isFuture) }]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>menos</Text>
        {[0, 1, 2, 4, 6].map(v => (
          <View
            key={v}
            style={[styles.legendCell, { backgroundColor: bgFor(v, false) }]}
          />
        ))}
        <Text style={styles.legendText}>mais</Text>
      </View>
    </View>
  );
}

// Converte qualquer cor (hex #RRGGBB ou rgb()) num rgba com alpha custom,
// para gerar o gradiente do heatmap a partir da cor primary do tema atual.
function primaryWithAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  return color;
}

function computeMonthLabels(start: Date, weeks: number): { label: string; width: number }[] {
  const labels: { label: string; width: number }[] = [];
  const monthShort = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  let currentMonth = -1;
  let widthCounter = 0;
  for (let w = 0; w < weeks; w++) {
    const d = new Date(start);
    d.setDate(d.getDate() + w * 7);
    const m = d.getMonth();
    if (m !== currentMonth) {
      if (widthCounter > 0) {
        labels[labels.length - 1].width = widthCounter;
      }
      labels.push({ label: monthShort[m], width: 0 });
      currentMonth = m;
      widthCounter = 1;
    } else {
      widthCounter++;
    }
  }
  if (labels.length > 0) labels[labels.length - 1].width = widthCounter;
  return labels;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    monthRow: { flexDirection: 'row', paddingLeft: 4 },
    monthText: { ...theme.text.xs, color: theme.colors.textSecondary, fontWeight: '600' },
    gridRow: { flexDirection: 'row', gap: 6 },
    // Widened de 14→28 pra caber 'Dom'/'Sex'/'Sáb' (vinha cortando com 1-letra ambíguo).
    dowCol: {
      justifyContent: 'space-between',
      paddingVertical: 1,
      width: 28,
    },
    dowText: { fontSize: 9, color: theme.colors.textDim, height: cellSize, lineHeight: cellSize, textAlign: 'right' },
    grid: { flexDirection: 'column', gap: cellGap },
    row: { flexDirection: 'row', gap: cellGap },
    cell: { width: cellSize, height: cellSize, borderRadius: 3 },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 4 },
    legendCell: { width: 12, height: 12, borderRadius: 3 },
    legendText: { ...theme.text.xs, color: theme.colors.textDim },
  });
}
