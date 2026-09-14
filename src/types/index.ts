import { Types, Document } from 'mongoose';

// User Types
export interface IEmergencyContact {
  name: string;
  phoneNumber: string;
}

export interface IMedicalNotes {
  asthmaSeverity?: 'mild' | 'moderate' | 'severe';
  additionalNotes?: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'user' | 'admin';
  emergencyContacts: IEmergencyContact[];
  medicalNotes?: IMedicalNotes;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPublicProfile(): any;
}

export interface IUserResponse {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  emergencyContacts: IEmergencyContact[];
  medicalNotes?: IMedicalNotes;
  createdAt: string;
  updatedAt: string;
}

// Device Types
export interface IDeviceMetadata {
  model?: string;
  firmwareVersion?: string;
}

export interface IDevice extends Document {
  _id: Types.ObjectId;
  deviceId: string;
  userId: Types.ObjectId;
  deviceName?: string;
  registeredAt: Date;
  lastActive?: Date;
  status: 'active' | 'inactive';
  metadata?: IDeviceMetadata;
  updateLastActive(): Promise<IDevice>;
  activate(): Promise<IDevice>;
  deactivate(): Promise<IDevice>;
  getPublicInfo(): any;
}

export interface IDeviceResponse {
  id: string;
  deviceId: string;
  userId: string;
  deviceName?: string;
  registeredAt: string;
  lastActive?: string;
  status: 'active' | 'inactive';
  metadata?: IDeviceMetadata;
}

// Auth Types
export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  role?: 'user' | 'admin';
  adminSecretCode?: string;
  emergencyContacts?: IEmergencyContact[];
  medicalNotes?: IMedicalNotes;
}

export interface IAuthResponse {
  success: boolean;
  message: string;
  user?: IUserResponse;
  token?: string;
}

// Device Registration Types
export interface IDeviceRegisterRequest {
  deviceId: string;
  deviceName?: string;
  metadata?: IDeviceMetadata;
}

// API Response Types
export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface IApiError {
  success: false;
  message: string;
  error: string;
  statusCode: number;
}

// Session Types
export interface ISession {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  expires: string;
}

// Form Types
export interface ILoginFormData {
  email: string;
  password: string;
}

export interface IRegisterFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  role?: 'user' | 'admin';
  adminSecretCode?: string;
  emergencyContact1Name?: string;
  emergencyContact1Phone?: string;
  emergencyContact2Name?: string;
  emergencyContact2Phone?: string;
  emergencyContact3Name?: string;
  emergencyContact3Phone?: string;
  asthmaSeverity?: 'mild' | 'moderate' | 'severe';
  additionalNotes?: string;
}

export interface IDeviceFormData {
  deviceId: string;
  deviceName?: string;
  model?: string;
  firmwareVersion?: string;
}

// Validation Error Types
export interface IValidationError {
  field: string;
  message: string;
}

// JWT Payload Types
export interface IJWTPayload {
  userId: string;
  email: string;
  role?: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

// Admin Management Types
export interface IAdminUserItem {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  emergencyContacts: IEmergencyContact[];
  medicalNotes?: IMedicalNotes;
  devices: IDeviceResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface IAdminStats {
  totalUsers: number;
  totalAdmins: number;
  totalPatients: number;
  totalDevices: number;
}

// Emergency Alert Types
export interface IEmergencyAlert extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  deviceId: string;
  recipients: string[];
  message: string;
  status: 'sent' | 'failed' | 'partial';
  sensorData?: Record<string, any>;
  arkeselResponse?: Record<string, any>;
  createdAt: Date;
}

export interface IEmergencyAlertResponse {
  id: string;
  userId: string;
  deviceId: string;
  recipients: string[];
  message: string;
  status: 'sent' | 'failed' | 'partial';
  sensorData?: Record<string, any>;
  createdAt: string;
}

export interface IDeviceAlertRequest {
  deviceId: string;
  sensorData?: {
    temperature?: number;
    humidity?: number;
    gasLevel?: number;
    heartRate?: number;
    spO2?: number;
    [key: string]: any;
  };
  message?: string;
}

export interface IArkeselSMSResponse {
  code: string;
  message: string;
  data?: any;
}

