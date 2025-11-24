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

    // Clear readonly fields / list
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

    // Student checkboxes
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

    // Faculty checkboxes
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
      return a.startTime.localeCompare(b.startTime);
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

// When DOM ready, ensure timetable dropdown can load (same behavior)
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tt-subject')) {
    loadSubjectsForTimetable();
  }
});

// Initialize students view on load (unchanged)
window.addEventListener('load', () => {
  if (!document.getElementById('auth-section').classList.contains('hidden')) return;
  window.switchViewTab('students');
});
