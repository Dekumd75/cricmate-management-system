import { useEffect, useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Users, UserCheck, Activity, FileText, Clock } from 'lucide-react';
import { useApp } from './AppContext';
import { toast } from 'sonner';
import adminService from '../services/adminService';

interface AuditLog {
  auditLogID: number;
  action: string;
  entity: string;
  entityID: number;
  timestamp: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

interface PendingParent {
  id: number;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

export function AdminDashboard() {
  const { players, coaches } = useApp();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [pendingParents, setPendingParents] = useState<PendingParent[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);

  // Get all active parents (players with parentId)
  const totalParents = players.filter(p => p.parentId).length;

  // Fetch audit logs
  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const response = await adminService.getAuditLogs();
        setAuditLogs(response.auditLogs || []);
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        toast.error('Failed to load audit logs');
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchAuditLogs();
  }, []);

  // Fetch pending parents
  useEffect(() => {
    const fetchPendingParents = async () => {
      try {
        const response = await adminService.getPendingParents();
        setPendingParents(response.pendingParents || []);
      } catch (error) {
        console.error('Failed to fetch pending parents:', error);
        toast.error('Failed to load pending parents');
      } finally {
        setLoadingParents(false);
      }
    };

    fetchPendingParents();
  }, []);

  const handleApproveParent = async (parentId: number, parentName: string) => {
    try {
      await adminService.approveParent(parentId);
      setPendingParents(pendingParents.filter(p => p.id !== parentId));
      toast.success(`${parentName} has been approved!`, {
        description: 'An email notification has been sent to the parent.'
      });
    } catch (error) {
      console.error('Failed to approve parent:', error);
      toast.error('Failed to approve parent. Please try again.');
    }
  };

  const handleRejectParent = async (parentId: number, parentName: string) => {
    try {
      await adminService.rejectParent(parentId);
      setPendingParents(pendingParents.filter(p => p.id !== parentId));
      toast.error(`${parentName}'s registration has been rejected.`);
    } catch (error) {
      console.error('Failed to reject parent:', error);
      toast.error('Failed to reject parent. Please try again.');
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatTimestamp = (timestamp: string) => {
    // Parse the timestamp and convert to Sri Lanka time
    const date = new Date(timestamp);

    // Get current time in Sri Lanka timezone
    const now = new Date();
    const sriLankaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }));
    const sriLankaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }));

    const diffMs = sriLankaTime.getTime() - sriLankaDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    // For older dates, show formatted date in Sri Lanka timezone
    return date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
                        <td className="py-4 px-4">{new Date(parent.createdAt).toLocaleDateString()}</td>
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

          {/* Audit Log Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-primary" />
              <h3>Recent Activity</h3>
            </div>
            {loadingLogs ? (
              <p className="text-muted-foreground text-center py-8">Loading audit logs...</p>
            ) : auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.auditLogID}
                    className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {formatAction(log.action)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {log.user ? `By ${log.user.name} (${log.user.role})` : 'System action'}
                        {' • '}
                        {log.entity} ID: {log.entityID}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-2 text-sm text-muted-foreground shrink-0"
                      title={new Date(log.timestamp).toLocaleString('en-US', {
                        timeZone: 'Asia/Colombo',
                        dateStyle: 'full',
                        timeStyle: 'long'
                      })}
                    >
                      <Clock className="w-4 h-4" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No audit logs available</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
