import fs from 'fs';
import pdfParse from 'pdf-parse';
import { extractAadhaarDetails } from './utils/ocr.js';

const content = 'BT\n/F1 12 Tf\n72 712 Td\n(Government of India) Tj\n0 -14 Td\n(Unique Identification Authority of India) Tj\n0 -14 Td\n(Manjunath H Kyadagi) Tj\n0 -14 Td\n(DOB: 01/01/1990) Tj\n0 -14 Td\n(Male) Tj\n0 -14 Td\n(8991 8656 4762) Tj\nET';

const pdf = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj
4 0 obj <</Length ${content.length}>> stream
${content}
endstream endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000111 00000 n 
0000000238 00000 n 
0000000300 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
385
%%EOF`;

fs.writeFileSync('./uploads/test_aadhaar.pdf', Buffer.from(pdf));
const buffer = fs.readFileSync('./uploads/test_aadhaar.pdf');
const data = await pdfParse(buffer);
console.log('Parsed text:', JSON.stringify(data.text));
console.log('Extracted details:', extractAadhaarDetails(data.text));
