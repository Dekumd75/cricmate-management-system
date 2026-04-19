import { useState, useEffect } from 'react';
import { CoachSidebar } from './CoachSidebar';
import { AdminSidebar } from './AdminSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { useApp } from './AppContext';
import { Search, Clock, PlayCircle, StopCircle, Users } from 'lucide-react';
import userService from '../services/userService';
import attendanceService from '../services/attendanceService';
import sessionService from '../services/sessionService';
import { toast } from 'sonner';

type AttendanceStatus = 'none' | 'present' | 'absent' | 'early-leave';

interface AttendanceRecord {
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
}

interface Session {
  sessionID: number;
  title: string;
  sessionDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  group: {
    groupID: number;
    groupName: string;
    location: string;
  };
}

interface PlayerGroup {
  groupID: number;
  groupName: string;
  location: string;
}

export function AttendanceScreen() {
  const { user } = useApp();
  const [players, setPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [selectedDate] = useState<string>(new Date().toLocaleDateString('en-CA')); // Uses local timezone instead of UTC
  const [isSaving, setIsSaving] = useState(false);

  // Session state
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [customGroupName, setCustomGroupName] = useState<string>('');
  const [customLocation, setCustomLocation] = useState<string>('');

  // Load player groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const fetchedGroups = await sessionService.getGroups();
        setGroups(fetchedGroups);
      } catch (error) {
        console.error('Failed to fetch groups:', error);
      }
    };

    fetchGroups();
  }, []);

  // Load active sessions
  useEffect(() => {
    const loadActiveSessions = async () => {
      try {
        const sessions = await sessionService.getActiveSessions();
        setActiveSessions(sessions);

        // Auto-select first active session if available
        if (sessions.length > 0 && !currentSession) {
          setCurrentSession(sessions[0]);
        }
      } catch (error) {
        console.error('Failed to load active sessions:', error);
      }
    };

    loadActiveSessions();
    // Refresh every 30 seconds
    const interval = setInterval(loadActiveSessions, 30000);
    return () => clearInterval(interval);
  }, [currentSession]);

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

  // Load attendance for current session
  useEffect(() => {
    const loadAttendance = async () => {
      if (!currentSession) {
        setAttendance({});
        return;
      }

      try {
        const data = await sessionService.getSessionAttendance(currentSession.sessionID);
        console.log('Loaded attendance data:', data);

        const attendanceMap: Record<string, AttendanceRecord> = {};

        if (data.attendance && Array.isArray(data.attendance)) {
          data.attendance.forEach((record: any) => {
            // Use playerUserID which is the actual field in attendance_record table
            const playerId = record.playerUserID || record.player?.id;
            if (playerId) {
              attendanceMap[playerId.toString()] = {
                status: record.status,
                checkInTime: record.checkInTime,
                checkOutTime: record.checkOutTime
              };
            }
          });
        }

        console.log('Attendance map:', attendanceMap);
        setAttendance(attendanceMap);
      } catch (error) {
        console.error('Failed to load attendance:', error);
      }
    };

    loadAttendance();
  }, [currentSession]);

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartSession = async () => {
    if (!selectedGroupId) {
      toast.error('Please select a group');
      return;
    }

    try {
      console.log('Starting session with groupID:', selectedGroupId);

      let data;
      if (selectedGroupId === '0') {
        // Custom group - validate custom inputs
        if (!customGroupName.trim() || !customLocation.trim()) {
          toast.error('Please provide group name and location');
          return;
        }
        data = await sessionService.startSession(
          0,
          undefined,
          customGroupName.trim(),
          customLocation.trim()
        );
      } else {
        data = await sessionService.startSession(parseInt(selectedGroupId));
      }

      console.log('Session started - Backend response:', data);
      console.log('Session object from backend:', data.session);
      console.log('Session ID:', data.session?.sessionID);

      setActiveSessions([...activeSessions, data.session]);
      setCurrentSession(data.session);
      console.log('Current session set to:', data.session);

      setShowStartDialog(false);
      setSelectedGroupId('');
      setCustomGroupName('');
      setCustomLocation('');
      toast.success('Session started successfully!');
    } catch (error: any) {
      console.error('Failed to start session:', error);
      toast.error(error.response?.data?.message || 'Failed to start session');
    }
  };

  const handleEndSession = async () => {
    if (!currentSession) return;

    try {
      const data = await sessionService.endSession(currentSession.sessionID);
      toast.success(`Session ended! ${data.playersCheckedOut} players checked out automatically.`);

      // Remove from active sessions
      setActiveSessions(activeSessions.filter(s => s.sessionID !== currentSession.sessionID));
      setCurrentSession(null);
      setAttendance({});
    } catch (error: any) {
      console.error('Failed to end session:', error);
      toast.error(error.response?.data?.message || 'Failed to end session');
    }
  };

  const saveAttendance = async (playerId: string, status: AttendanceStatus) => {
    console.log('saveAttendance called:', { playerId, status, currentSession });

    if (!currentSession) {
      console.error('No current session!');
      toast.error('Please start a session first');
      return;
    }

    if (!currentSession.sessionID) {
      console.error('Session ID is missing!', currentSession);
      toast.error('Session ID is missing');
      return;
    }

    setIsSaving(true);
    try {
      console.log('Calling markAttendance with:', {
        date: selectedDate,
        sessionID: currentSession.sessionID,
        playerId,
        status
      });

      const response = await attendanceService.markAttendance(selectedDate, currentSession.sessionID, [{
        playerId: parseInt(playerId),
        status
      }]);

      console.log('Attendance marked:', response);

      // Reload attendance data to get updated timestamps
      const data = await sessionService.getSessionAttendance(currentSession.sessionID);
      const attendanceMap: Record<string, AttendanceRecord> = {};

      if (data.attendance && Array.isArray(data.attendance)) {
        data.attendance.forEach((record: any) => {
          attendanceMap[record.playerUserID.toString()] = {
            status: record.status,
            checkInTime: record.checkInTime,
            checkOutTime: record.checkOutTime
          };
        });
      }

      setAttendance(attendanceMap);
    } catch (error: any) {
      console.error('Failed to save attendance:', error);
      toast.error(error.response?.data?.message || 'Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const markPresent = async (playerId: string) => {
    if (!currentSession) {
      toast.error('Please start a session first');
      return;
    }

    setAttendance(prev => ({
      ...prev,
      [playerId]: { status: 'present' }
    }));
    await saveAttendance(playerId, 'present');
    toast.success('Marked as present');
  };

  const markAbsent = async (playerId: string) => {
    if (!currentSession) {
      toast.error('Please start a session first');
      return;
    }

    setAttendance(prev => ({
      ...prev,
      [playerId]: { status: 'absent' }
    }));
    await saveAttendance(playerId, 'absent');
    toast.success('Marked as absent');
  };

  const markEarlyLeave = async (playerId: string) => {
    if (!currentSession) {
      toast.error('Please start a session first');
      return;
    }

    setAttendance(prev => ({
      ...prev,
      [playerId]: { status: 'early-leave' }
    }));
    await saveAttendance(playerId, 'early-leave');
    toast.success('Marked as left early');
  };

  const getRowClassName = (playerId: string) => {
    const record = attendance[playerId];
    if (record?.status === 'present' || record?.status === 'early-leave') {
      return 'bg-success/10';
    }
    if (record?.status === 'absent') {
      return 'bg-destructive/10';
    }
    return '';
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getSidebar = () => {
    return user?.role === 'admin' ? <AdminSidebar /> : <CoachSidebar />;
  };

  return (
    <div className="flex min-h-screen bg-background">
      {getSidebar()}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1>Mark Attendance</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <Button
              onClick={() => setShowStartDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Start Session
            </Button>
          </div>

          {/* Active Session Info */}
          {currentSession ? (
            <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{currentSession.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {currentSession.group.groupName} • {currentSession.group.location}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Started at {formatTime(currentSession.startTime)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleEndSession}
                  variant="destructive"
                  className="bg-destructive hover:bg-destructive/90"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  End Session
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 mb-6 bg-muted/30 text-center">
              <p className="text-muted-foreground mb-3">No active session</p>
              <p className="text-sm text-muted-foreground">Start a session to mark attendance</p>
            </Card>
          )}

          {/* Other Active Sessions */}
          {activeSessions.length > 1 && (
            <Card className="p-4 mb-6">
              <Label className="text-sm font-medium mb-2 block">Switch Session</Label>
              <div className="flex flex-wrap gap-2">
                {activeSessions.map(session => (
                  <Button
                    key={session.sessionID}
                    onClick={() => setCurrentSession(session)}
                    variant={currentSession?.sessionID === session.sessionID ? 'default' : 'outline'}
                    size="sm"
                  >
                    {session.group.groupName} - {session.group.location}
                  </Button>
                ))}
              </div>
            </Card>
          )}

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
                disabled={!currentSession}
              />
            </div>
          </Card>

          {/* Attendance List */}
          <Card className="p-6">
            <div className="space-y-3">
              {filteredPlayers.map((player) => {
                const record = attendance[player.id];
                const status = record?.status || 'none';

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-lg border border-border transition-colors ${getRowClassName(player.id)}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <img
                        src={player.photo}
                        alt={player.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h4>{player.name}</h4>
                        <p className="text-sm text-muted-foreground">{player.role}</p>
                        {record?.checkInTime && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Check-in: {formatTime(record.checkInTime)}
                            {record.checkOutTime && ` • Check-out: ${formatTime(record.checkOutTime)}`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status === 'none' && (
                        <>
                          <Button
                            onClick={() => markPresent(player.id)}
                            disabled={isSaving || !currentSession}
                            className="bg-success hover:bg-success/90 text-success-foreground"
                          >
                            Present
                          </Button>
                          <Button
                            onClick={() => markAbsent(player.id)}
                            disabled={isSaving || !currentSession}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Absent
                          </Button>
                        </>
                      )}

                      {status === 'present' && (
                        <Button
                          onClick={() => markEarlyLeave(player.id)}
                          disabled={isSaving || !currentSession}
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

      {/* Start Session Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Training Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="group">Select Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group.groupID} value={group.groupID.toString()}>
                      {group.groupName} - {group.location}
                    </SelectItem>
                  ))}
                  <SelectItem value="0">Others (Custom)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show custom inputs when "Others" is selected */}
            {selectedGroupId === '0' && (
              <>
                <div>
                  <Label htmlFor="customGroupName">Group Name</Label>
                  <Input
                    id="customGroupName"
                    type="text"
                    placeholder="e.g., Under 11, Special Training"
                    value={customGroupName}
                    onChange={(e) => setCustomGroupName(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="customLocation">Location</Label>
                  <Input
                    id="customLocation"
                    type="text"
                    placeholder="e.g., Matara, Galle"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowStartDialog(false);
              setSelectedGroupId('');
              setCustomGroupName('');
              setCustomLocation('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleStartSession} className="bg-primary">
              <PlayCircle className="w-4 h-4 mr-2" />
              Start Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
