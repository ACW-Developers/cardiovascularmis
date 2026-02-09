import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Video,
  Plus,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  FileText,
  Play,
  Trash2,
  Eye,
} from 'lucide-react';
import { Profile, Patient } from '@/types/database';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  created_by: string;
  room_id: string;
  created_at: string;
  updated_at: string;
}

interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  status: string;
  invited_at: string;
  responded_at: string | null;
}

interface MeetingPatient {
  id: string;
  meeting_id: string;
  patient_id: string;
  discussion_notes: string | null;
  decision: string;
  added_by: string;
  created_at: string;
}

export default function Teleconferencing() {
  const { user, role, isAdmin } = useAuth();
  const canSchedule = isAdmin || role === 'doctor';

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [myInvitations, setMyInvitations] = useState<(MeetingParticipant & { meeting: Meeting })[]>([]);
  const [doctors, setDoctors] = useState<(Profile & { user_id: string })[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule dialog
  const [showSchedule, setShowSchedule] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);

  // Meeting detail / video
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [meetingParticipants, setMeetingParticipants] = useState<(MeetingParticipant & { profile?: Profile })[]>([]);
  const [meetingPatients, setMeetingPatients] = useState<(MeetingPatient & { patient?: Patient })[]>([]);

  // Add patient to meeting dialog
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Patient detail dialog
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [patientNotes, setPatientNotes] = useState('');
  const [patientDecision, setPatientDecision] = useState('');
  const [currentMeetingPatientId, setCurrentMeetingPatientId] = useState('');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch all meetings
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('*')
        .order('scheduled_date', { ascending: false });
      setMeetings((meetingsData as Meeting[]) || []);

      // Fetch my invitations
      const { data: invitations } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('user_id', user.id);

      if (invitations && invitations.length > 0) {
        const meetingIds = invitations.map(i => i.meeting_id);
        const { data: invMeetings } = await supabase
          .from('meetings')
          .select('*')
          .in('id', meetingIds);

        const merged = invitations.map(inv => ({
          ...inv,
          meeting: (invMeetings as Meeting[])?.find(m => m.id === inv.meeting_id)!,
        })).filter(inv => inv.meeting);
        setMyInvitations(merged as (MeetingParticipant & { meeting: Meeting })[]);
      } else {
        setMyInvitations([]);
      }

      // Fetch doctors
      const { data: doctorRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'doctor');

      if (doctorRoles && doctorRoles.length > 0) {
        const doctorIds = doctorRoles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', doctorIds);
        setDoctors((profiles as (Profile & { user_id: string })[]) || []);
      }

      // Fetch patients
      const { data: patientsData } = await supabase
        .from('patients')
        .select('*')
        .eq('status', 'active')
        .order('last_name');
      setPatients((patientsData as Patient[]) || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateRoomId = () => {
    return 'cardio-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
  };

  const handleScheduleMeeting = async () => {
    if (!user || !title || !scheduledDate || !scheduledTime) {
      toast.error('Please fill all required fields');
      return;
    }

    const roomId = generateRoomId();

    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        title,
        description: description || null,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        duration_minutes: parseInt(duration),
        created_by: user.id,
        room_id: roomId,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to schedule meeting');
      return;
    }

    // Add participants
    if (selectedDoctors.length > 0 && meeting) {
      const participants = selectedDoctors.map(doctorUserId => ({
        meeting_id: meeting.id,
        user_id: doctorUserId,
        status: 'invited',
      }));
      await supabase.from('meeting_participants').insert(participants);

      // Send notifications to invited doctors
      const notifications = selectedDoctors.map(doctorUserId => ({
        user_id: doctorUserId,
        title: 'Meeting Invitation',
        message: `You've been invited to "${title}" on ${format(new Date(scheduledDate), 'MMM d, yyyy')} at ${scheduledTime}`,
        type: 'info',
        related_entity_type: 'meeting',
        related_entity_id: meeting.id,
      }));
      await supabase.from('notifications').insert(notifications);
    }

    toast.success('Meeting scheduled successfully');
    setShowSchedule(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setScheduledDate('');
    setScheduledTime('');
    setDuration('60');
    setSelectedDoctors([]);
  };

  const handleRespondInvitation = async (participantId: string, response: 'accepted' | 'declined') => {
    const { error } = await supabase
      .from('meeting_participants')
      .update({ status: response, responded_at: new Date().toISOString() })
      .eq('id', participantId);

    if (error) {
      toast.error('Failed to respond');
      return;
    }
    toast.success(response === 'accepted' ? 'Invitation accepted' : 'Invitation declined');
    fetchData();
  };

  const openMeetingDetail = async (meeting: Meeting) => {
    setActiveMeeting(meeting);

    // Fetch participants with profiles
    const { data: parts } = await supabase
      .from('meeting_participants')
      .select('*')
      .eq('meeting_id', meeting.id);

    if (parts && parts.length > 0) {
      const userIds = parts.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      setMeetingParticipants(
        parts.map(p => ({
          ...p,
          profile: (profiles as Profile[])?.find(pr => pr.user_id === p.user_id),
        })) as (MeetingParticipant & { profile?: Profile })[]
      );
    } else {
      setMeetingParticipants([]);
    }

    // Fetch meeting patients
    const { data: mPatients } = await supabase
      .from('meeting_patients')
      .select('*')
      .eq('meeting_id', meeting.id);

    if (mPatients && mPatients.length > 0) {
      const patientIds = mPatients.map(mp => mp.patient_id);
      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds);

      setMeetingPatients(
        mPatients.map(mp => ({
          ...mp,
          patient: (patientData as Patient[])?.find(p => p.id === mp.patient_id),
        })) as (MeetingPatient & { patient?: Patient })[]
      );
    } else {
      setMeetingPatients([]);
    }
  };

  const handleAddPatientToMeeting = async () => {
    if (!activeMeeting || !selectedPatientId || !user) return;

    const { error } = await supabase.from('meeting_patients').insert({
      meeting_id: activeMeeting.id,
      patient_id: selectedPatientId,
      added_by: user.id,
    });

    if (error) {
      toast.error('Failed to add patient');
      return;
    }

    toast.success('Patient added to meeting');
    setShowAddPatient(false);
    setSelectedPatientId('');
    openMeetingDetail(activeMeeting);
  };

  const handleUpdatePatientDecision = async () => {
    if (!currentMeetingPatientId) return;

    const { error } = await supabase
      .from('meeting_patients')
      .update({
        discussion_notes: patientNotes || null,
        decision: patientDecision || 'pending',
      })
      .eq('id', currentMeetingPatientId);

    if (error) {
      toast.error('Failed to update');
      return;
    }

    toast.success('Decision updated');
    setViewPatient(null);
    if (activeMeeting) openMeetingDetail(activeMeeting);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
    if (error) {
      toast.error('Failed to delete meeting');
      return;
    }
    toast.success('Meeting deleted');
    setActiveMeeting(null);
    fetchData();
  };

  const joinMeeting = (meeting: Meeting) => {
    setActiveMeeting(meeting);
    setShowVideo(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-600"><Play className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getParticipantBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-600 text-[10px]">Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive" className="text-[10px]">Declined</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'approved_for_surgery':
        return <Badge className="bg-green-600">Approved for Surgery</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Not Approved</Badge>;
      case 'more_review':
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Needs More Review</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const toggleDoctor = (userId: string) => {
    setSelectedDoctors(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Jitsi video call view
  if (showVideo && activeMeeting) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{activeMeeting.title}</h2>
            <p className="text-xs text-muted-foreground">Room: {activeMeeting.room_id}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowVideo(false); openMeetingDetail(activeMeeting); }}>
              <Users className="w-4 h-4 mr-1" /> Patients & Participants
            </Button>
            <Button variant="destructive" size="sm" onClick={() => { setShowVideo(false); setActiveMeeting(null); }}>
              Leave Meeting
            </Button>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border bg-black" style={{ height: 'calc(100vh - 200px)' }}>
          <iframe
            src={`https://meet.jit.si/${activeMeeting.room_id}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false`}
            className="w-full h-full"
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            style={{ border: 'none' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Teleconferencing</h1>
          <p className="text-sm text-muted-foreground">Schedule and join surgical review meetings</p>
        </div>
        {canSchedule && (
          <Button onClick={() => setShowSchedule(true)}>
            <Plus className="w-4 h-4 mr-1" /> Schedule Meeting
          </Button>
        )}
      </div>

      <Tabs defaultValue="meetings">
        <TabsList>
          <TabsTrigger value="meetings">All Meetings</TabsTrigger>
          <TabsTrigger value="invitations">
            My Invitations
            {myInvitations.filter(i => i.status === 'invited').length > 0 && (
              <Badge className="ml-2 bg-red-500 text-[10px] h-4 min-w-4 px-1">
                {myInvitations.filter(i => i.status === 'invited').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meetings" className="space-y-4">
          {meetings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Video className="w-12 h-12 mb-4 opacity-50" />
                <p>No meetings scheduled yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {meetings.map(meeting => (
                <Card key={meeting.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openMeetingDetail(meeting)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm">{meeting.title}</CardTitle>
                      {getStatusBadge(meeting.status)}
                    </div>
                    {meeting.description && (
                      <CardDescription className="text-xs line-clamp-2">{meeting.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(meeting.scheduled_date), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {meeting.scheduled_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Created {format(new Date(meeting.created_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          {myInvitations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mb-4 opacity-50" />
                <p>No invitations</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myInvitations.map(inv => (
                <Card key={inv.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm">{inv.meeting.title}</CardTitle>
                      {getParticipantBadge(inv.status)}
                    </div>
                    {inv.meeting.description && (
                      <CardDescription className="text-xs">{inv.meeting.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(inv.meeting.scheduled_date), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {inv.meeting.scheduled_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {inv.status === 'invited' && (
                        <>
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleRespondInvitation(inv.id, 'accepted'); }}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleRespondInvitation(inv.id, 'declined'); }}>
                            <XCircle className="w-3 h-3 mr-1" /> Decline
                          </Button>
                        </>
                      )}
                      {inv.status === 'accepted' && (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); joinMeeting(inv.meeting); }}>
                          <Video className="w-3 h-3 mr-1" /> Join Meeting
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Schedule Meeting Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>Create a surgical review meeting and invite doctors</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Surgical Review Meeting" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Meeting agenda..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
              </div>
              <div>
                <Label>Time *</Label>
                <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invite Doctors</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {doctors.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No doctors found</p>
                ) : (
                  doctors.filter(d => d.user_id !== user?.id).map(doctor => (
                    <label
                      key={doctor.user_id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDoctors.includes(doctor.user_id)}
                        onChange={() => toggleDoctor(doctor.user_id)}
                        className="rounded"
                      />
                      <span>Dr. {doctor.first_name} {doctor.last_name}</span>
                      {doctor.department && (
                        <Badge variant="outline" className="text-[10px] ml-auto">{doctor.department}</Badge>
                      )}
                    </label>
                  ))
                )}
              </div>
              {selectedDoctors.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{selectedDoctors.length} doctor(s) selected</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button onClick={handleScheduleMeeting} disabled={!title || !scheduledDate || !scheduledTime}>
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Detail Dialog */}
      <Dialog open={!!activeMeeting && !showVideo} onOpenChange={(open) => { if (!open) setActiveMeeting(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {activeMeeting && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle>{activeMeeting.title}</DialogTitle>
                    <DialogDescription>
                      {format(new Date(activeMeeting.scheduled_date), 'EEEE, MMMM d, yyyy')} at {activeMeeting.scheduled_time.slice(0, 5)} • {activeMeeting.duration_minutes} min
                    </DialogDescription>
                  </div>
                  {getStatusBadge(activeMeeting.status)}
                </div>
              </DialogHeader>

              {activeMeeting.description && (
                <p className="text-sm text-muted-foreground">{activeMeeting.description}</p>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => joinMeeting(activeMeeting)}>
                  <Video className="w-4 h-4 mr-1" /> Join Video Call
                </Button>
                {canSchedule && (
                  <Button variant="outline" onClick={() => setShowAddPatient(true)}>
                    <UserPlus className="w-4 h-4 mr-1" /> Add Patient
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteMeeting(activeMeeting.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                )}
              </div>

              {/* Participants */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Users className="w-4 h-4" /> Participants ({meetingParticipants.length})
                </h3>
                {meetingParticipants.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No participants invited yet</p>
                ) : (
                  <div className="space-y-1">
                    {meetingParticipants.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded bg-accent/50 text-sm">
                        <span>Dr. {p.profile?.first_name} {p.profile?.last_name}</span>
                        {getParticipantBadge(p.status)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Patients for Discussion */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <FileText className="w-4 h-4" /> Patients for Discussion ({meetingPatients.length})
                </h3>
                {meetingPatients.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No patients added yet. Add patients to discuss their surgical eligibility.</p>
                ) : (
                  <div className="space-y-2">
                    {meetingPatients.map(mp => (
                      <Card key={mp.id} className="cursor-pointer hover:shadow-sm" onClick={() => {
                        setViewPatient(mp.patient || null);
                        setPatientNotes(mp.discussion_notes || '');
                        setPatientDecision(mp.decision || 'pending');
                        setCurrentMeetingPatientId(mp.id);
                      }}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                {mp.patient?.first_name} {mp.patient?.last_name}
                                <span className="text-muted-foreground ml-2 text-xs">{mp.patient?.patient_number}</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {mp.patient?.gender} • {mp.patient?.blood_type || 'N/A'} • Added {format(new Date(mp.created_at), 'MMM d, HH:mm')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getDecisionBadge(mp.decision)}
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                          {mp.discussion_notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">"{mp.discussion_notes}"</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Patient to Meeting */}
      <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Patient to Meeting</DialogTitle>
            <DialogDescription>Select a patient to add for surgical discussion</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Select Patient</Label>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger><SelectValue placeholder="Search patient..." /></SelectTrigger>
              <SelectContent>
                {patients.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.patient_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPatient(false)}>Cancel</Button>
            <Button onClick={handleAddPatientToMeeting} disabled={!selectedPatientId}>Add Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient Detail / Decision Dialog */}
      <Dialog open={!!viewPatient} onOpenChange={(open) => { if (!open) setViewPatient(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewPatient && (
            <>
              <DialogHeader>
                <DialogTitle>{viewPatient.first_name} {viewPatient.last_name}</DialogTitle>
                <DialogDescription>{viewPatient.patient_number} • {viewPatient.gender} • DOB: {format(new Date(viewPatient.date_of_birth), 'MMM d, yyyy')}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Blood Type</span>
                    <p className="font-medium">{viewPatient.blood_type || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Phone</span>
                    <p className="font-medium">{viewPatient.phone}</p>
                  </div>
                </div>

                {viewPatient.allergies && viewPatient.allergies.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Allergies</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {viewPatient.allergies.map((a, i) => (
                        <Badge key={i} variant="destructive" className="text-[10px]">{a}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {viewPatient.chronic_conditions && viewPatient.chronic_conditions.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Chronic Conditions</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {viewPatient.chronic_conditions.map((c, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {viewPatient.cardiovascular_history && (
                  <div>
                    <span className="text-xs text-muted-foreground">Cardiovascular History</span>
                    <p className="text-xs">{viewPatient.cardiovascular_history}</p>
                  </div>
                )}

                {viewPatient.previous_surgeries && (
                  <div>
                    <span className="text-xs text-muted-foreground">Previous Surgeries</span>
                    <p className="text-xs">{viewPatient.previous_surgeries}</p>
                  </div>
                )}

                {viewPatient.current_medications && (
                  <div>
                    <span className="text-xs text-muted-foreground">Current Medications</span>
                    <p className="text-xs">{viewPatient.current_medications}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-3 space-y-3">
                <div>
                  <Label>Discussion Notes</Label>
                  <Textarea
                    value={patientNotes}
                    onChange={e => setPatientNotes(e.target.value)}
                    placeholder="Notes from the discussion..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Decision</Label>
                  <Select value={patientDecision} onValueChange={setPatientDecision}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved_for_surgery">Approved for Surgery</SelectItem>
                      <SelectItem value="rejected">Not Approved</SelectItem>
                      <SelectItem value="more_review">Needs More Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewPatient(null)}>Close</Button>
                <Button onClick={handleUpdatePatientDecision}>Save Decision</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
