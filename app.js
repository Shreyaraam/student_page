// Import Firebase SDKs
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Your Firebase configuration (unchanged)
const firebaseConfig = {
  apiKey: "AIzaSyCA40enAml33tAiF2z2qoPR-AQcm_65KuI",
  authDomain: "smart-attendance-system-1bd2a.firebaseapp.com",
  projectId: "smart-attendance-system-1bd2a",
  storageBucket: "smart-attendance-system-1bd2a.firebasestorage.app",
  messagingSenderId: "333311046363",
  appId: "1:333311046363:web:2314026371b145b433d2fe"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Expose for debugging if needed
window.db = db;
window.auth = auth;

// Auth state observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('user-email').textContent = user.email;
    loadSubjects();
    loadSubjectsForRegistration();
    loadSubjectsForTimetable();
  } else {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
  }
});

// Authentication functions
window.signupUser = async () => {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showMessage('Account created successfully!', 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
};

window.loginUser = async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showMessage('Logged in successfully!', 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
};

window.logoutUser = async () => {
  try { await signOut(auth); }
  catch (error) { showMessage(error.message, 'error'); }
};

// Student form submit
document.getElementById('student-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const selectedSubjects = Array.from(
    document.querySelectorAll('#subject-checkboxes input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  const studentData = {
    name: document.getElementById('student-name').value,
    email: document.getElementById('student-email').value,
    studentNumber: document.getElementById('student-number').value,
    department: document.getElementById('student-department').value,
    year: parseInt(document.getElementById('student-year').value),
    registeredSubjects: selectedSubjects,
    createdAt: new Date()
  };

  try {
    await addDoc(collection(db, 'students'), studentData);
    showMessage('Student registered successfully!', 'success');
    document.getElementById('student-form').reset();
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
  }
});

// Bulk student upload from Excel
const studentExcelForm = document.getElementById('student-excel-form');
if (studentExcelForm) {
  studentExcelForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('student-excel-file');
    const file = fileInput.files[0];

    if (!file) {
      showMessage('Please select an Excel file to upload.', 'error');
      return;
    }

    if (typeof XLSX === 'undefined') {
      showMessage('Excel library not loaded. Please refresh the page.', 'error');
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      showMessage('Could not read the selected file.', 'error');
    };

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          showMessage('The Excel file appears to be empty.', 'error');
          return;
        }

        let successCount = 0;
        let skipCount = 0;

        for (const row of rows) {
          const normalized = {};
          Object.keys(row).forEach((key) => {
            const normKey = key
              .toString()
              .trim()
              .toLowerCase()
              .replace(/\s+/g, '');
            normalized[normKey] = row[key];
          });

          const name = normalized.name || normalized.fullname;
          const email = normalized.email;
          const studentNumber = normalized.studentnumber;
          const department = normalized.department;
          const yearVal = normalized.year || normalized.semester;

          if (!name || !email || !studentNumber || !department || yearVal === '' || yearVal === undefined) {
            skipCount++;
            continue;
          }

          const year = parseInt(yearVal);
          if (isNaN(year)) {
            skipCount++;
            continue;
          }

          let registeredSubjects = [];
          const regSub = normalized.registeredsubjects || normalized.registered_subjects;
          if (regSub) {
            registeredSubjects = String(regSub)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
          }

          const studentData = {
            name,
            email,
            studentNumber,
            department,
            year,
            registeredSubjects,
            createdAt: new Date()
          };

          try {
            await addDoc(collection(db, 'students'), studentData);
            successCount++;
          } catch (err) {
            console.error('Error adding student from Excel:', err);
            skipCount++;
          }
        }

        let message;
        let type;

        if (successCount > 0) {
          message = `File uploaded and processed successfully. Registered ${successCount} student(s).`;
          if (skipCount > 0) {
            message += ` Skipped ${skipCount} row(s) due to missing or invalid data.`;
          }
          type = 'success';
        } else if (skipCount > 0) {
          message = 'The file was read, but all rows were skipped. Please check that your column names and data are correct.';
          type = 'error';
        } else {
          message = 'The Excel file appears to be empty.';
          type = 'error';
        }

        showMessage(message, type);
        fileInput.value = '';
      } catch (error) {
        console.error('Bulk upload error:', error);
        showMessage('Error processing Excel file: ' + error.message, 'error');
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

// Faculty form submit
document.getElementById('faculty-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const selectedSubjects = Array.from(
    document.querySelectorAll('#faculty-subject-checkboxes input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  const facultyData = {
    name: document.getElementById('faculty-name').value,
    email: document.getElementById('faculty-email').value,
    department: document.getElementById('faculty-department').value,
    designation: document.getElementById('faculty-designation').value,
    teachingSubjects: selectedSubjects,
    createdAt: new Date()
  };

  try {
    await addDoc(collection(db, 'faculty'), facultyData);
    showMessage('Faculty registered successfully!', 'success');
    document.getElementById('faculty-form').reset();
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
  }
});

