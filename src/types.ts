export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: string;
}

export interface ForeignKey {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface Table {
  name: string;
  columns: Column[];
  primaryKeys: string[];
  foreignKeys: ForeignKey[];
  uniqueConstraints: string[][];
}

export interface Schema {
  tables: Table[];
}

// OpenAPI specification types (subset relevant for conversion)

export interface OpenAPIProperty {
  type?: string;
  format?: string;
  description?: string;
  enum?: string[];
  $ref?: string;
  items?: OpenAPIProperty;
  default?: unknown;
}

export interface OpenAPISchemaObject {
  type?: string;
  properties?: Record<string, OpenAPIProperty>;
  required?: string[];
  description?: string;
}

export interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
  };
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, OpenAPISchemaObject>;
  };
  definitions?: Record<string, OpenAPISchemaObject>; // Swagger 2.0
}
