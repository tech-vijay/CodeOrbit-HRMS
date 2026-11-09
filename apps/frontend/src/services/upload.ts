import { api } from './api';

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storedAs?: string;
}

export const uploadFile = async (
  file: File,
  folder: 'documents' | 'resumes' | 'avatars' | 'general' = 'general',
  isPublicResume = false
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const fileData = reader.result as string;
        const response = await api.post(isPublicResume ? '/upload/public/resume' : '/upload', {
          fileData,
          fileName: file.name,
          ...(isPublicResume ? {} : { folder }),
        });

        resolve(response.data.data);
      } catch (err: any) {
        reject(
          new Error(
            err.response?.data?.message || err.message || 'Failed to upload file to server'
          )
        );
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file from disk'));
    };

    reader.readAsDataURL(file);
  });
};
