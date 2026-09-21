/**
 * CONSTELLATION — Multi-Format Investigation File Parsers & Extraction Engine
 *
 * Reliably parses and extracts structured intelligence records from:
 * - CSV (RFC 4180 compliant with quote escaping and delimiter detection)
 * - JSON (Batch arrays or structured { entities, relationships, ... } envelopes)
 * - XLSX / XLS (Excel workbooks via SheetJS)
 * - XML (XML intelligence logs via DOMParser)
 * - TXT (Structured text logs, key-value dumps, and CDR text streams)
 * - DOCX (Microsoft Word intelligence dossiers via Mammoth)
 * - PDF (Portable Document Format text and stream extraction)
 */
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { ENTITY_TYPES, RELATIONSHIP_TYPES } from '@constellation/shared/constants.js';

/**
 * Detect file format from file extension and MIME type
 */
export function detectFileFormat(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return 'CSV';
  if (name.endsWith('.json')) return 'JSON';
  if (name.endsWith('.xlsx')) return 'XLSX';
  if (name.endsWith('.xls')) return 'XLS';
  if (name.endsWith('.xml')) return 'XML';
  if (name.endsWith('.txt')) return 'TXT';
  if (name.endsWith('.docx')) return 'DOCX';
  if (name.endsWith('.pdf')) return 'PDF';

  if (file.type.includes('csv')) return 'CSV';
  if (file.type.includes('json')) return 'JSON';
  if (file.type.includes('spreadsheet') || file.type.includes('excel')) return 'XLSX';
  if (file.type.includes('xml')) return 'XML';
  if (file.type.includes('wordprocessingml')) return 'DOCX';
  if (file.type.includes('pdf')) return 'PDF';

  return 'TXT'; // Default fallback
}

/**
 * Robust RFC 4180 CSV parser
 */
export function parseCSV(text) {
  if (!text || typeof text !== 'string') return { headers: [], rows: [] };

  // Strip leading comment lines starting with # or //
  const textWithoutLeadingComments = text
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('#') && !line.trim().startsWith('//'))
    .join('\n');

  if (!textWithoutLeadingComments.trim()) return { headers: [], rows: [] };

  // Detect delimiter: comma, semicolon, or tab
  const firstLine = textWithoutLeadingComments.split(/\r?\n/)[0] || '';
  let delimiter = ',';
  if (firstLine.includes('\t') && !firstLine.includes(',')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let insideQuotes = false;

  for (let i = 0; i < textWithoutLeadingComments.length; i++) {
    const char = textWithoutLeadingComments[i];
    const nextChar = textWithoutLeadingComments[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++; // CRLF
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  const dataRows = [];

  for (let r = 1; r < rows.length; r++) {
    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] = rows[r][idx] !== undefined ? rows[r][idx] : '';
    });
    dataRows.push(rowObj);
  }

  return { headers, rows: dataRows };
}

/**
 * JSON parser supporting standard arrays or structured ingestion payloads
 */
export function parseJSON(text) {
  const parsed = JSON.parse(text);

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return { headers: [], rows: [] };
    const headerSet = new Set();
    parsed.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(k => headerSet.add(k));
      }
    });
    return {
      headers: Array.from(headerSet),
      rows: parsed,
    };
  }

  if (typeof parsed === 'object' && parsed !== null) {
    // Check if already structured ingestion envelope
    if (parsed.entities || parsed.relationships || parsed.locations || parsed.events) {
      return {
        isStructuredPayload: true,
        payload: parsed,
        headers: ['type', 'id', 'label', 'details'],
        rows: [
          ...(parsed.entities || []).map(e => ({ type: e.type || 'entity', id: e.id, label: e.label, details: JSON.stringify(e.attributes || {}) })),
          ...(parsed.relationships || []).map(r => ({ type: 'relationship', id: r.id, label: `${r.source} -> ${r.target}`, details: r.type })),
          ...(parsed.locations || []).map(l => ({ type: 'location', id: l.id, label: l.name || l.city, details: `${l.latitude}, ${l.longitude}` })),
        ],
      };
    }

    // Single record
    return {
      headers: Object.keys(parsed),
      rows: [parsed],
    };
  }

  throw new Error('Invalid JSON format for investigation import');
}

/**
 * Excel XLSX & XLS parser via SheetJS
 */
