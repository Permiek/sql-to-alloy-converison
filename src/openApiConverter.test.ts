import { OpenAPIParser } from './openApiParser';
import { OpenAPIToAlloyConverter } from './openApiConverter';
import { OpenAPISpec } from './types';
import * as fs from 'fs';
import * as path from 'path';

describe('OpenAPIParser', () => {
  const parser = new OpenAPIParser();

  describe('parse', () => {
    it('should parse a simple OpenAPI 3.0 spec with basic types', () => {
      const spec: OpenAPISpec = {
        openapi: '3.0.0',
        components: {
          schemas: {
            User: {
              type: 'object',
              required: ['id', 'name'],
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
              },
            },
          },
        },
      };

      const schema = parser.parse(spec);
      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe('User');
      expect(schema.tables[0].columns).toHaveLength(3);
      expect(schema.tables[0].primaryKeys).toEqual(['id']);
    });

    it('should parse a JSON string input', () => {
      const spec = JSON.stringify({
        openapi: '3.0.0',
        components: {
          schemas: {
            Item: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'integer' },
                label: { type: 'string' },
              },
            },
          },
        },
      });

      const schema = parser.parse(spec);
      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe('Item');
    });

    it('should handle Swagger 2.0 definitions', () => {
      const spec: OpenAPISpec = {
        swagger: '2.0',
        definitions: {
          Category: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
            },
          },
        },
      };

      const schema = parser.parse(spec);
      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe('Category');
    });

    it('should detect $ref as foreign keys', () => {
      const spec: OpenAPISpec = {
        openapi: '3.0.0',
        components: {
          schemas: {
            Author: {
              type: 'object',
              required: ['id', 'name'],
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
              },
            },
            Book: {
              type: 'object',
              required: ['id', 'title', 'author'],
              properties: {
                id: { type: 'integer' },
                title: { type: 'string' },
                author: { $ref: '#/components/schemas/Author' },
              },
            },
          },
        },
      };

      const schema = parser.parse(spec);
      const bookTable = schema.tables.find(t => t.name === 'Book');
      expect(bookTable).toBeDefined();
      expect(bookTable!.foreignKeys).toHaveLength(1);
      expect(bookTable!.foreignKeys[0]).toEqual({
        columnName: 'author',
        referencedTable: 'Author',
        referencedColumn: 'id',
      });
    });

    it('should handle nullable vs required fields correctly', () => {
      const spec: OpenAPISpec = {
        openapi: '3.0.0',
        components: {
          schemas: {
            Profile: {
              type: 'object',
              required: ['id', 'username'],
              properties: {
                id: { type: 'integer' },
                username: { type: 'string' },
                bio: { type: 'string' },
                age: { type: 'integer' },
              },
            },
          },
        },
      };

      const schema = parser.parse(spec);
      const table = schema.tables[0];
      const usernameCol = table.columns.find(c => c.name === 'username');
      const bioCol = table.columns.find(c => c.name === 'bio');

      expect(usernameCol!.nullable).toBe(false);
      expect(bioCol!.nullable).toBe(true);
    });

    it('should map OpenAPI types correctly', () => {
      const spec: OpenAPISpec = {
        openapi: '3.0.0',
        components: {
          schemas: {
            TypeTest: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'integer' },
                count: { type: 'integer', format: 'int64' },
                price: { type: 'number', format: 'double' },
                rating: { type: 'number', format: 'float' },
                amount: { type: 'number' },
                name: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                isActive: { type: 'boolean' },
                website: { type: 'string', format: 'uri' },
              },
            },
          },
        },
      };

      const schema = parser.parse(spec);
      const table = schema.tables[0];

      const findCol = (name: string) => table.columns.find(c => c.name === name)!;
      expect(findCol('id').type).toBe('INT');
      expect(findCol('count').type).toBe('BIGINT');
      expect(findCol('price').type).toBe('DOUBLE');
      expect(findCol('rating').type).toBe('FLOAT');
      expect(findCol('amount').type).toBe('DECIMAL');
      expect(findCol('name').type).toBe('VARCHAR');
      expect(findCol('createdAt').type).toBe('TIMESTAMP');
      expect(findCol('isActive').type).toBe('BOOLEAN');
      expect(findCol('website').type).toBe('VARCHAR');
    });

    it('should return empty schema when no schemas defined', () => {
      const spec: OpenAPISpec = {
        openapi: '3.0.0',
        paths: {},
      };

      const schema = parser.parse(spec);
      expect(schema.tables).toHaveLength(0);
    });

    it('should skip schemas without properties', () => {
      const spec: OpenAPISpec = {
        openapi: '3.0.0',
        components: {
          schemas: {
            EmptySchema: {
              type: 'object',
            },
            GoodSchema: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
              },
            },
          },
        },
      };

      const schema = parser.parse(spec);
      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe('GoodSchema');
    });

    it('should handle array of $ref as foreign key relations', () => {
      const spec: OpenAPISpec = {
        openapi: '3.0.0',
        components: {
          schemas: {
            Tag: {
              type: 'object',
              required: ['id', 'name'],
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
              },
            },
            Article: {
              type: 'object',
              required: ['id', 'title'],
              properties: {
                id: { type: 'integer' },
                title: { type: 'string' },
                tags: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Tag' },
                },
              },
            },
          },
        },
      };

      const schema = parser.parse(spec);
      const article = schema.tables.find(t => t.name === 'Article')!;
      expect(article.foreignKeys).toHaveLength(1);
      expect(article.foreignKeys[0].referencedTable).toBe('Tag');
    });

    it('should handle default values', () => {
      const spec: OpenAPISpec = {
        openapi: '3.0.0',
        components: {
          schemas: {
            Config: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'integer' },
                enabled: { type: 'boolean', default: true },
                retryCount: { type: 'integer', default: 3 },
              },
            },
          },
        },
      };

      const schema = parser.parse(spec);
      const table = schema.tables[0];
      const enabledCol = table.columns.find(c => c.name === 'enabled')!;
      const retryCol = table.columns.find(c => c.name === 'retryCount')!;

      expect(enabledCol.defaultValue).toBe('true');
      expect(retryCol.defaultValue).toBe('3');
    });
  });
});

