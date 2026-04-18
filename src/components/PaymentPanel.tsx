/**
 * PaymentPanel — shared payment component.
 * role: 'parent' | 'coach' | 'admin' | 'player'
 * compact: true when embedded inside a profile tab
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  CreditCard, Banknote, Landmark, Smartphone, RefreshCw,
  CheckCircle2, Clock, AlertCircle, ArrowRight, Save, X,
  History, TrendingUp,
} from 'lucide-react';
import { Fee, PaymentTransaction, PaymentSummary, MONTH_NAMES } from '../services/paymentService';

const API_BASE = 'http://localhost:5000/api';
const auth = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

/* ── Status badge — matches the badge style used across the app ────────────── */
function StatusBadge({ status }: { status: string }) {
  if (status === 'paid')
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-success/10 text-success">Paid</span>;
  if (status === 'pending')
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-warning/10 text-warning">Pending</span>;
  if (status === 'overdue')
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-destructive/10 text-destructive">Overdue</span>;
  return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground">{status}</span>;
}

/* ── Method badge ──────────────────────────────────────────────────────────── */
function MethodBadge({ method, isOnline }: { method: string; isOnline: boolean }) {
  const labels: Record<string, string> = {
    card: 'Card', bank: 'Bank Transfer', wallet: 'Mobile Wallet', physical: 'Cash',
  };
  const icons: Record<string, React.ReactNode> = {
    card: <CreditCard className="w-3.5 h-3.5" />,
    bank: <Landmark className="w-3.5 h-3.5" />,
    wallet: <Smartphone className="w-3.5 h-3.5" />,
    physical: <Banknote className="w-3.5 h-3.5" />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
      isOnline
        ? 'bg-primary/10 text-primary'
        : 'bg-success/10 text-success'
    }`}>
      {icons[method] ?? <Banknote className="w-3.5 h-3.5" />}
      {labels[method] ?? method}
    </span>
  );
}

/* ── Cash modal ────────────────────────────────────────────────────────────── */
function CashModal({ fee, playerName, onClose, onSuccess }: {
  fee: Fee; playerName?: string; onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(String(fee.amountDue));
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API_BASE}/payments/mark-physical`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ feeID: fee.feeID, amount: num, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Cash payment of LKR ${num.toLocaleString()} recorded`);
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3>Record Cash Payment</h3>
            <p className="text-muted-foreground text-sm mt-0.5">
              {playerName ? `${playerName} · ` : ''}{MONTH_NAMES[fee.month]} {fee.year}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-muted-foreground text-sm">Standard monthly fee</p>
            <p className="font-semibold">LKR {fee.amountDue.toLocaleString()}</p>
          </div>

          <div>
            <Label className="mb-1.5 block">
              Amount Received (LKR) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number" min="1" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="3000"
            />
            {parseFloat(amount) > 0 && parseFloat(amount) < fee.amountDue && (
              <p className="text-sm text-warning mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Amount is less than the standard fee
              </p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block">
              Note <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Partial payment..."
              maxLength={200}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-0">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground gap-2"
            onClick={save}
            disabled={saving}
          >
            {saving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Payment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────────────────── */
interface Props {
  playerId?: string | number | null;
  playerName?: string;
  role: 'parent' | 'coach' | 'admin' | 'player';
  compact?: boolean;
}

export function PaymentPanel({ playerId, playerName, role, compact = false }: Props) {
  const navigate = useNavigate();

  const [fees, setFees]           = useState<Fee[]>([]);
  const [history, setHistory]     = useState<PaymentTransaction[]>([]);
  const [summary, setSummary]     = useState<PaymentSummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [cashFee, setCashFee]     = useState<Fee | null>(null);
  const [activeTab, setActiveTab] = useState<'fees' | 'history'>('fees');
  const [clearing, setClearing]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let feesUrl = `${API_BASE}/payments/fees/my`;
      if (role === 'coach' || role === 'admin') feesUrl = `${API_BASE}/payments/fees/all`;
      if (role === 'player')                    feesUrl = `${API_BASE}/payments/fees/player`;

      const [feesRes, histRes, sumRes] = await Promise.all([
        fetch(feesUrl, { headers: auth() }),
        fetch(`${API_BASE}/payments/history`, { headers: auth() }),
        fetch(`${API_BASE}/payments/summary`, { headers: auth() }),
      ]);

      const feesData = await feesRes.json();
      const histData = await histRes.json();
      const sumData  = sumRes.ok ? await sumRes.json() : null;

      let allFees: Fee[]                = feesData.fees    || [];
      let allHist: PaymentTransaction[] = histData.history || [];

      if (playerId != null) {
        allFees = allFees.filter(f => String(f.playerID) === String(playerId));
        allHist = allHist.filter(t => String(t.playerID) === String(playerId));
      }

      setFees(allFees);
      setHistory(allHist);
      if (sumData) setSummary(sumData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [role, playerId]);

  useEffect(() => { load(); }, [load]);

  const generateFees = async () => {
    try {
      const res  = await fetch(`${API_BASE}/payments/generate-fees`, { method: 'POST', headers: auth() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Generated ${data.created} fee record(s)`);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate fees');
    }
  };

  const clearAllData = async () => {
    if (!window.confirm('This will DELETE all fee and payment records permanently. Continue?')) return;
    setClearing(true);
    try {
      const res  = await fetch(`${API_BASE}/payments/clear-all`, { method: 'DELETE', headers: auth() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('All payment data cleared!');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  const sortedFees = [...fees].sort((a, b) => b.year - a.year || b.month - a.month);
  const hasOverdue = fees.some(f => f.status === 'overdue');
  // Show player name column: always for coach/admin (unless viewing single player), and for parent with 2+ children
  const uniquePlayerIds = [...new Set(sortedFees.map(f => f.playerID))];
  const showPlayerCol = (!playerId && (role === 'coach' || role === 'admin')) ||
                        (role === 'parent' && uniquePlayerIds.length > 1);

  /* ── Loading ─────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading payment records…</p>
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground">
          {role === 'parent' && 'Monthly academy fees for your children'}
          {role === 'coach'  && 'Record cash payments and track all player transactions'}
          {role === 'admin'  && 'Full payment records and transaction history'}
          {role === 'player' && 'Your monthly fee records — payments are made by your parent or coach'}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {(role === 'coach' || role === 'admin') && !playerId && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={clearAllData}
                disabled={clearing}
              >
                {clearing
                  ? <div className="w-3.5 h-3.5 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                  : <X className="w-3.5 h-3.5" />}
                Clear All Data
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2" onClick={generateFees}>
                <TrendingUp className="w-4 h-4" />
                Generate Fees
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Info / alert banners ──────────────────────────────────────────────── */}
      {role === 'player' && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">View Only</p>
              <p className="text-muted-foreground text-sm mt-0.5">
                Academy fees are paid by your parent/guardian online, or recorded as cash by your coach.
              </p>
            </div>
          </div>
        </Card>
      )}

      {hasOverdue && role !== 'player' && (
        <Card className="p-4 border-2 border-destructive">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">Payment Overdue</p>
              <p className="text-muted-foreground text-sm mt-0.5">
                {role === 'parent'
                  ? 'One or more monthly fees are overdue. Please make payment as soon as possible.'
                  : 'A player has an overdue fee. Please follow up or record the cash payment.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Summary stat cards (standalone pages only) — matches CoachDashboard ── */}
      {!compact && summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Total Paid</p>
                <h2 className="text-success">LKR {summary.totalPaid.toLocaleString()}</h2>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Pending</p>
                <h2 className="text-warning">LKR {summary.totalPending.toLocaleString()}</h2>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Overdue</p>
                <h2 className="text-destructive">LKR {summary.totalOverdue.toLocaleString()}</h2>
              </div>
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab switcher — underline style matching app convention ────────────── */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('fees')}
            className={`flex items-center gap-2 pb-3 border-b-2 -mb-px transition-colors ${
              activeTab === 'fees'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Landmark className="w-4 h-4" />
            Fee Records
            {sortedFees.filter(f => f.status !== 'paid').length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'fees' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {sortedFees.filter(f => f.status !== 'paid').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 pb-3 border-b-2 -mb-px transition-colors ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-4 h-4" />
            Transactions
            {history.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'history' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {history.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Fee Records ────────────────────────────────────────────────────────── */}
      {activeTab === 'fees' && (
        sortedFees.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Landmark className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">No Fee Records Yet</p>
            <p className="text-muted-foreground text-sm mb-4">
              Fee records are generated automatically on the 1st of each month.
            </p>
            {(role === 'coach' || role === 'admin') && !playerId && (
              <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={generateFees}>
                <TrendingUp className="w-4 h-4" />
                Generate This Month's Fees
              </Button>
            )}
          </Card>
        ) : (
          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground">Month</th>
                    {showPlayerCol && (
                      <th className="text-left py-3 px-4 text-muted-foreground">Player</th>
                    )}
                    <th className="text-left py-3 px-4 text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Due Date</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFees.map(fee => (
                    <tr key={fee.feeID} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4">
                        <p>{MONTH_NAMES[fee.month]} {fee.year}</p>
                        <p className="text-sm text-muted-foreground">Academy Fee</p>
                      </td>

                      {showPlayerCol && (
                        <td className="py-4 px-4">
                          <p>{fee.playerName}</p>
                          <p className="text-sm text-muted-foreground">{fee.playerEmail}</p>
                        </td>
                      )}

                      <td className="py-4 px-4">
                        LKR {fee.amountDue.toLocaleString()}
                      </td>

                      <td className="py-4 px-4 text-muted-foreground">
                        {new Date(fee.dueDate).toLocaleDateString('en-LK', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>

                      <td className="py-4 px-4">
                        <StatusBadge status={fee.status} />
                      </td>

                      <td className="py-4 px-4">
                        {fee.status === 'paid' && (
                          <div className="flex items-center gap-1.5 text-success">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm">Received</span>
                          </div>
                        )}
                        {(fee.status === 'pending' || fee.status === 'overdue') && role === 'parent' && (
                          <Button
                            size="sm"
                            className={`gap-2 ${
                              fee.status === 'overdue'
                                ? 'bg-destructive hover:bg-destructive/90'
                                : 'bg-primary hover:bg-primary/90'
                            }`}
                            onClick={() => navigate('/parent/payment', { state: { fee } })}
                          >
                            <CreditCard className="w-4 h-4" />
                            Pay Online
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
                        {(fee.status === 'pending' || fee.status === 'overdue') && (role === 'coach' || role === 'admin') && (
                          <Button
                            size="sm"
                            className="bg-success hover:bg-success/90 text-success-foreground gap-2"
                            onClick={() => setCashFee(fee)}
                          >
                            <Banknote className="w-4 h-4" />
                            Record Cash
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {/* ── Transaction History ───────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        history.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <History className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">No Transactions Yet</p>
            <p className="text-muted-foreground text-sm">
              Completed payment transactions will appear here.
            </p>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground">Period</th>
                    {showPlayerCol && (
                      <th className="text-left py-3 px-4 text-muted-foreground">Player</th>
                    )}
                    <th className="text-left py-3 px-4 text-muted-foreground">Amount Paid</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Method</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(tx => (
                    <tr key={tx.paymentID} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4">
                        <p>{MONTH_NAMES[tx.month]} {tx.year}</p>
                        <p className="text-sm text-muted-foreground">Academy Fee</p>
                      </td>

                      {showPlayerCol && (
                        <td className="py-4 px-4">
                          <p>{tx.playerName}</p>
                          <p className="text-sm text-muted-foreground">{tx.playerEmail}</p>
                        </td>
                      )}

                      <td className="py-4 px-4 text-success">
                        LKR {tx.amountPaid.toLocaleString()}
                      </td>

                      <td className="py-4 px-4">
                        <MethodBadge method={tx.paymentMethod} isOnline={tx.isOnline} />
                      </td>

                      <td className="py-4 px-4 text-muted-foreground">
                        {tx.paymentDate
                          ? new Date(tx.paymentDate).toLocaleDateString('en-LK', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </td>

                      <td className="py-4 px-4">
                        <p className="text-sm text-muted-foreground truncate max-w-[160px]">
                          {tx.transactionRef || '—'}
                        </p>
                        {tx.paidByRole === 'coach'  && <p className="text-sm text-warning">by Coach</p>}
                        {tx.paidByRole === 'parent' && <p className="text-sm text-primary">by Parent</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {/* ── Cash modal ─────────────────────────────────────────────────────────── */}
      {cashFee && (
        <CashModal
          fee={cashFee}
          playerName={cashFee.playerName || playerName}
          onClose={() => setCashFee(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
