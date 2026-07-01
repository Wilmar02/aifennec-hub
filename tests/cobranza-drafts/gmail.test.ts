import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const { createMock, jwtMock } = vi.hoisted(() => ({
  createMock: vi.fn().mockResolvedValue({ data: { id: 'draft_123' } }),
  jwtMock: vi.fn(),
}));

vi.mock('googleapis', () => ({
  google: {
    auth: { JWT: jwtMock },
    gmail: vi.fn(() => ({ users: { drafts: { create: createMock } } })),
  },
}));

import { createDraft } from '../../src/modules/cobranza-drafts/gmail.js';

let saPath: string;
beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'sa-'));
  saPath = join(dir, 'sa.json');
  writeFileSync(saPath, JSON.stringify({ client_email: 'sa@proj.iam.gserviceaccount.com', private_key: 'KEY' }));
  createMock.mockClear();
  jwtMock.mockClear();
});

describe('createDraft', () => {
  it('impersona el subject y crea el borrador, retornando el id', async () => {
    const id = await createDraft({ saJsonPath: saPath, impersonate: 'wilmar@aifennecia.com', raw: 'RAWDATA' });
    expect(id).toBe('draft_123');
    expect(jwtMock).toHaveBeenCalledWith(expect.objectContaining({
      email: 'sa@proj.iam.gserviceaccount.com',
      subject: 'wilmar@aifennecia.com',
      scopes: ['https://www.googleapis.com/auth/gmail.compose'],
    }));
    expect(createMock).toHaveBeenCalledWith({
      userId: 'me',
      requestBody: { message: { raw: 'RAWDATA' } },
    });
  });
});
