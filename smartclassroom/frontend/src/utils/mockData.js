// Mock Data untuk Smart Classroom Application
// Data dummy untuk development dan testing

// ==================== CLASSROOM DATA ====================
export const CLASSROOMS = ["701", "702", "703"];

export const SELECTED_CLASSROOM = "701"; // Default selected class

// ==================== SENSOR DATA ====================
export const SENSOR_DATA = {
  temperature: 22,
  temperatureUnit: "°C",
  light: 550,
  lightUnit: "Lux",
  humidity: 65,
  humidityUnit: "%",
  lastUpdate: new Date().toISOString(),
};

// ==================== CHAIR DATA (Per Classroom) ====================
// Format: occupancy object dengan key = nomor kursi, value = status (1=terisi, 0=kosong)
export const CHAIR_DATA = {
  "701": {
    total: 30,
    occupied: 18,
    percentage: 60,
    occupancy: {
      1: 0, 2: 1, 3: 1, 4: 1, 5: 0, 6: 1,
      7: 1, 8: 0, 9: 1, 10: 1, 11: 0, 12: 1,
      13: 0, 14: 1, 15: 1, 16: 0, 17: 1, 18: 1,
      19: 1, 20: 0, 21: 1, 22: 1, 23: 0, 24: 1,
      25: 0, 26: 1, 27: 1, 28: 0, 29: 1, 30: 1
    }
  },
  "702": {
    total: 50,
    occupied: 32,
    percentage: 64,
    occupancy: {
      1: 1, 2: 0, 3: 1, 4: 1, 5: 0, 6: 1, 7: 1,
      8: 0, 9: 1, 10: 1, 11: 0, 12: 1, 13: 1, 14: 0,
      15: 1, 16: 1, 17: 0, 18: 1, 19: 1, 20: 0,
      21: 1, 22: 1, 23: 0, 24: 1, 25: 1, 26: 0,
      27: 1, 28: 1, 29: 0, 30: 1, 31: 1, 32: 0,
      33: 1, 34: 1, 35: 0, 36: 1, 37: 1, 38: 0,
      39: 1, 40: 1, 41: 0, 42: 1, 43: 1, 44: 0,
      45: 1, 46: 1, 47: 0, 48: 1, 49: 1, 50: 0
    }
  },
  "703": {
    total: 30,
    occupied: 20,
    percentage: 67,
    occupancy: {
      1: 1, 2: 0, 3: 1, 4: 1, 5: 0, 6: 1,
      7: 1, 8: 0, 9: 1, 10: 1, 11: 0, 12: 1,
      13: 0, 14: 1, 15: 1, 16: 1, 17: 0, 18: 1,
      19: 1, 20: 0, 21: 1, 22: 0, 23: 1, 24: 1,
      25: 1, 26: 0, 27: 1, 28: 0, 29: 1, 30: 1
    }
  }
};

// ==================== POLLING DATA ====================
export const POLLING_DATA = [
  { id: "06422025", nama: "Hany", jawaban: "Benar" },
  { id: "06422058", nama: "Raja", jawaban: "Salah" },
  { id: "06422014", nama: "Ratu", jawaban: "Salah" },
  { id: "06422025", nama: "Chaesa", jawaban: "Benar" },
  { id: "06422523", nama: "Sonya", jawaban: "Salah" },
  { id: "06400225", nama: "Mandari", jawaban: "Benar" },
  { id: "06422104", nama: "Kharisma", jawaban: "Benar" },
  { id: "06422100", nama: "Ziddan", jawaban: "Salah" },
  { id: "06422111", nama: "Josua", jawaban: "Salah" },
  { id: "06422510", nama: "Fahmi", jawaban: "Benar" },
  { id: "06411200", nama: "Dimas", jawaban: "Benar" },
  { id: "06422115", nama: "Bintang", jawaban: "Benar" },
  { id: "06422336", nama: "Rodrick", jawaban: "Salah" },
  { id: "06422551", nama: "Ridho", jawaban: "Salah" },
  { id: "06411222", nama: "Aldi", jawaban: "Benar" },
  { id: "06411002", nama: "Maulana", jawaban: "Benar" },
];

