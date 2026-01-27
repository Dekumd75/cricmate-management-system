import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerSidebar } from './PlayerSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { TrendingUp, Target, Award, DollarSign, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import userService from '../services/userService';
import { toast } from 'sonner';

// Mock performance data (keep for now until we have real stats API)
const runsOverTimeData = [
  { match: 'Match 1', runs: 45 },
  { match: 'Match 2', runs: 32 },
  { match: 'Match 3', runs: 67 },
  { match: 'Match 4', runs: 28 },
  { match: 'Match 5', runs: 89 },
  { match: 'Match 6', runs: 43 },
];

const recentScoresData = [
  { match: 'vs Team A', score: 89 },
  { match: 'vs Team B', score: 43 },
  { match: 'vs Team C', score: 67 },
  { match: 'vs Team D', score: 45 },
  { match: 'vs Team E', score: 32 },
];

const attendanceData = [
  { date: '2025-10-01', status: 'Present', checkIn: '09:00 AM', checkOut: '11:30 AM' },
  { date: '2025-10-03', status: 'Present', checkIn: '09:05 AM', checkOut: '11:25 AM' },
  { date: '2025-10-05', status: 'Left Early', checkIn: '09:00 AM', checkOut: '10:45 AM' },
  { date: '2025-10-08', status: 'Present', checkIn: '08:55 AM', checkOut: '11:30 AM' },
  { date: '2025-10-10', status: 'Absent', checkIn: '-', checkOut: '-' },
  { date: '2025-10-12', status: 'Present', checkIn: '09:00 AM', checkOut: '11:35 AM' },
];

const paymentData = [
  { month: 'November 2025', amount: 3000, status: 'Pending', date: '', dueDate: '2025-11-15' },
  { month: 'October 2025', amount: 3000, status: 'Paid', date: '2025-10-01', dueDate: '2025-10-15' },
  { month: 'September 2025', amount: 3000, status: 'Paid', date: '2025-09-01', dueDate: '2025-09-15' },
  { month: 'August 2025', amount: 3000, status: 'Paid', date: '2025-08-01', dueDate: '2025-08-15' },
  { month: 'July 2025', amount: 3000, status: 'Paid', date: '2025-07-01', dueDate: '2025-07-15' },
];

export function PlayerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await userService.getPlayerProfile();
        setPlayer(profile);
      } catch (error) {
        console.error('Failed to fetch player profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!player) {
    return <div className="flex h-screen items-center justify-center">Player profile not found</div>;
  }

  const handlePayment = (payment: any) => {
    navigate('/player/payment', {
      state: {
        payment: {
          amount: payment.amount,
          description: `${payment.month} Academy Fee`,
          playerId: player.id
        }
      }
    });
  };

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'Present':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'Absent':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'Left Early':
        return <Clock className="w-5 h-5 text-warning" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <PlayerSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Professional Header */}
          <Card className="p-6 mb-8">
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={player.photo} alt={player.name} />
                <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="mb-2">{player.name}</h1>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="border-primary text-primary">
                    {player.role}
                  </Badge>
                  <span className="text-muted-foreground">Age: {player.age}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Card className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="space-y-6">
                  <h3>Career Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="p-6 bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-muted-foreground text-sm">Matches Played</p>
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-primary">{player.stats.matches}</h2>
                    </Card>

                    <Card className="p-6 bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-muted-foreground text-sm">Total Runs</p>
                        <TrendingUp className="w-5 h-5 text-success" />
                      </div>
                      <h2 className="text-success">{player.stats.runs}</h2>
                    </Card>

                    <Card className="p-6 bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-muted-foreground text-sm">Wickets</p>
                        <Award className="w-5 h-5 text-accent" />
                      </div>
                      <h2 className="text-accent">{player.stats.wickets}</h2>
                    </Card>

                    <Card className="p-6 bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-muted-foreground text-sm">Batting Average</p>
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-primary">{player.stats.average}</h2>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance">
                <div className="space-y-8">
                  <div>
                    <h3 className="mb-6">Runs Over Time</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={runsOverTimeData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                          <XAxis dataKey="match" stroke="var(--color-muted-foreground)" />
                          <YAxis stroke="var(--color-muted-foreground)" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--color-card)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="runs"
                            stroke="var(--color-primary)"
                            strokeWidth={2}
                            dot={{ fill: 'var(--color-primary)', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-6">Recent Scores</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={recentScoresData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                          <XAxis dataKey="match" stroke="var(--color-muted-foreground)" />
                          <YAxis stroke="var(--color-muted-foreground)" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--color-card)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="score" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Attendance Tab */}
              <TabsContent value="attendance">
                <div className="space-y-4">
                  <h3>Attendance Record</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 text-muted-foreground">Status</th>
                          <th className="text-left py-3 px-4 text-muted-foreground">Check In</th>
                          <th className="text-left py-3 px-4 text-muted-foreground">Check Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceData.map((record, index) => (
                          <tr key={index} className="border-b border-border hover:bg-muted/50">
                            <td className="py-4 px-4">{new Date(record.date).toLocaleDateString()}</td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                {getAttendanceIcon(record.status)}
                                <span className={
                                  record.status === 'Present' ? 'text-success' :
                                    record.status === 'Absent' ? 'text-destructive' :
                                      'text-warning'
                                }>
                                  {record.status}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">{record.checkIn}</td>
                            <td className="py-4 px-4">{record.checkOut}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments">
                <div className="space-y-4">
                  <h3>Payment History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-muted-foreground">Month</th>
                          <th className="text-left py-3 px-4 text-muted-foreground">Amount</th>
                          <th className="text-left py-3 px-4 text-muted-foreground">Status</th>
                          <th className="text-left py-3 px-4 text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentData.map((payment, index) => (
                          <tr key={index} className="border-b border-border hover:bg-muted/50">
                            <td className="py-4 px-4">{payment.month}</td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-muted-foreground" />
                                LKR {payment.amount.toLocaleString()}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge className={
                                payment.status === 'Paid'
                                  ? 'bg-success text-success-foreground'
                                  : 'bg-warning text-warning-foreground'
                              }>
                                {payment.status}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              {payment.status === 'Paid'
                                ? new Date(payment.date).toLocaleDateString()
                                : `Due: ${new Date(payment.dueDate).toLocaleDateString()}`
                              }
                            </td>
                            <td className="py-4 px-4">
                              {payment.status === 'Pending' && (
                                <Button
                                  size="sm"
                                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                                  onClick={() => handlePayment(payment)}
                                >
                                  Pay Now
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
