import { useState, useEffect } from 'react';
import { CoachSidebar } from './CoachSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { useApp } from './AppContext';
import { Plus, Search, ChevronRight, CheckCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from './ui/checkbox';
import api from '../services/api';
import matchService from '../services/matchService';
import opponentService from '../services/opponentService';

type MatchStatus = 'draft' | 'squad-selected' | 'completed';

interface Match {
  id: string;
  opponent: string;
  date: string;
  venue: string;
  matchType?: 'Practice match' | 'Tournament match';
  result?: 'Won' | 'Lost' | 'Draw' | 'No Result';
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
  const { players, setPlayers, matches, setMatches, matchStats, setMatchStats } = useApp();
  const [view, setView] = useState<'list' | 'create' | 'select-squad' | 'enter-stats'>('list');
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [currentStatPlayerId, setCurrentStatPlayerId] = useState<string | null>(null);

  // Real players from database
  const [realPlayers, setRealPlayers] = useState<any[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);

  // Opponents from database
  const [opponents, setOpponents] = useState<any[]>([]);
  const [isLoadingOpponents, setIsLoadingOpponents] = useState(true);
  const [showAddOpponentDialog, setShowAddOpponentDialog] = useState(false);
  const [newOpponentName, setNewOpponentName] = useState('');
  const [newOpponentPhone, setNewOpponentPhone] = useState('');

  // Match form state
  const [opponent, setOpponent] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [venue, setVenue] = useState('');
  const [matchType, setMatchType] = useState<'Practice match' | 'Tournament match'>('Practice match');
  const [result, setResult] = useState<'Won' | 'Lost' | 'Draw' | 'No Result'>('No Result');

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


  // Fetch real players from database
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setIsLoadingPlayers(true);
        const response = await api.get('/coach/players');
        // Backend returns { players: [...] }, not direct array
        const playersData = response.data.players.map((p: any) => ({
          id: p.id.toString(),
          name: p.name,
          photo: p.photo || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400',
          age: p.age || 0,
          role: p.role || 'Player',
          stats: p.stats || {
            matches: 0,
            runs: 0,
            wickets: 0,
            average: 0,
            strikeRate: 0,
            economy: 0
          }
        }));
        setRealPlayers(playersData);
      } catch (error) {
        console.error('Error fetching players:', error);
        toast.error('Failed to load players');
      } finally {
        setIsLoadingPlayers(false);
      }
    };

    fetchPlayers();
  }, []);

  // Fetch opponents from database
  useEffect(() => {
    const fetchOpponents = async () => {
      try {
        setIsLoadingOpponents(true);
        const opponents = await opponentService.getAllOpponents();
        setOpponents(opponents.map((opp: any) => ({
          id: opp.opponentID.toString(),
          name: opp.opponentName,
          phone: opp.contactInfo || ''
        })));
      } catch (error) {
        console.error('Error fetching opponents:', error);
        toast.error('Failed to load opponents');
      } finally {
        setIsLoadingOpponents(false);
      }
    };

    fetchOpponents();
  }, []);

  // Fetch matches from database
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const fetchedMatches = await matchService.getAllMatches();
        // Transform backend matches to frontend format
        const transformedMatches = fetchedMatches.map((match: any) => {
          // Parse squadIds if it's a JSON string
          let parsedSquadIds = match.squadIds || [];
          if (typeof parsedSquadIds === 'string') {
            try {
              parsedSquadIds = JSON.parse(parsedSquadIds);
            } catch (e) {
              console.error('Failed to parse squadIds:', e);
              parsedSquadIds = [];
            }
          }
          // Ensure it's an array
          if (!Array.isArray(parsedSquadIds)) {
            parsedSquadIds = [];
          }

          return {
            id: match.matchID.toString(),
            opponent: match.opponent?.opponentName || 'Unknown',
            date: match.matchDate,
            venue: match.venue,
            matchType: match.matchType as 'Practice match' | 'Tournament match',
            result: match.result as 'Won' | 'Lost' | 'Draw' | 'No Result' | undefined,
            status: match.status === 'completed' ? 'completed' as MatchStatus :
              match.status === 'squad-confirmed' ? 'squad-selected' as MatchStatus :
                'draft' as MatchStatus,
            squadIds: parsedSquadIds
          };
        });
        setMatches(transformedMatches);
      } catch (error) {
        console.error('Error fetching matches:', error);
        toast.error('Failed to load matches');
      }
    };

    fetchMatches();
  }, []);

  // Fetch match stats when entering stats view
  useEffect(() => {
    if (view === 'enter-stats' && currentMatch) {
      const fetchStats = async () => {
        try {
          const stats = await matchService.getMatchStats(parseInt(currentMatch.id));

          // Transform stats to the format used by matchStats state
          const statsById: { [matchId: string]: any[] } = {};
          statsById[currentMatch.id] = stats.map((stat: any) => ({
            playerId: stat.playerUserID.toString(),
            runs: stat.runsScored || 0,
            wickets: stat.wicketsTaken || 0,
            stumps: stat.stumping || 0,
            oversBowled: stat.oversBowled || 0,
            runsConceded: stat.runsConceded || 0,
            sixes: stat.sixes || 0,
            fours: stat.fours || 0,
            catches: stat.catches || 0,
            isOut: stat.wasOut || false
          }));

          setMatchStats({ ...matchStats, ...statsById } as any);
        } catch (error) {
          console.error('Error fetching match stats:', error);
        }
      };

      fetchStats();
    }
  }, [view, currentMatch]);

  const handleAddOpponent = async () => {
    if (!newOpponentName) {
      toast.error('Please provide opponent name');
      return;
    }

    try {
      const response = await opponentService.createOpponent(newOpponentName, newOpponentPhone);
      const newOpponent = {
        id: response.opponent.opponentID.toString(),
        name: response.opponent.opponentName,
        phone: response.opponent.contactInfo || ''
      };

      setOpponents([...opponents, newOpponent]);
      setOpponent(newOpponentName); // Select the newly added opponent

      // Reset form and close dialog
      setNewOpponentName('');
      setNewOpponentPhone('');
      setShowAddOpponentDialog(false);

      toast.success(`Opponent "${newOpponentName}" added successfully!`);
    } catch (error: any) {
      console.error('Error adding opponent:', error);
      toast.error(error.response?.data?.message || 'Failed to add opponent');
    }
  };

  const handleCreateMatch = async () => {
    if (!opponent || !matchDate || !venue) {
      toast.error('Please fill in all match details');
      return;
    }

    // Validate that match date is not in the future
    const selectedDate = new Date(matchDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      toast.error('Match date cannot be in the future');
      return;
    }

    try {
      const response = await matchService.createMatch({
        opponent,
        date: matchDate,
        venue,
        matchType,
        result
      });

      const newMatch: Match = {
        id: response.match.matchID.toString(),
        opponent: response.match.opponent.opponentName,
        date: response.match.matchDate,
        venue: response.match.venue,
        matchType: response.match.matchType,
        result,
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
      setMatchType('Practice match');
      setResult('No Result');

      toast.success('Match created successfully!');
    } catch (error: any) {
      console.error('Error creating match:', error);
      toast.error(error.response?.data?.message || 'Failed to create match');
    }
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

  const handleConfirmSquad = async () => {
    if (selectedPlayerIds.length === 0) {
      toast.error('Please select at least one player');
      return;
    }

    if (!currentMatch) return;

    try {
      await matchService.confirmSquad(
        parseInt(currentMatch.id),
        selectedPlayerIds.map(id => parseInt(id))
      );

      const updatedMatch = {
        ...currentMatch,
        status: 'squad-selected' as MatchStatus,
        squadIds: selectedPlayerIds
      };

      setMatches(matches.map(m => m.id === currentMatch.id ? updatedMatch : m));
      setCurrentMatch(updatedMatch);
      setView('enter-stats');
      toast.success(`Squad confirmed with ${selectedPlayerIds.length} players`);
    } catch (error: any) {
      console.error('Error confirming squad:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm squad');
    }
  };

  const handleSavePlayerStats = async () => {
    if (!currentMatch || !currentStatPlayerId) return;

    const player = realPlayers.find(p => p.id === currentStatPlayerId);
    if (!player) return;

    // Validate and ensure no negative values
    const validateStat = (value: string) => {
      const num = parseFloat(value) || 0;
      return Math.max(0, num); // Ensure non-negative
    };

    const validatedRuns = validateStat(runs);
    const validatedWickets = validateStat(wickets);
    const validatedStumps = validateStat(stumps);
    const validatedOversBowled = validateStat(oversBowled);
    const validatedRunsConceded = validateStat(runsConceded);
    const validatedSixes = validateStat(sixes);
    const validatedFours = validateStat(fours);
    const validatedCatches = validateStat(catches);

    // Business Logic Validations
    if (validatedWickets > 10) {
      toast.error('Wickets taken cannot be greater than 10');
      return;
    }
    if ((validatedFours * 4) + (validatedSixes * 6) > validatedRuns) {
      toast.error('Runs from boundaries cannot exceed total runs');
      return;
    }

    const stats: PlayerMatchStats = {
      playerId: currentStatPlayerId,
      playerName: player.name,
      runs: validatedRuns,
      wickets: validatedWickets,
      stumps: validatedStumps,
      oversBowled: validatedOversBowled,
      runsConceded: validatedRunsConceded,
      sixes: validatedSixes,
      fours: validatedFours,
      catches: validatedCatches,
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

    // Save to backend - collect all stats for this match
    try {
      const allPlayerStats = updatedStats.map(s => ({
        playerId: parseInt(s.playerId),
        runs: s.runs,
        wickets: s.wickets,
        stumps: s.stumps,
        oversBowled: s.oversBowled,
        runsConceded: s.runsConceded,
        sixes: s.sixes,
        fours: s.fours,
        catches: s.catches,
        isOut: s.isOut
      }));

      await matchService.updateMatchStats(
        parseInt(currentMatch.id),
        allPlayerStats,
        result
      );

      // Update player's overall stats by aggregating all match stats
      updatePlayerOverallStats(currentStatPlayerId, updatedStats, matchStatsKey);
    } catch (error: any) {
      console.error('Error saving stats:', error);
      toast.error(error.response?.data?.message || 'Failed to save statistics');
      return;
    }

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

  const handleRunsChange = (val: string) => {
    if (val === '') {
      setRuns('');
      return;
    }
    const newRuns = parseInt(val);
    if (!isNaN(newRuns) && newRuns >= 0) {
      setRuns(newRuns.toString());
      // Adjust boundaries if they exceed the new total runs
      const currentFoursRuns = (parseInt(fours) || 0) * 4;
      const currentSixesRuns = (parseInt(sixes) || 0) * 6;
      if (currentFoursRuns + currentSixesRuns > newRuns) {
        setFours('');
        setSixes('');
        toast.info("Boundaries reset because runs were reduced", { id: 'bounds-reset' });
      }
    }
  };

  const handleFoursChange = (val: string) => {
    if (val === '') { setFours(''); return; }
    const currentRuns = parseInt(runs) || 0;
    const currentSixesRuns = (parseInt(sixes) || 0) * 6;
    const newFours = parseInt(val);
    if (isNaN(newFours) || newFours < 0) return;
    
    if ((newFours * 4) + currentSixesRuns > currentRuns) {
      toast.error('Runs from boundaries cannot exceed total runs', { id: 'runs-error' });
      const maxFours = Math.floor((currentRuns - currentSixesRuns) / 4);
      setFours(Math.max(0, maxFours).toString());
    } else {
      setFours(newFours.toString());
    }
  };

  const handleSixesChange = (val: string) => {
    if (val === '') { setSixes(''); return; }
    const currentRuns = parseInt(runs) || 0;
    const currentFoursRuns = (parseInt(fours) || 0) * 4;
    const newSixes = parseInt(val);
    if (isNaN(newSixes) || newSixes < 0) return;
    
    if ((newSixes * 6) + currentFoursRuns > currentRuns) {
      toast.error('Runs from boundaries cannot exceed total runs', { id: 'runs-error' });
      const maxSixes = Math.floor((currentRuns - currentFoursRuns) / 6);
      setSixes(Math.max(0, maxSixes).toString());
    } else {
      setSixes(newSixes.toString());
    }
  };

  const handleWicketsChange = (val: string) => {
    if (val === '') { setWickets(''); return; }
    const newWickets = parseInt(val);
    if (isNaN(newWickets) || newWickets < 0) return;
    if (newWickets > 10) {
      toast.error('Wickets cannot be greater than 10', { id: 'wickets-error' });
      setWickets('10');
    } else {
      setWickets(newWickets.toString());
    }
  };

  const handleCatchesChange = (val: string) => {
    if (val === '') { setCatches(''); return; }
    const newCatches = parseInt(val);
    if (isNaN(newCatches) || newCatches < 0) return;
    if (newCatches > 10) {
      toast.error('Catches cannot be greater than 10', { id: 'catches-error' });
      setCatches('10');
    } else {
      setCatches(newCatches.toString());
    }
  };

  const handleStumpsChange = (val: string) => {
    if (val === '') { setStumps(''); return; }
    const newStumps = parseInt(val);
    if (isNaN(newStumps) || newStumps < 0) return;
    if (newStumps > 10) {
      toast.error('Stumpings cannot be greater than 10', { id: 'stumps-error' });
      setStumps('10');
    } else {
      setStumps(newStumps.toString());
    }
  };

  const handleOversChange = (val: string) => {
    if (val === '') { setOversBowled(''); return; }
    
    if (val.includes('.')) {
      const parts = val.split('.');
      if (parts[1].length > 0) {
        let balls = parseInt(parts[1]);
        let overs = parseInt(parts[0] || '0');
        if (balls >= 6) {
          overs += Math.floor(balls / 6);
          balls = balls % 6;
          val = balls > 0 ? `${overs}.${balls}` : `${overs}`;
        }
      }
    }
    setOversBowled(val);
  };

  const filteredPlayers = Array.isArray(realPlayers)
    ? realPlayers.filter(player => player.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Ensure squadIds is an array before mapping
  const squadIds = currentMatch?.squadIds
    ? (Array.isArray(currentMatch.squadIds) ? currentMatch.squadIds : [])
    : [];

  const squadPlayers = squadIds.length > 0 && Array.isArray(realPlayers)
    ? squadIds.map(id => realPlayers.find(p => p.id == id)).filter(Boolean) // Use loose equality for type coercion
    : [];

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
                          {(match.matchType || match.result) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {match.matchType && <span>{match.matchType}</span>}
                              {match.matchType && match.result && <span> • </span>}
                              {match.result && <span className={
                                match.result === 'Won' ? 'text-success font-medium' :
                                  match.result === 'Lost' ? 'text-destructive font-medium' :
                                    'font-medium'
                              }>{match.result}</span>}
                            </p>
                          )}
                          <div className="mt-2 flex gap-2 flex-wrap">                           {match.status === 'draft' && (
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
                          {match.status === 'draft'
                            ? 'Select Squad'
                            : match.status === 'completed'
                              ? 'View Stats'
                              : 'Enter Stats'}
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
                    <div className="flex gap-2">
                      <Select value={opponent} onValueChange={setOpponent}>
                        <SelectTrigger id="opponent" className="flex-1">
                          <SelectValue placeholder="Select opponent team" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingOpponents ? (
                            <SelectItem value="loading" disabled>Loading opponents...</SelectItem>
                          ) : opponents.length === 0 ? (
                            <SelectItem value="empty" disabled>No opponents yet</SelectItem>
                          ) : (
                            opponents.map((opp) => (
                              <SelectItem key={opp.id} value={opp.name}>
                                {opp.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddOpponentDialog(true)}
                        className="shrink-0"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New
                      </Button>
                    </div>
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

                  <div className="space-y-2">
                    <Label htmlFor="matchType">Match Type</Label>
                    <Select value={matchType} onValueChange={(value: any) => setMatchType(value)}>
                      <SelectTrigger id="matchType">
                        <SelectValue placeholder="Select match type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Practice match">Practice match</SelectItem>
                        <SelectItem value="Tournament match">Tournament match</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="result">Result</Label>
                    <Select value={result} onValueChange={(value: any) => setResult(value)}>
                      <SelectTrigger id="result">
                        <SelectValue placeholder="Select result" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Won">Won</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                        <SelectItem value="Draw">Draw</SelectItem>
                        <SelectItem value="No Result">No Result</SelectItem>
                      </SelectContent>
                    </Select>
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
                  {isLoadingPlayers ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading players...</p>
                    </div>
                  ) : filteredPlayers.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No players found</p>
                    </div>
                  ) : (
                    filteredPlayers.map((player) => {
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
                    })
                  )}
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
                      onClick={async () => {
                        try {
                          await matchService.completeMatch(parseInt(currentMatch.id));
                          const updatedMatch = { ...currentMatch, status: 'completed' as MatchStatus };
                          setMatches(matches.map(m => m.id === currentMatch.id ? updatedMatch : m));
                          setCurrentMatch(updatedMatch);
                          toast.success('Match marked as completed!');
                        } catch (error: any) {
                          console.error('Error completing match:', error);
                          toast.error(error.response?.data?.message || 'Failed to complete match');
                        }
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
                        Enter Stats for {realPlayers.find(p => p.id === currentStatPlayerId)?.name}
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
                              onChange={(e) => handleRunsChange(e.target.value)}
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
                              onChange={(e) => handleWicketsChange(e.target.value)}
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
                              onChange={(e) => handleFoursChange(e.target.value)}
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
                              onChange={(e) => handleSixesChange(e.target.value)}
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
                              onChange={(e) => handleOversChange(e.target.value)}
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
                              onChange={(e) => handleCatchesChange(e.target.value)}
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
                              onChange={(e) => handleStumpsChange(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="isOut"
                            checked={isOut}
                            onCheckedChange={(checked: boolean) => setIsOut(checked)}
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

      {/* Add New Opponent Dialog */}
      <Dialog open={showAddOpponentDialog} onOpenChange={setShowAddOpponentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Opponent</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newOpponentName">Opponent Name</Label>
              <Input
                id="newOpponentName"
                placeholder="Enter opponent team name"
                value={newOpponentName}
                onChange={(e) => setNewOpponentName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newOpponentPhone">Phone Number</Label>
              <Input
                id="newOpponentPhone"
                placeholder="Enter phone number"
                value={newOpponentPhone}
                onChange={(e) => setNewOpponentPhone(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddOpponentDialog(false);
                setNewOpponentName('');
                setNewOpponentPhone('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddOpponent}>
              Add Opponent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