export function parseExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (jsonData.length === 0) return { headers: [], rows: [] };

  const headerSet = new Set();
  jsonData.forEach(row => {
    Object.keys(row).forEach(k => headerSet.add(k));
  });

  return {
    headers: Array.from(headerSet),
    rows: jsonData,
    sheetNames: workbook.SheetNames,
  };
}

/**
 * XML intelligence parser via browser DOMParser
 */
export function parseXML(text) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'application/xml');

  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`XML Parse Error: ${parserError.textContent.substring(0, 150)}`);
  }

  const root = xmlDoc.documentElement;
  const children = Array.from(root.children);

  if (children.length === 0) {
    return { headers: ['content'], rows: [{ content: root.textContent.trim() }] };
  }

  const headerSet = new Set();
  const rows = children.map(child => {
    const row = {};
    // Collect attributes
    Array.from(child.attributes).forEach(attr => {
      headerSet.add(attr.name);
      row[attr.name] = attr.value;
    });
    // Collect sub-elements
    Array.from(child.children).forEach(sub => {
      headerSet.add(sub.tagName);
      row[sub.tagName] = sub.textContent.trim();
    });
    if (child.children.length === 0 && child.textContent.trim()) {
      headerSet.add('value');
      row.value = child.textContent.trim();
    }
    return row;
  });

  return {
    headers: Array.from(headerSet),
    rows,
  };
}

/**
 * TXT intelligence log parser
 */
export function parseTXT(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows = [];
  const headerSet = new Set(['line', 'timestamp', 'identifier', 'message']);

  // Pattern checks: ISO date, Phone, IMEI
  const phoneRegex = /\+?\d{10,15}/;
  const imeiRegex = /\b86\d{13}\b/;
  const dateRegex = /\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}\b/;

  lines.forEach((line, idx) => {
    const row = {
      line: idx + 1,
      message: line,
    };

    const dateMatch = line.match(dateRegex);
    if (dateMatch) row.timestamp = dateMatch[0];

    const imeiMatch = line.match(imeiRegex);
    if (imeiMatch) row.identifier = imeiMatch[0];

    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch && !row.identifier) row.identifier = phoneMatch[0];

    // Check key: value format
    if (line.includes(':')) {
      const parts = line.split(':');
      const key = parts[0].trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const val = parts.slice(1).join(':').trim();
      if (key.length < 25 && val) {
        row[key] = val;
        headerSet.add(key);
      }
    }

    rows.push(row);
  });

  return {
    headers: Array.from(headerSet),
    rows,
  };
}

/**
 * DOCX parser via Mammoth
 */
export async function parseDOCX(arrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = result.value || '';
  const parsed = parseTXT(rawText);

  return {
    headers: parsed.headers,
    rows: parsed.rows,
    rawText,
    warnings: result.messages,
  };
}

/**
 * PDF parser text stream extractor
 */
export async function parsePDF(arrayBuffer) {
  // Convert buffer to string to extract stream text chunks
  const bytes = new Uint8Array(arrayBuffer);
  let text = '';

  // Scan for PDF stream chunks and text blocks
  let inStream = false;
  let streamBuffer = [];

  for (let i = 0; i < bytes.length; i++) {
    // Check for 'stream' keyword
    if (
      bytes[i] === 115 && bytes[i + 1] === 116 && bytes[i + 2] === 114 &&
      bytes[i + 3] === 101 && bytes[i + 4] === 97 && bytes[i + 5] === 109
    ) {
      inStream = true;
      i += 6;
      continue;
    }
    // Check for 'endstream'
    if (
      bytes[i] === 101 && bytes[i + 1] === 110 && bytes[i + 2] === 100 &&
      bytes[i + 3] === 115 && bytes[i + 4] === 116 && bytes[i + 5] === 114
    ) {
      inStream = false;
      i += 8;
      continue;
    }

    if (!inStream) {
      // Collect readable ASCII strings
      const b = bytes[i];
      if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
        text += String.fromCharCode(b);
      }
    }
  }

  // Clean and parse the extracted text
  const cleanText = text
    .replace(/\/[A-Za-z0-9]+/g, ' ') // Remove PDF operators
    .replace(/obj|endobj|xref|trailer|startxref/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract candidate intelligence records (Phones, IMEIs, Names)
  const lines = cleanText.split(/[.;\n]/).map(s => s.trim()).filter(s => s.length > 5);
  const rows = [];
  const headerSet = new Set(['record', 'extractedData']);

  lines.slice(0, 100).forEach((l, idx) => {
    rows.push({
      record: idx + 1,
      extractedData: l.substring(0, 150),
    });
  });

  return {
    headers: Array.from(headerSet),
    rows,
    rawText: cleanText.substring(0, 2000),
  };
}

