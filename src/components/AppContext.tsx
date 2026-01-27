import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coach' | 'parent' | 'player';
  linkedPlayerId?: string; // Keep for backward compatibility
  linkedPlayerIds?: string[]; // Array of linked player IDs for parents with multiple children
  photo?: string;
  phone?: string;
}

interface Player {
  id: string;
  name: string;
  age: number;
  role: string;
  photo: string;
  stats: {
    matches: number;
    runs: number;
    wickets: number;
    average: number;
    strikeRate?: number;
    economy?: number;
  };
  inviteCode: string;
  parentId?: string;
}

interface Payment {
  id: string;
  playerId: string;
  playerName: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'overdue' | 'pending';
}

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface PendingParent {
  id: string;
  name: string;
  email: string;
  dateRegistered: string;
  playerId: string;
}

interface Parent {
  id: string;
  name: string;
  email: string;
  linkedPlayerId: string;
  status: 'active' | 'pending';
}

interface Coach {
  id: string;
  name: string;
  email: string;
  dateJoined: string;
}

interface Match {
  id: string;
  opponent: string;
  date: string;
  venue: string;
  status: 'draft' | 'squad-selected' | 'completed';
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

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  players: Player[];
  setPlayers: (players: Player[]) => void;
  payments: Payment[];
  setPayments: (payments: Payment[]) => void;
  attendance: any[];
  setAttendance: (attendance: any[]) => void;
  messages: Message[];
  pendingParents: PendingParent[];
  setPendingParents: (parents: PendingParent[]) => void;
  parents: Parent[];
  setParents: (parents: Parent[]) => void;
  coaches: Coach[];
  setCoaches: (coaches: Coach[]) => void;
  matches: Match[];
  setMatches: (matches: Match[]) => void;
  matchStats: Record<string, PlayerMatchStats[]>;
  setMatchStats: (stats: Record<string, PlayerMatchStats[]>) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Track if we're still loading from localStorage
  const [players, setPlayers] = useState<Player[]>([]);

  const [payments, setPayments] = useState<Payment[]>([
    {
      id: '1',
      playerId: '1',
      playerName: 'Ashan Silva',
      amount: 3000,
      dueDate: '2025-10-15',
      status: 'overdue'
    },
    {
      id: '2',
      playerId: '2',
      playerName: 'Kavindu Perera',
      amount: 3000,
      dueDate: '2025-10-25',
      status: 'pending'
    },
    {
      id: '3',
      playerId: '3',
      playerName: 'Dineth Fernando',
      amount: 3000,
      dueDate: '2025-09-15',
      status: 'paid'
    },
    {
      id: '4',
      playerId: '1',
      playerName: 'Ashan Silva',
      amount: 3000,
      dueDate: '2025-09-15',
      status: 'paid'
    },
    {
      id: '5',
      playerId: '2',
      playerName: 'Kavindu Perera',
      amount: 3000,
      dueDate: '2025-09-25',
      status: 'paid'
    },
  ]);

  const [attendance, setAttendance] = useState<any[]>([]);

  const [messages] = useState<Message[]>([
    {
      id: '1',
      from: 'coach@cricmate.com',
      to: 'parent@example.com',
      content: 'Great performance in today\'s practice session!',
      timestamp: '2025-10-18T14:30:00',
      read: false
    }
  ]);

  const [pendingParents, setPendingParents] = useState<PendingParent[]>([]);

  const [parents, setParents] = useState<Parent[]>([]);

  const [coaches, setCoaches] = useState<Coach[]>([]);

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchStats, setMatchStats] = useState<Record<string, PlayerMatchStats[]>>({});

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load user from localStorage on mount (persist authentication across refreshes)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        console.log('User loaded from localStorage:', parsedUser);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        // Clear invalid data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }

    // Mark loading as complete
    setIsLoading(false);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      isLoading,
      players,
      setPlayers,
      payments,
      setPayments,
      attendance,
      setAttendance,
      messages,
      pendingParents,
      setPendingParents,
      parents,
      setParents,
      coaches,
      setCoaches,
      matches,
      setMatches,
      matchStats,
      setMatchStats,
      theme,
      setTheme
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
