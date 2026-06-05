import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORIES } from '../models/Expense.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Scan a receipt/bill image using Gemini AI and extract structured data.
 * @param {Buffer} imageBuffer - The image file buffer
 * @param {string} mimeType - The MIME type of the image (e.g., 'image/jpeg')
 * @returns {Object} Extracted expense data
 */
export async function scanReceipt(imageBuffer, mimeType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const imageBase64 = imageBuffer.toString('base64');

  const categoriesList = CATEGORIES.join(', ');

  const prompt = `You are an expert receipt/bill/invoice scanner for an Indian medical sales agent's expense tracking system.

Analyze this receipt/bill/invoice image and extract the following information as a JSON object:

{
  "amount": <number - the total amount paid, in Indian Rupees (₹). Extract only the final/total amount, not subtotals>,
  "date": "<string - the date of the transaction in ISO 8601 format (YYYY-MM-DD). If no date is visible, use today's date>",
  "vendor": "<string - the name of the shop, restaurant, hotel, gas station, or service provider>",
  "category": "<string - MUST be exactly one of: ${categoriesList}>",
  "description": "<string - a brief 5-15 word description of what was purchased or the purpose of the expense>",
  "location": "<string - city or area if visible on the receipt, otherwise empty string>"
}

IMPORTANT RULES:
1. Return ONLY the JSON object, no markdown formatting, no backticks, no extra text.
2. The "category" MUST be exactly one of the listed categories.
3. If the amount is in any other currency, convert approximately to INR.
4. If you cannot determine a field, make a reasonable guess based on context.
5. For "category", use context clues: restaurant/food items → "Food & Meals", petrol/diesel → "Petrol/Fuel", train tickets → "Train Travel", bus tickets → "Bus Travel", hotel/lodge → "Hotel/Accommodation", parking → "Parking Charges", medical supplies/delivery → "Medical Supply Delivery", anything else → "Miscellaneous".`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || 'image/jpeg',
        },
      },
    ]);

    const response = await result.response;
    let text = response.text().trim();

    // Clean up response — remove markdown code blocks if present
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    const extractedData = JSON.parse(text);

    // Validate and sanitize
    return {
      amount: parseFloat(extractedData.amount) || 0,
      date: extractedData.date || new Date().toISOString().split('T')[0],
      vendor: extractedData.vendor || 'Unknown Vendor',
      category: CATEGORIES.includes(extractedData.category)
        ? extractedData.category
        : 'Miscellaneous',
      description: extractedData.description || 'Scanned expense',
      location: extractedData.location || '',
    };
  } catch (error) {
    console.error('Gemini scan error:', error);
    throw new Error(`AI scanning failed: ${error.message}`);
  }
}
