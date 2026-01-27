import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoachSidebar } from './CoachSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useApp } from './AppContext';
import { Plus, Search, ChevronRight, CheckCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from './ui/checkbox';

type MatchStatus = 'draft' | 'squad-selected' | 'completed';

interface Match {
  id: string;
  opponent: string;
  date: string;
  venue: string;
  status: MatchStatus;
  squadIds: string[];
}

interface PlayerMatchStats {
  playerId: string;
  playerName: string;
  runs: number;
  wickets: number;
  stumps: number;
  oversBowled: number;
  runsConceded: number;
  sixes: number;
  fours: number;
  catches: number;
  isOut: boolean;
}

export function PlayerStatisticsScreen() {
  const navigate = useNavigate();
  const { players, setPlayers, matches, setMatches, matchStats, setMatchStats } = useApp();
  const [view, setView] = useState<'list' | 'create' | 'select-squad' | 'enter-stats'>('list');
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [currentStatPlayerId, setCurrentStatPlayerId] = useState<string | null>(null);

  // Match form state
  const [opponent, setOpponent] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [venue, setVenue] = useState('');

  // Player stats form state
  const [runs, setRuns] = useState('');
  const [wickets, setWickets] = useState('');
  const [stumps, setStumps] = useState('');
  const [oversBowled, setOversBowled] = useState('');
  const [runsConceded, setRunsConceded] = useState('');
  const [sixes, setSixes] = useState('');
  const [fours, setFours] = useState('');
  const [catches, setCatches] = useState('');
  const [isOut, setIsOut] = useState(false);

  const handleCreateMatch = () => {
    if (!opponent || !matchDate || !venue) {
      toast.error('Please fill in all match details');
      return;
    }

    const newMatch: Match = {
      id: `match-${Date.now()}`,
      opponent,
      date: matchDate,
      venue,
      status: 'draft',
      squadIds: []
    };

    setMatches([...matches, newMatch]);
    setCurrentMatch(newMatch);
    setView('select-squad');

    // Reset form
    setOpponent('');
    setMatchDate('');
    setVenue('');

    toast.success('Match created successfully!');
  };

  const togglePlayerSelection = (playerId: string) => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== playerId));
    } else {
      if (selectedPlayerIds.length >= 15) {
        toast.error('Maximum 15 players can be selected');
        return;
      }
      setSelectedPlayerIds([...selectedPlayerIds, playerId]);
    }
  };

  const handleConfirmSquad = () => {
    if (selectedPlayerIds.length === 0) {
      toast.error('Please select at least one player');
      return;
    }

    if (!currentMatch) return;

    const updatedMatch = {
      ...currentMatch,
      status: 'squad-selected' as MatchStatus,
      squadIds: selectedPlayerIds
    };

    setMatches(matches.map(m => m.id === currentMatch.id ? updatedMatch : m));
    setCurrentMatch(updatedMatch);
    setView('enter-stats');
    toast.success(`Squad confirmed with ${selectedPlayerIds.length} players`);
  };

  const handleSavePlayerStats = () => {
    if (!currentMatch || !currentStatPlayerId) return;

    const player = players.find(p => p.id === currentStatPlayerId);
    if (!player) return;

    // Validate and ensure no negative values
    const validateStat = (value: string) => {
      const num = parseFloat(value) || 0;
      return Math.max(0, num); // Ensure non-negative
    };

    const stats: PlayerMatchStats = {
      playerId: currentStatPlayerId,
      playerName: player.name,
      runs: validateStat(runs),
      wickets: validateStat(wickets),
      stumps: validateStat(stumps),
      oversBowled: validateStat(oversBowled),
      runsConceded: validateStat(runsConceded),
      sixes: validateStat(sixes),
      fours: validateStat(fours),
      catches: validateStat(catches),
      isOut
    };

    const matchStatsKey = currentMatch.id;
    const existingStats = matchStats[matchStatsKey] || [];
    const updatedStats = existingStats.filter(s => s.playerId !== currentStatPlayerId);
    updatedStats.push(stats);

    setMatchStats({
      ...matchStats,
      [matchStatsKey]: updatedStats
    });

    // Update player's overall stats by aggregating all match stats
    updatePlayerOverallStats(currentStatPlayerId, updatedStats, matchStatsKey);

    // Reset form
    setRuns('');
    setWickets('');
    setStumps('');
    setOversBowled('');
    setRunsConceded('');
    setSixes('');
    setFours('');
    setCatches('');
    setIsOut(false);
    setCurrentStatPlayerId(null);

    toast.success(`Stats saved for ${player.name}`);
  };

  const updatePlayerOverallStats = (playerId: string, currentMatchStats: PlayerMatchStats[], currentMatchId: string) => {
    // Get all stats for this player across all matches
    const allPlayerMatchStats: PlayerMatchStats[] = [];

    // Collect stats from all completed matches
    Object.keys(matchStats).forEach(matchId => {
      if (matchId === currentMatchId) {
        // Use the updated stats for current match
        const playerStats = currentMatchStats.find(s => s.playerId === playerId);
        if (playerStats) allPlayerMatchStats.push(playerStats);
      } else {
        const playerStats = matchStats[matchId]?.find(s => s.playerId === playerId);
        if (playerStats) allPlayerMatchStats.push(playerStats);
      }
    });

    // Calculate totals
    const totalMatches = allPlayerMatchStats.length;
    const totalRuns = allPlayerMatchStats.reduce((sum, s) => sum + s.runs, 0);
    const totalWickets = allPlayerMatchStats.reduce((sum, s) => sum + s.wickets, 0);
    const timesOut = allPlayerMatchStats.filter(s => s.isOut).length;

    // Calculate average (runs / times out, or runs if never out)
    const battingAverage = timesOut > 0 ? parseFloat((totalRuns / timesOut).toFixed(1)) : totalRuns;

    // Calculate strike rate (runs per 100 balls - we'll use a simplified version)
    const totalFours = allPlayerMatchStats.reduce((sum, s) => sum + s.fours, 0);
    const totalSixes = allPlayerMatchStats.reduce((sum, s) => sum + s.sixes, 0);
    const estimatedBalls = (totalFours * 1) + (totalSixes * 1) + ((totalRuns - (totalFours * 4) - (totalSixes * 6)) * 0.7);
    const strikeRate = estimatedBalls > 0 ? parseFloat(((totalRuns / estimatedBalls) * 100).toFixed(1)) : 0;

    // Calculate economy (runs conceded per over)
    const totalOvers = allPlayerMatchStats.reduce((sum, s) => sum + s.oversBowled, 0);
    const totalRunsConceded = allPlayerMatchStats.reduce((sum, s) => sum + s.runsConceded, 0);
    const economy = totalOvers > 0 ? parseFloat((totalRunsConceded / totalOvers).toFixed(1)) : 0;

    // Update player in the players array
    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          stats: {
            matches: totalMatches,
            runs: totalRuns,
            wickets: totalWickets,
            average: battingAverage,
            strikeRate: strikeRate,
            economy: economy
          }
        };
      }
      return p;
    });

    setPlayers(updatedPlayers);
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const squadPlayers = currentMatch?.squadIds.map(id => players.find(p => p.id === id)).filter(Boolean) || [];

  return (
    <div className="flex min-h-screen bg-background">
      <CoachSidebar />

      <div className="flex-1">
        <div className="border-b border-border bg-card">
          <div className="px-8 py-6">
            <h1>Player Statistics</h1>
            <p className="text-muted-foreground">Manage match statistics and player performance</p>
          </div>
        </div>

        <div className="p-8">
          {view === 'list' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2>Matches</h2>
                <Button
                  onClick={() => setView('create')}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Match
                </Button>
              </div>

              <div className="grid gap-4">
                {matches.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No matches created yet. Create your first match to start tracking player statistics.</p>
                  </Card>
                ) : (
                  matches.map((match) => (
                    <Card key={match.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="mb-2">vs {match.opponent}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(match.date).toLocaleDateString()} • {match.venue}
                          </p>
                          <div className="mt-2">
                            {match.status === 'draft' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground">
                                Draft
                              </span>
                            )}
                            {match.status === 'squad-selected' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                                Squad Selected ({match.squadIds.length} players)
                              </span>
                            )}
                            {match.status === 'completed' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-success/10 text-success">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setCurrentMatch(match);
                            if (match.status === 'draft') {
                              setSelectedPlayerIds([]);
                              setView('select-squad');
                            } else {
                              setView('enter-stats');
                            }
                          }}
                        >
                          {match.status === 'draft' ? 'Select Squad' : 'Enter Stats'}
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-2xl">
              <Button
                variant="ghost"
                onClick={() => setView('list')}
                className="mb-6"
              >
                ← Back to Matches
              </Button>

              <Card className="p-6">
                <h2 className="mb-6">Create New Match</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="opponent">Opponent Team</Label>
                    <Input
                      id="opponent"
                      placeholder="Enter opponent team name"
                      value={opponent}
                      onChange={(e) => setOpponent(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Match Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue</Label>
                    <Input
                      id="venue"
                      placeholder="Enter match venue"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleCreateMatch}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Save and Select Squad
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setView('list')}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {view === 'select-squad' && currentMatch && (
            <div>
              <Button
                variant="ghost"
                onClick={() => {
                  setView('list');
                  setCurrentMatch(null);
                  setSelectedPlayerIds([]);
                }}
                className="mb-6"
              >
                ← Back to Matches
              </Button>

              <Card className="p-6 mb-6">
                <h2 className="mb-2">Select Squad for Match</h2>
                <p className="text-muted-foreground mb-4">
                  vs {currentMatch.opponent} • {new Date(currentMatch.date).toLocaleDateString()} • {currentMatch.venue}
                </p>
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedPlayerIds.length} / 15 players
                </p>
              </Card>

              <Card className="p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search players..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={handleConfirmSquad}
                    disabled={selectedPlayerIds.length === 0}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Squad & Enter Stats
                  </Button>
                </div>

                <div className="space-y-2">
                  {filteredPlayers.map((player) => {
                    const isSelected = selectedPlayerIds.includes(player.id);
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted'
                          }`}
                        onClick={() => togglePlayerSelection(player.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePlayerSelection(player.id)}
                        />
                        <img
                          src={player.photo}
                          alt={player.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p>{player.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Age {player.age} • {player.role}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {view === 'enter-stats' && currentMatch && (
            <div>
              <Button
                variant="ghost"
                onClick={() => {
                  setView('list');
                  setCurrentMatch(null);
                  setCurrentStatPlayerId(null);
                }}
                className="mb-6"
              >
                ← Back to Matches
              </Button>

              <Card className="p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="mb-2">Enter Match Statistics</h2>
                    <p className="text-muted-foreground">
                      vs {currentMatch.opponent} • {new Date(currentMatch.date).toLocaleDateString()} • {currentMatch.venue}
                    </p>
                  </div>
                  {currentMatch.status !== 'completed' && (
                    <Button
                      onClick={() => {
                        const updatedMatch = { ...currentMatch, status: 'completed' as MatchStatus };
                        setMatches(matches.map(m => m.id === currentMatch.id ? updatedMatch : m));
                        setCurrentMatch(updatedMatch);
                        toast.success('Match marked as completed!');
                      }}
                      className="bg-success hover:bg-success/90 text-success-foreground"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Match
                    </Button>
                  )}
                  {currentMatch.status === 'completed' && (
                    <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm bg-success/10 text-success border border-success/20">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Match Completed
                    </span>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Squad List */}
                <Card className="p-6">
                  <h3 className="mb-4">Squad ({squadPlayers.length} players)</h3>
                  <div className="space-y-2">
                    {squadPlayers.map((player) => {
                      if (!player) return null;
                      const hasStats = matchStats[currentMatch.id]?.some(s => s.playerId === player.id);
                      const isActive = currentStatPlayerId === player.id;

                      return (
                        <div
                          key={player.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${isActive
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted'
                            }`}
                          onClick={() => {
                            setCurrentStatPlayerId(player.id);
                            // Load existing stats if available
                            const existingStats = matchStats[currentMatch.id]?.find(s => s.playerId === player.id);
                            if (existingStats) {
                              setRuns(existingStats.runs.toString());
                              setWickets(existingStats.wickets.toString());
                              setStumps(existingStats.stumps.toString());
                              setOversBowled(existingStats.oversBowled.toString());
                              setRunsConceded(existingStats.runsConceded.toString());
                              setSixes(existingStats.sixes.toString());
                              setFours(existingStats.fours.toString());
                              setCatches(existingStats.catches.toString());
                              setIsOut(existingStats.isOut);
                            }
                          }}
                        >
                          <img
                            src={player.photo}
                            alt={player.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <p className="text-sm">{player.name}</p>
                            <p className="text-xs text-muted-foreground">{player.role}</p>
                          </div>
                          {hasStats && (
                            <CheckCircle className="w-4 h-4 text-success" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Stats Entry Form */}
                <Card className="p-6 lg:col-span-2">
                  {currentStatPlayerId ? (
                    <>
                      <h3 className="mb-6">
                        Enter Stats for {players.find(p => p.id === currentStatPlayerId)?.name}
                      </h3>

                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="runs">Runs Scored</Label>
                            <Input
                              id="runs"
                              type="number"
                              min="0"
                              placeholder="0"
                              value={runs}
                              onChange={(e) => setRuns(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="wickets">Wickets Taken</Label>
                            <Input
                              id="wickets"
                              type="number"
                              min="0"
                              placeholder="0"
                              value={wickets}
                              onChange={(e) => setWickets(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="fours">Fours (4s)</Label>
                            <Input
                              id="fours"
                              type="number"
                              min="0"
                              placeholder="0"
                              value={fours}
                              onChange={(e) => setFours(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="sixes">Sixes (6s)</Label>
                            <Input
                              id="sixes"
                              type="number"
                              min="0"
                              placeholder="0"
                              value={sixes}
                              onChange={(e) => setSixes(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="overs">Overs Bowled</Label>
                            <Input
                              id="overs"
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="0"
                              value={oversBowled}
                              onChange={(e) => setOversBowled(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="runs-conceded">Runs Conceded</Label>
                            <Input
                              id="runs-conceded"
                              type="number"
                              min="0"
                              placeholder="0"
                              value={runsConceded}
                              onChange={(e) => setRunsConceded(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="catches">Catches</Label>
                            <Input
                              id="catches"
                              type="number"
                              min="0"
                              placeholder="0"
                              value={catches}
                              onChange={(e) => setCatches(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="stumps">Stumpings</Label>
                            <Input
                              id="stumps"
                              type="number"
                              min="0"
                              placeholder="0"
                              value={stumps}
                              onChange={(e) => setStumps(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="isOut"
                            checked={isOut}
                            onCheckedChange={(checked) => setIsOut(checked as boolean)}
                          />
                          <Label htmlFor="isOut" className="cursor-pointer">
                            Player was out
                          </Label>
                        </div>

                        <Button
                          onClick={handleSavePlayerStats}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Player Stats
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        Select a player from the squad to enter their statistics
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
