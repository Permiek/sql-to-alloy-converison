import { OpenAPIParser } from './openApiParser';
import { AlloyGenerator } from './alloyGenerator';
import { OpenAPISpec } from './types';

export class OpenAPIToAlloyConverter {
  private parser: OpenAPIParser;
  private generator: AlloyGenerator;

  constructor() {
    this.parser = new OpenAPIParser();
    this.generator = new AlloyGenerator();
  }

  convert(openApiContent: string | OpenAPISpec): string {
    // Parse OpenAPI specification into internal Schema
    const schema = this.parser.parse(openApiContent);

    // Generate Alloy specification
    const alloySpec = this.generator.generate(schema);

    return alloySpec;
  }
}
