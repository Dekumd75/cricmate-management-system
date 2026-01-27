import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useApp } from './AppContext';
import { toast } from 'sonner';
import { Link2, ArrowLeft, X, UserPlus } from 'lucide-react';

export function LinkChildScreen() {
  const navigate = useNavigate();
  const { players, setUser, user } = useApp();
  const [inviteCode, setInviteCode] = useState('');

  // Get all linked children
  const linkedPlayerIds = user?.linkedPlayerIds || [];
  const linkedChildren = players.filter(p => linkedPlayerIds.includes(p.id));

  const handleLinkProfile = (e: React.FormEvent) => {
    e.preventDefault();

    const player = players.find(p => p.inviteCode === inviteCode);

    if (player) {
      // Check if already linked
      if (linkedPlayerIds.includes(player.id)) {
        toast.error(`${player.name} is already linked to your account.`);
        return;
      }

      // Add to linked children array
      if (user) {
        const updatedLinkedPlayerIds = [...linkedPlayerIds, player.id];
        setUser({
          ...user,
          linkedPlayerIds: updatedLinkedPlayerIds,
          linkedPlayerId: updatedLinkedPlayerIds[0] // Keep first child as primary for backward compatibility
        });
      }

      toast.success(`Successfully linked ${player.name}!`);

      // Navigate back to dashboard to see the linked profile
      setTimeout(() => {
        navigate('/parent/dashboard');
      }, 500);
    } else {
      toast.error('Invalid invite code. Please check and try again.');
    }
  };

  const handleUnlinkChild = (playerId: string, playerName: string) => {
    if (user) {
      const updatedLinkedPlayerIds = linkedPlayerIds.filter(id => id !== playerId);
      setUser({
        ...user,
        linkedPlayerIds: updatedLinkedPlayerIds,
        linkedPlayerId: updatedLinkedPlayerIds[0] || undefined
      });
      toast.success(`${playerName} has been unlinked from your account.`);
    }
  };

  const handleBack = () => {
    navigate('/parent/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4">
            <Link2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-primary">Link Your Children's Profiles</h1>
          <p className="text-muted-foreground text-center mt-2">
            Enter the unique invite code provided by your coach for each child
          </p>
        </div>

        {/* Linked Children */}
        {linkedChildren.length > 0 && (
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

        <form onSubmit={handleLinkProfile} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">
              <UserPlus className="w-4 h-4 inline mr-2" />
              Add Another Child - Invite Code
            </Label>
            <Input
              id="inviteCode"
              type="text"
              placeholder="e.g., FSCA-X87K"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              className="border-muted-foreground/20 tracking-wider"
            />
            <p className="text-xs text-muted-foreground">
              Enter the code exactly as provided by your coach
            </p>
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
            <UserPlus className="w-4 h-4 mr-2" />
            Link Child Profile
          </Button>
        </form>

        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="mb-2">Demo invite codes:</p>
          <p>FSCA-X87K (Ashan Silva)</p>
          <p>FSCA-Y92L (Kavindu Perera)</p>
          <p>FSCA-Z45M (Dineth Fernando)</p>
        </div>
      </Card>
    </div>
  );
}
