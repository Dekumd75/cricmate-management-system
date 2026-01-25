import { useNavigate } from 'react-router-dom';
import { CoachSidebar } from './CoachSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Users, CalendarCheck, Siren, UserPlus, Trophy, ChevronRight } from 'lucide-react';
import { useApp } from './AppContext';
import { toast } from 'sonner@2.0.3';

export function CoachDashboard() {
  const navigate = useNavigate();
  const { players, payments, pendingParents, setPendingParents, matches } = useApp();
  
  const overduePayments = payments.filter(p => p.status === 'overdue');
  const todayAttendance = '18/25'; // Mock data

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
      <CoachSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <h1 className="mb-8">Dashboard</h1>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  <p className="text-muted-foreground text-sm mb-1">Today's Attendance</p>
                  <h2>{todayAttendance}</h2>
                </div>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CalendarCheck className="w-6 h-6 text-success" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Overdue Payments</p>
                  <h2 className="text-destructive">{overduePayments.length}</h2>
                </div>
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Siren className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Pending Approvals</p>
                  <h2 className="text-warning">{pendingParents.length}</h2>
                </div>
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-warning" />
                </div>
              </div>
            </Card>
          </div>

          {/* Pending Parent Registrations */}
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

          {/* Recent Matches */}
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3>Recent Matches</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/coach/statistics')}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                View All Matches
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {matches.length > 0 ? (
              <div className="space-y-3">
                {matches.slice(0, 5).map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/coach/statistics')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4>vs {match.opponent}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(match.date).toLocaleDateString()} • {match.venue}
                        </p>
                      </div>
                    </div>
                    <div>
                      {match.status === 'draft' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground">
                          Draft
                        </span>
                      )}
                      {match.status === 'squad-selected' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                          Squad Selected
                        </span>
                      )}
                      {match.status === 'completed' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-success/10 text-success">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No matches created yet</p>
                <Button
                  onClick={() => navigate('/coach/statistics')}
                  className="bg-primary hover:bg-primary/90"
                >
                  Create First Match
                </Button>
              </div>
            )}
          </Card>

          {/* Overdue Payments Table */}
          <Card className="p-6">
            <h3 className="mb-6">Overdue Payments</h3>
            {overduePayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground">Player Name</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Due Date</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overduePayments.map((payment) => (
                      <tr key={payment.id} className="border-b border-border">
                        <td className="py-4 px-4">{payment.playerName}</td>
                        <td className="py-4 px-4">LKR {payment.amount.toLocaleString()}</td>
                        <td className="py-4 px-4">{new Date(payment.dueDate).toLocaleDateString()}</td>
                        <td className="py-4 px-4">
                          <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                            Record Payment
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No overdue payments</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
