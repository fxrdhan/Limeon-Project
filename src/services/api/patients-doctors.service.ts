import { BaseService } from './base.service';
import type { Patient, Doctor } from '@/types/database';

// Patient Service
export class PatientsService extends BaseService<Patient> {
  constructor() {
    super('patients');
  }

  async getActivePatients() {
    return this.getAll({
      orderBy: { column: 'name', ascending: true }
    });
  }

  async searchPatients(query: string) {
    return this.search(query, ['name', 'phone', 'email'], {
      orderBy: { column: 'name', ascending: true }
    });
  }

  async getPatientsByGender(gender: string) {
    return this.getAll({
      filters: { gender },
      orderBy: { column: 'name', ascending: true }
    });
  }

  async getRecentPatients(limit: number = 10) {
    return this.getAll({
      orderBy: { column: 'updated_at', ascending: false },
      limit
    });
  }
}

// Doctor Service
export class DoctorsService extends BaseService<Doctor> {
  constructor() {
    super('doctors');
  }

  async getActiveDoctors() {
    return this.getAll({
      orderBy: { column: 'name', ascending: true }
    });
  }

  async searchDoctors(query: string) {
    return this.search(query, ['name', 'specialization', 'license_number', 'phone', 'email'], {
      orderBy: { column: 'name', ascending: true }
    });
  }

  async getDoctorsBySpecialization(specialization: string) {
    return this.getAll({
      filters: { specialization },
      orderBy: { column: 'name', ascending: true }
    });
  }

  async getDoctorsByExperience(minYears: number) {
    return this.getAll({
      filters: { experience_years: { gte: minYears } },
      orderBy: { column: 'experience_years', ascending: false }
    });
  }

  async getRecentDoctors(limit: number = 10) {
    return this.getAll({
      orderBy: { column: 'updated_at', ascending: false },
      limit
    });
  }
}

// Export singleton instances
export const patientsService = new PatientsService();
export const doctorsService = new DoctorsService();

// Combined Service Facade
export class PatientsDoctorsService {
  patients = patientsService;
  doctors = doctorsService;

  // Get both patients and doctors for forms/dropdowns
  async getAllPatientsDoctors() {
    const [patients, doctors] = await Promise.all([
      this.patients.getActivePatients(),
      this.doctors.getActiveDoctors()
    ]);

    return {
      patients: patients.data || [],
      doctors: doctors.data || [],
      errors: {
        patients: patients.error,
        doctors: doctors.error
      }
    };
  }

  // Search across both patients and doctors
  async searchAll(query: string) {
    const [patients, doctors] = await Promise.all([
      this.patients.searchPatients(query),
      this.doctors.searchDoctors(query)
    ]);

    return {
      patients: patients.data || [],
      doctors: doctors.data || [],
      errors: {
        patients: patients.error,
        doctors: doctors.error
      }
    };
  }
}

export const patientsDoctorsService = new PatientsDoctorsService();