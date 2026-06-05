/**
 * Grafico de area com curva suave (spline), grade tracejada e pontos.
 * Fiel a V1 (card branco, curva azul, area clara). Anima ao montar e
 * quando os dados mudam (transicao suave dos pontos a cada 5s).
 *
 * SVG puro (react-native-svg), sem biblioteca de grafico externa.
 */
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Path, Line, Circle, G, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/tokens";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  valores: number[];     // valores por ponto (ex: passos de cada dia)
  labels: string[];      // rotulos do eixo X (ex: dias)
  titulo: string;
  cor?: string;
  altura?: number;
  formatY?: (v: number) => string;
}

// Gera path de spline suave (Catmull-Rom -> Bezier) passando pelos pontos.
function splinePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function AreaChart({ valores, labels, titulo, cor, altura = 200, formatY }: Props) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  // Animacao de entrada (hook chamado antes do early return — ordem consistente)
  useEffect(() => {
    if (!valores || valores.length === 0) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [valores?.join(",")]);

  // Guard contra dados vazios — evita crash em pts[-1].x quando backend ainda nao respondeu
  if (!valores || valores.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.titulo, { color: colors.text }]}>{titulo}</Text>
        <View style={[styles.card, { padding: 20, alignItems: "center", minHeight: altura, justifyContent: "center" }]}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Sem dados no periodo</Text>
        </View>
      </View>
    );
  }

  const W = 320;
  const H = altura;
  const padL = 52, padR = 16, padT = 16, padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const range = max - min || 1;
  // Folga de 10% em cima e embaixo.
  const yMin = min - range * 0.1;
  const yMax = max + range * 0.1;
  const yRange = yMax - yMin || 1;

  const pts = valores.map((v, i) => ({
    x: padL + (valores.length === 1 ? plotW / 2 : (i / (valores.length - 1)) * plotW),
    y: padT + plotH - ((v - yMin) / yRange) * plotH,
  }));

  const linha = splinePath(pts);
  const area = linha + ` L ${pts[pts.length - 1].x} ${padT + plotH} L ${pts[0].x} ${padT + plotH} Z`;

  // Linhas de grade Y (4 niveis).
  const niveis = 4;
  const gridYs = Array.from({ length: niveis }, (_, i) => {
    const v = yMin + (yRange * (i + 1)) / (niveis + 1);
    return { v, y: padT + plotH - ((v - yMin) / yRange) * plotH };
  });

  const fmt = formatY ?? ((v: number) => Math.round(v).toLocaleString("pt-BR"));


  return (
    <View style={styles.wrap}>
      <Text style={[styles.titulo, { color: colors.text }]}>{titulo}</Text>
      <View style={styles.card}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={cor ?? colors.primary} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={cor ?? colors.primary} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Grade tracejada Y + rotulos */}
          {gridYs.map((g, i) => (
            <G key={i}>
              <Line x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke={cor ?? colors.primary} strokeWidth={1} strokeDasharray="4 4" opacity={0.25} />
              <SvgText x={padL - 8} y={g.y + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">{fmt(g.v)}</SvgText>
            </G>
          ))}

          {/* Area preenchida */}
          <Path d={area} fill="url(#areaFill)" />
          {/* Linha da curva */}
          <Path d={linha} stroke={cor ?? colors.primary} strokeWidth={2.5} fill="none" />
          {/* Pontos */}
          {pts.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={4} fill={cor ?? colors.primary} />
          ))}
          {/* Rotulos X */}
          {labels.map((l, i) => (
            <SvgText key={i} x={pts[i].x} y={H - 8} fontSize={10} fill={colors.textMuted} textAnchor="middle">{l}</SvgText>
          ))}
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
