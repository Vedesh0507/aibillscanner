const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Generic API request handler
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Remove Content-Type for FormData (browser sets boundary automatically)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, config);

    // Handle file downloads
    if (
      response.headers.get('Content-Type')?.includes('spreadsheet') ||
      response.headers.get('Content-Type')?.includes('csv')
    ) {
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : 'download';
      return { blob, filename };
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Make sure the backend is running on port 5000.');
    }
    throw error;
  }
}

// ─── Expense API ───────────────────────────────────────────────────

export async function getExpenses(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  return apiRequest(`/expenses?${query.toString()}`);
}

export async function getExpense(id) {
  return apiRequest(`/expenses/${id}`);
}

export async function createExpense(data) {
  return apiRequest('/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateExpense(id, data) {
  return apiRequest(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteExpense(id) {
  return apiRequest(`/expenses/${id}`, {
    method: 'DELETE',
  });
}

// ─── Stats API ─────────────────────────────────────────────────────

export async function getSummaryStats() {
  return apiRequest('/expenses/stats/summary');
}

export async function getCategoryStats(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.append(key, value);
  });
  return apiRequest(`/expenses/stats/by-category?${query.toString()}`);
}

export async function getTrendStats(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.append(key, value);
  });
  return apiRequest(`/expenses/stats/trend?${query.toString()}`);
}

// ─── Scan API ──────────────────────────────────────────────────────

export async function scanReceipt(file) {
  const formData = new FormData();
  formData.append('receipt', file);

  return apiRequest('/scan', {
    method: 'POST',
    body: formData,
  });
}

// ─── Report Downloads ──────────────────────────────────────────────

export async function downloadExcel(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.append(key, value);
  });

  const result = await apiRequest(`/reports/excel?${query.toString()}`);

  // Trigger browser download
  if (result.blob) {
    const url = window.URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename || 'expense_report.xlsx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  return result;
}

export async function downloadCSV(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.append(key, value);
  });

  const result = await apiRequest(`/reports/csv?${query.toString()}`);

  if (result.blob) {
    const url = window.URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename || 'expense_report.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  return result;
}
