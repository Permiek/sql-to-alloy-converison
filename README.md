# SQL to Alloy Converter

A command-line tool that converts SQL DDL (Data Definition Language) schemas into Alloy formal specifications. This tool helps you analyze and verify database schemas using Alloy's powerful constraint-solving capabilities.

## Features

- Parse SQL `CREATE TABLE` statements
- Extract columns, data types, and constraints
- Generate Alloy signatures and facts
- Support for:
  - Primary keys
  - Foreign keys
  - NOT NULL constraints
  - UNIQUE constraints
  - Multiple data types (INT, VARCHAR, TEXT, BOOLEAN, TIMESTAMP, etc.)

## Installation

```bash
# Clone the repository
git clone https://github.com/Permiek/sql-to-alloy-converison.git
cd sql-to-alloy-converison

# Install dependencies
npm install

# Build the project
npm run build

# Optional: Link for global usage
npm link
```

## Usage

### Command Line

```bash
# Basic usage - generates output.als from input.sql
node dist/cli.js input.sql

# Specify output file
node dist/cli.js input.sql -o output.als

# Output to stdout
node dist/cli.js input.sql --stdout
```

### As a Library

```typescript
import { SQLToAlloyConverter } from 'sql-to-alloy-converter';

const converter = new SQLToAlloyConverter();
const sqlSchema = `
  CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL
  );
`;

const alloySpec = converter.convert(sqlSchema);
console.log(alloySpec);
```

## Examples

### Example 1: Simple Blog Schema

**Input SQL** (`examples/simple_schema.sql`):

```sql
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
```

**Generated Alloy** (`examples/simple_schema.als`):

```alloy
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

fact usersNotNull {
  all t: users | one t.username
  all t: users | one t.email
}

fact postsNotNull {
  all t: posts | one t.title
}

fact commentsNotNull {
  all t: comments | one t.content
}
```

### Example 2: University Schema

See `examples/university_schema.sql` and `examples/university_schema.als` for a more complex example with multiple foreign keys and unique constraints.

## Conversion Rules

### SQL to Alloy Type Mapping

| SQL Type | Alloy Type |
|----------|------------|
| INT, INTEGER, BIGINT, SMALLINT | Int |
| VARCHAR, CHAR, TEXT | String |
| BOOLEAN, BOOL | Bool |
| TIMESTAMP, DATE, TIME | String |
| DECIMAL, NUMERIC, FLOAT | Int |

### Constraint Mapping

- **Primary Keys**: Documented as comments (Alloy sigs are implicitly unique)
- **Foreign Keys**: Mapped to relations between signatures with appropriate multiplicity
- **NOT NULL**: Mapped to `one` multiplicity (required field)
- **NULL allowed**: Mapped to `lone` multiplicity (optional field)
- **UNIQUE**: Generated as separate facts with uniqueness constraints

## Supported SQL Features

- ✅ CREATE TABLE statements
- ✅ Column definitions with data types
- ✅ PRIMARY KEY constraints (inline and table-level)
- ✅ FOREIGN KEY constraints
- ✅ NOT NULL constraints
- ✅ UNIQUE constraints
- ✅ DEFAULT values (documented)
- ✅ Single-line comments (`--`)
- ✅ Multi-line comments (`/* */`)

## Limitations

- Does not support ALTER TABLE statements
- Does not support CHECK constraints
- Does not support triggers or stored procedures
- Complex SQL expressions in DEFAULT values are simplified
- Composite foreign keys need proper handling

## Using Generated Alloy Specifications

The generated `.als` files can be opened in the [Alloy Analyzer](https://github.com/AlloyTools/org.alloytools.alloy):

1. Download and install Alloy Analyzer
2. Open the generated `.als` file
3. Add predicates to query your schema
4. Use the analyzer to verify constraints and find instances

Example predicate to add:

```alloy
pred show {
  #users > 2
  #posts > 3
  all p: posts | some p.authorId
}

run show for 5
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev examples/simple_schema.sql --stdout
```

## Project Structure

```
sql-to-alloy-converison/
├── src/
│   ├── types.ts           # Type definitions
│   ├── sqlParser.ts       # SQL parsing logic
│   ├── alloyGenerator.ts  # Alloy generation logic
│   ├── converter.ts       # Main converter class
│   ├── cli.ts            # CLI interface
│   └── index.ts          # Public API exports
├── examples/              # Example SQL files and generated Alloy specs
├── dist/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT
