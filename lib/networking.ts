import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from "constructs";

export class Networking extends Construct {
    public readonly vpc: ec2.Vpc;
    public readonly httpSecurityGroup: ec2.ISecurityGroup;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // Create VPC
        this.vpc = new ec2.Vpc(this, 'MainVPC', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
            maxAzs: 3,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                }
            ],
            natGateways: 1
        });

        // Create Security Group
        const mutableHttpSecurityGroup = new ec2.SecurityGroup(this, 'MutableHttpSecurityGroup', {
            vpc: this.vpc,
            allowAllOutbound: true,
        });

        mutableHttpSecurityGroup.addIngressRule(
            ec2.Peer.prefixList('pl-3b927c52'),
            ec2.Port.HTTP,
            'Allow HTTP traffic from CloudFront'
        );

        this.httpSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
            this,
            "HttpSecurityGroup",
            mutableHttpSecurityGroup.securityGroupId,
            { mutable: false }
        );


    }
}

