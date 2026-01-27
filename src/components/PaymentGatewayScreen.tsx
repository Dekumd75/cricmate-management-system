import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { useApp } from './AppContext';
import { toast } from 'sonner';
import { CreditCard, Building2, Wallet, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

export function PaymentGatewayScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();

  // Get payment details from navigation state
  const paymentDetails = location.state?.payment || {
    amount: 3000,
    description: 'Monthly Academy Fee',
    playerId: user?.linkedPlayerId
  };

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Mobile wallet
  const [mobileNumber, setMobileNumber] = useState('');

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
    setCardNumber(formatCardNumber(value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setExpiryDate(formatExpiryDate(value));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCvv(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);

      toast.success('Payment successful!');

      // Redirect after success
      setTimeout(() => {
        if (user?.role === 'parent') {
          navigate('/parent/dashboard');
        } else if (user?.role === 'player') {
          navigate('/player/dashboard');
        }
      }, 2000);
    }, 2000);
  };

  const handleBack = () => {
    if (user?.role === 'parent') {
      navigate('/parent/dashboard');
    } else if (user?.role === 'player') {
      navigate('/player/dashboard');
    } else {
      navigate('/');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-success mb-4">Payment Successful!</h1>
          <p className="text-muted-foreground mb-2">
            Your payment of <span className="text-foreground">LKR {paymentDetails.amount.toLocaleString()}</span> has been processed successfully.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Redirecting to dashboard...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Payment Form */}
          <div className="md:col-span-2">
            <Card className="p-6">
              <h2 className="mb-6">Payment Details</h2>

              {/* Payment Method Selection */}
              <div className="mb-6">
                <Label className="mb-4 block">Select Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="grid grid-cols-1 gap-3">
                    <label
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${paymentMethod === 'card'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <RadioGroupItem value="card" id="card" />
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span>Credit/Debit Card</span>
                    </label>

                    <label
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${paymentMethod === 'bank'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <RadioGroupItem value="bank" id="bank" />
                      <Building2 className="w-5 h-5 text-primary" />
                      <span>Bank Transfer</span>
                    </label>

                    <label
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${paymentMethod === 'wallet'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <RadioGroupItem value="wallet" id="wallet" />
                      <Wallet className="w-5 h-5 text-primary" />
                      <span>Mobile Wallet</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Payment Form */}
              <form onSubmit={handleSubmit}>
                {paymentMethod === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        required
                        maxLength={19}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardName">Cardholder Name</Label>
                      <Input
                        id="cardName"
                        placeholder="JOHN DOE"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={expiryDate}
                          onChange={handleExpiryChange}
                          required
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          type="password"
                          placeholder="123"
                          value={cvv}
                          onChange={handleCvvChange}
                          required
                          maxLength={3}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'bank' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        placeholder="Select or enter your bank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        placeholder="Enter your account number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        required
                      />
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        You will be redirected to your bank's secure payment gateway to complete the transaction.
                      </p>
                    </div>
                  </div>
                )}

                {paymentMethod === 'wallet' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="mobileNumber">Mobile Number</Label>
                      <Input
                        id="mobileNumber"
                        placeholder="+94 XX XXX XXXX"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        required
                      />
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        A payment request will be sent to your mobile wallet app. Please approve the transaction.
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full mt-6 bg-primary hover:bg-primary/90"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay LKR ${paymentDetails.amount.toLocaleString()}`
                  )}
                </Button>
              </form>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-1">
            <Card className="p-6 sticky top-4">
              <h3 className="mb-4">Order Summary</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{paymentDetails.description}</span>
                  <span>LKR {paymentDetails.amount.toLocaleString()}</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span>LKR {paymentDetails.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Your payment information is secure and encrypted. We do not store your card details.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
