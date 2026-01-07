import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';

type ValidationType = 'body' | 'query' | 'params';

export const validate = (
    schema: any,
    type: ValidationType = 'body'
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req[type];

            // TODO: Add validation library like Zod or Joi
            // const validated = schema.parse(data);
            // req[type] = validated;

            next();
        } catch (error) {
            if (error instanceof Error) {
                next(new AppError(400, error.message));
            } else {
                next(new AppError(400, 'Validation failed'));
            }
        }
    };
};