// Subject form submit
document.getElementById('subject-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const subjectCode = document.getElementById('subject-code').value;
  const subjectData = {
    name: document.getElementById('subject-name').value,
    credits: parseInt(document.getElementById('subject-credits').value),
    department: document.getElementById('subject-department').value,
    semester: parseInt(document.getElementById('subject-semester').value),
    enrolledStudents: [],
    facultyId: null,
    createdAt: new Date()
  };

  try {
    await setDoc(doc(db, 'subjects', subjectCode), subjectData);
    showMessage('Subject added successfully!', 'success');
    document.getElementById('subject-form').reset();
    loadSubjects();
    loadSubjectsForRegistration();
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
  }
});

// Subject Registration form submit
document.getElementById('subject-reg-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const subjectCode = document.getElementById('reg-subject-code').value;
  const selectedStudents = Array.from(
    document.querySelectorAll('#student-checkboxes input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  if (selectedStudents.length === 0) {
    showMessage('Please select at least one student to register.', 'error');
    return;
  }

  try {
    const subjectRef = doc(db, 'subjects', subjectCode);
    await updateDoc(subjectRef, {
      enrolledStudents: arrayUnion(...selectedStudents)
    });

    showMessage(`Successfully registered ${selectedStudents.length} students to the subject!`, 'success');
    document.getElementById('subject-reg-form').reset();

    document.getElementById('reg-subject-name').value = '';
    document.getElementById('reg-subject-semester').value = '';
    document.getElementById('reg-student-year').value = '';
    document.getElementById('student-checkboxes').innerHTML =
      '<p style="text-align:center;color:#6b7280;padding:1rem;">Please select a year to view students.</p>';

  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
  }
});

