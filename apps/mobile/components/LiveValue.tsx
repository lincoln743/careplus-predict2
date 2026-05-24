/**
 * Valor numerico com fade sutil quando muda — comunica "dado ao vivo".
 * Faz um leve fade-out/in ao detectar mudanca do valor. Discreto, nao agride.
 */
import React, { useEffect, useRef } from "react";
import { Animated, type TextStyle, type StyleProp } from "react-native";

interface Props {
  children: React.ReactNode;
  value: string | number; // dispara o fade quando muda
  style?: StyleProp<TextStyle>;
}

export function LiveValue({ children, value, style }: Props) {
  const op = useRef(new Animated.Value(1)).current;
  const primeira = useRef(true);

  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    Animated.sequence([
      Animated.timing(op, { toValue: 0.35, duration: 180, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [value]);

  return <Animated.Text style={[style, { opacity: op }]}>{children}</Animated.Text>;
}
