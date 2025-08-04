import { QueryKeys } from '@/constants/queryKeys';
import { useSimpleRealtime } from '../realtime/useSimpleRealtime';
import { useDoctors, usePatients } from './usePatientsDoctors';

interface UseRealtimeOptions {
  enabled?: boolean;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
}

// Doctors Realtime Hook using simplified approach
export const useDoctorsRealtime = (options?: UseRealtimeOptions) => {
  const doctorsQuery = useDoctors(options);

  useSimpleRealtime({
    table: 'doctors',
    queryKeys: [
      QueryKeys.doctors.all,
    ],
    enabled: options?.enabled ?? true,
  });

  return doctorsQuery;
};

// Patients Realtime Hook using simplified approach
export const usePatientsRealtime = (options?: UseRealtimeOptions) => {
  const patientsQuery = usePatients(options);

  useSimpleRealtime({
    table: 'patients',
    queryKeys: [
      QueryKeys.patients.all,
    ],
    enabled: options?.enabled ?? true,
  });

  return patientsQuery;
};