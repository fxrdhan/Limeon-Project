import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import { useEffect } from 'react';
import { preloadImage, setCachedImage } from '@/utils/imageCache';
import {
  patientsService,
  doctorsService,
} from '@/services/api/patients-doctors.service';
import type { Patient, Doctor } from '@/types/database';

// Patient Hooks
export const usePatients = (options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: QueryKeys.patients.list(),
    queryFn: async () => {
      const result = await patientsService.getActivePatients();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });

  useEffect(() => {
    (query.data || []).forEach(patient => {
      if (!patient.id || !patient.image_url) return;
      const cacheKey = `identity:${patient.id}`;
      setCachedImage(cacheKey, patient.image_url);
      preloadImage(patient.image_url);
    });
  }, [query.data]);

  return query;
};

export const usePatient = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.patients.detail(id),
    queryFn: async () => {
      const result = await patientsService.getById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: (options?.enabled ?? true) && !!id,
  });
};

export const useSearchPatients = (
  query: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.patients.search(query),
    queryFn: async () => {
      const result = await patientsService.searchPatients(query);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: (options?.enabled ?? true) && query.length > 0,
  });
};

export const usePatientsByGender = (
  gender: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.patients.byGender(gender),
    queryFn: async () => {
      const result = await patientsService.getPatientsByGender(gender);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: (options?.enabled ?? true) && !!gender,
  });
};

export const useRecentPatients = (
  limit: number = 10,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.patients.recent(limit),
    queryFn: async () => {
      const result = await patientsService.getRecentPatients(limit);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const usePatientMutations = () => {
  const queryClient = useQueryClient();

  const createPatient = useMutation({
    mutationFn: async (
      data: Omit<Patient, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const result = await patientsService.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.patients.all(),
      });
    },
  });

  const updatePatient = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Patient, 'id' | 'created_at'>>;
    }) => {
      const result = await patientsService.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: data => {
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.patients.detail(data.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.patients.all(),
      });
    },
  });

  const deletePatient = useMutation({
    mutationFn: async (id: string) => {
      const result = await patientsService.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: QueryKeys.patients.detail(id) });
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.patients.all(),
      });
    },
  });

  return {
    createPatient,
    updatePatient,
    deletePatient,
  };
};

// Doctor Hooks
export const useDoctors = (options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: QueryKeys.doctors.list(),
    queryFn: async () => {
      const result = await doctorsService.getActiveDoctors();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });

  useEffect(() => {
    (query.data || []).forEach(doctor => {
      if (!doctor.id || !doctor.image_url) return;
      const cacheKey = `identity:${doctor.id}`;
      setCachedImage(cacheKey, doctor.image_url);
      preloadImage(doctor.image_url);
    });
  }, [query.data]);

  return query;
};

export const useDoctor = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.doctors.detail(id),
    queryFn: async () => {
      const result = await doctorsService.getById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: (options?.enabled ?? true) && !!id,
  });
};

export const useSearchDoctors = (
  query: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.doctors.search(query),
    queryFn: async () => {
      const result = await doctorsService.searchDoctors(query);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: (options?.enabled ?? true) && query.length > 0,
  });
};

export const useDoctorsBySpecialization = (
  specialization: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.doctors.bySpecialization(specialization),
    queryFn: async () => {
      const result =
        await doctorsService.getDoctorsBySpecialization(specialization);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: (options?.enabled ?? true) && !!specialization,
  });
};

export const useDoctorsByExperience = (
  minYears: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.doctors.byExperience(minYears),
    queryFn: async () => {
      const result = await doctorsService.getDoctorsByExperience(minYears);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: (options?.enabled ?? true) && minYears > 0,
  });
};

export const useRecentDoctors = (
  limit: number = 10,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.doctors.recent(limit),
    queryFn: async () => {
      const result = await doctorsService.getRecentDoctors(limit);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useDoctorMutations = () => {
  const queryClient = useQueryClient();

  const createDoctor = useMutation({
    mutationFn: async (
      data: Omit<Doctor, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const result = await doctorsService.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.doctors.all(),
      });
    },
  });

  const updateDoctor = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Doctor, 'id' | 'created_at'>>;
    }) => {
      const result = await doctorsService.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: data => {
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.doctors.detail(data.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.doctors.all(),
      });
    },
  });

  const deleteDoctor = useMutation({
    mutationFn: async (id: string) => {
      const result = await doctorsService.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: QueryKeys.doctors.detail(id) });
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.doctors.all(),
      });
    },
  });

  return {
    createDoctor,
    updateDoctor,
    deleteDoctor,
  };
};
