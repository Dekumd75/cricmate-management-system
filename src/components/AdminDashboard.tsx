import { AdminSidebar } from './AdminSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Users, UserCheck, Activity } from 'lucide-react';
import { useApp } from './AppContext';
import { toast } from 'sonner@2.0.3';

export function AdminDashboard() {
  const { players, pendingParents, setPendingParents, coaches } = useApp();
  
  // Get all active parents (players with parentId)
  const totalParents = players.filter(p => p.parentId).length;

  const handleApproveParent = (parentId: string, parentName: string) => {
    setPendingParents(pendingParents.filter(p => p.id !== parentId));
    toast.success(`${parentName} has been approved!`);
  };

  const handleRejectParent = (parentId: string, parentName: string) => {
    setPendingParents(pendingParents.filter(p => p.id !== parentId));
    toast.error(`${parentName}'s registration has been rejected.`);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <h1 className="mb-8">Admin Dashboard</h1>

          {/* High Priority: Pending Parent Registrations */}
          <Card className="p-6 mb-8">
            <h3 className="mb-6">Pending Parent Registrations</h3>
            {pendingParents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground">Parent Name</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Date Registered</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingParents.map((parent) => (
                      <tr key={parent.id} className="border-b border-border">
                        <td className="py-4 px-4">{parent.name}</td>
                        <td className="py-4 px-4">{parent.email}</td>
                        <td className="py-4 px-4">{new Date(parent.dateRegistered).toLocaleDateString()}</td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90 text-success-foreground"
                              onClick={() => handleApproveParent(parent.id, parent.name)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectParent(parent.id, parent.name)}
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No pending parent registrations</p>
            )}
          </Card>

          {/* Secondary: Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Total Players</p>
                  <h2>{players.length}</h2>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Active Coaches</p>
                  <h2>{coaches.length}</h2>
                </div>
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-accent" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Total Parents</p>
                  <h2>{totalParents}</h2>
                </div>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-success" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">System Health</p>
                  <h2 className="text-success">Excellent</h2>
                </div>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-success" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
