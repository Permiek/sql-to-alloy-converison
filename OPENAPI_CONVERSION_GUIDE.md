# OpenAPI to Alloy Conversion - User Guide

This guide explains how to convert OpenAPI (v3.x) and Swagger (v2.0) specifications into Alloy formal models.

## Quick Start

```typescript
import { OpenAPIToAlloyConverter } from 'sql-to-alloy-converter';

const converter = new OpenAPIToAlloyConverter();
const alloySpec = converter.convert(openApiJsonString);
```

## Input Formats

The converter accepts two input formats:

### 1. JSON string

Pass the raw JSON content of an OpenAPI specification file:

```typescript
import * as fs from 'fs';

const json = fs.readFileSync('my-api.json', 'utf-8');
const alloy = converter.convert(json);
```

### 2. Parsed object

Pass an already-parsed JavaScript object that conforms to the `OpenAPISpec` interface:

```typescript
const spec = {
  openapi: '3.0.0',
  components: {
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id:    { type: 'integer' },
          name:  { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
      },
    },
  },
};

const alloy = converter.convert(spec);
```

## Supported Specifications

| Version | Schema location | Supported |
|---------|----------------|-----------|
| OpenAPI 3.x | `components.schemas` | Yes |
| Swagger 2.0 | `definitions` | Yes |

The converter reads schemas from the appropriate location automatically.

## How the Conversion Works

### Schemas become Alloy signatures

Each named schema with `properties` becomes an Alloy `sig`:

```
OpenAPI Schema "Pet"  →  sig Pet { ... }
```

Schemas without `properties` (e.g. enums or primitives defined at the top level) are skipped.

### Properties become fields

Each property in a schema becomes a field in the corresponding `sig`.

**Multiplicity rules:**

| Condition | Alloy multiplicity | Meaning |
|-----------|-------------------|---------|
| Property listed in `required` | `one` | Exactly one value (non-null) |
| Property not in `required` | `lone` | Zero or one value (nullable) |

### `id` fields are treated as primary keys

If a schema has a property named `id`, it is treated as the primary key and excluded from the Alloy `sig` fields (Alloy signatures are implicitly unique).

### Type mapping

| OpenAPI type + format | Alloy type |
|----------------------|------------|
| `integer` | `Int` |
| `integer` + `int64` | `Int` |
| `number` | `Int` |
| `number` + `float` | `Int` |
| `number` + `double` | `Int` |
| `string` | `String` |
| `string` + `date` / `date-time` | `String` |
| `string` + `email` / `uri` / `uuid` | `String` |
| `string` + `enum` | `String` |
| `boolean` | `Bool` |
| `array` (of primitives) | `String` |

### `$ref` becomes a typed relation (foreign key)

A property using `$ref` is modeled as a relation to the referenced schema's `sig`:

```json
"owner": { "$ref": "#/components/schemas/Owner" }
```

Produces (when not in `required`):

```alloy
owner: lone Owner
```

This works with both `#/components/schemas/Name` (OpenAPI 3.x) and `#/definitions/Name` (Swagger 2.0).

### Array of `$ref` becomes a set relation

A property typed as `array` with `items.$ref` is modeled the same way:

```json
"tags": {
  "type": "array",
  "items": { "$ref": "#/components/schemas/Tag" }
}
```

Produces:

```alloy
tags: lone Tag
```

### Generated Alloy facts

The converter produces `fact` blocks for constraints:

- **NotNull facts**: For each schema with `required` fields, a fact ensures those fields always have a value.
- **Foreign key comments**: Documented as comments listing which fields reference which schemas.
- **Primary key comments**: Documented as comments noting which field is the primary key.

## Full Example

Given this OpenAPI specification (`petstore_api.json`):

