#!/bin/bash

# Emergency S3 Backup Setup Script
# Run this script to quickly set up a secure backup bucket

set -e  # Exit on any error

echo "🚨 Setting up emergency S3 backup bucket..."

# Configuration
MAIN_BUCKET=${1:-"tl-state-of-solana"}
BACKUP_BUCKET="${MAIN_BUCKET}-emergency-backup"
REGION=${AWS_DEFAULT_REGION:-"us-east-1"}

echo "Main bucket: $MAIN_BUCKET"
echo "Backup bucket: $BACKUP_BUCKET"
echo "Region: $REGION"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# 1. Create emergency backup bucket
echo "📦 Creating emergency backup bucket..."
aws s3 mb s3://$BACKUP_BUCKET --region $REGION

# 2. Enable versioning
echo "🔄 Enabling versioning..."
aws s3api put-bucket-versioning \
    --bucket $BACKUP_BUCKET \
    --versioning-configuration Status=Enabled

# 3. Block public access
echo "🔒 Blocking public access..."
aws s3api put-public-access-block \
    --bucket $BACKUP_BUCKET \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# 4. Enable default encryption
echo "🔐 Enabling encryption..."
aws s3api put-bucket-encryption \
    --bucket $BACKUP_BUCKET \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }'

# 5. Create lifecycle policy to manage costs
echo "♻️ Setting up lifecycle policy..."
aws s3api put-bucket-lifecycle-configuration \
    --bucket $BACKUP_BUCKET \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "emergency-backup-lifecycle",
                "Status": "Enabled",
                "Filter": {"Prefix": ""},
                "Transitions": [
                    {
                        "Days": 30,
                        "StorageClass": "STANDARD_IA"
                    },
                    {
                        "Days": 90,
                        "StorageClass": "GLACIER"
                    }
                ]
            }
        ]
    }'

# 6. Copy existing data from main bucket
echo "📋 Copying existing data from main bucket..."
if aws s3 ls s3://$MAIN_BUCKET > /dev/null 2>&1; then
    aws s3 sync s3://$MAIN_BUCKET s3://$BACKUP_BUCKET/initial-backup/ \
        --exclude "*.tmp" \
        --exclude "*/.DS_Store"
    echo "✅ Initial backup completed"
else
    echo "⚠️ Main bucket not found or not accessible"
fi

# 7. Create backup script
echo "📝 Creating backup script..."
cat > backup-to-emergency.sh << EOF
#!/bin/bash
# Daily backup script

DATE=\$(date +%Y-%m-%d)
echo "Starting backup: \$DATE"

aws s3 sync s3://$MAIN_BUCKET s3://$BACKUP_BUCKET/daily/\$DATE/ \\
    --exclude "*.tmp" \\
    --exclude "*/.DS_Store" \\
    --delete

echo "✅ Backup completed: \$DATE"
EOF

chmod +x backup-to-emergency.sh

# 8. Create restore script
echo "📝 Creating restore script..."
cat > restore-from-emergency.sh << EOF
#!/bin/bash
# Emergency restore script

RESTORE_DATE=\${1:-\$(date +%Y-%m-%d)}
echo "Restoring from backup date: \$RESTORE_DATE"

if [ "\$1" == "latest" ]; then
    # Restore from initial backup
    aws s3 sync s3://$BACKUP_BUCKET/initial-backup/ s3://$MAIN_BUCKET/
else
    # Restore from specific date
    aws s3 sync s3://$BACKUP_BUCKET/daily/\$RESTORE_DATE/ s3://$MAIN_BUCKET/
fi

echo "✅ Restore completed"
EOF

chmod +x restore-from-emergency.sh

echo ""
echo "🎉 Emergency backup setup completed!"
echo ""
echo "📋 Summary:"
echo "  • Backup bucket created: $BACKUP_BUCKET"
echo "  • Versioning enabled"
echo "  • Public access blocked"
echo "  • Encryption enabled"
echo "  • Lifecycle policy set (IA after 30 days, Glacier after 90 days)"
echo "  • Initial backup completed"
echo ""
echo "📜 Scripts created:"
echo "  • backup-to-emergency.sh - Run daily backups"
echo "  • restore-from-emergency.sh - Emergency restore"
echo ""
echo "🔧 Next steps:"
echo "  1. Set up MFA delete protection (requires root user)"
echo "  2. Configure CloudTrail monitoring"
echo "  3. Set up CloudWatch alarms"
echo "  4. Schedule daily backups with cron:"
echo "     0 2 * * * /path/to/backup-to-emergency.sh"
echo ""
echo "⚠️ Important:"
echo "  • Change all your AWS credentials immediately"
echo "  • Enable MFA on all IAM users"
echo "  • Review CloudTrail logs for suspicious activity"
echo "  • Consider rotating API keys" 