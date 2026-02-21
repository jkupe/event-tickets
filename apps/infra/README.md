# Event Tickets Infrastructure

AWS CDK infrastructure for the Event Tickets platform.

## Stacks

| Stack | Description |
|-------|-------------|
| **DatabaseStack** | DynamoDB table with GSI indexes |
| **AuthStack** | Cognito UserPool, groups, and post-confirmation trigger Lambda |
| **EmailStack** | SES email identity |
| **FrontendStack** | S3 + CloudFront distributions for public, admin, and greeter apps |
| **ApiStack** | API Gateway, Lambda functions, Secrets Manager secrets |
| **ConfigDeployStack** | Deploys `config.json` to frontend S3 buckets |

## Prerequisites

- AWS CLI configured with a named profile
- Node.js 20+
- Nx workspace dependencies installed (`npm install` from repo root)

## Setup

1. Create `apps/infra/.env` with your AWS profile:

   ```
   AWS_PROFILE=YourProfileName
   ```

   This file is gitignored and required for all CDK commands.

2. (Optional) Set context values in `cdk.json` or pass them via CLI:

   - `stage` — deployment stage name (default: `dev`)
   - `domain` — custom domain for SES email identity
   - `stripePublishableKey` — Stripe publishable key for frontend config

## Commands

All commands are run via Nx from the repo root:

```bash
# Synthesize CloudFormation templates
npx nx run infra:synth

# Preview changes
npx nx run infra:diff

# Deploy all stacks
npx nx run infra:deploy

# Destroy all stacks
npx nx run infra:destroy
```

To pass CDK context overrides:

```bash
npx nx run infra:deploy -- -c stage=prod -c stripePublishableKey=pk_live_xxx
```
