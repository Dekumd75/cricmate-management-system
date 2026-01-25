import { useState } from 'react';
import { CoachSidebar } from './CoachSidebar';
import { AdminSidebar } from './AdminSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useApp } from './AppContext';
import { Sparkles, Loader2 } from 'lucide-react';

interface SelectedPlayer {
  player: any;
  rationale: string;
  position: number;
}

export function BestXIScreen() {
  const { players, user } = useApp();
  const [loading, setLoading] = useState(false);
  const [bestXI, setBestXI] = useState<SelectedPlayer[]>([]);

  const generateBestXI = () => {
    setLoading(true);
    
    // Mock AI generation with delay
    setTimeout(() => {
      const rationales = [
        'High recent form and consistent performance',
        'Excellent strike rate in last 5 matches',
        'Strong defensive technique',
        'Best economy rate among bowlers',
        'Natural leader with great match awareness',
        'Exceptional fielding skills',
        'Versatile all-rounder capabilities',
        'Proven performance under pressure',
        'Outstanding fitness levels',
        'Great team chemistry builder',
        'Consistent wicket-taker'
      ];

      const selected = players
        .slice(0, 11)
        .map((player, index) => ({
          player,
          rationale: rationales[index] || 'Strong overall performance',
          position: index + 1
        }));

      setBestXI(selected);
      setLoading(false);
    }, 2000);
  };

  const getSidebar = () => {
    return user?.role === 'admin' ? <AdminSidebar /> : <CoachSidebar />;
  };

  return (
    <div className="flex min-h-screen bg-background">
      {getSidebar()}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <h1 className="mb-8">AI-Assisted Team Selection</h1>

          {bestXI.length === 0 && !loading && (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="mb-4">Generate Best XI Team</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Our AI will analyze player statistics, recent performance, and match conditions to recommend the optimal team composition.
              </p>
              <Button
                onClick={generateBestXI}
                className="bg-primary hover:bg-primary/90 px-8 py-6 text-lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Best XI
              </Button>
            </Card>
          )}

          {loading && (
            <Card className="p-12 text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <h3>Analyzing player data...</h3>
              <p className="text-muted-foreground mt-2">This may take a few moments</p>
            </Card>
          )}

          {bestXI.length > 0 && !loading && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2>Recommended Best XI</h2>
                <Button
                  onClick={generateBestXI}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bestXI.map((selection) => (
                  <Card key={selection.player.id} className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative">
                        <img
                          src={selection.player.photo}
                          alt={selection.player.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                          {selection.position}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4>{selection.player.name}</h4>
                        <p className="text-sm text-muted-foreground">{selection.player.role}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Rationale:</p>
                      <p className="text-sm">{selection.rationale}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Matches</p>
                        <p className="text-sm">{selection.player.stats.matches}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Runs</p>
                        <p className="text-sm">{selection.player.stats.runs}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Wickets</p>
                        <p className="text-sm">{selection.player.stats.wickets}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
