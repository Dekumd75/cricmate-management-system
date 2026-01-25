import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoachSidebar } from './CoachSidebar';
import { AdminSidebar } from './AdminSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useApp } from './AppContext';
import { Search, UserPlus } from 'lucide-react';
import { PlayerRegistrationDialog } from './PlayerRegistrationDialog';

export function PlayerManagement() {
  const navigate = useNavigate();
  const { players, setPlayers, user } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePlayerRegistered = (newPlayer: any) => {
    setPlayers([...players, newPlayer]);
  };

  const getSidebar = () => {
    return user?.role === 'admin' ? <AdminSidebar /> : <CoachSidebar />;
  };

  return (
    <div className="flex min-h-screen bg-background">
      {getSidebar()}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1>Player Management</h1>
            <Button
              onClick={() => setShowRegistrationDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Register New Player
            </Button>
          </div>

          {/* Search */}
          <Card className="p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          {/* Players Table */}
          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground">Player</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Age</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Role</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Matches</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player) => (
                    <tr key={player.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={player.photo}
                            alt={player.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <span>{player.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">{player.age}</td>
                      <td className="py-4 px-4">{player.role}</td>
                      <td className="py-4 px-4">{player.stats.matches}</td>
                      <td className="py-4 px-4">
                        {user?.role !== 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            onClick={() => navigate(`/${user?.role}/player-profile?id=${player.id}`)}
                          >
                            View Profile
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <PlayerRegistrationDialog
        open={showRegistrationDialog}
        onOpenChange={setShowRegistrationDialog}
        onSuccess={handlePlayerRegistered}
      />
    </div>
  );
}
