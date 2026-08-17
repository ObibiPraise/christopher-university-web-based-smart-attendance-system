/* ============================================================
   APP — dashboard controller, routing, event wiring
   Lives only on dashboard.html. Redirects to login.html if no
   active session is found.
   ============================================================ */
   const App = (() => {
    let currentRoute = 'dashboard';
    let sessionTimerInterval = null;
    let liveSessionId = null;
  
    const ROUTES = {
      student: [
        { id:'dashboard', label:'Dashboard', icon: iconHome() },
        { id:'courses', label:'My Courses', icon: iconBook() },
        { id:'history', label:'History', icon: iconClock() },
      ],
      lecturer: [
        { id:'dashboard', label:'Dashboard', icon: iconHome() },
        { id:'courses', label:'My Courses', icon: iconBook() },
        { id:'roster', label:'Roster & History', icon: iconUsers() },
        { id:'sessions', label:'Session History', icon: iconClock() },
      ],
      admin: [
        { id:'dashboard', label:'Overview', icon: iconHome() },
        { id:'users', label:'Users', icon: iconUsers() },
        { id:'courses', label:'Courses', icon: iconBook() },
      ],
    };
  
    const TITLES = {
      dashboard:'Dashboard', courses:'My Courses', history:'Attendance History',
      roster:'Roster & History', sessions:'Session History', users:'Manage Users',
      'live-session':'Live Session'
    };
  
    function init(){
      Store.seedIfEmpty();
      Auth.init();
  
      const user = Auth.getCurrentUser();
      if(!user){
        // No active session — bounce back to the login page.
        window.location.href = 'login.html';
        return;
      }
  
      enterApp(user);
      document.getElementById('topbar-date').textContent = new Date().toLocaleDateString(undefined,{weekday:'long', day:'numeric', month:'long', year:'numeric'});
    }
  
    /* ---------------- APP SHELL ---------------- */
    function enterApp(user){
      document.getElementById('sidebar-user-name').textContent = user.name;
      document.getElementById('sidebar-user-role').textContent = user.role;
      document.getElementById('sidebar-user-avatar').textContent = initials(user.name);
  
      renderNav(user);
      currentRoute = 'dashboard';
      renderView(user);
      wireShellEvents(user);
    }
  
    function initials(name){
      return name.split(' ').filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase();
    }
  
    function renderNav(user){
      const nav = document.getElementById('sidebar-nav');
      const items = ROUTES[user.role];
      nav.innerHTML = items.map(item => `
        <button class="nav-item ${item.id===currentRoute?'active':''}" data-route="${item.id}">
          ${item.icon}<span>${item.label}</span>
        </button>
      `).join('');
      nav.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
          stopSessionTimer();
          currentRoute = btn.dataset.route;
          renderView(user);
          nav.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          document.querySelector('.sidebar')?.classList.remove('open');
        });
      });
    }
  
    function wireShellEvents(user){
      document.getElementById('logout-btn').onclick = () => {
        stopSessionTimer();
        Auth.logout();
        window.location.href = 'login.html';
      };
  
      document.getElementById('mobile-nav-toggle').onclick = () => {
        document.querySelector('.sidebar').classList.toggle('open');
      };
  
      // Delegated handlers on document so they also catch clicks/submits inside
      // modals, which are appended to document.body (outside #view-container).
      document.addEventListener('click', (e) => handleViewClick(e, Auth.getCurrentUser() || user));
      document.addEventListener('submit', (e) => handleViewSubmit(e, Auth.getCurrentUser() || user));
      document.addEventListener('change', (e) => handleViewChange(e, Auth.getCurrentUser() || user));
    }
  
    /* ---------------- ROUTING / RENDER ---------------- */
    function renderView(user){
      document.getElementById('page-title').textContent = TITLES[currentRoute] || 'Dashboard';
      const container = document.getElementById('view-container');
  
      if(user.role === 'student'){
        if(currentRoute==='dashboard') container.innerHTML = StudentViews.dashboard(user);
        else if(currentRoute==='courses') container.innerHTML = StudentViews.myCourses(user);
        else if(currentRoute==='history') container.innerHTML = StudentViews.history(user);
      } else if(user.role === 'lecturer'){
        if(currentRoute==='dashboard') container.innerHTML = LecturerViews.dashboard(user);
        else if(currentRoute==='courses') container.innerHTML = LecturerViews.myCourses(user);
        else if(currentRoute==='roster') container.innerHTML = LecturerViews.courseRoster(user);
        else if(currentRoute==='sessions') container.innerHTML = LecturerViews.sessionHistory(user);
        else if(currentRoute==='live-session') renderLiveSession(user, liveSessionId);
      } else if(user.role === 'admin'){
        if(currentRoute==='dashboard') container.innerHTML = AdminViews.dashboard();
        else if(currentRoute==='users') container.innerHTML = AdminViews.userManagement();
        else if(currentRoute==='courses') container.innerHTML = AdminViews.courseManagement();
      }
    }
  
    function renderLiveSession(user, sessionId){
      const session = Store.getSession(sessionId);
      if(!session){ currentRoute='dashboard'; renderView(user); return; }
      const course = Store.getCourse(session.courseId);
      document.getElementById('page-title').textContent = 'Live Session';
      document.getElementById('view-container').innerHTML = LecturerViews.sessionLiveScreen(session, course);
      startSessionTimer(session, course, user);
    }
  
    /* ---------------- LIVE SESSION TIMER ---------------- */
    function startSessionTimer(session, course, user){
      stopSessionTimer();
      const ringFg = document.getElementById('session-ring-fg');
      const timerText = document.getElementById('session-code-timer');
      const countText = document.getElementById('session-checkin-count-text');
      const circumference = 628; // 2*pi*100, matches stroke-dasharray
      const listWrap = document.getElementById('live-checkin-list');
  
      function tick(){
        const elapsed = (Date.now() - session.createdAt) / 1000;
        const remaining = Math.max(0, session.durationSec - elapsed);
        const pct = remaining / session.durationSec;
  
        if(ringFg) ringFg.style.strokeDashoffset = String(circumference * (1-pct));
        if(timerText){
          const m = Math.floor(remaining/60);
          const s = Math.floor(remaining%60);
          timerText.textContent = `${m}:${String(s).padStart(2,'0')} remaining`;
        }
        const checkins = Store.getCheckinsForSession(session.id);
        if(countText) countText.textContent = `${checkins.length} student${checkins.length===1?'':'s'} checked in`;
        if(listWrap) listWrap.innerHTML = LecturerViews.renderLiveCheckinList(session, course);
  
        if(remaining <= 0 || session.ended){
          Store.endSession(session.id);
          stopSessionTimer();
          if(timerText) timerText.textContent = 'Session ended';
          showToast(`Session ended — ${checkins.length} check-in${checkins.length===1?'':'s'} recorded.`, 'success');
        }
      }
      tick();
      sessionTimerInterval = setInterval(tick, 1000);
    }
  
    function stopSessionTimer(){
      if(sessionTimerInterval){ clearInterval(sessionTimerInterval); sessionTimerInterval = null; }
    }
  
    /* ---------------- EVENT HANDLERS (delegated) ---------------- */
    function handleViewClick(e, user){
      const actionEl = e.target.closest('[data-action]');
      if(!actionEl) return;
      const action = actionEl.dataset.action;
  
      if(action === 'start-session'){
        const courseId = actionEl.dataset.courseId;
        const course = Store.getCourse(courseId);
        openModal(LecturerViews.startSessionModal(course));
      }
      else if(action === 'close-modal'){
        closeModal();
      }
      else if(action === 'view-session'){
        liveSessionId = actionEl.dataset.sessionId;
        currentRoute = 'live-session';
        renderLiveSession(user, liveSessionId);
      }
      else if(action === 'back-to-dashboard'){
        stopSessionTimer();
        currentRoute = 'dashboard';
        renderView(user);
        document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.route==='dashboard'));
      }
      else if(action === 'end-session'){
        const sessionId = actionEl.dataset.sessionId;
        Store.endSession(sessionId);
        stopSessionTimer();
        showToast('Session ended manually.', 'success');
        currentRoute = 'dashboard';
        renderView(user);
        document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.route==='dashboard'));
      }
      else if(action === 'open-add-user'){
        openModal(AdminViews.addUserModal(actionEl.dataset.role));
      }
      else if(action === 'delete-user'){
        const userId = actionEl.dataset.userId;
        const target = Store.getUser(userId);
        if(confirm(`Remove ${target ? target.name : 'this user'}? This cannot be undone.`)){
          Store.deleteUser(userId);
          showToast('User removed.', 'success');
          renderView(user);
        }
      }
      else if(action === 'open-add-course'){
        openModal(AdminViews.addCourseModal());
      }
      else if(action === 'delete-course'){
        const courseId = actionEl.dataset.courseId;
        const target = Store.getCourse(courseId);
        if(confirm(`Delete ${target ? target.code : 'this course'}? All session and attendance data for it will be removed.`)){
          Store.deleteCourse(courseId);
          showToast('Course deleted.', 'success');
          renderView(user);
        }
      }
      else if(action === 'manage-enrollment'){
        openModal(AdminViews.enrollmentModal(actionEl.dataset.courseId));
      }
    }
  
    function handleViewSubmit(e, user){
      if(e.target.id === 'join-code-form'){
        e.preventDefault();
        const input = document.getElementById('join-code-input');
        const code = input.value.trim().toUpperCase();
        const feedback = document.getElementById('join-code-feedback');
        if(!code){ return; }
  
        const session = Store.findSessionByCode(code);
        if(!session){
          feedback.innerHTML = `<div class="field-error">That code is invalid or has expired. Ask your lecturer for the current code.</div>`;
          return;
        }
        const course = Store.getCourse(session.courseId);
        const isEnrolled = Store.getCoursesForStudent(user.id).some(c=>c.id===session.courseId);
        if(!isEnrolled){
          feedback.innerHTML = `<div class="field-error">You're not enrolled in ${course ? course.code : 'this course'}, so this code can't be used.</div>`;
          return;
        }
        const result = Store.recordCheckin(session.id, user.id, session.courseId);
        if(!result.ok){
          feedback.innerHTML = `<div class="badge badge-amber" style="padding:10px 14px; font-size:13px;">You've already checked in to this session.</div>`;
        } else {
          feedback.innerHTML = `<div class="badge badge-green" style="padding:10px 14px; font-size:13px;"><span class="badge-dot"></span>Checked in to ${course.code} — ${course.title}</div>`;
          showToast('Attendance recorded.', 'success');
          setTimeout(() => renderView(user), 900);
        }
        input.value = '';
      }
      else if(e.target.id === 'add-user-form'){
        e.preventDefault();
        const role = document.getElementById('add-user-role').value;
        const name = document.getElementById('add-user-name').value.trim();
        const loginId = document.getElementById('add-user-loginid').value.trim();
        const password = document.getElementById('add-user-password').value.trim();
        const errEl = document.getElementById('add-user-error');
  
        if(Store.findUserByLoginId(loginId)){
          errEl.textContent = 'That login ID is already taken.';
          errEl.hidden = false;
          return;
        }
        const newUser = { name, loginId, password, role };
        if(role === 'student'){
          newUser.level = parseInt(document.getElementById('add-user-level').value, 10);
        } else {
          newUser.dept = document.getElementById('add-user-dept').value.trim();
        }
        Store.addUser(newUser);
        closeModal();
        showToast(`${role.charAt(0).toUpperCase()+role.slice(1)} account created.`, 'success');
        renderView(user);
      }
      else if(e.target.id === 'add-course-form'){
        e.preventDefault();
        const code = document.getElementById('add-course-code').value.trim().toUpperCase();
        const title = document.getElementById('add-course-title').value.trim();
        const schedule = document.getElementById('add-course-schedule').value.trim();
        const lecturerId = document.getElementById('add-course-lecturer').value;
        const errEl = document.getElementById('add-course-error');
  
        if(Store.getCourses().some(c=>c.code.toUpperCase()===code)){
          errEl.textContent = 'A course with that code already exists.';
          errEl.hidden = false;
          return;
        }
        if(!lecturerId){
          errEl.textContent = 'Please select a lecturer.';
          errEl.hidden = false;
          return;
        }
        Store.addCourse({ code, title, schedule, lecturerId });
        closeModal();
        showToast('Course created.', 'success');
        renderView(user);
      }
    }
  
    function handleViewChange(e, user){
      if(e.target.id === 'history-course-filter'){
        const courseId = e.target.value;
        const all = Store.getCheckinsForStudent(user.id).sort((a,b)=>b.timestamp-a.timestamp);
        const filtered = courseId ? all.filter(c=>c.courseId===courseId) : all;
        document.getElementById('history-table-wrap').innerHTML = StudentViews.renderHistoryTable(filtered);
      }
      else if(e.target.id === 'roster-course-select'){
        const courseId = e.target.value;
        // Refresh the per-student summary table
        document.getElementById('roster-table-wrap').innerHTML = LecturerViews.renderRosterTable(courseId);
  
        // Rebuild the session dropdown for the newly selected course
        const sessions = Store.getSessionsForCourse(courseId)
          .filter(s => s.ended || (Date.now()-s.createdAt) > s.durationSec*1000)
          .sort((a,b) => b.createdAt - a.createdAt);
  
        const sessionSelect = document.getElementById('session-breakdown-select');
        if(sessionSelect){
          sessionSelect.innerHTML = sessions.length === 0
            ? '<option value="">No sessions held yet</option>'
            : sessions.map(s => {
                const d = new Date(s.createdAt);
                const label = d.toLocaleDateString(undefined,{weekday:'short',day:'2-digit',month:'short',year:'numeric'})
                  + ' · ' + d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
                return `<option value="${s.id}">${label}</option>`;
              }).join('');
  
          // Refresh the breakdown for the first session of the new course
          const breakdownWrap = document.getElementById('session-breakdown-wrap');
          if(breakdownWrap){
            breakdownWrap.innerHTML = sessions.length > 0
              ? LecturerViews.renderSessionBreakdown(sessions[0].id, courseId)
              : StudentViews.emptyState('No sessions yet','Start a session from your dashboard to begin recording attendance.');
          }
        }
      }
      else if(e.target.id === 'session-breakdown-select'){
        const sessionId = e.target.value;
        if(!sessionId) return;
        // Find the courseId from the selected session
        const session = Store.getSession(sessionId);
        if(!session) return;
        const breakdownWrap = document.getElementById('session-breakdown-wrap');
        if(breakdownWrap){
          breakdownWrap.innerHTML = LecturerViews.renderSessionBreakdown(sessionId, session.courseId);
        }
      }
      else if(e.target.classList.contains('enroll-checkbox')){
        const studentId = e.target.dataset.studentId;
        const courseId = e.target.dataset.courseId;
        Store.setEnrollment(courseId, studentId, e.target.checked);
      }
    }
  
    function openModal(html){
      closeModal();
      const wrap = document.createElement('div');
      wrap.id = 'modal-root';
      wrap.innerHTML = html;
      document.body.appendChild(wrap);
  
      const confirmStart = wrap.querySelector('#confirm-start-session');
      if(confirmStart){
        confirmStart.addEventListener('click', () => {
          const courseId = confirmStart.dataset.courseId;
          const duration = parseInt(document.getElementById('session-duration-select').value, 10);
          const user = Auth.getCurrentUser();
          const session = Store.createSession(courseId, user.id, duration);
          closeModal();
          liveSessionId = session.id;
          currentRoute = 'live-session';
          renderLiveSession(user, liveSessionId);
        });
      }
  
      wrap.querySelector('.modal-overlay')?.addEventListener('click', (e) => {
        if(e.target.classList.contains('modal-overlay')) closeModal();
      });
    }
  
    function closeModal(){
      const existing = document.getElementById('modal-root');
      if(existing) existing.remove();
    }
  
    /* ---------------- TOAST ---------------- */
    let toastTimeout = null;
    function showToast(msg, type){
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.className = 'toast' + (type ? ' '+type : '');
      toast.hidden = false;
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => { toast.hidden = true; }, 3200);
    }
  
    /* ---------------- ICONS ---------------- */
    function iconHome(){ return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>`; }
    function iconBook(){ return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`; }
    function iconClock(){ return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`; }
    function iconUsers(){ return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`; }
  
    return { init };
  })();
  
  document.addEventListener('DOMContentLoaded', App.init);