describe('OpenAPIToAlloyConverter', () => {
  const converter = new OpenAPIToAlloyConverter();

  it('should convert a simple OpenAPI spec to Alloy', () => {
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      components: {
        schemas: {
          User: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              active: { type: 'boolean' },
            },
          },
        },
      },
    };

    const alloy = converter.convert(spec);

    expect(alloy).toContain('sig User');
    expect(alloy).toContain('name: one String');
    expect(alloy).toContain('active: lone Bool');
    // id is primary key — excluded from sig fields
    expect(alloy).not.toMatch(/\bid\b.*:.*Int/);
  });

  it('should convert foreign key references to Alloy relations', () => {
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      components: {
        schemas: {
          Department: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
            },
          },
          Employee: {
            type: 'object',
            required: ['id', 'name', 'department'],
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              department: { $ref: '#/components/schemas/Department' },
            },
          },
        },
      },
    };

    const alloy = converter.convert(spec);

    expect(alloy).toContain('sig Department');
    expect(alloy).toContain('sig Employee');
    expect(alloy).toContain('department: one Department');
  });

  it('should generate NOT NULL facts for required fields', () => {
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      components: {
        schemas: {
          Widget: {
            type: 'object',
            required: ['id', 'name', 'color'],
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              color: { type: 'string' },
              weight: { type: 'number' },
            },
          },
        },
      },
    };

    const alloy = converter.convert(spec);

    expect(alloy).toContain('fact WidgetNotNull');
    expect(alloy).toContain('all t: Widget | one t.name');
    expect(alloy).toContain('all t: Widget | one t.color');
    // weight is optional — should not be in NotNull fact
    expect(alloy).not.toContain('t.weight');
  });

  describe('example file conversions', () => {
    const examplesDir = path.resolve(__dirname, '..', 'examples');

    it('should convert petstore_api.json', () => {
      const content = fs.readFileSync(path.join(examplesDir, 'petstore_api.json'), 'utf-8');
      const alloy = converter.convert(content);

      expect(alloy).toContain('sig Owner');
      expect(alloy).toContain('sig Pet');
      expect(alloy).toContain('sig Appointment');
      // Pet has FK to Owner
      expect(alloy).toContain('owner: lone Owner');
      // Appointment has FK to Pet
      expect(alloy).toContain('pet: one Pet');
      expect(alloy).toContain('completed: lone Bool');
    });

    it('should convert ecommerce_api.json', () => {
      const content = fs.readFileSync(path.join(examplesDir, 'ecommerce_api.json'), 'utf-8');
      const alloy = converter.convert(content);

      expect(alloy).toContain('sig Customer');
      expect(alloy).toContain('sig Product');
      expect(alloy).toContain('sig Order');
      expect(alloy).toContain('sig OrderItem');
      // Order references Customer
      expect(alloy).toContain('customer: one Customer');
      // OrderItem references Order and Product
      expect(alloy).toContain('order: one Order');
      expect(alloy).toContain('product: one Product');
    });

    it('should convert task_manager_swagger.json (Swagger 2.0)', () => {
      const content = fs.readFileSync(path.join(examplesDir, 'task_manager_swagger.json'), 'utf-8');
      const alloy = converter.convert(content);

      expect(alloy).toContain('sig User');
      expect(alloy).toContain('sig Project');
      expect(alloy).toContain('sig Task');
      // Project references User (owner)
      expect(alloy).toContain('owner: one User');
      // Task references Project and optionally User (assignee)
      expect(alloy).toContain('project: one Project');
      expect(alloy).toContain('assignee: lone User');
    });
  });

  it('should produce valid Alloy module header', () => {
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      components: {
        schemas: {
          Foo: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
            },
          },
        },
      },
    };

    const alloy = converter.convert(spec);
    expect(alloy).toContain('module schema');
  });

  it('should handle optional $ref (nullable foreign key)', () => {
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      components: {
        schemas: {
          Manager: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'integer' },
            },
          },
          Team: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              manager: { $ref: '#/components/schemas/Manager' },
            },
          },
        },
      },
    };

    const alloy = converter.convert(spec);
    // manager is not in required, so it should be 'lone'
    expect(alloy).toContain('manager: lone Manager');
  });
});
