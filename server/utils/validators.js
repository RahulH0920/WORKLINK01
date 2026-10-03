/* ═══════════════════════════════════════════════════════════════════════════
   Document Validators — Local validation for Aadhaar & PAN
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * ── AADHAAR VALIDATION (Verhoeff Algorithm) ──
 *
 * How it works:
 *   Aadhaar is a 12-digit number where the LAST digit is a checksum.
 *   The Verhoeff algorithm uses three mathematical tables:
 *
 *   1. MULTIPLICATION TABLE (d) — A special non-commutative multiplication
 *   2. PERMUTATION TABLE (p) — Scrambles digit positions to catch transpositions
 *   3. INVERSE TABLE (inv) — Used to compute the final check digit
 *
 *   Process:
 *   - Take all 12 digits of the Aadhaar number
 *   - Process each digit from RIGHT to LEFT through the tables
 *   - If the final accumulated value is 0, the number is VALID
 *
 *   This catches:
 *   ✓ ALL single-digit substitution errors (typing 3 instead of 8)
 *   ✓ ALL adjacent transposition errors (typing 83 instead of 38)
 *   ✓ Most twin errors, jump transpositions, and phonetic errors
 *
 *   Note: This validates the NUMBER FORMAT — it does NOT confirm the number
 *   is actually registered in UIDAI's database. For that, you need a paid API
 *   (Cashfree / Surepass). See routes/verify.js for the placeholder.
 */

// Verhoeff multiplication table
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

// Verhoeff permutation table
const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

// Verhoeff inverse table
const inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validate an Aadhaar number using the Verhoeff checksum algorithm.
 * @param {string} aadhaarNumber - The 12-digit Aadhaar number
 * @returns {{ valid: boolean, message: string }}
 */
export function validateAadhaar(aadhaarNumber) {
  // Remove all spaces and hyphens
  const cleaned = aadhaarNumber.replace(/[\s-]/g, '');

  // Basic format checks
  if (!/^\d{12}$/.test(cleaned)) {
    return { valid: false, message: 'Aadhaar must be exactly 12 digits' };
  }

  // Aadhaar cannot start with 0 or 1
  if (cleaned[0] === '0' || cleaned[0] === '1') {
    return { valid: false, message: 'Aadhaar number cannot start with 0 or 1' };
  }

  // Run Verhoeff checksum
  let c = 0;
  const digits = cleaned.split('').reverse().map(Number);

  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]];
  }

  if (c !== 0) {
    return { valid: false, message: 'Invalid Aadhaar number — checksum failed' };
  }

  return {
    valid: true,
    message: 'Aadhaar number is structurally valid',
    masked: `XXXX XXXX ${cleaned.slice(-4)}`, // Masked for privacy
  };
}


/**
 * ── PAN VALIDATION ──
 *
 * PAN (Permanent Account Number) format: ABCDE1234F
 *
 *   Position 1-3: Three uppercase letters (AAA - ZZZ)
 *   Position 4:   Entity type letter:
 *                   A = Association of Persons (AOP)
 *                   B = Body of Individuals (BOI)
 *                   C = Company
 *                   F = Firm
 *                   G = Government
 *                   H = Hindu Undivided Family (HUF)
 *                   J = Artificial Juridical Person
 *                   L = Local Authority
 *                   P = Individual / Person  ← most common
 *                   T = Trust
 *   Position 5:   First letter of last name (for individuals)
 *   Position 6-9: Four sequential digits (0001 - 9999)
 *   Position 10:  Check letter (A-Z)
 *
 *   Example: ABCPD1234E
 *            ^^^ = Random letters
 *              ^ = P (Person)
 *               ^ = First letter of surname (e.g., "D" for "Das")
 *                ^^^^ = Sequential number
 *                    ^ = Check letter
 */

