import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Patient, Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Plus, Loader2, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export default function Appointments() {
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patient');
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Form state
  const [formData, setFormData] = useState({
    patientId: preselectedPatientId || '',
    doctorId: '',
    appointmentDate: new Date(),
    appointmentTime: '09:00',
    type: 'consultation',
    notes: '',
  });

  // Fetch patients
  const { data: patients } = useQuery({
    queryKey: ['patients-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_number, first_name, last_name')
        .order('first_name');
      if (error) throw error;
      return data as Patient[];
    },
  });

  // Fetch doctors
  const { data: doctors } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'doctor');
      if (error) throw error;

      const doctorIds = data.map(d => d.user_id);
      if (doctorIds.length === 0) return [];

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', doctorIds);
      if (profileError) throw profileError;

      return profiles as Profile[];
    },
  });

  // Fetch appointments
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', format(selectedDate, 'yyyy-MM-dd'))
        .order('appointment_time');
      if (error) throw error;

      // Fetch related patient and doctor data
      const patientIds = [...new Set(data.map(a => a.patient_id))];
      const doctorIds = [...new Set(data.map(a => a.doctor_id))];

      const [patientsRes, doctorsRes] = await Promise.all([
        supabase.from('patients').select('id, first_name, last_name, patient_number').in('id', patientIds),
        supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', doctorIds),
      ]);

      return data.map(apt => ({
        ...apt,
        patient: patientsRes.data?.find(p => p.id === apt.patient_id),
        doctor: doctorsRes.data?.find(d => d.user_id === apt.doctor_id),
      }));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('appointments').insert({
        patient_id: formData.patientId,
        doctor_id: formData.doctorId,
        scheduled_by: user.id,
        appointment_date: format(formData.appointmentDate, 'yyyy-MM-dd'),
        appointment_time: formData.appointmentTime,
        type: formData.type,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast({
        title: 'Appointment Scheduled',
        description: 'The appointment has been successfully scheduled.',
      });

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setDialogOpen(false);
      setFormData({
        patientId: '',
        doctorId: '',
        appointmentDate: new Date(),
        appointmentTime: '09:00',
        type: 'consultation',
        notes: '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appointmentId: string, status: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Status Updated',
        description: `Appointment marked as ${status}.`,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      scheduled: 'bg-info/10 text-info',
      completed: 'bg-success/10 text-success',
      cancelled: 'bg-destructive/10 text-destructive',
      'no-show': 'bg-warning/10 text-warning',
    };
    return (
      <Badge className={variants[status] || variants.scheduled}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const timeSlots = [];
  for (let h = 8; h <= 17; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary" />
            Appointments
          </h1>
          <p className="text-muted-foreground mt-1">
            Schedule and manage patient appointments
          </p>
        </div>
        {role && ['admin', 'nurse'].includes(role) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule New Appointment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Patient *</Label>
                  <Select value={formData.patientId} onValueChange={(v) => setFormData(prev => ({ ...prev, patientId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients?.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.patient_number} - {patient.first_name} {patient.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Doctor *</Label>
                  <Select value={formData.doctorId} onValueChange={(v) => setFormData(prev => ({ ...prev, doctorId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors?.map((doctor) => (
                        <SelectItem key={doctor.user_id} value={doctor.user_id}>
                          Dr. {doctor.first_name} {doctor.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.appointmentDate, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.appointmentDate}
                          onSelect={(date) => date && setFormData(prev => ({ ...prev, appointmentDate: date }))}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Time *</Label>
                    <Select value={formData.appointmentTime} onValueChange={(v) => setFormData(prev => ({ ...prev, appointmentTime: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Appointment Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="pre-surgery">Pre-Surgery</SelectItem>
                      <SelectItem value="post-surgery">Post-Surgery</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="gradient-primary" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Schedule
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Date Selection */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant={format(selectedDate, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd') ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDate(addDays(new Date(), 1))}
            >
              Tomorrow
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Appointments for {format(selectedDate, 'PPPP')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="table-header">Time</TableHead>
                <TableHead className="table-header">Patient</TableHead>
                <TableHead className="table-header">Doctor</TableHead>
                <TableHead className="table-header">Type</TableHead>
                <TableHead className="table-header">Status</TableHead>
                <TableHead className="table-header">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading appointments...
                  </TableCell>
                </TableRow>
              ) : appointments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No appointments scheduled for this date
                  </TableCell>
                </TableRow>
              ) : (
                appointments?.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {apt.appointment_time?.slice(0, 5)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{apt.patient?.first_name} {apt.patient?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{apt.patient?.patient_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}</TableCell>
                    <TableCell className="capitalize">{apt.type}</TableCell>
                    <TableCell>{getStatusBadge(apt.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {apt.status === 'scheduled' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatus(apt.id, 'completed')}
                            >
                              Complete
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatus(apt.id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
