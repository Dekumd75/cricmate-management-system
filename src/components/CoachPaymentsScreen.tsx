import { CoachSidebar } from './CoachSidebar';
import { PaymentPanel } from './PaymentPanel';

export function CoachPaymentsScreen() {
  return (
    <div className="flex min-h-screen bg-background">
      <CoachSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <h1 className="mb-2">Payment Management</h1>
          <p className="text-muted-foreground mb-8">Track and record monthly academy fees for all players</p>
          <PaymentPanel role="coach" />
        </div>
      </div>
    </div>
  );
}
