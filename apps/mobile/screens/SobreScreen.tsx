/**
 * Sobre — adaptada por perfil, completa e fiel a V1.
 * Medico: Missao + Funcionalidades p/ Medicos + Recursos Medicos + Seguranca +
 *         Integracoes + Suporte Medico + Equipe + rodape.
 * Paciente: versao equivalente com o que faz sentido (sem jargao clinico).
 */
import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { useAuth } from "../store/auth";

function Header({ icon, titulo }: { icon: string; titulo: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.headerLinha}>
      <Ionicons name={icon as never} size={20} color={colors.primary} />
      <Text style={[styles.blocoTitulo, { color: colors.primary }]}>{titulo}</Text>
    </View>
  );
}

function ItemLista({ icon, texto }: { icon: string; texto: string }) {
  const { colors } = useTheme();
  return (
    <Pressable style={styles.item} onPress={() => Alert.alert(texto, "Funcionalidade em breve.")}>
      <Ionicons name={icon as never} size={18} color={colors.primary} />
      <Text style={[styles.itemText, { color: colors.text }]}>{texto}</Text>
    </Pressable>
  );
}

function Func({ icon, titulo, desc }: { icon: string; titulo: string; desc: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.func}>
      <Ionicons name={icon as never} size={18} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.funcTitulo, { color: colors.text }]}>{titulo}</Text>
        <Text style={[styles.funcDesc, { color: colors.textMuted }]}>{desc}</Text>
      </View>
    </View>
  );
}

