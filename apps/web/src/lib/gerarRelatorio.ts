/**
 * Gera um relatorio clinico em PDF do paciente, usando jsPDF.
 * Inclui: cabecalho CarePlus, dados do paciente, resumo de metricas,
 * tabela da serie temporal e anamnese (se houver).
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SerieSaude, AnamneseSchema } from "../api/client";

interface DadosRelatorio {
  nome: string;
  origem?: string | null;
  isReal?: boolean;
  serie: SerieSaude | null;
  anamneseSchema?: AnamneseSchema | null;
  anamneseRespostas?: Record<string, unknown> | null;
}

const AZUL: [number, number, number] = [1, 121, 207]; // #0179CF

export function gerarRelatorioPDF(d: DadosRelatorio): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margem = 40;
  const largura = doc.internal.pageSize.getWidth();
  let y = margem;

  // --- Cabecalho ---
  doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
  doc.rect(0, 0, largura, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("CarePlus Predict", margem, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Relatório Clínico de Acompanhamento", margem, 56);
  y = 100;

  // --- Dados do paciente ---
  doc.setTextColor(26, 43, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(d.nome, margem, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 124, 143);
  const emitido = new Date().toLocaleString("pt-BR");
  const fonte = d.isReal ? `Fonte de dados: ${d.origem ?? "wearable"} (dados reais)` : "Fonte de dados: simulação";
  doc.text(`Emitido em ${emitido}  ·  ${fonte}`, margem, y);
  y += 24;

  // --- Resumo de metricas ---
  if (d.serie) {
    const r = d.serie.resumo;
    doc.setFillColor(232, 243, 251);
    doc.roundedRect(margem, y, largura - 2 * margem, 64, 6, 6, "F");
    doc.setTextColor(26, 43, 60);
    const col = (largura - 2 * margem) / 4;
    const cards: [string, string][] = [
      ["Período", `${r.dias} dias`],
      ["Passos (média/dia)", r.passos_media.toLocaleString("pt-BR")],
      ["FC média", `${r.fc_media} bpm`],
      ["Passos (total)", r.passos_total.toLocaleString("pt-BR")],
    ];
    cards.forEach(([rotulo, valor], i) => {
      const cx = margem + col * i + 12;
      doc.setFontSize(8);
      doc.setTextColor(107, 124, 143);
      doc.text(rotulo.toUpperCase(), cx, y + 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(AZUL[0], AZUL[1], AZUL[2]);
      doc.text(valor, cx, y + 42);
      doc.setFont("helvetica", "normal");
    });
    y += 88;
  }

  // --- Tabela da serie temporal ---
  if (d.serie && d.serie.pontos.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(26, 43, 60);
    doc.text("Leituras diárias", margem, y);
    y += 8;

    const pontos = [...d.serie.pontos].reverse().slice(0, 31);
    autoTable(doc, {
      startY: y,
      head: [["Data", "Passos", "Sono (h)", "FC média (bpm)"]],
      body: pontos.map((p) => [
        p.data,
        p.passos ? p.passos.toLocaleString("pt-BR") : "—",
        p.sono_horas ? String(p.sono_horas) : "—",
        p.fc_media ? String(p.fc_media) : "—",
      ]),
      headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [244, 247, 250] },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: margem, right: margem },
    });
    // @ts-expect-error lastAutoTable e injetado pelo plugin
    y = (doc.lastAutoTable?.finalY ?? y) + 24;
  }

  // --- Anamnese ---
  if (d.anamneseSchema && d.anamneseRespostas) {
    if (y > doc.internal.pageSize.getHeight() - 120) { doc.addPage(); y = margem; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(26, 43, 60);
    doc.text("Anamnese (histórico clínico)", margem, y);
    y += 8;

    const linhas: string[][] = [];
    for (const secao of d.anamneseSchema.secoes) {
      for (const campo of secao.campos) {
        const v = d.anamneseRespostas[campo.id];
        const fmt = v === null || v === undefined || v === "" ? "—"
          : typeof v === "boolean" ? (v ? "Sim" : "Não")
          : Array.isArray(v) ? (v.length ? v.join(", ") : "—")
          : String(v);
        linhas.push([campo.rotulo, fmt]);
      }
    }
    autoTable(doc, {
      startY: y,
      head: [["Pergunta", "Resposta"]],
      body: linhas,
      headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [244, 247, 250] },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: { 0: { cellWidth: 220 } },
      margin: { left: margem, right: margem },
    });
  }

  // --- Rodape em todas as paginas ---
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 160, 170);
    doc.text(
      "CarePlus Predict — documento gerado automaticamente. Uso clínico sob responsabilidade do profissional.",
      margem,
      doc.internal.pageSize.getHeight() - 20,
    );
    doc.text(`Página ${i}/${totalPaginas}`, largura - margem - 50, doc.internal.pageSize.getHeight() - 20);
  }

  const nomeArq = `relatorio-${d.nome.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nomeArq);
}
