import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { articleStorage } from '../src/modules/articles/article.storage';
import { buildSamplePdf } from '../src/shared/sample-pdf';

describe('PDF validation', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'pdf-test-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('accepts a real PDF', async () => {
    const file = path.join(dir, 'ok.pdf');
    await writeFile(file, buildSamplePdf('Hello (world)', ['line one']));
    await expect(articleStorage.assertPdf(file)).resolves.toBeUndefined();
  });

  it('rejects non-PDF content regardless of the declared type', async () => {
    const file = path.join(dir, 'evil.pdf');
    await writeFile(file, '<html><script>alert(1)</script></html>');
    await expect(articleStorage.assertPdf(file)).rejects.toMatchObject({ status: 415 });
  });

  it('rejects empty files', async () => {
    const file = path.join(dir, 'empty.pdf');
    await writeFile(file, '');
    await expect(articleStorage.assertPdf(file)).rejects.toMatchObject({ status: 415 });
  });
});
