#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { SQLToAlloyConverter } from './converter';

const program = new Command();

program
  .name('sql-to-alloy')
  .description('Convert SQL DDL schemas to Alloy specifications')
  .version('1.0.0');

program
  .argument('<input>', 'Input SQL file path')
  .option('-o, --output <file>', 'Output Alloy file path')
  .option('-s, --stdout', 'Output to stdout instead of file')
  .action((input: string, options: { output?: string; stdout?: boolean }) => {
    try {
      // Read input SQL file
      if (!fs.existsSync(input)) {
        console.error(`Error: Input file '${input}' not found`);
        process.exit(1);
      }

      const sqlContent = fs.readFileSync(input, 'utf-8');

      // Convert SQL to Alloy
      const converter = new SQLToAlloyConverter();
      const alloySpec = converter.convert(sqlContent);

      // Output result
      if (options.stdout) {
        console.log(alloySpec);
      } else {
        const outputPath = options.output || input.replace(/\.(sql|ddl)$/i, '.als');

        fs.writeFileSync(outputPath, alloySpec, 'utf-8');
        console.log(`✓ Alloy specification generated: ${outputPath}`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
