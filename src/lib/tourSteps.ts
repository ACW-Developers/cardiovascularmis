export interface TourStep {
  id: string;
  title: string;
  description: string;
  selector?: string; // CSS selector for element to highlight
  audioText: string; // Text for speech synthesis
}

export interface RoleTourConfig {
  overview: string;
  steps: TourStep[];
}

const commonSteps: TourStep[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Your central hub showing key statistics, today\'s appointments, and pending tasks at a glance.',
    selector: '[data-tour="dashboard"]',
    audioText: 'This is your dashboard, showing key statistics and today\'s activities.',
  },
];

export const tourConfigs: Record<string, RoleTourConfig> = {
  admin: {
    overview: `Welcome to CardioRegistry, your comprehensive cardiovascular patient management system. 
    As an administrator, you have full access to all modules including patient management, appointments, 
    laboratory services, pharmacy, surgical operations, ICU care, reports, user management, and system settings. 
    Let me walk you through each section.`,
    steps: [
      ...commonSteps,
      {
        id: 'patients',
        title: 'Patient Management',
        description: 'Register new patients, view medical histories, and manage patient records.',
        selector: '[data-tour="patients"]',
        audioText: 'Patient Management allows you to register and manage all patient records.',
      },
      {
        id: 'appointments',
        title: 'Appointments',
        description: 'Schedule, track, and manage patient appointments with doctors.',
        selector: '[data-tour="appointments"]',
        audioText: 'The Appointments module handles scheduling and appointment tracking.',
      },
      {
        id: 'lab',
        title: 'Laboratory',
        description: 'Order lab tests, enter results, and track test status.',
        selector: '[data-tour="lab"]',
        audioText: 'Laboratory services for ordering and managing lab tests.',
      },
      {
        id: 'pharmacy',
        title: 'Pharmacy',
        description: 'Manage prescriptions and medication dispensing.',
        selector: '[data-tour="pharmacy"]',
        audioText: 'Pharmacy module for prescriptions and medication management.',
      },
      {
        id: 'surgery',
        title: 'Surgery Suite',
        description: 'Coordinate pre-operative, intra-operative, and post-operative care.',
        selector: '[data-tour="surgery"]',
        audioText: 'Surgery Suite manages the complete surgical workflow.',
      },
      {
        id: 'users',
        title: 'User Management',
        description: 'Manage staff accounts, roles, and permissions.',
        selector: '[data-tour="users"]',
        audioText: 'User Management for staff accounts and access control.',
      },
      {
        id: 'settings',
        title: 'Settings',
        description: 'Configure system preferences and customize the application.',
        selector: '[data-tour="settings"]',
        audioText: 'Settings to customize your system preferences.',
      },
    ],
  },
  nurse: {
    overview: `Welcome to CardioRegistry. As a nurse, you can manage patient vitals, 
    assist with appointments, and support pre and post-operative care. 
    Let me show you the key features available to you.`,
    steps: [
      ...commonSteps,
      {
        id: 'patients',
        title: 'Patients',
        description: 'View patient records and medical histories.',
        selector: '[data-tour="patients"]',
        audioText: 'Access patient records and medical information.',
      },
      {
        id: 'vitals',
        title: 'Vitals',
        description: 'Record and monitor patient vital signs.',
        selector: '[data-tour="vitals"]',
        audioText: 'Record vital signs including blood pressure, heart rate, and temperature.',
      },
      {
        id: 'appointments',
        title: 'Appointments',
        description: 'View and manage patient appointments.',
        selector: '[data-tour="appointments"]',
        audioText: 'Track and manage patient appointments.',
      },
      {
        id: 'icu',
        title: 'ICU',
        description: 'Monitor and care for ICU patients.',
        selector: '[data-tour="icu"]',
        audioText: 'ICU module for intensive care patient monitoring.',
      },
    ],
  },
  doctor: {
    overview: `Welcome to CardioRegistry. As a doctor, you can manage your patients, 
    conduct consultations, review lab results, and write prescriptions. 
    Here's an overview of your available tools.`,
    steps: [
      ...commonSteps,
      {
        id: 'my-patients',
        title: 'My Patients',
        description: 'View and manage your assigned patients.',
        selector: '[data-tour="my-patients"]',
        audioText: 'Access your assigned patients and their records.',
      },
      {
        id: 'consultations',
        title: 'Consultations',
        description: 'Conduct and document patient consultations.',
        selector: '[data-tour="consultations"]',
        audioText: 'Document patient consultations and diagnoses.',
      },
      {
        id: 'schedule',
        title: 'My Schedule',
        description: 'View and manage your appointment schedule.',
        selector: '[data-tour="schedule"]',
        audioText: 'Manage your daily and weekly schedule.',
      },
      {
        id: 'lab-results',
        title: 'Lab Results',
        description: 'Review patient laboratory results.',
        selector: '[data-tour="lab-results"]',
        audioText: 'Review laboratory test results for your patients.',
      },
      {
        id: 'prescriptions',
        title: 'Prescriptions',
        description: 'Write and manage patient prescriptions.',
        selector: '[data-tour="prescriptions"]',
        audioText: 'Create and manage patient prescriptions.',
      },
    ],
  },
  lab_technician: {
    overview: `Welcome to CardioRegistry. As a lab technician, you can view pending lab orders, 
    enter test results, and manage laboratory workflow. Let me show you around.`,
    steps: [
      ...commonSteps,
      {
        id: 'lab-orders',
        title: 'Lab Orders',
        description: 'View and process pending laboratory test orders.',
        selector: '[data-tour="lab-orders"]',
        audioText: 'View and process pending lab test orders.',
      },
      {
        id: 'lab-results',
        title: 'Lab Results',
        description: 'Enter and verify laboratory test results.',
        selector: '[data-tour="lab-results"]',
        audioText: 'Enter and manage laboratory test results.',
      },
    ],
  },
  pharmacist: {
    overview: `Welcome to CardioRegistry. As a pharmacist, you can view prescriptions, 
    dispense medications, and track dispensing history. Here's your workflow overview.`,
    steps: [
      ...commonSteps,
      {
        id: 'prescriptions',
        title: 'Prescriptions',
        description: 'View pending prescriptions ready for dispensing.',
        selector: '[data-tour="prescriptions"]',
        audioText: 'View prescriptions awaiting dispensing.',
      },
      {
        id: 'pharmacy',
        title: 'Pharmacy',
        description: 'Dispense medications and manage inventory.',
        selector: '[data-tour="pharmacy"]',
        audioText: 'Dispense medications to patients.',
      },
      {
        id: 'history',
        title: 'Dispensing History',
        description: 'View past medication dispensing records.',
        selector: '[data-tour="history"]',
        audioText: 'Review medication dispensing history.',
      },
    ],
  },
  researcher: {
    overview: `Welcome to CardioRegistry. As a researcher, you can access anonymized data 
    and research dashboards. Here's an overview of your available tools.`,
    steps: [
      ...commonSteps,
      {
        id: 'research',
        title: 'Research Dashboard',
        description: 'Access research data and analytics.',
        selector: '[data-tour="research"]',
        audioText: 'Access research analytics and anonymized data.',
      },
    ],
  },
};

export function getTourConfig(role: string): RoleTourConfig {
  return tourConfigs[role] || tourConfigs.admin;
}
