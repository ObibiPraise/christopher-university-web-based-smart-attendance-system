/* ============================================================
   STORE — persistence layer (localStorage backed)
   ============================================================ */
   const Store = (() => {
    const KEY = 'register_attendance_db_v1';
  
    function uid(prefix){
      return prefix + '_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4);
    }
  
    function genSessionCode(){
      // unambiguous chars only
      const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
      let code = '';
      for(let i=0;i<6;i++) code += chars[Math.floor(Math.random()*chars.length)];
      return code;
    }
  
    function defaultDB(){
      return {
        users: [],
        courses: [],
        enrollments: [],   // {courseId, studentId}
        sessions: [],       // {id, courseId, lecturerId, code, createdAt, durationSec, ended}
        checkins: [],        // {id, sessionId, studentId, courseId, timestamp, status}
        seeded:false
      };
    }
  
    function load(){
      try{
        const raw = localStorage.getItem(KEY);
        if(!raw) return defaultDB();
        const parsed = JSON.parse(raw);
        return Object.assign(defaultDB(), parsed);
      }catch(e){
        console.error('Store load failed', e);
        return defaultDB();
      }
    }
  
    let db = load();
  
    function save(){
      try{
        localStorage.setItem(KEY, JSON.stringify(db));
      }catch(e){
        console.error('Store save failed', e);
      }
    }
  
    function seedIfEmpty(force){
      if(db.seeded && !force) return;
      db = defaultDB();
  
      const admin = { id:'STU-ADMIN', loginId:'ADMIN001', password:'admin123', role:'admin', name:'Dr. Folake Adeyemi', email:'f.adeyemi@university.edu' };
      const lect1 = { id:uid('lec'), loginId:'LEC001', password:'lecturer123', role:'lecturer', name:'Dr. Tunde Bakare', dept:'Computer Science', email:'t.bakare@university.edu' };
      const lect2 = { id:uid('lec'), loginId:'LEC002', password:'lecturer123', role:'lecturer', name:'Prof. Amaka Nwosu', dept:'Computer Science', email:'a.nwosu@university.edu' };
  
      const studentNames = [
        'Chidi Okeke','Aisha Bello','Emeka Obi','Ngozi Eze','Yusuf Suleiman',
        'Folasade Ogunleye','Ibrahim Garba','Chiamaka Nnaji','David Adeoye','Blessing Eze',
        'Kelechi Uche','Halima Yusuf','Tobi Ajayi','Grace Edet','Samuel Okafor'
      ];
      const students = studentNames.map((name,i)=>({
        id:uid('stu'),
        loginId:'STU' + String(i+1).padStart(3,'0'),
        password:'student123',
        role:'student',
        name,
        level:[100,200,300,400][i%4],
        email:name.toLowerCase().replace(/\s+/g,'.')+'@student.university.edu'
      }));
  
      db.users = [admin, lect1, lect2, ...students];
  
      const courses = [
        { id:uid('crs'), code:'CSC301', title:'Data Structures & Algorithms', lecturerId:lect1.id, schedule:'Mon & Wed, 10:00' },
        { id:uid('crs'), code:'CSC305', title:'Database Systems', lecturerId:lect1.id, schedule:'Tue & Thu, 09:00' },
        { id:uid('crs'), code:'CSC410', title:'Artificial Intelligence', lecturerId:lect2.id, schedule:'Wed, 14:00' },
        { id:uid('crs'), code:'CSC220', title:'Discrete Mathematics', lecturerId:lect2.id, schedule:'Fri, 08:00' },
      ];
      db.courses = courses;
  
      // Enroll students across courses (roughly)
      db.enrollments = [];
      students.forEach((s, i) => {
        courses.forEach((c, ci) => {
          // each student enrolled in 2-3 of the 4 courses
          if((i + ci) % 4 !== 0){
            db.enrollments.push({ courseId:c.id, studentId:s.id });
          }
        });
      });
  
      // Backfill some historical sessions + checkins over the past 3 weeks
      db.sessions = [];
      db.checkins = [];
      const now = Date.now();
      courses.forEach(course => {
        const enrolled = db.enrollments.filter(e=>e.courseId===course.id).map(e=>e.studentId);
        for(let w=3; w>=1; w--){
          const sessionTime = now - (w*7*24*3600*1000) - Math.floor(Math.random()*3*24*3600*1000);
          const session = {
            id: uid('ses'),
            courseId: course.id,
            lecturerId: course.lecturerId,
            code: genSessionCode(),
            createdAt: sessionTime,
            durationSec: 180,
            ended: true
          };
          db.sessions.push(session);
          enrolled.forEach(studId => {
            // ~82% attendance rate historically
            if(Math.random() < 0.82){
              db.checkins.push({
                id: uid('chk'),
                sessionId: session.id,
                studentId: studId,
                courseId: course.id,
                timestamp: sessionTime + Math.floor(Math.random()*90*1000),
                status:'present'
              });
            }
          });
        }
      });
  
      db.seeded = true;
      save();
    }
  
    // ---- Users ----
    function findUserByLoginId(loginId){
      return db.users.find(u => u.loginId.toLowerCase() === String(loginId).toLowerCase());
    }
    function getUser(id){ return db.users.find(u=>u.id===id); }
    function getAllUsers(){ return db.users.slice(); }
    function getStudents(){ return db.users.filter(u=>u.role==='student'); }
    function getLecturers(){ return db.users.filter(u=>u.role==='lecturer'); }
    function addUser(user){
      user.id = uid(user.role.slice(0,3));
      db.users.push(user);
      save();
      return user;
    }
    function deleteUser(id){
      db.users = db.users.filter(u=>u.id!==id);
      db.enrollments = db.enrollments.filter(e=>e.studentId!==id);
      save();
    }
  
    // ---- Courses ----
    function getCourses(){ return db.courses.slice(); }
    function getCourse(id){ return db.courses.find(c=>c.id===id); }
    function getCoursesForLecturer(lecturerId){ return db.courses.filter(c=>c.lecturerId===lecturerId); }
    function getCoursesForStudent(studentId){
      const courseIds = db.enrollments.filter(e=>e.studentId===studentId).map(e=>e.courseId);
      return db.courses.filter(c=>courseIds.includes(c.id));
    }
    function addCourse(course){
      course.id = uid('crs');
      db.courses.push(course);
      save();
      return course;
    }
    function deleteCourse(id){
      db.courses = db.courses.filter(c=>c.id!==id);
      db.enrollments = db.enrollments.filter(e=>e.courseId!==id);
      db.sessions = db.sessions.filter(s=>s.courseId!==id);
      db.checkins = db.checkins.filter(c=>c.courseId!==id);
      save();
    }
    function getEnrolledStudents(courseId){
      const ids = db.enrollments.filter(e=>e.courseId===courseId).map(e=>e.studentId);
      return db.users.filter(u=>ids.includes(u.id));
    }
    function setEnrollment(courseId, studentId, enrolled){
      const exists = db.enrollments.some(e=>e.courseId===courseId && e.studentId===studentId);
      if(enrolled && !exists){
        db.enrollments.push({courseId, studentId});
      } else if(!enrolled && exists){
        db.enrollments = db.enrollments.filter(e=>!(e.courseId===courseId && e.studentId===studentId));
      }
      save();
    }
  
    // ---- Sessions ----
    function createSession(courseId, lecturerId, durationSec){
      const session = {
        id: uid('ses'),
        courseId,
        lecturerId,
        code: genSessionCode(),
        createdAt: Date.now(),
        durationSec: durationSec || 180,
        ended:false
      };
      db.sessions.push(session);
      save();
      return session;
    }
    function endSession(sessionId){
      const s = db.sessions.find(s=>s.id===sessionId);
      if(s) s.ended = true;
      save();
    }
    function getSession(id){ return db.sessions.find(s=>s.id===id); }
    function getActiveSessionForCourse(courseId){
      return db.sessions.find(s => s.courseId===courseId && !s.ended && (Date.now() - s.createdAt) < s.durationSec*1000);
    }
    function getActiveSessionsForLecturer(lecturerId){
      return db.sessions.filter(s => s.lecturerId===lecturerId && !s.ended && (Date.now()-s.createdAt) < s.durationSec*1000);
    }
    function getSessionsForCourse(courseId){
      return db.sessions.filter(s=>s.courseId===courseId).sort((a,b)=>b.createdAt-a.createdAt);
    }
    function findSessionByCode(code){
      return db.sessions.find(s => s.code.toUpperCase() === String(code).toUpperCase() && !s.ended && (Date.now()-s.createdAt) < s.durationSec*1000);
    }
  
    // ---- Checkins ----
    function recordCheckin(sessionId, studentId, courseId){
      const exists = db.checkins.some(c=>c.sessionId===sessionId && c.studentId===studentId);
      if(exists) return { ok:false, reason:'already' };
      const checkin = { id:uid('chk'), sessionId, studentId, courseId, timestamp:Date.now(), status:'present' };
      db.checkins.push(checkin);
      save();
      return { ok:true, checkin };
    }
    function getCheckinsForSession(sessionId){
      return db.checkins.filter(c=>c.sessionId===sessionId);
    }
    function getCheckinsForStudent(studentId){
      return db.checkins.filter(c=>c.studentId===studentId);
    }
    function getCheckinsForCourse(courseId){
      return db.checkins.filter(c=>c.courseId===courseId);
    }
  
    // ---- Analytics helpers ----
    function attendanceRateForStudentInCourse(studentId, courseId){
      const sessions = getSessionsForCourse(courseId).filter(s=>s.ended || (Date.now()-s.createdAt)>s.durationSec*1000);
      if(sessions.length===0) return null;
      const attended = sessions.filter(s => db.checkins.some(c=>c.sessionId===s.id && c.studentId===studentId)).length;
      return { attended, total: sessions.length, rate: attended/sessions.length };
    }
    function attendanceRateForCourse(courseId){
      const sessions = getSessionsForCourse(courseId).filter(s=>s.ended || (Date.now()-s.createdAt)>s.durationSec*1000);
      const enrolled = getEnrolledStudents(courseId);
      if(sessions.length===0 || enrolled.length===0) return null;
      let totalPossible = sessions.length * enrolled.length;
      let totalPresent = db.checkins.filter(c=>c.courseId===courseId && sessions.some(s=>s.id===c.sessionId)).length;
      return { rate: totalPossible>0 ? totalPresent/totalPossible : 0, sessions: sessions.length, students: enrolled.length };
    }
  
    function resetAll(){
      seedIfEmpty(true);
    }
  
    function wipeAll(){
      db = defaultDB();
      save();
    }
  
    return {
      seedIfEmpty, resetAll, wipeAll,
      findUserByLoginId, getUser, getAllUsers, getStudents, getLecturers, addUser, deleteUser,
      getCourses, getCourse, getCoursesForLecturer, getCoursesForStudent, addCourse, deleteCourse,
      getEnrolledStudents, setEnrollment,
      createSession, endSession, getSession, getActiveSessionForCourse, getActiveSessionsForLecturer, getSessionsForCourse, findSessionByCode,
      recordCheckin, getCheckinsForSession, getCheckinsForStudent, getCheckinsForCourse,
      attendanceRateForStudentInCourse, attendanceRateForCourse,
      _raw: () => db
    };
  })();