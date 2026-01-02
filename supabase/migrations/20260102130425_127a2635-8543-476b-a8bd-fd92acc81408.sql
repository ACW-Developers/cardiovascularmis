-- Function to create notification for abnormal lab results
CREATE OR REPLACE FUNCTION public.notify_abnormal_lab_result()
RETURNS TRIGGER AS $$
DECLARE
  lab_test RECORD;
  patient RECORD;
  doctor_user_id uuid;
BEGIN
  -- Get lab test and patient info
  SELECT lt.*, p.first_name, p.last_name, p.patient_number 
  INTO lab_test
  FROM public.lab_tests lt
  JOIN public.patients p ON p.id = lt.patient_id
  WHERE lt.id = NEW.lab_test_id;
  
  -- Get the doctor who ordered the test
  doctor_user_id := lab_test.ordered_by;
  
  -- Create notification for the ordering doctor
  IF NEW.is_abnormal = true THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    VALUES (
      doctor_user_id,
      'Abnormal Lab Result',
      'Patient ' || lab_test.first_name || ' ' || lab_test.last_name || ' (' || lab_test.patient_number || ') has abnormal ' || NEW.parameter_name || ' result: ' || NEW.value,
      'warning',
      'lab_result',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for abnormal lab results
DROP TRIGGER IF EXISTS on_abnormal_lab_result ON public.lab_results;
CREATE TRIGGER on_abnormal_lab_result
  AFTER INSERT ON public.lab_results
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_abnormal_lab_result();

-- Function to create notification for critical vitals
CREATE OR REPLACE FUNCTION public.notify_critical_vitals()
RETURNS TRIGGER AS $$
DECLARE
  patient RECORD;
  is_critical boolean := false;
  critical_message text := '';
BEGIN
  -- Get patient info
  SELECT first_name, last_name, patient_number INTO patient
  FROM public.patients WHERE id = NEW.patient_id;
  
  -- Check for critical values
  IF NEW.systolic_bp > 180 OR NEW.systolic_bp < 90 THEN
    is_critical := true;
    critical_message := critical_message || 'BP: ' || NEW.systolic_bp || '/' || NEW.diastolic_bp || ' mmHg. ';
  END IF;
  
  IF NEW.heart_rate > 120 OR NEW.heart_rate < 50 THEN
    is_critical := true;
    critical_message := critical_message || 'HR: ' || NEW.heart_rate || ' bpm. ';
  END IF;
  
  IF NEW.oxygen_saturation IS NOT NULL AND NEW.oxygen_saturation < 92 THEN
    is_critical := true;
    critical_message := critical_message || 'SpO2: ' || NEW.oxygen_saturation || '%. ';
  END IF;
  
  IF NEW.temperature IS NOT NULL AND (NEW.temperature > 39 OR NEW.temperature < 35) THEN
    is_critical := true;
    critical_message := critical_message || 'Temp: ' || NEW.temperature || '°C. ';
  END IF;
  
  -- Notify all doctors if critical
  IF is_critical THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    SELECT 
      ur.user_id,
      'Critical Vitals Alert',
      'Patient ' || patient.first_name || ' ' || patient.last_name || ' (' || patient.patient_number || ') has critical vitals: ' || critical_message,
      'error',
      'vitals',
      NEW.id
    FROM public.user_roles ur
    WHERE ur.role = 'doctor';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for critical vitals
DROP TRIGGER IF EXISTS on_critical_vitals ON public.vitals;
CREATE TRIGGER on_critical_vitals
  AFTER INSERT ON public.vitals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_critical_vitals();

-- Function to create notification for new appointments
CREATE OR REPLACE FUNCTION public.notify_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  patient RECORD;
BEGIN
  -- Get patient info
  SELECT first_name, last_name, patient_number INTO patient
  FROM public.patients WHERE id = NEW.patient_id;
  
  -- Notify the assigned doctor
  INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
  VALUES (
    NEW.doctor_id,
    'New Appointment Scheduled',
    'New ' || COALESCE(NEW.type, 'consultation') || ' appointment with ' || patient.first_name || ' ' || patient.last_name || ' (' || patient.patient_number || ') on ' || NEW.appointment_date || ' at ' || NEW.appointment_time,
    'info',
    'appointment',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new appointments
DROP TRIGGER IF EXISTS on_new_appointment ON public.appointments;
CREATE TRIGGER on_new_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_appointment();