import { Schema, Table, Column, ForeignKey } from './types';

export class SQLParser {
  parse(sqlContent: string): Schema {
    const tables: Table[] = [];

    // Remove comments and normalize whitespace
    const cleanedSQL = this.cleanSQL(sqlContent);

    // Extract CREATE TABLE statements
    const tableStatements = this.extractTableStatements(cleanedSQL);

    for (const statement of tableStatements) {
      const table = this.parseTableStatement(statement);
      if (table) {
        tables.push(table);
      }
    }

    return { tables };
  }

  private cleanSQL(sql: string): string {
    // Remove single-line comments
    sql = sql.replace(/--[^\n]*/g, '');

    // Remove multi-line comments
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');

    // Normalize whitespace
    sql = sql.replace(/\s+/g, ' ').trim();

    return sql;
  }

  private extractTableStatements(sql: string): string[] {
    const statements: string[] = [];
    const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)\s*\(((?:[^()]|\([^)]*\))*)\)(?:\s*;)?/gi;

    let match;
    while ((match = regex.exec(sql)) !== null) {
      statements.push(match[0]);
    }

    return statements;
  }

  private parseTableStatement(statement: string): Table | null {
    const tableNameMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(/i);

    if (!tableNameMatch) {
      return null;
    }

    const tableName = tableNameMatch[1];
    const contentMatch = statement.match(/\(((?:[^()]|\([^)]*\))*)\)/);

    if (!contentMatch) {
      return null;
    }

    const content = contentMatch[1];
    const parts = this.splitByComma(content);

    const columns: Column[] = [];
    const primaryKeys: string[] = [];
    const foreignKeys: ForeignKey[] = [];
    const uniqueConstraints: string[][] = [];

    for (const part of parts) {
      const trimmedPart = part.trim();

      if (/^PRIMARY\s+KEY/i.test(trimmedPart)) {
        const pks = this.extractConstraintColumns(trimmedPart);
        primaryKeys.push(...pks);
      } else if (/^FOREIGN\s+KEY/i.test(trimmedPart)) {
        const fk = this.parseForeignKey(trimmedPart);
        if (fk) {
          foreignKeys.push(fk);
        }
      } else if (/^UNIQUE/i.test(trimmedPart)) {
        const cols = this.extractConstraintColumns(trimmedPart);
        uniqueConstraints.push(cols);
      } else if (/^CONSTRAINT/i.test(trimmedPart)) {
        // Handle named constraints
        if (/PRIMARY\s+KEY/i.test(trimmedPart)) {
          const pks = this.extractConstraintColumns(trimmedPart);
          primaryKeys.push(...pks);
        } else if (/FOREIGN\s+KEY/i.test(trimmedPart)) {
          const fk = this.parseForeignKey(trimmedPart);
          if (fk) {
            foreignKeys.push(fk);
          }
        } else if (/UNIQUE/i.test(trimmedPart)) {
          const cols = this.extractConstraintColumns(trimmedPart);
          uniqueConstraints.push(cols);
        }
      } else {
        // Parse column definition
        const column = this.parseColumn(trimmedPart);
        if (column) {
          columns.push(column);
          if (column.primaryKey) {
            primaryKeys.push(column.name);
          }
        }
      }
    }

    return {
      name: tableName,
      columns,
      primaryKeys,
      foreignKeys,
      uniqueConstraints
    };
  }

  private splitByComma(content: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (char === '(') {
        depth++;
        current += char;
      } else if (char === ')') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  private parseColumn(columnDef: string): Column | null {
    const match = columnDef.match(/^[`"]?(\w+)[`"]?\s+([^\s,]+)/i);

    if (!match) {
      return null;
    }

    const name = match[1];
    const type = match[2];

    const nullable = !/NOT\s+NULL/i.test(columnDef);
    const primaryKey = /PRIMARY\s+KEY/i.test(columnDef);
    const unique = /UNIQUE/i.test(columnDef);

    let defaultValue: string | undefined;
    const defaultMatch = columnDef.match(/DEFAULT\s+([^\s,]+)/i);
    if (defaultMatch) {
      defaultValue = defaultMatch[1];
    }

    return {
      name,
      type: type.toUpperCase(),
      nullable,
      primaryKey,
      unique,
      defaultValue
    };
  }

  private extractConstraintColumns(constraint: string): string[] {
    const match = constraint.match(/\(([^)]+)\)/);
    if (!match) {
      return [];
    }

    return match[1].split(',').map(col => col.trim().replace(/[`"]/g, ''));
  }

  private parseForeignKey(constraint: string): ForeignKey | null {
    const fkMatch = constraint.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"]?(\w+)[`"]?\s*\(([^)]+)\)/i);

    if (!fkMatch) {
      return null;
    }

    const columnName = fkMatch[1].trim().replace(/[`"]/g, '');
    const referencedTable = fkMatch[2].trim();
    const referencedColumn = fkMatch[3].trim().replace(/[`"]/g, '');

    return {
      columnName,
      referencedTable,
      referencedColumn
    };
  }
}
