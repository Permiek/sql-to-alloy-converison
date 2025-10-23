import { Schema, Table, Column, ForeignKey } from './types';

export class AlloyGenerator {
  generate(schema: Schema): string {
    let alloySpec = '';

    // Add header comment
    alloySpec += '// Alloy specification generated from SQL schema\n';
    alloySpec += '// Generated on: ' + new Date().toISOString() + '\n\n';

    // Add module declaration
    alloySpec += 'module schema\n\n';

    // Generate signatures for each table
    for (const table of schema.tables) {
      alloySpec += this.generateTableSignature(table, schema);
      alloySpec += '\n\n';
    }

    // Generate facts for constraints
    for (const table of schema.tables) {
      const facts = this.generateTableFacts(table, schema);
      if (facts) {
        alloySpec += facts + '\n\n';
      }
    }

    return alloySpec.trim() + '\n';
  }

  private generateTableSignature(table: Table, schema: Schema): string {
    let sig = `sig ${this.sanitizeName(table.name)} {\n`;

    // Generate fields for each column
    for (const column of table.columns) {
      if (!table.primaryKeys.includes(column.name)) {
        sig += `  ${this.sanitizeName(column.name)}: ${this.mapColumnType(column, table, schema)},\n`;
      }
    }

    // Remove trailing comma
    if (sig.endsWith(',\n')) {
      sig = sig.slice(0, -2) + '\n';
    }

    sig += '}';

    return sig;
  }

  private mapColumnType(column: Column, table: Table, schema: Schema): string {
    // Check if this column is a foreign key
    const fk = table.foreignKeys.find(fk => fk.columnName === column.name);

    if (fk) {
      const multiplicity = column.nullable ? 'lone' : 'one';
      return `${multiplicity} ${this.sanitizeName(fk.referencedTable)}`;
    }

    // Map SQL types to Alloy types
    const baseType = this.mapSQLTypeToAlloy(column.type);
    const multiplicity = column.nullable ? 'lone' : 'one';

    return `${multiplicity} ${baseType}`;
  }

  private mapSQLTypeToAlloy(sqlType: string): string {
    const type = sqlType.toUpperCase();

    // Integer types
    if (type.includes('INT') || type.includes('SERIAL') || type.includes('BIGINT') ||
        type.includes('SMALLINT') || type.includes('TINYINT')) {
      return 'Int';
    }

    // String types
    if (type.includes('CHAR') || type.includes('TEXT') || type.includes('VARCHAR') ||
        type.includes('STRING')) {
      return 'String';
    }

    // Boolean types
    if (type.includes('BOOL') || type.includes('BOOLEAN')) {
      return 'Bool';
    }

    // Date/Time types
    if (type.includes('DATE') || type.includes('TIME') || type.includes('TIMESTAMP')) {
      return 'String'; // Represent dates as strings in Alloy
    }

    // Numeric types
    if (type.includes('DECIMAL') || type.includes('NUMERIC') || type.includes('FLOAT') ||
        type.includes('DOUBLE') || type.includes('REAL')) {
      return 'Int'; // Approximate with Int in Alloy
    }

    // Default to String for unknown types
    return 'String';
  }

  private generateTableFacts(table: Table, schema: Schema): string | null {
    const facts: string[] = [];

    // Primary key uniqueness
    if (table.primaryKeys.length > 0) {
      // In Alloy, all signatures are implicitly unique, so we document this
      facts.push(`// Primary key: ${table.primaryKeys.join(', ')}`);
    }

    // NOT NULL constraints
    const notNullColumns = table.columns.filter(col =>
      !col.nullable && !table.primaryKeys.includes(col.name)
    );

    if (notNullColumns.length > 0) {
      let factContent = `fact ${this.sanitizeName(table.name)}NotNull {\n`;
      factContent += `  // All instances must have non-null values for these fields\n`;
      for (const col of notNullColumns) {
        const fk = table.foreignKeys.find(fk => fk.columnName === col.name);
        if (!fk) { // Skip foreign keys as they have 'one' multiplicity
          factContent += `  all t: ${this.sanitizeName(table.name)} | one t.${this.sanitizeName(col.name)}\n`;
        }
      }
      factContent += '}';
      facts.push(factContent);
    }

    // Unique constraints
    for (const uniqueCols of table.uniqueConstraints) {
      if (uniqueCols.length > 0) {
        let factContent = `fact ${this.sanitizeName(table.name)}Unique_${uniqueCols.map(c => this.sanitizeName(c)).join('_')} {\n`;
        factContent += `  // Unique constraint on: ${uniqueCols.join(', ')}\n`;

        if (uniqueCols.length === 1) {
          const colName = this.sanitizeName(uniqueCols[0]);
          factContent += `  all disj t1, t2: ${this.sanitizeName(table.name)} | t1.${colName} != t2.${colName}\n`;
        } else {
          const conditions = uniqueCols.map(col => `t1.${this.sanitizeName(col)} = t2.${this.sanitizeName(col)}`).join(' and ');
          factContent += `  no disj t1, t2: ${this.sanitizeName(table.name)} | ${conditions}\n`;
        }

        factContent += '}';
        facts.push(factContent);
      }
    }

    // Foreign key referential integrity (implicit in Alloy through type system)
    if (table.foreignKeys.length > 0) {
      let fkComment = '// Foreign keys:\n';
      for (const fk of table.foreignKeys) {
        fkComment += `//   ${fk.columnName} -> ${fk.referencedTable}.${fk.referencedColumn}\n`;
      }
      facts.push(fkComment.trim());
    }

    return facts.length > 0 ? facts.join('\n\n') : null;
  }

  private sanitizeName(name: string): string {
    // Convert to camelCase and ensure valid Alloy identifier
    // Remove special characters and convert to valid Alloy name
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^(\d)/, '_$1') // Prefix with underscore if starts with digit
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}
