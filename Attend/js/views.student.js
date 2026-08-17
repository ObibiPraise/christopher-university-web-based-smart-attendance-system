/* ============================================================
   STUDENT VIEWS
   ============================================================ */
   const StudentViews = (() => {

    function dashboard(user){
      const courses = Store.getCoursesForStudent(user.id);
      const checkins = Store.getCheckinsForStudent(user.id);
  
      let totalSessions = 0, totalAttended = 0;
      courses.forEach(c => {
        const stat = Store.attendanceRateForStudentInCourse(user.id, c.id);
        if(stat){ totalSessions += stat.total; totalAttended += stat.attended; }
      });
      const overallRate = totalSessions>0 ? Math.round((totalAttended/totalSessions)*100) : null;
  
      const recentCheckins = checkins.sort((a,b)=>b.timestamp-a.timestamp).slice(0,5);
  
      return `
        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-card-label">Overall attendance</div>
            <div class="stat-card-value ${overallRate===null?'':(overallRate>=75?'green':'red')}">${overallRate===null?'—':overallRate+'%'}</div>
            <div class="stat-card-sub">${totalAttended} of ${totalSessions} sessions attended</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">Enrolled courses</div>
            <div class="stat-card-value">${courses.length}</div>
            <div class="stat-card-sub">this semester</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">Courses below 75%</div>
            <div class="stat-card-value ${courses.filter(c=>{const s=Store.attendanceRateForStudentInCourse(user.id,c.id); return s && s.rate<0.75;}).length>0?'red':'green'}">
              ${courses.filter(c=>{const s=Store.attendanceRateForStudentInCourse(user.id,c.id); return s && s.rate<0.75;}).length}
            </div>
            <div class="stat-card-sub">attendance risk</div>
          </div>
        </div>
  
        <div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">Got a session code?</div>
              <div class="panel-sub">Enter the 6-character code your lecturer shared in class.</div>
            </div>
          </div>
          <div class="panel-body">
            ${joinCodeForm()}
          </div>
        </div>
  
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">My courses</div>
            <div class="panel-sub">Attendance by course</div>
          </div>
          <div class="panel-body no-pad">
            ${courses.length === 0 ? emptyState('No courses yet','Once your admin enrolls you in a course, it will appear here.') : `
            <table class="ledger">
              <thead><tr><th>Course</th><th>Schedule</th><th>Attendance</th><th></th></tr></thead>
              <tbody>
                ${courses.map(c => {
                  const stat = Store.attendanceRateForStudentInCourse(user.id, c.id);
                  const pct = stat ? Math.round(stat.rate*100) : null;
                  return `<tr>
                    <td data-label="Course"><strong>${c.code}</strong> — ${c.title}</td>
                    <td data-label="Schedule" class="mono">${c.schedule}</td>
                    <td data-label="Attendance">
                      ${pct===null ? '<span class="badge badge-slate">No sessions yet</span>' : `
                        <div style="display:flex;align-items:center;gap:10px;min-width:140px;">
                          <div class="progress-track" style="flex:1;"><div class="progress-fill ${pct>=75?'':(pct>=50?'amber':'red')}" style="width:${pct}%;"></div></div>
                          <span style="font-weight:600;font-size:12.5px;">${pct}%</span>
                        </div>
                      `}
                    </td>
                    <td data-label=""></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}
          </div>
        </div>
  
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">Recent check-ins</div>
          </div>
          <div class="panel-body no-pad">
            ${recentCheckins.length===0 ? emptyState('No check-ins yet','Your attendance history will show up here once you check in to a session.') : `
            <table class="ledger">
              <thead><tr><th>Course</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
              <tbody>
                ${recentCheckins.map(ci => {
                  const course = Store.getCourse(ci.courseId);
                  const d = new Date(ci.timestamp);
                  return `<tr>
                    <td data-label="Course">${course ? course.code : '—'}</td>
                    <td data-label="Date">${d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}</td>
                    <td data-label="Time" class="mono">${d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</td>
                    <td data-label="Status"><span class="badge badge-green"><span class="badge-dot"></span>Present</span></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}
          </div>
        </div>
      `;
    }
  
    function joinCodeForm(){
      return `
        <form id="join-code-form" style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
          <label class="field" style="flex:1; min-width:200px; margin-bottom:0;">
            <span class="field-label">Session code</span>
            <input type="text" id="join-code-input" class="field-input mono" style="font-family:var(--font-mono); letter-spacing:0.1em; text-transform:uppercase;" maxlength="6" placeholder="A1B2C3" autocomplete="off">
          </label>
          <button type="submit" class="btn btn-amber">Check in</button>
        </form>
        <div id="join-code-feedback" style="margin-top:14px;"></div>
      `;
    }
  
    function myCourses(user){
      const courses = Store.getCoursesForStudent(user.id);
      return `
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">My courses</div>
            <div class="panel-sub">${courses.length} enrolled</div>
          </div>
          <div class="panel-body no-pad">
            ${courses.length===0 ? emptyState('No courses yet','Ask your admin to enroll you in a course.') : `
            <table class="ledger">
              <thead><tr><th>Code</th><th>Title</th><th>Schedule</th></tr></thead>
              <tbody>
                ${courses.map(c => `<tr>
                  <td data-label="Code"><strong>${c.code}</strong></td>
                  <td data-label="Title">${c.title}</td>
                  <td data-label="Schedule" class="mono">${c.schedule}</td>
                </tr>`).join('')}
              </tbody>
            </table>`}
          </div>
        </div>
      `;
    }
  
    function history(user){
      const courses = Store.getCoursesForStudent(user.id);
      const checkins = Store.getCheckinsForStudent(user.id).sort((a,b)=>b.timestamp-a.timestamp);
  
      return `
        <div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">Attendance history</div>
              <div class="panel-sub">Every session you've checked into</div>
            </div>
            <select class="select-input" id="history-course-filter" style="max-width:220px;">
              <option value="">All courses</option>
              ${courses.map(c=>`<option value="${c.id}">${c.code}</option>`).join('')}
            </select>
          </div>
          <div class="panel-body no-pad">
            <div id="history-table-wrap">
              ${renderHistoryTable(checkins)}
            </div>
          </div>
        </div>
      `;
    }
  
    function renderHistoryTable(checkins){
      if(checkins.length===0) return emptyState('No history yet','Check in to a live session to start building your record.');
      return `
        <table class="ledger">
          <thead><tr><th>Course</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            ${checkins.map(ci => {
              const course = Store.getCourse(ci.courseId);
              const d = new Date(ci.timestamp);
              return `<tr data-course="${ci.courseId}">
                <td data-label="Course">${course ? course.code+' — '+course.title : '—'}</td>
                <td data-label="Date">${d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}</td>
                <td data-label="Time" class="mono">${d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</td>
                <td data-label="Status"><span class="badge badge-green"><span class="badge-dot"></span>Present</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  
    function emptyState(title, text){
      return `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </div>
          <div class="empty-state-title">${title}</div>
          <div class="empty-state-text">${text}</div>
        </div>
      `;
    }
  
    return { dashboard, myCourses, history, renderHistoryTable, emptyState };
  })();