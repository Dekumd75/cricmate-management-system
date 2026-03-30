import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useApp } from './AppContext';
import { MessageSquare, Link2, Eye, CreditCard, Loader2 } from 'lucide-react';
import { ParentSidebar } from './ParentSidebar';
import api from '../services/api';

interface LinkedChild {
  id: string;
  name: string;
  age: number;
  role: string;
  photo: string;
  stats: { matches: number; runs: number; wickets: number; average: number };
}

export function ParentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, payments, messages } = useApp();
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);

  // Load linked children from DB on mount, and whenever we return from link-child with a refresh flag
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
  // Re-run when we return from link-child screen (refresh flag changes)
  }, [location.state?.refresh]);

  const linkedPlayerIds = linkedChildren.map(c => c.id);
  const allChildrenPayments = payments.filter(p => linkedPlayerIds.includes(p.playerId));
  const overduePayments = allChildrenPayments.filter(p => p.status === 'overdue');
  const unreadMessages = messages.filter(m => !m.read && m.to === user?.email);

  const handleViewProfile = (playerId: string) => {
    navigate(`/parent/player-profile?id=${playerId}`);
  };

  const handlePayNow = (payment: any, childName: string) => {
    navigate('/parent/payment', {
      state: {
        payment: {
          amount: payment.amount,
          description: `Monthly Academy Fee - ${childName}`,
          playerId: payment.playerId
        }
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <ParentSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="mb-8">Dashboard</h1>

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

              {/* Overdue Payments Alert */}
              {overduePayments.length > 0 && (
                <Card className="p-6 border-2 border-destructive">
                  <h3 className="text-destructive mb-4">
                    {overduePayments.length} Overdue Payment{overduePayments.length > 1 ? 's' : ''}
                  </h3>
                  <div className="space-y-4">
                    {overduePayments.map((payment) => {
                      const child = linkedChildren.find(c => c.id === payment.playerId);
                      return (
                        <div key={payment.id} className="p-4 bg-destructive/5 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="mb-1">{child?.name}</h4>
                              <p className="text-muted-foreground mb-3">Monthly fee payment</p>
                              <div className="mb-3">
                                <p className="text-2xl">LKR {payment.amount.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Due date: {new Date(payment.dueDate).toLocaleDateString()}
                                </p>
                              </div>
                              <Button
                                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                                onClick={() => handlePayNow(payment, child?.name || '')}
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Pay Now
                              </Button>
                            </div>
                          </div>
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
                      const childPayments = payments.filter(p => p.playerId === child.id);
                      const overdueCount = childPayments.filter(p => p.status === 'overdue').length;
                      const pendingCount = childPayments.filter(p => p.status === 'pending').length;

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
                              {(overdueCount > 0 || pendingCount > 0) && (
                                <div className="flex gap-2 mt-2">
                                  {overdueCount > 0 && (
                                    <span className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded">
                                      {overdueCount} Overdue
                                    </span>
                                  )}
                                  {pendingCount > 0 && (
                                    <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded">
                                      {pendingCount} Pending
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

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

                          <Button
                            variant="outline"
                            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleViewProfile(child.id);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Full Profile
                          </Button>
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