export function SobreScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const ehMedico = user?.role === "DOCTOR" || user?.role === "ADMIN";

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={[styles.titulo, { color: colors.primary }]}>CarePlus Predict</Text>
      <Text style={[styles.versao, { color: colors.textMuted }]}>Versão 2.0.0</Text>

      {/* Missao (adaptada) */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Header icon="heart" titulo="Nossa Missão" />
        <Text style={[styles.texto, { color: colors.text }]}>
          {ehMedico
            ? "O CarePlus Predict Médico utiliza inteligência preditiva para transformar dados clínicos em ações preventivas, promovendo saúde proativa e suporte avançado para decisões médicas."
            : "O CarePlus Predict acompanha sua saúde de forma preditiva, transformando seus dados em recomendações para uma vida mais saudável e prevenção ativa."}
        </Text>
      </View>

      {/* Funcionalidades (adaptada) */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Header icon="add-circle" titulo={ehMedico ? "Funcionalidades para Médicos" : "Funcionalidades"} />
        {ehMedico ? (
          <>
            <Func icon="pulse" titulo="IA para Diagnóstico Preditivo" desc="Identificação antecipada de riscos e suporte à decisão clínica." />
            <Func icon="people" titulo="Gestão de Pacientes" desc="Monitoramento e acompanhamento centralizado dos pacientes." />
            <Func icon="bar-chart" titulo="Analytics Avançado" desc="Painéis de performance e estatísticas de saúde populacional." />
            <Func icon="alert-circle" titulo="Sistema de Alertas" desc="Notificações automáticas para eventos clínicos críticos." />
            <Func icon="document-text" titulo="Prescrição Eletrônica" desc="Integração segura com o prontuário do paciente." />
          </>
        ) : (
          <>
            <Func icon="pulse" titulo="Diagnóstico Preditivo" desc="Identificação antecipada de riscos para sua saúde." />
            <Func icon="walk" titulo="Monitoramento Diário" desc="Acompanhe passos, sono e batimentos em tempo real." />
            <Func icon="bar-chart" titulo="Métricas de Saúde" desc="Veja sua evolução em gráficos claros." />
            <Func icon="chatbubbles" titulo="Assistente de Saúde" desc="Tire dúvidas com a IA, apoio à decisão." />
          </>
        )}
      </View>

      {/* Recursos Medicos — so medico */}
      {ehMedico && (
        <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
          <Header icon="book-outline" titulo="Recursos Médicos" />
          <ItemLista icon="school" texto="Treinamento Médico" />
          <ItemLista icon="document-text" texto="Diretrizes Clínicas" />
          <ItemLista icon="search" texto="Portal de Pesquisa" />
          <ItemLista icon="folder-open" texto="Casos Clínicos" />
        </View>
      )}

      {/* Seguranca e Conformidade */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Header icon="shield-checkmark-outline" titulo="Segurança e Conformidade" />
        <Text style={[styles.texto, { color: colors.text }]}>
          {ehMedico
            ? "Todos os dados são criptografados e tratados conforme as normas LGPD e padrões internacionais de interoperabilidade (HL7, FHIR)."
            : "Seus dados são criptografados e protegidos conforme a LGPD. Você controla quem acessa suas informações de saúde."}
        </Text>
      </View>

      {/* Integracoes */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Header icon="link-outline" titulo="Integrações" />
        <ItemLista icon="cloud-outline" texto="Apple HealthKit" />
        <ItemLista icon="cloud-outline" texto="Samsung Health" />
        {ehMedico && <ItemLista icon="cloud-outline" texto="Sistemas TISS / PACS / RIS" />}
        {ehMedico && <ItemLista icon="cloud-outline" texto="Prontuário Eletrônico (PEP)" />}
      </View>

      {/* Suporte */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Header icon="call-outline" titulo={ehMedico ? "Suporte Médico" : "Suporte"} />
        <Text style={[styles.texto, { color: colors.text }]}>
          {ehMedico ? "Suporte especializado CarePlus Predict" : "Atendimento CarePlus Predict"}
        </Text>
        <Text style={[styles.suporteInfo, { color: colors.textMuted }]}>Horário: 07h às 19h | Urgências: 24h</Text>
        <Text style={[styles.suporteInfo, { color: colors.textMuted }]}>
          E-mail: {ehMedico ? "suporte.medico@careplus.com.br" : "suporte@careplus.com.br"}
        </Text>
        <Pressable
          style={[styles.botaoWeb, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL("https://www.careplus.com.br")}
        >
          <Ionicons name="globe-outline" size={18} color={colors.textOnPrimary} />
          <Text style={{ color: colors.textOnPrimary, fontWeight: font.weight.semibold }}>Visitar Website</Text>
        </Pressable>
      </View>

      {/* Equipe + rodape */}
      <View style={styles.rodape}>
        <Text style={[styles.equipeTitulo, { color: colors.primary }]}>Equipe de Desenvolvimento</Text>
        <Text style={[styles.rodapeText, { color: colors.textMuted }]}>Desenvolvido com ❤ pela equipe NextGen FIAP</Text>
        <Text style={[styles.rodapeText, { color: colors.textMuted }]}>Design: Equipe NextGen</Text>
        <Text style={[styles.rodapeText, { color: colors.textMuted }]}>Saúde: Especialistas CarePlus</Text>
        <Text style={[styles.copyright, { color: colors.textMuted }]}>© 2026 CarePlus Predict. Todos os direitos reservados.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  titulo: { fontSize: font.size.xxl, fontWeight: font.weight.bold, textAlign: "center" },
  versao: { textAlign: "center", marginBottom: spacing.lg, fontSize: font.size.sm },
  bloco: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  headerLinha: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  blocoTitulo: { fontSize: font.size.lg, fontWeight: font.weight.semibold },
  texto: { fontSize: font.size.md, lineHeight: 22 },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  itemText: { fontSize: font.size.md },
  func: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", marginBottom: spacing.md },
  funcTitulo: { fontSize: font.size.md, fontWeight: font.weight.semibold },
  funcDesc: { fontSize: font.size.xs, marginTop: 2, lineHeight: 18 },
  suporteInfo: { fontSize: font.size.sm, marginTop: spacing.xs },
  botaoWeb: { flexDirection: "row", gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  rodape: { alignItems: "center", paddingVertical: spacing.lg },
  equipeTitulo: { fontSize: font.size.md, fontWeight: font.weight.bold, marginBottom: spacing.sm },
  rodapeText: { fontSize: font.size.sm, textAlign: "center", marginTop: 2 },
  copyright: { fontSize: font.size.xs, textAlign: "center", marginTop: spacing.md },
});
