import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from "constructs";

export class Logging extends Construct {
    public bucket: s3.Bucket;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.bucket = new s3.Bucket(this, "Bucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            autoDeleteObjects: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            enforceSSL: true,
            versioned: true,
            objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
            lifecycleRules: [{
                id: 'DeleteOldLogs',
                expiration: cdk.Duration.days(90),
                noncurrentVersionExpiration: cdk.Duration.days(30)
            }],
            serverAccessLogsPrefix: "logging/"
        });

        // Add bucket policy to allow CloudFront to write access logs
        this.bucket.addToResourcePolicy(new iam.PolicyStatement({
            sid: 'AllowCloudFrontServicePrincipalReadWrite',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
            actions: [
                's3:GetBucketAcl',
                's3:PutBucketAcl',
                's3:PutObject',
                's3:PutObjectAcl'
            ],
            resources: [
                this.bucket.bucketArn,
                `${this.bucket.bucketArn}/*`
            ]
        }));

        // Add bucket policy to allow ALB to write access logs
        // ALB service account varies by region - using us-east-1 account
        const albServiceAccount = '127311923021'; // us-east-1 ELB service account
        this.bucket.addToResourcePolicy(new iam.PolicyStatement({
            sid: 'AllowELBServiceAccountWrite',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountPrincipal(albServiceAccount)],
            actions: ['s3:PutObject'],
            resources: [`${this.bucket.bucketArn}/*`]
        }));

        this.bucket.addToResourcePolicy(new iam.PolicyStatement({
            sid: 'AllowELBServiceAccountGetBucketAcl',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountPrincipal(albServiceAccount)],
            actions: ['s3:GetBucketAcl'],
            resources: [this.bucket.bucketArn]
        }));
    }
}
