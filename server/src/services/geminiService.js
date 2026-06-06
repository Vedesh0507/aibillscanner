import { GoogleGenerativeAI } from '@google/generative-ai';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { CATEGORIES } from '../models/Expense.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');

/**
 * Advanced local regex-based parsing when AI fails/quota is exceeded
 */
export function parseTextLocally(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const textLower = text.toLowerCase();
  
  // 1. Identify Category (Requirement 7)
  let category = 'Miscellaneous';
  let defaultDesc = 'Scanned expense';
  
  if (
    textLower.includes('restaurant') || textLower.includes('cafe') || 
    textLower.includes('food') || textLower.includes('kitchen') || 
    textLower.includes('canteen') || textLower.includes('meals') ||
    textLower.includes('roti') || textLower.includes('rice') ||
    textLower.includes('paneer') || textLower.includes('chicken') ||
    textLower.includes('dish') || textLower.includes('mutton') ||
    textLower.includes('briyani') || textLower.includes('biryani')
  ) {
    category = 'Food & Meals';
    defaultDesc = 'Restaurant meal expense';
  } else if (
    textLower.includes('petrol') || textLower.includes('diesel') || 
    textLower.includes('fuel') || textLower.includes('filling') || 
    textLower.includes('indianoil') || textLower.includes('iocl') || 
    textLower.includes('hpcl') || textLower.includes('bpcl') || 
    textLower.includes('station') || textLower.includes('pump') ||
    textLower.includes('speed') || textLower.includes('power')
  ) {
    category = 'Petrol/Fuel';
    defaultDesc = 'Fuel purchase for transit';
  } else if (
    textLower.includes('train') || textLower.includes('railway') || 
    textLower.includes('irctc') || textLower.includes('pnr') ||
    textLower.includes('sleeper') || textLower.includes('ticket')
  ) {
    category = 'Train Travel';
    defaultDesc = 'Train ticket expense';
  } else if (
    textLower.includes('bus') || textLower.includes('ksrtc') || 
    textLower.includes('travels') || textLower.includes('conductor') ||
    textLower.includes('stage')
  ) {
    category = 'Bus Travel';
    defaultDesc = 'Bus travel ticket';
  } else if (
    textLower.includes('lodge') || textLower.includes('stay') || 
    textLower.includes('inn') || textLower.includes('accommodation') ||
    textLower.includes('checkout') || textLower.includes('room') ||
    textLower.includes('tariff')
  ) {
    category = 'Hotel/Accommodation';
    defaultDesc = 'Hotel accommodation expense';
  } else if (
    textLower.includes('parking') || textLower.includes('toll') || 
    textLower.includes('plaza') || textLower.includes('fastag') ||
    textLower.includes('vehicle')
  ) {
    category = 'Parking Charges';
    defaultDesc = 'Parking / Toll charges';
  } else if (
    textLower.includes('medical') || textLower.includes('medicine') || 
    textLower.includes('pharma') || textLower.includes('chemist') ||
    textLower.includes('surgical') || textLower.includes('tablets') ||
    textLower.includes('syringes') || textLower.includes('ointment')
  ) {
    category = 'Medical Supply Delivery';
    defaultDesc = 'Medical supply expense';
  }

  // 2. Extract Vendor Name from header section (Requirement 1)
  let vendor = 'Unknown Vendor';
  let addressLines = [];
  let foundVendor = false;
  
  const ignoreKeywords = ['tax', 'invoice', 'receipt', 'bill', 'cash', 'date', 'cashier', 'welcome', 'phone', 'tel', 'gstin', 'pan', 'gst', 'terminal', 'card', 'quick', 'mode', 'contact', 'token', 'order', 'powered', 'table'];

  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();
    
    // Ignore rows that are separators or too short/long
    if (
      line.length < 3 || 
      line.length > 50 ||
      ignoreKeywords.some(kw => lineLower.includes(kw)) ||
      /^\d+$/.test(line) ||
      /^[:\-\=\s\.\*\_]+$/.test(line)
    ) {
      continue;
    }
    
    if (!foundVendor) {
      // Clean up random OCR characters from header if any
      const cleaned = line.replace(/[^A-Za-z0-9\s\&]/g, '').trim();
      if (cleaned.length > 3) {
        vendor = cleaned;
        foundVendor = true;
        
        // Merge vendor qualifiers (e.g. "Flame Kitchen" + "Restaurant")
        if (i + 1 < lines.length) {
          const nextLine = lines[i+1];
          const nextLineLower = nextLine.toLowerCase();
          const mergeKeywords = ['restaurant', 'cafe', 'hotel', 'bazaar', 'pharma', 'medical', 'motors', 'station', 'fuels', 'travels', 'store', 'mart', 'supermarket', 'dhaba'];
          if (mergeKeywords.some(kw => nextLineLower.includes(kw)) && nextLine.length < 25) {
            vendor = `${vendor} ${nextLine.replace(/[^A-Za-z0-9\s\&]/g, '').trim()}`;
            i++; // Skip next line since it was merged
          }
        }
      }
    } else {
      // 3. Extract Location / Multiple Address Lines (Requirement 2 & 4)
      const addressKeywords = ['road', 'rd', 'street', 'st', 'nagar', 'city', 'district', 'karnataka', 'tamil nadu', 'tamilnadu', 'state', 'tenkasi', 'madurai', 'pin', 'near', 'opposite', 'opp', 'floor', 'block', 'building', 'bldg', 'lane', 'ln', 'cross'];
      const hasDigit = /\d/.test(line);
      const isAddress = addressKeywords.some(kw => lineLower.includes(kw)) || (hasDigit && line.includes(','));
      
      if (isAddress && addressLines.length < 4) {
        const cleanedAddr = line.replace(/^[,\-\s\.]+/, '').replace(/[,\-\s\.]+$/, '').trim();
        if (cleanedAddr.length > 3) {
          addressLines.push(cleanedAddr);
        }
      }
    }
  }
  
  const location = addressLines.join(', ');

  // 4. Extract Date: Written Month Name fallback (Requirement 4)
  let dateStr = new Date().toISOString().split('T')[0];
  const monthNamesPattern = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*';
  const writtenDateRegex = new RegExp(`(\\d{1,2})\\s+(${monthNamesPattern})\\s+(\\d{4})`, 'i');
  
  const numericDateRegexes = [
    /(\d{4})[-/](\d{2})[-/](\d{2})/,
    /(\d{2})[-/](\d{2})[-/](\d{4})/,
    /(\d{2})[-/](\d{2})[-/](\d{2})/
  ];

  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  let foundDate = false;
  for (const line of lines) {
    const writtenMatch = line.match(writtenDateRegex);
    if (writtenMatch) {
      const day = writtenMatch[1].padStart(2, '0');
      const monthWord = writtenMatch[2].toLowerCase().substring(0, 3);
      const month = monthMap[monthWord] || '01';
      const year = writtenMatch[3];
      dateStr = `${year}-${month}-${day}`;
      foundDate = true;
      break;
    }
    
    for (const regex of numericDateRegexes) {
      const match = line.match(regex);
      if (match) {
        if (match[1].length === 4) {
          dateStr = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else {
          let year = match[3];
          if (year.length === 2) year = `20${year}`;
          dateStr = `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        }
        foundDate = true;
        break;
      }
    }
    if (foundDate) break;
  }

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      dateStr = new Date().toISOString().split('T')[0];
    }
  } catch (e) {
    dateStr = new Date().toISOString().split('T')[0];
  }

  // 5. Extract Amount:
  let amount = 0;
  const amountRegexes = [
    /(?:grand\s*total|net\s*payable|total|net\s*amt|subtotal|due|paid|amount|cash|card)\s*[:\-\=\s]*\s*(?:rs\.?|inr|₹)?\s*([0-9,]+\.[0-9]{2})/i,
    /(?:grand\s*total|net\s*payable|total|net\s*amt|subtotal|due|paid|amount|cash|card)\s*[:\-\=\s]*\s*(?:rs\.?|inr|₹)?\s*([0-9,]+)/i,
    /([0-9,]+\.[0-9]{2})/
  ];

  let foundAmount = false;
  for (const line of lines) {
    for (const regex of amountRegexes) {
      const match = line.match(regex);
      if (match) {
        const parsed = parseFloat(match[1].replace(/,/g, ''));
        if (parsed > amount) {
          amount = parsed;
          foundAmount = true;
        }
      }
    }
  }
  
  if (!foundAmount) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const match = lines[i].match(/([0-9]+(?:\.[0-9]{2})?)/);
      if (match) {
        const parsed = parseFloat(match[1]);
        if (parsed > 0 && parsed < 100000) {
          amount = parsed;
          break;
        }
      }
    }
  }

  // 6. Extract Purchased Items for Description (Requirement 3)
  let items = [];
  const itemPattern = /^(?:\d+[\.\-\s]+)?([A-Za-z\s\&]{3,25})\s+(\d+)\s+(\d+(?:\.\d{2})?)\s+(\d+(?:\.\d{2})?)/;
  
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (match) {
      const itemName = match[1].trim();
      if (itemName.toLowerCase() !== 'item' && itemName.toLowerCase() !== 'qty' && itemName.toLowerCase() !== 'rate' && itemName.toLowerCase() !== 'total') {
        items.push(itemName);
      }
    }
  }

  if (items.length === 0) {
    let tableStarted = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      if (lineLower.includes('item') || lineLower.includes('qty') || lineLower.includes('rate') || line.includes('---') || line.includes('===')) {
        tableStarted = true;
        continue;
      }
      if (tableStarted && (lineLower.includes('total') || lineLower.includes('subtotal') || line.includes('---') || line.includes('==='))) {
        break; 
      }
      if (tableStarted) {
        const wordsMatch = line.match(/^[0-9\.\-\s]*([A-Za-z\s\&]{3,20})/);
        if (wordsMatch) {
          const name = wordsMatch[1].trim();
          if (name.length > 2 && !['total', 'qty', 'rate', 'grand', 'amount', 'tax', 'cash', 'card', 'change', 'rupees', 'rs'].includes(name.toLowerCase())) {
            items.push(name);
          }
        }
      }
    }
  }

  let description = defaultDesc;
  if (items.length > 0) {
    const itemsList = items.join(', ');
    if (category === 'Food & Meals') {
      description = `Food purchase including ${itemsList}.`;
    } else if (category === 'Medical Supply Delivery') {
      description = `Medical supply including ${itemsList}.`;
    } else {
      description = `Purchase including ${itemsList}.`;
    }
  } else {
    // If item names are unavailable, use vendor name fallback
    if (category === 'Food & Meals' && vendor !== 'Unknown Vendor') {
      description = `Restaurant meal expense at ${vendor}.`;
    } else if (category === 'Petrol/Fuel' && vendor !== 'Unknown Vendor') {
      description = `Fuel expense at ${vendor}.`;
    } else if (vendor !== 'Unknown Vendor') {
      description = `Expense at ${vendor}.`;
    }
  }

  return {
    amount: parseFloat(amount) || 0,
    date: dateStr,
    vendor,
    category,
    description,
    location
  };
}

/**
 * Scan receipt: runs image preprocessing using sharp, runs local Tesseract.js OCR,
 * then optionally cleans up using Gemini. Falls back to local regex extraction if Gemini fails.
 */
export async function scanReceipt(imageBuffer, mimeType) {
  let processedBuffer = imageBuffer;
  
  // 6. Preprocessing (Grayscale, Normalize Contrast, Sharpen) (Requirement 6)
  if (mimeType && mimeType.startsWith('image/')) {
    try {
      console.log('🖼️ Preprocessing image using sharp...');
      processedBuffer = await sharp(imageBuffer)
        .grayscale()
        .normalize() // stretches contrast
        .sharpen({ sigma: 1.2 }) // sharpens text edges
        .toBuffer();
      console.log('✅ Image preprocessing completed.');
    } catch (preprocessErr) {
      console.warn('⚠️ Image preprocessing failed, using raw buffer:', preprocessErr.message);
      processedBuffer = imageBuffer;
    }
  }

  let ocrText = '';
  let confidence = 0;
  
  // 1. Perform OCR locally using Tesseract.js
  try {
    console.log('📖 Running local OCR via Tesseract.js...');
    const result = await Tesseract.recognize(processedBuffer, 'eng');
    ocrText = result.data.text;
    confidence = result.data.confidence || 0;
    console.log(`✅ Local OCR completed. Text length: ${ocrText.length}, Confidence: ${confidence}%`);
  } catch (ocrError) {
    console.error('❌ Tesseract OCR failed:', ocrError);
    throw new Error(`OCR processing failed locally: ${ocrError.message}`);
  }

  if (!ocrText || ocrText.trim().length === 0) {
    throw new Error('No text could be extracted from the receipt image.');
  }

  const categoriesList = CATEGORIES.join(', ');

  // 2. Try to clean up and structure with Gemini (Requirement 2)
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('your_gemini') || apiKey === 'dummy_key') {
      throw new Error('Invalid or missing Gemini API Key.');
    }

    console.log('✨ Sending text to Gemini AI for cleanup...');
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const prompt = `You are an expert receipt parser. Analyze this raw text extracted from a medical sales agent's receipt, fix spelling/OCR errors, and extract structured JSON matching this schema:

{
  "amount": <number - total amount paid in INR. Do not include sub-totals>,
  "date": "<string - ISO 8601 YYYY-MM-DD. If none found, use today's date>",
  "vendor": "<string - shop/company/vendor name>",
  "category": "<string - must be exactly one of: ${categoriesList}>",
  "description": "<string - a brief 5-15 word description of what was purchased>",
  "location": "<string - city, area, or address details found on receipt>"
}

Raw OCR Text:
"""
${ocrText}
"""

IMPORTANT RULES:
1. Return ONLY the JSON object, no markdown code blocks, no backticks, no extra text.
2. The category MUST match one of the listed categories exactly.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Clean up code blocks if present
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    const extractedData = JSON.parse(text);

    return {
      amount: parseFloat(extractedData.amount) || 0,
      date: extractedData.date || new Date().toISOString().split('T')[0],
      vendor: extractedData.vendor || 'Unknown Vendor',
      category: CATEGORIES.includes(extractedData.category) ? extractedData.category : 'Miscellaneous',
      description: extractedData.description || 'Scanned expense',
      location: extractedData.location || '',
      confidence,
      ocrText,
      note: ''
    };

  } catch (aiError) {
    console.warn('⚠️ Gemini AI classification failed. Falling back to local OCR parsing:', aiError.message);
    
    let friendlyNote = 'AI quota exceeded. Using local OCR instead.';
    if (aiError.message.includes('429') || aiError.message.toLowerCase().includes('quota') || aiError.message.toLowerCase().includes('limit')) {
      friendlyNote = 'AI quota exceeded. Using local OCR instead.';
    } else if (aiError.message.toLowerCase().includes('api key') || aiError.message.toLowerCase().includes('key')) {
      friendlyNote = 'Gemini API key is invalid. Using local OCR instead.';
    } else {
      friendlyNote = 'AI classification unavailable. Using local OCR instead.';
    }

    const localData = parseTextLocally(ocrText);
    
    return {
      ...localData,
      confidence,
      ocrText,
      note: friendlyNote
    };
  }
}
