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
  const [players, setPlayers] = useState<Player[]>([
    {
      id: '1',
      name: 'Ashan Silva',
      age: 14,
      role: 'Batsman',
      photo: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200',
      stats: { matches: 45, runs: 1250, wickets: 5, average: 32.5, strikeRate: 125.5, economy: 8.2 },
      inviteCode: 'FSCA-X87K',
      parentId: 'parent1'
    },
    {
      id: '2',
      name: 'Kavindu Perera',
      age: 15,
      role: 'All-rounder',
      photo: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200',
      stats: { matches: 52, runs: 980, wickets: 23, average: 28.3, strikeRate: 118.2, economy: 6.5 },
      inviteCode: 'FSCA-Y92L',
    },
    {
      id: '3',
      name: 'Dineth Fernando',
      age: 13,
      role: 'Bowler',
      photo: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200',
      stats: { matches: 38, runs: 320, wickets: 45, average: 15.2, strikeRate: 95.5, economy: 5.8 },
      inviteCode: 'FSCA-Z45M',
    },
  ]);

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

  const [parents, setParents] = useState<Parent[]>([
    {
      id: 'parent1',
      name: 'Ravi Silva',
      email: 'ravi.silva@email.com',
      linkedPlayerId: '1',
      status: 'active'
    },
    {
      id: 'parent2',
      name: 'Chaminda Perera',
      email: 'chaminda.perera@email.com',
      linkedPlayerId: '2',
      status: 'active'
    }
  ]);

  const [coaches, setCoaches] = useState<Coach[]>([
    {
      id: 'c1',
      name: 'Coach Rajesh Kumar',
      email: 'rajesh@cricmate.com',
      dateJoined: '2023-01-15'
    },
    {
      id: 'c2',
      name: 'Coach Priya Fernando',
      email: 'priya@cricmate.com',
      dateJoined: '2023-03-20'
    },
    {
      id: 'c3',
      name: 'Coach Anil Jayawardena',
      email: 'anil@cricmate.com',
      dateJoined: '2024-06-10'
    }
  ]);

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchStats, setMatchStats] = useState<Record<string, PlayerMatchStats[]>>({});

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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