/**
 * Universal file parser dispatcher
 */
export async function parseInvestigationFile(file) {
  const format = detectFileFormat(file);

  if (format === 'CSV') {
    const text = await file.text();
    const parsed = parseCSV(text);
    return { format, ...parsed, filename: file.name, fileSize: file.size };
  }

  if (format === 'JSON') {
    const text = await file.text();
    const parsed = parseJSON(text);
    return { format, ...parsed, filename: file.name, fileSize: file.size };
  }

  if (format === 'XLSX' || format === 'XLS') {
    const buffer = await file.arrayBuffer();
    const parsed = parseExcel(buffer);
    return { format, ...parsed, filename: file.name, fileSize: file.size };
  }

  if (format === 'XML') {
    const text = await file.text();
    const parsed = parseXML(text);
    return { format, ...parsed, filename: file.name, fileSize: file.size };
  }

  if (format === 'TXT') {
    const text = await file.text();
    const parsed = parseTXT(text);
    return { format, ...parsed, filename: file.name, fileSize: file.size };
  }

  if (format === 'DOCX') {
    const buffer = await file.arrayBuffer();
    const parsed = await parseDOCX(buffer);
    return { format, ...parsed, filename: file.name, fileSize: file.size };
  }

  if (format === 'PDF') {
    const buffer = await file.arrayBuffer();
    const parsed = await parsePDF(buffer);
    return { format, ...parsed, filename: file.name, fileSize: file.size };
  }

  throw new Error(`Unsupported file format "${format}"`);
}

/**
 * Canonical Target Ingestion Fields for Mapping
 */
export const TARGET_FIELDS = [
  { value: 'entity.label', label: 'Entity Label / Name (e.g. Person, Suspect, Org)', category: 'Entity' },
  { value: 'entity.type', label: 'Entity Type (person, suspect, phone, vehicle, etc.)', category: 'Entity' },
  { value: 'entity.subType', label: 'Role / SubType (e.g. Kingpin, Courier)', category: 'Entity' },
  { value: 'entity.confidence', label: 'Confidence Score (0.0 to 1.0)', category: 'Entity' },
  { value: 'entity.attributes.phoneNumber', label: 'Phone Number', category: 'Entity Attributes' },
  { value: 'entity.attributes.imei', label: 'Hardware IMEI', category: 'Entity Attributes' },
  { value: 'entity.attributes.plate', label: 'Vehicle License Plate', category: 'Entity Attributes' },
  { value: 'entity.attributes.alias', label: 'Alias / Nickname', category: 'Entity Attributes' },
  { value: 'entity.attributes.riskLevel', label: 'Risk Level (CRITICAL, HIGH, etc.)', category: 'Entity Attributes' },
  { value: 'location.name', label: 'Location Name / Site', category: 'Location' },
  { value: 'location.city', label: 'City', category: 'Location' },
  { value: 'location.state', label: 'State / Province', category: 'Location' },
  { value: 'location.latitude', label: 'Latitude (-90 to 90)', category: 'Location' },
  { value: 'location.longitude', label: 'Longitude (-180 to 180)', category: 'Location' },
  { value: 'location.address', label: 'Full Physical Address', category: 'Location' },
  { value: 'event.title', label: 'Event Title', category: 'Timeline Event' },
  { value: 'event.eventType', label: 'Event Type (CALL, TRANSACTION, etc.)', category: 'Timeline Event' },
  { value: 'event.timestamp', label: 'Timestamp (ISO-8601)', category: 'Timeline Event' },
  { value: 'relationship.source', label: 'Relationship Source Entity ID / Name', category: 'Relationship' },
  { value: 'relationship.target', label: 'Relationship Target Entity ID / Name', category: 'Relationship' },
  { value: 'relationship.type', label: 'Relationship Type (COMMUNICATED_WITH, etc.)', category: 'Relationship' },
  { value: 'IGNORE', label: '— Ignore Column —', category: 'Ignore' },
];

/**
 * Intelligent field mapping suggestion engine
 */
