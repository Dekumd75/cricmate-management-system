import { useState } from 'react';
import { CoachSidebar } from './CoachSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useApp } from './AppContext';
import { 
  FileText, 
  Download, 
  Users, 
  TrendingUp, 
  Calendar,
  Award,
  Target,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  format: string[];
}

export function CoachReportsScreen() {
  const { players, attendance } = useApp();
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  const reports: ReportCard[] = [
    {
      id: 'player-performance',
      title: 'Player Performance Report',
      description: 'Comprehensive statistics for all players including runs, wickets, averages, and strike rates',
      icon: TrendingUp,
      color: 'text-primary',
      format: ['PDF', 'Excel']
    },
    {
      id: 'attendance-summary',
      title: 'Attendance Summary',
      description: 'Complete attendance records with percentages and trends for all players',
      icon: Calendar,
      color: 'text-accent',
      format: ['PDF', 'Excel']
    },
    {
      id: 'team-statistics',
      title: 'Team Statistics',
      description: 'Overall team performance metrics, win rates, and comparative analysis',
      icon: BarChart3,
      color: 'text-chart-1',
      format: ['PDF', 'Excel']
    },
    {
      id: 'individual-player',
      title: 'Individual Player Report',
      description: 'Detailed report for each player with performance graphs and progress tracking',
      icon: Users,
      color: 'text-chart-2',
      format: ['PDF']
    },
    {
      id: 'best-xi',
      title: 'Best XI Analysis',
      description: 'AI-recommended team selection with performance justifications and alternative options',
      icon: Award,
      color: 'text-success',
      format: ['PDF']
    },
    {
      id: 'training-progress',
      title: 'Training Progress Report',
      description: 'Player improvement tracking with skill development metrics and recommendations',
      icon: Target,
      color: 'text-warning',
      format: ['PDF', 'Excel']
    }
  ];

  const generateReportData = (reportId: string, format: string) => {
    switch (reportId) {
      case 'player-performance':
        return generatePlayerPerformanceReport(format);
      case 'attendance-summary':
        return generateAttendanceReport(format);
      case 'team-statistics':
        return generateTeamStatisticsReport(format);
      case 'individual-player':
        return generateIndividualPlayerReport(format);
      case 'best-xi':
        return generateBestXIReport(format);
      case 'training-progress':
        return generateTrainingProgressReport(format);
      default:
        return '';
    }
  };

  const generatePlayerPerformanceReport = (format: string) => {
    if (format === 'Excel') {
      // CSV format for Excel
      let csv = 'Player Name,Age,Role,Matches,Runs,Wickets,Average,Strike Rate\n';
      players.forEach(player => {
        csv += `${player.name},${player.age},${player.role},${player.stats.matches},${player.stats.runs},${player.stats.wickets},${player.stats.average},${player.stats.strikeRate}\n`;
      });
      return csv;
    }
    
    // Text format for PDF
    let content = 'PLAYER PERFORMANCE REPORT\n';
    content += '=' .repeat(80) + '\n\n';
    content += `Report Generated: ${new Date().toLocaleString()}\n`;
    content += `Total Players: ${players.length}\n\n`;
    
    players.forEach((player, index) => {
      content += `${index + 1}. ${player.name}\n`;
      content += `   Age: ${player.age} | Role: ${player.role}\n`;
      content += `   Matches: ${player.stats.matches} | Runs: ${player.stats.runs} | Wickets: ${player.stats.wickets}\n`;
      content += `   Average: ${player.stats.average} | Strike Rate: ${player.stats.strikeRate}\n\n`;
    });
    
    return content;
  };

  const generateAttendanceReport = (format: string) => {
    if (format === 'Excel') {
      let csv = 'Player Name,Total Sessions,Present,Absent,Attendance %\n';
      players.forEach(player => {
        const playerAttendance = attendance.filter(r => r.playerId === player.id);
        const total = playerAttendance.length;
        const present = playerAttendance.filter(r => r.status === 'present').length;
        const absent = total - present;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
        csv += `${player.name},${total},${present},${absent},${percentage}%\n`;
      });
      return csv;
    }
    
    let content = 'ATTENDANCE SUMMARY REPORT\n';
    content += '=' .repeat(80) + '\n\n';
    content += `Report Generated: ${new Date().toLocaleString()}\n`;
    content += `Total Players: ${players.length}\n\n`;
    
    players.forEach((player, index) => {
      const playerAttendance = attendance.filter(r => r.playerId === player.id);
      const total = playerAttendance.length;
      const present = playerAttendance.filter(r => r.status === 'present').length;
      const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
      
      content += `${index + 1}. ${player.name}\n`;
      content += `   Total Sessions: ${total} | Present: ${present}\n`;
      content += `   Attendance Rate: ${percentage}%\n\n`;
    });
    
    return content;
  };

  const generateTeamStatisticsReport = (format: string) => {
    const totalRuns = players.reduce((sum, p) => sum + p.stats.runs, 0);
    const totalWickets = players.reduce((sum, p) => sum + p.stats.wickets, 0);
    const totalMatches = players.reduce((sum, p) => sum + p.stats.matches, 0);
    const avgRuns = (totalRuns / players.length).toFixed(2);
    const avgWickets = (totalWickets / players.length).toFixed(2);
    
    if (format === 'Excel') {
      let csv = 'Metric,Value\n';
      csv += `Total Players,${players.length}\n`;
      csv += `Total Runs Scored,${totalRuns}\n`;
      csv += `Total Wickets Taken,${totalWickets}\n`;
      csv += `Total Matches Played,${totalMatches}\n`;
      csv += `Average Runs per Player,${avgRuns}\n`;
      csv += `Average Wickets per Player,${avgWickets}\n`;
      return csv;
    }
    
    let content = 'TEAM STATISTICS REPORT\n';
    content += '=' .repeat(80) + '\n\n';
    content += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    content += 'OVERALL TEAM METRICS\n';
    content += '-' .repeat(40) + '\n';
    content += `Total Players: ${players.length}\n`;
    content += `Total Runs Scored: ${totalRuns}\n`;
    content += `Total Wickets Taken: ${totalWickets}\n`;
    content += `Total Matches Played: ${totalMatches}\n`;
    content += `Average Runs per Player: ${avgRuns}\n`;
    content += `Average Wickets per Player: ${avgWickets}\n\n`;
    
    content += 'TOP PERFORMERS\n';
    content += '-' .repeat(40) + '\n';
    const topScorer = [...players].sort((a, b) => b.stats.runs - a.stats.runs)[0];
    const topBowler = [...players].sort((a, b) => b.stats.wickets - a.stats.wickets)[0];
    content += `Top Run Scorer: ${topScorer?.name} (${topScorer?.stats.runs} runs)\n`;
    content += `Top Wicket Taker: ${topBowler?.name} (${topBowler?.stats.wickets} wickets)\n`;
    
    return content;
  };

  const generateIndividualPlayerReport = (format: string) => {
    let content = 'INDIVIDUAL PLAYER REPORTS\n';
    content += '=' .repeat(80) + '\n\n';
    content += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    
    players.forEach((player, index) => {
      content += `PLAYER ${index + 1}: ${player.name.toUpperCase()}\n`;
      content += '-' .repeat(80) + '\n';
      content += `Age: ${player.age}\n`;
      content += `Role: ${player.role}\n`;
      content += `Contact: ${player.contact}\n\n`;
      
      content += 'PERFORMANCE STATISTICS\n';
      content += `  Matches Played: ${player.stats.matches}\n`;
      content += `  Total Runs: ${player.stats.runs}\n`;
      content += `  Total Wickets: ${player.stats.wickets}\n`;
      content += `  Batting Average: ${player.stats.average}\n`;
      content += `  Strike Rate: ${player.stats.strikeRate}\n\n`;
      
      const playerAttendance = attendance.filter(r => r.playerId === player.id);
      const attendanceRate = playerAttendance.length > 0 
        ? ((playerAttendance.filter(r => r.status === 'present').length / playerAttendance.length) * 100).toFixed(1)
        : '0';
      
      content += 'ATTENDANCE\n';
      content += `  Attendance Rate: ${attendanceRate}%\n`;
      content += `  Total Sessions: ${playerAttendance.length}\n\n`;
      content += '=' .repeat(80) + '\n\n';
    });
    
    return content;
  };

  const generateBestXIReport = (format: string) => {
    const batsmen = [...players]
      .filter(p => p.role === 'Batsman')
      .sort((a, b) => b.stats.runs - a.stats.runs)
      .slice(0, 5);
    
    const bowlers = [...players]
      .filter(p => p.role === 'Bowler')
      .sort((a, b) => b.stats.wickets - a.stats.wickets)
      .slice(0, 4);
    
    const allRounders = [...players]
      .filter(p => p.role === 'All-rounder')
      .sort((a, b) => (b.stats.runs + b.stats.wickets * 20) - (a.stats.runs + a.stats.wickets * 20))
      .slice(0, 2);
    
    let content = 'BEST XI ANALYSIS REPORT\n';
    content += '=' .repeat(80) + '\n\n';
    content += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    
    content += 'RECOMMENDED PLAYING XI\n';
    content += '-' .repeat(40) + '\n\n';
    
    content += 'BATSMEN\n';
    batsmen.forEach((player, i) => {
      content += `${i + 1}. ${player.name} - ${player.stats.runs} runs, Avg: ${player.stats.average}\n`;
    });
    
    content += '\nALL-ROUNDERS\n';
    allRounders.forEach((player, i) => {
      content += `${i + 1}. ${player.name} - ${player.stats.runs} runs, ${player.stats.wickets} wickets\n`;
    });
    
    content += '\nBOWLERS\n';
    bowlers.forEach((player, i) => {
      content += `${i + 1}. ${player.name} - ${player.stats.wickets} wickets\n`;
    });
    
    content += '\nSELECTION RATIONALE\n';
    content += '-' .repeat(40) + '\n';
    content += 'Team selection based on recent performance statistics including:\n';
    content += '- Batting performance and consistency\n';
    content += '- Bowling effectiveness and wicket-taking ability\n';
    content += '- All-round contribution to team balance\n';
    content += '- Attendance and commitment levels\n';
    
    return content;
  };

  const generateTrainingProgressReport = (format: string) => {
    if (format === 'Excel') {
      let csv = 'Player Name,Role,Matches,Runs,Wickets,Progress Rating\n';
      players.forEach(player => {
        const rating = calculateProgressRating(player);
        csv += `${player.name},${player.role},${player.stats.matches},${player.stats.runs},${player.stats.wickets},${rating}\n`;
      });
      return csv;
    }
    
    let content = 'TRAINING PROGRESS REPORT\n';
    content += '=' .repeat(80) + '\n\n';
    content += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    
    players.forEach((player, index) => {
      const rating = calculateProgressRating(player);
      content += `${index + 1}. ${player.name}\n`;
      content += `   Role: ${player.role}\n`;
      content += `   Progress Rating: ${rating}/10\n`;
      content += `   Current Stats: ${player.stats.runs} runs, ${player.stats.wickets} wickets\n`;
      content += `   Recommendation: ${getTrainingRecommendation(player)}\n\n`;
    });
    
    return content;
  };

  const calculateProgressRating = (player: any): number => {
    const runsScore = Math.min(player.stats.runs / 100, 5);
    const wicketsScore = Math.min(player.stats.wickets / 10, 5);
    return Math.min(10, Math.round(runsScore + wicketsScore));
  };

  const getTrainingRecommendation = (player: any): string => {
    if (player.stats.runs < 200 && player.role !== 'Bowler') {
      return 'Focus on batting technique and consistency';
    }
    if (player.stats.wickets < 10 && player.role !== 'Batsman') {
      return 'Improve bowling accuracy and variation';
    }
    return 'Maintain current performance level';
  };

  const handleDownload = (reportId: string, format: string, title: string) => {
    setDownloadingReport(`${reportId}-${format}`);
    
    setTimeout(() => {
      try {
        const content = generateReportData(reportId, format);
        const blob = new Blob([content], { 
          type: format === 'Excel' ? 'text/csv' : 'text/plain' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format === 'Excel' ? 'csv' : 'txt'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success(`${title} downloaded successfully!`);
      } catch (error) {
        toast.error('Failed to download report. Please try again.');
      } finally {
        setDownloadingReport(null);
      }
    }, 1000);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <CoachSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="mb-2">Generate Reports</h1>
            <p className="text-muted-foreground">
              Download comprehensive reports for player statistics, attendance, and team performance
            </p>
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 ${report.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-2">{report.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    {report.format.map((format) => (
                      <Button
                        key={format}
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={() => handleDownload(report.id, format, report.title)}
                        disabled={downloadingReport === `${report.id}-${format}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {downloadingReport === `${report.id}-${format}` 
                          ? 'Downloading...' 
                          : `Download ${format}`}
                      </Button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Quick Stats Summary */}
          <div className="mt-8">
            <h3 className="mb-4">Quick Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl mb-1">{players.length}</p>
                <p className="text-sm text-muted-foreground">Total Players</p>
              </Card>
              <Card className="p-4 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-success" />
                <p className="text-2xl mb-1">
                  {players.reduce((sum, p) => sum + p.stats.runs, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Runs</p>
              </Card>
              <Card className="p-4 text-center">
                <Target className="w-8 h-8 mx-auto mb-2 text-accent" />
                <p className="text-2xl mb-1">
                  {players.reduce((sum, p) => sum + p.stats.wickets, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Wickets</p>
              </Card>
              <Card className="p-4 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-chart-1" />
                <p className="text-2xl mb-1">{attendance.length}</p>
                <p className="text-sm text-muted-foreground">Training Sessions</p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
