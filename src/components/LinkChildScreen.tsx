import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Link2, ArrowLeft, X, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

interface LinkedChild {
  id: string;
  name: string;
  age: number;
  role: string;
  photo: string;
  stats: { matches: number; runs: number; wickets: number; average: number };
}

export function LinkChildScreen() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);

  // Load already-linked children from DB on mount
  useEffect(() => {
    const fetchLinked = async () => {
      try {
        const res = await api.get('/auth/linked-children');
        setLinkedChildren(res.data.children || []);
      } catch (error) {
        console.error('Failed to fetch linked children:', error);
      } finally {
        setLoadingChildren(false);
      }
    };
    fetchLinked();
  }, []);

  const handleLinkProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/redeem-code', { code: inviteCode.trim() });

      // Add the newly linked child to local state (include default stats so it renders safely)
      const newChild = {
        ...res.data.player,
        stats: res.data.player.stats || { matches: 0, runs: 0, wickets: 0, average: 0 }
      };
      setLinkedChildren(prev => [...prev, newChild]);
      setInviteCode('');
      toast.success(res.data.message);

      // Navigate to dashboard with refresh flag so dashboard re-fetches children
      setTimeout(() => navigate('/parent/dashboard', { replace: true, state: { refresh: Date.now() } }), 1000);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to link child. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkChild = async (_childId: string, childName: string) => {
    // Unlink is not yet implemented on the backend — inform the user to contact their coach
    toast.error(`To unlink ${childName}, please contact your coach or admin.`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/parent/dashboard')}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4">
            <Link2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-primary">Link Your Child's Profile</h1>
          <p className="text-muted-foreground text-center mt-2">
            Enter the unique invite code provided by your coach to link your child's profile
          </p>
        </div>

        {/* Linked Children */}
        {loadingChildren ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
            <span className="text-muted-foreground text-sm">Loading linked children…</span>
          </div>
        ) : linkedChildren.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-4">Linked Children ({linkedChildren.length})</h3>
            <div className="space-y-3">
              {linkedChildren.map((child) => (
                <Card key={child.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={child.photo}
                      alt={child.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h4>{child.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Age: {child.age} • {child.role}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{child.stats.matches} matches</span>
                        <span>{child.stats.runs} runs</span>
                        <span>{child.stats.wickets} wickets</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkChild(child.id, child.name)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Unlink
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Link form */}
        <form onSubmit={handleLinkProfile} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">
              <UserPlus className="w-4 h-4 inline mr-2" />
              {linkedChildren.length > 0 ? 'Add Another Child — Invite Code' : 'Invite Code'}
            </Label>
            <Input
              id="inviteCode"
              type="text"
              placeholder="e.g., FSCA-X87K"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              className="border-muted-foreground/20 tracking-widest text-center text-lg font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Enter the code exactly as provided by your coach. Codes look like: FSCA-XXXX
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Linking…
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Link Child Profile
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-1">How it works:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Ask your child's coach for the unique invite code</li>
            <li>Enter the code above and click "Link Child Profile"</li>
            <li>Your child's profile, stats, and attendance will appear on your dashboard</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
