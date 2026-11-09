import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { prisma } from '../../config/prisma';

export interface UploadFileOptions {
  fileData: string; // Base64 or Data URI
  fileName: string;
  folder?: 'documents' | 'resumes' | 'avatars' | 'general';
}

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
]);

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
};
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DATA_URI_PATTERN = /^data:([^;,]+);base64,([\s\S]*)$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export class UploadService {
  private static getUploadBaseDir(): string {
    return path.resolve(process.cwd(), 'uploads');
  }

  public static async saveBase64File(options: UploadFileOptions) {
    const { fileData, fileName, folder = 'general' } = options;

    if (!fileData || !fileName) {
      throw new BadRequestError('Both fileData and fileName are required');
    }

    let rawBase64 = fileData;
    let detectedMime = '';
    const dataUriMatch = fileData.match(DATA_URI_PATTERN);
    if (dataUriMatch) {
      detectedMime = dataUriMatch[1].toLowerCase();
      rawBase64 = dataUriMatch[2];
    }

    if (
      !BASE64_PATTERN.test(rawBase64) ||
      rawBase64.length === 0 ||
      rawBase64.length > Math.ceil(MAX_FILE_SIZE / 3) * 4
    ) {
      throw new BadRequestError('File data is not valid base64 or exceeds the 10MB limit');
    }

    const buffer = Buffer.from(rawBase64, 'base64');

    if (buffer.length > MAX_FILE_SIZE || buffer.toString('base64') !== rawBase64) {
      throw new BadRequestError('File exceeds maximum allowed size of 10MB');
    }

    const ext = path.extname(fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !MIME_MAP[ext]) {
      throw new BadRequestError(
        `Unsupported file type '${ext}'. Allowed types: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`
      );
    }

    const mimeType = MIME_MAP[ext];
    if (detectedMime && detectedMime !== mimeType) {
      throw new BadRequestError('File content type does not match the file extension');
    }
    this.validateFileSignature(buffer, ext);

    const cleanFileName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueId = crypto.randomUUID();
    const storedFileName = `${uniqueId}_${cleanFileName}${ext}`;

    if (!['documents', 'resumes', 'avatars', 'general'].includes(folder)) {
      throw new BadRequestError('Unsupported upload folder');
    }

    const targetDir = path.join(this.getUploadBaseDir(), folder);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const filePath = path.join(targetDir, storedFileName);
    await fs.promises.writeFile(filePath, buffer, { flag: 'wx' });

    const fileUrl = `/api/v1/upload/files/${folder}/${storedFileName}`;

    return {
      fileUrl,
      fileName,
      fileSize: buffer.length,
      mimeType,
      storedAs: storedFileName,
    };
  }

  public static async getTenantFilePath(
    organizationId: string,
    folder: string,
    fileName: string
  ): Promise<{ filePath: string; mimeType: string }> {
    if (
      !['documents', 'resumes', 'avatars', 'general'].includes(folder) ||
      path.basename(fileName) !== fileName ||
      !/^[0-9a-f-]{36}_[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/i.test(fileName)
    ) {
      throw new NotFoundError('File not found');
    }

    const fileUrl = `/api/v1/upload/files/${folder}/${fileName}`;
    const legacyFileUrl = `/uploads/${folder}/${fileName}`;
    const [document, expense, candidate] = await Promise.all([
      prisma.employeeDocument.findFirst({
        where: { organizationId, fileUrl: { in: [fileUrl, legacyFileUrl] } },
        select: { id: true },
      }),
      prisma.expenseClaim.findFirst({
        where: { organizationId, receiptUrl: { in: [fileUrl, legacyFileUrl] } },
        select: { id: true },
      }),
      prisma.candidate.findFirst({
        where: { organizationId, resumeUrl: { in: [fileUrl, legacyFileUrl] } },
        select: { id: true },
      }),
    ]);

    if (!document && !expense && !candidate) {
      throw new NotFoundError('File not found');
    }

    const extension = path.extname(fileName).toLowerCase();
    const mimeType = MIME_MAP[extension];
    if (!mimeType) throw new NotFoundError('File not found');

    return {
      filePath: path.join(this.getUploadBaseDir(), folder, fileName),
      mimeType,
    };
  }

  private static validateFileSignature(buffer: Buffer, extension: string): void {
    const startsWith = (...bytes: number[]) =>
      bytes.every((byte, index) => buffer[index] === byte);
    const isZip = startsWith(0x50, 0x4b, 0x03, 0x04);
    const isOle = startsWith(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    const isText = !buffer.subarray(0, 4096).includes(0);

    const valid =
      (extension === '.pdf' && buffer.subarray(0, 5).toString() === '%PDF-') ||
      (extension === '.png' && startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) ||
      (['.jpg', '.jpeg'].includes(extension) && startsWith(0xff, 0xd8, 0xff)) ||
      (extension === '.webp' &&
        buffer.subarray(0, 4).toString() === 'RIFF' &&
        buffer.subarray(8, 12).toString() === 'WEBP') ||
      (['.doc', '.xls'].includes(extension) && isOle) ||
      (['.docx', '.xlsx'].includes(extension) && isZip) ||
      (extension === '.csv' && isText);

    if (!valid) {
      throw new BadRequestError('File contents do not match an allowed file type');
    }
  }
}
