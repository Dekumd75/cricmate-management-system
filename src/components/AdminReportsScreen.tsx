import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useApp } from './AppContext';
import { Download, FileText, Users, CreditCard, Calendar, UserCheck, TrendingUp } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: string;
}

export function AdminReportsScreen() {
  const { players, payments, coaches, parents } = useApp();

  const reports: ReportCard[] = [
    {
      id: 'all-payments',
      title: 'Full Payment Report',
      description: 'Complete list of all payments including pending, paid, and overdue',
      icon: CreditCard,
      category: 'Financial'
    },
    {
      id: 'overdue-payments',
      title: 'Overdue Payments Report',
      description: 'List of all overdue payments with parent and player details',
      icon: TrendingUp,
      category: 'Financial'
    },
    {
      id: 'coaches-list',
      title: 'Coaches List',
      description: 'Complete list of all registered coaches with contact information',
      icon: UserCheck,
      category: 'Personnel'
    },
    {
      id: 'players-list',
      title: 'Players List',
      description: 'Complete list of all registered players with statistics',
      icon: Users,
      category: 'Personnel'
    },
    {
      id: 'parents-list',
      title: 'Parents List',
      description: 'Complete list of all parents with linked player information',
      icon: Users,
      category: 'Personnel'
    },
    {
      id: 'attendance-report',
      title: 'Attendance Report',
      description: 'Monthly attendance summary for all players',
      icon: Calendar,
      category: 'Operations'
    },
    {
      id: 'performance-report',
      title: 'Player Performance Report',
      description: 'Detailed performance metrics for all players',
      icon: TrendingUp,
      category: 'Operations'
    },
    {
      id: 'monthly-summary',
      title: 'Monthly Summary Report',
      description: 'Comprehensive monthly business summary including financials and attendance',
      icon: FileText,
      category: 'Summary'
    }
  ];

  const generateCSV = (data: any[], filename: string) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const downloadReport = (reportId: string) => {
    let csvData = '';
    let filename = '';
    
    switch (reportId) {
      case 'all-payments':
        const paymentData = payments.map(p => ({
          'Player ID': p.playerId,
          'Player Name': players.find(pl => pl.id === p.playerId)?.name || 'N/A',
          'Amount (LKR)': p.amount,
          'Due Date': new Date(p.dueDate).toLocaleDateString(),
          'Status': p.status,
          'Payment ID': p.id
        }));
        csvData = generateCSV(paymentData, 'all-payments');
        filename = 'full-payment-report.csv';
        break;
        
      case 'overdue-payments':
        const overdueData = payments
          .filter(p => p.status === 'overdue')
          .map(p => {
            const player = players.find(pl => pl.id === p.playerId);
            return {
              'Player Name': player?.name || 'N/A',
              'Player Age': player?.age || 'N/A',
              'Amount (LKR)': p.amount,
              'Due Date': new Date(p.dueDate).toLocaleDateString(),
              'Days Overdue': Math.floor((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            };
          });
        csvData = generateCSV(overdueData, 'overdue-payments');
        filename = 'overdue-payments-report.csv';
        break;
        
      case 'coaches-list':
        const coachData = coaches.map(c => ({
          'Name': c.name,
          'Email': c.email,
          'Coach ID': c.id,
          'Status': 'Active'
        }));
        csvData = generateCSV(coachData, 'coaches-list');
        filename = 'coaches-list.csv';
        break;
        
      case 'players-list':
        const playerData = players.map(p => ({
          'Name': p.name,
          'Age': p.age,
          'Role': p.role,
          'Matches': p.stats.matches,
          'Runs': p.stats.runs,
          'Wickets': p.stats.wickets,
          'Average': p.stats.average,
          'Invite Code': p.inviteCode
        }));
        csvData = generateCSV(playerData, 'players-list');
        filename = 'players-list.csv';
        break;
        
      case 'parents-list':
        const parentData = parents.map(parent => {
          const linkedPlayer = players.find(p => p.id === parent.linkedPlayerId);
          return {
            'Parent Name': parent.name,
            'Email': parent.email,
            'Child Name': linkedPlayer?.name || 'Not Linked',
            'Status': parent.status
          };
        });
        csvData = generateCSV(parentData, 'parents-list');
        filename = 'parents-list.csv';
        break;
        
      case 'attendance-report':
        const attendanceData = players.map(p => ({
          'Player Name': p.name,
          'Age': p.age,
          'Role': p.role,
          'Total Sessions': 20,
          'Present': 18,
          'Absent': 2,
          'Attendance Rate': '90%'
        }));
        csvData = generateCSV(attendanceData, 'attendance-report');
        filename = 'attendance-report.csv';
        break;
        
      case 'performance-report':
        const performanceData = players.map(p => ({
          'Player Name': p.name,
          'Role': p.role,
          'Matches': p.stats.matches,
          'Runs': p.stats.runs,
          'Wickets': p.stats.wickets,
          'Average': p.stats.average,
          'Strike Rate': p.stats.strikeRate,
          'Economy': p.stats.economy
        }));
        csvData = generateCSV(performanceData, 'performance-report');
        filename = 'performance-report.csv';
        break;
        
      case 'monthly-summary':
        const summaryData = [{
          'Report Month': new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          'Total Players': players.length,
          'Total Coaches': coaches.length,
          'Total Parents': parents.length,
          'Total Payments': payments.length,
          'Paid Payments': payments.filter(p => p.status === 'paid').length,
          'Overdue Payments': payments.filter(p => p.status === 'overdue').length,
          'Total Revenue (LKR)': payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
          'Outstanding Amount (LKR)': payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0)
        }];
        csvData = generateCSV(summaryData, 'monthly-summary');
        filename = 'monthly-summary-report.csv';
        break;
        
      default:
        toast.error('Report type not found');
        return;
    }
    
    // Create and download CSV file
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${filename} downloaded successfully!`);
  };

  const categories = ['All', 'Financial', 'Personnel', 'Operations', 'Summary'];
  const [selectedCategory, setSelectedCategory] = React.useState('All');

  const filteredReports = selectedCategory === 'All' 
    ? reports 
    : reports.filter(r => r.category === selectedCategory);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="mb-2">Business Reports</h1>
            <p className="text-muted-foreground">
              Download comprehensive reports for business operations and analytics
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? 'bg-primary hover:bg-primary/90' : ''}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl">{players.length}</p>
                  <p className="text-sm text-muted-foreground">Total Players</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl">{coaches.length}</p>
                  <p className="text-sm text-muted-foreground">Total Coaches</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl">{payments.filter(p => p.status === 'paid').length}</p>
                  <p className="text-sm text-muted-foreground">Paid Payments</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl">{payments.filter(p => p.status === 'overdue').length}</p>
                  <p className="text-sm text-muted-foreground">Overdue Payments</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => {
              const Icon = report.icon;
              return (
                <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1">{report.title}</h3>
                      <span className="inline-block px-2 py-1 text-xs bg-muted rounded-full mb-2">
                        {report.category}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => downloadReport(report.id)}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
