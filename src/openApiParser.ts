import { Schema, Table, Column, ForeignKey, OpenAPISpec, OpenAPISchemaObject, OpenAPIProperty } from './types';

export class OpenAPIParser {
  parse(input: string | OpenAPISpec): Schema {
    const spec: OpenAPISpec = typeof input === 'string' ? JSON.parse(input) : input;
    const schemas = this.extractSchemas(spec);
    const tables: Table[] = [];

    for (const [name, schemaObj] of Object.entries(schemas)) {
      const table = this.parseSchemaObject(name, schemaObj, schemas);
      if (table) {
        tables.push(table);
      }
    }

    return { tables };
  }

  private extractSchemas(spec: OpenAPISpec): Record<string, OpenAPISchemaObject> {
    // OpenAPI 3.x uses components.schemas, Swagger 2.0 uses definitions
    if (spec.components?.schemas) {
      return spec.components.schemas;
    }
    if (spec.definitions) {
      return spec.definitions;
    }
    return {};
  }

  private parseSchemaObject(
    name: string,
    schemaObj: OpenAPISchemaObject,
    allSchemas: Record<string, OpenAPISchemaObject>
  ): Table | null {
    if (!schemaObj.properties) {
      return null;
    }

    const requiredFields = new Set(schemaObj.required || []);
    const columns: Column[] = [];
    const primaryKeys: string[] = [];
    const foreignKeys: ForeignKey[] = [];
    const uniqueConstraints: string[][] = [];

    // Detect an 'id' field as primary key by convention
    if (schemaObj.properties['id']) {
      primaryKeys.push('id');
    }

    for (const [propName, propDef] of Object.entries(schemaObj.properties)) {
      // Handle $ref (foreign key to another schema)
      const ref = this.resolveRef(propDef);
      if (ref) {
        const referencedTable = ref;
        foreignKeys.push({
          columnName: propName,
          referencedTable,
          referencedColumn: 'id',
        });

        columns.push({
          name: propName,
          type: 'REF',
          nullable: !requiredFields.has(propName),
          primaryKey: false,
          unique: false,
        });
        continue;
      }

      // Handle array of $ref (one-to-many relationship) — skip as field, not a direct column
      if (propDef.type === 'array' && propDef.items) {
        const arrayRef = this.resolveRef(propDef.items);
        if (arrayRef) {
          // Array of references: model as a set relation, still add as a column with special type
          columns.push({
            name: propName,
            type: 'ARRAY_REF',
            nullable: !requiredFields.has(propName),
            primaryKey: false,
            unique: false,
          });
          foreignKeys.push({
            columnName: propName,
            referencedTable: arrayRef,
            referencedColumn: 'id',
          });
          continue;
        }
      }

      const alloyType = this.mapOpenAPITypeToSQLType(propDef);

      columns.push({
        name: propName,
        type: alloyType,
        nullable: !requiredFields.has(propName),
        primaryKey: primaryKeys.includes(propName),
        unique: false,
        defaultValue: propDef.default !== undefined ? String(propDef.default) : undefined,
      });
    }

    return {
      name,
      columns,
      primaryKeys,
      foreignKeys,
      uniqueConstraints,
    };
  }

  private resolveRef(propDef: OpenAPIProperty): string | null {
    if (propDef.$ref) {
      // Extract schema name from "#/components/schemas/Foo" or "#/definitions/Foo"
      const parts = propDef.$ref.split('/');
      return parts[parts.length - 1];
    }
    return null;
  }

  private mapOpenAPITypeToSQLType(propDef: OpenAPIProperty): string {
    const type = propDef.type || 'string';
    const format = propDef.format || '';

    switch (type) {
      case 'integer':
        if (format === 'int64') return 'BIGINT';
        return 'INT';
      case 'number':
        if (format === 'float') return 'FLOAT';
        if (format === 'double') return 'DOUBLE';
        return 'DECIMAL';
      case 'string':
        if (format === 'date' || format === 'date-time') return 'TIMESTAMP';
        if (format === 'email' || format === 'uri' || format === 'uuid') return 'VARCHAR';
        if (propDef.enum) return 'VARCHAR';
        return 'VARCHAR';
      case 'boolean':
        return 'BOOLEAN';
      case 'array':
        return 'TEXT'; // Arrays of primitives serialized as text
      default:
        return 'VARCHAR';
    }
  }
}
