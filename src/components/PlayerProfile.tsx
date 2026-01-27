import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useApp } from './AppContext';
import { ArrowLeft, CheckCircle, XCircle, Clock, Copy, Eye, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export function PlayerProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, players, payments, setPayments } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [showInviteCodeDialog, setShowInviteCodeDialog] = useState(false);
  const [manualPaymentAmount, setManualPaymentAmount] = useState('');
  const [manualPaymentDate, setManualPaymentDate] = useState('');

  // Get player ID from URL params or use linked player for parents
  const playerIdFromUrl = searchParams.get('id');
  const playerId = playerIdFromUrl || user?.linkedPlayerId;
  const player = players.find(p => p.id === playerId);

  if (!player) {
    return <div>Player not found</div>;
  }

  const copyInviteCode = () => {
    if (player.inviteCode) {
      navigator.clipboard.writeText(player.inviteCode);
      toast.success('Invite code copied to clipboard!');
    }
  };

  const handleManualPayment = () => {
    if (!manualPaymentAmount || !manualPaymentDate) {
      toast.error('Please fill in all payment fields');
      return;
    }

    const newPayment = {
      id: `payment-${Date.now()}`,
      playerId: player.id,
      playerName: player.name,
      amount: parseFloat(manualPaymentAmount),
      dueDate: manualPaymentDate,
      status: 'paid' as const,
    };

    setPayments([...payments, newPayment]);
    setManualPaymentAmount('');
    setManualPaymentDate('');
    toast.success('Payment recorded successfully!');
  };

  // Mock performance data
  const performanceData = [
    { match: 'Match 1', runs: 45 },
    { match: 'Match 2', runs: 32 },
    { match: 'Match 3', runs: 67 },
    { match: 'Match 4', runs: 23 },
    { match: 'Match 5', runs: 51 },
    { match: 'Match 6', runs: 38 },
  ];

  const recentScores = [
    { match: 'vs Team A', score: 51 },
    { match: 'vs Team B', score: 38 },
    { match: 'vs Team C', score: 67 },
    { match: 'vs Team D', score: 23 },
  ];

  // Mock attendance data
  const attendanceData = [
    { date: '2025-10-15', status: 'present', checkIn: '15:00', checkOut: '18:00' },
    { date: '2025-10-12', status: 'present', checkIn: '15:00', checkOut: '18:00' },
    { date: '2025-10-10', status: 'early-leave', checkIn: '15:00', checkOut: '17:00' },
    { date: '2025-10-08', status: 'absent', checkIn: '-', checkOut: '-' },
    { date: '2025-10-05', status: 'present', checkIn: '15:00', checkOut: '18:00' },
  ];

  const playerPayments = payments.filter(p => p.playerId === player.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => {
              if (user?.role === 'parent') {
                navigate('/parent/dashboard');
              } else if (user?.role === 'coach') {
                navigate('/coach/players');
              } else if (user?.role === 'admin') {
                navigate('/admin/players');
              }
            }}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Player Header */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-6">
            <img
              src={player.photo}
              alt={player.name}
              className="w-24 h-24 rounded-full object-cover"
            />
            <div className="flex-1">
              <h1>{player.name}</h1>
              <p className="text-muted-foreground">
                Age {player.age} • {player.role}
              </p>

              {/* Show invite code button only to coaches */}
              {user?.role === 'coach' && player.inviteCode && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInviteCodeDialog(true)}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Invite Code
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card className="p-6">
              <h3 className="mb-6">Career Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-4xl mb-2">{player.stats.matches}</p>
                  <p className="text-muted-foreground">Matches Played</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl mb-2">{player.stats.runs}</p>
                  <p className="text-muted-foreground">Total Runs</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl mb-2">{player.stats.wickets}</p>
                  <p className="text-muted-foreground">Total Wickets</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl mb-2">{player.stats.average}</p>
                  <p className="text-muted-foreground">Batting Average</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="mb-6">Runs Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="match" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="runs" stroke="#1e3a8a" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="mb-6">Recent Scores</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={recentScores}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="match" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#1e3a8a" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card className="p-6">
              <h3 className="mb-6">Attendance History</h3>
              <div className="space-y-3">
                {attendanceData.map((record, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {record.status === 'present' && (
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-success" />
                        </div>
                      )}
                      {record.status === 'absent' && (
                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-destructive" />
                        </div>
                      )}
                      {record.status === 'early-leave' && (
                        <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-warning" />
                        </div>
                      )}
                      <div>
                        <p>{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.status === 'present' && 'Present'}
                          {record.status === 'absent' && 'Absent'}
                          {record.status === 'early-leave' && 'Left Early'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Check In: {record.checkIn}</p>
                      <p className="text-sm text-muted-foreground">Check Out: {record.checkOut}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="space-y-6">
              {/* Outstanding Fee - Only for Coaches */}
              {user?.role === 'coach' && (
                <Card className="p-6 bg-warning/5 border-warning">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="mb-1">Outstanding Fee for the Month</h3>
                      <p className="text-sm text-muted-foreground">
                        Total pending and overdue payments
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl text-warning">
                        LKR {playerPayments
                          .filter(p => p.status === 'pending' || p.status === 'overdue')
                          .reduce((sum, p) => sum + p.amount, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Manual Payment - Only for Coaches */}
              {user?.role === 'coach' && (
                <Card className="p-6">
                  <h3 className="mb-6">Manual Payment</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="payment-amount">Amount (LKR)</Label>
                        <Input
                          id="payment-amount"
                          type="number"
                          placeholder="3000"
                          value={manualPaymentAmount}
                          onChange={(e) => setManualPaymentAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment-date">Payment Date</Label>
                        <Input
                          id="payment-date"
                          type="date"
                          value={manualPaymentDate}
                          onChange={(e) => setManualPaymentDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleManualPayment}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Save Payment
                    </Button>
                  </div>
                </Card>
              )}

              {/* Payment History */}
              <Card className="p-6">
                <h3 className="mb-6">Payment History</h3>
                <div className="space-y-3">
                  {playerPayments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No payment records found</p>
                  ) : (
                    playerPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div>
                          <p>Monthly Training Fee</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(payment.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg mb-1">LKR {payment.amount.toLocaleString()}</p>
                          {payment.status === 'paid' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-success/10 text-success">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Paid
                            </span>
                          )}
                          {payment.status === 'overdue' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-destructive/10 text-destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              Overdue
                            </span>
                          )}
                          {payment.status === 'pending' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-warning/10 text-warning">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Code Dialog */}
      <Dialog open={showInviteCodeDialog} onOpenChange={setShowInviteCodeDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Player Invite Code
            </DialogTitle>
            <DialogDescription>
              Share this code with the player or their parent to link their account.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="bg-muted rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Invite Code</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-3xl tracking-wider select-all">{player.inviteCode}</p>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyInviteCode}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setShowInviteCodeDialog(false)}
              className="bg-primary hover:bg-primary/90"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
