import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';

/**
 * ── LOCAL OCR EXTRACTION ENGINE ──
 * Extracts raw text from image files (.png, .jpg, .jpeg), PDF documents, and plain text files.
 */
export async function extractTextFromFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return '';
  }

  const ext = path.extname(filePath).toLowerCase();

  // If plain text file (.txt)
  if (ext === '.txt') {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      console.warn('Text file read error:', err.message);
    }
  }

  // If PDF file, parse text directly
  if (ext === '.pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      if (data && data.text && data.text.trim().length > 10) {
        return data.text;
      }
    } catch (err) {
      console.warn('PDF text parse fallback to OCR:', err.message);
    }
  }

  // Use local Tesseract.js engine on image files
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
      logger: () => {}, // silent in production
    });
    return text || '';
  } catch (err) {
    console.error('Tesseract OCR error:', err.message);
    return '';
  }
}

/**
 * ── AADHAAR CARD OCR PARSER ──
 * Extracts 12-digit Aadhaar number, holder name, DOB, and gender.
 */
export function extractAadhaarDetails(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { docNumber: '', holderName: '', dob: '', gender: '', rawText: '' };
  }

  const text = rawText.replace(/\r\n/g, '\n');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Extract 12-digit Aadhaar Number (XXXX XXXX XXXX or XXXXXXXXXXXX)
  let docNumber = '';
  const spacedMatch = text.match(/\b([2-9]\d{3})\s+(\d{4})\s+(\d{4})\b/);
  if (spacedMatch) {
    docNumber = `${spacedMatch[1]}${spacedMatch[2]}${spacedMatch[3]}`;
  } else {
    const contigMatch = text.match(/\b([2-9]\d{11})\b/);
    if (contigMatch) {
      docNumber = contigMatch[1];
    }
  }

  // 2. Extract Date of Birth
  let dob = '';
  const dobMatch = text.match(/\b(DOB|Year of Birth|YOB|DOB\/जन्म|जन्म तारीख)?\s*:?\s*(\d{2}[/-]\d{2}[/-]\d{4}|\d{4})\b/i);
  if (dobMatch) {
    dob = dobMatch[2];
  }

  // 3. Extract Gender
  let gender = '';
  const genderMatch = text.match(/\b(MALE|FEMALE|TRANSGENDER|पुरुष|महिला)\b/i);
  if (genderMatch) {
    const g = genderMatch[1].toUpperCase();
    gender = g === 'FEMALE' || g === 'महिला' ? 'Female' : 'Male';
  }

  // 4. Extract Holder Name
  // Filter out noise / standard header lines
  const blacklist = [
    'government of india',
    'unique identification authority of india',
    'identification authority',
    'authority of india',
    'uidai',
    'enrolment',
    'enrollment',
    'helpdesk',
    'mera aadhaar',
    'meri pehchan',
    'aadhaar',
    'father',
    'husband',
    'address',
    's/o',
    'd/o',
    'w/o',
    'c/o',
    'male',
    'female',
    'dob',
    'year of birth',
    'yob',
    'help',
    'signature',
    'valid',
    'invalid',
    'digitally signed',
    'download date',
    'issue date',
  ];

  let holderName = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Skip short lines, numeric lines, or blacklisted header lines
    if (line.length < 3 || /^\d+$/.test(line.replace(/\s/g, ''))) continue;
    if (blacklist.some((b) => lower.includes(b))) continue;

    // Check if line looks like a valid full name (letters, spaces, dots)
    const cleaned = line.replace(/[^a-zA-Z\s.]/g, '').trim();
    const words = cleaned.split(/\s+/).filter(Boolean);

    if (words.length >= 2 && words.every((w) => w.length >= 1) && cleaned.length >= 4) {
      holderName = cleaned;
      break;
    }
  }

  return {
    docNumber,
    holderName,
    dob,
    gender,
    rawText,
  };
}

/**
 * ── PAN CARD OCR PARSER ──
 * Extracts 10-character PAN number, holder name, and DOB.
 */
export function extractPANDetails(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { docNumber: '', holderName: '', dob: '', rawText: '' };
  }

  const text = rawText.replace(/\r\n/g, '\n');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Extract 10-char alphanumeric PAN number (ABCDE1234F)
  let docNumber = '';
  const panMatch = text.match(/\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/);
  if (panMatch) {
    docNumber = panMatch[1].toUpperCase();
  } else {
    // Check case-insensitive match
    const panMatchInsensitive = text.match(/\b([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})\b/);
    if (panMatchInsensitive) {
      docNumber = panMatchInsensitive[1].toUpperCase();
    }
  }

  // 2. Extract DOB
  let dob = '';
  const dobMatch = text.match(/\b(\d{2}[/-]\d{2}[/-]\d{4})\b/);
  if (dobMatch) {
    dob = dobMatch[1];
  }

  // 3. Extract Holder Name
  const blacklist = [
    'income tax department',
    'govt. of india',
    'govt of india',
    'government of india',
    'permanent account number card',
    'permanent account number',
    'account number',
    'father\'s name',
    'fathers name',
    'father name',
    'date of birth',
    'signature',
    'card',
    'india',
  ];

  let holderName = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (line.length < 3) continue;
    if (blacklist.some((b) => lower.includes(b))) continue;
    // Skip if line is the PAN number itself
    if (docNumber && line.toUpperCase().includes(docNumber)) continue;

    const cleaned = line.replace(/[^a-zA-Z\s.]/g, '').trim();
    const words = cleaned.split(/\s+/).filter(Boolean);

    if (words.length >= 2 && words.every((w) => w.length >= 1) && cleaned.length >= 4) {
      holderName = cleaned;
      break;
    }
  }

  return {
    docNumber,
    holderName,
    dob,
    rawText,
  };
}

/**
 * ── FULL DOCUMENT OCR PROCESSOR ──
 * Performs automated OCR text extraction on uploaded Aadhaar and PAN documents.
 */
export async function processUploadedDocumentsOCR({ aadhaarPath, panPath }) {
  const [aadhaarRawText, panRawText] = await Promise.all([
    aadhaarPath ? extractTextFromFile(aadhaarPath) : Promise.resolve(''),
    panPath ? extractTextFromFile(panPath) : Promise.resolve(''),
  ]);

  const aadhaarParsed = extractAadhaarDetails(aadhaarRawText);
  const panParsed = extractPANDetails(panRawText);

  return {
    aadhaar: {
      docNumber: aadhaarParsed.docNumber,
      holderName: aadhaarParsed.holderName,
      dob: aadhaarParsed.dob,
      gender: aadhaarParsed.gender,
      extracted: Boolean(aadhaarParsed.docNumber),
      rawText: aadhaarRawText,
    },
    pan: {
      docNumber: panParsed.docNumber,
      holderName: panParsed.holderName,
      dob: panParsed.dob,
      extracted: Boolean(panParsed.docNumber),
      rawText: panRawText,
    },
  };
}