```json
{
  "openapi": "3.0.0",
  "components": {
    "schemas": {
      "Owner": {
        "type": "object",
        "required": ["id", "name", "email"],
        "properties": {
          "id":    { "type": "integer", "format": "int64" },
          "name":  { "type": "string" },
          "email": { "type": "string", "format": "email" },
          "phone": { "type": "string" }
        }
      },
      "Pet": {
        "type": "object",
        "required": ["id", "name", "status"],
        "properties": {
          "id":      { "type": "integer", "format": "int64" },
          "name":    { "type": "string" },
          "species": { "type": "string", "enum": ["dog", "cat", "bird", "fish"] },
          "status":  { "type": "string", "enum": ["available", "pending", "adopted"] },
          "age":     { "type": "integer" },
          "owner":   { "$ref": "#/components/schemas/Owner" }
        }
      },
      "Appointment": {
        "type": "object",
        "required": ["id", "pet", "date"],
        "properties": {
          "id":        { "type": "integer", "format": "int64" },
          "pet":       { "$ref": "#/components/schemas/Pet" },
          "date":      { "type": "string", "format": "date-time" },
          "reason":    { "type": "string" },
          "completed": { "type": "boolean", "default": false }
        }
      }
    }
  }
}
```

Running:

```typescript
import * as fs from 'fs';
import { OpenAPIToAlloyConverter } from 'sql-to-alloy-converter';

const converter = new OpenAPIToAlloyConverter();
const json = fs.readFileSync('examples/petstore_api.json', 'utf-8');
console.log(converter.convert(json));
```

Produces:

```alloy
module schema

sig Owner {
  name: one String,
  email: one String,
  phone: lone String
}

sig Pet {
  name: one String,
  species: lone String,
  status: one String,
  age: lone Int,
  owner: lone Owner
}

sig Appointment {
  pet: one Pet,
  date: one String,
  reason: lone String,
  completed: lone Bool
}

// Primary key: id

fact OwnerNotNull {
  // All instances must have non-null values for these fields
  all t: Owner | one t.name
  all t: Owner | one t.email
}

// Primary key: id

fact PetNotNull {
  // All instances must have non-null values for these fields
  all t: Pet | one t.name
  all t: Pet | one t.status
}

// Foreign keys:
//   owner -> Owner.id

// Primary key: id

fact AppointmentNotNull {
  // All instances must have non-null values for these fields
  all t: Appointment | one t.date
}

// Foreign keys:
//   pet -> Pet.id
```

## Using Individual Components

For more control, you can use the parser and generator separately:

```typescript
import { OpenAPIParser } from 'sql-to-alloy-converter';
import { AlloyGenerator } from 'sql-to-alloy-converter';

// Step 1: Parse OpenAPI spec into an intermediate Schema
const parser = new OpenAPIParser();
const schema = parser.parse(openApiJsonString);

// Inspect the parsed schema
console.log(schema.tables.map(t => t.name)); // ['Owner', 'Pet', 'Appointment']

// Step 2: Generate Alloy from the Schema
const generator = new AlloyGenerator();
const alloySpec = generator.generate(schema);
```

This is useful when you want to inspect or modify the intermediate `Schema` representation before generating Alloy output.

## Example Specifications

The `examples/` directory includes several ready-to-use API specifications:

| File | Description | Schemas |
|------|-------------|---------|
| `petstore_api.json` | Simple petstore with owners and appointments | Owner, Pet, Appointment |
| `ecommerce_api.json` | E-commerce with orders and line items | Customer, Product, Order, OrderItem |
| `task_manager_swagger.json` | Swagger 2.0 task manager | User, Project, Task |
| `openapi_petstore.json` | Official OpenAPI Petstore (from openapi-generator) | User, Category, Pet, Tag, Order |

## Running Tests

```bash
npm test
```

The test suite verifies parsing, type mapping, `$ref` resolution, multiplicity rules, and end-to-end conversion against all example specifications.

## Limitations

- Only `$ref` references within the same file are supported (no external file references).
- `allOf`, `oneOf`, and `anyOf` composition keywords are not resolved.
- `additionalProperties` (map types) are not modeled.
- Only properties named `id` are auto-detected as primary keys.
- Nested inline objects (object-typed properties without `$ref`) are mapped as `String` rather than separate signatures.
