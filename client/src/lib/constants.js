export const CATEGORIES = [
  {
    value: 'Food & Meals',
    label: 'Food & Meals',
    icon: '🍽️',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
  },
  {
    value: 'Petrol/Fuel',
    label: 'Petrol/Fuel',
    icon: '⛽',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  },
  {
    value: 'Train Travel',
    label: 'Train Travel',
    icon: '🚆',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  },
  {
    value: 'Bus Travel',
    label: 'Bus Travel',
    icon: '🚌',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  },
  {
    value: 'Hotel/Accommodation',
    label: 'Hotel/Accommodation',
    icon: '🏨',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
  },
  {
    value: 'Parking Charges',
    label: 'Parking Charges',
    icon: '🅿️',
    color: '#eab308',
    gradient: 'linear-gradient(135deg, #eab308, #ca8a04)',
  },
  {
    value: 'Medical Supply Delivery',
    label: 'Medical Supply Delivery',
    icon: '💊',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
  },
  {
    value: 'Miscellaneous',
    label: 'Miscellaneous',
    icon: '📦',
    color: '#6b7280',
    gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
);

export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/scan', label: 'Scan Bill', icon: 'scan' },
  { href: '/add', label: 'Add Expense', icon: 'add' },
  { href: '/history', label: 'History', icon: 'history' },
  { href: '/reports', label: 'Reports', icon: 'reports' },
];

export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];
