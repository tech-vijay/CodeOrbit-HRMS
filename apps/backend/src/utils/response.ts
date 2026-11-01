import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, any>;
  errors?: any;
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  meta?: Record<string, any>
): Response => {
  const body: ApiResponse<T> = {
    success: statusCode >= 200 && statusCode < 300,
    message,
    data,
    meta,
  };
  return res.status(statusCode).json(body);
};

export const sendSuccess = <T>(
  res: Response,
  message = 'Operation successful',
  data?: T,
  meta?: Record<string, any>,
  statusCode = 200
): Response => {
  return sendResponse(res, statusCode, message, data, meta);
};

export const sendCreated = <T>(
  res: Response,
  message = 'Resource created successfully',
  data?: T
): Response => {
  return sendResponse(res, 201, message, data);
};
