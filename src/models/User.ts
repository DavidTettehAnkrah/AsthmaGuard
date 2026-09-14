import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, IEmergencyContact, IMedicalNotes } from '@/types';
import { formatPhoneNumberForStorage } from '@/lib/phone';

/**
 * Emergency Contact Schema
 */
const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: {
      type: String,
      required: [true, 'Emergency contact name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be less than 100 characters'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Emergency contact phone number is required'],
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^[\d\s\-\+\(\)]+$/.test(v);
        },
        message: 'Invalid phone number format',
      },
    },
  },
  { _id: false }
);

/**
 * Medical Notes Schema
 */
const medicalNotesSchema = new Schema<IMedicalNotes>(
  {
    asthmaSeverity: {
      type: String,
      enum: {
        values: ['mild', 'moderate', 'severe'],
        message: '{VALUE} is not a valid asthma severity level',
      },
      required: false,
    },
    additionalNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Additional notes must be less than 500 characters'],
    },
  },
  { _id: false }
);

/**
 * User Schema
 */
const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name must be less than 100 characters'],
      validate: {
        validator: function(v: string) {
          return /^[a-zA-Z\s]+$/.test(v);
        },
        message: 'Full name can only contain letters and spaces',
      },
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format',
      },
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^[\d\s\-\+\(\)]+$/.test(v);
        },
        message: 'Invalid phone number format',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    emergencyContacts: {
      type: [emergencyContactSchema],
      default: [],
      validate: {
        validator: function(v: IEmergencyContact[]) {
          return v.length <= 3;
        },
        message: 'Maximum 3 emergency contacts allowed',
      },
    },
    medicalNotes: {
      type: medicalNotesSchema,
      required: false,
      default: () => ({}),
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: '{VALUE} is not a valid user role',
      },
      default: 'user',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc: any, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

/**
 * Indexes for performance
 */
userSchema.index({ createdAt: -1 });

/**
 * Pre-save middleware to hash password and format phone numbers for SMS
 */
userSchema.pre('save', async function(next) {
  // Format primary phone number to international SMS format if modified
  if (this.isModified('phoneNumber') && this.phoneNumber) {
    this.phoneNumber = formatPhoneNumberForStorage(this.phoneNumber);
  }

  // Format emergency contacts phone numbers if modified
  if (this.isModified('emergencyContacts') && Array.isArray(this.emergencyContacts)) {
    this.emergencyContacts.forEach((contact) => {
      if (contact.phoneNumber) {
        contact.phoneNumber = formatPhoneNumberForStorage(contact.phoneNumber);
      }
    });
  }

  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

/**
 * Method to compare password for login
 */
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

/**
 * Static method to find user by email with password
 */
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email }).select('+password');
};

/**
 * Static method to check if email exists
 */
userSchema.statics.emailExists = async function(email: string): Promise<boolean> {
  const user = await this.findOne({ email });
  return !!user;
};

/**
 * Instance method to get public profile
 */
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    email: this.email,
    phoneNumber: this.phoneNumber,
    role: this.role || 'user',
    emergencyContacts: this.emergencyContacts,
    medicalNotes: this.medicalNotes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Define User model interface with methods
 */
interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPublicProfile(): any;
}

interface IUserModel extends Model<IUser, {}, IUserMethods> {
  findByEmail(email: string): Promise<IUser | null>;
  emailExists(email: string): Promise<boolean>;
}

/**
 * Export User model
 * Use existing model if it exists (for hot reloading in development)
 */
const User = (mongoose.models.User as IUserModel) || 
  mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;

