/**
 * Parse NIM mahasiswa untuk mendapatkan program dan angkatan
 * Format NIM: PPPTTAAUUU
 * - PPP: Prodi (064 = IF/0641, 065 = SI/0650)
 * - TT: Tahun angkatan (22 = 2022/2023-1, 24 = 2024/2025-1)
 * - AA: Angka unik
 * - UUU: Angka unik
 */

export function parseNIM(nim) {
  if (!nim || nim.length < 12) {
    return { program: null, angkatan: null, isValid: false };
  }

  const prodiCode = nim.substring(0, 3); // 064 atau 065
  const tahunAngkatan = nim.substring(3, 5); // 22, 24, dll

  // Map prodi code ke program
  let program = null;
  if (prodiCode === '064') {
    program = '0641'; // IF
  } else if (prodiCode === '065') {
    program = '0650'; // SI
  }

  // Convert tahun angkatan ke format API
  // 22 → 2022/2023-1
  // 24 → 2024/2025-1
  let angkatan = null;
  if (tahunAngkatan && !isNaN(tahunAngkatan)) {
    const yearPrefix = parseInt(tahunAngkatan) >= 20 ? '20' : '21';
    const startYear = parseInt(yearPrefix + tahunAngkatan);
    const endYear = startYear + 1;
    angkatan = `${startYear}/${endYear}-1`;
  }

  return {
    program,
    angkatan,
    isValid: program !== null && angkatan !== null,
  };
}

/**
 * Contoh usage:
 * parseNIM('064002200036') → { program: '0641', angkatan: '2022/2023-1', isValid: true }
 * parseNIM('065002400012') → { program: '0650', angkatan: '2024/2025-1', isValid: true }
 */
