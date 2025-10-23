import { SQLParser } from './sqlParser';
import { AlloyGenerator } from './alloyGenerator';

export class SQLToAlloyConverter {
  private parser: SQLParser;
  private generator: AlloyGenerator;

  constructor() {
    this.parser = new SQLParser();
    this.generator = new AlloyGenerator();
  }

  convert(sqlContent: string): string {
    // Parse SQL schema
    const schema = this.parser.parse(sqlContent);

    // Generate Alloy specification
    const alloySpec = this.generator.generate(schema);

    return alloySpec;
  }
}
