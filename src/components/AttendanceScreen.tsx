import { useState, useEffect } from 'react';
import { CoachSidebar } from './CoachSidebar';
import { AdminSidebar } from './AdminSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useApp } from './AppContext';
import { Search } from 'lucide-react';
import userService from '../services/userService';
import { toast } from 'sonner';

type AttendanceStatus = 'none' | 'present' | 'absent' | 'early-leave';

export function AttendanceScreen() {
  const { user } = useApp();
  const [players, setPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const fetchedPlayers = await userService.getPlayers(user?.role || 'coach');
        setPlayers(fetchedPlayers);
      } catch (error) {
        console.error('Failed to fetch players:', error);
        toast.error('Failed to load players');
      }
    };

    if (user?.role) {
      fetchPlayers();
    }
  }, [user?.role]);

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const markPresent = (playerId: string) => {
    setAttendance(prev => ({ ...prev, [playerId]: 'present' }));
  };

  const markAbsent = (playerId: string) => {
    setAttendance(prev => ({ ...prev, [playerId]: 'absent' }));
  };

  const markEarlyLeave = (playerId: string) => {
    setAttendance(prev => ({ ...prev, [playerId]: 'early-leave' }));
  };

  const getRowClassName = (playerId: string) => {
    const status = attendance[playerId];
    if (status === 'present' || status === 'early-leave') {
      return 'bg-success/10';
    }
    if (status === 'absent') {
      return 'bg-destructive/10';
    }
    return '';
  };

  const getSidebar = () => {
    return user?.role === 'admin' ? <AdminSidebar /> : <CoachSidebar />;
  };

  return (
    <div className="flex min-h-screen bg-background">
      {getSidebar()}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <h1 className="mb-8">Mark Attendance</h1>

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

          {/* Attendance List */}
          <Card className="p-6">
            <div className="space-y-3">
              {filteredPlayers.map((player) => {
                const status = attendance[player.id] || 'none';

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-lg border border-border transition-colors ${getRowClassName(player.id)}`}
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={player.photo}
                        alt={player.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h4>{player.name}</h4>
                        <p className="text-sm text-muted-foreground">{player.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status === 'none' && (
                        <>
                          <Button
                            onClick={() => markPresent(player.id)}
                            className="bg-success hover:bg-success/90 text-success-foreground"
                          >
                            Present
                          </Button>
                          <Button
                            onClick={() => markAbsent(player.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Absent
                          </Button>
                        </>
                      )}

                      {status === 'present' && (
                        <Button
                          onClick={() => markEarlyLeave(player.id)}
                          className="bg-warning hover:bg-warning/90 text-warning-foreground"
                        >
                          Mark Early Leave
                        </Button>
                      )}

                      {status === 'early-leave' && (
                        <span className="px-4 py-2 bg-warning/20 text-warning rounded-lg">
                          Left Early
                        </span>
                      )}

                      {status === 'absent' && (
                        <span className="px-4 py-2 bg-destructive/20 text-destructive rounded-lg">
                          Absent
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