export function suggestFieldMappings(headers = []) {
  const mapping = {};

  headers.forEach(h => {
    const clean = h.toLowerCase().trim().replace(/[_\-\s]+/g, '');

    if (['name', 'fullname', 'suspectname', 'personname', 'label', 'entityname', 'identifier'].includes(clean)) {
      mapping[h] = 'entity.label';
    } else if (['type', 'entitytype', 'category', 'classification'].includes(clean)) {
      mapping[h] = 'entity.type';
    } else if (['subtype', 'role', 'designation', 'position'].includes(clean)) {
      mapping[h] = 'entity.subType';
    } else if (['phone', 'mobile', 'cell', 'phonenumber', 'contact', 'msisdn'].includes(clean)) {
      mapping[h] = 'entity.attributes.phoneNumber';
    } else if (['imei', 'hardwareid', 'deviceid', 'imeino', 'hardwareimei', 'imeinumber'].includes(clean)) {
      mapping[h] = 'entity.attributes.imei';
    } else if (['plate', 'vehiclenumber', 'plateno', 'regno', 'registration', 'vehicleplate', 'numberplate'].includes(clean)) {
      mapping[h] = 'entity.attributes.plate';
    } else if (['alias', 'nickname', 'callsign', 'knownas'].includes(clean)) {
      mapping[h] = 'entity.attributes.alias';
    } else if (['lat', 'latitude', 'gpslat', 'gpslatitude'].includes(clean)) {
      mapping[h] = 'location.latitude';
    } else if (['lng', 'lon', 'longitude', 'gpslon', 'gpslng', 'gpslongitude'].includes(clean)) {
      mapping[h] = 'location.longitude';
    } else if (['city', 'town', 'district'].includes(clean)) {
      mapping[h] = 'location.city';
    } else if (['address', 'location', 'site', 'place'].includes(clean)) {
      mapping[h] = 'location.address';
    } else if (['timestamp', 'date', 'datetime', 'time', 'eventdate', 'calldate', 'calldatetime'].includes(clean)) {
      mapping[h] = 'event.timestamp';
    } else if (['event', 'eventtitle', 'title', 'incident', 'message', 'log', 'entry', 'description'].includes(clean)) {
      mapping[h] = 'event.title';
    } else if (['confidence', 'score', 'prob'].includes(clean)) {
      mapping[h] = 'entity.confidence';
    } else if (['risk', 'risklevel', 'threat', 'threatlevel'].includes(clean)) {
      mapping[h] = 'entity.attributes.riskLevel';
    } else if (['source', 'from', 'caller', 'sourceentity', 'sourcemsisdn', 'callermsisdn', 'callerphone'].includes(clean)) {
      mapping[h] = 'relationship.source';
    } else if (['target', 'to', 'callee', 'targetentity', 'receiver', 'targetmsisdn', 'calleemsisdn', 'receivermsisdn', 'calleephone'].includes(clean)) {
      mapping[h] = 'relationship.target';
    } else if (['reltype', 'relation', 'linktype', 'relationshiptype'].includes(clean)) {
      mapping[h] = 'relationship.type';
    } else {
      mapping[h] = 'IGNORE';
    }
  });

  return mapping;
}

/**
 * Transforms parsed file rows according to field mapping into canonical Ingestion Payload
 */
