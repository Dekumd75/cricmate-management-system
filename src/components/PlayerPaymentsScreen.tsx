import { PlayerSidebar } from './PlayerSidebar';
import { PaymentPanel } from './PaymentPanel';

export function PlayerPaymentsScreen() {
  return (
    <div className="flex min-h-screen bg-background">
      <PlayerSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="mb-2">My Payments</h1>
          <p className="text-muted-foreground mb-8">Your monthly academy fee records</p>
          <PaymentPanel role="player" />
        </div>
      </div>
    </div>
  );
}
