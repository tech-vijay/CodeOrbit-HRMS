import { Request, Response, NextFunction } from 'express';
import { UploadService } from './upload.service';
import { sendCreated } from '../../utils/response';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import path from 'path';

export class UploadController {
  public static async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileData, fileName, folder } = req.body;
      const result = await UploadService.saveBase64File({ fileData, fileName, folder });
      sendCreated(res, 'File uploaded successfully', result);
    } catch (error) {
      next(error);
    }
  }

  public static async uploadPublicResume(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { fileData, fileName } = req.body;
      const result = await UploadService.saveBase64File({
        fileData,
        fileName,
        folder: 'resumes',
      });
      sendCreated(res, 'Resume uploaded successfully', result);
    } catch (error) {
      next(error);
    }
  }

  public static async getTenantFile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { folder, fileName } = req.params;
      const permissions = req.tenant!.permissions;
      const allowed =
        req.user!.isSuperAdmin ||
        permissions.includes('*') ||
        (folder === 'resumes' && permissions.includes('recruitment:read')) ||
        (folder === 'documents' &&
          ['employee:read', 'employee:document_manage', 'expense:read'].some((permission) =>
            permissions.includes(permission)
          ));

      if (!allowed) {
        throw new ForbiddenError('You do not have permission to access this file');
      }

      const file = await UploadService.getTenantFilePath(
        req.tenant!.organizationId,
        folder,
        fileName
      );
      res.type(file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fileName)}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store');
      res.sendFile(file.filePath, (error) => {
        if (error) {
          if ('code' in error && error.code === 'ENOENT') {
            next(new NotFoundError('File not found'));
          } else {
            next(error);
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
