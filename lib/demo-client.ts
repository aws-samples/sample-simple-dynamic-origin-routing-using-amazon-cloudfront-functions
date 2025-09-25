import { DockerImage, RemovalPolicy } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as consts from './consts';

export interface DemoProps {
  /**
   * Optional bucket name. If not provided, a unique name will be generated.
   */
  bucketName?: string;

  /**
   * S3 bucket for storing server access logs from the demo bucket.
   */
  loggingBucket: s3.Bucket;
}

export class DemoClient extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: DemoProps) {
    super(scope, id);

    // Create S3 bucket for demo app
    this.bucket = new s3.Bucket(this, 'DemoBucket', {
      bucketName: props.bucketName,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      serverAccessLogsBucket: props.loggingBucket,
      serverAccessLogsPrefix: id.toLowerCase(),
    });
  }

  /**
   * Deploy the React demo app to S3 with optional CloudFront invalidation
   * Call this after the CloudFront distribution is created
   */
  public deployApp(distribution: cloudfront.Distribution): s3deploy.BucketDeployment {
    // Base deployment configuration
    const sources = [
      s3deploy.Source.asset(consts.DEMO_CLIENT.PATH, {
        bundling: {
          image: DockerImage.fromRegistry('node:22-alpine'),
          command: [
            'sh', '-c', [
              'npm ci',
              'npm run build',
              'cp -r /asset-input/dist/* /asset-output/'
            ].join(' && ')
          ],
          user: 'root',
        },
      })
    ];

    const deployment = new s3deploy.BucketDeployment(this, 'DeployDemoApp', {
      sources,
      destinationBucket: this.bucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    });

    deployment.handlerRole.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudfront:GetInvalidation',
        'cloudfront:CreateInvalidation'
      ],
      resources: ['*']
    }));

    return deployment;


  }
}
