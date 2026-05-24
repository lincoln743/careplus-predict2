/**
 * IA do Medico — RAG real: lista de documentos + upload de PDF + pergunta.
 * Conecta ao backend: GET/POST /rag/documents, POST /rag/query.
 * O medico sobe diretrizes/protocolos (PDF) e pergunta; a IA responde
 * citando as fontes (curadoria do medico).
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { apiRequest, uploadArquivo } from "../api/client";

interface Documento {
  id: string; titulo: string; nome_arquivo: string;
  tipo: string; status: string; num_chunks: number; erro?: string;
}
interface RespostaQuery { resposta: string; fontes: string[]; thread_id: string; }

export function MedicoIA() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [docs, setDocs] = useState<Documento[]>([]);
  const [carregandoDocs, setCarregandoDocs] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [resposta, setResposta] = useState<RespostaQuery | null>(null);

  const carregarDocs = useCallback(async () => {
    try {
      const r = await apiRequest<{ documentos: Documento[] }>("/rag/documents", { auth: true });
      setDocs(r.documentos);
    } catch {
      // silencioso — mostra lista vazia
    } finally {
      setCarregandoDocs(false);
    }
  }, []);

  useEffect(() => { carregarDocs(); }, [carregarDocs]);

  async function enviarPdf() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const arq = res.assets[0];
      setEnviando(true);
      await uploadArquivo("/rag/documents", {
        uri: arq.uri,
        name: arq.name ?? "documento.pdf",
        mimeType: arq.mimeType ?? "application/pdf",
      }, { titulo: (arq.name ?? "Documento").replace(/\.pdf$/i, "") });
      await carregarDocs();
      Alert.alert("Pronto", "Documento processado e indexado.");
    } catch (e) {
      Alert.alert("Erro", "Não foi possível processar o documento.");
    } finally {
      setEnviando(false);
    }
  }

  async function remover(id: string) {
    try {
      await apiRequest(`/rag/documents/${id}`, { method: "DELETE", auth: true });
      await carregarDocs();
    } catch {
      Alert.alert("Erro", "Não foi possível remover.");
    }
  }

  async function perguntar() {
    const q = pergunta.trim();
    if (!q || consultando) return;
    setConsultando(true);
    setResposta(null);
    try {
      const r = await apiRequest<RespostaQuery>("/rag/query", {
        method: "POST", auth: true, body: { pergunta: q },
      });
      setResposta(r);
    } catch {
      Alert.alert("Erro", "Não foi possível consultar agora.");
    } finally {
      setConsultando(false);
    }
  }

  const prontos = docs.filter((d) => d.status === "pronto").length;

  const TAB_BAR = 49;
  const kbOffset = Platform.OS === "ios" ? TAB_BAR + insets.bottom : 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={kbOffset}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
      <Text style={[styles.titulo, { color: colors.primary }]}>IA do Médico</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Envie documentos clínicos e pergunte à IA com base neles (curadoria sua).
      </Text>

      {/* Upload */}
      <Pressable
        style={[styles.upload, { borderColor: colors.primary }]}
        onPress={enviarPdf}
        disabled={enviando}
      >
        {enviando ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
            <Text style={[styles.uploadText, { color: colors.primary }]}>Enviar documento (PDF)</Text>
          </>
        )}
      </Pressable>

      {/* Lista de documentos */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.text }]}>
          Documentos {docs.length > 0 ? `(${prontos} prontos)` : ""}
        </Text>
        {carregandoDocs ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
        ) : docs.length === 0 ? (
          <Text style={[styles.vazio, { color: colors.textMuted }]}>Nenhum documento ainda. Envie um PDF acima.</Text>
        ) : (
          docs.map((d) => (
            <View key={d.id} style={[styles.docLinha, { borderBottomColor: colors.border }]}>
              <Ionicons
                name={d.status === "pronto" ? "document-text" : d.status === "erro" ? "alert-circle" : "hourglass"}
                size={18}
                color={d.status === "erro" ? colors.danger : colors.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.docTitulo, { color: colors.text }]} numberOfLines={1}>{d.titulo}</Text>
                <Text style={[styles.docInfo, { color: colors.textMuted }]}>
                  {d.status === "pronto" ? `${d.num_chunks} trechos` : d.status === "erro" ? "erro ao processar" : "processando..."}
                </Text>
              </View>
              <Pressable onPress={() => remover(d.id)} hitSlop={10}>
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Pergunta */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.text }]}>Pesquisar na base</Text>
        <View style={styles.buscaLinha}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Ex: tratamento de primeira linha para..."
            placeholderTextColor={colors.textMuted}
            value={pergunta}
            onChangeText={setPergunta}
            multiline
          />
          <Pressable
            style={[styles.btnBuscar, { backgroundColor: prontos > 0 ? colors.primary : colors.textMuted }]}
            onPress={perguntar}
            disabled={consultando || prontos === 0}
          >
            {consultando ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={18} color="#fff" />}
          </Pressable>
        </View>
        {prontos === 0 && !carregandoDocs && (
          <Text style={[styles.dica, { color: colors.textMuted }]}>Envie ao menos um documento para pesquisar.</Text>
        )}

        {resposta && (
          <View style={[styles.resposta, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.respostaTexto, { color: colors.text }]}>{resposta.resposta}</Text>
            {resposta.fontes.length > 0 && (
              <View style={styles.fontes}>
                <Text style={[styles.fontesTitulo, { color: colors.textMuted }]}>Fontes:</Text>
                {resposta.fontes.map((f, i) => (
                  <View key={i} style={styles.fonteChip}>
                    <Ionicons name="document-attach" size={12} color={colors.primary} />
                    <Text style={[styles.fonteTexto, { color: colors.primary }]}>{f}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  titulo: { fontSize: font.size.xxl, fontWeight: font.weight.bold },
  sub: { fontSize: font.size.sm, marginBottom: spacing.lg },
  upload: { borderWidth: 2, borderStyle: "dashed", borderRadius: radius.md, padding: spacing.xl, alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  uploadText: { fontSize: font.size.md, fontWeight: font.weight.semibold },
  bloco: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  blocoTitulo: { fontSize: font.size.lg, fontWeight: font.weight.semibold, marginBottom: spacing.md },
  vazio: { fontSize: font.size.sm, fontStyle: "italic" },
  docLinha: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  docTitulo: { fontSize: font.size.md },
  docInfo: { fontSize: font.size.xs, marginTop: 2 },
  buscaLinha: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" },
  input: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: font.size.md, maxHeight: 100 },
  btnBuscar: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  dica: { fontSize: font.size.xs, marginTop: spacing.sm, fontStyle: "italic" },
  resposta: { marginTop: spacing.md, borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  respostaTexto: { fontSize: font.size.md, lineHeight: 22 },
  fontes: { marginTop: spacing.md, gap: spacing.xs },
  fontesTitulo: { fontSize: font.size.xs, fontWeight: font.weight.semibold },
  fonteChip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 },
  fonteTexto: { fontSize: font.size.xs },
});
