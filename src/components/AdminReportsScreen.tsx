import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useApp } from './AppContext';
import {
  FileText, Users, CreditCard,
  UserCheck, TrendingUp, Loader2, FileSpreadsheet
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
  category: string;
  apiEndpoint: string;
  formats: ('PDF' | 'Excel')[];
}

const API_URL = 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
});

const PDF_BRAND_COLOR: [number, number, number] = [34, 197, 94];
const PDF_HEADER_BG: [number, number, number] = [240, 250, 240];

function buildPDFHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageW = doc.internal.pageSize.width;

  // Green header bar
  doc.setFillColor(...PDF_BRAND_COLOR);
  doc.rect(0, 0, pageW, 28, 'F');

  // Logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('🏏 CricMate', 14, 18);

  // Title on right
  doc.setFontSize(12);
  doc.text(title, pageW - 14, 12, { align: 'right' });
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageW - 14, 20, { align: 'right' });
  }

  // Date line below header
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
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
    doc.text('CricMate Management System — Confidential', 14, pageH - 4);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 4, { align: 'right' });
  }
}

function downloadAsExcel(data: any[], filename: string, sheetTitle: string) {
  if (!data || data.length === 0) {
    toast.error('No data available to export.');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  // Auto-width columns
  const cols = Object.keys(data[0]).map(key => ({ wch: Math.max(key.length + 2, 18) }));
  ws['!cols'] = cols;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function AdminReportsScreen() {
  const { players, payments, coaches } = useApp();
  const [downloading, setDownloading] = useState<string | null>(null);

  const reports: ReportCard[] = [
    {
      id: 'all-payments', title: 'Full Payment Report',
      description: 'Complete list of all payments including pending, paid, and overdue',
      icon: CreditCard, category: 'Financial',
      apiEndpoint: '/admin/reports/payments',
      formats: ['PDF', 'Excel']
    },
    {
      id: 'overdue-payments', title: 'Overdue Payments Report',
      description: 'List of all overdue payments with player details and days overdue',
      icon: TrendingUp, category: 'Financial',
      apiEndpoint: '/admin/reports/overdue-payments',
      formats: ['PDF', 'Excel']
    },
    {
      id: 'coaches-list', title: 'Coaches List',
      description: 'Complete list of all registered coaches with contact information',
      icon: UserCheck, category: 'Personnel',
      apiEndpoint: '/admin/reports/coaches',
      formats: ['PDF', 'Excel']
    },
    {
      id: 'players-list', title: 'Players List',
      description: 'Complete list of all registered players with statistics',
      icon: Users, category: 'Personnel',
      apiEndpoint: '/admin/reports/players',
      formats: ['PDF', 'Excel']
    },
    {
      id: 'parents-list', title: 'Parents List',
      description: 'Complete list of all parents with linked player information',
      icon: Users, category: 'Personnel',
      apiEndpoint: '/admin/reports/parents',
      formats: ['PDF', 'Excel']
    },
    {
      id: 'monthly-summary', title: 'Monthly Summary Report',
      description: 'Comprehensive monthly snapshot including players, coaches, and attendance',
      icon: FileText, category: 'Summary',
      apiEndpoint: '/admin/reports/monthly-summary',
      formats: ['PDF', 'Excel']
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

  // ---------- PDF generators per report ----------
  const generatePDF = (reportId: string, title: string, data: any[]) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    buildPDFHeader(doc, title, `CricMate Admin Report`);

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
      case 'all-payments':
        columns = ['Player Name', 'Amount (LKR)', 'Month', 'Due Date', 'Status'];
        rows = data.map(d => [d.playerName, d.amount, d.month, d.dueDate, d.status]);
        break;
      case 'overdue-payments':
        columns = ['Player Name', 'Age', 'Amount (LKR)', 'Due Date', 'Days Overdue', 'Status'];
        rows = data.map(d => [d.playerName, d.playerAge, d.amount, d.dueDate, d.daysOverdue, d.status]);
        break;
      case 'coaches-list':
        columns = ['Coach ID', 'Name', 'Email', 'Phone', 'Status', 'Date Joined'];
        rows = data.map(d => [d.id, d.name, d.email, d.phone || 'N/A', d.status, d.dateJoined]);
        break;
      case 'players-list':
        columns = ['Player ID', 'Name', 'Age', 'Role', 'Matches', 'Runs', 'Wickets', 'Avg', 'SR'];
        rows = data.map(d => [d.id, d.name, d.age, d.role, d.matches, d.runs, d.wickets, d.battingAvg, d.strikeRate]);
        break;
      case 'parents-list':
        columns = ['Parent ID', 'Name', 'Email', 'Phone', 'Linked Children', 'Total Children', 'Status'];
        rows = data.map(d => [d.id, d.name, d.email, d.phone || 'N/A', d.linkedChildren, d.totalChildren, d.status]);
        break;
      case 'attendance-report':
        columns = ['Player Name', 'Role', 'Total Sessions', 'Present', 'Absent', 'Early Leave', 'Rate'];
        rows = data.map(d => [d.playerName, d.role, d.totalSessions, d.present, d.absent, d.earlyLeave, d.attendanceRate]);
        break;
      case 'performance-report':
        columns = ['Name', 'Age', 'Role', 'Matches', 'Runs', 'Wickets', 'Avg', 'Strike Rate', 'Economy'];
        rows = data.map(d => [d.name, d.age, d.role, d.matches, d.runs, d.wickets, d.battingAvg, d.strikeRate, d.economy]);
        break;
      case 'monthly-summary':
        columns = ['Metric', 'Value'];
        rows = Object.entries(data[0]).map(([k, v]) => [
          k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), String(v)
        ]);
        break;
    }

    autoTable(doc, {
      startY: 40,
      head: [columns],
      body: rows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: PDF_BRAND_COLOR,
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: PDF_HEADER_BG },
      margin: { left: 14, right: 14 }
    });

    addPDFFooter(doc);
    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ---------- Excel generators per report ----------
  const generateExcel = (reportId: string, title: string, data: any[]) => {
    if (!data || data.length === 0) {
      toast.error('No data available to export.');
      return;
    }

    let exportData: any[] = [];

    switch (reportId) {
      case 'all-payments':
        exportData = data.map(d => ({
          'Player Name': d.playerName, 'Amount (LKR)': d.amount,
          'Month': d.month, 'Year': d.year,
          'Due Date': d.dueDate, 'Status': d.status
        }));
        break;
      case 'overdue-payments':
        exportData = data.map(d => ({
          'Player Name': d.playerName, 'Age': d.playerAge,
          'Amount (LKR)': d.amount, 'Due Date': d.dueDate,
          'Days Overdue': d.daysOverdue, 'Status': d.status
        }));
        break;
      case 'coaches-list':
        exportData = data.map(d => ({
          'Coach ID': d.id, 'Name': d.name, 'Email': d.email,
          'Phone': d.phone || 'N/A', 'Status': d.status, 'Date Joined': d.dateJoined
        }));
        break;
      case 'players-list':
        exportData = data.map(d => ({
          'Player ID': d.id, 'Name': d.name, 'Age': d.age,
          'Role': d.role, 'Batting Style': d.battingStyle, 'Bowling Style': d.bowlingStyle,
          'Matches': d.matches, 'Runs': d.runs, 'Wickets': d.wickets,
          'Batting Avg': d.battingAvg, 'Strike Rate': d.strikeRate, 'Economy': d.economy
        }));
        break;
      case 'parents-list':
        exportData = data.map(d => ({
          'Parent ID': d.id, 'Name': d.name, 'Email': d.email,
          'Phone': d.phone || 'N/A',
          'Linked Children': d.linkedChildren,
          'Total Children': d.totalChildren,
          'Status': d.status
        }));
        break;
      case 'attendance-report':
        exportData = data.map(d => ({
          'Player Name': d.playerName, 'Role': d.role,
          'Total Sessions': d.totalSessions, 'Present': d.present,
          'Absent': d.absent, 'Early Leave': d.earlyLeave,
          'Attendance Rate': d.attendanceRate
        }));
        break;
      case 'performance-report':
        exportData = data.map(d => ({
          'Player Name': d.name, 'Age': d.age, 'Role': d.role,
          'Matches': d.matches, 'Runs': d.runs, 'Wickets': d.wickets,
          'Batting Avg': d.battingAvg, 'Strike Rate': d.strikeRate, 'Economy': d.economy
        }));
        break;
      case 'monthly-summary':
        exportData = Object.entries(data[0]).map(([k, v]) => ({
          'Metric': k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
          'Value': String(v)
        }));
        break;
      default:
        exportData = data;
    }

    downloadAsExcel(exportData, title.replace(/\s+/g, '_'), title.substring(0, 30));
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
      toast.error(`Failed to download report: ${error.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const categories = ['All', 'Financial', 'Personnel', 'Summary'];
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
              Download comprehensive reports with live data — available as PDF or Excel
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
                <Card key={report.id} className="p-6 hover:shadow-lg transition-all duration-200 border hover:border-primary/30">
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

                  <div className="flex gap-2">
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
                        {downloading === `${report.id}-PDF` ? 'Generating...' : 'PDF'}
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
                        {downloading === `${report.id}-Excel` ? 'Generating...' : 'Excel'}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
