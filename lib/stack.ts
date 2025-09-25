import * as cdk from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { CDN } from "./cdn";
import * as consts from "./consts";
import { DemoClient } from './demo-client';
import { DNS } from "./dns";
import { Logging } from './logging';
import { Networking } from "./networking";
import { Origin } from "./origin";


export class SimpleDynamicOriginRoutingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Common resources
    const logging = new Logging(this, "Logging");
    const networking = new Networking(this, 'Networking');

    // Origins
    const origins = this.createOrigins(consts.ORIGIN.COUNT, networking, logging);

    // DNS
    const dns = new DNS(this, 'DNS', { origins });

    // Demo - create bucket only
    const demoClient = new DemoClient(this, 'DEMO', { loggingBucket: logging.bucket });

    // CloudFront distribution
    const cdn = new CDN(this, 'CDN', {
      defaultOriginDomain: dns.weigtedDomain,
      directOriginsDomains: dns.directDomains,
      demoClientBucket: demoClient.bucket,
      loggingBucket: logging.bucket
    });

    // Deploy demo app with CloudFront invalidation
    demoClient.deployApp(cdn.distribution);

    // Stack Outputs
    this.createOutputs(origins, dns, cdn);

    // Suppress cdk-nag rules
    this.supressVpcFlowLogs(networking);
    this.suppressLambdaRuntime(this);
    this.suppressCloudFrontWarnings(cdn);
    this.suppressCloudFrontSSLTLS(cdn);
    this.suppressCloudFrontOriginSSL(cdn);
    this.suppressOriginLambdaLoggingPermissions(origins);
    this.suppressCustomResourceHandlerPermissions(demoClient);
    this.suppressCDKBucketDeploymentPermissions(this);
  }

  private createOrigins(count: number, networking: Networking, logging: Logging): Origin[] {
    const originsIds = [...Array(count).keys()]; // [0, 1, ..., N-1]

    const origins: Origin[] = originsIds.map((originId) =>
      new Origin(this, `Origin${originId}`, {
        networking: networking,
        originId: String(originId),
        loggingBucket: logging.bucket
      })
    );

    return origins;
  }

  private createOutputs(origins: Origin[], dns: DNS, cdn: CDN) {
    new cdk.CfnOutput(this, 'DNS-CFN', {
      value: `http://${dns.weigtedDomain}`,
      description: 'Main DNS endpoint'
    });

    dns.directDomains.forEach((domain, index) => {
      new cdk.CfnOutput(this, `DNS-ALB-${index}`, {
        value: `http://${domain}`,
        description: `ALB ${index + 1} direct endpoint`
      });
    });

    origins.forEach((origin, index) => {
      new cdk.CfnOutput(this, `ALB-DNS-Origin${index + 1}`, {
        value: `http://${origin.alb.loadBalancerDnsName}`,
        description: `Origin ${index + 1} ALB DNS name`
      });
    })

    new cdk.CfnOutput(this, 'CDN-CFN', {
      value: `https://${cdn.distribution.domainName}`,
      description: 'CloudFront distribution domain'
    });
  }


  private supressVpcFlowLogs(networking: Networking) {
    // AwsSolutions-VPC7: The VPC does not have an associated Flow Log.

    const applyToChildren = true;
    NagSuppressions.addResourceSuppressions(networking, [
      {
        id: 'AwsSolutions-VPC7',
        reason: 'VPC Flow Logs are not required for this demo application'
      }
    ], applyToChildren);
  }

  private suppressLambdaRuntime(construct: Construct) {
    // AwsSolutions-L1: The non-container Lambda function is not configured to use the latest runtime version.

    const applyToChildren = true;
    NagSuppressions.addResourceSuppressions(construct, [
      {
        id: 'AwsSolutions-L1',
        reason: 'We do not control the custom-resource Lambda functions created by CDK',
      }
    ], applyToChildren);
  }

  private suppressCloudFrontWarnings(cdn: CDN) {
    // AwsSolutions-CFR1: The CloudFront distribution may require Geo restrictions.
    // AwsSolutions-CFR2: The CloudFront distribution may require integration with AWS WAF.

    NagSuppressions.addResourceSuppressions(cdn.distribution, [
      {
        id: 'AwsSolutions-CFR1',
        reason: 'Geo restrictions are not required for this demo application'
      },
      {
        id: 'AwsSolutions-CFR2',
        reason: 'AWS WAF integration is not required for this demo application'
      }
    ]);
  }

  private suppressCloudFrontSSLTLS(cdn: CDN) {
    // AwsSolutions-CFR4: The CloudFront distribution allows for SSLv3 or TLSv1 for HTTPS viewer connections.

    NagSuppressions.addResourceSuppressions(cdn.distribution, [
      {
        id: 'AwsSolutions-CFR4',
        reason: 'TLS 1.2 (2021) is configured and is secure for this demo application'
      }
    ]);
  }

  private suppressCloudFrontOriginSSL(cdn: CDN) {
    // AwsSolutions-CFR5: The CloudFront distributions uses SSLv3 or TLSv1 for communication to the origin.

    NagSuppressions.addResourceSuppressions(cdn.distribution, [
      {
        id: 'AwsSolutions-CFR5',
        reason: 'Using HTTP between CloudFront and ALB - there are security groups to allow only CloudFront reaching ALBs'
      }
    ]);
  }


  private suppressOriginLambdaLoggingPermissions(origins: Origin[]) {
    // AwsSolutions-IAM5: The IAM entity contains wildcard permissions for CloudWatch Logs

    origins.forEach((origin, index) => {
      NagSuppressions.addResourceSuppressionsByPath(
        cdk.Stack.of(origin),
        `/${cdk.Stack.of(origin).stackName}/Origin${index}/LambdaExecutionRole/Resource`,
        [
          {
            id: 'AwsSolutions-IAM5',
            reason: 'CloudWatch Logs requires wildcard permissions for log group and log stream creation in Lambda functions'
          }
        ]
      );
    });
  }

  private suppressCustomResourceHandlerPermissions(demo: DemoClient) {
    // AwsSolutions-IAM5: The IAM entity contains wildcard permissions and does not have a cdk-nag rule suppression

    const applyToChildren = true;
    NagSuppressions.addResourceSuppressions(demo, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'We do not control the IAM permissions for CDK-generated custom resources.'
      }
    ], applyToChildren);
  }

  private suppressCDKBucketDeploymentPermissions(stack: cdk.Stack) {
    // AwsSolutions-IAM4: The IAM user, role, or group uses AWS managed policies
    // AwsSolutions-IAM5: The IAM entity contains wildcard permissions for S3 operations

    const applyToChildren = true;
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      `/${stack.stackName}/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C`,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'CDK BucketDeployment construct uses AWS managed policies that we cannot control. This is a CDK-generated resource for demo deployment.'
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'CDK BucketDeployment construct requires wildcard permissions for S3 operations to deploy assets. We do not control the IAM permissions for this CDK-generated resource.'
        }
      ],
      applyToChildren
    );
  }

}


