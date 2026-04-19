import { useState } from 'react';
import { CoachSidebar } from './CoachSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useApp } from './AppContext';
import {
  FileText, FileSpreadsheet, Users, TrendingUp,
  Calendar, Award, Target, BarChart3, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  formats: ('PDF' | 'Excel')[];
  apiEndpoint: string;
}

const API_URL = 'https://cricmate-backend.azurewebsites.net/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
});

const PDF_BRAND_COLOR: [number, number, number] = [34, 197, 94];
const PDF_ALT_ROW: [number, number, number] = [240, 250, 240];

function buildPDFHeader(doc: jsPDF, title: string) {
  const pageW = doc.internal.pageSize.width;
  doc.setFillColor(...PDF_BRAND_COLOR);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('🏏 CricMate', 14, 18);
  doc.setFontSize(12);
  doc.text(title, pageW - 14, 12, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Coach Report', pageW - 14, 20, { align: 'right' });
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
  doc.setTextColor(0, 0, 0);
}

function addPDFFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageH - 12, pageW, 12, 'F');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('CricMate Management System — Coach Report — Confidential', 14, pageH - 4);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 4, { align: 'right' });
  }
}

export function CoachReportsScreen() {
  const { players, attendance } = useApp();
  const [downloading, setDownloading] = useState<string | null>(null);

  const reports: ReportCard[] = [
    {
      id: 'player-performance',
      title: 'Player Performance Report',
      description: 'Comprehensive statistics for all players including runs, wickets, averages, and strike rates',
      icon: TrendingUp, color: 'text-primary',
      formats: ['PDF', 'Excel'],
      apiEndpoint: '/coach/reports/player-performance'
    },
    {
      id: 'attendance-summary',
      title: 'Attendance Summary',
      description: 'Complete attendance records with percentages and session counts for all players',
      icon: Calendar, color: 'text-accent',
      formats: ['PDF', 'Excel'],
      apiEndpoint: '/coach/reports/attendance-summary'
    },
    {
      id: 'team-statistics',
      title: 'Team Statistics',
      description: 'Overall team performance metrics, top performers, and comparative analysis',
      icon: BarChart3, color: 'text-chart-1',
      formats: ['PDF', 'Excel'],
      apiEndpoint: '/coach/reports/team-statistics'
    },
    {
      id: 'individual-player',
      title: 'Individual Player Report',
      description: 'Detailed report for each player with full performance stats and attendance',
      icon: Users, color: 'text-chart-2',
      formats: ['PDF', 'Excel'],
      apiEndpoint: '/coach/reports/individual-players'
    },
    {
      id: 'best-xi',
      title: 'Best XI Analysis',
      description: 'Performance-based team selection with justification for each player chosen',
      icon: Award, color: 'text-success',
      formats: ['PDF', 'Excel'],
      apiEndpoint: '/coach/reports/best-xi'
    },
    {
      id: 'training-progress',
      title: 'Training Progress Report',
      description: 'Player improvement tracking with progress ratings and training recommendations',
      icon: Target, color: 'text-warning',
      formats: ['PDF', 'Excel'],
      apiEndpoint: '/coach/reports/training-progress'
    }
  ];

  const fetchReportData = async (endpoint: string): Promise<any[]> => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    return json.data || [];
  };

  const generatePDF = (reportId: string, title: string, data: any[]) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    buildPDFHeader(doc, title);

    if (!data || data.length === 0) {
      doc.setFontSize(13);
      doc.setTextColor(150, 150, 150);
      doc.text('No data available.', 14, 50);
      addPDFFooter(doc);
      doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      return;
    }

    let columns: string[] = [];
    let rows: any[][] = [];

    switch (reportId) {
      case 'player-performance':
        columns = ['Name', 'Age', 'Role', 'Matches', 'Runs', 'Wickets', 'Avg', 'Strike Rate', 'Economy', 'Attendance'];
        rows = data.map(d => [
          d.name, d.age, d.role, d.matches, d.runs, d.wickets,
          d.battingAvg, d.strikeRate, d.economy, d.attendanceRate
        ]);
        break;

      case 'attendance-summary':
        columns = ['Player Name', 'Role', 'Total Sessions', 'Present', 'Absent', 'Early Leave', 'Attendance Rate'];
        rows = data.map(d => [d.playerName, d.role, d.totalSessions, d.present, d.absent, d.earlyLeave, d.attendanceRate]);
        break;

      case 'team-statistics':
        columns = ['Metric', 'Value'];
        rows = data.map(d => [d.metric, String(d.value)]);
        break;

      case 'individual-player':
        // Multi-section PDF: one autoTable row per player detail field
        data.forEach((player, index) => {
          if (index > 0) doc.addPage();
          if (index > 0) buildPDFHeader(doc, title);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(34, 197, 94);
          doc.text(`${index + 1}. ${player.name.toUpperCase()}`, 14, 44);
          doc.setTextColor(0, 0, 0);

          autoTable(doc, {
            startY: 50,
            head: [['Field', 'Value']],
            body: [
              ['Age', String(player.age)],
              ['Role', player.role],
              ['Batting Style', player.battingStyle],
              ['Bowling Style', player.bowlingStyle],
              ['Matches Played', String(player.matches)],
              ['Total Runs', String(player.runs)],
              ['Total Wickets', String(player.wickets)],
              ['Batting Average', String(player.battingAvg)],
              ['Strike Rate', String(player.strikeRate)],
              ['Economy', String(player.economy)],
              ['Total Sessions', String(player.totalSessions)],
              ['Sessions Present', String(player.presentSessions)],
              ['Attendance Rate', player.attendanceRate]
            ],
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: PDF_BRAND_COLOR, textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: PDF_ALT_ROW },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
            margin: { left: 14, right: 14 }
          });
        });
        addPDFFooter(doc);
        doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        return;

      case 'best-xi':
        columns = ['#', 'Player Name', 'Role', 'Runs', 'Wickets', 'Avg', 'Strike Rate', 'Attendance', 'Selection Reason'];
        rows = data.map(d => [
          d.position, d.playerName, d.role, d.runs, d.wickets,
          d.battingAvg, d.strikeRate, d.attendanceRate, d.selectionReason
        ]);
        break;

      case 'training-progress':
        columns = ['Player Name', 'Role', 'Matches', 'Runs', 'Wickets', 'Avg', 'Attendance', 'Rating', 'Recommendation'];
        rows = data.map(d => [
          d.playerName, d.role, d.matches, d.runs, d.wickets,
          d.battingAvg, d.attendanceRate, d.progressRating, d.recommendation
        ]);
        break;

      default:
        columns = Object.keys(data[0]);
        rows = data.map(d => columns.map(c => String(d[c] ?? '')));
    }

    autoTable(doc, {
      startY: 40,
      head: [columns],
      body: rows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: PDF_BRAND_COLOR, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: PDF_ALT_ROW },
      margin: { left: 14, right: 14 }
    });

    addPDFFooter(doc);
    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateExcel = (reportId: string, title: string, data: any[]) => {
    if (!data || data.length === 0) {
      toast.error('No data available to export.');
      return;
    }

    let exportData: any[] = [];

    switch (reportId) {
      case 'player-performance':
        exportData = data.map(d => ({
          'Player Name': d.name, 'Age': d.age, 'Role': d.role,
          'Batting Style': d.battingStyle, 'Bowling Style': d.bowlingStyle,
          'Matches': d.matches, 'Runs': d.runs, 'Wickets': d.wickets,
          'Batting Avg': d.battingAvg, 'Strike Rate': d.strikeRate,
          'Economy': d.economy, 'Attendance Rate': d.attendanceRate
        }));
        break;
      case 'attendance-summary':
        exportData = data.map(d => ({
          'Player Name': d.playerName, 'Role': d.role,
          'Total Sessions': d.totalSessions, 'Present': d.present,
          'Absent': d.absent, 'Early Leave': d.earlyLeave,
          'Attendance Rate': d.attendanceRate
        }));
        break;
      case 'team-statistics':
        exportData = data.map(d => ({ 'Metric': d.metric, 'Value': String(d.value) }));
        break;
      case 'individual-player':
        exportData = data.map(d => ({
          'Player Name': d.name, 'Age': d.age, 'Role': d.role,
          'Batting Style': d.battingStyle, 'Bowling Style': d.bowlingStyle,
          'Matches': d.matches, 'Runs': d.runs, 'Wickets': d.wickets,
          'Batting Avg': d.battingAvg, 'Strike Rate': d.strikeRate,
          'Economy': d.economy, 'Total Sessions': d.totalSessions,
          'Sessions Present': d.presentSessions, 'Attendance Rate': d.attendanceRate
        }));
        break;
      case 'best-xi':
        exportData = data.map(d => ({
          'Position': d.position, 'Player Name': d.playerName, 'Role': d.role,
          'Runs': d.runs, 'Wickets': d.wickets,
          'Batting Avg': d.battingAvg, 'Strike Rate': d.strikeRate,
          'Attendance Rate': d.attendanceRate, 'Selection Reason': d.selectionReason
        }));
        break;
      case 'training-progress':
        exportData = data.map(d => ({
          'Player Name': d.playerName, 'Role': d.role, 'Age': d.age,
          'Matches': d.matches, 'Runs': d.runs, 'Wickets': d.wickets,
          'Batting Avg': d.battingAvg, 'Strike Rate': d.strikeRate,
          'Attendance Rate': d.attendanceRate,
          'Progress Rating': d.progressRating, 'Recommendation': d.recommendation
        }));
        break;
      default:
        exportData = data;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const cols = Object.keys(exportData[0]).map(key => ({ wch: Math.max(key.length + 2, 20) }));
    ws['!cols'] = cols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 30));
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownload = async (report: ReportCard, format: 'PDF' | 'Excel') => {
    const key = `${report.id}-${format}`;
    setDownloading(key);
    try {
      const data = await fetchReportData(report.apiEndpoint);
      if (format === 'PDF') {
        generatePDF(report.id, report.title, data);
      } else {
        generateExcel(report.id, report.title, data);
      }
      toast.success(`${report.title} (${format}) downloaded successfully!`);
    } catch (error: any) {
      console.error('Report download error:', error);
      toast.error(`Failed to download: ${error.message}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <CoachSidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="mb-2">Generate Reports</h1>
            <p className="text-muted-foreground">
              Download comprehensive reports with real-time data as PDF or Excel
            </p>
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <Card key={report.id} className="p-6 hover:shadow-lg transition-all duration-200 border hover:border-primary/30">
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
                    {report.formats.includes('PDF') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleDownload(report, 'PDF')}
                        disabled={downloading === `${report.id}-PDF`}
                      >
                        {downloading === `${report.id}-PDF` ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4 mr-1" />
                        )}
                        {downloading === `${report.id}-PDF` ? 'Generating...' : 'Download PDF'}
                      </Button>
                    )}
                    {report.formats.includes('Excel') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-green-500 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                        onClick={() => handleDownload(report, 'Excel')}
                        disabled={downloading === `${report.id}-Excel`}
                      >
                        {downloading === `${report.id}-Excel` ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 mr-1" />
                        )}
                        {downloading === `${report.id}-Excel` ? 'Generating...' : 'Download Excel'}
                      </Button>
                    )}
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
                <p className="text-sm text-muted-foreground">Attendance Records</p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
