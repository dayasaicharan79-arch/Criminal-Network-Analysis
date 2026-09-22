/**
 * CONSTELLATION — Multi-Format Intelligence Parser Hardening Test Suite
 * 
 * Verifies robust extraction, validation, and exhibit generation across:
 * - Extension detection
 * - XLSX / XLS (Excel via SheetJS)
 * - XML (Structured Intelligence with tags & attributes)
 * - DOCX (Word Document paragraphs & key/values)
 * - PDF (Compressed /FlateDecode streams & raw text)
 * - Empty & Malformed files (controlled error responses)
 * - Authentic binary SHA-256 cryptographic hashing
 * - Evidence mapping & whole-file exhibit registration
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  detectFileFormat,
  parseCSV,
  parseJSON,
  parseExcel,
  parseXML,
  parseTXT,
  parseDOCX,
  parsePDF,
  computeArrayBufferHash,
  suggestFieldMappings,
  buildIngestionPayloadFromMapping,
  TARGET_FIELDS,
} from '../../client/src/utils/fileParsers.js';

import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

describe('Multi-Format Parser Hardening & Evidence Mapping', () => {
  // ---------------------------------------------------------------------------
  // 1. EXTENSION & FORMAT DETECTION
  // ---------------------------------------------------------------------------
  describe('1. File Extension & Format Detection', () => {
    it('accurately identifies all supported forensic file extensions', () => {
      assert.strictEqual(detectFileFormat({ name: 'cdr_log.csv' }), 'CSV');
      assert.strictEqual(detectFileFormat({ name: 'suspects.json' }), 'JSON');
      assert.strictEqual(detectFileFormat({ name: 'transactions.xlsx' }), 'XLSX');
      assert.strictEqual(detectFileFormat({ name: 'bank_statement.xls' }), 'XLS');
      assert.strictEqual(detectFileFormat({ name: 'intel_feed.xml' }), 'XML');
      assert.strictEqual(detectFileFormat({ name: 'surveillance.txt' }), 'TXT');
      assert.strictEqual(detectFileFormat({ name: 'investigation_dossier.docx' }), 'DOCX');
      assert.strictEqual(detectFileFormat({ name: 'forensic_report.pdf' }), 'PDF');
    });

    it('rejects unsupported extensions with descriptive error', () => {
      assert.throws(() => detectFileFormat({ name: 'malware.exe' }), /Unsupported file format/);
      assert.throws(() => detectFileFormat({ name: 'no_extension' }), /Unsupported file format/);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. EXCEL (XLSX / XLS) PARSING
  // ---------------------------------------------------------------------------
  describe('2. Excel Workbook Parsing (XLSX / XLS)', () => {
    it('extracts headers and rows accurately from valid XLSX workbook', () => {
      const filePath = path.join(fixturesDir, 'sample_sheet.xlsx');
      const buffer = fs.readFileSync(filePath);
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

      const parsed = parseExcel(arrayBuffer);
      assert.ok(Array.isArray(parsed.headers));
      assert.ok(parsed.headers.includes('Name'));
      assert.ok(parsed.headers.includes('Role'));
      assert.ok(parsed.headers.includes('Phone'));
      assert.ok(parsed.headers.includes('City'));
      assert.ok(parsed.rows.length >= 3);

      const firstRow = parsed.rows[0];
      assert.strictEqual(firstRow.Name, 'Tariq Mansoor');
      assert.strictEqual(firstRow.Role, 'Hawala Kingpin');
      assert.strictEqual(firstRow.Phone, '+971501234567');
      assert.strictEqual(firstRow.City, 'Dubai');
    });

    it('handles empty Excel workbook without crashing', () => {
      // Empty buffer
      const emptyBuf = new ArrayBuffer(0);
      assert.throws(() => parseExcel(emptyBuf));
    });
  });

  // ---------------------------------------------------------------------------
  // 3. XML PARSING (HEADLESS & ISOMORPHIC)
  // ---------------------------------------------------------------------------
  describe('3. XML Intelligence Parsing', () => {
    it('extracts nested elements, attributes, and tags into structured records', () => {
      const filePath = path.join(fixturesDir, 'sample_intel.xml');
      const xmlText = fs.readFileSync(filePath, 'utf-8');

      const parsed = parseXML(xmlText);
      assert.ok(parsed.headers.length > 0);
      assert.ok(parsed.rows.length >= 3);

      const tariq = parsed.rows.find(r => r.name === 'Tariq Mansoor' || r.alias === 'Sultan');
      assert.ok(tariq, 'Target Tariq Mansoor should be extracted from XML');
      assert.strictEqual(tariq.role, 'Hawala Kingpin');
      assert.strictEqual(tariq.phone, '+971501234567');
      assert.strictEqual(tariq.city, 'Dubai');
    });

    it('handles empty XML text with controlled error', () => {
      assert.throws(() => parseXML(''), /Empty or invalid XML/);
      assert.throws(() => parseXML('   '), /Empty or invalid XML/);
    });

    it('rejects malformed XML structure cleanly', () => {
      assert.throws(() => parseXML('Not an XML document'), /XML Parse Error/);
      assert.throws(() => parseXML('<unclosedTag>content'), /XML Parse Error/);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. DOCX PARSING
  // ---------------------------------------------------------------------------
  describe('4. Word Document Parsing (DOCX)', () => {
    it('extracts paragraphs, phone numbers, and timestamps from valid DOCX', async () => {
      const filePath = path.join(fixturesDir, 'sample_dossier.docx');
      const buffer = fs.readFileSync(filePath);
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

      const parsed = await parseDOCX(arrayBuffer);
      assert.ok(parsed.rawText.length > 0);
      assert.ok(parsed.rawText.includes('Tariq Mansoor'));
      assert.ok(parsed.rawText.includes('864209040112340'));
      assert.ok(parsed.rows.length > 0);
    });

    it('handles corrupted or empty DOCX buffer cleanly', async () => {
      const corruptBuffer = Buffer.from('corrupted non-zip content');
      const arrayBuffer = corruptBuffer.buffer.slice(corruptBuffer.byteOffset, corruptBuffer.byteOffset + corruptBuffer.byteLength);

      await assert.rejects(async () => {
        await parseDOCX(arrayBuffer);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 5. PDF PARSING WITH COMPRESSED /FLATEDECODE EXTRACTION
  // ---------------------------------------------------------------------------
  describe('5. Compressed PDF Text & Stream Extraction', () => {
    it('inflates /FlateDecode streams and extracts intelligence text, phones, and IMEIs', async () => {
      const filePath = path.join(fixturesDir, 'sample_report.pdf');
      const buffer = fs.readFileSync(filePath);
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

      const parsed = await parsePDF(arrayBuffer);
      assert.ok(parsed.rawText.length > 0, 'Extracted text should not be empty');
      assert.ok(parsed.rawText.includes('OPERATION VORTEX'), 'Should extract header title from stream');
      assert.ok(parsed.rawText.includes('Tariq Mansoor'), 'Should extract suspect name');
      assert.ok(parsed.rawText.includes('864209040112340'), 'Should extract IMEI');
      assert.ok(parsed.rawText.includes('+971501234567'), 'Should extract phone number');

      // Check authentic binary hash
      assert.ok(parsed.fileHash.startsWith('SHA256:'), 'File hash must have SHA256 prefix');
      assert.strictEqual(parsed.fileHash.length, 71); // 'SHA256:' + 64 hex chars
    });

    it('rejects non-PDF files missing the %PDF- header', async () => {
      const fakePdf = Buffer.from('This is a plain text file pretending to be PDF');
      const arrayBuffer = fakePdf.buffer.slice(fakePdf.byteOffset, fakePdf.byteOffset + fakePdf.byteLength);

      await assert.rejects(
        async () => { await parsePDF(arrayBuffer); },
        /Invalid PDF format: Missing %PDF header/
      );
    });

    it('accurately reports scanned/empty PDFs without claiming false OCR', async () => {
      // Create minimal PDF without text stream
      const emptyPdfStr = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n100\n%%EOF\n`;
      const buf = Buffer.from(emptyPdfStr, 'utf-8');
      const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

      const parsed = await parsePDF(arrayBuffer);
      assert.ok(parsed.warnings.some(w => w.includes('no extractable text layer')));
    });
  });

  // ---------------------------------------------------------------------------
  // 6. FORENSIC BINARY SHA-256 HASHING
  // ---------------------------------------------------------------------------
  describe('6. Cryptographic File Integrity Hashing', () => {
    it('computes deterministic binary SHA-256 hash independent of text extraction', async () => {
      const data = Buffer.from('FORENSIC_EVIDENCE_PAYLOAD_TEST_2024');
      const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

      const hash1 = await computeArrayBufferHash(ab);
      const hash2 = await computeArrayBufferHash(ab);

      assert.strictEqual(hash1, hash2);
      assert.ok(hash1.startsWith('SHA256:'));
      assert.strictEqual(hash1.length, 71);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. EVIDENCE FIELD MAPPING & EXHIBIT GENERATION
  // ---------------------------------------------------------------------------
  describe('7. Evidence Target Mapping & Exhibit Generation', () => {
    it('includes all canonical Evidence Locker fields in TARGET_FIELDS', () => {
      const evidenceTargets = TARGET_FIELDS.filter(f => f.category === 'Evidence');
      assert.ok(evidenceTargets.some(f => f.value === 'evidence.title'));
      assert.ok(evidenceTargets.some(f => f.value === 'evidence.evidenceType'));
      assert.ok(evidenceTargets.some(f => f.value === 'evidence.hash'));
      assert.ok(evidenceTargets.some(f => f.value === 'evidence.custodyOfficer'));
      assert.ok(evidenceTargets.some(f => f.value === 'evidence.classification'));
    });

    it('suggests appropriate Evidence target mappings for exhibit headers', () => {
      const headers = ['ExhibitName', 'EvidenceType', 'SHA256', 'CustodyOfficer', 'EvidentiaryClassification'];
      const suggestions = suggestFieldMappings(headers);

      assert.strictEqual(suggestions['ExhibitName'], 'evidence.title');
      assert.strictEqual(suggestions['EvidenceType'], 'evidence.evidenceType');
      assert.strictEqual(suggestions['SHA256'], 'evidence.hash');
      assert.strictEqual(suggestions['CustodyOfficer'], 'evidence.custodyOfficer');
      assert.strictEqual(suggestions['EvidentiaryClassification'], 'evidence.classification');
    });

    it('generates canonical Evidence records from mapped row data and links entities', () => {
      const rows = [
        {
          suspectName: 'Tariq Mansoor',
          exhibit: 'Encrypted USB Drive',
          exhibitType: 'SEIZED_DEVICE',
          officer: 'Inspector Sen',
          hash: 'SHA256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
      ];
      const mapping = {
        suspectName: 'entity.label',
        exhibit: 'evidence.title',
        exhibitType: 'evidence.evidenceType',
        officer: 'evidence.custodyOfficer',
        hash: 'evidence.hash',
      };

      const payload = buildIngestionPayloadFromMapping({
        rows,
        mapping,
        caseId: 'CASE-2024-VORTEX',
        filename: 'seizure_log.csv',
        fileHash: 'SHA256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        registerSourceFileAsEvidence: true,
      });

      assert.strictEqual(payload.entities.length, 1);
      assert.strictEqual(payload.evidence.length, 2); // 1 row exhibit + 1 whole-file exhibit

      // Check row exhibit
      const rowEvid = payload.evidence.find(e => e.id.startsWith('IMP-EVID-'));
      assert.ok(rowEvid);
      assert.strictEqual(rowEvid.title, 'Encrypted USB Drive');
      assert.strictEqual(rowEvid.evidenceType, 'SEIZED_DEVICE');
      assert.strictEqual(rowEvid.recoveringOfficer, 'Inspector Sen');
      assert.deepStrictEqual(rowEvid.entityIds, ['IMP-ENT-1']); // Linked to entity

      // Check whole-file exhibit
      const fileEvid = payload.evidence.find(e => e.id.startsWith('EXHIBIT-FILE-'));
      assert.ok(fileEvid);
      assert.strictEqual(fileEvid.title, 'Exhibit: seizure_log.csv');
      assert.strictEqual(fileEvid.hash, 'SHA256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
      assert.strictEqual(fileEvid.classification, 'FACT');
      assert.ok(fileEvid.metadata.isWholeFileExhibit);
    });
  });
});
