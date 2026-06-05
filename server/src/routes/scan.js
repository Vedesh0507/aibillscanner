import { Router } from 'express';
import upload from '../middleware/upload.js';
import { scanReceipt } from '../services/geminiService.js';
import { uploadImage } from '../services/cloudinaryService.js';

const router = Router();

// POST /api/scan — Upload bill and scan with local OCR / Gemini fallback
router.post('/', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a receipt image.',
      });
    }

    // 1. Upload to Cloudinary with fallback handling (don't fail the whole route if upload fails)
    let uploadResult = { url: '', publicId: '' };
    try {
      uploadResult = await uploadImage(req.file.buffer);
    } catch (uploadErr) {
      console.warn('⚠️ Cloudinary upload failed during receipt scan:', uploadErr.message);
      // We still continue to scan the image even if upload fails
    }

    // 2. Scan using local OCR (Tesseract.js) + optional Gemini classification
    let extractedData;
    try {
      extractedData = await scanReceipt(req.file.buffer, req.file.mimetype);
    } catch (scanErr) {
      console.error('❌ OCR/AI scanning failed:', scanErr);
      // Hard fallback: Return empty schema with local manual-entry warning
      extractedData = {
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        vendor: 'Unknown Vendor',
        category: 'Miscellaneous',
        description: 'Manual entry required',
        location: '',
        note: 'OCR engine error. Please enter details manually.'
      };
    }

    // 3. Return successfully extracted data (never 500)
    res.json({
      success: true,
      data: {
        ...extractedData,
        receiptUrl: uploadResult.url || '',
        receiptPublicId: uploadResult.publicId || '',
        entryMethod: 'ai_scan',
      },
    });

  } catch (error) {
    console.error('❌ Server error in scan route handler:', error);
    // Ultimate safety wrapper: Return success true but empty form data and clear note
    res.json({
      success: true,
      data: {
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        vendor: 'Unknown Vendor',
        category: 'Miscellaneous',
        description: 'System error processing receipt',
        location: '',
        receiptUrl: '',
        receiptPublicId: '',
        entryMethod: 'ai_scan',
        note: 'Could not process receipt image. Please enter details manually.'
      }
    });
  }
});

export default router;
