
import type { IncidentType, IncidentSeverity } from './types';

export interface IncidentThreshold {
  type: IncidentType;
  severity: IncidentSeverity;
  condition: string;
}

export const incidentThresholds: IncidentThreshold[] = [
  {
    type: 'Crowd surge',
    severity: 'High',
    condition: 'Sudden, rapid increase in crowd density in a confined area.',
  },
  {
    type: 'Unauthorized access',
    severity: 'Medium',
    condition: 'A person entering a restricted zone without proper credentials.',
  },
  {
    type: 'Suspicious behavior',
    severity: 'Low',
    condition: 'Individuals loitering, abandoning packages, or showing unusual agitation.',
  },
  {
    type: 'Emergency',
    severity: 'Critical',
    condition: 'Detection of fire, smoke, medical emergencies, or visible altercations.',
  },
  {
    type: 'Theft',
    severity: 'High',
    condition: 'Observing an individual taking an item without payment or from another person.',
  },
];
