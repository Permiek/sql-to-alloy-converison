-- University database schema

CREATE TABLE departments (
  dept_id INT PRIMARY KEY,
  dept_name VARCHAR(100) NOT NULL UNIQUE,
  building VARCHAR(50)
);

CREATE TABLE professors (
  prof_id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  dept_id INT NOT NULL,
  salary DECIMAL(10,2),
  FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

CREATE TABLE students (
  student_id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  major_dept INT,
  gpa DECIMAL(3,2),
  FOREIGN KEY (major_dept) REFERENCES departments(dept_id)
);

CREATE TABLE courses (
  course_id INT PRIMARY KEY,
  course_name VARCHAR(100) NOT NULL,
  dept_id INT NOT NULL,
  credits INT NOT NULL,
  FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

CREATE TABLE enrollments (
  enrollment_id INT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  grade VARCHAR(2),
  semester VARCHAR(20),
  FOREIGN KEY (student_id) REFERENCES students(student_id),
  FOREIGN KEY (course_id) REFERENCES courses(course_id),
  UNIQUE (student_id, course_id, semester)
);
