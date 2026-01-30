import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FlaskConical, 
  Syringe, 
  BedDouble,
  Activity,
  TrendingUp,
  Clock,
  Heart,
  FileText,
  Download,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['hsl(199, 89%, 48%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(280, 68%, 60%)', 'hsl(0, 72%, 51%)', 'hsl(180, 70%, 45%)'];

export default function ResearchDashboard() {
  const { user, profile } = useAuth();

  // Fetch comprehensive research statistics
  const { data: stats } = useQuery({
    queryKey: ['research-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = startOfMonth(new Date()).toISOString().split('T')[0];
      const monthEnd = endOfMonth(new Date()).toISOString().split('T')[0];
      
      const [
        patients, 
        labTests, 
        surgeries, 
        icuAdmissions,
        vitals,
        prescriptions,
        followUps
      ] = await Promise.all([
        supabase.from('patients').select('id, gender, blood_type, created_at, chronic_conditions', { count: 'exact' }),
        supabase.from('lab_tests').select('id, test_type, status, ordered_at', { count: 'exact' }),
        supabase.from('surgeries').select('id, surgery_type, status, scheduled_date, complications', { count: 'exact' }),
        supabase.from('icu_admissions').select('id, status, admitted_at, discharged_at', { count: 'exact' }),
        supabase.from('vitals').select('id, recorded_at', { count: 'exact' }),
        supabase.from('prescriptions').select('id, status, prescribed_at', { count: 'exact' }),
        supabase.from('follow_ups').select('id, status, scheduled_date', { count: 'exact' }),
      ]);

      // Calculate age demographics from patients
      const genderDistribution = patients.data?.reduce((acc: Record<string, number>, p) => {
        acc[p.gender] = (acc[p.gender] || 0) + 1;
        return acc;
      }, {}) || {};

      // Blood type distribution
      const bloodTypeDistribution = patients.data?.reduce((acc: Record<string, number>, p) => {
        if (p.blood_type) {
          acc[p.blood_type] = (acc[p.blood_type] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      // Surgery type distribution
      const surgeryTypeDistribution = surgeries.data?.reduce((acc: Record<string, number>, s) => {
        acc[s.surgery_type] = (acc[s.surgery_type] || 0) + 1;
        return acc;
      }, {}) || {};

      // Lab test type distribution
      const labTestTypeDistribution = labTests.data?.reduce((acc: Record<string, number>, lt) => {
        acc[lt.test_type] = (acc[lt.test_type] || 0) + 1;
        return acc;
      }, {}) || {};

      // Calculate monthly trends for patients
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return format(date, 'yyyy-MM-dd');
      });

      const patientRegistrationTrend = last30Days.map(date => ({
        date: format(new Date(date), 'MMM d'),
        count: patients.data?.filter(p => p.created_at.split('T')[0] === date).length || 0,
      }));

      // Complications rate
      const completedSurgeries = surgeries.data?.filter(s => s.status === 'completed') || [];
      const complicationsCount = completedSurgeries.filter(s => s.complications && s.complications.trim() !== '').length;
      const complicationRate = completedSurgeries.length > 0 
        ? ((complicationsCount / completedSurgeries.length) * 100).toFixed(1) 
        : '0';

      // Average ICU stay
      const dischargedICU = icuAdmissions.data?.filter(a => a.discharged_at) || [];
      const avgICUStay = dischargedICU.length > 0
        ? (dischargedICU.reduce((sum, a) => {
            const admit = new Date(a.admitted_at);
            const discharge = new Date(a.discharged_at!);
            return sum + (discharge.getTime() - admit.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / dischargedICU.length).toFixed(1)
        : '0';

      return {
        totalPatients: patients.count || 0,
        totalLabTests: labTests.count || 0,
        totalSurgeries: surgeries.count || 0,
        totalICUAdmissions: icuAdmissions.count || 0,
        totalVitals: vitals.count || 0,
        totalPrescriptions: prescriptions.count || 0,
        totalFollowUps: followUps.count || 0,
        completedSurgeries: completedSurgeries.length,
        pendingLabTests: labTests.data?.filter(lt => lt.status === 'pending').length || 0,
        activeICU: icuAdmissions.data?.filter(a => a.status === 'admitted').length || 0,
        genderDistribution,
        bloodTypeDistribution,
        surgeryTypeDistribution,
        labTestTypeDistribution,
        patientRegistrationTrend,
        complicationRate,
        avgICUStay,
      };
    },
  });

  const generateResearchPDF = () => {
    const doc = new jsPDF();
    const timestamp = format(new Date(), 'PPpp');
    
    doc.setFontSize(18);
    doc.text('Research Analytics Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${timestamp}`, 14, 28);
    doc.text(`Generated by: ${profile?.first_name} ${profile?.last_name}`, 14, 34);

    let yPos = 45;

    // Key Metrics Section
    doc.setFontSize(14);
    doc.text('Key Performance Indicators', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Patients', String(stats?.totalPatients || 0)],
        ['Total Lab Tests', String(stats?.totalLabTests || 0)],
        ['Total Surgeries', String(stats?.totalSurgeries || 0)],
        ['Completed Surgeries', String(stats?.completedSurgeries || 0)],
        ['Complication Rate', `${stats?.complicationRate || 0}%`],
        ['Active ICU Admissions', String(stats?.activeICU || 0)],
        ['Average ICU Stay', `${stats?.avgICUStay || 0} days`],
        ['Total Vitals Recorded', String(stats?.totalVitals || 0)],
        ['Total Prescriptions', String(stats?.totalPrescriptions || 0)],
      ],
      theme: 'striped',
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Gender Distribution
    doc.setFontSize(14);
    doc.text('Patient Demographics - Gender', 14, yPos);
    yPos += 8;

    if (stats?.genderDistribution) {
      autoTable(doc, {
        startY: yPos,
        head: [['Gender', 'Count', 'Percentage']],
        body: Object.entries(stats.genderDistribution).map(([gender, count]) => [
          gender.charAt(0).toUpperCase() + gender.slice(1),
          String(count),
          `${((count / (stats.totalPatients || 1)) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Blood Type Distribution
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Patient Demographics - Blood Type', 14, yPos);
    yPos += 8;

    if (stats?.bloodTypeDistribution && Object.keys(stats.bloodTypeDistribution).length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Blood Type', 'Count', 'Percentage']],
        body: Object.entries(stats.bloodTypeDistribution).map(([type, count]) => [
          type,
          String(count),
          `${((count / (stats.totalPatients || 1)) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Surgery Type Distribution
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Surgical Procedures by Type', 14, yPos);
    yPos += 8;

    if (stats?.surgeryTypeDistribution && Object.keys(stats.surgeryTypeDistribution).length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Surgery Type', 'Count', 'Percentage']],
        body: Object.entries(stats.surgeryTypeDistribution).map(([type, count]) => [
          type,
          String(count),
          `${((count / (stats.totalSurgeries || 1)) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
      });
    }

    doc.save(`Research_Analytics_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
    
    // Log download
    supabase.from('downloads').insert({
      user_id: user?.id,
      document_type: 'research_report',
      document_name: `Research Analytics Report - ${format(new Date(), 'PPP')}`,
      file_format: 'pdf',
      metadata: { generated_at: timestamp },
    });

    toast.success('Research report downloaded');
  };

  const genderChartData = stats?.genderDistribution 
    ? Object.entries(stats.genderDistribution).map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value 
      }))
    : [];

  const bloodTypeChartData = stats?.bloodTypeDistribution
    ? Object.entries(stats.bloodTypeDistribution).map(([name, value]) => ({ name, value }))
    : [];

  const surgeryTypeChartData = stats?.surgeryTypeDistribution
    ? Object.entries(stats.surgeryTypeDistribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title text-xl sm:text-2xl lg:text-3xl">Research Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Comprehensive analytics for cardiovascular research insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {format(new Date(), 'PPP')}
          </div>
          <Button onClick={generateResearchPDF} className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.totalPatients || 0}</p>
                <p className="text-xs text-muted-foreground">Total Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <FlaskConical className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.totalLabTests || 0}</p>
                <p className="text-xs text-muted-foreground">Lab Tests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Syringe className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.totalSurgeries || 0}</p>
                <p className="text-xs text-muted-foreground">Surgeries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BedDouble className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.activeICU || 0}</p>
                <p className="text-xs text-muted-foreground">Active ICU</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Activity className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.totalVitals || 0}</p>
                <p className="text-xs text-muted-foreground">Vitals Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Heart className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.complicationRate || 0}%</p>
                <p className="text-xs text-muted-foreground">Complication Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats?.completedSurgeries || 0}</p>
            <p className="text-sm text-muted-foreground">Completed Surgeries</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-warning">{stats?.pendingLabTests || 0}</p>
            <p className="text-sm text-muted-foreground">Pending Lab Tests</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-success">{stats?.avgICUStay || 0}</p>
            <p className="text-sm text-muted-foreground">Avg ICU Stay (days)</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-info">{stats?.totalFollowUps || 0}</p>
            <p className="text-sm text-muted-foreground">Follow-up Visits</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Registration Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Patient Registration Trend (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.patientRegistrationTrend || []}>
                  <defs>
                    <linearGradient id="registrationGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(199, 89%, 48%)" 
                    strokeWidth={2}
                    fill="url(#registrationGradient)" 
                    name="Registrations"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Patient Demographics - Gender
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {genderChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {genderChartData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Type Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              Blood Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bloodTypeChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={30} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Patients" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Surgery Type Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Syringe className="w-5 h-5 text-primary" />
              Surgeries by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={surgeryTypeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(280, 68%, 60%)" radius={[0, 4, 4, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Research Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <a href="/reports" className="p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors text-center group">
              <BarChart3 className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">View Reports</span>
            </a>
            <a href="/downloads" className="p-4 rounded-xl bg-success/5 hover:bg-success/10 transition-colors text-center group">
              <Download className="w-8 h-8 text-success mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Download History</span>
            </a>
            <a href="/patients" className="p-4 rounded-xl bg-warning/5 hover:bg-warning/10 transition-colors text-center group">
              <Users className="w-8 h-8 text-warning mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Browse Patients</span>
            </a>
            <a href="/profile" className="p-4 rounded-xl bg-info/5 hover:bg-info/10 transition-colors text-center group">
              <Activity className="w-8 h-8 text-info mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">My Profile</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
