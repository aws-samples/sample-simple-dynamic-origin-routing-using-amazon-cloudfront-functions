import { Duration } from "aws-cdk-lib";
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from "constructs";
import * as consts from "./consts";
import { Origin } from "./origin";

const getDomainName = (index: string | number) => {
    return `alb-${index}.${consts.DNS.recordName}`;
}

interface DNSProps {
    origins: Origin[];
}


export class DNS extends Construct {
    public weigtedDomain: string;
    public directDomains: string[];

    constructor(scope: Construct, id: string, props: DNSProps) {
        super(scope, id);

        this.weigtedDomain = `${consts.DNS.recordName}.${consts.DNS.zoneName}`;

        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
            zoneName: consts.DNS.zoneName,
            hostedZoneId: consts.DNS.hostedZoneId
        });

        this.directDomains = [];
        // Create DNS records for each ALB
        props.origins.forEach((origin) => {

            new route53.CnameRecord(this, `ALBRecord-${origin.id}`, {
                zone: hostedZone,
                domainName: origin.alb.loadBalancerDnsName,
                ttl: Duration.seconds(0),
                weight: 10, // For demo purposes only. in most cases you would like to use Latency Based routing
                recordName: consts.DNS.recordName,
            });

            // Create Alias record for each ALB
            const albDomainName = getDomainName(origin.id);
            new route53.ARecord(this, `ALBRecord-${origin.id}-direct`, {
                zone: hostedZone,
                target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(origin.alb)),
                recordName: albDomainName,
            });

            this.directDomains.push(`${albDomainName}.${consts.DNS.zoneName}`);
        })
    }
}