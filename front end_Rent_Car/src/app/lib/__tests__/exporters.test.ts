import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Doubles des librairies lourdes (SheetJS / jsPDF) ─────────────────
const jsPDFInstance = {
  setFillColor: vi.fn(),
  rect: vi.fn(),
  setTextColor: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setDrawColor: vi.fn(),
  line: vi.fn(),
  text: vi.fn(),
  splitTextToSize: vi.fn((txt: string) => [txt]),
  save: vi.fn(),
}

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => jsPDFInstance),
}))

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({ sheet: true })),
    book_new: vi.fn(() => ({ book: true })),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))

import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { downloadCSV, downloadXLSX, generateContractPDF, generateInvoicePDF } from '../exporters'

/** Intercepte le Blob passé à URL.createObjectURL et le lien de téléchargement. */
const captureDownload = () => {
  const captured: { blob?: Blob; filename?: string; clicked: boolean } = { clicked: false }

  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    captured.blob = blob as Blob
    return 'blob:mock-url'
  })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    captured.clicked = true
    captured.filename = this.download
  })

  return captured
}

/** jsdom n'implémente pas Blob.text() → lecture via FileReader. */
const readBlob = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })

const readBlobBuffer = (blob: Blob): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('lib/exporters · downloadCSV()', () => {
  it('ne déclenche aucun téléchargement pour un tableau vide', () => {
    const captured = captureDownload()

    downloadCSV('export', [])

    expect(captured.clicked).toBe(false)
  })

  it('génère un CSV point-virgule avec en-têtes issus de la première ligne', async () => {
    const captured = captureDownload()

    downloadCSV('reservations', [
      { id: 'r1', client: 'Amine', total: 480 },
      { id: 'r2', client: 'Sofia', total: 620 },
    ])

    const text = await readBlob(captured.blob!)
    expect(text.replace(/^﻿/, '').split('\n')).toEqual([
      'id;client;total',
      'r1;Amine;480',
      'r2;Sofia;620',
    ])
  })

  it('nomme le fichier avec l’extension .csv', () => {
    const captured = captureDownload()

    downloadCSV('reservations', [{ id: 1 }])

    expect(captured.clicked).toBe(true)
    expect(captured.filename).toBe('reservations.csv')
  })

  it('préfixe le contenu du BOM UTF-8 (compatibilité Excel)', async () => {
    const captured = captureDownload()

    downloadCSV('x', [{ a: 'é' }])

    // FileReader.readAsText retire le BOM à la lecture → on inspecte les octets
    const bytes = new Uint8Array(await readBlobBuffer(captured.blob!))
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf])
    expect(captured.blob!.type).toContain('text/csv')
    expect(captured.blob!.type).toContain('charset=utf-8')
  })

  it('échappe les valeurs contenant un séparateur, un guillemet ou un saut de ligne', async () => {
    const captured = captureDownload()

    downloadCSV('x', [{ a: 'Tunis; Ariana', b: 'dit "OK"', c: 'ligne1\nligne2', d: 'simple' }])

    const text = (await readBlob(captured.blob!)).replace(/^﻿/, '')
    expect(text).toContain('"Tunis; Ariana"')
    expect(text).toContain('"dit ""OK"""')
    expect(text).toContain('"ligne1\nligne2"')
    expect(text).toContain(';simple')
  })

  it('remplace les valeurs nulles ou absentes par une chaîne vide', async () => {
    const captured = captureDownload()

    downloadCSV('x', [{ a: null, b: undefined, c: 0 }])

    const text = (await readBlob(captured.blob!)).replace(/^﻿/, '')
    expect(text.split('\n')[1]).toBe(';;0')
  })
})

describe('lib/exporters · downloadXLSX()', () => {
  const rows = [{ id: 'r1', total: 480 }]

  it('convertit les lignes en feuille et écrit le fichier .xlsx', () => {
    downloadXLSX('paiements', rows)

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(rows)
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      { book: true },
      { sheet: true },
      'Données',
    )
    expect(XLSX.writeFile).toHaveBeenCalledWith({ book: true }, 'paiements.xlsx')
  })

  it('utilise le nom de feuille fourni', () => {
    downloadXLSX('paiements', rows, 'Paiements 2026')

    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'Paiements 2026',
    )
  })
})

describe('lib/exporters · generateContractPDF()', () => {
  const data = {
    number: 'CONT-20260220-1234',
    status: 'Signé',
    client: 'Amine Ben Salah',
    email: 'amine@example.com',
    car: 'Renault Clio',
    plate: '123 TU 4567',
    startDate: '01/03/2026',
    endDate: '05/03/2026',
    pickup: 'Tunis',
    ret: 'Tunis',
    total: '480 DT',
  }

  it('produit un PDF nommé d’après le numéro de contrat', () => {
    generateContractPDF(data)

    expect(jsPDF).toHaveBeenCalledTimes(1)
    expect(jsPDFInstance.save).toHaveBeenCalledWith('Contrat-CONT-20260220-1234.pdf')
  })

  it('imprime les informations clés du contrat', () => {
    generateContractPDF(data)

    const printed = jsPDFInstance.text.mock.calls.map((c) => String(c[0]))
    expect(printed).toContain('Amine Ben Salah')
    expect(printed).toContain('Renault Clio')
    expect(printed).toContain('01/03/2026 → 05/03/2026')
    expect(printed).toContain('480 DT')
    expect(printed).toContain('N° CONT-20260220-1234')
  })

  it('affiche la zone de signature vierge tant que le contrat n’est pas signé', () => {
    generateContractPDF(data)

    const printed = jsPDFInstance.text.mock.calls.map((c) => String(c[0]))
    expect(printed).toContain('Signature du client')
  })

  it('affiche la date de signature une fois le contrat signé', () => {
    generateContractPDF({ ...data, signedAt: '21/02/2026' })

    const printed = jsPDFInstance.text.mock.calls.map((c) => String(c[0]))
    expect(printed).toContain('Signé le 21/02/2026')
    expect(printed).not.toContain('Signature du client')
  })
})

describe('lib/exporters · generateInvoicePDF()', () => {
  const data = {
    number: 'FACT-2026-001',
    client: 'Amine Ben Salah',
    email: 'amine@example.com',
    car: 'Renault Clio',
    startDate: '01/03/2026',
    endDate: '05/03/2026',
    days: 4,
    unitPrice: '120 DT',
    subtotal: '480 DT',
    tax: '91 DT',
    total: '571 DT',
    status: 'Payé',
    date: '05/03/2026',
  }

  it('produit un PDF nommé d’après le numéro de facture', () => {
    generateInvoicePDF(data)

    expect(jsPDFInstance.save).toHaveBeenCalledWith('Facture-FACT-2026-001.pdf')
  })

  it('imprime la ligne de facturation et les totaux', () => {
    generateInvoicePDF(data)

    const printed = jsPDFInstance.text.mock.calls.map((c) => String(c[0]))
    expect(printed).toContain('Location — Renault Clio')
    expect(printed).toContain('4 j')
    expect(printed).toContain('Sous-total')
    expect(printed).toContain('TVA (19%)')
    expect(printed).toContain('Total TTC')
    expect(printed).toContain('571 DT')
  })

  it('imprime l’en-tête RentCar et le pied de page sur chaque document', () => {
    generateInvoicePDF(data)

    const printed = jsPDFInstance.text.mock.calls.map((c) => String(c[0]))
    expect(printed).toContain('RentCar')
    expect(printed.some((t) => t.includes('contact@rentcar.tn'))).toBe(true)
  })
})
