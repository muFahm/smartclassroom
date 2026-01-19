/**
 * Classroom Layout Configurations
 * Defines seating arrangements for different classrooms
 */

export const CLASSROOM_LAYOUTS = {
  701: {
    name: "Kelas 701",
    totalSeats: 30,
    type: "standard-offset",
    description:
      "5 baris: 2 baris depan (6 kursi) + 3 baris belakang (6 kursi dengan indent)",
    layout: [
      [6, 5, 4, 3, 2, 1], // Baris 1 - depan
      [7, 8, 9, 10, 11, 12], // Baris 2 - depan
      [null, 18, 17, 16, 15, 14, 13], // Baris 3 - indent (null = empty space)
      [null, 19, 20, 21, 22, 23, 24], // Baris 4 - indent
      [null, 30, 29, 28, 27, 26, 25], // Baris 5 - indent
    ],
  },

  702: {
    name: "Kelas 702",
    totalSeats: 50,
    type: "standard-offset",
    description:
      "8 baris: 2 baris depan (7 kursi dengan offset) + 6 baris belakang (6 kursi dengan indent)",
    layout: [
      [1, 2, 3, 4, 5, 6, 7], // Baris 1 - kursi 1 offset di kiri
      [8, 9, 10, 11, 12, 13, 14], // Baris 2 - kursi 8 offset di kiri
      [null, 15, 16, 17, 18, 19, 20], // Baris 3-8 indent (sejajar dengan 2, 9, dst)
      [null, 21, 22, 23, 24, 25, 26],
      [null, 27, 28, 29, 30, 31, 32],
      [null, 33, 34, 35, 36, 37, 38],
      [null, 39, 40, 41, 42, 43, 44],
      [null, 45, 46, 47, 48, 49, 50],
    ],
  },

  703: {
    name: "Kelas 703",
    totalSeats: 30,
    type: "x-shape",
    description: "Bentuk X: 4 ujung (6 kursi per ujung) + tengah (6 kursi)",
    layout: [
      // Ujung atas (kiri + kanan)
      [1, 2, 3, null, null, null, null, 7, 8, 9],
      [4, 5, 6, null, null, null, null, 10, 11, 12],

      // Tengah
      [null, null, null, 13, 14, 15, null, null, null],
      [null, null, null, 16, 17, 18, null, null, null],

      // Ujung bawah (kiri + kanan)
      [19, 20, 21, null, null, null, null, 25, 26, 27],
      [22, 23, 24, null, null, null, null, 28, 29, 30],
    ],
  },
};

/**
 * Get classroom configuration by ID
 * @param {string} classroomId - The classroom ID (e.g., "701")
 * @returns {object|null} Classroom configuration or null if not found
 */
export function getClassroomConfig(classroomId) {
  return CLASSROOM_LAYOUTS[classroomId] || null;
}

/**
 * Get list of available classroom IDs
 * @returns {string[]} Array of classroom IDs
 */
export function getAvailableClassrooms() {
  return Object.keys(CLASSROOM_LAYOUTS);
}

/**
 * Validate if a classroom ID exists
 * @param {string} classroomId - The classroom ID to validate
 * @returns {boolean} True if classroom exists
 */
export function isValidClassroom(classroomId) {
  return classroomId in CLASSROOM_LAYOUTS;
}
