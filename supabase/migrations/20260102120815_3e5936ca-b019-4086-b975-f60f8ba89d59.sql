-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'nurse', 'doctor', 'lab_technician', 'pharmacist');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system_settings table
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_name TEXT NOT NULL DEFAULT 'CardioRegistry',
    logo_url TEXT,
    theme TEXT DEFAULT 'light',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default system settings
INSERT INTO public.system_settings (site_name) VALUES ('CardioRegistry');

-- Create patients table
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_number TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL,
    national_id TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    blood_type TEXT,
    allergies TEXT[],
    chronic_conditions TEXT[],
    cardiovascular_history TEXT,
    previous_surgeries TEXT,
    current_medications TEXT,
    consent_treatment BOOLEAN DEFAULT false,
    consent_biological_samples BOOLEAN DEFAULT false,
    consent_date TIMESTAMP WITH TIME ZONE,
    registered_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vitals table
CREATE TABLE public.vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    recorded_by UUID REFERENCES auth.users(id) NOT NULL,
    systolic_bp INTEGER NOT NULL,
    diastolic_bp INTEGER NOT NULL,
    heart_rate INTEGER NOT NULL,
    oxygen_saturation DECIMAL(5,2),
    temperature DECIMAL(4,1),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctor_schedules table
CREATE TABLE public.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES auth.users(id) NOT NULL,
    scheduled_by UUID REFERENCES auth.users(id) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    type TEXT DEFAULT 'consultation',
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lab_tests table
CREATE TABLE public.lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    ordered_by UUID REFERENCES auth.users(id) NOT NULL,
    assigned_to UUID REFERENCES auth.users(id),
    test_type TEXT NOT NULL,
    test_name TEXT NOT NULL,
    priority TEXT DEFAULT 'routine',
    status TEXT DEFAULT 'pending',
    ordered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Create lab_results table
CREATE TABLE public.lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_test_id UUID REFERENCES public.lab_tests(id) ON DELETE CASCADE NOT NULL,
    parameter_name TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT,
    reference_range TEXT,
    is_abnormal BOOLEAN DEFAULT false,
    entered_by UUID REFERENCES auth.users(id) NOT NULL,
    entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescriptions table
CREATE TABLE public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    prescribed_by UUID REFERENCES auth.users(id) NOT NULL,
    dispensed_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending',
    notes TEXT,
    prescribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    dispensed_at TIMESTAMP WITH TIME ZONE
);

-- Create prescription_items table
CREATE TABLE public.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    instructions TEXT
);

-- Create surgical_consents table
CREATE TABLE public.surgical_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    surgery_id UUID,
    consent_type TEXT NOT NULL,
    consent_details TEXT,
    risks_explained BOOLEAN DEFAULT false,
    alternatives_explained BOOLEAN DEFAULT false,
    patient_signature TEXT,
    witness_name TEXT,
    witness_signature TEXT,
    consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create surgeries table
CREATE TABLE public.surgeries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    surgeon_id UUID REFERENCES auth.users(id) NOT NULL,
    surgery_type TEXT NOT NULL,
    surgery_name TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER,
    operating_room TEXT,
    status TEXT DEFAULT 'scheduled',
    pre_op_assessment TEXT,
    pre_op_tests_completed BOOLEAN DEFAULT false,
    who_checklist_completed BOOLEAN DEFAULT false,
    intra_op_notes TEXT,
    post_op_notes TEXT,
    complications TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update surgical_consents to reference surgeries
ALTER TABLE public.surgical_consents 
ADD CONSTRAINT fk_surgery FOREIGN KEY (surgery_id) REFERENCES public.surgeries(id);

-- Create icu_admissions table
CREATE TABLE public.icu_admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    surgery_id UUID REFERENCES public.surgeries(id),
    admitted_by UUID REFERENCES auth.users(id) NOT NULL,
    bed_number TEXT,
    admission_reason TEXT NOT NULL,
    status TEXT DEFAULT 'admitted',
    admitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    discharged_at TIMESTAMP WITH TIME ZONE
);

