import React from 'react';
import {
  CheckCircle,
  Clock,
  FileCheck,
  XCircle,
  Thermometer,
  Plane,
} from 'lucide-react';

const ICONS = {
  present: CheckCircle,
  late: Clock,
  excused: FileCheck,
  absent: XCircle,
  sick: Thermometer,
  traveling: Plane,
};

const COLORS = {
  present: 'var(--success-color)',
  late: '#d97706',
  excused: '#2563eb',
  absent: 'var(--danger-color)',
  sick: 'var(--danger-color)',
  traveling: 'var(--text-secondary)',
};

export default function AttendanceStatusIcon({ status = 'present', size = 18, className = '' }) {
  const Icon = ICONS[status] || CheckCircle;
  return <Icon size={size} color={COLORS[status] || COLORS.present} className={className} aria-hidden />;
}
