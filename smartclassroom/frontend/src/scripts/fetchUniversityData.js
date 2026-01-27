const https = require('https');
const fs = require('fs');
const path = require('path');

// Helper function to make POST request
function fetchData(program) {
  return new Promise((resolve, reject) => {
    const url = 'https://sis.trisakti.ac.id/api/get-data-kelas?token=XX&program=' + program + '&semester=20251';
    
    const req = https.request(url, { method: 'POST' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Fetching data for program 0650 (SI)...');
  const dataSI = await fetchData('0650');
  console.log('SI courses found:', Object.keys(dataSI).length);
  
  console.log('Fetching data for program 0641 (IF)...');
  const dataIF = await fetchData('0641');
  console.log('IF courses found:', Object.keys(dataIF).length);
  
  // Collect unique NIMs
  const nims = new Set();
  const staffIds = {}; // StaffId -> StaffName
  
  [dataSI, dataIF].forEach(data => {
    Object.values(data).forEach(course => {
      if (course.Std && Array.isArray(course.Std)) {
        course.Std.forEach(student => nims.add(student.nim));
      }
      if (course.dosen && typeof course.dosen === 'object') {
        Object.values(course.dosen).forEach(dosen => {
          if (dosen.StaffId) {
            staffIds[dosen.StaffId] = dosen.StaffName;
          }
        });
      }
    });
  });
  
  // Convert NIMs to sorted array
  const nimsArray = Array.from(nims).sort();
  
  // Convert staffIds to array of objects
  const staffArray = Object.entries(staffIds).map(([staffId, name]) => ({
    staffId,
    name
  })).sort((a, b) => a.staffId.localeCompare(b.staffId));
  
  console.log('\nTotal unique NIMs:', nimsArray.length);
  console.log('Total unique StaffIds:', staffArray.length);
  console.log('\nSample NIMs:', nimsArray.slice(0, 5));
  console.log('\nSample StaffIds:', staffArray.slice(0, 5));
  
  // Save to JSON files in data folder
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Save NIMs
  const nimsFile = path.join(dataDir, 'mahasiswa_nims.json');
  fs.writeFileSync(nimsFile, JSON.stringify(nimsArray, null, 2));
  console.log('\nNIMs saved to:', nimsFile);
  
  // Save Staff IDs
  const staffFile = path.join(dataDir, 'dosen_staff_ids.json');
  fs.writeFileSync(staffFile, JSON.stringify(staffArray, null, 2));
  console.log('Staff IDs saved to:', staffFile);
}

main().catch(console.error);
