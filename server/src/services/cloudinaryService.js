import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../public/uploads');

const isCloudinaryConfigured = () => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;

  return (
    name &&
    name !== 'your_cloud_name' &&
    key &&
    key !== 'your_api_key' &&
    secret &&
    secret !== 'your_api_secret'
  );
};

/**
 * Upload an image buffer to Cloudinary (or local fallback).
 * @param {Buffer} buffer - The file buffer
 * @param {string} folder - Cloudinary folder name
 * @returns {Object} { url, publicId }
 */
export async function uploadImage(buffer, folder = 'expense_receipts') {
  if (!isCloudinaryConfigured()) {
    console.log('⚠️ Cloudinary not configured. Uploading receipt image locally to server/public/uploads.');
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`;
    const filePath = path.join(UPLOADS_DIR, filename);
    
    fs.writeFileSync(filePath, buffer);
    const port = process.env.PORT || 5000;
    
    return {
      url: `http://localhost:${port}/uploads/${filename}`,
      publicId: filename,
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
        transformation: [
          { width: 1200, crop: 'limit' }, // Limit max width to save storage
        ],
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary or local folder.
 * @param {string} publicId - The Cloudinary public ID or local filename
 */
export async function deleteImage(publicId) {
  if (!publicId) return;

  if (!isCloudinaryConfigured()) {
    const filePath = path.join(UPLOADS_DIR, publicId);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted local receipt: ${publicId}`);
      } catch (error) {
        console.error('Failed to delete local receipt file:', error.message);
      }
    }
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
    // Non-critical — don't throw
  }
}