// Load subjects for checkboxes
async function loadSubjects() {
  try {
    const querySnapshot = await getDocs(collection(db, 'subjects'));
    const subjects = [];
    querySnapshot.forEach((docSnap) => {
      subjects.push({ id: docSnap.id, ...docSnap.data() });
    });

    const studentCheckboxes = document.getElementById('subject-checkboxes');
    studentCheckboxes.innerHTML = '';
    subjects.forEach(subject => {
      const div = document.createElement('div');
      div.className = 'checkbox-item';
      div.innerHTML = `
        <input type="checkbox" id="student-subject-${subject.id}" value="${subject.id}">
        <label for="student-subject-${subject.id}">${subject.name} (${subject.id})</label>
      `;
      studentCheckboxes.appendChild(div);
    });

    const facultyCheckboxes = document.getElementById('faculty-subject-checkboxes');
    facultyCheckboxes.innerHTML = '';
    subjects.forEach(subject => {
      const div = document.createElement('div');
      div.className = 'checkbox-item';
      div.innerHTML = `
        <input type="checkbox" id="faculty-subject-${subject.id}" value="${subject.id}">
        <label for="faculty-subject-${subject.id}">${subject.name} (${subject.id})</label>
      `;
      facultyCheckboxes.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading subjects:', error);
  }
}

// Load students for subject registration (filtered by year)
async function loadStudents(yearFilter) {
  try {
    const querySnapshot = await getDocs(collection(db, 'students'));
    const students = [];

    querySnapshot.forEach((docSnap) => {
      const studentData = docSnap.data();
      if (studentData.year === parseInt(yearFilter)) {
        students.push({ id: docSnap.id, ...studentData });
      }
    });

    const studentCheckboxes = document.getElementById('student-checkboxes');
    studentCheckboxes.innerHTML = '';

    if (students.length === 0) {
      studentCheckboxes.innerHTML =
        `<p style="text-align:center;color:#6b7280;padding:1rem;">No students found in Semester ${yearFilter}.</p>`;
      return;
    }

    students.forEach(student => {
      const div = document.createElement('div');
      div.className = 'checkbox-item';
      div.innerHTML = `
        <input type="checkbox" id="reg-student-${student.id}" value="${student.id}">
        <label for="reg-student-${student.id}">${student.name} (${student.studentNumber}) - ${student.department}</label>
      `;
      studentCheckboxes.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading students:', error);
    document.getElementById('student-checkboxes').innerHTML =
      '<p style="text-align:center;color:#b91c1c;padding:1rem;">Error loading students.</p>';
  }
}

// Load subjects for registration dropdown
async function loadSubjectsForRegistration() {
  try {
    const querySnapshot = await getDocs(collection(db, 'subjects'));
    const subjectSelect = document.getElementById('reg-subject-code');

    subjectSelect.innerHTML = '<option value="">Select Subject</option>';

    querySnapshot.forEach((docSnap) => {
      const subject = docSnap.data();
      const option = document.createElement('option');
      option.value = docSnap.id;
      option.textContent = `${subject.name} (${docSnap.id})`;
      option.setAttribute('data-name', subject.name);
      option.setAttribute('data-semester', subject.semester);
      subjectSelect.appendChild(option);
    });

    subjectSelect.addEventListener('change', function () {
      const selectedOption = this.options[this.selectedIndex];
      if (selectedOption.value) {
        document.getElementById('reg-subject-name').value =
          selectedOption.getAttribute('data-name');
        document.getElementById('reg-subject-semester').value =
          `${selectedOption.getAttribute('data-semester')} Semester`;
      } else {
        document.getElementById('reg-subject-name').value = '';
        document.getElementById('reg-subject-semester').value = '';
      }
    });

    document.getElementById('reg-student-year').addEventListener('change', function () {
      const selectedYear = this.value;
      const list = document.getElementById('student-checkboxes');
      if (selectedYear) {
        loadStudents(selectedYear);
      } else {
        list.innerHTML =
          '<p style="text-align:center;color:#6b7280;padding:1rem;">Please select a year to view students.</p>';
      }
    });
  } catch (error) {
    console.error('Error loading subjects for registration:', error);
  }
}

// View tab data
window.switchViewTab = async (type) => {
  document.querySelectorAll('#view-tab .tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  const viewContent = document.getElementById('view-content');

  try {
    const querySnapshot = await getDocs(collection(db, type));
    let html = '';

    if (type === 'students') {
      html = '<h3>Registered Students</h3>';
      querySnapshot.forEach((docSnap) => {
        const student = docSnap.data();
        html += `
          <div class="card soft" style="margin:12px 0;">
            <h4>${student.name}</h4>
            <p><strong>Email:</strong> ${student.email}</p>
            <p><strong>Student Number:</strong> ${student.studentNumber}</p>
            <p><strong>Department:</strong> ${student.department}</p>
            <p><strong>Semester:</strong> ${student.year}</p>
            <p><strong>Subjects:</strong> ${student.registeredSubjects?.join(', ') || 'None'}</p>
          </div>`;
      });
    } else if (type === 'faculty') {
      html = '<h3>Faculty Members</h3>';
      querySnapshot.forEach((docSnap) => {
        const faculty = docSnap.data();
        html += `
          <div class="card soft" style="margin:12px 0;">
            <h4>${faculty.name}</h4>
            <p><strong>Email:</strong> ${faculty.email}</p>
            <p><strong>Department:</strong> ${faculty.department}</p>
            <p><strong>Designation:</strong> ${faculty.designation}</p>
            <p><strong>Teaching Subjects:</strong> ${faculty.teachingSubjects?.join(', ') || 'None'}</p>
          </div>`;
      });
    } else if (type === 'subjects') {
      html = '<h3>Available Subjects</h3>';
      querySnapshot.forEach((docSnap) => {
        const subject = docSnap.data();
        html += `
          <div class="card soft" style="margin:12px 0;">
            <h4>${subject.name} (${docSnap.id})</h4>
            <p><strong>Department:</strong> ${subject.department}</p>
            <p><strong>Credits:</strong> ${subject.credits}</p>
            <p><strong>Semester:</strong> ${subject.semester}</p>
            <p><strong>Enrolled Students:</strong> ${subject.enrolledStudents?.length || 0}</p>
          </div>`;
      });
    }

    viewContent.innerHTML = html || '<p>No data found.</p>';
  } catch (error) {
    viewContent.innerHTML = '<p>Error loading data: ' + error.message + '</p>';
  }
};

// Timetable subject dropdown
async function loadSubjectsForTimetable() {
  try {
    const querySnapshot = await getDocs(collection(db, 'subjects'));
    const subjectSelect = document.getElementById('tt-subject');

    subjectSelect.innerHTML = '<option value="">Select Subject</option>';

    querySnapshot.forEach((docSnap) => {
      const subject = docSnap.data();
      const option = document.createElement('option');
      option.value = docSnap.id;
      option.textContent = `${subject.name} (${docSnap.id})`;
      subjectSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading subjects for timetable:', error);
  }
}

// Timetable submit
document.getElementById('timetable-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const semester = document.getElementById('tt-semester').value;
  const timetableData = {
    semester: parseInt(semester),
    day: document.getElementById('tt-day').value,
    startTime: document.getElementById('tt-start-time').value,
    endTime: document.getElementById('tt-end-time').value,
    subjectCode: document.getElementById('tt-subject').value,
    room: document.getElementById('tt-room').value,
    createdAt: new Date()
  };

  try {
    await addDoc(collection(db, 'timetable'), timetableData);
    showMessage('Timetable entry added successfully!', 'success');
    document.getElementById('timetable-form').reset();
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
  }
});

// Helper function to convert Excel time to string format
function excelTimeToString(excelTime) {
  if (typeof excelTime === 'string') {
    return excelTime; // Already a string
  }
  
  // Excel stores times as fractions of a day (e.g., 0.333 = 8:00 AM)
  if (typeof excelTime === 'number') {
    const totalMinutes = Math.round(excelTime * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  
  return '';
}

// NEW: Bulk timetable upload from Excel
const timetableExcelForm = document.getElementById('timetable-excel-form');
if (timetableExcelForm) {
  timetableExcelForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('timetable-excel-file');
    const file = fileInput.files[0];

    if (!file) {
      showMessage('Please select an Excel file to upload.', 'error');
      return;
    }

    if (typeof XLSX === 'undefined') {
      showMessage('Excel library not loaded. Please refresh the page.', 'error');
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      showMessage('Could not read the selected file.', 'error');
    };

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          showMessage('The Excel file appears to be empty.', 'error');
          return;
        }

        let successCount = 0;
        let skipCount = 0;

        for (const row of rows) {
          console.log('Timetable row from Excel:', row);

          // Normalize keys
          const normalized = {};
          Object.keys(row).forEach((key) => {
            const normKey = key
              .toString()
              .trim()
              .toLowerCase()
              .replace(/\s+/g, '');
            normalized[normKey] = row[key];
          });

          // Extract fields
          const semesterVal = normalized.semester;
          const day = normalized.day;
          let startTime = normalized.starttime || normalized.start_time;
          let endTime = normalized.endtime || normalized.end_time;
          const subjectCode = normalized.subjectcode || normalized.subject_code || normalized.subject;
          const room = normalized.room || '';

          // Convert Excel time numbers to string format
          startTime = excelTimeToString(startTime);
          endTime = excelTimeToString(endTime);

          console.log('Parsed timetable:', { semesterVal, day, startTime, endTime, subjectCode, room });

          // Validation
          if (!semesterVal || !day || !startTime || !endTime || !subjectCode) {
            skipCount++;
            continue;
          }

          const semester = parseInt(semesterVal);
          if (isNaN(semester)) {
            skipCount++;
            continue;
          }

          const timetableData = {
            semester,
            day,
            startTime,
            endTime,
            subjectCode,
            room,
            createdAt: new Date()
          };

          try {
            await addDoc(collection(db, 'timetable'), timetableData);
            successCount++;
          } catch (err) {
            console.error('Error adding timetable entry from Excel:', err);
            skipCount++;
          }
        }

        let message;
        let type;

        if (successCount > 0) {
          message = `Timetable uploaded successfully. Added ${successCount} entry/entries.`;
          if (skipCount > 0) {
            message += ` Skipped ${skipCount} row(s) due to missing or invalid data.`;
          }
          type = 'success';
        } else if (skipCount > 0) {
          message = 'The file was read, but all rows were skipped. Please check column names (semester, day, startTime, endTime, subjectCode, room).';
          type = 'error';
        } else {
          message = 'The Excel file appears to be empty.';
          type = 'error';
        }

        showMessage(message, type);
        fileInput.value = '';
        
        // Refresh the timetable display if a semester is selected
        const viewSemesterSelect = document.getElementById('view-tt-semester');
        if (viewSemesterSelect && viewSemesterSelect.value) {
          viewTimetable(viewSemesterSelect.value);
        }
        
      } catch (error) {
        console.error('Timetable bulk upload error:', error);
        showMessage('Error processing Excel file: ' + error.message, 'error');
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

// Show file selected status for timetable Excel
const timetableFileInput = document.getElementById('timetable-excel-file');
if (timetableFileInput) {
  timetableFileInput.addEventListener('change', (e) => {
    const fileStatus = document.getElementById('timetable-file-upload-status');
    const file = e.target.files[0];

    if (!file) {
      fileStatus.textContent = "No file selected.";
      fileStatus.style.color = "#dc2626";
    } else {
      fileStatus.textContent = `File selected: ${file.name}`;
      fileStatus.style.color = "#16a34a";
    }
  });
}

// View timetable by semester
window.viewTimetable = async (semester) => {
  const displayDiv = document.getElementById('timetable-display');
  if (!semester) { displayDiv.innerHTML = ''; return; }

  try {
    const querySnapshot = await getDocs(collection(db, 'timetable'));
    const entries = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.semester === parseInt(semester)) {
        entries.push({ id: docSnap.id, ...data });
      }
    });

    if (entries.length === 0) {
      displayDiv.innerHTML =
        '<p style="text-align:center;color:#6b7280;padding:1rem;">No timetable entries found for this semester.</p>';
      return;
    }

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    entries.sort((a, b) => {
      const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      
      // Convert times to strings if they're not already
      const aTime = String(a.startTime || '');
      const bTime = String(b.startTime || '');
      return aTime.localeCompare(bTime);
    });

    let html = '<div class="table-wrap">';
    html += '<table>';
    html += '<thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Room</th></tr></thead><tbody>';

    entries.forEach(entry => {
      html += `<tr>
        <td>${entry.day}</td>
        <td>${entry.startTime} - ${entry.endTime}</td>
        <td>${entry.subjectCode}</td>
        <td>${entry.room || '-'}</td>
      </tr>`;
    });

    html += '</tbody></table></div>';
    displayDiv.innerHTML = html;

  } catch (error) {
    displayDiv.innerHTML =
      '<p style="text-align:center;color:#b91c1c;padding:1rem;">Error loading timetable.</p>';
    console.error('Error loading timetable:', error);
  }
};

// When DOM ready, ensure timetable dropdown can load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tt-subject')) {
    loadSubjectsForTimetable();
  }
});

// Initialize students view on load
window.addEventListener('load', () => {
  if (!document.getElementById('auth-section').classList.contains('hidden')) return;
  window.switchViewTab('students');
});

// Show file selected status for student Excel
document.getElementById('student-excel-file').addEventListener('change', (e) => {
  const fileStatus = document.getElementById('file-upload-status');
  const file = e.target.files[0];

  if (!file) {
    fileStatus.textContent = "No file selected.";
    fileStatus.style.color = "#dc2626";
  } else {
    fileStatus.textContent = `File selected: ${file.name}`;
    fileStatus.style.color = "#16a34a";
  }
});

// Function to open timetable generator website
window.openTimetableGenerator = () => {
  // Replace this URL with your actual timetable generator website URL
  const timetableGeneratorURL = 'https://sitetetime.netlify.app/';
  
  // Open in new tab
  window.open(timetableGeneratorURL, '_blank');
  
  // Optional: Show a message
  showMessage('Opening timetable generator in new tab...', 'success');
};