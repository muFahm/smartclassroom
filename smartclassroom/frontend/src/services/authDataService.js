/**
 * Authentication Data Service
 * Provides utilities for validating university emails, detecting user roles,
 * and checking NIMs/StaffIds against university data.
 */

import mahasiswaNims from '../data/mahasiswa_nims.json';
import dosenStaffIds from '../data/dosen_staff_ids.json';

// Convert staff array to Set for faster lookup
const staffIdSet = new Set(dosenStaffIds.map(d => d.StaffId || d.staffId));
const nimSet = new Set(mahasiswaNims);

/**
 * User roles enum
 */
export const UserRole = {
  MAHASISWA: 'mahasiswa',
  DOSEN: 'dosen',
  ADMIN: 'admin',
  UNKNOWN: 'unknown'
};

/**
 * Extract identifier from university email
 * @param {string} email - University email address
 * @returns {{ identifier: string, domain: string, isStudent: boolean, isStaff: boolean }}
 */
export function parseUniversityEmail(email) {
  if (!email || !email.includes('@')) {
    return { identifier: '', domain: '', isStudent: false, isStaff: false };
  }

  const [identifier, domain] = email.toLowerCase().split('@');
  
  // Student email format: nim@std.trisakti.ac.id
  const isStudent = domain === 'std.trisakti.ac.id';
  
  // Staff email format: staffid@trisakti.ac.id
  const isStaff = domain === 'trisakti.ac.id';
  
  return { identifier, domain, isStudent, isStaff };
}

/**
 * Validate if a NIM exists in the student database
 * @param {string} nim - Student NIM (12 digits)
 * @returns {boolean}
 */
export function isValidNim(nim) {
  return nimSet.has(nim);
}

/**
 * Validate if a StaffId exists in the lecturer database
 * @param {string} staffId - Lecturer StaffId (4-5 characters)
 * @returns {boolean}
 */
export function isValidStaffId(staffId) {
  // Check case-insensitive
  const upperStaffId = staffId.toUpperCase();
  const lowerStaffId = staffId.toLowerCase();
  return staffIdSet.has(staffId) || staffIdSet.has(upperStaffId) || staffIdSet.has(lowerStaffId);
}

/**
 * Get lecturer name by StaffId
 * @param {string} staffId - Lecturer StaffId
 * @returns {string|null}
 */
export function getDosenName(staffId) {
  const dosen = dosenStaffIds.find(d => 
    (d.StaffId || d.staffId).toLowerCase() === staffId.toLowerCase()
  );
  return dosen ? (dosen.StaffName || dosen.name) : null;
}

/**
 * Detect user role and validate email against university database
 * @param {string} email - University email address
 * @returns {{ 
 *   role: string, 
 *   isValid: boolean, 
 *   identifier: string, 
 *   errorMessage: string|null,
 *   dosenName: string|null
 * }}
 */
export function detectRoleFromEmail(email) {
  const { identifier, isStudent, isStaff } = parseUniversityEmail(email);
  
  // Check for student email pattern
  if (isStudent) {
    // NIM should be 12 digits
    if (!/^\d{12}$/.test(identifier)) {
      return {
        role: UserRole.UNKNOWN,
        isValid: false,
        identifier,
        errorMessage: 'Format NIM tidak valid. NIM harus 12 digit angka.',
        dosenName: null
      };
    }
    
    if (!isValidNim(identifier)) {
      return {
        role: UserRole.MAHASISWA,
        isValid: false,
        identifier,
        errorMessage: 'NIM tidak terdaftar di sistem. Hubungi admin jika ini adalah kesalahan.',
        dosenName: null
      };
    }
    
    return {
      role: UserRole.MAHASISWA,
      isValid: true,
      identifier,
      errorMessage: null,
      dosenName: null
    };
  }
  
  // Check for staff email pattern
  if (isStaff) {
    // StaffId is typically 4-6 alphanumeric characters
    if (!/^[a-zA-Z0-9]{3,10}$/.test(identifier)) {
      return {
        role: UserRole.UNKNOWN,
        isValid: false,
        identifier,
        errorMessage: 'Format kode dosen tidak valid.',
        dosenName: null
      };
    }
    
    if (!isValidStaffId(identifier)) {
      return {
        role: UserRole.DOSEN,
        isValid: false,
        identifier,
        errorMessage: 'Kode dosen tidak terdaftar di sistem. Hubungi admin jika ini adalah kesalahan.',
        dosenName: null
      };
    }
    
    return {
      role: UserRole.DOSEN,
      isValid: true,
      identifier,
      errorMessage: null,
      dosenName: getDosenName(identifier)
    };
  }
  
  // Unknown email format
  return {
    role: UserRole.UNKNOWN,
    isValid: false,
    identifier,
    errorMessage: 'Format email universitas tidak dikenali. Gunakan email @std.trisakti.ac.id untuk mahasiswa atau @trisakti.ac.id untuk dosen.',
    dosenName: null
  };
}

/**
 * Get all registered NIMs
 * @returns {string[]}
 */
export function getAllNims() {
  return mahasiswaNims;
}

/**
 * Get all registered StaffIds with names
 * @returns {Array<{staffId: string, name: string}>}
 */
export function getAllStaffIds() {
  return dosenStaffIds;
}

export default {
  UserRole,
  parseUniversityEmail,
  isValidNim,
  isValidStaffId,
  getDosenName,
  detectRoleFromEmail,
  getAllNims,
  getAllStaffIds
};
