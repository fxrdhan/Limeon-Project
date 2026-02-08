import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  usePatients,
  usePatient,
  useSearchPatients,
  usePatientsByGender,
  useRecentPatients,
  usePatientMutations,
  useDoctors,
  useDoctor,
  useSearchDoctors,
  useDoctorsBySpecialization,
  useDoctorsByExperience,
  useRecentDoctors,
  useDoctorMutations,
} from './usePatientsDoctors';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';

const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());

const invalidateQueriesMock = vi.hoisted(() => vi.fn());
const removeQueriesMock = vi.hoisted(() => vi.fn());

const preloadImageMock = vi.hoisted(() => vi.fn());
const setCachedImageMock = vi.hoisted(() => vi.fn());

const patientsServiceMock = vi.hoisted(() => ({
  getActivePatients: vi.fn(),
  getById: vi.fn(),
  searchPatients: vi.fn(),
  getPatientsByGender: vi.fn(),
  getRecentPatients: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

const doctorsServiceMock = vi.hoisted(() => ({
  getActiveDoctors: vi.fn(),
  getById: vi.fn(),
  searchDoctors: vi.fn(),
  getDoctorsBySpecialization: vi.fn(),
  getDoctorsByExperience: vi.fn(),
  getRecentDoctors: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}));

vi.mock('@/services/api/patients-doctors.service', () => ({
  patientsService: patientsServiceMock,
  doctorsService: doctorsServiceMock,
}));

vi.mock('@/utils/imageCache', () => ({
  preloadImage: preloadImageMock,
  setCachedImage: setCachedImageMock,
}));

describe('usePatientsDoctors hooks', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryClientMock.mockReset();

    invalidateQueriesMock.mockReset();
    removeQueriesMock.mockReset();
    preloadImageMock.mockReset();
    setCachedImageMock.mockReset();

    Object.values(patientsServiceMock).forEach(fn => fn.mockReset());
    Object.values(doctorsServiceMock).forEach(fn => fn.mockReset());

    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
      removeQueries: removeQueriesMock,
    });

    useQueryMock.mockImplementation(
      (config: {
        queryKey: readonly unknown[];
        queryFn: () => Promise<unknown>;
        enabled?: boolean;
      }) => {
        const key = config.queryKey;

        if (key[0] === 'patients' && key[1] === 'list') {
          return {
            queryKey: config.queryKey,
            queryFn: config.queryFn,
            enabled: config.enabled,
            data: [
              { id: 'pat-1', image_url: 'https://cdn.test/patient.jpg' },
              { id: 'pat-2', image_url: '' },
            ],
          };
        }

        if (key[0] === 'doctors' && key[1] === 'list') {
          return {
            queryKey: config.queryKey,
            queryFn: config.queryFn,
            enabled: config.enabled,
            data: [
              { id: 'doc-1', image_url: 'https://cdn.test/doctor.jpg' },
              { id: null, image_url: 'https://cdn.test/skip.jpg' },
            ],
          };
        }

        return {
          queryKey: config.queryKey,
          queryFn: config.queryFn,
          enabled: config.enabled,
          data: undefined,
        };
      }
    );

    useMutationMock.mockImplementation(
      (config: {
        mutationFn: (arg: unknown) => Promise<unknown>;
        onSuccess?: (...args: unknown[]) => void;
        onError?: (...args: unknown[]) => void;
      }) => ({
        mutateAsync: async (arg: unknown) => {
          try {
            const result = await config.mutationFn(arg);
            config.onSuccess?.(result, arg, undefined);
            return result;
          } catch (error) {
            config.onError?.(error, arg, undefined);
            throw error;
          }
        },
      })
    );
  });

  it('executes patient queries, enabled gates, and image preloading side effects', async () => {
    patientsServiceMock.getActivePatients.mockResolvedValueOnce({
      data: [{ id: 'pat-1' }],
      error: null,
    });
    patientsServiceMock.getById.mockResolvedValueOnce({
      data: { id: 'pat-1' },
      error: null,
    });
    patientsServiceMock.searchPatients.mockResolvedValueOnce({
      data: [{ id: 'pat-1' }],
      error: null,
    });
    patientsServiceMock.getPatientsByGender.mockResolvedValueOnce({
      data: [{ id: 'pat-1' }],
      error: null,
    });
    patientsServiceMock.getRecentPatients.mockResolvedValueOnce({
      data: [{ id: 'pat-1' }],
      error: null,
    });

    const { result: patientsResult } = renderHook(() => usePatients());

    await waitFor(() => {
      expect(setCachedImageMock).toHaveBeenCalledWith(
        'identity:pat-1',
        'https://cdn.test/patient.jpg'
      );
      expect(preloadImageMock).toHaveBeenCalledWith(
        'https://cdn.test/patient.jpg'
      );
    });

    await expect(patientsResult.current.queryFn()).resolves.toEqual([
      { id: 'pat-1' },
    ]);

    const { result: patientResult } = renderHook(() => usePatient('pat-1'));
    await expect(patientResult.current.queryFn()).resolves.toEqual({
      id: 'pat-1',
    });

    const { result: searchPatientsResult } = renderHook(() =>
      useSearchPatients('ani')
    );
    await expect(searchPatientsResult.current.queryFn()).resolves.toEqual([
      { id: 'pat-1' },
    ]);

    const { result: byGenderResult } = renderHook(() =>
      usePatientsByGender('female')
    );
    await expect(byGenderResult.current.queryFn()).resolves.toEqual([
      { id: 'pat-1' },
    ]);

    const { result: recentResult } = renderHook(() => useRecentPatients(2));
    await expect(recentResult.current.queryFn()).resolves.toEqual([
      { id: 'pat-1' },
    ]);

    const { result: disabledPatient } = renderHook(() => usePatient(''));
    const { result: disabledSearch } = renderHook(() => useSearchPatients(''));
    const { result: disabledGender } = renderHook(() =>
      usePatientsByGender('')
    );
    expect(disabledPatient.current.enabled).toBe(false);
    expect(disabledSearch.current.enabled).toBe(false);
    expect(disabledGender.current.enabled).toBe(false);

    const error = new Error('patients failed');
    patientsServiceMock.getById.mockResolvedValueOnce({ data: null, error });
    const { result: patientErrorResult } = renderHook(() =>
      usePatient('p-err')
    );
    await expect(patientErrorResult.current.queryFn()).rejects.toBe(error);
  });

  it('executes doctor queries, enabled gates, and image preloading side effects', async () => {
    doctorsServiceMock.getActiveDoctors.mockResolvedValueOnce({
      data: [{ id: 'doc-1' }],
      error: null,
    });
    doctorsServiceMock.getById.mockResolvedValueOnce({
      data: { id: 'doc-1' },
      error: null,
    });
    doctorsServiceMock.searchDoctors.mockResolvedValueOnce({
      data: [{ id: 'doc-1' }],
      error: null,
    });
    doctorsServiceMock.getDoctorsBySpecialization.mockResolvedValueOnce({
      data: [{ id: 'doc-1' }],
      error: null,
    });
    doctorsServiceMock.getDoctorsByExperience.mockResolvedValueOnce({
      data: [{ id: 'doc-1' }],
      error: null,
    });
    doctorsServiceMock.getRecentDoctors.mockResolvedValueOnce({
      data: [{ id: 'doc-1' }],
      error: null,
    });

    const { result: doctorsResult } = renderHook(() => useDoctors());

    await waitFor(() => {
      expect(setCachedImageMock).toHaveBeenCalledWith(
        'identity:doc-1',
        'https://cdn.test/doctor.jpg'
      );
      expect(preloadImageMock).toHaveBeenCalledWith(
        'https://cdn.test/doctor.jpg'
      );
    });

    await expect(doctorsResult.current.queryFn()).resolves.toEqual([
      { id: 'doc-1' },
    ]);

    const { result: doctorResult } = renderHook(() => useDoctor('doc-1'));
    await expect(doctorResult.current.queryFn()).resolves.toEqual({
      id: 'doc-1',
    });

    const { result: searchDoctorsResult } = renderHook(() =>
      useSearchDoctors('budi')
    );
    await expect(searchDoctorsResult.current.queryFn()).resolves.toEqual([
      { id: 'doc-1' },
    ]);

    const { result: specializationResult } = renderHook(() =>
      useDoctorsBySpecialization('cardio')
    );
    await expect(specializationResult.current.queryFn()).resolves.toEqual([
      { id: 'doc-1' },
    ]);

    const { result: experienceResult } = renderHook(() =>
      useDoctorsByExperience(3)
    );
    await expect(experienceResult.current.queryFn()).resolves.toEqual([
      { id: 'doc-1' },
    ]);

    const { result: recentDoctorsResult } = renderHook(() =>
      useRecentDoctors(2)
    );
    await expect(recentDoctorsResult.current.queryFn()).resolves.toEqual([
      { id: 'doc-1' },
    ]);

    const { result: disabledDoctor } = renderHook(() => useDoctor(''));
    const { result: disabledDoctorSearch } = renderHook(() =>
      useSearchDoctors('')
    );
    const { result: disabledSpecialization } = renderHook(() =>
      useDoctorsBySpecialization('')
    );
    const { result: disabledExperience } = renderHook(() =>
      useDoctorsByExperience(0)
    );
    expect(disabledDoctor.current.enabled).toBe(false);
    expect(disabledDoctorSearch.current.enabled).toBe(false);
    expect(disabledSpecialization.current.enabled).toBe(false);
    expect(disabledExperience.current.enabled).toBe(false);

    const error = new Error('doctors failed');
    doctorsServiceMock.getById.mockResolvedValueOnce({ data: null, error });
    const { result: doctorErrorResult } = renderHook(() => useDoctor('d-err'));
    await expect(doctorErrorResult.current.queryFn()).rejects.toBe(error);
  });

  it('runs patient mutations and invalidates/removes related queries', async () => {
    patientsServiceMock.create.mockResolvedValueOnce({
      data: { id: 'pat-1' },
      error: null,
    });
    patientsServiceMock.update.mockResolvedValueOnce({
      data: { id: 'pat-1' },
      error: null,
    });
    patientsServiceMock.update.mockResolvedValueOnce({
      data: {},
      error: null,
    });
    patientsServiceMock.delete.mockResolvedValueOnce({
      data: { id: 'pat-1' },
      error: null,
    });

    const { result } = renderHook(() => usePatientMutations());

    await act(async () => {
      await result.current.createPatient.mutateAsync({ name: 'Ani' } as never);
      await result.current.updatePatient.mutateAsync({
        id: 'pat-1',
        data: { name: 'Ani Update' } as never,
      });
      await result.current.updatePatient.mutateAsync({
        id: 'pat-2',
        data: { name: 'No detail invalidate' } as never,
      });
      await result.current.deletePatient.mutateAsync('pat-1');
    });

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: getInvalidationKeys.patients.all(),
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.patients.detail('pat-1'),
    });
    expect(removeQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.patients.detail('pat-1'),
    });
  });

  it('runs doctor mutations and invalidates/removes related queries', async () => {
    doctorsServiceMock.create.mockResolvedValueOnce({
      data: { id: 'doc-1' },
      error: null,
    });
    doctorsServiceMock.update.mockResolvedValueOnce({
      data: { id: 'doc-1' },
      error: null,
    });
    doctorsServiceMock.update.mockResolvedValueOnce({
      data: {},
      error: null,
    });
    doctorsServiceMock.delete.mockResolvedValueOnce({
      data: { id: 'doc-1' },
      error: null,
    });

    const { result } = renderHook(() => useDoctorMutations());

    await act(async () => {
      await result.current.createDoctor.mutateAsync({ name: 'Budi' } as never);
      await result.current.updateDoctor.mutateAsync({
        id: 'doc-1',
        data: { name: 'Budi Update' } as never,
      });
      await result.current.updateDoctor.mutateAsync({
        id: 'doc-2',
        data: { name: 'No detail invalidate' } as never,
      });
      await result.current.deleteDoctor.mutateAsync('doc-1');
    });

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: getInvalidationKeys.doctors.all(),
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.doctors.detail('doc-1'),
    });
    expect(removeQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.doctors.detail('doc-1'),
    });
  });
});
