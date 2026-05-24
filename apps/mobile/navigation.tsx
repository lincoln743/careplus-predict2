/**
 * Navegacao principal (apos login). Tabs com icones, adaptadas ao papel.
 * - paciente: Inicio, Meus Dados, Metricas, Chat IA, Config, Sobre
 * - medico: Inicio (dashboard), Pacientes, Metricas, IA Medico, Config, Sobre
 */
import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./theme/ThemeProvider";
import { useAuth } from "./store/auth";
import { HomeScreen } from "./screens/HomeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { MeusDadosScreen } from "./screens/MeusDadosScreen";
import { MetricasScreen } from "./screens/MetricasScreen";
import { SobreScreen } from "./screens/SobreScreen";
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
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarLabelStyle: { fontSize: 10 },
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name={iconFor(route.name, focused)} size={size} color={focused ? colors.primary : colors.textMuted} />
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
            <Tab.Screen name="Meus Dados" component={MeusDadosScreen} />
            <Tab.Screen name="Métricas" component={MetricasScreen} />
            <Tab.Screen name="Chat IA" component={ChatScreen} />
            <Tab.Screen name="Config" component={SettingsScreen} />
          </>
        )}
        <Tab.Screen name="Sobre" component={SobreScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
