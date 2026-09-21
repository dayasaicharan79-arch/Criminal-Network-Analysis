/**
 * CONSTELLATION — File Parsers & Field Mapping Unit Test Suite
 *
 * Tests:
 * - RFC 4180 CSV parsing (delimiters, quoted cells with commas, newlines)
 * - JSON extraction (arrays and structured envelopes)
 * - TXT intelligence log parsing (regex patterns for phones, IMEIs, dates)
 * - Intelligent field mapping suggestions
 * - Canonical Ingestion Payload construction from mapped rows
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseCSV,
  parseJSON,
  parseTXT,
  suggestFieldMappings,
  buildIngestionPayloadFromMapping,
  detectFileFormat,
} from '../../client/src/utils/fileParsers.js';
import { ingestionService } from '../src/services/ingestionService.js';
import { ENTITY_TYPES, RELATIONSHIP_TYPES } from '@constellation/shared/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('File Parsers & Field Mapping Engine', () => {
  // ---------------------------------------------------------------------------
  // 1. Format Detection
  // ---------------------------------------------------------------------------
  describe('Format Detection', () => {
    it('detects file formats from extensions and MIME types', () => {
      assert.equal(detectFileFormat({ name: 'cdr_log.csv', type: 'text/csv' }), 'CSV');
      assert.equal(detectFileFormat({ name: 'suspects.json', type: 'application/json' }), 'JSON');
      assert.equal(detectFileFormat({ name: 'seizures.xlsx', type: '' }), 'XLSX');
      assert.equal(detectFileFormat({ name: 'archive.xls', type: '' }), 'XLS');
      assert.equal(detectFileFormat({ name: 'wiretap.txt', type: 'text/plain' }), 'TXT');
      assert.equal(detectFileFormat({ name: 'dossier.docx', type: '' }), 'DOCX');
      assert.equal(detectFileFormat({ name: 'intelligence.pdf', type: 'application/pdf' }), 'PDF');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CSV Parser (RFC 4180 Compliant)
  // ---------------------------------------------------------------------------
  describe('RFC 4180 CSV Parser', () => {
    it('parses standard comma-delimited rows with headers', () => {
      const csv = `Suspect Name,Mobile Number,Role,City
Tariq Mansoor,+91 98110 44219,Kingpin,Dubai
Karan Verma,+91 98201 55182,Hawaladar,Mumbai`;

      const result = parseCSV(csv);
      assert.deepEqual(result.headers, ['Suspect Name', 'Mobile Number', 'Role', 'City']);
      assert.equal(result.rows.length, 2);
      assert.equal(result.rows[0]['Suspect Name'], 'Tariq Mansoor');
      assert.equal(result.rows[1]['City'], 'Mumbai');
    });

    it('handles quoted fields containing commas and quotes properly', () => {
      const csv = `Identifier,Notes,Amount
"PER-01","Met at safehouse, Sector 62, Noida","₹45,00,000"
"PER-02","Said ""No wiretap active""","₹10,00,000"`;

      const result = parseCSV(csv);
      assert.equal(result.rows.length, 2);
      assert.equal(result.rows[0].Notes, 'Met at safehouse, Sector 62, Noida');
      assert.equal(result.rows[0].Amount, '₹45,00,000');
      assert.equal(result.rows[1].Notes, 'Said "No wiretap active"');
    });

    it('detects tab and semicolon delimiters automatically', () => {
      const tsv = `Name\tPhone\tRole\nFarhan Baig\t+919999911111\tTransporter`;
      const resultTSV = parseCSV(tsv);
      assert.equal(resultTSV.headers.length, 3);
      assert.equal(resultTSV.rows[0].Name, 'Farhan Baig');

      const ssv = `Name;Phone;Role\nFarhan Baig;+919999911111;Transporter`;
      const resultSSV = parseCSV(ssv);
      assert.equal(resultSSV.headers.length, 3);
      assert.equal(resultSSV.rows[0].Role, 'Transporter');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. JSON Parser
  // ---------------------------------------------------------------------------
  describe('JSON Parser', () => {
    it('parses an array of arbitrary flat records', () => {
      const json = JSON.stringify([
        { suspect_name: 'Vikram Malhotra', alias: 'Blade', imei: '864209040112340' },
        { suspect_name: 'Sameer Sheikh', alias: 'Cipher', imei: '864209040112340' },
      ]);

      const result = parseJSON(json);
      assert.deepEqual(result.headers.sort(), ['alias', 'imei', 'suspect_name']);
      assert.equal(result.rows.length, 2);
      assert.equal(result.rows[0].alias, 'Blade');
    });

    it('identifies and extracts pre-structured ingestion envelopes', () => {
      const structured = JSON.stringify({
        entities: [
          { id: 'E1', type: 'person', label: 'Aditya' },
        ],
        relationships: [
          { id: 'R1', source: 'E1', target: 'E2', type: 'CALLED' },
        ],
      });

      const result = parseJSON(structured);
      assert.equal(result.isStructuredPayload, true);
      assert.equal(result.rows.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. TXT Intelligence Log Parser
  // ---------------------------------------------------------------------------
  describe('TXT Intelligence Log Parser', () => {
    it('extracts structured identifiers, timestamps, and key-value logs from raw text', () => {
      const txt = `2024-03-15T10:30:00 Call initiated from +919811044219 to +919820155182
Hardware IMEI: 864209040112340 detected on Sector 4 Tower
Target: Vikram Malhotra`;

      const result = parseTXT(txt);
      assert.ok(result.rows.length >= 2);

      const imeiRow = result.rows.find(r => r.identifier === '864209040112340');
      assert.ok(imeiRow, 'Must extract 15-digit IMEI identifier');

      const dateRow = result.rows.find(r => r.timestamp === '2024-03-15T10:30:00');
      assert.ok(dateRow, 'Must extract ISO-8601 timestamp');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Intelligent Field Mapping Engine
  // ---------------------------------------------------------------------------
  describe('Field Mapping Suggestion Engine', () => {
    it('suggests correct canonical target fields for typical investigation columns', () => {
      const headers = [
        'Suspect Name',
        'Mobile',
        'Hardware IMEI',
        'Vehicle Plate',
        'GPS Latitude',
        'GPS Longitude',
        'City',
        'Call Date',
        'Unknown Column X',
      ];

      const mapping = suggestFieldMappings(headers);

      assert.equal(mapping['Suspect Name'], 'entity.label');
      assert.equal(mapping['Mobile'], 'entity.attributes.phoneNumber');
      assert.equal(mapping['Hardware IMEI'], 'entity.attributes.imei');
      assert.equal(mapping['Vehicle Plate'], 'entity.attributes.plate');
      assert.equal(mapping['GPS Latitude'], 'location.latitude');
      assert.equal(mapping['GPS Longitude'], 'location.longitude');
      assert.equal(mapping['City'], 'location.city');
      assert.equal(mapping['Call Date'], 'event.timestamp');
      assert.equal(mapping['Unknown Column X'], 'IGNORE');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Ingestion Payload Builder
  // ---------------------------------------------------------------------------
  describe('Ingestion Payload Construction from Mappings', () => {
    it('transforms mapped table rows into canonical unified ingestion envelope', () => {
      const rows = [
        {
          'Full Name': 'Arjun Singhania',
          'Phone': '+91 98765 00001',
          'City': 'New Delhi',
          'Lat': '28.6139',
          'Lng': '77.2090',
          'Date': '2024-03-20T12:00:00Z',
          'Title': 'Surveillance Check',
        },
      ];

      const mapping = {
        'Full Name': 'entity.label',
        'Phone': 'entity.attributes.phoneNumber',
        'City': 'location.city',
        'Lat': 'location.latitude',
        'Lng': 'location.longitude',
        'Date': 'event.timestamp',
        'Title': 'event.title',
      };

      const payload = buildIngestionPayloadFromMapping({
        rows,
        mapping,
        caseId: 'CASE-2024-VORTEX',
        filename: 'field_test.csv',
      });

      assert.equal(payload.source, 'file');
      assert.equal(payload.caseId, 'CASE-2024-VORTEX');
      assert.equal(payload.entities.length, 1);
      assert.equal(payload.entities[0].label, 'Arjun Singhania');
      assert.equal(payload.entities[0].attributes.phoneNumber, '+91 98765 00001');

      assert.equal(payload.locations.length, 1);
      assert.equal(payload.locations[0].latitude, 28.6139);
      assert.equal(payload.locations[0].longitude, 77.2090);

      assert.equal(payload.events.length, 1);
      assert.equal(payload.events[0].title, 'Surveillance Check');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Quick-Load Demo Fixtures Pipeline Ingestion Verification
  // ---------------------------------------------------------------------------
  describe('Quick-Load Demo Fixtures Pipeline Ingestion Verification', () => {
    it('parses sample_cdr_log.csv, auto-maps columns, and ingests cleanly into backend', async () => {
      const csvPath = resolve(__dirname, '../../client/public/samples/sample_cdr_log.csv');
      const rawCSV = readFileSync(csvPath, 'utf8');

      const parsed = parseCSV(rawCSV);
      assert.ok(parsed.rows.length >= 6, 'Must contain 6 CDR rows');

      const mapping = suggestFieldMappings(parsed.headers);
      assert.equal(mapping['Source MSISDN'], 'relationship.source');
      assert.equal(mapping['Target MSISDN'], 'relationship.target');
      assert.equal(mapping['Hardware IMEI'], 'entity.attributes.imei');
      assert.equal(mapping['GPS Latitude'], 'location.latitude');
      assert.equal(mapping['GPS Longitude'], 'location.longitude');

      const payload = buildIngestionPayloadFromMapping({
        rows: parsed.rows,
        mapping,
        caseId: 'CASE-2024-VORTEX',
        filename: 'sample_cdr_log.csv',
      });

      assert.ok(payload.relationships.length >= 6);
      assert.ok(payload.locations.length >= 6);

      const ingestResult = await ingestionService.ingest(payload);
      assert.equal(ingestResult.success, true);
      assert.ok(ingestResult.summary.accepted > 0);
      assert.equal(ingestResult.summary.rejected, 0);
    });

    it('parses sample_suspect_dossiers.json, auto-maps columns, and ingests cleanly into backend', async () => {
      const jsonPath = resolve(__dirname, '../../client/public/samples/sample_suspect_dossiers.json');
      const rawJSON = readFileSync(jsonPath, 'utf8');

      const parsed = parseJSON(rawJSON);
      assert.equal(parsed.rows.length, 4);

      const mapping = suggestFieldMappings(parsed.headers);
      assert.equal(mapping['suspect_name'], 'entity.label');
      assert.equal(mapping['role'], 'entity.subType');
      assert.equal(mapping['mobile'], 'entity.attributes.phoneNumber');
      assert.equal(mapping['hardware_imei'], 'entity.attributes.imei');
      assert.equal(mapping['vehicle_plate'], 'entity.attributes.plate');
      assert.equal(mapping['city'], 'location.city');

      const payload = buildIngestionPayloadFromMapping({
        rows: parsed.rows,
        mapping,
        caseId: 'CASE-2024-VORTEX',
        filename: 'sample_suspect_dossiers.json',
      });

      assert.equal(payload.entities.length, 4);

      const ingestResult = await ingestionService.ingest(payload);
      assert.equal(ingestResult.success, true);
      assert.ok(ingestResult.summary.accepted >= 4);
    });

    it('parses sample_surveillance_log.txt, auto-extracts identifiers, and ingests cleanly', async () => {
      const txtPath = resolve(__dirname, '../../client/public/samples/sample_surveillance_log.txt');
      const rawTXT = readFileSync(txtPath, 'utf8');

      const parsed = parseTXT(rawTXT);
      assert.ok(parsed.rows.length >= 3);

      const mapping = suggestFieldMappings(parsed.headers);
      const payload = buildIngestionPayloadFromMapping({
        rows: parsed.rows,
        mapping,
        caseId: 'CASE-2024-VORTEX',
        filename: 'sample_surveillance_log.txt',
      });

      assert.ok(payload.events.length > 0 || payload.entities.length > 0);

      const ingestResult = await ingestionService.ingest(payload);
      assert.equal(ingestResult.success, true);
      assert.ok(ingestResult.summary.accepted > 0);
    });
  });
});
