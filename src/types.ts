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
