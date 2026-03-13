#!/usr/bin/env python3
"""
backup_postgres_to_s3.py

Dumps the entire PostgreSQL database (trino_charts) to a file, gzips it,
and uploads to S3.

Usage:
    python3 backup_postgres_to_s3.py

Environment variables needed:
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
    AWS_REGION (default: us-east-1)
    S3_BUCKET_NAME
"""

import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path

# Configuration
DB_NAME = 'trino_charts'
DB_USER = 'root'
DB_HOST = 'localhost'
DB_PORT = 5432
BACKUP_DIR = Path('/tmp/pg_backups')

def main():
    # Check AWS credentials
    aws_key = os.getenv('AWS_ACCESS_KEY_ID')
    aws_secret = os.getenv('AWS_SECRET_ACCESS_KEY')
    aws_region = os.getenv('AWS_REGION', 'us-east-1')
    s3_bucket = os.getenv('S3_BUCKET_NAME')

    if not all([aws_key, aws_secret, s3_bucket]):
        print('❌ Missing AWS credentials or bucket name')
        print('   Set: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME')
        sys.exit(1)

    # Create backup directory
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    dump_file = BACKUP_DIR / f'trino_charts_{timestamp}.sql'
    gzip_file = BACKUP_DIR / f'trino_charts_{timestamp}.sql.gz'
    s3_key = f'postgres-backups/trino_charts_{timestamp}.sql.gz'

    print(f'\n{"="*60}')
    print(f'  PostgreSQL → S3 Backup')
    print(f'{"="*60}\n')

    # Step 1: Dump PostgreSQL database
    print(f'📦 Step 1: Dumping PostgreSQL database...')
    try:
        # Set PGPASSWORD for pg_dump (it's not passed via -p flag)
        dump_env = os.environ.copy()
        dump_env['PGPASSWORD'] = 'root'  # Same as DB_USER password
        
        result = subprocess.run([
            'pg_dump',
            '-h', DB_HOST,
            '-p', str(DB_PORT),
            '-U', DB_USER,
            '-d', DB_NAME,
            '-f', str(dump_file),
            '--no-owner',
            '--no-acl',
            '--exclude-schema=cron',  # Skip pg_cron extension schema
        ], check=True, capture_output=True, text=True, env=dump_env)
        
        dump_size = dump_file.stat().st_size / (1024 * 1024)  # MB
        print(f'   ✅ Dump complete: {dump_file.name} ({dump_size:.1f} MB)')
    except subprocess.CalledProcessError as e:
        print(f'   ❌ pg_dump failed: {e.stderr}')
        sys.exit(1)

    # Step 2: Compress with gzip
    print(f'\n🗜️  Step 2: Compressing with gzip...')
    try:
        subprocess.run(['gzip', str(dump_file)], check=True)
        # gzip replaces the file, so the output is dump_file.gz
        final_file = Path(str(dump_file) + '.gz')
        if not final_file.exists():
            raise FileNotFoundError(f'{final_file} not created')
        gzip_size = final_file.stat().st_size / (1024 * 1024)  # MB
        compression_ratio = (1 - gzip_size / dump_size) * 100
        print(f'   ✅ Compressed: {final_file.name} ({gzip_size:.1f} MB, {compression_ratio:.1f}% smaller)')
    except Exception as e:
        print(f'   ❌ gzip failed: {e}')
        sys.exit(1)

    # Step 3: Upload to S3
    print(f'\n☁️  Step 3: Uploading to S3...')
    print(f'   Bucket: {s3_bucket}')
    print(f'   Key: {s3_key}')
    
    try:
        # Use AWS SDK (boto3)
        import boto3
        s3_client = boto3.client(
            's3',
            region_name=aws_region,
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret
        )

        with open(final_file, 'rb') as f:
            s3_client.put_object(
                Bucket=s3_bucket,
                Key=s3_key,
                Body=f,
                ContentType='application/gzip',
                ServerSideEncryption='AES256'
            )
        
        print(f'   ✅ Upload complete')
        print(f'   S3 URI: s3://{s3_bucket}/{s3_key}')

    except ImportError:
        print('   ⚠️  boto3 not installed, trying AWS CLI...')
        try:
            subprocess.run([
                'aws', 's3', 'cp',
                str(final_file),
                f's3://{s3_bucket}/{s3_key}',
                '--region', aws_region
            ], check=True, env={
                **os.environ,
                'AWS_ACCESS_KEY_ID': aws_key,
                'AWS_SECRET_ACCESS_KEY': aws_secret
            })
            print(f'   ✅ Upload complete via AWS CLI')
        except subprocess.CalledProcessError as e:
            print(f'   ❌ AWS CLI upload failed: {e}')
            sys.exit(1)
        except FileNotFoundError:
            print(f'   ❌ AWS CLI not found. Install boto3 or AWS CLI.')
            sys.exit(1)
    except Exception as e:
        print(f'   ❌ S3 upload failed: {e}')
        sys.exit(1)

    # Step 4: Clean up local file
    print(f'\n🗑️  Step 4: Cleaning up...')
    try:
        final_file.unlink()
        print(f'   ✅ Deleted local backup: {final_file.name}')
    except Exception as e:
        print(f'   ⚠️  Failed to delete local file: {e}')

    print(f'\n{"="*60}')
    print(f'✅ Backup complete!')
    print(f'   Database: {DB_NAME}')
    print(f'   Size: {gzip_size:.1f} MB (compressed)')
    print(f'   Location: s3://{s3_bucket}/{s3_key}')
    print(f'{"="*60}\n')


if __name__ == '__main__':
    main()
