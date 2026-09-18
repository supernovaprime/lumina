import { Test, TestingModule } from '@nestjs/testing';
import { CsvService } from './csv.service';

describe('CsvService', () => {
  let service: CsvService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CsvService],
    }).compile();

    service = module.get<CsvService>(CsvService);
  });

  describe('generate', () => {
    it('should generate CSV from data with columns', () => {
      const data = [
        { id: '1', name: 'Alice', age: 30 },
        { id: '2', name: 'Bob', age: 25 },
      ];
      const columns = [
        { header: 'ID', accessor: (r: any) => r.id },
        { header: 'Name', accessor: (r: any) => r.name },
        { header: 'Age', accessor: (r: any) => r.age },
      ];

      const result = service.generate(data, columns);

      expect(result).toBe('ID,Name,Age\n1,Alice,30\n2,Bob,25');
    });

    it('should return empty string for empty data', () => {
      const result = service.generate([], [{ header: 'A', accessor: () => '' }]);
      expect(result).toBe('');
    });

    it('should return empty string for empty columns', () => {
      const result = service.generate([{ a: 1 }], []);
      expect(result).toBe('');
    });

    it('should escape values containing commas', () => {
      const data = [{ name: 'Doe, John' }];
      const columns = [{ header: 'Name', accessor: (r: any) => r.name }];

      const result = service.generate(data, columns);

      expect(result).toBe('Name\n"Doe, John"');
    });

    it('should escape values containing double quotes', () => {
      const data = [{ name: 'Say "hello"' }];
      const columns = [{ header: 'Name', accessor: (r: any) => r.name }];

      const result = service.generate(data, columns);

      expect(result).toBe('Name\n"Say ""hello"""');
    });

    it('should handle null and undefined values', () => {
      const data = [{ a: null, b: undefined }];
      const columns = [
        { header: 'A', accessor: (r: any) => r.a },
        { header: 'B', accessor: (r: any) => r.b },
      ];

      const result = service.generate(data, columns);

      expect(result).toBe('A,B\n,');
    });

    it('should handle Date values', () => {
      const date = new Date('2026-09-15T10:00:00.000Z');
      const data = [{ created: date }];
      const columns = [{ header: 'Created', accessor: (r: any) => r.created }];

      const result = service.generate(data, columns);

      expect(result).toContain('2026-09-15T10:00:00.000Z');
    });

    it('should handle nested objects', () => {
      const data = [{ info: { city: 'Austin', state: 'TX' } }];
      const columns = [{ header: 'Info', accessor: (r: any) => r.info }];

      const result = service.generate(data, columns);

      expect(result).toContain('Austin');
      expect(result).toContain('TX');
    });
  });

  describe('generateFromKeys', () => {
    it('should generate CSV from record keys', () => {
      const data = [{ a: 1, b: 2 }, { a: 3, b: 4 }];

      const result = service.generateFromKeys(data);

      expect(result).toBe('a,b\n1,2\n3,4');
    });

    it('should exclude specified keys', () => {
      const data = [{ a: 1, b: 2, c: 3 }];

      const result = service.generateFromKeys(data, ['b']);

      expect(result).toBe('a,c\n1,3');
    });

    it('should filter out underscore-prefixed keys by default', () => {
      const data = [{ a: 1, _hidden: true }];

      const result = service.generateFromKeys(data);

      expect(result).toBe('a\n1');
    });

    it('should return empty string for empty data', () => {
      expect(service.generateFromKeys([])).toBe('');
    });
  });

  describe('toBuffer', () => {
    it('should convert CSV string to Buffer', () => {
      const csv = 'a,b\n1,2';
      const buffer = service.toBuffer(csv);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString('utf-8')).toBe(csv);
    });
  });
});
