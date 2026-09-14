import { z } from 'zod';

/**
 * Emergency Contact Schema
 */
export const emergencyContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phoneNumber: z.string()
    .regex(/^\+?[0-9]+$/, 'Phone number must contain only numbers, with an optional + at the beginning')
    .min(10, 'Phone number must be at least 10 digits')
    .max(16, 'Phone number cannot exceed 16 characters'),
});

/**
 * Medical Notes Schema
 */
export const medicalNotesSchema = z.object({
  asthmaSeverity: z.enum(['mild', 'moderate', 'severe']).optional(),
  additionalNotes: z.string().max(500, 'Additional notes must be less than 500 characters').optional(),
});

/**
 * User Registration Schema
 */
export const registerSchema = z.object({
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces'),
  
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  
  phoneNumber: z.string()
    .regex(/^\+?[0-9]+$/, 'Phone number must contain only numbers, with an optional + at the beginning')
    .min(10, 'Phone number must be at least 10 digits')
    .max(16, 'Phone number cannot exceed 16 characters'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  confirmPassword: z.string(),
  
  emergencyContacts: z.array(emergencyContactSchema)
    .max(3, 'Maximum 3 emergency contacts allowed')
    .optional()
    .default([]),
  
  medicalNotes: medicalNotesSchema.optional(),

  role: z.enum(['user', 'admin']).default('user'),
  adminSecretCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === 'admin') {
    return !!data.adminSecretCode && data.adminSecretCode.trim().length > 0;
  }
  return true;
}, {
  message: 'Admin access code is required for administrator registration',
  path: ['adminSecretCode'],
});

/**
 * User Login Schema
 */
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(1, 'Password is required'),
});

/**
 * Device Registration Schema
 */
export const deviceRegisterSchema = z.object({
  deviceId: z.string()
    .min(1, 'Device ID is required')
    .max(100, 'Device ID must be less than 100 characters')
    .regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^[A-Za-z0-9\-_]+$/, 'Invalid device ID format. Use MAC address (XX:XX:XX:XX:XX:XX) or alphanumeric serial'),
  
  deviceName: z.string()
    .min(2, 'Device name must be at least 2 characters')
    .max(50, 'Device name must be less than 50 characters')
    .optional(),
  
  metadata: z.object({
    model: z.string().max(50).optional(),
    firmwareVersion: z.string().max(20).optional(),
  }).optional(),
});

/**
 * Device Update Schema
 */
export const deviceUpdateSchema = z.object({
  deviceId: z.string()
    .min(1, 'Device ID is required')
    .refine(
      (val) => /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(val) || /^[A-Za-z0-9\-_]+$/.test(val),
      'Invalid device ID format. Use MAC address (XX:XX:XX:XX:XX:XX) or alphanumeric serial'
    )
    .optional(),
  
  deviceName: z.string()
    .min(2, 'Device name must be at least 2 characters')
    .max(50, 'Device name must be less than 50 characters')
    .optional(),
  
  status: z.enum(['active', 'inactive']).optional(),
  
  metadata: z.object({
    model: z.string().max(50).optional(),
    firmwareVersion: z.string().max(20).optional(),
  }).optional(),
});

/**
 * User Profile Update Schema
 */
export const profileUpdateSchema = z.object({
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces')
    .optional(),
  
  phoneNumber: z.string()
    .regex(/^\+?[0-9]+$/, 'Phone number must contain only numbers, with an optional + at the beginning')
    .min(10, 'Phone number must be at least 10 digits')
    .max(16, 'Phone number cannot exceed 16 characters')
    .optional(),
  
  emergencyContacts: z.array(emergencyContactSchema)
    .max(3, 'Maximum 3 emergency contacts allowed')
    .optional(),
  
  medicalNotes: medicalNotesSchema.optional(),
});

/**
 * Password Change Schema
 */
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"],
});

/**
 * Type exports for form data
 */
export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type DeviceRegisterFormData = z.infer<typeof deviceRegisterSchema>;
export type DeviceUpdateFormData = z.infer<typeof deviceUpdateSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