// Polling data untuk mode kuis (jawaban a/b/c/d)
export const POLLING_DATA_KUIS = [
  { id: "06422025", nama: "Hany", jawaban: "a" },
  { id: "06422058", nama: "Raja", jawaban: "b" },
  { id: "06422014", nama: "Ratu", jawaban: "b" },
  { id: "06422025", nama: "Chaesa", jawaban: "a" },
  { id: "06422523", nama: "Sonya", jawaban: "c" },
  { id: "06400225", nama: "Mandari", jawaban: "a" },
  { id: "06422104", nama: "Kharisma", jawaban: "a" },
  { id: "06422100", nama: "Ziddan", jawaban: "d" },
  { id: "06422111", nama: "Josua", jawaban: "b" },
  { id: "06422510", nama: "Fahmi", jawaban: "a" },
  { id: "06411200", nama: "Dimas", jawaban: "a" },
  { id: "06422115", nama: "Bintang", jawaban: "a" },
  { id: "06422336", nama: "Rodrick", jawaban: "c" },
  { id: "06422551", nama: "Ridho", jawaban: "b" },
  { id: "06411222", nama: "Aldi", jawaban: "a" },
  { id: "06411002", nama: "Maulana", jawaban: "a" },
];

export const POLLING_SUMMARY = {
  correct: 8,
  wrong: 6,
  total: 14,
  accuracy: 57, // percentage
};

// ==================== KUIS DATA ====================
export const KUIS_ACTIVE = {
  nomor: 1,
  pertanyaan: "Manakah yang merupakan tipe data string di JavaScript ?",
  pilihan: [
    { label: "a", text: '"Hello World"' },
    { label: "b", text: "123" },
    { label: "c", text: "true" },
    { label: "d", text: "null" },
  ],
  jawaban_benar: "a",
};

// ==================== STUDENT ACTIVITY DATA ====================
export const STUDENTS_ACTIVITY = [
  { nama: "Chaesa", nim: "06522325", aktivitas: "Berdiri" },
  { nama: "Sonya", nim: "06422115", aktivitas: "Berjalan" },
  { nama: "Kharisma", nim: "06422335", aktivitas: "Duduk" },
  { nama: "Josua", nim: "06422110", aktivitas: "Berdiri" },
  { nama: "Ziddan", nim: "06422111", aktivitas: "Duduk" },
  { nama: "Fahmi", nim: "06422555", aktivitas: "Berjalan" },
  { nama: "Bintang", nim: "06455891", aktivitas: "Berdiri" },
  { nama: "Rodrick", nim: "06422145", aktivitas: "Berjalan" },
  { nama: "Mendari", nim: "06422174", aktivitas: "Tidur" },
  { nama: "Rido", nim: "06422101", aktivitas: "Berjalan" },
  { nama: "Maulana", nim: "06422117", aktivitas: "Tidur" },
  { nama: "Aidi", nim: "06422152", aktivitas: "Berdiri" },
  { nama: "Dimas", nim: "06433250", aktivitas: "Main Hp" },
  { nama: "Naufal", nim: "06422536", aktivitas: "Main Hp" },
];

export const ACTIVITY_SUMMARY = {
  berdiri: 20, // percentage
  berjalan: 25,
  duduk: 30,
  tidur: 15,
  mainHp: 10,
};

// ==================== MOVEMENT CLASSIFICATION DATA ====================
export const MOVEMENT_DATA = [
  { nama: "Chaesa", nim: "06522325", aktivitas: "Menunduk" },
  { nama: "Sonya", nim: "06422115", aktivitas: "Menunjuk" },
  { nama: "Kharisma", nim: "06422335", aktivitas: "Menunduk" },
  { nama: "Josua", nim: "06422110", aktivitas: "Menunduk" },
  { nama: "Ziddan", nim: "06422111", aktivitas: "Menunjuk" },
  { nama: "Fahmi", nim: "06422555", aktivitas: "Menunduk" },
  { nama: "Bintang", nim: "06455891", aktivitas: "Menggeleng" },
  { nama: "Rodrick", nim: "06422145", aktivitas: "Angkat Tangan" },
  { nama: "Mendari", nim: "06422174", aktivitas: "Angkat Tangan" },
  { nama: "Rido", nim: "06422101", aktivitas: "Angkat Tangan" },
  { nama: "Maulana", nim: "06422117", aktivitas: "Menunduk" },
  { nama: "Aidi", nim: "06422152", aktivitas: "Angkat Tangan" },
  { nama: "Dimas", nim: "06433250", aktivitas: "Angkat Tangan" },
];

export const MOVEMENT_SUMMARY = {
  menunduk: 55, // percentage
  menunjuk: 30,
  angkatTangan: 15,
};

