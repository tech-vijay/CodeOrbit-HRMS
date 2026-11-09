import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('upload security', () => {
  it('requires authentication and tenant context for private uploads', async () => {
    const response = await request(app).post('/api/v1/upload').send({
      fileData: 'data:application/pdf;base64,JVBERi0=',
      fileName: 'file.pdf',
      folder: 'documents',
    });

    expect(response.status).toBe(401);
  });

  it('rejects non-PDF files from the public resume upload route', async () => {
    const response = await request(app).post('/api/v1/upload/public/resume').send({
      fileData: 'data:application/pdf;base64,JVBERi0=',
      fileName: 'resume.docx',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects files whose contents do not match their PDF extension', async () => {
    const response = await request(app).post('/api/v1/upload/public/resume').send({
      fileData: 'data:application/pdf;base64,SGVsbG8=',
      fileName: 'resume.pdf',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('File contents do not match');
  });
});
