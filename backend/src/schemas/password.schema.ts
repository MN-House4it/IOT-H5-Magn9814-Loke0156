import Joi from '@/joi';

export const PasswordSchema = Joi.string()
  .min(8)
  .max(255)
  .pattern(/[A-Z]/, 'one uppercase letter')
  .pattern(/[a-z]/, 'one lowercase letter')
  .pattern(/[0-9]/, 'one number')
  .pattern(/[!@#$%^&*(),.?":{}|<>=´`'£¤/7/\\\]§;]/, 'one special character')
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.name': 'Password must contain {#name}',
  });
