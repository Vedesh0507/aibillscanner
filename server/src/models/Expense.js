import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isLocalFallback } from '../config/db.js';

const CATEGORIES = [
  'Food & Meals',
  'Petrol/Fuel',
  'Train Travel',
  'Bus Travel',
  'Hotel/Accommodation',
  'Parking Charges',
  'Medical Supply Delivery',
  'Miscellaneous',
];

const expenseSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    date: {
      type: Date,
      required: [true, 'Expense date is required'],
      index: true,
    },
    category: {
      type: String,
      enum: {
        values: CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
      required: [true, 'Category is required'],
      index: true,
    },
    vendor: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    receiptPublicId: {
      type: String,
      default: '',
    },
    entryMethod: {
      type: String,
      enum: ['manual', 'ai_scan'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for common queries
expenseSchema.index({ date: -1, category: 1 });

// Virtual for formatted amount
expenseSchema.virtual('formattedAmount').get(function () {
  return `₹${this.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
});

// Ensure virtuals are included in JSON output
expenseSchema.set('toJSON', { virtuals: true });
expenseSchema.set('toObject', { virtuals: true });

// Local JSON File Database Fallback Implementation
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FILE_PATH = path.resolve(__dirname, '../../expenses.json');

const getLocalData = () => {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading local db file:', error);
    return [];
  }
};

const saveLocalData = (data) => {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing local db file:', error);
  }
};

const addVirtuals = (item) => {
  if (!item) return item;
  return {
    ...item,
    id: item._id,
    formattedAmount: `₹${(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  };
};

function matchesFilter(item, filter) {
  if (!filter) return true;
  for (const key of Object.keys(filter)) {
    if (key === 'category') {
      if (item.category !== filter.category) return false;
    } else if (key === 'date') {
      const itemDate = new Date(item.date);
      if (filter.date.$gte && itemDate < new Date(filter.date.$gte)) return false;
      if (filter.date.$lte && itemDate > new Date(filter.date.$lte)) return false;
    } else if (key === '$or') {
      const match = filter.$or.some(orClause => {
        const field = Object.keys(orClause)[0];
        const val = orClause[field];
        let regexStr = '';
        let flags = '';
        if (typeof val === 'object' && val.$regex) {
          regexStr = val.$regex;
          flags = val.$options || '';
        } else {
          regexStr = String(val);
        }
        const re = new RegExp(regexStr, flags);
        return re.test(item[field] || '');
      });
      if (!match) return false;
    } else {
      if (item[key] !== filter[key]) return false;
    }
  }
  return true;
}

class MockQuery {
  constructor(data) {
    this.data = data;
  }

  sort(sortObj) {
    if (!sortObj) return this;
    const key = Object.keys(sortObj)[0];
    const order = sortObj[key];
    this.data.sort((a, b) => {
      let valA = a[key];
      let valB = b[key];
      if (key === 'date') {
        valA = new Date(valA);
        valB = new Date(valB);
      }
      if (valA < valB) return order === 1 ? -1 : 1;
      if (valA > valB) return order === 1 ? 1 : -1;
      return 0;
    });
    return this;
  }

  skip(n) {
    if (typeof n === 'number') {
      this.data = this.data.slice(n);
    }
    return this;
  }

  limit(n) {
    if (typeof n === 'number') {
      this.data = this.data.slice(0, n);
    }
    return this;
  }

  then(onFulfilled, onRejected) {
    return Promise.resolve(this.data).then(onFulfilled, onRejected);
  }
}

const MockExpense = {
  find(filter = {}) {
    const db = getLocalData();
    const filtered = db.filter(item => matchesFilter(item, filter)).map(addVirtuals);
    return new MockQuery(filtered);
  },

  countDocuments(filter = {}) {
    const db = getLocalData();
    const filtered = db.filter(item => matchesFilter(item, filter));
    return Promise.resolve(filtered.length);
  },

  findById(id) {
    const db = getLocalData();
    const item = db.find(x => x._id === id || x.id === id);
    return Promise.resolve(item ? addVirtuals(item) : null);
  },

  create(body) {
    const db = getLocalData();
    const newItem = {
      _id: Math.random().toString(36).substring(2, 15),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.push(newItem);
    saveLocalData(db);
    return Promise.resolve(addVirtuals(newItem));
  },

  findByIdAndUpdate(id, update, options) {
    const db = getLocalData();
    const index = db.findIndex(x => x._id === id || x.id === id);
    if (index === -1) return Promise.resolve(null);
    
    const updatedItem = {
      ...db[index],
      ...update,
      updatedAt: new Date().toISOString(),
    };
    db[index] = updatedItem;
    saveLocalData(db);
    return Promise.resolve(addVirtuals(updatedItem));
  },

  findByIdAndDelete(id) {
    const db = getLocalData();
    const index = db.findIndex(x => x._id === id || x.id === id);
    if (index === -1) return Promise.resolve(null);
    const deletedItem = db[index];
    db.splice(index, 1);
    saveLocalData(db);
    return Promise.resolve(addVirtuals(deletedItem));
  },

  aggregate(pipeline) {
    let db = getLocalData();
    
    for (const stage of pipeline) {
      if (stage.$match) {
        db = db.filter(item => matchesFilter(item, stage.$match));
      } else if (stage.$group) {
        const groupById = stage.$group._id;
        const groups = {};
        
        for (const item of db) {
          let key = null;
          if (groupById === '$category') {
            key = item.category;
          } else if (typeof groupById === 'object' && groupById.$dateToString) {
            const { format } = groupById.$dateToString;
            const date = new Date(item.date);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            if (format === '%Y-%m-%d') {
              key = `${y}-${m}-${d}`;
            } else if (format === '%Y-%m') {
              key = `${y}-${m}`;
            } else if (format === '%Y-W%V') {
              const firstJan = new Date(y, 0, 1);
              const numberOfDays = Math.floor((date - firstJan) / (24 * 60 * 60 * 1000));
              const result = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
              key = `${y}-W${String(result).padStart(2, '0')}`;
            } else {
              key = `${y}-${m}-${d}`;
            }
          }
          
          if (!groups[key]) {
            groups[key] = { _id: key, total: 0, count: 0 };
          }
          groups[key].total += item.amount;
          groups[key].count += 1;
        }
        
        db = Object.values(groups).map(g => {
          const res = { _id: g._id };
          if (stage.$group.total) res.total = g.total;
          if (stage.$group.count) res.count = g.count;
          if (stage.$group.avgAmount) {
            res.avgAmount = g.count > 0 ? g.total / g.count : 0;
          }
          return res;
        });
      } else if (stage.$sort) {
        const key = Object.keys(stage.$sort)[0];
        const order = stage.$sort[key];
        db.sort((a, b) => {
          if (a[key] < b[key]) return order === 1 ? -1 : 1;
          if (a[key] > b[key]) return order === 1 ? 1 : -1;
          return 0;
        });
      }
    }
    
    return Promise.resolve(db);
  }
};

const ExpenseModel = mongoose.model('Expense', expenseSchema);

const ExpenseProxy = new Proxy(ExpenseModel, {
  get(target, prop, receiver) {
    if (mongoose.connection.readyState === 1 && !isLocalFallback) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    }
    
    if (prop in MockExpense) {
      return MockExpense[prop];
    }
    
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  }
});

export { CATEGORIES };
export default ExpenseProxy;
