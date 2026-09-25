import { extractMentionedUsers } from '../AnnotationsPanel';
import { generateMigrationTestSuite, generatePostmanCollection } from '../MigrationGuide';

describe('issue 431 mention support', () => {
  it('extracts unique valid mentions', () => {
    expect(extractMentionedUsers('@alex please ask @alex and @sam_2')).toEqual(['alex', 'sam_2']);
  });
});

describe('issue 433 migration validation artifacts', () => {
  it('generates Postman and executable validation artifacts', () => {
    const collection = JSON.parse(generatePostmanCollection());
    expect(collection.info.name).toContain('Migration Validation');
    expect(collection.item.length).toBeGreaterThan(0);
    expect(generateMigrationTestSuite()).toContain('process.env.PROXYPAY_API_KEY');
  });
});