// ==================== VOICE EXPRESSION DATA ====================
export const VOICE_EXPRESSION = [
  { nama: "Chaesa", nim: "06522325", aktivitas: "Fokus" },
  { nama: "Sonya", nim: "06422115", aktivitas: "Bahagia" },
  { nama: "Kharisma", nim: "06422335", aktivitas: "Fokus" },
  { nama: "Josua", nim: "06422110", aktivitas: "Bosan" },
  { nama: "Ziddan", nim: "06422111", aktivitas: "Bahagia" },
  { nama: "Fahmi", nim: "06422555", aktivitas: "Sedih" },
  { nama: "Bintang", nim: "06455891", aktivitas: "Bahagia" },
  { nama: "Rodrick", nim: "06422145", aktivitas: "Sedih" },
  { nama: "Mendari", nim: "06422174", aktivitas: "Bosan" },
  { nama: "Rido", nim: "06422101", aktivitas: "Sedih" },
  { nama: "Maulana", nim: "06422117", aktivitas: "Fokus" },
  { nama: "Aidi", nim: "06422152", aktivitas: "Bahagia" },
  { nama: "Dimas", nim: "06433250", aktivitas: "Bahagia" },
];

export const VOICE_EXPRESSION_SUMMARY = {
  fokus: 10, // percentage
  bahagia: 35,
  bosan: 30,
  sedih: 25,
};

// ==================== VOICE RECOGNITION DATA ====================
export const VOICE_RECOGNITION = [
  { nama: "Chaesa", nim: "06522325", jumlahTerdeteksi: 32 },
  { nama: "Sonya", nim: "06422115", jumlahTerdeteksi: 30 },
  { nama: "Kharisma", nim: "06422335", jumlahTerdeteksi: 28 },
  { nama: "Josua", nim: "06422110", jumlahTerdeteksi: 27 },
  { nama: "Ziddan", nim: "06422111", jumlahTerdeteksi: 25 },
  { nama: "Fahmi", nim: "06422555", jumlahTerdeteksi: 24 },
  { nama: "Bintang", nim: "06455891", jumlahTerdeteksi: 23 },
  { nama: "Rodrick", nim: "06422145", jumlahTerdeteksi: 20 },
  { nama: "Mendari", nim: "06422174", jumlahTerdeteksi: 18 },
  { nama: "Rido", nim: "06422101", jumlahTerdeteksi: 13 },
  { nama: "Maulana", nim: "06422117", jumlahTerdeteksi: 12 },
  { nama: "Aidi", nim: "06422152", jumlahTerdeteksi: 11 },
  { nama: "Dimas", nim: "06433250", jumlahTerdeteksi: 10 },
  { nama: "Naufal", nim: "06422536", jumlahTerdeteksi: 6 },
];

export const VOICE_RECOGNITION_SUMMARY = {
  totalDetections: 234,
  averagePerStudent: 16.7,
};

// ==================== TRANSCRIPT DATA ====================
export const TRANSCRIPT_DATA = [
  {
    time: "13:10",
    speaker: "Dosen",
    text: "Silahkan dipersiapkan alat tulis dan bukunya ya, kita akan mulai kuis ke 2 materi Algoritma",
  },
  {
    time: "13:11",
    speaker: "Rehan",
    text: "Baik pak",
  },
  {
    time: "13:11",
    speaker: "Dosen",
    text: "Apakah sudah siap?",
  },
  {
    time: "13:12",
    speaker: "Yenan",
    text: "Belum pak",
  },
  {
    time: "13:13",
    speaker: "Dosen",
    text: "Kenapa Yenan, belum belajar?",
  },
  {
    time: "13:14",
    speaker: "Runa",
    text: "Iya pak, kemarin Yenan sakit dan kami lupa memberi tahu Yenan",
  },
  {
    time: "13:14",
    speaker: "Dosen",
    text: "Baik, saya kasih waktu untuk membaca materi selama 30 menit ya",
  },
  {
    time: "13:15",
    speaker: "Yenan",
    text: "Baik, terimakasih ya pak",
  },
  {
    time: "13:16",
    speaker: "Dosen",
    text: "Baik, silahkan dimulai",
  },
];

// ==================== FACE EXPRESSION DATA ====================
export const FACE_EXPRESSION = [
  { nama: "Chaesa", nim: "06522325", aktivitas: "Bahagia" },
  { nama: "Sonya", nim: "06422115", aktivitas: "Bahagia" },
  { nama: "Kharisma", nim: "06422335", aktivitas: "Bahagia" },
  { nama: "Josua", nim: "06422110", aktivitas: "Sedih" },
  { nama: "Ziddan", nim: "06422111", aktivitas: "Bosan" },
  { nama: "Fahmi", nim: "06422555", aktivitas: "Bosan" },
  { nama: "Bintang", nim: "06455891", aktivitas: "Bosan" },
  { nama: "Rodrick", nim: "06422145", aktivitas: "Sedih" },
  { nama: "Mendari", nim: "06422174", aktivitas: "Sedih" },
  { nama: "Rido", nim: "06422101", aktivitas: "Bahagia" },
  { nama: "Maulana", nim: "06422117", aktivitas: "Fokus" },
  { nama: "Aidi", nim: "06422152", aktivitas: "Fokus" },
  { nama: "Dimas", nim: "06433250", aktivitas: "Fokus" },
];

