/**
 * Tela "Conectar Samsung Health".
 * v16: usa checkAvailability primeiro pra diagnosticar antes de conectar.
 * Mensagens especificas por error.code retornado do modulo Kotlin.
 * Logs detalhados em console.log/error pra captura via adb logcat -s ReactNativeJS.
 */
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import * as SamsungHealth from "samsung-health";
import { enviarLeiturasSamsung, type LeituraSamsung } from "../api/client";

type Etapa =
  | "verificando"
  | "indisponivel"
  | "sem_app"
  | "desabilitado"
  | "desatualizado"
  | "sem_permissoes"
  | "pronto"
  | "sincronizando"
  | "concluido"
  | "erro";

const METRICAS: SamsungHealth.MetricaSamsung[] = ["steps", "heart_rate", "sleep"];
const LOG = "[SamsungHealthCP/JS]";

interface ResumoSync {
  diasPassos: number;
  diasFc: number;
  diasSono: number;
  gravadasBackend: number;
}

export function ConectarSamsungHealth({ onVoltar }: { onVoltar: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [etapa, setEtapa] = useState<Etapa>("verificando");
  const [erro, setErro] = useState<string>("");
  const [errorCode, setErrorCode] = useState<string>("");
  const [diagnostico, setDiagnostico] = useState<string>("");
  const [resumo, setResumo] = useState<ResumoSync | null>(null);

  // 1) Diagnostico inicial via checkAvailability
  useEffect(() => {
    void rodarDiagnostico();
  }, []);

  async function rodarDiagnostico() {
    setEtapa("verificando");
    setErro("");
    setErrorCode("");
    try {
      console.log(`${LOG} chamando checkAvailability...`);
      const disp = await SamsungHealth.checkAvailability();
      console.log(`${LOG} checkAvailability resultado:`, JSON.stringify(disp));
      setDiagnostico(
        `${disp.status.toUpperCase()} [${disp.code}]` +
          (disp.details?.versionName ? ` v${disp.details.versionName} (${disp.details.versionCode})` : "") +
          (disp.details?.exceptionClass ? `\n${disp.details.exceptionClass}: ${disp.details.exceptionMessage}` : "")
      );

      if (disp.status === "not_installed") { setErro(disp.message); setErrorCode(disp.code); setEtapa("sem_app"); return; }
      if (disp.status === "disabled")      { setErro(disp.message); setErrorCode(disp.code); setEtapa("desabilitado"); return; }
      if (disp.status === "outdated")      { setErro(disp.message); setErrorCode(disp.code); setEtapa("desatualizado"); return; }
      if (disp.status === "error")         { setErro(disp.message); setErrorCode(disp.code); setEtapa("indisponivel"); return; }

      // status === "ok": SDK carregado, agora confere permissoes
      console.log(`${LOG} checkAvailability OK, verificando permissoes...`);
      try {
        const r = await SamsungHealth.checkPermissions(METRICAS);
        console.log(`${LOG} checkPermissions:`, JSON.stringify(r));
        if (r.granted.length === METRICAS.length) setEtapa("pronto");
        else setEtapa("sem_permissoes");
      } catch (e: any) {
        console.warn(`${LOG} checkPermissions falhou (vai pra sem_permissoes):`, e?.code, e?.message);
        setEtapa("sem_permissoes");
      }
    } catch (e: any) {
      console.error(`${LOG} checkAvailability lancou (nao deveria!):`, e?.code, e?.message);
      setErro(`[${e?.code ?? "?"}] ${e?.message ?? "Erro ao diagnosticar Samsung Health"}`);
      setErrorCode(e?.code ?? "UNKNOWN");
      setEtapa("indisponivel");
    }
  }

  async function pedirPermissoes() {
    setErro("");
    setErrorCode("");
    try {
      console.log(`${LOG} requestPermissions...`);
      const r = await SamsungHealth.requestPermissions(METRICAS);
      console.log(`${LOG} requestPermissions resultado:`, JSON.stringify(r));
      if (r.granted.length === METRICAS.length) setEtapa("pronto");
      else { setErro(`Permissoes pendentes: ${r.denied.join(", ")}`); setEtapa("sem_permissoes"); }
    } catch (e: any) {
      console.error(`${LOG} requestPermissions erro:`, e?.code, e?.message);
      setErro(`[${e?.code ?? "?"}] ${e?.message ?? "Falha ao pedir permissoes."}`);
      setErrorCode(e?.code ?? "UNKNOWN");
      setEtapa("erro");
    }
  }

  async function sincronizar() {
    setEtapa("sincronizando");
    setErro("");
    setErrorCode("");
    try {
      console.log(`${LOG} sincronizar: lendo 7 dias...`);
      const [passos, fc, sono] = await Promise.all([
        SamsungHealth.readDailySteps(7),
        SamsungHealth.readDailyHeartRate(7),
        SamsungHealth.readDailySleep(7),
      ]);
      console.log(`${LOG} dados lidos: passos=${passos.length} fc=${fc.length} sono=${sono.length}`);

      const porData: Record<string, LeituraSamsung> = {};
      for (const p of passos) (porData[p.data] ??= { data_ref: p.data }).passos = p.passos;
      for (const h of fc) {
        const reg = (porData[h.data] ??= { data_ref: h.data });
        reg.fc_min = h.min ?? null;
        reg.fc_max = h.max ?? null;
        if (h.min != null && h.max != null) reg.fc_media = Math.round((h.min + h.max) / 2);
      }
      for (const s of sono) (porData[s.data] ??= { data_ref: s.data }).sono_horas = s.horas;

      const leituras = Object.values(porData);
      const resp = await enviarLeiturasSamsung(leituras);
      console.log(`${LOG} backend gravou ${resp.gravadas ?? "?"} leituras`);

      setResumo({
        diasPassos: passos.length,
        diasFc: fc.length,
        diasSono: sono.length,
        gravadasBackend: resp.gravadas ?? leituras.length,
      });
      setEtapa("concluido");
    } catch (e: any) {
      console.error(`${LOG} sincronizar erro:`, e?.code, e?.message);
      setErro(`[${e?.code ?? "?"}] ${e?.message ?? "Falha ao sincronizar com Samsung Health."}`);
      setErrorCode(e?.code ?? "UNKNOWN");
      setEtapa("erro");
    }
  }

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={onVoltar} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.titulo, { color: colors.text }]}>Conectar Samsung Health</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="watch-outline" size={42} color={colors.primary} style={{ alignSelf: "center", marginBottom: spacing.md }} />
        <Text style={[styles.cardTitulo, { color: colors.text }]}>Samsung Health Data SDK</Text>
        <Text style={[styles.cardSub, { color: colors.textMuted }]}>
          Lemos passos, batimentos e sono dos ultimos 7 dias direto do Samsung Health do seu celular.
          O relogio sincroniza com o app sozinho via Bluetooth.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {etapa === "verificando" && (
          <View style={styles.linhaCentral}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.linhaTexto, { color: colors.textMuted }]}>Diagnosticando Samsung Health...</Text>
          </View>
        )}

        {etapa === "sem_app" && (
          <>
            <Ionicons name="alert-circle" size={32} color={colors.warning} style={{ alignSelf: "center" }} />
            <Text style={[styles.cardTitulo, { color: colors.text, textAlign: "center" }]}>Samsung Health nao encontrado</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted, textAlign: "center" }]}>
              Instale o Samsung Health pela Galaxy Store ou Play Store e tente novamente.
            </Text>
          </>
        )}

        {etapa === "desabilitado" && (
          <>
            <Ionicons name="alert-circle" size={32} color={colors.warning} style={{ alignSelf: "center" }} />
            <Text style={[styles.cardTitulo, { color: colors.text, textAlign: "center" }]}>Samsung Health desabilitado</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted, textAlign: "center" }]}>
              Habilite em Configuracoes -> Apps -> Samsung Health -> Habilitar.
            </Text>
            <Pressable onPress={rodarDiagnostico} style={[styles.btnSecundario, { borderColor: colors.primary }]}>
              <Text style={[styles.btnTextoSec, { color: colors.primary }]}>Tentar de novo</Text>
            </Pressable>
          </>
        )}

        {etapa === "desatualizado" && (
          <>
            <Ionicons name="alert-circle" size={32} color={colors.warning} style={{ alignSelf: "center" }} />
            <Text style={[styles.cardTitulo, { color: colors.text, textAlign: "center" }]}>Samsung Health desatualizado</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted, textAlign: "center" }]}>
              Atualize o Samsung Health pela Galaxy Store ou Play Store e tente novamente.
            </Text>
            <Pressable onPress={rodarDiagnostico} style={[styles.btnSecundario, { borderColor: colors.primary }]}>
              <Text style={[styles.btnTextoSec, { color: colors.primary }]}>Verificar novamente</Text>
            </Pressable>
          </>
        )}

        {etapa === "indisponivel" && (
          <>
            <Ionicons name="warning" size={32} color={colors.danger} style={{ alignSelf: "center" }} />
            <Text style={[styles.cardTitulo, { color: colors.text, textAlign: "center" }]}>Samsung Health indisponivel</Text>
            <Text style={[styles.cardSub, { color: colors.danger, textAlign: "center" }]}>{erro}</Text>
            {errorCode === "CLASS_LOADING" && (
              <Text style={[styles.cardSub, { color: colors.textMuted, textAlign: "center", fontSize: font.small ?? 12 }]}>
                Aviso tecnico: incompatibilidade de versao entre o SDK Samsung Health embarcado no app e a versao do app Samsung Health do seu celular.
                Contate o suporte CarePlus.
              </Text>
            )}
            {errorCode === "SH_SIGNATURE" && (
              <Text style={[styles.cardSub, { color: colors.textMuted, textAlign: "center", fontSize: font.small ?? 12 }]}>
                Este APK nao esta registrado no Samsung Partner Portal. Contate o suporte CarePlus.
              </Text>
            )}
            <Pressable onPress={rodarDiagnostico} style={[styles.btnSecundario, { borderColor: colors.primary }]}>
              <Text style={[styles.btnTextoSec, { color: colors.primary }]}>Diagnosticar de novo</Text>
            </Pressable>
          </>
        )}

        {etapa === "sem_permissoes" && (
          <>
            <Ionicons name="lock-closed" size={32} color={colors.warning} style={{ alignSelf: "center" }} />
            <Text style={[styles.cardTitulo, { color: colors.text, textAlign: "center" }]}>Permissoes necessarias</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted, textAlign: "center" }]}>
              Para acessar seus dados, conceda permissao ao CarePlus.
            </Text>
            <Pressable onPress={pedirPermissoes} style={[styles.btnPrimario, { backgroundColor: colors.primary }]}>
              <Text style={styles.btnTexto}>Conceder permissoes</Text>
            </Pressable>
          </>
        )}

        {etapa === "pronto" && (
          <>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} style={{ alignSelf: "center" }} />
            <Text style={[styles.cardTitulo, { color: colors.text, textAlign: "center" }]}>Tudo pronto</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted, textAlign: "center" }]}>
              Vamos buscar os ultimos 7 dias do seu relogio.
            </Text>
            <Pressable onPress={sincronizar} style={[styles.btnPrimario, { backgroundColor: colors.success }]}>
              <Ionicons name="sync" size={18} color="#fff" />
              <Text style={styles.btnTexto}>Sincronizar agora</Text>
            </Pressable>
          </>
        )}

        {etapa === "sincronizando" && (
          <View style={styles.linhaCentral}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.linhaTexto, { color: colors.textMuted }]}>Lendo do Samsung Health e enviando...</Text>
          </View>
        )}

        {etapa === "concluido" && resumo && (
          <>
            <Ionicons name="cloud-done" size={32} color={colors.success} style={{ alignSelf: "center" }} />
            <Text style={[styles.cardTitulo, { color: colors.text, textAlign: "center" }]}>Sincronizado!</Text>
            <View style={styles.statsBox}>
              <StatLinha label="Passos" valor={`${resumo.diasPassos} dias`} cor={colors.text} muted={colors.textMuted} />
              <StatLinha label="Frequencia cardiaca" valor={`${resumo.diasFc} dias`} cor={colors.text} muted={colors.textMuted} />
              <StatLinha label="Sono" valor={`${resumo.diasSono} noites`} cor={colors.text} muted={colors.textMuted} />
              <StatLinha label="Gravadas no servidor" valor={`${resumo.gravadasBackend}`} cor={colors.primary} muted={colors.textMuted} bold />
            </View>
            <Pressable onPress={sincronizar} style={[styles.btnSecundario, { borderColor: colors.primary }]}>
              <Text style={[styles.btnTextoSec, { color: colors.primary }]}>Sincronizar de novo</Text>
            </Pressable>
          </>
        )}

        {etapa === "erro" && (
          <>
            <Ionicons name="warning" size={32} color={colors.danger} style={{ alignSelf: "center" }} />
            <Text style={[styles.cardTitulo, { color: colors.text, textAlign: "center" }]}>Algo deu errado</Text>
            <Text style={[styles.cardSub, { color: colors.danger, textAlign: "center" }]}>{erro}</Text>
            <Pressable onPress={rodarDiagnostico} style={[styles.btnSecundario, { borderColor: colors.primary }]}>
              <Text style={[styles.btnTextoSec, { color: colors.primary }]}>Tentar de novo</Text>
            </Pressable>
          </>
        )}

        {/* Diagnostico tecnico no fim da tela — uteil pro debug */}
        {diagnostico !== "" && (
          <Text
            selectable
            style={{
              color: colors.textMuted,
              fontSize: 11,
              fontFamily: "monospace",
              marginTop: spacing.md,
              paddingTop: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            Diagnostico: {diagnostico}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function StatLinha({ label, valor, cor, muted, bold }: { label: string; valor: string; cor: string; muted: string; bold?: boolean }) {
  return (
    <View style={styles.statLinha}>
      <Text style={{ color: muted, fontSize: font.body }}>{label}</Text>
      <Text style={{ color: cor, fontSize: font.body, fontWeight: bold ? "700" : "600" }}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1 },
  titulo: { fontSize: font.h3, fontWeight: "700" },
  card: { margin: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm },
  cardTitulo: { fontSize: font.h3, fontWeight: "700", textAlign: "center" },
  cardSub: { fontSize: font.body, lineHeight: 20, textAlign: "center" },
  linhaCentral: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  linhaTexto: { fontSize: font.body },
  btnPrimario: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.sm },
  btnTexto: { color: "#fff", fontSize: font.body, fontWeight: "700" },
  btnSecundario: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: "center" },
  btnTextoSec: { fontSize: font.body, fontWeight: "700" },
  statsBox: { marginTop: spacing.md, gap: spacing.xs },
  statLinha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
});
