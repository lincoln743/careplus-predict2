/**
 * Gauge semicircular colorido (vermelho -> amarelo -> verde), fiel a V1.
 * ANIMADO: o arco cresce gradualmente de 0 ate o score ao montar / quando muda.
 * Mostra so a parte preenchida sobre o trilho de fundo.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/tokens";

interface Props { score: number; label: string; size?: number; }

function polar(cx: number, cy: number, r: number, ang: number) {
  const a = ((ang - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, start);
  const e = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export function ScoreGauge({ score, label, size = 240 }: Props) {
  const { colors } = useTheme();
  const w = size, h = size / 2 + 30, cx = w / 2, cy = size / 2 + 4, r = size / 2 - 18, stroke = 18;
  const target = Math.max(0, Math.min(100, score));

  // Anima o valor exibido (numero) e o arco de 0 -> target.
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setShown(Math.round(value)));
    Animated.timing(anim, {
      toValue: target,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [target]);

  const endAngle = (shown / 100) * 180;
  const ponteiro = polar(cx, cy, r, endAngle);

  return (
    <View style={[styles.box, { backgroundColor: colors.surface }]}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#E5484D" />
            <Stop offset="50%" stopColor="#E0A82E" />
            <Stop offset="100%" stopColor="#34C77B" />
          </LinearGradient>
        </Defs>
        {/* Trilho de fundo (cinza) */}
        <Path d={arcPath(cx, cy, r, 0, 180)} stroke={colors.surfaceAlt} strokeWidth={stroke} strokeLinecap="round" fill="none" />
        {/* Arco preenchido ate o valor animado */}
        <Path d={arcPath(cx, cy, r, 0, Math.max(1, endAngle))} stroke="url(#grad)" strokeWidth={stroke} strokeLinecap="round" fill="none" />
        {/* Ponteiro */}
        <G>
          <Circle cx={ponteiro.x} cy={ponteiro.y} r={stroke / 1.6} fill="#FFFFFF" stroke={colors.border} strokeWidth={1} />
        </G>
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { color: colors.primary }]}>{shown}</Text>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 18, paddingVertical: 16, alignItems: "center", marginBottom: 14 },
  center: { alignItems: "center", marginTop: -40 },
  score: { fontSize: 42, fontWeight: "800" },
  label: { fontSize: 15 },
});
