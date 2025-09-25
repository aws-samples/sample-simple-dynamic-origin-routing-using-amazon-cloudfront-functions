import * as cdk from "aws-cdk-lib";
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as path from 'path';
import * as consts from './consts';
import { Networking } from "./networking";

interface OriginProps {
    networking: Networking;
    originId: string;
    loggingBucket: s3.Bucket;
}


export class Origin extends Construct {
    public alb: elbv2.ApplicationLoadBalancer;
    public id: string;

    constructor(scope: Construct, id: string, props: OriginProps) {
        super(scope, id);

        this.id = props.originId;
        this.alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
            vpc: props.networking.vpc,
            securityGroup: props.networking.httpSecurityGroup,
            internetFacing: true,
        });
        this.alb.logAccessLogs(props.loggingBucket, id.toLowerCase());

        const lambdaRole = this.createLambdaExecutionRole();
        const fn = new NodejsFunction(this, 'NodejsFunction', {
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'handler',
            architecture: lambda.Architecture.ARM_64,
            entry: path.join(consts.ORIGIN.LAMBDA_CODE_PATH, 'index.ts'),
            environment: { ORIGIN_ID: props.originId },
            role: lambdaRole
        });

        const target = new elbv2.ApplicationTargetGroup(this, 'lambda-target-group', {
            targets: [new targets.LambdaTarget(fn)],
            healthCheck: {
                enabled: true,
                interval: cdk.Duration.seconds(5),
                unhealthyThresholdCount: 2,
                healthyThresholdCount: 2,
                timeout: cdk.Duration.seconds(2),
                path: '/',
            }, // (5 + 2) * 2 = 14 seconds before target become unhealthy
        })

        this.alb.addListener('listener', {
            port: 80,
            open: true,
            protocol: elbv2.ApplicationProtocol.HTTP,
            defaultAction: elbv2.ListenerAction.forward([target]),
        });

    }

    private createLambdaExecutionRole(): iam.Role {
        return new iam.Role(this, 'LambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            inlinePolicies: {
                LambdaBasicExecution: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                'logs:CreateLogGroup'
                            ],
                            resources: [
                                `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/lambda/*`
                            ]
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                'logs:CreateLogStream',
                                'logs:PutLogEvents'
                            ],
                            resources: [
                                `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/lambda/*:*`
                            ]
                        })
                    ]
                })
            }
        });
    }
}
