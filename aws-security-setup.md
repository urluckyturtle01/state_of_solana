# AWS Security Setup - Emergency Response

## 1. Create Emergency Backup Bucket

```bash
# Create a separate backup bucket
aws s3 mb s3://your-app-emergency-backup-bucket --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket your-app-emergency-backup-bucket \
    --versioning-configuration Status=Enabled

# Enable MFA delete protection
aws s3api put-bucket-versioning \
    --bucket your-app-emergency-backup-bucket \
    --versioning-configuration Status=Enabled,MFADelete=Enabled \
    --mfa "arn:aws:iam::ACCOUNT-ID:mfa/root-account-mfa-device SERIAL-NUMBER"
```

## 2. Set Up Cross-Region Replication

```json
{
  "Role": "arn:aws:iam::ACCOUNT-ID:role/replication-role",
  "Rules": [
    {
      "ID": "emergency-backup",
      "Status": "Enabled",
      "Prefix": "",
      "Destination": {
        "Bucket": "arn:aws:s3:::your-app-emergency-backup-bucket",
        "StorageClass": "STANDARD_IA"
      }
    }
  ]
}
```

## 3. Create Restricted IAM Policy for Backup Bucket

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT-ID:user/backup-user"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::your-app-emergency-backup-bucket/*"
    },
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": [
        "s3:DeleteObject",
        "s3:DeleteBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-app-emergency-backup-bucket",
        "arn:aws:s3:::your-app-emergency-backup-bucket/*"
      ]
    }
  ]
}
```

## 4. Enable Bucket Notifications

```json
{
  "CloudWatchConfiguration": {
    "CloudWatchMetrics": {
      "Status": "Enabled"
    }
  },
  "InventoryConfigurations": [
    {
      "Id": "security-inventory",
      "IsEnabled": true,
      "Destination": {
        "S3BucketDestination": {
          "Bucket": "arn:aws:s3:::your-security-logs-bucket",
          "Format": "CSV"
        }
      },
      "Schedule": {
        "Frequency": "Daily"
      }
    }
  ]
}
```

## 5. Create Emergency Access User

```bash
# Create a separate emergency access user
aws iam create-user --user-name emergency-access-user

# Attach minimal required permissions
aws iam attach-user-policy \
    --user-name emergency-access-user \
    --policy-arn arn:aws:iam::ACCOUNT-ID:policy/EmergencyReadOnlyAccess
```

## 6. Set Up CloudTrail Monitoring

```json
{
  "Trail": {
    "Name": "security-monitoring",
    "S3BucketName": "your-security-logs-bucket",
    "IncludeGlobalServiceEvents": true,
    "IsMultiRegionTrail": true,
    "EnableLogFileValidation": true,
    "EventSelectors": [
      {
        "ReadWriteType": "All",
        "IncludeManagementEvents": true,
        "DataResources": [
          {
            "Type": "AWS::S3::Object",
            "Values": ["arn:aws:s3:::your-main-bucket/*"]
          },
          {
            "Type": "AWS::S3::Bucket",
            "Values": ["arn:aws:s3:::your-main-bucket"]
          }
        ]
      }
    ]
  }
}
```

## 7. Application Code Changes for Multiple Buckets

```javascript
// lib/s3-emergency.ts
import AWS from 'aws-sdk';

export class EmergencyS3Manager {
  private s3: AWS.S3;
  private mainBucket: string;
  private backupBucket: string;

  constructor() {
    this.s3 = new AWS.S3();
    this.mainBucket = process.env.AWS_S3_BUCKET!;
    this.backupBucket = process.env.AWS_S3_BACKUP_BUCKET!;
  }

  async uploadWithBackup(key: string, data: any) {
    try {
      // Upload to main bucket
      await this.s3.putObject({
        Bucket: this.mainBucket,
        Key: key,
        Body: data
      }).promise();

      // Backup to emergency bucket
      await this.s3.putObject({
        Bucket: this.backupBucket,
        Key: key,
        Body: data
      }).promise();

      console.log(`✅ Uploaded to both main and backup buckets: ${key}`);
    } catch (error) {
      console.error(`❌ Upload failed:`, error);
      throw error;
    }
  }

  async getFromAnyBucket(key: string) {
    try {
      // Try main bucket first
      return await this.s3.getObject({
        Bucket: this.mainBucket,
        Key: key
      }).promise();
    } catch (error) {
      console.warn(`Main bucket failed, trying backup: ${error.message}`);
      
      // Fallback to backup bucket
      return await this.s3.getObject({
        Bucket: this.backupBucket,
        Key: key
      }).promise();
    }
  }
}
```

## 8. Environment Variables Update

```bash
# Add to your .env files
AWS_S3_BUCKET=your-main-bucket
AWS_S3_BACKUP_BUCKET=your-app-emergency-backup-bucket
AWS_S3_SECURITY_LOGS_BUCKET=your-security-logs-bucket

# Emergency access credentials (read-only)
AWS_EMERGENCY_ACCESS_KEY_ID=xxx
AWS_EMERGENCY_SECRET_ACCESS_KEY=xxx
```

## 9. Monitoring and Alerts

```bash
# Create CloudWatch alarm for suspicious S3 activity
aws cloudwatch put-metric-alarm \
    --alarm-name "S3-Suspicious-Deletes" \
    --alarm-description "Alert on S3 object deletions" \
    --metric-name NumberOfObjects \
    --namespace AWS/S3 \
    --statistic Average \
    --period 300 \
    --threshold 1 \
    --comparison-operator LessThanThreshold \
    --dimensions Name=BucketName,Value=your-main-bucket \
    --evaluation-periods 1
```

## 10. Daily Backup Script

```bash
#!/bin/bash
# daily-backup.sh

DATE=$(date +%Y-%m-%d)
SOURCE_BUCKET="your-main-bucket"
BACKUP_BUCKET="your-app-emergency-backup-bucket"

echo "Starting daily backup: $DATE"

# Sync main bucket to backup bucket
aws s3 sync s3://$SOURCE_BUCKET s3://$BACKUP_BUCKET/daily-backups/$DATE/ \
    --exclude "*.tmp" \
    --exclude "*/.DS_Store"

echo "✅ Backup completed: $DATE"

# Clean up old backups (keep last 30 days)
aws s3 rm s3://$BACKUP_BUCKET/daily-backups/ \
    --recursive \
    --exclude "*" \
    --include "$(date -d '31 days ago' +%Y-%m-%d)*"
``` 