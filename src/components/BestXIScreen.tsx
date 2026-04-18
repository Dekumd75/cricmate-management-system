import { useState } from 'react';
import { CoachSidebar } from './CoachSidebar';
import { AdminSidebar } from './AdminSidebar';
import { useApp } from './AppContext';
import api from '../services/api';
import {
  Sparkles, Loader2, ChevronLeft, Users, Zap,
  TrendingUp, Award, Shield, Wind, Droplets, Sun, Layers,
  Target, BarChart2, Star
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface RecentStats {
  matchesInWindow: number;
  runs: number;
  wickets: number;
  battingAvg: string;
  strikeRate: string;
  economy: string;
  overs: number;
}

interface XIPlayer {
  position: number;
  playerId: number;
  playerName: string;
  selectedAs: string;
  role: string;
  bowlingStyle: string;
  battingStyle: string;
  battingPosition?: string | null;
  photo: string | null;
  aiScore: number;
  batsmanScore: number;
  bowlerScore: number;
  pitchBoost: number;
  rationale: string;
  recentStats: RecentStats;
  experience: { totalMatches: number };
}

interface BestXIResult {
  xi: XIPlayer[];
  matchesAnalyzed: number;
  config: {
    batsmen: number;
    bowlers: number;
    allRounders: number;
    wicketKeepers: number;
    pitchCondition: string;
  };
  generatedAt: string;
}

type PitchCondition = 'Flat' | 'Green' | 'Dusty' | 'Wet';

interface LineupConfig {
  batsmen: number;
  allRounders: number;
  bowlers: number;
  pitchCondition: PitchCondition;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PITCH_OPTIONS: { value: PitchCondition; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { value: 'Flat', label: 'Flat',  icon: <Sun size={18}/>,       desc: 'Batters paradise', color: '#f59e0b' },
  { value: 'Green', label: 'Green', icon: <Wind size={18}/>,      desc: 'Seam & swing',     color: '#22c55e' },
  { value: 'Dusty', label: 'Dusty', icon: <Layers size={18}/>,    desc: 'Spin friendly',    color: '#d97706' },
  { value: 'Wet',   label: 'Wet',   icon: <Droplets size={18}/>,  desc: 'Slower surface',   color: '#3b82f6' },
];

const PRESETS = [
  { label: '7-4 Lineup', desc: '4 bat + 2 AR + 1 WK + 4 bowl', batsmen: 4, allRounders: 2, bowlers: 4 },
  { label: '6-5 Lineup', desc: '4 bat + 1 AR + 1 WK + 5 bowl', batsmen: 4, allRounders: 1, bowlers: 5 },
  { label: 'Attacking',  desc: '5 bat + 1 AR + 1 WK + 4 bowl', batsmen: 5, allRounders: 1, bowlers: 4 },
  { label: 'Defensive',  desc: '3 bat + 2 AR + 1 WK + 5 bowl', batsmen: 3, allRounders: 2, bowlers: 5 },
];

// ─── Role colour helpers ───────────────────────────────────────────────────────
const roleColor = (role: string): string => {
  const r = role.toLowerCase();
  if (r.includes('keeper'))    return '#8b5cf6';
  if (r.includes('batsman') || r.includes('batter')) return '#f59e0b';
  if (r.includes('all'))       return '#22c55e';
  if (r.includes('bowler') || r.includes('pacer') || r.includes('spinner')) return '#3b82f6';
  return '#6b7280';
};

const roleIcon = (role: string) => {
  const r = role.toLowerCase();
  if (r.includes('keeper'))    return <Shield size={12}/>;
  if (r.includes('batsman') || r.includes('batter')) return <Target size={12}/>;
  if (r.includes('all'))       return <Zap size={12}/>;
  if (r.includes('bowler') || r.includes('pacer') || r.includes('spinner')) return <Wind size={12}/>;
  return <Users size={12}/>;
};

// Circular progress ring
function ScoreRing({ score, size = 56, stroke = 5, color }: { score: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
    </svg>
  );
}

// ─── Player Card ──────────────────────────────────────────────────────────────
function PlayerCard({ player, index }: { player: XIPlayer; index: number }) {
  const color = roleColor(player.selectedAs);
  const isBowler = player.selectedAs.toLowerCase().includes('bowl');
  const scoreToShow = isBowler ? player.bowlerScore : player.batsmanScore;

  return (
    <div
      className="best-xi-player-card"
      style={{
        background: 'var(--card)',
        border: `1px solid var(--border)`,
        borderRadius: '14px',
        padding: '18px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        animationDelay: `${index * 60}ms`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px ${color}22`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Position badge */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: `${color}22`, border: `1px solid ${color}44`,
        borderRadius: '6px', padding: '2px 8px',
        fontSize: '11px', fontWeight: 700, color,
      }}>#{player.position}</div>

      {/* Top row: avatar + score ring + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        {/* Avatar + ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ScoreRing score={scoreToShow} size={56} stroke={4} color={color}/>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {player.photo ? (
              <img src={player.photo} alt={player.playerName}
                   style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}/>
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: `${color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', fontWeight: 700, color,
              }}>
                {player.playerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Name + role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--foreground)', marginBottom: '3px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.playerName}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: `${color}22`, border: `1px solid ${color}44`,
            borderRadius: '20px', padding: '2px 8px',
            fontSize: '11px', fontWeight: 600, color,
          }}>
            {roleIcon(player.selectedAs)}
            {player.selectedAs}
          </div>
          {/* Batting position badge */}
          {player.battingPosition && (
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'var(--muted)', border: '1px solid var(--border)',
              borderRadius: '4px', padding: '1px 6px', marginTop: '3px',
              fontSize: '10px', fontWeight: 600, color: 'var(--muted-foreground)',
            }}>
              🏱 {player.battingPosition}
            </div>
          )}
          {/* AI score text */}
          <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '3px' }}>
            AI Score: <span style={{ color, fontWeight: 700 }}>{scoreToShow}</span>/100
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px', marginBottom: '12px',
      }}>
        {[
          { label: 'Runs', value: player.recentStats.runs },
          { label: 'Wkts', value: player.recentStats.wickets },
          { label: player.recentStats.economy !== 'N/A' ? 'Econ' : 'Avg',
            value: player.recentStats.economy !== 'N/A' ? player.recentStats.economy : player.recentStats.battingAvg },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--muted)', borderRadius: '8px',
            padding: '6px 4px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--foreground)' }}>{stat.value}</div>
            <div style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Pitch boost badge */}
      {player.pitchBoost > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '6px', padding: '4px 8px', marginBottom: '10px',
          fontSize: '11px', color: '#22c55e', fontWeight: 600,
        }}>
          <TrendingUp size={11}/> +{player.pitchBoost} pitch condition bonus
        </div>
      )}

      {/* Rationale */}
      <div style={{
        background: 'var(--muted)', borderRadius: '8px',
        padding: '8px 10px', borderLeft: `3px solid ${color}`,
      }}>
        <div style={{ fontSize: '10px', color: 'var(--muted-foreground)', marginBottom: '3px', fontWeight: 600 }}>
          AI RATIONALE
        </div>
        <div style={{ fontSize: '11px', color: 'var(--foreground)', lineHeight: 1.5 }}>
          {player.rationale}
        </div>
      </div>

      {/* Experience */}
      <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--muted-foreground)', textAlign: 'right' }}>
        {player.experience.totalMatches} career matches · {player.recentStats.matchesInWindow} in window
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function BestXIScreen() {
  const { user } = useApp();

  const [step, setStep] = useState<'config' | 'loading' | 'result'>('config');
  const [config, setConfig] = useState<LineupConfig>({
    batsmen: 5, allRounders: 1, bowlers: 4, pitchCondition: 'Flat',
  });
  const [result, setResult] = useState<BestXIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('Fetching recent match data...');

  const total = config.batsmen + config.allRounders + config.bowlers + 1; // +1 WK

  const applyPreset = (p: typeof PRESETS[0]) => {
    setConfig(c => ({ ...c, batsmen: p.batsmen, allRounders: p.allRounders, bowlers: p.bowlers }));
  };

  const generateBestXI = async () => {
    setError(null);
    setStep('loading');
    const msgs = [
      'Fetching recent match data...',
      'Calculating batting scores...',
      'Evaluating bowling performances...',
      'Applying pitch condition modifiers...',
      'Finalising team selection...',
    ];
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < msgs.length) setLoadingMsg(msgs[i]);
    }, 600);

    try {
      const response = await api.post<BestXIResult>('/coach/best-xi', {
        batsmen: config.batsmen,
        bowlers: config.bowlers,
        allRounders: config.allRounders,
        pitchCondition: config.pitchCondition,
      });
      clearInterval(interval);
      setResult(response.data);
      setStep('result');
    } catch (err: unknown) {
      clearInterval(interval);
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message || 'Failed to generate Best XI — check the server is running';
      setError(msg);
      setStep('config');
    }
  };

  const getSidebar = () =>
    user?.role === 'admin' ? <AdminSidebar /> : <CoachSidebar />;

  // ─── Group players by role for result display
  const grouped = result ? {
    'Wicket-keeper': result.xi.filter(p => p.selectedAs.toLowerCase().includes('keeper')),
    'Batsmen':       result.xi.filter(p => p.selectedAs === 'Batsman'),
    'All-rounders':  result.xi.filter(p => p.selectedAs === 'All-rounder'),
    'Bowlers':       result.xi.filter(p => p.selectedAs === 'Bowler'),
    'Flexible':      result.xi.filter(p => p.selectedAs === 'Flexible'),
  } : {};

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {getSidebar()}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* ── Header ──────────────────────────────────────────────── */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={22} color="white"/>
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--foreground)' }}>
                  AI Best XI
                </h1>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)' }}>
                  Data-driven team selection from last {result?.matchesAnalyzed ?? 10} matches
                </p>
              </div>
            </div>
          </div>

          {/* ── CONFIG STEP ─────────────────────────────────────────── */}
          {step === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '10px', padding: '12px 16px', color: '#ef4444', fontSize: '14px',
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Presets */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '14px', padding: '22px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '14px',
                  letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Lineup Presets
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                  {PRESETS.map(p => {
                    const isActive = config.batsmen === p.batsmen &&
                      config.allRounders === p.allRounders && config.bowlers === p.bowlers;
                    return (
                      <button
                        key={p.label}
                        onClick={() => applyPreset(p)}
                        style={{
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))'
                            : 'var(--muted)',
                          border: isActive ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--border)',
                          borderRadius: '10px', padding: '14px 16px',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: 700,
                          color: isActive ? '#6366f1' : 'var(--foreground)', marginBottom: '4px' }}>
                          {p.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role sliders */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '14px', padding: '22px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '18px',
                  letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Custom Role Counts
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '18px' }}>
                  {[
                    { key: 'wicketKeeper', label: 'Wicket-keeper', icon: <Shield size={16}/>, color: '#8b5cf6', fixed: true, value: 1 },
                    { key: 'batsmen',      label: 'Batsmen',       icon: <Target size={16}/>, color: '#f59e0b', fixed: false, value: config.batsmen },
                    { key: 'allRounders', label: 'All-rounders',  icon: <Zap size={16}/>,    color: '#22c55e', fixed: false, value: config.allRounders },
                    { key: 'bowlers',      label: 'Bowlers',       icon: <Wind size={16}/>,   color: '#3b82f6', fixed: false, value: config.bowlers },
                  ].map(item => (
                    <div key={item.key}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: item.color, fontSize: '13px', fontWeight: 600 }}>
                          {item.icon} {item.label}
                        </div>
                        <div style={{
                          background: `${item.color}22`, border: `1px solid ${item.color}44`,
                          borderRadius: '6px', padding: '2px 10px',
                          fontSize: '16px', fontWeight: 800, color: item.color,
                        }}>
                          {item.value}
                        </div>
                      </div>
                      {!item.fixed && (
                        <input
                          type="range" min={0} max={7} value={item.value}
                          onChange={e => setConfig(c => ({ ...c, [item.key]: parseInt(e.target.value) }))}
                          style={{ width: '100%', accentColor: item.color, cursor: 'pointer' }}
                        />
                      )}
                      {item.fixed && (
                        <div style={{ height: '4px', background: `${item.color}33`, borderRadius: '2px',
                          position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0,
                            width: '100%', background: item.color, borderRadius: '2px' }}/>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total validation */}
                <div style={{
                  marginTop: '18px', padding: '12px 16px', borderRadius: '10px',
                  background: total === 11 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${total === 11 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '13px', color: total === 11 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                    {total === 11 ? '✓ Team total: 11 players' : `⚠️ Team total: ${total}/11 — adjust counts above`}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                    {config.batsmen}B + {config.allRounders}AR + 1WK + {config.bowlers}bow
                  </span>
                </div>
              </div>

              {/* Pitch condition */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '14px', padding: '22px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '14px',
                  letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Pitch Condition
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--muted-foreground)', textTransform: 'none', fontWeight: 400 }}>
                    (affects bowler selection only)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {PITCH_OPTIONS.map(opt => {
                    const active = config.pitchCondition === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setConfig(c => ({ ...c, pitchCondition: opt.value }))}
                        style={{
                          background: active ? `${opt.color}18` : 'var(--muted)',
                          border: active ? `1px solid ${opt.color}80` : '1px solid var(--border)',
                          borderRadius: '10px', padding: '14px 10px',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                        }}
                      >
                        <span style={{ color: active ? opt.color : 'var(--muted-foreground)' }}>{opt.icon}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: active ? opt.color : 'var(--foreground)' }}>
                          {opt.label}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={generateBestXI}
                disabled={total !== 11}
                style={{
                  background: total === 11
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'var(--muted)',
                  border: 'none', borderRadius: '12px',
                  padding: '16px 32px', cursor: total === 11 ? 'pointer' : 'not-allowed',
                  fontSize: '16px', fontWeight: 700, color: total === 11 ? 'white' : 'var(--muted-foreground)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  boxShadow: total === 11 ? '0 8px 32px rgba(99,102,241,0.35)' : 'none',
                  transition: 'all 0.2s ease',
                  width: '100%',
                }}
              >
                <Sparkles size={20}/>
                Generate AI Best XI
              </button>
            </div>
          )}

          {/* ── LOADING STEP ─────────────────────────────────────────── */}
          {step === 'loading' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: '60vh', gap: '24px',
            }}>
              <div style={{ position: 'relative', width: 90, height: 90 }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  opacity: 0.15, animation: 'pulse 1.5s ease-in-out infinite',
                }}/>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Loader2 size={36} color="#8b5cf6"
                    style={{ animation: 'spin 1s linear infinite' }}/>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '8px' }}>
                  Analysing Player Data
                </div>
                <div style={{ fontSize: '14px', color: '#6366f1' }}>{loadingMsg}</div>
              </div>
              <div style={{ width: 280, height: 4, background: 'var(--muted)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  borderRadius: '2px', animation: 'loading-bar 3s ease-in-out infinite',
                }}/>
              </div>
            </div>
          )}

          {/* ── RESULT STEP ──────────────────────────────────────────── */}
          {step === 'result' && result && (
            <>
              {/* Result header bar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '28px', flexWrap: 'wrap', gap: '12px',
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--foreground)', marginBottom: '4px' }}>
                    Recommended Best XI
                  </h2>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {[
                      { icon: <BarChart2 size={12}/>, text: `${result.matchesAnalyzed} matches analysed` },
                      { icon: <Award size={12}/>, text: result.config.pitchCondition + ' pitch' },
                      { icon: <Star size={12}/>, text: `${result.config.batsmen}B + ${result.config.allRounders}AR + 1WK + ${result.config.bowlers}bow` },
                    ].map(badge => (
                      <div key={badge.text} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '12px', color: '#6366f1',
                      }}>
                        {badge.icon} {badge.text}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setStep('config')}
                    style={{
                      background: 'var(--muted)', border: '1px solid var(--border)',
                      borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                      color: 'var(--foreground)', fontSize: '13px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <ChevronLeft size={15}/> Back
                  </button>
                  <button
                    onClick={generateBestXI}
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                      color: 'white', fontSize: '13px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <Sparkles size={13}/> Regenerate
                  </button>
                </div>
              </div>

              {/* Grouped player cards */}
              {Object.entries(grouped).map(([groupName, players]) => {
                if (!players || players.length === 0) return null;
                const gColor = roleColor(players[0].selectedAs);
                return (
                  <div key={groupName} style={{ marginBottom: '32px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px',
                    }}>
                      <div style={{
                        width: 3, height: 20, background: gColor, borderRadius: '2px',
                      }}/>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: gColor }}>
                        {groupName}
                      </span>
                      <span style={{
                        background: `${gColor}22`, border: `1px solid ${gColor}44`,
                        borderRadius: '20px', padding: '1px 8px',
                        fontSize: '11px', color: gColor, fontWeight: 600,
                      }}>
                        {players.length}
                      </span>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                      gap: '14px',
                    }}>
                      {players.map((p: XIPlayer, i: number) => (
                        <PlayerCard key={p.playerId} player={p} index={i}/>
                      ))}
                    </div>
                  </div>
                );
              })}

              {result.matchesAnalyzed === 0 && (
                <div style={{
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '10px', padding: '16px 20px',
                  color: '#f59e0b', fontSize: '13px', marginTop: '8px',
                }}>
                  ⚠️ No completed matches found. Players selected purely on experience (matches played).
                  Add match data for better AI accuracy.
                </div>
              )}
            </>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
