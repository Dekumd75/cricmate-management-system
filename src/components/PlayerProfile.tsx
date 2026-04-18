import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from './ui/dialog';
import { useApp } from './AppContext';
import { ArrowLeft, CheckCircle, XCircle, Clock, Copy, Eye, Wifi } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import userService from '../services/userService';
import api from '../services/api';
import { PaymentPanel } from './PaymentPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  venue: string;
  result: string | null;
  runs: number;
  wickets: number;
  fours: number;
  sixes: number;
  catches: number;
  oversBowled: number;
  runsConceded: number;
  isOut: boolean;
}

interface AttendanceRecord {
  recordID: number;
  attendanceDate: string;
  status: 'present' | 'absent' | 'early-leave';
  checkInTime?: string;
  checkOutTime?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlayerProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [showInviteCodeDialog, setShowInviteCodeDialog] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Real data states
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playerIdFromUrl = searchParams.get('id');
  const playerId = playerIdFromUrl || user?.linkedPlayerId;

  // ── Fetch player info ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerId) return;
      setLoading(true);
      try {
        if (user?.role === 'admin' || user?.role === 'coach') {
          const players = await userService.getPlayers(user.role);
          const foundPlayer = players.find((p: any) => p.id === playerId || p.id === String(playerId));
          if (foundPlayer) setPlayer(foundPlayer);
        } else if (user?.role === 'parent') {
          const res = await api.get('/auth/linked-children');
          const children: any[] = res.data.children || [];
          const foundChild = children.find((c: any) => String(c.id) === String(playerId));
          if (foundChild) {
            setPlayer(foundChild);
          } else {
            const infoRes = await api.get(`/player/${playerId}/info`);
            if (infoRes.data?.player) setPlayer(infoRes.data.player);
          }
        } else if (user?.role === 'player') {
          const profile = await userService.getPlayerProfile();
          if (profile) setPlayer(profile);
        }
      } catch (error) {
        console.error('Failed to fetch player data:', error);
        toast.error('Failed to load player profile');
      } finally {
        setLoading(false);
      }
    };
    fetchPlayerData();
  }, [playerId, user?.role]);

  // ── Fetch career stats ────────────────────────────────────────────────────
  useEffect(() => {
    if (!playerId) return;
    api.get(`/player/${playerId}/stats`)
      .then(r => setPlayerStats(r.data.stats))
      .catch(() => {});
  }, [playerId]);

  // ── Fetch match history ───────────────────────────────────────────────────
  useEffect(() => {
    if (!playerId) return;
    api.get(`/player/${playerId}/match-history`)
      .then(r => setMatchHistory(r.data.history || []))
      .catch(() => {});
  }, [playerId]);

  // ── Fetch & poll attendance every 10s ────────────────────────────────────
  const fetchAttendance = async () => {
    if (!playerId) return;
    try {
      const response = await api.get(`/attendance/player/${playerId}`);
      setAttendanceRecords(response.data.records || []);
      setLastRefreshed(new Date());
      setIsLive(true);
    } catch {
      setIsLive(false);
    }
  };

  useEffect(() => {
    if (!playerId) return;
    fetchAttendance();
    pollIntervalRef.current = setInterval(fetchAttendance, 10000);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  // ── Re-fetch on tab switch ────────────────────────────────────────────────
  useEffect(() => {
    if ((activeTab === 'overview' || activeTab === 'performance') && playerId) {
      api.get(`/player/${playerId}/stats`).then(r => setPlayerStats(r.data.stats)).catch(() => {});
      api.get(`/player/${playerId}/match-history`).then(r => setMatchHistory(r.data.history || [])).catch(() => {});
    }
    if (activeTab === 'attendance') fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const copyInviteCode = () => {
    if (player?.inviteCode) {
      navigator.clipboard.writeText(player.inviteCode);
      toast.success('Invite code copied to clipboard!');
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '—';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // ── Derived chart data ────────────────────────────────────────────────────
  const performanceData = matchHistory.map((m, i) => ({
    match: m.opponent ? `vs ${m.opponent}` : `Match ${i + 1}`,
    runs: m.runs,
    wickets: m.wickets,
  }));

  const recentScores = [...matchHistory].slice(-6).map((m, i) => ({
    match: m.opponent ? `vs ${m.opponent}` : `Match ${i + 1}`,
    score: m.runs,
  }));

  const stats = playerStats ?? {
    matches: player?.stats?.matches ?? 0,
    runs: player?.stats?.runs ?? 0,
    wickets: player?.stats?.wickets ?? 0,
    average: player?.stats?.average ?? 0,
    strikeRate: player?.stats?.strikeRate ?? 0,
    economy: player?.stats?.economy ?? 0,
    catches: 0, fours: 0, sixes: 0,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading player profile…</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return <div className="flex min-h-screen items-center justify-center">Player not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => {
              if (user?.role === 'parent') navigate('/parent/dashboard');
              else if (user?.role === 'coach') navigate('/coach/players');
              else if (user?.role === 'admin') navigate('/admin/players');
            }}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Player Header Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-6">
            <img
              src={player.photo}
              alt={player.name}
              className="w-24 h-24 rounded-full object-cover ring-2 ring-primary/20"
            />
            <div className="flex-1">
              <h1>{player.name}</h1>
              <p className="text-muted-foreground">Age {player.age} • {player.role}</p>
              {user?.role === 'coach' && player.inviteCode && (
                <div className="mt-3">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setShowInviteCodeDialog(true)}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Invite Code
                  </Button>
                </div>
              )}
            </div>
            {/* Quick stat pills */}
            <div className="hidden md:flex gap-4 text-center">
              <div className="bg-primary/5 rounded-xl px-4 py-2">
                <p className="text-2xl font-bold text-primary">{stats.matches}</p>
                <p className="text-xs text-muted-foreground">Matches</p>
              </div>
              <div className="bg-primary/5 rounded-xl px-4 py-2">
                <p className="text-2xl font-bold text-primary">{stats.runs}</p>
                <p className="text-xs text-muted-foreground">Runs</p>
              </div>
              <div className="bg-primary/5 rounded-xl px-4 py-2">
                <p className="text-2xl font-bold text-primary">{stats.wickets}</p>
                <p className="text-xs text-muted-foreground">Wickets</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="attendance">
              Attendance
              {isLive && (
                <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-success/20 text-success">
                  <Wifi className="w-2.5 h-2.5" />
                  Live
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ───────────────────────────────────────────────── */}
          <TabsContent value="overview">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="mb-6">Career Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {[
                    { label: 'Matches', value: stats.matches },
                    { label: 'Total Runs', value: stats.runs },
                    { label: 'Wickets', value: stats.wickets },
                    { label: 'Batting Avg', value: stats.average },
                    { label: 'Strike Rate', value: stats.strikeRate },
                    { label: 'Economy', value: stats.economy },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-4xl font-bold mb-1">{value}</p>
                      <p className="text-sm text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </Card>
              {playerStats && (
                <Card className="p-6">
                  <h3 className="mb-4">Batting Breakdown</h3>
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-3xl font-bold text-warning">{stats.fours}</p>
                      <p className="text-sm text-muted-foreground">Fours (4s)</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-success">{stats.sixes}</p>
                      <p className="text-sm text-muted-foreground">Sixes (6s)</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-primary">{stats.catches}</p>
                      <p className="text-sm text-muted-foreground">Catches</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── Performance Tab ────────────────────────────────────────────── */}
          <TabsContent value="performance">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="mb-6">Runs Per Match</h3>
                {performanceData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No match data available yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="match" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="runs" stroke="#1e3a8a" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>
              <Card className="p-6">
                <h3 className="mb-6">Recent Scores (Last 6 Matches)</h3>
                {recentScores.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No match data available yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={recentScores}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="match" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="score" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
              {matchHistory.length > 0 && (
                <Card className="p-6">
                  <h3 className="mb-4">Match-by-Match Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left pb-3 text-muted-foreground font-medium">Match</th>
                          <th className="text-center pb-3 text-muted-foreground font-medium">Runs</th>
                          <th className="text-center pb-3 text-muted-foreground font-medium">Wkts</th>
                          <th className="text-center pb-3 text-muted-foreground font-medium">4s</th>
                          <th className="text-center pb-3 text-muted-foreground font-medium">6s</th>
                          <th className="text-center pb-3 text-muted-foreground font-medium">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchHistory.map((m, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-3 pr-4">
                              <p className="font-medium">vs {m.opponent}</p>
                              {m.date && <p className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString()}</p>}
                            </td>
                            <td className="text-center py-3 font-semibold">{m.runs}</td>
                            <td className="text-center py-3">{m.wickets}</td>
                            <td className="text-center py-3">{m.fours}</td>
                            <td className="text-center py-3">{m.sixes}</td>
                            <td className="text-center py-3">
                              {m.result ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  m.result === 'Won' ? 'bg-success/10 text-success' :
                                  m.result === 'Lost' ? 'bg-destructive/10 text-destructive' :
                                  'bg-muted text-muted-foreground'
                                }`}>{m.result}</span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── Attendance Tab ─────────────────────────────────────────────── */}
          <TabsContent value="attendance">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3>Attendance History</h3>
                <div className="flex items-center gap-3">
                  {lastRefreshed && (
                    <p className="text-xs text-muted-foreground">Refreshed {lastRefreshed.toLocaleTimeString()}</p>
                  )}
                  {isLive && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      Live • auto-refreshing every 10s
                    </span>
                  )}
                </div>
              </div>
              {attendanceRecords.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-xl">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-success">{attendanceRecords.filter(r => r.status === 'present').length}</p>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-destructive">{attendanceRecords.filter(r => r.status === 'absent').length}</p>
                    <p className="text-xs text-muted-foreground">Absent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-warning">{attendanceRecords.filter(r => r.status === 'early-leave').length}</p>
                    <p className="text-xs text-muted-foreground">Left Early</p>
                  </div>
                </div>
              )}
              {attendanceRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No attendance records found</div>
              ) : (
                <div className="space-y-3">
                  {attendanceRecords.map((record) => (
                    <div
                      key={record.recordID}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors"
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
                          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-success" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">
                            {new Date(record.attendanceDate).toLocaleDateString('en-US', {
                              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {record.status === 'present' && 'Present'}
                            {record.status === 'absent' && 'Absent'}
                            {record.status === 'early-leave' && (
                              <span className="flex items-center gap-1">
                                Present
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-warning/15 text-warning border border-warning/20">
                                  <Clock className="w-3 h-3" /> Early Leave
                                </span>
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Check In: {formatTime(record.checkInTime)}</p>
                        <p className="text-sm text-muted-foreground">Check Out: {formatTime(record.checkOutTime)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ── Payments Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="payments">
            <PaymentPanel
              playerId={playerId}
              playerName={player?.name}
              role={(user?.role as any) ?? 'player'}
              compact
            />
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
                <Button variant="outline" size="icon" onClick={copyInviteCode} className="shrink-0">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowInviteCodeDialog(false)} className="bg-primary hover:bg-primary/90">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
