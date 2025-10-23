// Alloy specification generated from SQL schema
// Generated on: 2025-10-23T01:48:02.276Z

module schema

sig users {
  username: one String,
  email: one String,
  createdAt: lone String
}

sig posts {
  title: one String,
  content: lone String,
  authorId: one users,
  published: lone Bool,
  createdAt: lone String
}

sig comments {
  postId: one posts,
  userId: one users,
  content: one String,
  createdAt: lone String
}

// Primary key: id

fact usersNotNull {
  // All instances must have non-null values for these fields
  all t: users | one t.username
  all t: users | one t.email
}

// Primary key: id

fact postsNotNull {
  // All instances must have non-null values for these fields
  all t: posts | one t.title
}

// Foreign keys:
//   author_id -> users.id

// Primary key: id

fact commentsNotNull {
  // All instances must have non-null values for these fields
  all t: comments | one t.content
}

// Foreign keys:
//   post_id -> posts.id
//   user_id -> users.id
