import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useApp } from './AppContext';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle2, Loader2, Shield,
  CreditCard, Landmark, Smartphone, Lock, BadgeCheck, Zap,
} from 'lucide-react';
import { payOnline, MONTH_NAMES } from '../services/paymentService';

type PaymentMethod = 'card' | 'bank' | 'wallet';

interface CardDetails  { number: string; name: string; expiry: string; cvv: string; }
interface BankDetails  { bankName: string; reference: string; }
interface WalletDetails { mobile: string; walletType: string; }

/* ── Processing steps shown during simulate ─────────────────────────────────── */
const PROCESSING_STEPS = [
  'Connecting to payment gateway…',
  'Verifying payment details…',
  'Authorizing transaction…',
  'Confirming with bank…',
  'Recording payment…',
  'Payment successful!',
];

export function PaymentGatewayScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();

  const fee = location.state?.fee;

  const [method, setMethod]           = useState<PaymentMethod>('card');
  const [processing, setProcessing]   = useState(false);
  const [step, setStep]               = useState(-1);
  const [success, setSuccess]         = useState(false);
  const [transactionRef, setTransactionRef] = useState('');

  const [card, setCard]     = useState<CardDetails>({ number: '', name: '', expiry: '', cvv: '' });
  const [bank, setBank]     = useState<BankDetails>({ bankName: '', reference: '' });
  const [wallet, setWallet] = useState<WalletDetails>({ mobile: '', walletType: 'ezcash' });

  if (!user || user.role !== 'parent') { navigate('/parent/payments'); return null; }
  if (!fee) { navigate('/parent/payments'); return null; }

  /* ── Formatters ──────────────────────────────────────────────────────────── */
  const formatCardNumber = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 16);
    return clean.replace(/(.{4})/g, '$1 ').trim();
  };
  const formatExpiry = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 3) return clean.slice(0, 2) + '/' + clean.slice(2);
    return clean;
  };

  /* ── Quick-fill demo data ────────────────────────────────────────────────── */
  const fillDemoData = () => {
    if (method === 'card') {
      setCard({ number: '4111 1111 1111 1111', name: 'DEMO PARENT', expiry: '12/27', cvv: '123' });
    } else if (method === 'bank') {
      setBank({ bankName: 'Commercial Bank', reference: 'CB-DEMO-' + Date.now().toString().slice(-6) });
    } else {
      setWallet({ mobile: '771234567', walletType: 'ezcash' });
    }
    toast.success('Test data filled — click Pay to proceed');
  };

  /* ── Animated submit ─────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setStep(0);

    // Step through processing animation
    for (let i = 0; i < PROCESSING_STEPS.length - 1; i++) {
      await new Promise(r => setTimeout(r, 400));
      setStep(i + 1);
    }

    try {
      const details =
        method === 'card'   ? card :
        method === 'bank'   ? bank :
        wallet;
      const result = await payOnline(fee.feeID, method, details);
      setTransactionRef(result.transaction.transactionRef);
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message || 'Payment failed. Please try again.');
      setStep(-1);
    } finally {
      setProcessing(false);
    }
  };

  /* ── Method selector ─────────────────────────────────────────────────────── */
  const MethodOption = ({
    value, icon: Icon, label, subtitle,
  }: { value: PaymentMethod; icon: any; label: string; subtitle: string }) => (
    <button
      type="button"
      onClick={() => setMethod(value)}
      className={`w-full text-left flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
        method === value
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/30 hover:bg-muted/30'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        method === value ? 'bg-primary/10' : 'bg-muted'
      }`}>
        <Icon className={`w-5 h-5 ${method === value ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1">
        <p className={`font-medium ${method === value ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
        method === value ? 'border-primary bg-primary' : 'border-muted-foreground/40'
      }`}>
        {method === value && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );

  /* ── Processing overlay ──────────────────────────────────────────────────── */
  if (processing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <h3 className="mb-6">Processing Payment</h3>
          <div className="space-y-3 text-left mb-6">
            {PROCESSING_STEPS.slice(0, -1).map((s, i) => (
              <div key={i} className={`flex items-center gap-3 transition-all ${i <= step ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  i < step   ? 'border-success bg-success' :
                  i === step ? 'border-primary bg-primary/10' :
                               'border-muted-foreground/30'
                }`}>
                  {i < step && <CheckCircle2 className="w-3 h-3 text-white" />}
                  {i === step && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <p className={`text-sm ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Simulated — no real money is charged
          </p>
        </Card>
      </div>
    );
  }

  /* ── Success screen ──────────────────────────────────────────────────────── */
  if (success) {
    const methodLabel =
      method === 'card'   ? 'Credit/Debit Card' :
      method === 'bank'   ? 'Bank Transfer' :
      `Mobile Wallet (${wallet.walletType === 'ezcash' ? 'eZ Cash' : wallet.walletType === 'frimi' ? 'FriMi' : 'Genie'})`;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 text-center border-2 border-success/30">

          {/* Success icon */}
          <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-success" />
          </div>

          <h2 className="text-success mb-2">Payment Successful!</h2>
          <p className="text-muted-foreground mb-8">
            Your payment has been recorded. Your coach will be notified automatically.
          </p>

          {/* Receipt */}
          <div className="bg-muted/50 rounded-xl p-5 mb-6 text-left space-y-3 border border-border">
            <div className="flex items-center gap-2 pb-3 border-b border-border mb-3">
              <BadgeCheck className="w-4 h-4 text-success" />
              <p className="font-medium text-success">Payment Receipt</p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Player</span>
              <span className="font-medium">{fee.playerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Period</span>
              <span>{MONTH_NAMES[fee.month]} {fee.year}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-semibold text-success">LKR {fee.amountDue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Method</span>
              <span>{methodLabel}</span>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground mb-1">Transaction Reference</p>
              <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg break-all font-mono">{transactionRef}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/parent/payments')}>
              View All Payments
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => navigate('/parent/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ── Payment form ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Back */}
        <Button variant="ghost" onClick={() => navigate('/parent/payments')} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Payments
        </Button>

        {/* Simulation notice — prominent for demo */}
        <div className="mb-6 p-4 bg-warning/10 border-2 border-warning/30 rounded-xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-warning/20 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-4 h-4 text-warning" />
          </div>
          <div>
            <p className="font-semibold text-warning">Simulation Mode</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              This is a <strong>simulated payment gateway</strong> — no real money is charged and no real bank is contacted.
              Use the <strong>"Fill Test Data"</strong> button to auto-fill demo details, then click Pay.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-6">

          {/* ── Form column ── */}
          <div className="md:col-span-3">
            <Card className="p-6">

              {/* Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3>Secure Online Payment</h3>
                  <p className="text-muted-foreground text-sm">Simulated — no real transaction occurs</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm text-success bg-success/10 px-3 py-1 rounded-full border border-success/20">
                  <Lock className="w-3.5 h-3.5" />
                  Secure
                </span>
              </div>

              {/* Method selection */}
              <div className="mb-6">
                <p className="font-medium mb-3">Select Payment Method</p>
                <div className="space-y-2">
                  <MethodOption value="card"   icon={CreditCard} label="Credit / Debit Card"  subtitle="Visa, Mastercard — ComBank, Sampath, BOC, HNB" />
                  <MethodOption value="bank"   icon={Landmark}   label="Bank Transfer"         subtitle="Commercial Bank, BOC, Sampath, NSB, HNB..." />
                  <MethodOption value="wallet" icon={Smartphone} label="Mobile Wallet"         subtitle="eZ Cash, FriMi, Genie" />
                </div>
              </div>

              {/* Quick-fill button */}
              <div className="mb-5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={fillDemoData}
                >
                  <Zap className="w-4 h-4" />
                  Fill Test Data for Demo
                </Button>
              </div>

              {/* Form fields */}
              <form onSubmit={handleSubmit}>

                {/* ── Card fields ─────────────────────────────── */}
                {method === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="4111 1111 1111 1111"
                        value={card.number}
                        onChange={e => setCard(p => ({ ...p, number: formatCardNumber(e.target.value) }))}
                        className="mt-1.5 font-mono tracking-wider"
                        maxLength={19}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardName">Cardholder Name</Label>
                      <Input
                        id="cardName"
                        placeholder="NAME AS ON CARD"
                        value={card.name}
                        onChange={e => setCard(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                        className="mt-1.5"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiry">Expiry (MM/YY)</Label>
                        <Input
                          id="expiry"
                          placeholder="12/27"
                          value={card.expiry}
                          onChange={e => setCard(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                          className="mt-1.5 font-mono"
                          maxLength={5}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          type="password"
                          placeholder="•••"
                          value={card.cvv}
                          onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                          className="mt-1.5 font-mono"
                          maxLength={3}
                          required
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-muted-foreground">
                      💡 Any numbers work — test card: <span className="font-mono font-medium">4111 1111 1111 1111</span>, CVV: <span className="font-mono font-medium">123</span>
                    </div>
                  </div>
                )}

                {/* ── Bank fields ──────────────────────────────── */}
                {method === 'bank' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <select
                        id="bankName"
                        value={bank.bankName}
                        onChange={e => setBank(p => ({ ...p, bankName: e.target.value }))}
                        className="w-full mt-1.5 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      >
                        <option value="">Select your bank</option>
                        <option value="Commercial Bank">Commercial Bank of Ceylon</option>
                        <option value="BOC">Bank of Ceylon (BOC)</option>
                        <option value="Sampath Bank">Sampath Bank</option>
                        <option value="HNB">Hatton National Bank (HNB)</option>
                        <option value="NSB">National Savings Bank (NSB)</option>
                        <option value="Seylan Bank">Seylan Bank</option>
                        <option value="NDB">National Development Bank (NDB)</option>
                        <option value="Pan Asia Bank">Pan Asia Bank</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="bankRef">Account / Reference Number</Label>
                      <Input
                        id="bankRef"
                        placeholder="Any reference number works for demo"
                        value={bank.reference}
                        onChange={e => setBank(p => ({ ...p, reference: e.target.value }))}
                        className="mt-1.5 font-mono"
                        required
                      />
                    </div>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-muted-foreground">
                      💡 Enter any reference number — the payment is simulated and recorded immediately.
                    </div>
                  </div>
                )}

                {/* ── Wallet fields ─────────────────────────────── */}
                {method === 'wallet' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="walletType">Wallet Provider</Label>
                      <select
                        id="walletType"
                        value={wallet.walletType}
                        onChange={e => setWallet(p => ({ ...p, walletType: e.target.value }))}
                        className="w-full mt-1.5 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      >
                        <option value="ezcash">eZ Cash (Dialog)</option>
                        <option value="frimi">FriMi (Nations Trust Bank)</option>
                        <option value="genie">Genie (Sampath Bank)</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="mobile">Registered Mobile Number</Label>
                      <div className="flex mt-1.5">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground font-mono">+94</span>
                        <Input
                          id="mobile"
                          placeholder="77 123 4567"
                          value={wallet.mobile}
                          onChange={e => setWallet(p => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                          className="rounded-l-none font-mono"
                          required
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-muted-foreground">
                      💡 Enter any mobile number — the payment is simulated and confirmed instantly.
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={processing}
                  className="w-full mt-6 h-11 bg-primary hover:bg-primary/90 gap-2 font-semibold"
                >
                  <Lock className="w-4 h-4" />
                  Pay LKR {fee.amountDue?.toLocaleString()}
                </Button>
              </form>
            </Card>
          </div>

          {/* ── Order summary column ── */}
          <div className="md:col-span-2">
            <Card className="p-6 sticky top-4">
              <h3 className="mb-4">Order Summary</h3>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Player</span>
                  <span className="font-medium text-right">{fee.playerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period</span>
                  <span>{MONTH_NAMES[fee.month]} {fee.year}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Due Date</span>
                  <span>{new Date(fee.dueDate).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total</span>
                    <h2 className="text-primary">LKR {fee.amountDue?.toLocaleString()}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">Sri Lankan Rupees</p>
                </div>
              </div>

              {fee.status === 'overdue' && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">⚠ This payment is overdue</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Please pay immediately to avoid any issues.</p>
                </div>
              )}

              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Simulated — no real money charged</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Payment recorded in system instantly</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BadgeCheck className="w-4 h-4 shrink-0" />
                  <span>Coach notified automatically</span>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