-- Create icu_progress_notes table
CREATE TABLE public.icu_progress_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icu_admission_id UUID REFERENCES public.icu_admissions(id) ON DELETE CASCADE NOT NULL,
    recorded_by UUID REFERENCES auth.users(id) NOT NULL,
    vitals_summary TEXT,
    medications_given TEXT,
    observations TEXT,
    complications TEXT,
    recovery_status TEXT,
    plan TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create follow_ups table
CREATE TABLE public.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    scheduled_by UUID REFERENCES auth.users(id),
    doctor_id UUID REFERENCES auth.users(id),
    scheduled_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    related_entity_type TEXT,
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgical_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icu_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icu_progress_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for system_settings
CREATE POLICY "All authenticated users can view settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can update settings"
ON public.system_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for patients (accessible by nurses, doctors, admin)
CREATE POLICY "Staff can view patients"
ON public.patients FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Nurses and admins can insert patients"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Nurses and admins can update patients"
ON public.patients FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for vitals
CREATE POLICY "Staff can view vitals"
ON public.vitals FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Nurses can insert vitals"
ON public.vitals FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for doctor_schedules
CREATE POLICY "All staff can view schedules"
ON public.doctor_schedules FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Doctors can manage own schedule"
ON public.doctor_schedules FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = doctor_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can update own schedule"
ON public.doctor_schedules FOR UPDATE
TO authenticated
USING (auth.uid() = doctor_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for appointments
CREATE POLICY "Staff can view appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Nurses can create appointments"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can update appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid()));

-- RLS Policies for lab_tests
CREATE POLICY "Staff can view lab tests"
ON public.lab_tests FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Doctors can order lab tests"
ON public.lab_tests FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Lab techs can update lab tests"
ON public.lab_tests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'lab_technician') OR public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for lab_results
CREATE POLICY "Staff can view lab results"
ON public.lab_results FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Lab techs can insert results"
ON public.lab_results FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'lab_technician') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for prescriptions
CREATE POLICY "Staff can view prescriptions"
ON public.prescriptions FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Doctors can create prescriptions"
ON public.prescriptions FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Pharmacists can update prescriptions"
ON public.prescriptions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'pharmacist') OR public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for prescription_items
CREATE POLICY "Staff can view prescription items"
ON public.prescription_items FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Doctors can insert prescription items"
ON public.prescription_items FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for surgical_consents
CREATE POLICY "Staff can view surgical consents"
ON public.surgical_consents FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Doctors can create surgical consents"
ON public.surgical_consents FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for surgeries
CREATE POLICY "Staff can view surgeries"
ON public.surgeries FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Doctors can create surgeries"
ON public.surgeries FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can update surgeries"
ON public.surgeries FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for icu_admissions
CREATE POLICY "Staff can view ICU admissions"
ON public.icu_admissions FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Doctors and nurses can create ICU admissions"
ON public.icu_admissions FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can update ICU admissions"
ON public.icu_admissions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for icu_progress_notes
CREATE POLICY "Staff can view ICU notes"
ON public.icu_progress_notes FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Staff can insert ICU notes"
ON public.icu_progress_notes FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for follow_ups
CREATE POLICY "Staff can view follow-ups"
ON public.follow_ups FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Staff can create follow-ups"
ON public.follow_ups FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Staff can update follow-ups"
ON public.follow_ups FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  
  -- If first user, make them admin
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate patient number
CREATE OR REPLACE FUNCTION public.generate_patient_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.patients;
  new_number := 'PT-' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$;

-- Function to auto-schedule follow-ups
CREATE OR REPLACE FUNCTION public.schedule_follow_up()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Schedule follow-up 2 weeks after surgery completion
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.follow_ups (patient_id, doctor_id, scheduled_date, reason, scheduled_by)
    VALUES (
      NEW.patient_id,
      NEW.surgeon_id,
      CURRENT_DATE + INTERVAL '14 days',
      'Post-surgery follow-up',
      NEW.surgeon_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_surgery_completed
  AFTER UPDATE ON public.surgeries
  FOR EACH ROW EXECUTE FUNCTION public.schedule_follow_up();