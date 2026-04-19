import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useApp } from './AppContext';
import { MessageSquare, Link2, Eye, CreditCard, Loader2, AlertCircle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { ParentSidebar } from './ParentSidebar';
import api from '../services/api';

const API_BASE = 'https://cricmate-backend.azurewebsites.net/api';
const auth = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

interface LinkedChild {
  id: string;
  name: string;
  age: number;
  role: string;
  photo: string;
  stats: { matches: number; runs: number; wickets: number; average: number };
}

interface Fee {
  feeID: number;
  playerID: number | string;
  playerName: string;
  month: number;
  year: number;
  amountDue: number;
  dueDate: string;
  status: 'pending' | 'overdue' | 'paid';
}

const MONTH_NAMES: Record<number, string> = {
  1:'January',2:'February',3:'March',4:'April',5:'May',6:'June',
  7:'July',8:'August',9:'September',10:'October',11:'November',12:'December',
};

export function ParentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, messages } = useApp();
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loadingFees, setLoadingFees] = useState(true);

  // Load linked children from DB on mount, and whenever we return from link-child
  useEffect(() => {
    const fetchChildren = async () => {
      setLoadingChildren(true);
      try {
        const res = await api.get('/auth/linked-children');
        setLinkedChildren(res.data.children || []);
      } catch (error) {
        console.error('Failed to fetch linked children:', error);
      } finally {
        setLoadingChildren(false);
      }
    };
    fetchChildren();
  }, [location.state?.refresh]);

  // Load real payment fees for all linked children
  const fetchFees = async () => {
    setLoadingFees(true);
    try {
      const res = await fetch(`${API_BASE}/payments/fees/my`, { headers: auth() });
      const data = await res.json();
      setFees(data.fees || []);
    } catch (err) {
      console.error('Failed to fetch fees:', err);
      setFees([]);
    } finally {
      setLoadingFees(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, [location.state?.refresh]);

  const unreadMessages = messages.filter(m => !m.read && m.to === user?.email);

  // Group unpaid fees per child
  const getFeesByChild = (childId: string) =>
    fees.filter(f => String(f.playerID) === String(childId));

  const getOverdueFees = (childId: string) =>
    getFeesByChild(childId).filter(f => f.status === 'overdue');

  const getPendingFees = (childId: string) =>
    getFeesByChild(childId).filter(f => f.status === 'pending');

  const allOverdueFees = fees.filter(f => f.status === 'overdue');

  const handleViewProfile = (playerId: string) => {
    navigate(`/parent/player-profile?id=${playerId}`);
  };

  const handlePayNow = (fee: Fee) => {
    navigate('/parent/payment', { state: { fee } });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <ParentSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1>Dashboard</h1>
            <Button size="sm" variant="outline" onClick={fetchFees} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Loading state */}
          {loadingChildren ? (
            <Card className="p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-3" />
              <span className="text-muted-foreground">Loading your children's profiles…</span>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Link Child Alert — shown only when no children linked */}
              {linkedChildren.length === 0 && (
                <Card className="p-6 border-2 border-primary">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Link2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-primary mb-2">Link Your Child's Profile</h3>
                      <p className="text-muted-foreground mb-4">
                        Connect your child's academy profile using the invite code provided by the coach.
                      </p>
                      <Button
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => navigate('/parent/link-child')}
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Link Child Profile
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Add More Children button */}
              {linkedChildren.length > 0 && (
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4>Have more children in the academy?</h4>
                      <p className="text-sm text-muted-foreground">
                        You can link multiple children's profiles
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => navigate('/parent/link-child')}
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Add Another Child
                    </Button>
                  </div>
                </Card>
              )}

              {/* Overdue Payments Alert — from real API data */}
              {!loadingFees && allOverdueFees.length > 0 && (
                <Card className="p-6 border-2 border-destructive">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <h3 className="text-destructive">
                      {allOverdueFees.length} Overdue Payment{allOverdueFees.length > 1 ? 's' : ''}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {allOverdueFees.map((fee) => {
                      const child = linkedChildren.find(c => String(c.id) === String(fee.playerID));
                      return (
                        <div key={fee.feeID} className="p-4 bg-destructive/5 rounded-lg flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="mb-0.5">{fee.playerName || child?.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {MONTH_NAMES[fee.month]} {fee.year} Academy Fee
                            </p>
                            <p className="text-xl font-semibold mt-1">LKR {fee.amountDue.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Due: {new Date(fee.dueDate).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <Button
                            className="bg-destructive hover:bg-destructive/90 gap-2 shrink-0"
                            onClick={() => handlePayNow(fee)}
                          >
                            <CreditCard className="w-4 h-4" />
                            Pay Now
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Children's Profiles */}
              {linkedChildren.length > 0 && (
                <div>
                  <h3 className="mb-4">My Children ({linkedChildren.length})</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {linkedChildren.map((child) => {
                      const overdueCount = getOverdueFees(child.id).length;
                      const pendingCount = getPendingFees(child.id).length;
                      const paidCount = getFeesByChild(child.id).filter(f => f.status === 'paid').length;
                      const nextUnpaidFee = [
                        ...getOverdueFees(child.id),
                        ...getPendingFees(child.id),
                      ][0];

                      return (
                        <Card
                          key={child.id}
                          className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => handleViewProfile(child.id)}
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <img
                              src={child.photo}
                              alt={child.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <h4 className="mb-1">{child.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                Age: {child.age} • {child.role}
                              </p>
                              {/* Payment badge pills */}
                              {!loadingFees && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {overdueCount > 0 && (
                                    <span className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-full font-medium">
                                      {overdueCount} Overdue
                                    </span>
                                  )}
                                  {pendingCount > 0 && (
                                    <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full font-medium">
                                      {pendingCount} Pending
                                    </span>
                                  )}
                                  {paidCount > 0 && overdueCount === 0 && pendingCount === 0 && (
                                    <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full font-medium">
                                      All Paid
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stats grid */}
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="mb-1">{child.stats.matches}</p>
                              <p className="text-xs text-muted-foreground">Matches</p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="mb-1">{child.stats.runs}</p>
                              <p className="text-xs text-muted-foreground">Runs</p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="mb-1">{child.stats.wickets}</p>
                              <p className="text-xs text-muted-foreground">Wickets</p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="mb-1">{child.stats.average}</p>
                              <p className="text-xs text-muted-foreground">Avg</p>
                            </div>
                          </div>

                          {/* Payment summary row */}
                          {!loadingFees && (
                            <div className="flex items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
                              <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 text-sm">
                                {overdueCount > 0 ? (
                                  <span className="text-destructive font-medium">
                                    LKR {getOverdueFees(child.id).reduce((s, f) => s + f.amountDue, 0).toLocaleString()} overdue
                                  </span>
                                ) : pendingCount > 0 ? (
                                  <span className="text-warning font-medium">
                                    LKR {getPendingFees(child.id).reduce((s, f) => s + f.amountDue, 0).toLocaleString()} pending
                                  </span>
                                ) : paidCount > 0 ? (
                                  <span className="text-success font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Payments up to date
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">No fee records yet</span>
                                )}
                              </div>
                              {/* Quick pay button for next unpaid fee */}
                              {nextUnpaidFee && (
                                <Button
                                  size="sm"
                                  className={`gap-1 shrink-0 ${
                                    nextUnpaidFee.status === 'overdue'
                                      ? 'bg-destructive hover:bg-destructive/90'
                                      : 'bg-primary hover:bg-primary/90'
                                  }`}
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handlePayNow(nextUnpaidFee);
                                  }}
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  Pay
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleViewProfile(child.id);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Profile
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                navigate('/parent/payments');
                              }}
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              All Payments
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Messages */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3>Recent Messages</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/parent/messages')}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    View All
                  </Button>
                </div>
                {unreadMessages.length > 0 ? (
                  <div className="space-y-4">
                    {unreadMessages.map((message) => (
                      <div key={message.id} className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm mb-2">{message.content}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleString()}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            onClick={() => navigate('/parent/messages')}
                          >
                            Reply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No new messages</p>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
