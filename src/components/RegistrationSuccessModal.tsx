import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { CheckCircle, Copy } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
}

export function RegistrationSuccessModal({ isOpen, onClose, inviteCode }: Props) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success('Invite code copied to clipboard!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          
          <h2 className="mb-2">Player Profile Created!</h2>
          <p className="text-muted-foreground mb-6">
            Share this invite code with the parent to link their account
          </p>

          <div className="w-full p-6 bg-muted rounded-lg mb-6">
            <p className="text-sm text-muted-foreground mb-2">Invite Code</p>
            <p className="text-3xl tracking-wider">{inviteCode}</p>
          </div>

          <div className="flex gap-3 w-full">
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