export function buildIngestionPayloadFromMapping({ rows, mapping, caseId = 'CASE-2024-VORTEX', filename = 'imported_file' }) {
  const entities = [];
  const locations = [];
  const events = [];
  const relationships = [];

  rows.forEach((row, idx) => {
    const entAttrs = {};
    let entLabel = null;
    let entType = ENTITY_TYPES.PERSON;
    let entSubType = null;
    let entConfidence = 1.0;

    let locCity = null;
    let locState = null;
    let locLat = null;
    let locLng = null;
    let locAddress = null;

    let evTitle = null;
    let evType = 'CASE_EVENT';
    let evTimestamp = null;

    let relSource = null;
    let relTarget = null;
    let relType = RELATIONSHIP_TYPES.COMMUNICATED_WITH;

    Object.entries(mapping).forEach(([sourceCol, targetField]) => {
      const val = row[sourceCol];
      if (val === undefined || val === null || val === '' || targetField === 'IGNORE') return;

      if (targetField === 'entity.label') entLabel = String(val).trim();
      else if (targetField === 'entity.type') entType = String(val).toLowerCase().trim();
      else if (targetField === 'entity.subType') entSubType = String(val).trim();
      else if (targetField === 'entity.confidence') entConfidence = parseFloat(val) || 1.0;
      else if (targetField === 'entity.attributes.phoneNumber') entAttrs.phoneNumber = String(val).trim();
      else if (targetField === 'entity.attributes.imei') entAttrs.imei = String(val).trim();
      else if (targetField === 'entity.attributes.plate') entAttrs.plate = String(val).trim();
      else if (targetField === 'entity.attributes.alias') entAttrs.alias = String(val).trim();
      else if (targetField === 'entity.attributes.riskLevel') entAttrs.riskLevel = String(val).trim();

      else if (targetField === 'location.city') locCity = String(val).trim();
      else if (targetField === 'location.state') locState = String(val).trim();
      else if (targetField === 'location.latitude') locLat = parseFloat(val);
      else if (targetField === 'location.longitude') locLng = parseFloat(val);
      else if (targetField === 'location.address') locAddress = String(val).trim();

      else if (targetField === 'event.title') evTitle = String(val).trim();
      else if (targetField === 'event.eventType') evType = String(val).toUpperCase().trim();
      else if (targetField === 'event.timestamp') evTimestamp = String(val).trim();

      else if (targetField === 'relationship.source') relSource = String(val).trim();
      else if (targetField === 'relationship.target') relTarget = String(val).trim();
      else if (targetField === 'relationship.type') relType = String(val).toUpperCase().trim();
    });

    // 1. Entity Record
    if (entLabel) {
      entities.push({
        id: `IMP-ENT-${idx + 1}`,
        type: Object.values(ENTITY_TYPES).includes(entType) ? entType : ENTITY_TYPES.PERSON,
        label: entLabel,
        subType: entSubType,
        caseIds: [caseId],
        confidence: entConfidence,
        attributes: entAttrs,
        source: `IMPORTED_FILE: ${filename}`,
      });
    }

    // 2. Location Record
    if (locLat !== null && locLng !== null && !isNaN(locLat) && !isNaN(locLng)) {
      locations.push({
        id: `IMP-LOC-${idx + 1}`,
        name: locAddress || `${locCity || 'Site'}, India`,
        city: locCity || 'Investigative Hub',
        state: locState || '',
        latitude: locLat,
        longitude: locLng,
        address: locAddress || '',
        caseId,
        source: `IMPORTED_FILE: ${filename}`,
        confidence: 0.95,
      });
    }

    // 3. Event Record
    if (evTimestamp) {
      events.push({
        id: `IMP-EVT-${idx + 1}`,
        title: evTitle || `Intelligence Event ${idx + 1}`,
        eventType: evType,
        timestamp: evTimestamp,
        caseId,
        severity: 'MEDIUM',
      });
    }

    // 4. Relationship Record
    if (relSource && relTarget) {
      // Auto-register source and target entities if not already explicitly mapped
      if (!entities.some(e => e.id === relSource || e.label === relSource)) {
        const isPhone = /^\+?\d[\d\s\-_]{6,16}\d$/.test(relSource.trim());
        entities.push({
          id: relSource,
          type: isPhone ? ENTITY_TYPES.PHONE : ENTITY_TYPES.PERSON,
          label: relSource,
          caseIds: [caseId],
          confidence: 0.9,
          attributes: isPhone ? { phoneNumber: relSource } : {},
          source: `IMPORTED_FILE: ${filename}`,
        });
      }
      if (!entities.some(e => e.id === relTarget || e.label === relTarget)) {
        const isPhone = /^\+?\d[\d\s\-_]{6,16}\d$/.test(relTarget.trim());
        entities.push({
          id: relTarget,
          type: isPhone ? ENTITY_TYPES.PHONE : ENTITY_TYPES.PERSON,
          label: relTarget,
          caseIds: [caseId],
          confidence: 0.9,
          attributes: isPhone ? { phoneNumber: relTarget } : {},
          source: `IMPORTED_FILE: ${filename}`,
        });
      }

      relationships.push({
        id: `IMP-REL-${idx + 1}`,
        source: relSource,
        target: relTarget,
        type: Object.values(RELATIONSHIP_TYPES).includes(relType) ? relType : RELATIONSHIP_TYPES.COMMUNICATED_WITH,
        caseIds: [caseId],
        confidence: 0.90,
      });
    }
  });

  return {
    source: 'file',
    caseId,
    entities,
    relationships,
    locations,
    events,
    evidence: [],
    metadata: {
      filename,
      importedAt: new Date().toISOString(),
      rowCount: rows.length,
    },
  };
}
