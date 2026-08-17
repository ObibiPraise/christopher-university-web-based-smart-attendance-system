/* ============================================================
   LECTURER VIEWS
   ============================================================ */
   const LecturerViews = (() => {

    function dashboard(user){
      const courses = Store.getCoursesForLecturer(user.id);
      const activeSessions = Store.getActiveSessionsForLecturer(user.id);
  
      let totalSessions = 0, totalCheckins = 0;
      courses.forEach(c => {
        const sessions = Store.getSessionsForCourse(c.id);
        totalSessions += sessions.length;
        totalCheckins += Store.getCheckinsForCourse(c.id).length;
      });
  
      return `
        ${activeSessions.length>0 ? `
          <div class="panel" style="border-color:var(--amber);">
            <div class="panel-header">
              <div class="panel-title"><span class="live-pulse"></span>Live session in progress</div>
            </div>
            <div class="panel-body">
              ${activeSessions.map(s => {
                const course = Store.getCourse(s.courseId);
                return `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                  <div>
                    <strong>${course ? course.code : ''}</strong> — ${course ? course.title : ''}
                    <div style="font-size:12.5px; color:var(--slate); margin-top:2px;">Code: <span class="mono" style="font-weight:700;">${s.code}</span></div>
                  </div>
                  <button class="btn btn-amber btn-sm" data-action="view-session" data-session-id="${s.id}">View live screen</button>
                </div>`;
              }).join('')}
            </div>
          </div>
        ` : ''}
  
        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-card-label">My courses</div>
            <div class="stat-card-value">${courses.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">Sessions held</div>
            <div class="stat-card-value">${totalSessions}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">Total check-ins</div>
            <div class="stat-card-value amber">${totalCheckins}</div>
          </div>
        </div>
  
        <div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">My courses</div>
              <div class="panel-sub">Start a session to generate a sign-in code</div>
            </div>
          </div>
          <div class="panel-body no-pad">
            ${courses.length===0 ? StudentViews.emptyState('No courses assigned','Ask your admin to assign a course to you.') : `
            <table class="ledger">
              <thead><tr><th>Course</th><th>Schedule</th><th>Enrolled</th><th>Avg. attendance</th><th></th></tr></thead>
              <tbody>
                ${courses.map(c => {
                  const enrolled = Store.getEnrolledStudents(c.id);
                  const stat = Store.attendanceRateForCourse(c.id);
                  const pct = stat ? Math.round(stat.rate*100) : null;
                  const hasActive = Store.getActiveSessionForCourse(c.id);
                  return `<tr>
                    <td data-label="Course"><strong>${c.code}</strong> — ${c.title}</td>
                    <td data-label="Schedule" class="mono">${c.schedule}</td>
                    <td data-label="Enrolled">${enrolled.length}</td>
                    <td data-label="Avg. attendance">${pct===null?'—':pct+'%'}</td>
                    <td data-label="">
                      ${hasActive
                        ? `<button class="btn btn-ghost btn-sm" data-action="view-session" data-session-id="${hasActive.id}">View live code</button>`
                        : `<button class="btn btn-amber btn-sm" data-action="start-session" data-course-id="${c.id}">Start session</button>`}
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}
          </div>
        </div>
      `;
    }
  
    function sessionLiveScreen(session, course){
      return `
        <div class="panel">
          <div class="session-stage" id="session-stage" data-session-id="${session.id}">
            <div class="session-meta">
              <div class="session-meta-course">${course.code} — ${course.title}</div>
              <div class="session-meta-sub">Tell students to enter this code to check in</div>
            </div>
  
            <div class="session-ring-wrap">
              <svg class="session-ring" width="220" height="220" viewBox="0 0 220 220">
                <circle class="session-ring-bg" cx="110" cy="110" r="100"></circle>
                <circle class="session-ring-fg" id="session-ring-fg" cx="110" cy="110" r="100"
                  stroke-dasharray="628" stroke-dashoffset="0"></circle>
              </svg>
              <div class="session-ring-center">
                <div class="session-code-text" id="session-code-text">${session.code}</div>
                <div class="session-code-timer" id="session-code-timer">--:--</div>
              </div>
            </div>
  
            <div class="session-checkin-count">
              <span class="live-pulse"></span>
              <span id="session-checkin-count-text">0 students checked in</span>
            </div>
  
            <div class="session-actions">
              <button class="btn btn-ghost" data-action="back-to-dashboard">Back to dashboard</button>
              <button class="btn btn-danger" data-action="end-session" data-session-id="${session.id}">End session now</button>
            </div>
          </div>
        </div>
  
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">Checking in live</div>
          </div>
          <div class="panel-body no-pad">
            <div id="live-checkin-list"></div>
          </div>
        </div>
      `;
    }
  
    function renderLiveCheckinList(session, course){
      const checkins = Store.getCheckinsForSession(session.id).sort((a,b)=>b.timestamp-a.timestamp);
      if(checkins.length===0) return StudentViews.emptyState('Waiting for check-ins','Students who enter the code will show up here in real time.');
      return `
        <table class="ledger">
          <thead><tr><th>Student</th><th>ID</th><th>Time</th></tr></thead>
          <tbody>
            ${checkins.map(ci => {
              const student = Store.getUser(ci.studentId);
              const d = new Date(ci.timestamp);
              return `<tr>
                <td data-label="Student">${student ? student.name : 'Unknown'}</td>
                <td data-label="ID" class="mono">${student ? student.loginId : '—'}</td>
                <td data-label="Time" class="mono">${d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  
    function startSessionModal(course){
      return `
        <div class="modal-overlay" id="start-session-modal">
          <div class="modal-card">
            <div class="modal-header">
              <div class="modal-title">Start a session</div>
              <button class="modal-close" data-action="close-modal">&times;</button>
            </div>
            <div class="modal-body">
              <p style="font-size:13.5px; color:var(--slate); margin-bottom:18px;">
                Generate a one-time code for <strong>${course.code} — ${course.title}</strong>. Students must enter it before the timer runs out.
              </p>
              <label class="field">
                <span class="field-label">Code lifetime</span>
                <select class="select-input" id="session-duration-select">
                  <option value="60">1 minute</option>
                  <option value="120">2 minutes</option>
                  <option value="180" selected>3 minutes</option>
                  <option value="300">5 minutes</option>
                  <option value="600">10 minutes</option>
                </select>
              </label>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
              <button class="btn btn-amber" id="confirm-start-session" data-course-id="${course.id}">Generate code</button>
            </div>
          </div>
        </div>
      `;
    }
  
    function myCourses(user){
      const courses = Store.getCoursesForLecturer(user.id);
      return `
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">My courses</div>
            <div class="panel-sub">${courses.length} assigned</div>
          </div>
          <div class="panel-body no-pad">
            ${courses.length===0 ? StudentViews.emptyState('No courses assigned','Your admin will assign courses to you.') : `
            <table class="ledger">
              <thead><tr><th>Code</th><th>Title</th><th>Schedule</th><th>Enrolled</th></tr></thead>
              <tbody>
                ${courses.map(c => `<tr>
                  <td data-label="Code"><strong>${c.code}</strong></td>
                  <td data-label="Title">${c.title}</td>
                  <td data-label="Schedule" class="mono">${c.schedule}</td>
                  <td data-label="Enrolled">${Store.getEnrolledStudents(c.id).length}</td>
                </tr>`).join('')}
              </tbody>
            </table>`}
          </div>
        </div>
      `;
    }
  
    function courseRoster(user){
      const courses = Store.getCoursesForLecturer(user.id);
      const firstCourseId = courses.length > 0 ? courses[0].id : null;
      const firstSessions = firstCourseId
        ? Store.getSessionsForCourse(firstCourseId).filter(s => s.ended || (Date.now()-s.createdAt) > s.durationSec*1000).sort((a,b)=>b.createdAt-a.createdAt)
        : [];
      return `
        <!-- Panel 1: overall per-student summary -->
        <div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">Attendance by student</div>
              <div class="panel-sub">Overall summary — how many sessions each student attended</div>
            </div>
            <select class="select-input" id="roster-course-select" style="max-width:260px;">
              ${courses.map(c=>`<option value="${c.id}">${c.code} — ${c.title}</option>`).join('')}
            </select>
          </div>
          <div class="panel-body no-pad" id="roster-table-wrap">
            ${firstCourseId ? renderRosterTable(firstCourseId) : StudentViews.emptyState('No courses assigned','Your admin will assign courses to you.')}
          </div>
        </div>
  
        <!-- Panel 2: who came to a specific session -->
        <div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">Who attended a specific session?</div>
              <div class="panel-sub">Pick any past session to see exactly who was present and who was absent</div>
            </div>
            <select class="select-input" id="session-breakdown-select" style="max-width:300px;">
              ${firstSessions.length === 0
                ? '<option value="">No sessions held yet</option>'
                : firstSessions.map(s => {
                    const d = new Date(s.createdAt);
                    const label = d.toLocaleDateString(undefined,{weekday:'short',day:'2-digit',month:'short',year:'numeric'})
                      + ' · ' + d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
                    return `<option value="${s.id}">${label}</option>`;
                  }).join('')}
            </select>
          </div>
          <div class="panel-body no-pad" id="session-breakdown-wrap">
            ${firstSessions.length > 0
              ? renderSessionBreakdown(firstSessions[0].id, firstCourseId)
              : StudentViews.emptyState('No sessions yet','Start a session from your dashboard to begin recording attendance.')}
          </div>
        </div>
      `;
    }
  
    function renderRosterTable(courseId){
      const students = Store.getEnrolledStudents(courseId);
      if(students.length===0) return StudentViews.emptyState('No students enrolled','Ask your admin to enroll students into this course.');
      return `
        <table class="ledger">
          <thead><tr><th>Student</th><th>ID</th><th>Sessions attended</th><th>Rate</th></tr></thead>
          <tbody>
            ${students.map(s => {
              const stat = Store.attendanceRateForStudentInCourse(s.id, courseId);
              const pct = stat ? Math.round(stat.rate*100) : null;
              return `<tr>
                <td data-label="Student">${s.name}</td>
                <td data-label="ID" class="mono">${s.loginId}</td>
                <td data-label="Sessions attended">${stat ? `${stat.attended} / ${stat.total}` : '0 / 0'}</td>
                <td data-label="Rate">${pct===null?'—':`<span class="badge ${pct>=75?'badge-green':(pct>=50?'badge-amber':'badge-red')}">${pct}%</span>`}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  
    function renderSessionBreakdown(sessionId, courseId){
      const students = Store.getEnrolledStudents(courseId);
      const checkins = Store.getCheckinsForSession(sessionId);
      const checkedInIds = new Set(checkins.map(c => c.studentId));
  
      const present = students.filter(s => checkedInIds.has(s.id));
      const absent  = students.filter(s => !checkedInIds.has(s.id));
  
      if(students.length === 0){
        return StudentViews.emptyState('No students enrolled','Ask your admin to enroll students into this course.');
      }
  
      function nameList(arr, badge){
        if(arr.length === 0) return `<div style="padding:16px 22px; font-size:13px; color:var(--slate);">None</div>`;
        return arr.map(s => `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:11px 22px; border-bottom:1px solid var(--hairline);">
            <div>
              <span style="font-weight:600; font-size:14px;">${s.name}</span>
              <span class="mono" style="font-size:12px; color:var(--slate); margin-left:10px;">${s.loginId}</span>
            </div>
            ${badge}
          </div>`).join('');
      }
  
      return `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0; border-top:1px solid var(--hairline);">
  
          <!-- Present column -->
          <div style="border-right:1px solid var(--hairline);">
            <div style="padding:12px 22px; background:var(--green-soft); border-bottom:1px solid var(--hairline); display:flex; align-items:center; gap:8px;">
              <span class="badge badge-green"><span class="badge-dot"></span>Present</span>
              <span style="font-size:12px; color:var(--green); font-weight:600;">${present.length} student${present.length===1?'':'s'}</span>
            </div>
            ${nameList(present, '<span class="badge badge-green"><span class="badge-dot"></span>Present</span>')}
          </div>
  
          <!-- Absent column -->
          <div>
            <div style="padding:12px 22px; background:var(--red-soft); border-bottom:1px solid var(--hairline); display:flex; align-items:center; gap:8px;">
              <span class="badge badge-red"><span class="badge-dot"></span>Absent</span>
              <span style="font-size:12px; color:var(--red); font-weight:600;">${absent.length} student${absent.length===1?'':'s'}</span>
            </div>
            ${nameList(absent, '<span class="badge badge-red"><span class="badge-dot"></span>Absent</span>')}
          </div>
  
        </div>
      `;
    }
  
    function sessionHistory(user){
      const courses = Store.getCoursesForLecturer(user.id);
      let allSessions = [];
      courses.forEach(c => {
        Store.getSessionsForCourse(c.id).forEach(s => allSessions.push({...s, course:c}));
      });
      allSessions.sort((a,b)=>b.createdAt-a.createdAt);
  
      return `
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">Session history</div>
            <div class="panel-sub">${allSessions.length} sessions held</div>
          </div>
          <div class="panel-body no-pad">
            ${allSessions.length===0 ? StudentViews.emptyState('No sessions yet','Start a session from your dashboard to begin recording attendance.') : `
            <table class="ledger">
              <thead><tr><th>Course</th><th>Date</th><th>Time</th><th>Code</th><th>Check-ins</th></tr></thead>
              <tbody>
                ${allSessions.map(s => {
                  const d = new Date(s.createdAt);
                  const count = Store.getCheckinsForSession(s.id).length;
                  const enrolled = Store.getEnrolledStudents(s.courseId).length;
                  return `<tr>
                    <td data-label="Course">${s.course.code}</td>
                    <td data-label="Date">${d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}</td>
                    <td data-label="Time" class="mono">${d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</td>
                    <td data-label="Code" class="mono">${s.code}</td>
                    <td data-label="Check-ins">${count} / ${enrolled}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}
          </div>
        </div>
      `;
    }
  
    return { dashboard, sessionLiveScreen, renderLiveCheckinList, startSessionModal, myCourses, courseRoster, renderRosterTable, renderSessionBreakdown, sessionHistory };
  })();