const ENTITY_TYPES = {
  A: 'Association of Persons',
  B: 'Body of Individuals',
  C: 'Company',
  F: 'Firm',
  G: 'Government',
  H: 'Hindu Undivided Family',
  J: 'Artificial Juridical Person',
  L: 'Local Authority',
  P: 'Individual (Person)',
  T: 'Trust',
};

/**
 * Validate a PAN number.
 * @param {string} panNumber - The 10-character PAN string
 * @returns {{ valid: boolean, message: string, entityType?: string }}
 */
export function validatePAN(panNumber) {
  const cleaned = panNumber.replace(/\s/g, '').toUpperCase();

  // Basic length check
  if (cleaned.length !== 10) {
    return { valid: false, message: 'PAN must be exactly 10 characters' };
  }

  // Full regex: [A-Z]{3}[ABCFGHJLPT][A-Z][0-9]{4}[A-Z]
  const panRegex = /^[A-Z]{3}[ABCFGHJLPT][A-Z]\d{4}[A-Z]$/;

  if (!panRegex.test(cleaned)) {
    // More specific error messages
    if (!/^[A-Z]{3}/.test(cleaned)) {
      return { valid: false, message: 'First 3 characters must be letters (A-Z)' };
    }
    if (!ENTITY_TYPES[cleaned[3]]) {
      return { valid: false, message: `4th character "${cleaned[3]}" is not a valid entity type` };
    }
    if (!/[A-Z]/.test(cleaned[4])) {
      return { valid: false, message: '5th character must be a letter (A-Z)' };
    }
    if (!/\d{4}/.test(cleaned.slice(5, 9))) {
      return { valid: false, message: 'Characters 6-9 must be digits' };
    }
    if (!/[A-Z]/.test(cleaned[9])) {
      return { valid: false, message: 'Last character must be a letter (A-Z)' };
    }
    return { valid: false, message: 'Invalid PAN format' };
  }

  const entityCode = cleaned[3];

  return {
    valid: true,
    message: `Valid PAN format — ${ENTITY_TYPES[entityCode]}`,
    entityType: ENTITY_TYPES[entityCode],
    entityCode,
  };
}

/**
 * ── NAME MATCHING ALGORITHM ──
 * Flexible, token-based matching to compare names ignoring minor variations,
 * middle initials, and casing.
 */
export function matchNames(inputName, recordName) {
  if (!inputName || !recordName) return false;

  const clean = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

  const tokens1 = clean(inputName);
  const tokens2 = clean(recordName);

  if (tokens1.length === 0 || tokens2.length === 0) return false;

  if (tokens1.join(' ') === tokens2.join(' ')) return true;

  const sigTokens1 = tokens1.filter((t) => t.length > 1);
  const sigTokens2 = tokens2.filter((t) => t.length > 1);

  if (sigTokens1.length > 0 && sigTokens2.length > 0) {
    const matchCount1 = sigTokens1.filter((t) => sigTokens2.includes(t)).length;
    const matchCount2 = sigTokens2.filter((t) => sigTokens1.includes(t)).length;

    if (matchCount1 === sigTokens1.length || matchCount2 === sigTokens2.length) {
      return true;
    }

    const union = new Set([...sigTokens1, ...sigTokens2]);
    const intersection = sigTokens1.filter((t) => sigTokens2.includes(t));
    if (intersection.length / union.size >= 0.5) {
      return true;
    }
  }

  return tokens1.some((t) => tokens2.includes(t) && t.length > 2);
}

/**
 * ── DOCUMENT VERIFICATION AGAINST WORKLINK REFERENCE DATASET ──
 * Verifies that:
 * 1. Aadhaar number exists with docType: "aadhaar"
 * 2. PAN number exists with docType: "pan"
 * 3. Holder name matches reasonably
 */
