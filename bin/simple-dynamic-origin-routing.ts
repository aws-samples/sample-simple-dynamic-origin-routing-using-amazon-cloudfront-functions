#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';

import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { SimpleDynamicOriginRoutingStack } from '../lib/stack';

const deploymentEnvironment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1"
}

const app = new cdk.App();

new SimpleDynamicOriginRoutingStack(app, 'SimpleDynamicOriginRoutingStack', {
  env: deploymentEnvironment
});

Aspects.of(app).add(new AwsSolutionsChecks());