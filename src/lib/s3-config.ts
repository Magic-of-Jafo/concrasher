// Central S3 bucket config + a fail-closed guard.
//
// localhost and production share AWS credentials. Historically both also
// wrote to the SAME bucket (`convention-crasher`) with deterministic keys, so
// a local upload could overwrite — and a local delete could destroy — a live
// image while only the local database changed. To isolate them, local sets
// S3_BUCKET_NAME to a development bucket (e.g. convention-crasher-dev); this
// guard refuses any non-production write/delete aimed at the prod bucket.

export const S3_BUCKET = process.env.S3_BUCKET_NAME || '';
export const S3_PUBLIC_BASE = `https://${S3_BUCKET}.s3.us-east-1.amazonaws.com`;

const PROD_BUCKET = 'convention-crasher';

/**
 * Returns an error message if the current environment must not touch the
 * configured bucket, or null when the write/delete is safe to proceed.
 * Fail closed: a non-production environment may never mutate the prod bucket.
 */
export function assertSafeUploadBucket(): string | null {
    if (process.env.NODE_ENV !== 'production' && S3_BUCKET === PROD_BUCKET) {
        return 'Refusing to write to the production S3 bucket from a non-production environment. Set S3_BUCKET_NAME to your development bucket (e.g. convention-crasher-dev) in .env.local.';
    }
    return null;
}
