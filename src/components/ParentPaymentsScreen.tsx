import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParentSidebar } from './ParentSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { useApp } from './AppContext';
import { DollarSign, AlertCircle, Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export function ParentPaymentsScreen() {
  const navigate = useNavigate();
  const { user, players, payments } = useApp();
  
  const linkedPlayerIds = user?.linkedPlayerIds || [];
  const linkedChildren = players.filter(p => linkedPlayerIds.includes(p.id));
  
  // State for filtering by child
  const [selectedChildId, setSelectedChildId] = useState<string>('all');
  
  // Get payments based on selected child
  const playerPayments = selectedChildId === 'all'
    ? payments.filter(p => linkedPlayerIds.includes(p.playerId))
    : payments.filter(p => p.playerId === selectedChildId);
  
  // Sort payments by due date (most recent first)
  const sortedPayments = [...playerPayments].sort((a, b) => 
    new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
  );

  const handlePayNow = (payment: any) => {
    const child = players.find(p => p.id === payment.playerId);
    if (child) {
      navigate('/parent/payment', {
        state: {
          payment: {
            amount: payment.amount,
            description: `Monthly Academy Fee - ${child.name}`,
            playerId: child.id
          }
        }
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success text-success-foreground">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-destructive text-destructive-foreground">Overdue</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <ParentSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="mb-2">Payment History</h1>
            <p className="text-muted-foreground">
              Payment records for all linked children
            </p>
          </div>

          {linkedChildren.length === 0 && (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2">No Children Linked</h3>
              <p className="text-muted-foreground mb-6">
                Please link your child's profile to view payment history
              </p>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => navigate('/parent/link-child')}
              >
                Link Child Profile
              </Button>
            </Card>
          )}

          {linkedChildren.length > 0 && (
            <>
              {/* Filter by Child */}
              <Card className="p-4 mb-6">
                <div className="flex items-center gap-4">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <Label htmlFor="childFilter" className="text-sm font-medium">
                    Filter by Child:
                  </Label>
                  <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select child" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Children</SelectItem>
                      {linkedChildren.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedChildId !== 'all' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedChildId('all')}
                    >
                      Clear Filter
                    </Button>
                  )}
                </div>
              </Card>

              {sortedPayments.length > 0 && (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-4 px-6 text-muted-foreground">Payment ID</th>
                          <th className="text-left py-4 px-6 text-muted-foreground">Child</th>
                          <th className="text-left py-4 px-6 text-muted-foreground">Amount</th>
                          <th className="text-left py-4 px-6 text-muted-foreground">Due Date</th>
                          <th className="text-left py-4 px-6 text-muted-foreground">Status</th>
                          <th className="text-left py-4 px-6 text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPayments.map((payment) => (
                          <tr key={payment.id} className="border-t border-border hover:bg-muted/30">
                            <td className="py-4 px-6">#{payment.id}</td>
                            <td className="py-4 px-6">{payment.playerName}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-muted-foreground" />
                                <span>LKR {payment.amount.toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {new Date(payment.dueDate).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-6">
                              {getStatusBadge(payment.status)}
                            </td>
                            <td className="py-4 px-6">
                              {(payment.status === 'pending' || payment.status === 'overdue') && (
                                <Button
                                  size="sm"
                                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                                  onClick={() => handlePayNow(payment)}
                                >
                                  Pay Now
                                </Button>
                              )}
                              {payment.status === 'paid' && (
                                <span className="text-sm text-muted-foreground">Completed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {sortedPayments.length === 0 && (
                <Card className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2">No Payment Records</h3>
                  <p className="text-muted-foreground">
                    No payment history available
                    {selectedChildId !== 'all' && ` for ${linkedChildren.find(c => c.id === selectedChildId)?.name}`}
                  </p>
                </Card>
              )}

              {/* Payment Summary */}
              {sortedPayments.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground mb-2">Total Paid</p>
                    <h2 className="text-success">
                      LKR {sortedPayments
                        .filter(p => p.status === 'paid')
                        .reduce((sum, p) => sum + p.amount, 0)
                        .toLocaleString()}
                    </h2>
                  </Card>
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground mb-2">Pending Payments</p>
                    <h2 className="text-warning">
                      LKR {sortedPayments
                        .filter(p => p.status === 'pending')
                        .reduce((sum, p) => sum + p.amount, 0)
                        .toLocaleString()}
                    </h2>
                  </Card>
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground mb-2">Overdue</p>
                    <h2 className="text-destructive">
                      LKR {sortedPayments
                        .filter(p => p.status === 'overdue')
                        .reduce((sum, p) => sum + p.amount, 0)
                        .toLocaleString()}
                    </h2>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
