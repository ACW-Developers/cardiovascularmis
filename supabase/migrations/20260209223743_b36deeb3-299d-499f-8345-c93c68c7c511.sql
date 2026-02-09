
-- Meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by UUID NOT NULL,
  room_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view meetings" ON public.meetings FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins and doctors can create meetings" ON public.meetings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Admins and doctors can update meetings" ON public.meetings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Admins can delete meetings" ON public.meetings FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Meeting participants
CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view participants" ON public.meeting_participants FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins and doctors can add participants" ON public.meeting_participants FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Users can update own participation" ON public.meeting_participants FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete participants" ON public.meeting_participants FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Meeting patients for discussion
CREATE TABLE public.meeting_patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  discussion_notes TEXT,
  decision TEXT DEFAULT 'pending',
  added_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view meeting patients" ON public.meeting_patients FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins and doctors can add patients" ON public.meeting_patients FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Admins and doctors can update patients" ON public.meeting_patients FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Admins can delete meeting patients" ON public.meeting_patients FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Update trigger for meetings
CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
