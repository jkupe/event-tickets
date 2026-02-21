#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from './stacks/auth-stack';
import { DatabaseStack } from './stacks/database-stack';
import { EmailStack } from './stacks/email-stack';
import { ApiStack } from './stacks/api-stack';
import { FrontendStack, ConfigDeployStack } from './stacks/frontend-stack';

const app = new cdk.App();

const env = {
  account: process.env['CDK_DEFAULT_ACCOUNT'],
  region: process.env['CDK_DEFAULT_REGION'] || 'us-east-1',
};

const stageName = app.node.tryGetContext('stage') || 'dev';

const databaseStack = new DatabaseStack(app, `${stageName}-EventTickets-Database`, {
  env,
  stageName,
});

const authStack = new AuthStack(app, `${stageName}-EventTickets-Auth`, {
  env,
  stageName,
  table: databaseStack.table,
});
authStack.addDependency(databaseStack);

const emailStack = new EmailStack(app, `${stageName}-EventTickets-Email`, {
  env,
  stageName,
  domainName: app.node.tryGetContext('domain') || '',
});

// FrontendStack is created first to establish CloudFront distribution URLs
const frontendStack = new FrontendStack(app, `${stageName}-EventTickets-Frontend`, {
  env,
  stageName,
});

const apiStack = new ApiStack(app, `${stageName}-EventTickets-Api`, {
  env,
  stageName,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  table: databaseStack.table,
  emailIdentityArn: emailStack.emailIdentityArn,
  fromEmail: emailStack.fromEmail,
  frontendUrls: {
    public: frontendStack.distributionUrls['public'],
    admin: frontendStack.distributionUrls['admin'],
    greeter: frontendStack.distributionUrls['greeter'],
  },
});

apiStack.addDependency(databaseStack);
apiStack.addDependency(emailStack);
apiStack.addDependency(frontendStack);

// Deploy config.json in a separate stack that depends on both Frontend and Api
const configStack = new ConfigDeployStack(app, `${stageName}-EventTickets-Config`, {
  env,
  stageName,
  frontendStack,
  apiUrl: apiStack.apiUrl,
  userPoolId: authStack.userPool.userPoolId,
  userPoolClientId: authStack.userPoolClient.userPoolClientId,
  stripePublishableKey: app.node.tryGetContext('stripePublishableKey') || '',
});
configStack.addDependency(frontendStack);
configStack.addDependency(apiStack);

app.synth();
