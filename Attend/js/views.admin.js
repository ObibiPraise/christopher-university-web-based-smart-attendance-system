/* ============================================================
   ADMIN VIEWS
   ============================================================ */
   const AdminViews = (() => {

    function dashboard(){
      const students = Store.getStudents();
      const lecturers = Store.getLecturers();
      const courses = Store.getCourses();
      const raw = Store._raw();
  
      const today = new Date(); today.setHours(0,0,0,0);
      const sessionsToday = raw.sessions.filter(s => s.createdAt >= today.getTime()).length;
  
      let overallTotal = 0, overallPresent = 0;
      courses.forEach(c => {
        const stat = Store.attendanceRateForCourse(c.id);
        if(stat){ overallTotal += stat.sessions * stat.students; overallPresent += Math.round(stat.rate * stat.sessions * stat.students); }
      });
      const overallRate = overallTotal>0 ? Math.round((overallPresent/overallTotal)*100) : null;
  
      return `
        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-card-label">Students</div>
            <div class="stat-card-value">${students.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">Lecturers</div>
            <div class="stat-card-value">${lecturers.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">Courses</div>
            <div class="stat-card-value">${courses.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">Sessions today</div>
            <div class="stat-card-value amber">${sessionsToday}</div>
          </div>
        </div>
  
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">University-wide attendance</div>
            <div class="panel-sub">${overallRate===null?'No sessions recorded yet':'Across all courses, all-time'}</div>
          </div>
          <div class="panel-body no-pad">
            <table class="ledger">
              <thead><tr><th>Course</th><th>Lecturer</th><th>Enrolled</th><th>Sessions</th><th>Attendance rate</th></tr></thead>
              <tbody>
                ${courses.length===0 ? '' : courses.map(c => {
                  const lecturer = Store.getUser(c.lecturerId);
                  const stat = Store.attendanceRateForCourse(c.id);
                  const pct = stat ? Math.round(stat.rate*100) : null;
                  return `<tr>
                    <td data-label="Course"><strong>${c.code}</strong> — ${c.title}</td>
                    <td data-label="Lecturer">${lecturer ? lecturer.name : '—'}</td>
                    <td data-label="Enrolled">${Store.getEnrolledStudents(c.id).length}</td>
                    <td data-label="Sessions">${stat ? stat.sessions : 0}</td>
                    <td data-label="Attendance rate">${pct===null?'—':`<span class="badge ${pct>=75?'badge-green':(pct>=50?'badge-amber':'badge-red')}">${pct}%</span>`}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
            ${courses.length===0 ? StudentViews.emptyState('No courses yet','Create a course to start tracking attendance.') : ''}
          </div>
        </div>
      `;
    }
  
    function userManagement(){
      const students = Store.getStudents();
      const lecturers = Store.getLecturers();
      return `
        <div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">Lecturers</div>
              <div class="panel-sub">${lecturers.length} accounts</div>
            </div>
            <button class="btn btn-amber btn-sm" data-action="open-add-user" data-role="lecturer">+ Add lecturer</button>
          </div>
          <div class="panel-body no-pad">
            ${lecturers.length===0 ? StudentViews.emptyState('No lecturers yet','Add a lecturer account to assign courses.') : `
            <table class="ledger">
              <thead><tr><th>Name</th><th>Login ID</th><th>Department</th><th>Courses</th><th></th></tr></thead>
              <tbody>
                ${lecturers.map(l => `<tr>
                  <td data-label="Name">${l.name}</td>
                  <td data-label="Login ID" class="mono">${l.loginId}</td>
                  <td data-label="Department">${l.dept||'—'}</td>
                  <td data-label="Courses">${Store.getCoursesForLecturer(l.id).length}</td>
                  <td data-label=""><button class="btn btn-danger btn-sm" data-action="delete-user" data-user-id="${l.id}">Remove</button></td>
                </tr>`).join('')}
              </tbody>
            </table>`}
          </div>
        </div>
  
        <div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">Students</div>
              <div class="panel-sub">${students.length} accounts</div>
            </div>
            <button class="btn btn-amber btn-sm" data-action="open-add-user" data-role="student">+ Add student</button>
          </div>
          <div class="panel-body no-pad">
            ${students.length===0 ? StudentViews.emptyState('No students yet','Add a student account to enroll them in courses.') : `
            <table class="ledger">
              <thead><tr><th>Name</th><th>Login ID</th><th>Level</th><th>Courses</th><th></th></tr></thead>
              <tbody>
                ${students.map(s => `<tr>
                  <td data-label="Name">${s.name}</td>
                  <td data-label="Login ID" class="mono">${s.loginId}</td>
                  <td data-label="Level">${s.level||'—'}</td>
                  <td data-label="Courses">${Store.getCoursesForStudent(s.id).length}</td>
                  <td data-label=""><button class="btn btn-danger btn-sm" data-action="delete-user" data-user-id="${s.id}">Remove</button></td>
                </tr>`).join('')}
              </tbody>
            </table>`}
          </div>
        </div>
      `;
    }
  
    function addUserModal(role){
      const isStudent = role === 'student';
      return `
        <div class="modal-overlay" id="add-user-modal">
          <div class="modal-card">
            <div class="modal-header">
              <div class="modal-title">Add ${role}</div>
              <button class="modal-close" data-action="close-modal">&times;</button>
            </div>
            <form id="add-user-form">
              <div class="modal-body">
                <input type="hidden" id="add-user-role" value="${role}">
                <label class="field">
                  <span class="field-label">Full name</span>
                  <input type="text" id="add-user-name" class="field-input" placeholder="e.g. Chinwe Okoro" required>
                </label>
                <label class="field">
                  <span class="field-label">Login ID</span>
                  <input type="text" id="add-user-loginid" class="field-input mono" placeholder="${isStudent?'e.g. STU016':'e.g. LEC003'}" required>
                </label>
                <label class="field">
                  <span class="field-label">Temporary password</span>
                  <input type="text" id="add-user-password" class="field-input mono" placeholder="${isStudent?'student123':'lecturer123'}" required>
                </label>
                ${isStudent ? `
                <label class="field">
                  <span class="field-label">Level</span>
                  <select class="select-input" id="add-user-level">
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="300">300</option>
                    <option value="400">400</option>
                  </select>
                </label>` : `
                <label class="field">
                  <span class="field-label">Department</span>
                  <input type="text" id="add-user-dept" class="field-input" placeholder="e.g. Computer Science">
                </label>`}
                <div id="add-user-error" class="field-error" hidden></div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-amber">Create account</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }
  
    function courseManagement(){
      const courses = Store.getCourses();
      const lecturers = Store.getLecturers();
      return `
        <div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">Courses</div>
              <div class="panel-sub">${courses.length} courses</div>
            </div>
            <button class="btn btn-amber btn-sm" data-action="open-add-course" ${lecturers.length===0?'disabled title="Add a lecturer first"':''}>+ Add course</button>
          </div>
          <div class="panel-body no-pad">
            ${courses.length===0 ? StudentViews.emptyState('No courses yet','Create a course and assign it to a lecturer.') : `
            <table class="ledger">
              <thead><tr><th>Code</th><th>Title</th><th>Lecturer</th><th>Schedule</th><th>Enrolled</th><th></th></tr></thead>
              <tbody>
                ${courses.map(c => {
                  const lecturer = Store.getUser(c.lecturerId);
                  return `<tr>
                    <td data-label="Code"><strong>${c.code}</strong></td>
                    <td data-label="Title">${c.title}</td>
                    <td data-label="Lecturer">${lecturer ? lecturer.name : '—'}</td>
                    <td data-label="Schedule" class="mono">${c.schedule}</td>
                    <td data-label="Enrolled">${Store.getEnrolledStudents(c.id).length}</td>
                    <td data-label="">
                      <div style="display:flex; gap:6px;">
                        <button class="btn btn-ghost btn-sm" data-action="manage-enrollment" data-course-id="${c.id}">Enroll</button>
                        <button class="btn btn-danger btn-sm" data-action="delete-course" data-course-id="${c.id}">Delete</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}
          </div>
        </div>
      `;
    }
  
    function addCourseModal(){
      const lecturers = Store.getLecturers();
      return `
        <div class="modal-overlay" id="add-course-modal">
          <div class="modal-card">
            <div class="modal-header">
              <div class="modal-title">Add course</div>
              <button class="modal-close" data-action="close-modal">&times;</button>
            </div>
            <form id="add-course-form">
              <div class="modal-body">
                <div class="form-grid">
                  <label class="field">
                    <span class="field-label">Course code</span>
                    <input type="text" id="add-course-code" class="field-input mono" placeholder="e.g. CSC315" required>
                  </label>
                  <label class="field">
                    <span class="field-label">Schedule</span>
                    <input type="text" id="add-course-schedule" class="field-input" placeholder="e.g. Mon, 12:00" required>
                  </label>
                </div>
                <label class="field">
                  <span class="field-label">Course title</span>
                  <input type="text" id="add-course-title" class="field-input" placeholder="e.g. Operating Systems" required>
                </label>
                <label class="field">
                  <span class="field-label">Lecturer</span>
                  <select class="select-input" id="add-course-lecturer" required>
                    <option value="" disabled selected>Select a lecturer</option>
                    ${lecturers.map(l=>`<option value="${l.id}">${l.name}</option>`).join('')}
                  </select>
                </label>
                <div id="add-course-error" class="field-error" hidden></div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-amber">Create course</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }
  
    function enrollmentModal(courseId){
      const course = Store.getCourse(courseId);
      const allStudents = Store.getStudents();
      const enrolledIds = Store.getEnrolledStudents(courseId).map(s=>s.id);
      return `
        <div class="modal-overlay" id="enrollment-modal">
          <div class="modal-card" style="max-width:520px;">
            <div class="modal-header">
              <div class="modal-title">Enroll students — ${course.code}</div>
              <button class="modal-close" data-action="close-modal">&times;</button>
            </div>
            <div class="modal-body" style="max-height:50vh; overflow-y:auto;">
              ${allStudents.length===0 ? StudentViews.emptyState('No students yet','Add student accounts first.') : allStudents.map(s => `
                <label style="display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid var(--hairline); cursor:pointer;">
                  <input type="checkbox" class="enroll-checkbox" data-student-id="${s.id}" data-course-id="${courseId}" ${enrolledIds.includes(s.id)?'checked':''} style="width:16px; height:16px;">
                  <span style="font-size:14px;">${s.name}</span>
                  <span class="mono" style="font-size:12px; color:var(--slate); margin-left:auto;">${s.loginId}</span>
                </label>
              `).join('')}
            </div>
            <div class="modal-footer">
              <button class="btn btn-amber" data-action="close-modal">Done</button>
            </div>
          </div>
        </div>
      `;
    }
  
    return { dashboard, userManagement, addUserModal, courseManagement, addCourseModal, enrollmentModal };
  })();