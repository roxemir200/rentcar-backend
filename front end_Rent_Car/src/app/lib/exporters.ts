// Utilitaires d'export : CSV, XLSX (SheetJS) et PDF (jsPDF)
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

// Déclenche le téléchargement d'un Blob dans le navigateur
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── CSV ────────────────────────────────────────────────
export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(";")),
  ].join("\n");
  triggerDownload(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

// ── XLSX ───────────────────────────────────────────────
export function downloadXLSX(filename: string, rows: Record<string, unknown>[], sheet = "Données") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── Helpers PDF (mise en page commune RentCar) ─────────
function pdfHeader(doc: jsPDF, subtitle: string) {
  doc.setFillColor(37, 99, 235); // #2563EB
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RentCar", 15, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(subtitle, 195, 18, { align: "right" });
  doc.setTextColor(30, 41, 59);
}

function pdfFooter(doc: jsPDF) {
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 280, 195, 280);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("RentCar · Av. Habib Bourguiba, Tunis · +216 71 234 567 · contact@rentcar.tn", 105, 287, { align: "center" });
}

function rows(doc: jsPDF, startY: number, items: [string, string][]) {
  let y = startY;
  items.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 5, 180, 9, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.text(label, 20, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(value, 190, y, { align: "right" });
    y += 9;
  });
  return y;
}

export interface ContractPDFData {
  number: string;
  status: string;
  client: string;
  email: string;
  car: string;
  plate: string;
  startDate: string;
  endDate: string;
  pickup: string;
  ret: string;
  total: string;
  signedAt?: string;
}

export function generateContractPDF(d: ContractPDFData) {
  const doc = new jsPDF();
  pdfHeader(doc, "Contrat de location");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Contrat de location de véhicule", 15, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`N° ${d.number}`, 15, 52);

  let y = rows(doc, 68, [
    ["Client", d.client],
    ["E-mail", d.email],
    ["Véhicule", d.car],
    ["Immatriculation", d.plate],
    ["Période", `${d.startDate} → ${d.endDate}`],
    ["Prise en charge", d.pickup],
    ["Restitution", d.ret],
    ["Statut", d.status],
    ["Montant total", d.total],
  ]);

  y += 12;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const terms = doc.splitTextToSize(
    "Conditions générales : Le locataire s'engage à restituer le véhicule dans l'état où il l'a reçu, à respecter le code de la route et à couvrir tout dommage non pris en charge par l'assurance. Le présent contrat vaut acceptation des conditions générales de location de RentCar.",
    180,
  );
  doc.text(terms, 15, y);

  y += terms.length * 5 + 20;
  doc.setDrawColor(203, 213, 225);
  doc.line(120, y, 190, y);
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(d.signedAt ? `Signé le ${d.signedAt}` : "Signature du client", 155, y + 6, { align: "center" });

  pdfFooter(doc);
  doc.save(`Contrat-${d.number}.pdf`);
}

export interface InvoicePDFData {
  number: string;
  client: string;
  email: string;
  car: string;
  startDate: string;
  endDate: string;
  days: number;
  unitPrice: string;
  subtotal: string;
  tax: string;
  total: string;
  status: string;
  date: string;
}

export function generateInvoicePDF(d: InvoicePDFData) {
  const doc = new jsPDF();
  pdfHeader(doc, "Facture");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Facture", 15, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`N° ${d.number}`, 15, 52);
  doc.text(`Date : ${d.date}`, 195, 52, { align: "right" });

  rows(doc, 68, [
    ["Facturé à", d.client],
    ["E-mail", d.email],
    ["Véhicule", d.car],
    ["Période", `${d.startDate} → ${d.endDate}`],
    ["Statut", d.status],
  ]);

  // Tableau de facturation
  let y = 130;
  doc.setFillColor(37, 99, 235);
  doc.rect(15, y - 6, 180, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Description", 20, y);
  doc.text("Qté", 120, y);
  doc.text("P.U.", 150, y);
  doc.text("Total", 190, y, { align: "right" });

  y += 12;
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "normal");
  doc.text(`Location — ${d.car}`, 20, y);
  doc.text(`${d.days} j`, 120, y);
  doc.text(d.unitPrice, 150, y);
  doc.text(d.subtotal, 190, y, { align: "right" });

  y += 16;
  const totals: [string, string][] = [
    ["Sous-total", d.subtotal],
    ["TVA (19%)", d.tax],
    ["Total TTC", d.total],
  ];
  totals.forEach(([label, value], i) => {
    const bold = i === totals.length - 1;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 12 : 10);
    doc.setTextColor(bold ? 37 : 71, bold ? 99 : 85, bold ? 235 : 105);
    doc.text(label, 140, y);
    doc.setTextColor(30, 41, 59);
    doc.text(value, 190, y, { align: "right" });
    y += bold ? 10 : 7;
  });

  pdfFooter(doc);
  doc.save(`Facture-${d.number}.pdf`);
}
