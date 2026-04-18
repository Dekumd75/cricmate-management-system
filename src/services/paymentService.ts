const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export interface Fee {
  feeID: number;
  playerID?: number;
  playerName?: string;
  playerEmail?: string;
  month: number;
  year: number;
  amountDue: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
}

export interface PaymentSummary {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalFees: number;
}

export interface PaymentResult {
  message: string;
  transaction: {
    paymentID: number;
    transactionRef: string;
    amountPaid: number;
    playerName: string;
    month: number;
    year: number;
    method: string;
  };
}

export interface PaymentTransaction {
  paymentID: number;
  transactionRef: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  feeID: number;
  month: number;
  year: number;
  playerName: string;
  playerEmail: string;
  playerID: number;
  paidByName: string;
  paidByRole: string;
  isOnline: boolean;
}

// Get fees for linked children (parent role)
export const getMyFees = async (): Promise<Fee[]> => {
  const res = await fetch(`${API_BASE}/payments/fees/my`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch fees');
  const data = await res.json();
  return data.fees;
};

// Get own fees (player role)
export const getPlayerFees = async (): Promise<Fee[]> => {
  const res = await fetch(`${API_BASE}/payments/fees/player`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch fees');
  const data = await res.json();
  return data.fees;
};

// Get all fees (coach role)
export const getAllFees = async (filters?: {
  month?: number;
  year?: number;
  status?: string;
}): Promise<Fee[]> => {
  const params = new URLSearchParams();
  if (filters?.month) params.append('month', String(filters.month));
  if (filters?.year) params.append('year', String(filters.year));
  if (filters?.status) params.append('status', filters.status);

  const res = await fetch(`${API_BASE}/payments/fees/all?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch fees');
  const data = await res.json();
  return data.fees;
};

// Get payment summary
export const getPaymentSummary = async (): Promise<PaymentSummary> => {
  const res = await fetch(`${API_BASE}/payments/summary`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
};

// Get payment transaction history (all roles, scoped)
export const getPaymentHistory = async (): Promise<PaymentTransaction[]> => {
  const res = await fetch(`${API_BASE}/payments/history`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch payment history');
  const data = await res.json();
  return data.history;
};

// Pay online (simulated gateway — parent only)
export const payOnline = async (
  feeID: number,
  paymentMethod: string,
  cardDetails?: object
): Promise<PaymentResult> => {
  const res = await fetch(`${API_BASE}/payments/pay-online`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ feeID, paymentMethod, cardDetails }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Payment failed');
  return data;
};

// Mark payment as physical (coach)
export const markPhysical = async (feeID: number): Promise<void> => {
  const res = await fetch(`${API_BASE}/payments/mark-physical`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ feeID }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to mark payment');
};

// Generate fees manually (coach/admin)
export const generateFees = async (): Promise<{ created: number; skipped: number; month: number; year: number }> => {
  const res = await fetch(`${API_BASE}/payments/generate-fees`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to generate fees');
  return data;
};

export const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
