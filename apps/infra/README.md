# Event Tickets Infrastructure

AWS CDK infrastructure for the Event Tickets platform. See the [root README](../../README.md) for full setup instructions.

## Stacks

Deployed in dependency order:

| Stack | Description |
|-------|-------------|
| **DatabaseStack** | DynamoDB single-table with GSI indexes |
| **AuthStack** | Cognito UserPool, `admin`/`greeter` groups, post-confirmation Lambda |
| **EmailStack** | SES email identity (requires domain context) |
| **FrontendStack** | S3 buckets + CloudFront distributions for public, admin, and greeter apps |
| **ApiStack** | API Gateway, Lambda functions, Secrets Manager secrets |
| **ConfigDeployStack** | Deploys built frontend code + `config.json` to S3, invalidates CloudFront |

## Prerequisites

- AWS CLI configured with a named profile
- Node.js 20+
- CDK bootstrapped: `npx cdk bootstrap aws://<ACCOUNT>/<REGION>`
- Dependencies installed: `npm install` from repo root

## Setup

Create `apps/infra/.env` with your AWS profile:

```
AWS_PROFILE=YourProfileName
```

This file is gitignored and required for all CDK commands.

## Commands

All commands are run via Nx from the repo root. The `synth`, `deploy`, and `diff` targets automatically build all three frontend apps first.

```bash
npx nx run infra:synth      # Build apps + synthesize CloudFormation
npx nx run infra:diff       # Build apps + preview changes
npx nx run infra:deploy     # Build apps + deploy all stacks
npx nx run infra:destroy    # Tear down all stacks
```

## Context Values

Set via `cdk.json` (defaults) or CLI overrides:

| Context Key | Default | Description |
|------------|---------|-------------|
| `stage` | `dev` | Deployment stage name (prefixes all resource names) |
| `domain` | `""` | Domain for SES email identity |
| `stripePublishableKey` | `""` | Stripe publishable key for frontend config |

Example with overrides:

```bash
npx nx run infra:deploy -- -c stage=prod -c domain=example.com -c stripePublishableKey=pk_live_xxx
```

## Post-Deployment

### Create admin user

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com Name=name,Value="Admin" \
  --temporary-password 'TempPass1!' \
  --profile <YourProfile>

aws cognito-idp admin-add-user-to-group \
  --user-pool-id <UserPoolId> \
  --username admin@example.com \
  --group-name admin \
  --profile <YourProfile>
```

### Populate Stripe secrets

CDK creates empty secrets in Secrets Manager. Populate them:

```bash
aws secretsmanager put-secret-value \
  --secret-id dev/event-tickets/stripe-api-key \
  --secret-string 'sk_test_...' \
  --profile <YourProfile>

aws secretsmanager put-secret-value \
  --secret-id dev/event-tickets/stripe-webhook-secret \
  --secret-string 'whsec_...' \
  --profile <YourProfile>
```

### Verify SES domain (if configured)

Add the DNS records from the deploy output to your domain registrar to verify your SES identity.

## Teardown

```bash
npx nx run infra:destroy
```

The DynamoDB table and Cognito user pool use `RETAIN` removal policies — delete them manually via the AWS Console if needed.
