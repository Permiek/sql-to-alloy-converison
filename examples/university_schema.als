// Alloy specification generated from SQL schema
// Generated on: 2025-10-23T01:48:02.353Z

module schema

sig departments {
  deptName: one String,
  building: lone String
}

sig professors {
  name: one String,
  deptId: one departments,
  salary: lone Int
}

sig students {
  name: one String,
  majorDept: lone departments,
  gpa: lone Int
}

sig courses {
  courseName: one String,
  deptId: one departments,
  credits: one Int
}

sig enrollments {
  studentId: one students,
  courseId: one courses,
  grade: lone String,
  semester: lone String
}

// Primary key: dept_id

fact departmentsNotNull {
  // All instances must have non-null values for these fields
  all t: departments | one t.deptName
}

// Primary key: prof_id

fact professorsNotNull {
  // All instances must have non-null values for these fields
  all t: professors | one t.name
}

// Foreign keys:
//   dept_id -> departments.dept_id

// Primary key: student_id

fact studentsNotNull {
  // All instances must have non-null values for these fields
  all t: students | one t.name
}

// Foreign keys:
//   major_dept -> departments.dept_id

// Primary key: course_id

fact coursesNotNull {
  // All instances must have non-null values for these fields
  all t: courses | one t.courseName
  all t: courses | one t.credits
}

// Foreign keys:
//   dept_id -> departments.dept_id

// Primary key: enrollment_id

fact enrollmentsNotNull {
  // All instances must have non-null values for these fields
}

fact enrollmentsUnique_studentId_courseId_semester {
  // Unique constraint on: student_id, course_id, semester
  no disj t1, t2: enrollments | t1.studentId = t2.studentId and t1.courseId = t2.courseId and t1.semester = t2.semester
}

// Foreign keys:
//   student_id -> students.student_id
//   course_id -> courses.course_id
