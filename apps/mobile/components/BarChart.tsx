/**
 * Grafico de barras verticais (atividade fisica), fiel a V1.
 * Card branco, barras claras, grade tracejada, rotulos X. SVG puro.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Line, G, Text as SvgText } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/tokens";

interface Props {
  valores: number[];
  labels: string[];
  titulo: string;
  cor?: string;
  altura?: number;
  formatY?: (v: number) => string;
}

export function BarChart({ valores, labels, titulo, cor, altura = 200, formatY }: Props) {
  const { colors } = useTheme();
  const barCor = cor ?? colors.primary;
  const W = 320, H = altura;
  const padL = 52, padR = 16, padT = 16, padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const range = max - min || 1;
  const yMin = min - range * 0.1;
  const yMax = max + range * 0.1;
  const yRange = yMax - yMin || 1;

  const barW = (plotW / valores.length) * 0.5;
  const fmt = formatY ?? ((v: number) => Math.round(v).toLocaleString("pt-BR"));

  const niveis = 4;
  const gridYs = Array.from({ length: niveis }, (_, i) => {
    const v = yMin + (yRange * (i + 1)) / (niveis + 1);
    return { v, y: padT + plotH - ((v - yMin) / yRange) * plotH };
  });

  return (
    <View style={styles.wrap}>
      <Text style={[styles.titulo, { color: colors.text }]}>{titulo}</Text>
      <View style={styles.card}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {gridYs.map((g, i) => (
            <G key={i}>
              <Line x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke={barCor} strokeWidth={1} strokeDasharray="4 4" opacity={0.25} />
              <SvgText x={padL - 8} y={g.y + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">{fmt(g.v)}</SvgText>
            </G>
          ))}
          {valores.map((v, i) => {
            const cx = padL + (i + 0.5) * (plotW / valores.length);
            const h = ((v - yMin) / yRange) * plotH;
            const y = padT + plotH - h;
            return (
              <G key={i}>
                <Rect x={cx - barW / 2} y={y} width={barW} height={h} rx={3} fill={barCor} opacity={0.18} />
                <Line x1={cx - barW / 2} y1={y} x2={cx + barW / 2} y2={y} stroke={barCor} strokeWidth={2.5} />
                <SvgText x={cx} y={H - 8} fontSize={10} fill={colors.textMuted} textAnchor="middle">{labels[i]}</SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  titulo: { fontSize: font.size.md, fontWeight: font.weight.semibold, marginBottom: 8 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 8 },
});
