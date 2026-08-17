/* ============================================================
   LOGIN PAGE CONTROLLER
   Lives only on login.html. On success, redirects to dashboard.html.
   ============================================================ */
   (() => {
    function init(){
      Store.seedIfEmpty();
      Auth.init();
  
      // If already logged in (e.g. user manually navigated back to login.html),
      // send them straight to the dashboard instead of showing the form again.
      if(Auth.getCurrentUser()){
        window.location.href = 'dashboard.html';
        return;
      }
  
      wireAuthScreen();
    }
  
    function wireAuthScreen(){
      const tabs = document.querySelectorAll('.auth-tab');
      const idLabel = document.getElementById('id-field-label');
      const idInput = document.getElementById('login-id');
      const titleEl = document.getElementById('auth-title');
      const subEl = document.getElementById('auth-subtitle');
      const demoEl = document.getElementById('demo-credentials');
  
      const roleCopy = {
        student: { title:'Sign in as a student', sub:'Use your university ID to access your attendance record.', label:'Matric number', placeholder:'e.g. STU001', demo:'Demo: STU001 / student123' },
        lecturer: { title:'Sign in as a lecturer', sub:'Manage your courses and start attendance sessions.', label:'Staff ID', placeholder:'e.g. LEC001', demo:'Demo: LEC001 / lecturer123' },
        admin: { title:'Sign in as an admin', sub:'Manage users, courses, and university-wide records.', label:'Admin ID', placeholder:'e.g. ADMIN001', demo:'Demo: ADMIN001 / admin123' },
      };
  
      let selectedRole = 'student';
  
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t=>t.classList.remove('active'));
          tab.classList.add('active');
          selectedRole = tab.dataset.role;
          const copy = roleCopy[selectedRole];
          titleEl.textContent = copy.title;
          subEl.textContent = copy.sub;
          idLabel.textContent = copy.label;
          idInput.placeholder = copy.placeholder;
          demoEl.textContent = copy.demo;
          hideLoginError();
        });
      });
  
      document.getElementById('login-form').addEventListener('submit', e => {
        e.preventDefault();
        const id = document.getElementById('login-id').value.trim();
        const pw = document.getElementById('login-password').value;
        if(!id || !pw) return;
  
        const result = Auth.login(id, pw);
        if(!result.ok){
          showLoginError(result.error);
          return;
        }
        if(result.user.role !== selectedRole){
          showLoginError(`That ID belongs to a ${result.user.role} account. Switch tabs to sign in.`);
          Auth.logout();
          return;
        }
  
        // Success — hand off to the dashboard page.
        window.location.href = 'dashboard.html';
      });
  
      document.getElementById('seed-link').addEventListener('click', () => {
        Store.resetAll();
        showToast('Demo data loaded. Try STU001 / student123.', 'success');
      });
    }
  
    function showLoginError(msg){
      const el = document.getElementById('login-error');
      el.textContent = msg;
      el.hidden = false;
    }
    function hideLoginError(){
      document.getElementById('login-error').hidden = true;
    }
  
    let toastTimeout = null;
    function showToast(msg, type){
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.className = 'toast' + (type ? ' '+type : '');
      toast.hidden = false;
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => { toast.hidden = true; }, 3200);
    }
  
    document.addEventListener('DOMContentLoaded', init);
  })();