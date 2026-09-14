import mongoose, { Schema, Model, Types } from 'mongoose';
import { IDevice, IDeviceMetadata } from '@/types';

/**
 * Device Metadata Schema
 */
const deviceMetadataSchema = new Schema<IDeviceMetadata>(
  {
    model: {
      type: String,
      trim: true,
      maxlength: [50, 'Model name must be less than 50 characters'],
    },
    firmwareVersion: {
      type: String,
      trim: true,
      maxlength: [20, 'Firmware version must be less than 20 characters'],
    },
  },
  { _id: false }
);

/**
 * Device Schema
 */
const deviceSchema = new Schema<IDevice>(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      validate: {
        validator: function(v: string) {
          // Validate MAC address format or alphanumeric serial
          return /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/.test(v) || /^[A-Z0-9\-_]+$/.test(v);
        },
        message: 'Invalid device ID format. Use MAC address (XX:XX:XX:XX:XX:XX) or alphanumeric serial',
      },
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    deviceName: {
      type: String,
      trim: true,
      minlength: [2, 'Device name must be at least 2 characters'],
      maxlength: [50, 'Device name must be less than 50 characters'],
      default: function() {
        return `Device ${this.deviceId.slice(-6)}`;
      },
    },
    registeredAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    lastActive: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: '{VALUE} is not a valid device status',
      },
      default: 'active',
    },
    metadata: {
      type: deviceMetadataSchema,
      default: {},
    },
  },
  {
    timestamps: false, // We use registeredAt instead
    toJSON: {
      transform: function(doc: any, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Indexes for performance
 */
deviceSchema.index({ status: 1 });
deviceSchema.index({ registeredAt: -1 });

/**
 * Compound index for user's devices
 */
deviceSchema.index({ userId: 1, status: 1 });

/**
 * Pre-save middleware to format device ID
 */
deviceSchema.pre('save', function(next) {
  // Ensure device ID is uppercase
  if (this.isModified('deviceId')) {
    this.deviceId = this.deviceId.toUpperCase();
  }
  next();
});

/**
 * Static method to find devices by user
 */
deviceSchema.statics.findByUser = function(userId: string | Types.ObjectId) {
  return this.find({ userId }).sort({ registeredAt: -1 });
};

/**
 * Static method to find active devices by user
 */
deviceSchema.statics.findActiveByUser = function(userId: string | Types.ObjectId) {
  return this.find({ userId, status: 'active' }).sort({ registeredAt: -1 });
};

/**
 * Static method to check if device ID exists
 */
deviceSchema.statics.deviceIdExists = async function(deviceId: string): Promise<boolean> {
  const device = await this.findOne({ deviceId: deviceId.toUpperCase() });
  return !!device;
};

/**
 * Static method to check if user already has a device
 */
deviceSchema.statics.userHasDevice = async function(userId: string | Types.ObjectId): Promise<boolean> {
  const device = await this.findOne({ userId });
  return !!device;
};

/**
 * Static method to count user's devices
 */
deviceSchema.statics.countByUser = function(userId: string | Types.ObjectId): Promise<number> {
  return this.countDocuments({ userId });
};

/**
 * Instance method to update last active timestamp
 */
deviceSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

/**
 * Instance method to activate device
 */
deviceSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

/**
 * Instance method to deactivate device
 */
deviceSchema.methods.deactivate = function() {
  this.status = 'inactive';
  return this.save();
};

/**
 * Instance method to get public device info
 */
deviceSchema.methods.getPublicInfo = function() {
  return {
    id: this._id.toString(),
    deviceId: this.deviceId,
    userId: this.userId.toString(),
    deviceName: this.deviceName,
    registeredAt: this.registeredAt,
    lastActive: this.lastActive,
    status: this.status,
    metadata: this.metadata,
  };
};

/**
 * Define Device model interface with methods
 */
interface IDeviceMethods {
  updateLastActive(): Promise<IDevice>;
  activate(): Promise<IDevice>;
  deactivate(): Promise<IDevice>;
  getPublicInfo(): any;
}

interface IDeviceModel extends Model<IDevice, {}, IDeviceMethods> {
  findByUser(userId: string | Types.ObjectId): Promise<IDevice[]>;
  findActiveByUser(userId: string | Types.ObjectId): Promise<IDevice[]>;
  deviceIdExists(deviceId: string): Promise<boolean>;
  userHasDevice(userId: string | Types.ObjectId): Promise<boolean>;
  countByUser(userId: string | Types.ObjectId): Promise<number>;
}

/**
 * Export Device model
 * Use existing model if it exists (for hot reloading in development)
 */
const Device = (mongoose.models.Device as IDeviceModel) || 
  mongoose.model<IDevice, IDeviceModel>('Device', deviceSchema);

export default Device;

