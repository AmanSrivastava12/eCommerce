import { useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { CHART_COLORS, formatCompact, type Bucket } from '../lib/finance';
import { colors, formatPrice, radius, spacing } from '../lib/theme';

/*
 * Small hand-rolled SVG charts for the billing screen. Mark specs follow the dataviz
 * guidance: columns ≤ 24px with 4px rounded data-ends and square baselines, 2px lines,
 * ≥ 8px markers with a surface ring, hairline recessive gridlines, one y-axis, text in
 * text tokens (never series colors). Tap/drag a chart to inspect a bucket.
 */

const PLOT_H = 160;
const AXIS_W = 44;
const LABEL_H = 18;

function niceMax(v: number) {
  if (v <= 0) return 100;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Rounded top corners, square at the baseline. */
function columnPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

function useWidth() {
  const [width, setWidth] = useState(0);
  return { width, onLayout: (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width) };
}

function Legend({ items }: { items: { color: string; label: string; line?: boolean }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.label} style={styles.legendItem}>
          <View style={[i.line ? styles.legendLine : styles.legendSwatch, { backgroundColor: i.color }]} />
          <Text style={styles.legendText}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

function YAxis({ max, min = 0 }: { max: number; min?: number }) {
  const ticks = [max, (max + min) / 2, min];
  return (
    <View style={{ width: AXIS_W, height: PLOT_H }}>
      {ticks.map((t, i) => (
        <Text key={i} style={[styles.axisText, { position: 'absolute', right: 6, top: (i / 2) * PLOT_H - 7 }]}>
          {formatCompact(t)}
        </Text>
      ))}
    </View>
  );
}

function pickIndex(e: GestureResponderEvent, width: number, count: number) {
  const x = e.nativeEvent.locationX;
  return Math.max(0, Math.min(count - 1, Math.floor((x / width) * count)));
}

// ---------- Cash flow: grouped columns, money in vs money out ----------

export function CashFlowChart({ buckets }: { buckets: Bucket[] }) {
  const { width, onLayout } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...buckets.map((b) => Math.max(b.in, b.out)), 0));
  const plotW = Math.max(0, width - AXIS_W);
  const slot = buckets.length ? plotW / buckets.length : 0;
  const barW = Math.min(24, Math.max(3, (slot - 6) / 2 - 1));
  const labelEvery = Math.ceil(buckets.length / 6);
  const shown = active ?? buckets.length - 1;
  const sel = buckets[shown];

  return (
    <View style={{ gap: spacing.sm }}>
      <Legend items={[{ color: CHART_COLORS.in, label: 'Money in' }, { color: CHART_COLORS.out, label: 'Money out' }]} />
      {sel && (
        <View style={styles.readout}>
          <Text style={styles.readoutLabel}>{sel.label}</Text>
          <Text style={styles.readoutValue}>In {formatPrice(sel.in)}</Text>
          <Text style={styles.readoutValue}>Out {formatPrice(sel.out)}</Text>
          <Text style={[styles.readoutValue, { fontWeight: '700' }]}>Net {formatPrice(sel.net)}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row' }} onLayout={onLayout}>
        <YAxis max={max} />
        <View
          style={{ width: plotW, height: PLOT_H + LABEL_H }}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => true}
          onResponderGrant={(e) => setActive(pickIndex(e, plotW, buckets.length))}
          onResponderMove={(e) => setActive(pickIndex(e, plotW, buckets.length))}
          accessibilityLabel="Money in and out by period chart. Tap a period to see its values."
        >
          {plotW > 0 && (
            <Svg width={plotW} height={PLOT_H}>
              {[0, 0.5, 1].map((f) => (
                <Line key={f} x1={0} x2={plotW} y1={f * PLOT_H + 0.5} y2={f * PLOT_H + 0.5} stroke={colors.border} strokeWidth={1} />
              ))}
              {active != null && <Rect x={active * slot} y={0} width={slot} height={PLOT_H} fill={colors.surface} />}
              {buckets.map((b, i) => {
                const cx = i * slot + slot / 2;
                const hIn = (b.in / max) * PLOT_H;
                return <Path key={`in-${i}`} d={columnPath(cx - barW - 1, PLOT_H - hIn, barW, hIn)} fill={CHART_COLORS.in} />;
              })}
              {buckets.map((b, i) => {
                const cx = i * slot + slot / 2;
                const hOut = (b.out / max) * PLOT_H;
                return <Path key={`out-${i}`} d={columnPath(cx + 1, PLOT_H - hOut, barW, hOut)} fill={CHART_COLORS.out} />;
              })}
            </Svg>
          )}
          <View style={{ flexDirection: 'row', height: LABEL_H }}>
            {buckets.map((b, i) => (
              <Text key={i} numberOfLines={1} style={[styles.axisText, { width: slot, textAlign: 'center', opacity: i % labelEvery === 0 ? 1 : 0 }]}>
                {b.label}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------- Balance trend: single-series line with a light area wash ----------

export function TrendChart({ buckets }: { buckets: Bucket[] }) {
  const { width, onLayout } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const values = buckets.map((b) => b.cumulative);
  const rawMax = Math.max(...values, 0);
  const rawMin = Math.min(...values, 0);
  const max = niceMax(rawMax);
  const min = rawMin < 0 ? -niceMax(-rawMin) : 0;
  const plotW = Math.max(0, width - AXIS_W);
  const n = buckets.length;
  const x = (i: number) => (n <= 1 ? plotW / 2 : 8 + (i / (n - 1)) * (plotW - 16));
  const y = (v: number) => PLOT_H - ((v - min) / (max - min || 1)) * PLOT_H;
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
  const area = n ? `${line} L${x(n - 1)},${y(Math.max(min, 0))} L${x(0)},${y(Math.max(min, 0))} Z` : '';
  const shown = active ?? n - 1;
  const sel = buckets[shown];
  const labelEvery = Math.ceil(n / 6);

  return (
    <View style={{ gap: spacing.sm }}>
      {sel && (
        <View style={styles.readout}>
          <Text style={styles.readoutLabel}>Through {sel.label}</Text>
          <Text style={[styles.readoutValue, { fontWeight: '700' }]}>{formatPrice(sel.cumulative)}</Text>
          <Text style={styles.readoutValue}>
            ({sel.net >= 0 ? '+' : ''}
            {formatPrice(sel.net)} this period)
          </Text>
        </View>
      )}
      <View style={{ flexDirection: 'row' }} onLayout={onLayout}>
        <YAxis max={max} min={min} />
        <View
          style={{ width: plotW, height: PLOT_H + LABEL_H }}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => true}
          onResponderGrant={(e) => setActive(pickIndex(e, plotW, n))}
          onResponderMove={(e) => setActive(pickIndex(e, plotW, n))}
          accessibilityLabel="Running net earnings trend. Tap to inspect a period."
        >
          {plotW > 0 && n > 0 && (
            <Svg width={plotW} height={PLOT_H}>
              {[0, 0.5, 1].map((f) => (
                <Line key={f} x1={0} x2={plotW} y1={f * PLOT_H + 0.5} y2={f * PLOT_H + 0.5} stroke={colors.border} strokeWidth={1} />
              ))}
              {min < 0 && <Line x1={0} x2={plotW} y1={y(0)} y2={y(0)} stroke={colors.muted} strokeWidth={1} />}
              <Path d={area} fill={CHART_COLORS.in} fillOpacity={0.1} />
              <Path d={line} stroke={CHART_COLORS.in} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {active != null && <Line x1={x(shown)} x2={x(shown)} y1={0} y2={PLOT_H} stroke={colors.muted} strokeWidth={1} />}
              <Circle cx={x(shown)} cy={y(values[shown])} r={5} fill={CHART_COLORS.in} stroke={colors.card} strokeWidth={2} />
            </Svg>
          )}
          <View style={{ height: LABEL_H }}>
            {buckets.map((b, i) =>
              i % labelEvery === 0 ? (
                <Text key={i} numberOfLines={1} style={[styles.axisText, { position: 'absolute', width: 56, left: x(i) - 28, textAlign: 'center' }]}>
                  {b.label}
                </Text>
              ) : null,
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------- Earnings by product: horizontal bars, single series ----------

export function RankedBars({ rows }: { rows: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((r) => (
        <View key={r.label} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
            <Text style={styles.rankLabel} numberOfLines={1}>
              {r.label}
            </Text>
            <Text style={styles.rankValue}>{formatPrice(r.value)}</Text>
          </View>
          <View style={styles.rankTrack}>
            <View style={[styles.rankFill, { width: `${(r.value / max) * 100}%` }]} />
          </View>
          {r.sub && <Text style={styles.axisText}>{r.sub}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendLine: { width: 14, height: 2, borderRadius: 1 },
  legendText: { fontSize: 12, color: colors.foreground },
  axisText: { fontSize: 10, color: colors.muted },
  readout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: spacing.md,
    rowGap: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  readoutLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
  readoutValue: { fontSize: 13, color: colors.foreground },
  rankLabel: { flex: 1, fontSize: 13, color: colors.foreground },
  rankValue: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  rankTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surface, overflow: 'hidden' },
  rankFill: { height: '100%', borderRadius: 4, backgroundColor: CHART_COLORS.in },
});
