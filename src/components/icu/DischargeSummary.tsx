import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, differenceInHours, differenceInDays } from 'date-fns';
import { 
  FileDown, User, Heart, Activity, FlaskConical, Pill, Syringe, 
  Clock, BedDouble, ClipboardList, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ICUAdmission, Patient, ICUProgressNote } from '@/types/database';

interface DischargeSummaryProps {
  admission: ICUAdmission & { patient: Patient };
}

export default function DischargeSummary({ admission }: DischargeSummaryProps) {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Fetch all clinical data for the patient
  const { data: progressNotes } = useQuery({
    queryKey: ['discharge-notes', admission.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icu_progress_notes')
        .select('*')
        .eq('icu_admission_id', admission.id)
        .order('recorded_at', { ascending: true });
      if (error) throw error;
      return data as ICUProgressNote[];
    },
    enabled: open,
  });

  const { data: vitals } = useQuery({
    queryKey: ['discharge-vitals', admission.patient_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vitals')
        .select('*')
        .eq('patient_id', admission.patient_id)
        .gte('recorded_at', admission.admitted_at)
        .order('recorded_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: surgery } = useQuery({
    queryKey: ['discharge-surgery', admission.surgery_id],
    queryFn: async () => {
      if (!admission.surgery_id) return null;
      const { data, error } = await supabase
        .from('surgeries')
        .select('*')
        .eq('id', admission.surgery_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!admission.surgery_id,
  });

  const { data: labTests } = useQuery({
    queryKey: ['discharge-labs', admission.patient_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_tests')
        .select('*, results:lab_results(*)')
        .eq('patient_id', admission.patient_id)
        .gte('ordered_at', admission.admitted_at);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: prescriptions } = useQuery({
    queryKey: ['discharge-prescriptions', admission.patient_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*, items:prescription_items(*)')
        .eq('patient_id', admission.patient_id)
        .gte('prescribed_at', admission.admitted_at);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const stayDuration = differenceInHours(new Date(), new Date(admission.admitted_at));
  const stayDays = differenceInDays(new Date(), new Date(admission.admitted_at));

  const generateDischargePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const siteName = settings?.site_name || 'CardioRegistry';
      const pageWidth = doc.internal.pageSize.getWidth();
      const now = new Date();
      const timestamp = format(now, 'yyyy-MM-dd HH:mm:ss');

      // Header
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(siteName, pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text('ICU DISCHARGE SUMMARY', pageWidth / 2, 25, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${timestamp}`, pageWidth / 2, 35, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      let y = 50;

      // Patient Information
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(245, 245, 245);
      doc.rect(14, y, pageWidth - 28, 8, 'F');
      doc.text('Patient Information', 16, y + 6);
      y += 12;

      const patientInfo = [
        ['Name', `${admission.patient.first_name} ${admission.patient.last_name}`],
        ['Patient Number', admission.patient.patient_number],
        ['Date of Birth', format(new Date(admission.patient.date_of_birth), 'MMMM d, yyyy')],
        ['Gender', admission.patient.gender],
        ['Blood Type', admission.patient.blood_type || 'Not recorded'],
      ];

      autoTable(doc, {
        startY: y,
        body: patientInfo,
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
        theme: 'plain',
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ICU Stay Information
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(245, 245, 245);
      doc.rect(14, y, pageWidth - 28, 8, 'F');
      doc.text('ICU Stay Details', 16, y + 6);
      y += 12;

      const icuInfo = [
        ['Bed Number', admission.bed_number || 'Not assigned'],
        ['Admission Date', format(new Date(admission.admitted_at), 'MMM d, yyyy HH:mm')],
        ['Discharge Date', timestamp],
        ['Length of Stay', `${stayDays} days ${stayDuration % 24} hours`],
        ['Admission Reason', admission.admission_reason],
        ['Admission Type', admission.surgery_id ? 'Post-Operative Transfer' : 'Direct Admission'],
      ];

      autoTable(doc, {
        startY: y,
        body: icuInfo,
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
        theme: 'plain',
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Surgery Details (if applicable)
      if (surgery) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(245, 245, 245);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
        doc.text('Surgical Procedure', 16, y + 6);
        y += 12;

        const surgeryInfo = [
          ['Procedure', surgery.surgery_name],
          ['Type', surgery.surgery_type],
          ['Date', format(new Date(surgery.scheduled_date), 'MMM d, yyyy')],
          ['Operating Room', surgery.operating_room || '-'],
          ['Duration', surgery.duration_minutes ? `${surgery.duration_minutes} minutes` : '-'],
          ['Complications', surgery.complications || 'None reported'],
        ];

        autoTable(doc, {
          startY: y,
          body: surgeryInfo,
          styles: { fontSize: 9, cellPadding: 2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
          theme: 'plain',
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Vitals Summary
      if (vitals && vitals.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(245, 245, 245);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
        doc.text('Vitals Record During Stay', 16, y + 6);
        y += 12;

        const vitalsData = vitals.map((v: any) => [
          format(new Date(v.recorded_at), 'MMM d HH:mm'),
          `${v.systolic_bp}/${v.diastolic_bp}`,
          `${v.heart_rate}`,
          v.oxygen_saturation ? `${v.oxygen_saturation}%` : '-',
          v.temperature ? `${v.temperature}°C` : '-',
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Timestamp', 'BP (mmHg)', 'HR (bpm)', 'SpO2', 'Temp']],
          body: vitalsData.slice(0, 10), // Last 10 readings
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Progress Notes Summary
      if (progressNotes && progressNotes.length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(245, 245, 245);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
        doc.text('Clinical Progress Notes', 16, y + 6);
        y += 12;

        progressNotes.forEach((note, idx) => {
          if (y > 260) { doc.addPage(); y = 20; }

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`${format(new Date(note.recorded_at), 'MMM d, yyyy HH:mm')} - ${note.recovery_status || 'Status not specified'}`, 16, y);
          y += 5;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);

          if (note.vitals_summary) {
            doc.text(`Vitals: ${note.vitals_summary}`, 20, y);
            y += 4;
          }
          if (note.observations) {
            const obs = doc.splitTextToSize(`Observations: ${note.observations}`, pageWidth - 40);
            doc.text(obs, 20, y);
            y += obs.length * 4;
          }
          if (note.medications_given) {
            doc.text(`Medications: ${note.medications_given}`, 20, y);
            y += 4;
          }
          if (note.complications) {
            doc.setTextColor(220, 38, 38);
            doc.text(`Complications: ${note.complications}`, 20, y);
            doc.setTextColor(0, 0, 0);
            y += 4;
          }
          if (note.plan) {
            doc.text(`Plan: ${note.plan}`, 20, y);
            y += 4;
          }
          y += 4;
        });
      }

      // Lab Results
      if (labTests && labTests.length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(245, 245, 245);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
        doc.text('Laboratory Tests', 16, y + 6);
        y += 12;

        const labData = labTests.map((test: any) => [
          test.test_name,
          test.test_type,
          test.status,
          format(new Date(test.ordered_at), 'MMM d HH:mm'),
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Test Name', 'Type', 'Status', 'Ordered']],
          body: labData,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Prescriptions
      if (prescriptions && prescriptions.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(245, 245, 245);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
        doc.text('Medications Prescribed', 16, y + 6);
        y += 12;

        prescriptions.forEach((rx: any) => {
          if (rx.items && rx.items.length > 0) {
            const rxData = rx.items.map((item: any) => [
              item.medication_name,
              item.dosage,
              item.frequency,
              item.duration,
            ]);

            autoTable(doc, {
              startY: y,
              head: [['Medication', 'Dosage', 'Frequency', 'Duration']],
              body: rxData,
              styles: { fontSize: 8, cellPadding: 2 },
              headStyles: { fillColor: [168, 85, 247], textColor: [255, 255, 255] },
            });

            y = (doc as any).lastAutoTable.finalY + 5;
          }
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `${siteName} | ICU Discharge Summary | Confidential | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      const fileName = `discharge-summary-${admission.patient.patient_number}-${format(now, 'yyyy-MM-dd-HHmm')}.pdf`;
      doc.save(fileName);
      toast.success('Discharge summary generated');
    } catch (error) {
      console.error('Error generating discharge summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileDown className="h-4 w-4 mr-1" /> Export Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-primary" />
            ICU Clinical Summary - {admission.patient.first_name} {admission.patient.last_name}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Patient Info Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Patient Number</Label>
                  <p className="font-medium">{admission.patient.patient_number}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                  <p className="font-medium">{format(new Date(admission.patient.date_of_birth), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Gender</Label>
                  <p className="font-medium">{admission.patient.gender}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Blood Type</Label>
                  <p className="font-medium">{admission.patient.blood_type || 'Not recorded'}</p>
                </div>
              </CardContent>
            </Card>

            {/* ICU Stay Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  ICU Stay Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Bed Number</Label>
                  <p className="font-medium">{admission.bed_number || 'Not assigned'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Admitted</Label>
                  <p className="font-medium">{format(new Date(admission.admitted_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Length of Stay</Label>
                  <p className="font-medium">{stayDays}d {stayDuration % 24}h</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Admission Reason</Label>
                  <p className="font-medium">{admission.admission_reason}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Admission Type</Label>
                  <Badge variant={admission.surgery_id ? 'default' : 'secondary'}>
                    {admission.surgery_id ? 'Post-Op Transfer' : 'Direct Admission'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Surgery Details */}
            {surgery && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Syringe className="h-4 w-4 text-amber-500" />
                    Surgical Procedure
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Procedure</Label>
                    <p className="font-medium">{surgery.surgery_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <p className="font-medium">{surgery.surgery_type}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <p className="font-medium">{format(new Date(surgery.scheduled_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <p className="font-medium">{surgery.duration_minutes ? `${surgery.duration_minutes} min` : '-'}</p>
                  </div>
                  {surgery.complications && (
                    <div className="md:col-span-3">
                      <Label className="text-xs text-destructive">Complications</Label>
                      <p className="font-medium text-destructive">{surgery.complications}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Vitals Summary */}
            {vitals && vitals.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    Vitals During Stay ({vitals.length} readings)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground border-b pb-2 mb-2">
                    <span>Timestamp</span>
                    <span>BP</span>
                    <span>HR</span>
                    <span>SpO2</span>
                  </div>
                  {vitals.slice(-5).map((v: any) => (
                    <div key={v.id} className="grid grid-cols-4 gap-2 text-sm py-1 border-b border-dashed last:border-0">
                      <span className="text-muted-foreground">{format(new Date(v.recorded_at), 'MMM d HH:mm')}</span>
                      <span>{v.systolic_bp}/{v.diastolic_bp}</span>
                      <span>{v.heart_rate} bpm</span>
                      <span>{v.oxygen_saturation ? `${v.oxygen_saturation}%` : '-'}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Progress Notes */}
            {progressNotes && progressNotes.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-blue-500" />
                    Clinical Notes ({progressNotes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {progressNotes.slice(-3).map((note) => (
                    <div key={note.id} className="p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={note.recovery_status === 'critical' ? 'destructive' : 'outline'}>
                          {note.recovery_status || 'Status N/A'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.recorded_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      {note.observations && <p className="text-muted-foreground">{note.observations}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Lab Tests */}
            {labTests && labTests.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-violet-500" />
                    Laboratory Tests ({labTests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {labTests.map((test: any) => (
                    <div key={test.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{test.test_name}</p>
                        <p className="text-xs text-muted-foreground">{test.test_type}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={test.status === 'completed' ? 'default' : 'secondary'}>
                          {test.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(test.ordered_at), 'MMM d HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Prescriptions */}
            {prescriptions && prescriptions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Pill className="h-4 w-4 text-pink-500" />
                    Medications Prescribed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {prescriptions.map((rx: any) => (
                    <div key={rx.id} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{rx.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(rx.prescribed_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      {rx.items?.map((item: any) => (
                        <div key={item.id} className="pl-3 border-l-2 border-muted py-1 text-sm">
                          <span className="font-medium">{item.medication_name}</span>
                          <span className="text-muted-foreground"> - {item.dosage} | {item.frequency} | {item.duration}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={generateDischargePDF} disabled={generating} className="gradient-primary">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
