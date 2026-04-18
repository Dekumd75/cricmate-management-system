import { useState, useEffect } from 'react';
import { ParentSidebar } from './ParentSidebar';
import { PaymentPanel } from './PaymentPanel';
import api from '../services/api';
import { Loader2 } from 'lucide-react';

interface LinkedChild {
  id: string;
  name: string;
}

export function ParentPaymentsScreen() {
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      setLoading(true);
      try {
        const res = await api.get('/auth/linked-children');
        const kids: LinkedChild[] = (res.data.children || []).map((c: any) => ({
          id: String(c.id),
          name: c.name,
        }));
        setChildren(kids);
        // Don't pre-select any child — show all by default
        setSelectedChildId(null);
      } catch (err) {
        console.error('Failed to fetch children:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <ParentSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <h1 className="mb-2">Payments</h1>
          <p className="text-muted-foreground mb-6">Monthly academy fees for your children</p>

          {/* Child filter tabs — only shown when 2+ children */}
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground mb-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading children…</span>
            </div>
          ) : children.length > 1 ? (
            <div className="flex gap-2 flex-wrap mb-6">
              <button
                onClick={() => setSelectedChildId(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  selectedChildId === null
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground'
                }`}
              >
                All Children
              </button>
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                    selectedChildId === child.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground'
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>
          ) : null}

          <PaymentPanel
            key={selectedChildId ?? 'all'}
            playerId={selectedChildId}
            playerName={children.find(c => c.id === selectedChildId)?.name}
            role="parent"
          />
        </div>
      </div>
    </div>
  );
}
