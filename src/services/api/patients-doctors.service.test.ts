import { describe, it, expect, vi } from 'vitest';
import {
  patientsService,
  doctorsService,
  patientsDoctorsService,
} from './patients-doctors.service';
import { BaseService } from './base.service';

describe('Patients and Doctors services', () => {
  it('queries active patients and doctors', async () => {
    const getAllSpy = vi
      .spyOn(BaseService.prototype, 'getAll')
      .mockResolvedValue({ data: [], error: null });

    await patientsService.getActivePatients();
    await doctorsService.getActiveDoctors();

    expect(getAllSpy).toHaveBeenCalledWith({
      orderBy: { column: 'name', ascending: true },
    });
  });

  it('queries additional patient/doctor filters', async () => {
    const getAllSpy = vi
      .spyOn(BaseService.prototype, 'getAll')
      .mockResolvedValue({ data: [], error: null });

    await patientsService.getPatientsByGender('M');
    await patientsService.getRecentPatients(5);
    await doctorsService.getDoctorsBySpecialization('Cardiology');
    await doctorsService.getDoctorsByExperience(3);
    await doctorsService.getRecentDoctors(5);

    expect(getAllSpy).toHaveBeenCalled();
  });

  it('searches patients and doctors', async () => {
    const searchSpy = vi
      .spyOn(BaseService.prototype, 'search')
      .mockResolvedValue({ data: [], error: null });

    await patientsService.searchPatients('john');
    await doctorsService.searchDoctors('smith');

    expect(searchSpy).toHaveBeenCalled();
  });

  it('combines patient and doctor results', async () => {
    vi.spyOn(patientsService, 'getActivePatients').mockResolvedValue({
      data: [{ id: 'p1' } as never],
      error: null,
    });
    vi.spyOn(doctorsService, 'getActiveDoctors').mockResolvedValue({
      data: [{ id: 'd1' } as never],
      error: null,
    });

    const result = await patientsDoctorsService.getAllPatientsDoctors();
    expect(result.patients).toHaveLength(1);
    expect(result.doctors).toHaveLength(1);
  });

  it('searches both patients and doctors', async () => {
    vi.spyOn(patientsService, 'searchPatients').mockResolvedValue({
      data: [{ id: 'p1' } as never],
      error: null,
    });
    vi.spyOn(doctorsService, 'searchDoctors').mockResolvedValue({
      data: [{ id: 'd1' } as never],
      error: null,
    });

    const result = await patientsDoctorsService.searchAll('test');
    expect(result.patients).toHaveLength(1);
    expect(result.doctors).toHaveLength(1);
  });

  it('returns empty arrays when combined results missing', async () => {
    vi.spyOn(patientsService, 'getActivePatients').mockResolvedValue({
      data: null,
      error: null,
    });
    vi.spyOn(doctorsService, 'getActiveDoctors').mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await patientsDoctorsService.getAllPatientsDoctors();
    expect(result.patients).toEqual([]);
    expect(result.doctors).toEqual([]);
  });

  it('returns empty arrays when search results missing', async () => {
    vi.spyOn(patientsService, 'searchPatients').mockResolvedValue({
      data: null,
      error: null,
    });
    vi.spyOn(doctorsService, 'searchDoctors').mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await patientsDoctorsService.searchAll('test');
    expect(result.patients).toEqual([]);
    expect(result.doctors).toEqual([]);
  });
});
