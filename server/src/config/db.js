import mongoose from 'mongoose';

let isLocalFallback = false;

const connectDB = async () => {
  try {
    // 3 seconds timeout for dev startup selection
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    isLocalFallback = false;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.warn(`⚠️ Running in LOCAL JSON FILE FALLBACK mode. Database will be saved to server/expenses.json`);
    isLocalFallback = true;
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  if (!isLocalFallback) {
    console.log('⚠️  MongoDB disconnected');
  }
});

mongoose.connection.on('error', (err) => {
  if (!isLocalFallback) {
    console.error(`❌ MongoDB error: ${err}`);
  }
});

export { isLocalFallback };
export default connectDB;
