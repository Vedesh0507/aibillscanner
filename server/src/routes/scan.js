import { Router } from 'express';
import upload from '../middleware/upload.js';
import { scanReceipt } from '../services/geminiService.js';
import { uploadImage } from '../services/cloudinaryService.js';

const router = Router();

// POST /api/scan — Upload bill and scan with AI
router.post('/', upload.single('receipt'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a receipt image.',
      });
    }

    // 1. Upload to Cloudinary
    const { url, publicId } = await uploadImage(req.file.buffer);

    // 2. Scan with Gemini AI
    const extractedData = await scanReceipt(req.file.buffer, req.file.mimetype);

    // 3. Return extracted data + receipt URL for user review
    res.json({
      success: true,
      data: {
        ...extractedData,
        receiptUrl: url,
        receiptPublicId: publicId,
        entryMethod: 'ai_scan',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