export const FACE_EXPRESSION_SUMMARY = {
  fokus: 10, // percentage
  bahagia: 35,
  bosan: 30,
  sedih: 25,
};

// ==================== FACE RECOGNITION DATA ====================
export const FACE_RECOGNITION = [
  { nama: "Chaesa", nim: "06522325", jumlahTerdeteksi: 32 },
  { nama: "Sonya", nim: "06422115", jumlahTerdeteksi: 30 },
  { nama: "Kharisma", nim: "06422335", jumlahTerdeteksi: 28 },
  { nama: "Josua", nim: "06422110", jumlahTerdeteksi: 27 },
  { nama: "Ziddan", nim: "06422111", jumlahTerdeteksi: 25 },
  { nama: "Fahmi", nim: "06422555", jumlahTerdeteksi: 24 },
  { nama: "Bintang", nim: "06455891", jumlahTerdeteksi: 23 },
  { nama: "Rodrick", nim: "06422145", jumlahTerdeteksi: 20 },
  { nama: "Mendari", nim: "06422174", jumlahTerdeteksi: 18 },
  { nama: "Rido", nim: "06422101", jumlahTerdeteksi: 13 },
  { nama: "Maulana", nim: "06422117", jumlahTerdeteksi: 12 },
  { nama: "Aidi", nim: "06422152", jumlahTerdeteksi: 11 },
  { nama: "Dimas", nim: "06433250", jumlahTerdeteksi: 10 },
  { nama: "Naufal", nim: "06422536", jumlahTerdeteksi: 6 },
];

export const FACE_RECOGNITION_SUMMARY = {
  totalDetections: 234,
  averagePerStudent: 16.7,
};

// ==================== STATISTICS DATA (untuk Line Chart) ====================
export const STATISTICS_VOICE_DATA = {
  labels: [
    "Dena",
    "Ratu",
    "Raja",
    "Rehan",
    "Ratih",
    "Nur",
    "Hani",
    "Jeno",
    "Jaemin",
    "Kaisar",
    "Nana",
    "Bila",
    "Mila",
    "Prita",
    "Mei",
  ],
  data: [4, 5, 4, 3, 4, 5, 5, 4, 5, 4, 5, 6, 6, 6, 5],
};

export const STATISTICS_FACE_DATA = {
  labels: [
    "Dena",
    "Ratu",
    "Raja",
    "Rehan",
    "Ratih",
    "Nur",
    "Hani",
    "Jeno",
    "Jaemin",
    "Kaisar",
    "Nana",
    "Bila",
    "Mila",
    "Prita",
    "Mei",
  ],
  data: [3, 4, 5, 5, 5, 6, 6, 5, 6, 5, 6, 5, 5, 5, 6],
};

// ==================== QUIZ MODE DATA ====================
export const QUIZ_DATA = {
  isActive: false, // Set true when quiz mode detected
  currentQuestion: 1,
  totalQuestions: 30,
  question: "Manakah yang merupakan tipe data string di JavaScript?",
  options: {
    a: '"Hello World"',
    b: "123",
    c: "true",
    d: "null",
  },
  correctAnswer: "a",
};

// ==================== USER DATA ====================
export const USER_DATA = {
  fullName: "Dr. Ahmad Hidayat, M.Kom",
  email: "ahmad.hidayat@university.ac.id",
  role: "Dosen",
  position: "Kepala Program Studi Informatika",
  avatar: null, // URL to avatar image or null
};

// ==================== DATE TIME ====================
export const getCurrentDateTime = () => {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const now = new Date();
  const dayName = days[now.getDay()];
  const date = now.getDate();
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return {
    fullDate: `${dayName}, ${date} ${monthName} ${year}`,
    time: `${hours}:${minutes}`,
    dayName,
    date,
    monthName,
    year,
    hours,
    minutes,
  };
};

// ==================== LEARNING MODES ====================
export const LEARNING_MODES = {
  NORMAL: "normal",
  KUIS: "kuis",
  DISKUSI: "diskusi",
  KOLABORASI: "kolaborasi",
  PRESENTASI: "presentasi",
  BRAINSTORMING: "brainstorming",
  MENULIS_MEMBACA: "menulis_membaca",
  PRAKTIKUM_TUTORIAL: "praktikum_tutorial",
};

export const CURRENT_LEARNING_MODE = LEARNING_MODES.NORMAL;
