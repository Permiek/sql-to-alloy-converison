-- Simple database schema example
-- This represents a basic blog system

CREATE TABLE users (
  id INT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP
);

CREATE TABLE posts (
  id INT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  author_id INT NOT NULL,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id INT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
