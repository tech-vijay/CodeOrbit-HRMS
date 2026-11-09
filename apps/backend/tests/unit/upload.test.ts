import { UploadService } from '../../src/modules/upload/upload.service';

describe('UploadService file validation', () => {
  it('rejects invalid base64 data', async () => {
    await expect(
      UploadService.saveBase64File({
        fileData: 'not base64!',
        fileName: 'resume.pdf',
        folder: 'resumes',
      })
    ).rejects.toThrow('valid base64');
  });

  it('rejects content that does not match the declared file type', async () => {
    await expect(
      UploadService.saveBase64File({
        fileData: 'data:application/pdf;base64,SGVsbG8=',
        fileName: 'resume.pdf',
        folder: 'resumes',
      })
    ).rejects.toThrow('File contents do not match');
  });

  it('rejects data URIs with a mismatched declared media type', async () => {
    await expect(
      UploadService.saveBase64File({
        fileData: 'data:text/plain;base64,JVBERi0=',
        fileName: 'resume.pdf',
        folder: 'resumes',
      })
    ).rejects.toThrow('content type does not match');
  });
});
