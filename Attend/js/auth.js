/* ============================================================
   AUTH — login/session handling
   ============================================================ */
   const Auth = (() => {
    const SESSION_KEY = 'register_session_v1';
    let currentUser = null;
  
    function init(){
      try{
        const raw = sessionStorage.getItem(SESSION_KEY);
        if(raw){
          const { userId } = JSON.parse(raw);
          const user = Store.getUser(userId);
          if(user) currentUser = user;
        }
      }catch(e){ /* ignore */ }
    }
  
    function login(loginId, password){
      const user = Store.findUserByLoginId(loginId);
      if(!user) return { ok:false, error:'No account found with that ID.' };
      if(user.password !== password) return { ok:false, error:'Incorrect password.' };
      currentUser = user;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId:user.id }));
      return { ok:true, user };
    }
  
    function logout(){
      currentUser = null;
      sessionStorage.removeItem(SESSION_KEY);
    }
  
    function getCurrentUser(){ return currentUser; }
  
    return { init, login, logout, getCurrentUser };
  })();