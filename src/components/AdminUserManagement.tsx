import { useState, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner';
import adminService from '../services/adminService';
import userService from '../services/userService';
import { Search, UserPlus, Mail, Calendar } from 'lucide-react';

interface PendingParent {
  id: number;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

interface Coach {
  id: number;
  name: string;
  email: string;
  phone?: string;
  dateJoined: string;
}

interface ActiveUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function AdminUserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateCoachOpen, setIsCreateCoachOpen] = useState(false);
  const [pendingParents, setPendingParents] = useState<PendingParent[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [newCoach, setNewCoach] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  // Fetch pending parents from API
  useEffect(() => {
    const fetchPendingParents = async () => {
      try {
        const response = await adminService.getPendingParents();
        setPendingParents(response.pendingParents || []);
      } catch (error) {
        console.error('Failed to fetch pending parents:', error);
        toast.error('Failed to load pending parents');
      }
    };

    fetchPendingParents();
  }, []);

  // Fetch coaches from API
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const coaches = await userService.getCoaches();
        setCoaches(coaches);
      } catch (error) {
        console.error('Failed to fetch coaches:', error);
        toast.error('Failed to load coaches');
      }
    };

    fetchCoaches();
  }, []);

  // Fetch active users from API
  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        const users = await userService.getActiveUsers();
        setActiveUsers(users);
      } catch (error) {
        console.error('Failed to fetch active users:', error);
        toast.error('Failed to load active users');
      }
    };

    fetchActiveUsers();
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

  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await adminService.createCoach({
        name: newCoach.name,
        email: newCoach.email,
        phone: newCoach.phone,
        password: newCoach.password
      });

      toast.success(`Coach ${newCoach.name} has been created successfully!`);
      setIsCreateCoachOpen(false);
      setNewCoach({ name: '', email: '', phone: '', password: '' });

      // Refetch coaches to show the new coach immediately
      try {
        const updatedCoaches = await userService.getCoaches();
        setCoaches(updatedCoaches);
      } catch (error) {
        console.error('Failed to refresh coaches list:', error);
      }
    } catch (error: any) {
      console.error('Create coach error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create coach';
      toast.error(errorMessage);
    }
  };

  const filteredActiveUsers = activeUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCoaches = coaches.filter(coach =>
    coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coach.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1>User Management</h1>
            <Dialog open={isCreateCoachOpen} onOpenChange={setIsCreateCoachOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create New Coach
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Coach</DialogTitle>
                  <DialogDescription>
                    Add a new coach to the Future Stars Cricket Academy
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCoach}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="coach-name">Full Name</Label>
                      <Input
                        id="coach-name"
                        placeholder="Enter coach name"
                        value={newCoach.name}
                        onChange={(e) => setNewCoach({ ...newCoach, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coach-email">Email</Label>
                      <Input
                        id="coach-email"
                        type="email"
                        placeholder="coach@cricmate.com"
                        value={newCoach.email}
                        onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coach-phone">Phone Number</Label>
                      <Input
                        id="coach-phone"
                        type="tel"
                        placeholder="+94 77 123 4567"
                        value={newCoach.phone || ''}
                        onChange={(e) => setNewCoach({ ...newCoach, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coach-password">Password</Label>
                      <Input
                        id="coach-password"
                        type="password"
                        placeholder="Create a password"
                        value={newCoach.password}
                        onChange={(e) => setNewCoach({ ...newCoach, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateCoachOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90">
                      Create Coach
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="p-6">
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="pending">Pending Parents</TabsTrigger>
                <TabsTrigger value="active">Active Users</TabsTrigger>
                <TabsTrigger value="coaches">Coaches</TabsTrigger>
              </TabsList>

              {/* Pending Parents Tab */}
              <TabsContent value="pending">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3>Pending Parent Registrations</h3>
                    <div className="text-sm text-muted-foreground">
                      {pendingParents.length} pending approval{pendingParents.length !== 1 ? 's' : ''}
                    </div>
                  </div>

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
                            <tr key={parent.id} className="border-b border-border hover:bg-muted/50">
                              <td className="py-4 px-4 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm text-primary">{parent.name.charAt(0)}</span>
                                </div>
                                {parent.name}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                  {parent.email}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  {new Date(parent.createdAt).toLocaleDateString()}
                                </div>
                              </td>
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
                    <div className="text-center py-12 text-muted-foreground">
                      <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No pending parent registrations</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Active Users Tab */}
              <TabsContent value="active">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3>Active Users</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-muted-foreground">Name</th>
                          <th className="text-left py-3 px-4 text-muted-foreground">Role</th>
                          <th className="text-left py-3 px-4 text-muted-foreground">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActiveUsers.map((user) => (
                          <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                            <td className="py-4 px-4 flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm text-primary">{user.name.charAt(0)}</span>
                              </div>
                              {user.name}
                            </td>
                            <td className="py-4 px-4">
                              <span className="px-2 py-1 rounded-full bg-accent/10 text-accent text-xs">
                                {user.role}
                              </span>
                            </td>
                            <td className="py-4 px-4">{user.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Coaches Tab */}
              <TabsContent value="coaches">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3>Coaching Staff</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search coaches..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-muted-foreground">Name</th>
                          <th className="text-left py-3 px-4 text-muted-foreground">Email</th>
                          <th className="text-left py-3 px-4 text-muted-foreground">Date Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCoaches.map((coach) => (
                          <tr key={coach.id} className="border-b border-border hover:bg-muted/50">
                            <td className="py-4 px-4 flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm text-primary">{coach.name.charAt(0)}</span>
                              </div>
                              {coach.name}
                            </td>
                            <td className="py-4 px-4">{coach.email}</td>
                            <td className="py-4 px-4">{new Date(coach.dateJoined).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