export async function verifyDocumentsWithAtlasDataset({ aadhaarNumber, panNumber, holderName }) {
  const cleanAadhaar = (aadhaarNumber || '').replace(/[\s-]/g, '');
  const cleanPAN = (panNumber || '').replace(/\s/g, '').toUpperCase();
  const cleanName = (holderName || '').trim();

  if (!cleanAadhaar) {
    return {
      verified: false,
      message: 'Verification Not Confirmed: Aadhaar number is required.',
      details: { aadhaarFound: false, panFound: false, nameMatched: false },
    };
  }

  const { default: DocumentRecord } = await import('../models/DocumentRecord.js');

  // 1. Look up Aadhaar record in documentrecords collection
  const aadhaarRecord = await DocumentRecord.findOne({
    docType: 'aadhaar',
    docNumber: cleanAadhaar,
  });

  if (!aadhaarRecord) {
    return {
      verified: false,
      message: 'Verification Not Confirmed: Aadhaar number not found in the WorkLink reference dataset.',
      details: {
        aadhaarFound: false,
        panFound: false,
        nameMatched: false,
        aadhaarNumber: cleanAadhaar,
      },
    };
  }

  // 2. If PAN number is provided, look up and verify PAN record
  if (cleanPAN) {
    const panRecord = await DocumentRecord.findOne({
      docType: 'pan',
      docNumber: cleanPAN,
    });

    if (!panRecord) {
      return {
        verified: false,
        message: 'Verification Not Confirmed: PAN number not found in the WorkLink reference dataset.',
        details: {
          aadhaarFound: true,
          panFound: false,
          nameMatched: false,
          panNumber: cleanPAN,
          aadhaarHolder: aadhaarRecord.holderName,
        },
      };
    }

    // Compare holder name across input, Aadhaar, and PAN reference records
    const matchesAadhaarName = matchNames(cleanName, aadhaarRecord.holderName);
    const matchesPanName = matchNames(cleanName, panRecord.holderName);
    const matchesCrossDoc = matchNames(aadhaarRecord.holderName, panRecord.holderName);

    if (!matchesAadhaarName || !matchesPanName || !matchesCrossDoc) {
      return {
        verified: false,
        message: `Verification Not Confirmed: Name "${cleanName}" does not match the WorkLink reference dataset (Aadhaar: "${aadhaarRecord.holderName}", PAN: "${panRecord.holderName}").`,
        details: {
          aadhaarFound: true,
          panFound: true,
          nameMatched: false,
          inputName: cleanName,
          aadhaarHolder: aadhaarRecord.holderName,
          panHolder: panRecord.holderName,
        },
      };
    }

    return {
      verified: true,
      message: 'Verification Successful: Aadhaar, PAN, and identity details matched against the WorkLink reference dataset.',
      details: {
        aadhaarFound: true,
        panFound: true,
        nameMatched: true,
        aadhaarRecord: {
          id: aadhaarRecord._id,
          docNumber: aadhaarRecord.docNumber,
          holderName: aadhaarRecord.holderName,
        },
        panRecord: {
          id: panRecord._id,
          docNumber: panRecord.docNumber,
          holderName: panRecord.holderName,
        },
      },
    };
  }

  // 3. If PAN is NOT provided, verify name against Aadhaar reference record only
  const matchesAadhaarName = matchNames(cleanName, aadhaarRecord.holderName);

  if (!matchesAadhaarName) {
    return {
      verified: false,
      message: `Verification Not Confirmed: Name "${cleanName}" does not match the WorkLink reference dataset (Aadhaar: "${aadhaarRecord.holderName}").`,
      details: {
        aadhaarFound: true,
        panFound: false,
        nameMatched: false,
        inputName: cleanName,
        aadhaarHolder: aadhaarRecord.holderName,
      },
    };
  }

  return {
    verified: true,
    message: 'Verification Successful: Aadhaar and identity details matched against the WorkLink reference dataset.',
    details: {
      aadhaarFound: true,
      panFound: false,
      nameMatched: true,
      aadhaarRecord: {
        id: aadhaarRecord._id,
        docNumber: aadhaarRecord.docNumber,
        holderName: aadhaarRecord.holderName,
      },
      panRecord: null,
    },
  };
}

