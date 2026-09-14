import mongoose, { Schema, Model, Types } from 'mongoose';
import { IEmergencyAlert } from '@/types';

/**
 * Emergency Alert Schema
 * Logs every emergency SMS alert sent through the system
 */
const emergencyAlertSchema = new Schema<IEmergencyAlert>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      trim: true,
      uppercase: true,
    },
    recipients: {
      type: [String],
      required: [true, 'At least one recipient is required'],
      validate: {
        validator: function (v: string[]) {
          return v.length > 0;
        },
        message: 'At least one recipient phone number is required',
      },
    },
    message: {
      type: String,
      required: [true, 'Alert message is required'],
      trim: true,
      maxlength: [500, 'Message must be less than 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['sent', 'failed', 'partial'],
        message: '{VALUE} is not a valid alert status',
      },
      required: true,
      default: 'sent',
    },
    sensorData: {
      type: Schema.Types.Mixed,
      default: null,
    },
    arkeselResponse: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.arkeselResponse; // Don't expose raw API response to client
        return ret;
      },
    },
  }
);

/**
 * Indexes for performance
 */
emergencyAlertSchema.index({ userId: 1, createdAt: -1 });
emergencyAlertSchema.index({ deviceId: 1, createdAt: -1 });
emergencyAlertSchema.index({ createdAt: -1 });

/**
 * Static method to find alerts by user
 */
emergencyAlertSchema.statics.findByUser = function (
  userId: string | Types.ObjectId,
  limit: number = 10
) {
  return this.find({ userId }).sort({ createdAt: -1 }).limit(limit);
};

/**
 * Static method to find alerts by device
 */
emergencyAlertSchema.statics.findByDevice = function (
  deviceId: string,
  limit: number = 10
) {
  return this.find({ deviceId: deviceId.toUpperCase() })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Instance method to get public alert info
 */
emergencyAlertSchema.methods.getPublicInfo = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    deviceId: this.deviceId,
    recipients: this.recipients,
    message: this.message,
    status: this.status,
    sensorData: this.sensorData,
    createdAt: this.createdAt,
  };
};

/**
 * Define EmergencyAlert model interface with methods
 */
interface IEmergencyAlertMethods {
  getPublicInfo(): any;
}

interface IEmergencyAlertModel
  extends Model<IEmergencyAlert, {}, IEmergencyAlertMethods> {
  findByUser(
    userId: string | Types.ObjectId,
    limit?: number
  ): Promise<IEmergencyAlert[]>;
  findByDevice(deviceId: string, limit?: number): Promise<IEmergencyAlert[]>;
}

/**
 * Export EmergencyAlert model
 * Use existing model if it exists (for hot reloading in development)
 */
const EmergencyAlert =
  (mongoose.models.EmergencyAlert as IEmergencyAlertModel) ||
  mongoose.model<IEmergencyAlert, IEmergencyAlertModel>(
    'EmergencyAlert',
    emergencyAlertSchema
  );

export default EmergencyAlert;

