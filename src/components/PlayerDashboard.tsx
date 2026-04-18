import { useState, useEffect, useRef } from 'react';
import { PlayerSidebar } from './PlayerSidebar';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  TrendingUp, Target, Award,
  CheckCircle2, XCircle, Clock, Wifi, CreditCard, AlertTriangle
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import userService from '../services/userService';
import api from '../services/api';
import { toast } from 'sonner';
import { PaymentPanel } from './PaymentPanel';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PlayerStats {
  matches: number;
  runs: number;
  wickets: number;
  catches: number;
  fours: number;
  sixes: number;
  average: number;
  strikeRate: number;
  economy: number;
}

interface MatchHistory {
  matchId: number;
  opponent: string;
  date: string | null;
  runs: number;
  wickets: number;
  fours: number;
  sixes: number;
  catches: number;
  isOut: boolean;
}

interface AttendanceRecord {
  recordID: number;
  attendanceDate: string;
  status: 'present' | 'absent' | 'early-leave';
  checkInTime?: string;
  checkOutTime?: string;
}

// ─── Payment Summary Banner ────────────────────────────────────────────────
function PaymentSummaryBanner({ playerId }: { playerId?: string }) {
  const [fee, setFee] = useState<any>(null);

  useEffect(() => {
    if (!playerId) return;
    api.get('/payments/fees/player')
      .then(res => {
        const fees: any[] = res.data.fees || [];
        const now = new Date();
        const currentFee = fees.find(
          f => f.month === now.getMonth() + 1 && f.year === now.getFullYear()
        ) || fees[0];
        setFee(currentFee || null);
      })
      .catch(() => {});
  }, [playerId]);

  if (!fee) return null;

  const statusConfig: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
    paid:    { color: 'text-success',     bg: 'bg-success/10',     label: 'Paid',    icon: <CheckCircle2 className="w-4 h-4" /> },
    pending: { color: 'text-warning',     bg: 'bg-warning/10',     label: 'Pending', icon: <Clock className="w-4 h-4" /> },
    overdue: { color: 'text-destructive', bg: 'bg-destructive/10', label: 'Overdue', icon: <AlertTriangle className="w-4 h-4" /> },
  };
  const cfg = statusConfig[fee.status] || statusConfig.pending;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${cfg.bg} border-current/20 mt-2`}>
      <div className="flex items-center gap-3">
        <CreditCard className={`w-5 h-5 ${cfg.color}`} />
        <div>
          <p className="font-medium text-sm">Academy Fee — {months[(fee.month || 1) - 1]} {fee.year}</p>
          <p className="text-xs text-muted-foreground">LKR {parseFloat(fee.amountDue || 0).toLocaleString()}</p>
        </div>
      </div>
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
        {cfg.icon}
        {cfg.label}
      </span>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export function PlayerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Player base info
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Live data states
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 1. Fetch player profile & ID ─────────────────────────────────────────
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

  // ── 2. Fetch stats & match history once player ID is known ───────────────
  useEffect(() => {
    if (!player?.id) return;

    const fetchStats = async () => {
      try {
        const res = await api.get(`/player/${player.id}/stats`);
        setPlayerStats(res.data.stats);
      } catch (e) {
        console.error('Failed to fetch stats:', e);
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await api.get(`/player/${player.id}/match-history`);
        setMatchHistory(res.data.history || []);
      } catch (e) {
        console.error('Failed to fetch match history:', e);
      }
    };

    fetchStats();
    fetchHistory();
  }, [player?.id]);

  // ── 3. Poll attendance every 10 seconds ──────────────────────────────────
  const fetchAttendance = async (id: string) => {
    try {
      const res = await api.get(`/attendance/player/${id}`);
      setAttendanceRecords(res.data.records || []);
      setLastRefreshed(new Date());
      setIsLive(true);
    } catch (e) {
      console.error('Failed to fetch attendance:', e);
      setIsLive(false);
    }
  };

  useEffect(() => {
    if (!player?.id) return;

    fetchAttendance(player.id);

    pollRef.current = setInterval(() => fetchAttendance(player.id), 10000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [player?.id]);

  // ── 4. Re-fetch when switching tabs ──────────────────────────────────────
  useEffect(() => {
    if (!player?.id) return;

    if (activeTab === 'overview' || activeTab === 'performance') {
      api.get(`/player/${player.id}/stats`)
        .then(r => setPlayerStats(r.data.stats))
        .catch(() => {});
      api.get(`/player/${player.id}/match-history`)
        .then(r => setMatchHistory(r.data.history || []))
        .catch(() => {});
    }

    if (activeTab === 'attendance') {
      fetchAttendance(player.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Helpers ───────────────────────────────────────────────────────────────


  const formatTime = (time?: string) => {
    if (!time) return '—';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minutes} ${ampm}`;
  };

  const getAttendanceIcon = (status: string) => {
    if (status === 'present') return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (status === 'absent') return <XCircle className="w-5 h-5 text-destructive" />;
    if (status === 'early-leave') return <CheckCircle2 className="w-5 h-5 text-success" />;
    return null;
  };

  const getAttendanceLabel = (status: string) => {
    if (status === 'present') return 'Present';
    if (status === 'absent') return 'Absent';
    if (status === 'early-leave') return 'Present (Early Leave)';
    return status;
  };

  // ── Derived chart data ────────────────────────────────────────────────────
  const runsOverTimeData = matchHistory.map((m, i) => ({
    match: m.opponent ? `vs ${m.opponent}` : `Match ${i + 1}`,
    runs: m.runs,
  }));

  const recentScoresData = [...matchHistory].slice(-5).map((m, i) => ({
    match: m.opponent ? `vs ${m.opponent}` : `Match ${i + 1}`,
    score: m.runs,
  }));

  // Use playerStats from API, fall back to profile stats if not loaded yet
  const stats = playerStats ?? {
    matches: player?.stats?.matches ?? 0,
    runs: player?.stats?.runs ?? 0,
    wickets: player?.stats?.wickets ?? 0,
    average: player?.stats?.average ?? 0,
    strikeRate: player?.stats?.strikeRate ?? 0,
    economy: player?.stats?.economy ?? 0,
    catches: 0, fours: 0, sixes: 0,
  };

  // ── Attendance summary counts ─────────────────────────────────────────────
  const presentCount = attendanceRecords.filter(r => r.status === 'present' || r.status === 'early-leave').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
  const earlyCount = attendanceRecords.filter(r => r.status === 'early-leave').length;
  const attendanceRate = attendanceRecords.length > 0
    ? Math.round((presentCount / attendanceRecords.length) * 100)
    : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return <div className="flex h-screen items-center justify-center">Player profile not found</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <PlayerSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">

          {/* ── Profile Header ─────────────────────────────────────────── */}
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

              {/* Quick pills */}
              <div className="hidden md:flex gap-4 text-center">
                <div className="bg-primary/5 rounded-xl px-4 py-2 min-w-[80px]">
                  <p className="text-2xl font-bold text-primary">{stats.matches}</p>
                  <p className="text-xs text-muted-foreground">Matches</p>
                </div>
                <div className="bg-success/5 rounded-xl px-4 py-2 min-w-[80px]">
                  <p className="text-2xl font-bold text-success">{stats.runs}</p>
                  <p className="text-xs text-muted-foreground">Runs</p>
                </div>
                <div className="bg-primary/5 rounded-xl px-4 py-2 min-w-[80px]">
                  <p className="text-2xl font-bold text-primary">{attendanceRate}%</p>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Tabs ──────────────────────────────────────────────────── */}
          <Card className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="attendance" className="relative">
                  Attendance
                  {isLive && (
                    <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-success/20 text-success">
                      <Wifi className="w-2.5 h-2.5" />
                      Live
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
              </TabsList>

              {/* ── Overview ─────────────────────────────────────────── */}
              <TabsContent value="overview">
                <div className="space-y-6">
                  <h3>Career Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="p-6 bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-muted-foreground text-sm">Matches Played</p>
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-primary">{stats.matches}</h2>
                    </Card>

                    <Card className="p-6 bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-muted-foreground text-sm">Total Runs</p>
                        <TrendingUp className="w-5 h-5 text-success" />
                      </div>
                      <h2 className="text-success">{stats.runs}</h2>
                    </Card>

                    <Card className="p-6 bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-muted-foreground text-sm">Wickets</p>
                        <Award className="w-5 h-5 text-accent" />
                      </div>
                      <h2 className="text-accent">{stats.wickets}</h2>
                    </Card>

                    <Card className="p-6 bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-muted-foreground text-sm">Batting Average</p>
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-primary">{stats.average}</h2>
                    </Card>
                  </div>

                  {/* Extra stats row */}
                  {playerStats && (
                    <div className="grid grid-cols-3 gap-6">
                      <Card className="p-4 bg-muted/50 text-center">
                        <p className="text-2xl font-bold text-warning">{stats.fours}</p>
                        <p className="text-sm text-muted-foreground">Fours (4s)</p>
                      </Card>
                      <Card className="p-4 bg-muted/50 text-center">
                        <p className="text-2xl font-bold text-success">{stats.sixes}</p>
                        <p className="text-sm text-muted-foreground">Sixes (6s)</p>
                      </Card>
                      <Card className="p-4 bg-muted/50 text-center">
                        <p className="text-2xl font-bold text-primary">{stats.catches}</p>
                        <p className="text-sm text-muted-foreground">Catches</p>
                      </Card>
                    </div>
                  )}

                  {/* Payment summary banner */}
                  <PaymentSummaryBanner playerId={player?.id} />
                </div>
              </TabsContent>

              {/* ── Performance ──────────────────────────────────────── */}
              <TabsContent value="performance">
                <div className="space-y-8">
                  <div>
                    <h3 className="mb-6">Runs Over Time</h3>
                    {runsOverTimeData.length === 0 ? (
                      <div className="h-40 flex items-center justify-center text-muted-foreground">
                        No match data available yet
                      </div>
                    ) : (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={runsOverTimeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="match" stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
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
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-6">Recent Scores (Last 5 Matches)</h3>
                    {recentScoresData.length === 0 ? (
                      <div className="h-40 flex items-center justify-center text-muted-foreground">
                        No match data available yet
                      </div>
                    ) : (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={recentScoresData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="match" stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
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
                    )}
                  </div>

                  {/* Per-match table */}
                  {matchHistory.length > 0 && (
                    <div>
                      <h3 className="mb-4">Match-by-Match Breakdown</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4 text-muted-foreground">Match</th>
                              <th className="text-center py-3 px-4 text-muted-foreground">Runs</th>
                              <th className="text-center py-3 px-4 text-muted-foreground">Wkts</th>
                              <th className="text-center py-3 px-4 text-muted-foreground">4s</th>
                              <th className="text-center py-3 px-4 text-muted-foreground">6s</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matchHistory.map((m, i) => (
                              <tr key={i} className="border-b border-border hover:bg-muted/50">
                                <td className="py-3 px-4">
                                  <p className="font-medium">vs {m.opponent}</p>
                                  {m.date && (
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(m.date).toLocaleDateString()}
                                    </p>
                                  )}
                                </td>
                                <td className="text-center py-3 px-4 font-semibold">{m.runs}</td>
                                <td className="text-center py-3 px-4">{m.wickets}</td>
                                <td className="text-center py-3 px-4">{m.fours}</td>
                                <td className="text-center py-3 px-4">{m.sixes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Attendance ───────────────────────────────────────── */}
              <TabsContent value="attendance">
                <div className="space-y-4">
                  {/* Header with live badge */}
                  <div className="flex items-center justify-between">
                    <h3>Attendance Record</h3>
                    <div className="flex items-center gap-3">
                      {lastRefreshed && (
                        <p className="text-xs text-muted-foreground">
                          Updated {lastRefreshed.toLocaleTimeString()}
                        </p>
                      )}
                      {isLive && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                          Live • refreshes every 10s
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Summary row */}
                  {attendanceRecords.length > 0 && (
                    <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl mb-2">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-success">{presentCount}</p>
                        <p className="text-xs text-muted-foreground">Present</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-destructive">{absentCount}</p>
                        <p className="text-xs text-muted-foreground">Absent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-warning">{earlyCount}</p>
                        <p className="text-xs text-muted-foreground">Left Early</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{attendanceRate}%</p>
                        <p className="text-xs text-muted-foreground">Rate</p>
                      </div>
                    </div>
                  )}

                  {attendanceRecords.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No attendance records yet
                    </div>
                  ) : (
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
                          {attendanceRecords.map((record) => (
                            <tr key={record.recordID} className="border-b border-border hover:bg-muted/50">
                              <td className="py-4 px-4">
                                {new Date(record.attendanceDate).toLocaleDateString('en-US', {
                                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                                })}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  {getAttendanceIcon(record.status)}
                                  <span className={
                                    record.status === 'present' ? 'text-success' :
                                    record.status === 'absent' ? 'text-destructive' : 'text-warning'
                                  }>
                                    {getAttendanceLabel(record.status)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-4">{formatTime(record.checkInTime)}</td>
                              <td className="py-4 px-4">{formatTime(record.checkOutTime)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Payments ─────────────────────────────────────────── */}
              <TabsContent value="payments">
                <PaymentPanel
                  playerId={player?.id}
                  playerName={player?.name}
                  role="player"
                  compact
                />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
