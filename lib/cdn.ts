import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { FunctionRuntime, ImportSource, KeyValueStore } from "aws-cdk-lib/aws-cloudfront";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as consts from "./consts";


interface CDNProps {
    defaultOriginDomain: string;
    directOriginsDomains: string[];
    demoClientBucket: Bucket;
    loggingBucket: Bucket;
}


export class CDN extends Construct {
    public distribution: cloudfront.Distribution;

    constructor(scope: Construct, id: string, props: CDNProps) {
        super(scope, id);

        const kvsSource = this.generateKvsSource(props.defaultOriginDomain, props.directOriginsDomains);
        const kvs = new KeyValueStore(this, 'KVS', {
            comment: 'origin-selection',
            source: ImportSource.fromInline(JSON.stringify(kvsSource)),
        });
        kvs.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

        const cffViewReq = new cloudfront.Function(this, 'FunctionViewerReq', {
            code: cloudfront.FunctionCode.fromFile({ filePath: consts.CDN.VIEWER_REQUEST_CODE }),
            keyValueStore: kvs,
            runtime: FunctionRuntime.JS_2_0
        });
        cffViewReq.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

        const s3Origin = this.createS3OriginAccessControl(props.demoClientBucket);

        this.distribution = this.createDistribution(
            props.defaultOriginDomain,
            s3Origin,
            cffViewReq,
            props.loggingBucket,
            id.toLowerCase()
        );

        props.demoClientBucket.addToResourcePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
            actions: ['s3:GetObject'],
            resources: [`${props.demoClientBucket.bucketArn}/*`],
            conditions: {
                StringEquals: {
                    'AWS:SourceArn': cdk.Stack.of(this).formatArn({
                        service: "cloudfront",
                        resource: this.distribution.distributionId
                    }) //Arn.format( ) `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${this.distribution.distributionId}`
                }
            }
        }));
    }

    private generateKvsSource(defaultOriginDomain: string, directOriginsDomains: string[]) {
        return {
            "data":
                [
                    {
                        "key": "__default__",
                        "value": defaultOriginDomain
                    },
                    ...directOriginsDomains.map((domain, index) => {
                        return {
                            "key": `${index}`,
                            "value": domain
                        }
                    })
                ]
        }
    }

    private createS3OriginAccessControl(bucket: Bucket): cloudfront.IOrigin {
        const originAccessControl = new cloudfront.S3OriginAccessControl(this, 'S3OAC', {
            signing: cloudfront.Signing.SIGV4_NO_OVERRIDE
        });
        const s3Origin = cloudfront_origins.S3BucketOrigin.withOriginAccessControl(bucket, {
            originAccessControl: originAccessControl
        });
        originAccessControl.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

        return s3Origin;
    }
    private createDistribution(defaultOriginDomain: string, s3Origin: cloudfront.IOrigin, cffViewReq: cloudfront.Function, loggingBucket: Bucket, loggingPrefix: string): cloudfront.Distribution {
        const distribution = new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                origin: s3Origin
            },

            additionalBehaviors: {
                '/api': {
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
                    // Use AWS managed CORS policy for preflight support
                    responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
                    origin: new cloudfront_origins.HttpOrigin(defaultOriginDomain, {
                        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
                        keepaliveTimeout: Duration.seconds(1)
                    }),
                    functionAssociations: [
                        { function: cffViewReq, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }
                    ]
                }
            },

            enabled: true,
            comment: 'Edge origin selection demo',
            enableIpv6: true,
            defaultRootObject: 'index.html',

            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html'
                },
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html'
                }
            ],

            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,

            enableLogging: true,
            logBucket: loggingBucket,
            logFilePrefix: loggingPrefix,
        });
        distribution.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

        return distribution;
    }
}