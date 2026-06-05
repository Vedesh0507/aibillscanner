import { GoogleGenerativeAI } from '@google/generative-ai';
import Tesseract from 'tesseract.js';
import { CATEGORIES } from '../models/Expense.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');

// Helper for local regex-based parsing when AI fails/quota is exceeded
export function parseTextLocally(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  let vendor = 'Unknown Vendor';
  if (lines.length > 0) {
    const ignoreKeywords = ['tax', 'invoice', 'receipt', 'bill', 'cash', 'date', 'cashier', 'welcome', 'phone', 'tel', 'gstin', 'pan', 'gst', 'terminal', 'card'];
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const lineLower = lines[i].toLowerCase();
      if (
        !ignoreKeywords.some(kw => lineLower.includes(kw)) && 
        lines[i].length > 3 && 
        lines[i].length < 40 &&
        !/\d/.test(lines[i]) // vendor name usually doesn't have numbers
      ) {
        vendor = lines[i];
        break;
      }
    }
  }

  let amount = 0;
  const amountRegexes = [
    /(?:total|grand\s*total|net\s*payable|amount|net\s*amt|subtotal|cash|card|due|paid|rupees|rs\.?)\s*(?:rs\.?|inr|₹)?\s*[:\-\=\s]*\s*([0-9,]+\.[0-9]{2})/i,
    /(?:total|grand\s*total|net\s*payable|amount|net\s*amt|subtotal|cash|card|due|paid|rupees|rs\.?)\s*(?:rs\.?|inr|₹)?\s*[:\-\=\s]*\s*([0-9,]+)/i,
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

  let dateStr = new Date().toISOString().split('T')[0];
  const dateRegexes = [
    /(\d{4})[-/](\d{2})[-/](\d{2})/,
    /(\d{2})[-/](\d{2})[-/](\d{4})/,
    /(\d{2})[-/](\d{2})[-/](\d{2})/
  ];

  for (const line of lines) {
    let matched = false;
    for (const regex of dateRegexes) {
      const match = line.match(regex);
      if (match) {
        if (match[1].length === 4) {
          dateStr = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else {
          let year = match[3];
          if (year.length === 2) year = `20${year}`;
          dateStr = `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        }
        matched = true;
        break;
      }
    }
    if (matched) break;
  }

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      dateStr = new Date().toISOString().split('T')[0];
    }
  } catch (e) {
    dateStr = new Date().toISOString().split('T')[0];
  }

  const textLower = text.toLowerCase();
  let category = 'Miscellaneous';
  let description = 'Scanned receipt';

  const rules = [
    {
      category: 'Food & Meals',
      keywords: ['restaurant', 'hotel', 'food', 'meal', 'cafe', 'canteen', 'lunch', 'dinner', 'breakfast', 'tea', 'coffee', 'water', 'roti', 'rice', 'chicken', 'paneer', 'veg', 'bill', 'beverage', 'bar', 'whisky', 'beer', 'aerated'],
      desc: 'Meals and refreshments'
    },
    {
      category: 'Petrol/Fuel',
      keywords: ['fuel', 'petrol', 'diesel', 'cng', 'speed', 'power', 'hassan', 'service station', 'filling', 'indianoil', 'iocl', 'hpcl', 'bpcl', 'shell'],
      desc: 'Fuel for transit'
    },
    {
      category: 'Train Travel',
      keywords: ['train', 'railway', 'irctc', 'pnr', 'ticket', 'berth', 'sleeper', 'ac 3tier', 'station'],
      desc: 'Train ticket charges'
    },
    {
      category: 'Bus Travel',
      keywords: ['bus', 'travels', 'ksrtc', 'redbus', 'conductor', 'ticket', 'seat'],
      desc: 'Bus travel ticket'
    },
    {
      category: 'Hotel/Accommodation',
      keywords: ['lodge', 'stay', 'room', 'inn', 'resort', 'checkout', 'night', 'booking'],
      desc: 'Hotel accommodation stay'
    },
    {
      category: 'Parking Charges',
      keywords: ['parking', 'toll', 'plaza', 'fastag', 'entry ticket', 'vehicle'],
      desc: 'Parking / Toll charges'
    },
    {
      category: 'Medical Supply Delivery',
      keywords: ['medical', 'medicine', 'pharma', 'health', 'clinic', 'supply', 'delivery', 'distributor', 'surgical', 'syringes', 'tablets'],
      desc: 'Medical supply delivery'
    }
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => textLower.includes(kw))) {
      category = rule.category;
      description = rule.desc;
      break;
    }
  }

  if (!vendor || vendor === 'Unknown Vendor') {
    vendor = lines[0] || 'Receipt Vendor';
  }

  return {
    amount: parseFloat(amount) || 0,
    date: dateStr,
    vendor,
    category,
    description: `${description} at ${vendor}`,
    location: ''
  };
}

/**
 * Scan receipt: runs local OCR via Tesseract.js, then optionally cleans up using Gemini
 * Falls back to local regex extraction if Gemini quota is reached.
 */
export async function scanReceipt(imageBuffer, mimeType) {
  let ocrText = '';
  
  // 1. Perform OCR locally using Tesseract.js
  try {
    console.log('📖 Running local OCR via Tesseract.js...');
    const result = await Tesseract.recognize(imageBuffer, 'eng');
    ocrText = result.data.text;
    console.log('✅ Local OCR completed. Text length:', ocrText.length);
  } catch (ocrError) {
    console.error('❌ Tesseract OCR failed:', ocrError);
    throw new Error(`OCR processing failed locally: ${ocrError.message}`);
  }

  if (!ocrText || ocrText.trim().length === 0) {
    throw new Error('No text could be extracted from the receipt image.');
  }

  const categoriesList = CATEGORIES.join(', ');

  // 2. Try to clean up and categorize with Gemini
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('your_gemini') || apiKey === 'dummy_key') {
      throw new Error('Invalid or missing Gemini API Key.');
    }

    console.log('✨ Sending text to Gemini AI for cleanup...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert receipt parser. Analyze this raw text extracted from a medical sales agent's receipt, fix spelling/OCR errors, and extract structured JSON matching this schema:

{
  "amount": <number - total amount paid in INR. Do not include sub-totals>,
  "date": "<string - ISO 8601 YYYY-MM-DD. If none found, use today's date>",
  "vendor": "<string - shop/company/vendor name>",
  "category": "<string - must be exactly one of: ${categoriesList}>",
  "description": "<string - a brief 5-15 word description of what was purchased>",
  "location": "<string - city or area if found, otherwise empty>"
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
      note: friendlyNote
    };
  }
}
