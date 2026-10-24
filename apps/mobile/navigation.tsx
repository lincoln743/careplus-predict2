/**
 * Navegacao principal (apos login). Tabs com icones, adaptadas ao papel.
 * - paciente: Inicio, Metricas, Chat IA, Config (4 tabs)
 * - medico: Inicio, Pacientes, Metricas, IA Medico, Config (5 tabs)
 */
import React from "react";
import { useWindowDimensions } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./theme/ThemeProvider";
import { useAuth } from "./store/auth";
import { HomeScreen } from "./screens/HomeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { MetricasScreen } from "./screens/MetricasScreen";
import { MedicoDashboard } from "./screens/MedicoDashboard";
import { MedicoPacientes } from "./screens/MedicoPacientes";
import { MedicoMetricas } from "./screens/MedicoMetricas";
import { MedicoIA } from "./screens/MedicoIA";
import { MedicoConfig } from "./screens/MedicoConfig";

const Tab = createBottomTabNavigator();
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export function AppNavigator() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const ehMedico = user?.role === "DOCTOR" || user?.role === "ADMIN";

  // ============================================================
  // Responsividade: detecta tablet (menor dimensao >= 600dp)
  // segue a convencao Android/Material Design.
  // ============================================================
  const { width, height } = useWindowDimensions();
  const menorDim = Math.min(width, height);
  const isTablet = menorDim >= 600;

  // Fatores de escala por tipo de aparelho.
  const iconSize = isTablet ? 32 : 24;        // telefone: 24, tablet: 32
  const labelSize = isTablet ? 14 : 10;       // telefone: 10, tablet: 14
  const tabBarHeight = isTablet ? 76 : 56;    // telefone: 56, tablet: 76
  const tabBarPadTop = isTablet ? 8 : 4;
  const tabBarPadBot = isTablet ? 10 : 6;

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.background, card: colors.surface,
      text: colors.text, primary: colors.primary, border: colors.border,
    },
  };

  const iconFor = (routeName: string, focused: boolean): IoniconName => {
    const map: Record<string, [IoniconName, IoniconName]> = {
      "Início": ["home", "home-outline"],
      "Pacientes": ["people", "people-outline"],
      "Métricas": ["pulse", "pulse-outline"],
      "IA Médico": ["search-circle", "search-circle-outline"],
      "Meus Dados": ["person-circle", "person-circle-outline"],
      "Chat IA": ["chatbubbles", "chatbubbles-outline"],
      "Config": ["settings", "settings-outline"],
      "Sobre": ["information-circle", "information-circle-outline"],
    };
    const pair = map[routeName] ?? ["ellipse", "ellipse-outline"];
    return focused ? pair[0] : pair[1];
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: tabBarHeight,
            paddingTop: tabBarPadTop,
            paddingBottom: tabBarPadBot,
          },
          tabBarLabelStyle: { fontSize: labelSize, fontWeight: "500" },
          tabBarIcon: ({ focused }) => (
            <Ionicons name={iconFor(route.name, focused)} size={iconSize} color={focused ? colors.primary : colors.textMuted} />
          ),
        })}
      >
        {ehMedico ? (
          <>
            <Tab.Screen name="Início" component={MedicoDashboard} />
            <Tab.Screen name="Pacientes" component={MedicoPacientes} />
            <Tab.Screen name="Métricas" component={MedicoMetricas} />
            <Tab.Screen name="IA Médico" component={MedicoIA} />
            <Tab.Screen name="Config" component={MedicoConfig} />
          </>
        ) : (
          <>
            <Tab.Screen name="Início" component={HomeScreen} />
            <Tab.Screen name="Métricas" component={MetricasScreen} />
            <Tab.Screen name="Chat IA" component={ChatScreen} />
            <Tab.Screen name="Config" component={SettingsScreen} />
          </>
        )}
      </Tab.Navigator>
    </NavigationContainer>
  );
}
