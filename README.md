# Event Tickets

A serverless event ticketing platform built with React, AWS CDK, and Nx.

**Public app** for browsing events and purchasing tickets via Stripe. **Admin app** for managing events and attendees. **Greeter app** (PWA) for scanning and validating tickets at the door.

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, TanStack Query |
| API | API Gateway + Lambda (Node.js 20, TypeScript) |
| Auth | Amazon Cognito (email/password, user groups) |
| Database | DynamoDB (single-table design) |
| Payments | Stripe Checkout |
| Email | Amazon SES |
| Hosting | S3 + CloudFront |
| IaC | AWS CDK (TypeScript) |
| Monorepo | Nx |

## Prerequisites

- **Node.js** 20+
- **AWS CLI** configured with a [named profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)
- **AWS CDK** bootstrapped in your account/region (`npx cdk bootstrap`)
- **Stripe account** (for payment processing) — [get API keys](https://dashboard.stripe.com/apikeys)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure AWS profile

Create `apps/infra/.env`:

```
AWS_PROFILE=YourProfileName
```

### 3. Deploy infrastructure

```bash
npx nx run infra:deploy
```

This single command builds all three frontend apps, synthesizes CloudFormation templates, and deploys everything:

- DynamoDB table
- Cognito user pool with `admin` and `greeter` groups
- SES email identity (if domain configured)
- S3 buckets + CloudFront distributions
- API Gateway + Lambda functions
- Frontend app code + runtime config

### 4. Create an admin user

After deployment, CDK outputs the `UserPoolId`. Use it to create your first admin account:

```bash
# Replace <UserPoolId> with the value from deploy output
# Replace <YourProfile> with your AWS profile name

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

Sign in to the admin app using the temporary password. You'll be prompted to set a permanent password on first login.

### 5. Configure Stripe secrets

CDK creates two empty secrets in AWS Secrets Manager. Populate them with your Stripe keys:

```bash
# Replace <YourProfile> with your AWS profile name

aws secretsmanager put-secret-value \
  --secret-id dev/event-tickets/stripe-api-key \
  --secret-string 'sk_test_...' \
  --profile <YourProfile>

aws secretsmanager put-secret-value \
  --secret-id dev/event-tickets/stripe-webhook-secret \
  --secret-string 'whsec_...' \
  --profile <YourProfile>
```

To pass your Stripe publishable key to the frontend:

```bash
npx nx run infra:deploy -- -c stripePublishableKey=pk_test_...
```

### 6. (Optional) Configure email

To enable transactional emails (ticket confirmations, etc.), deploy with a verified domain:

```bash
npx nx run infra:deploy -- -c domain=yourdomain.com
```

After deploying, add the DNS records output by CDK to verify your domain in SES. If your SES account is in sandbox mode, you can only send to verified email addresses — [request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html) to send to any address.

### 7. (Optional) Create a greeter user

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username greeter@example.com \
  --user-attributes Name=email,Value=greeter@example.com Name=name,Value="Greeter" \
  --temporary-password 'TempPass1!' \
  --profile <YourProfile>

aws cognito-idp admin-add-user-to-group \
  --user-pool-id <UserPoolId> \
  --username greeter@example.com \
  --group-name greeter \
  --profile <YourProfile>
```

## Local Development

Run any frontend app locally:

```bash
npx nx serve public    # http://localhost:3000
npx nx serve admin     # http://localhost:3001
npx nx serve greeter   # http://localhost:3002
```

The apps load `config.json` at runtime for API URL and Cognito settings. For local development, create a `public/config.json` in each app's directory with values from your deployed stack outputs.

## Project Structure

```
apps/
  public/         # Customer-facing app (browse events, buy tickets)
  admin/          # Admin app (manage events, view attendees)
  greeter/        # Greeter PWA (scan/validate tickets)
  infra/          # AWS CDK infrastructure
libs/
  lambda/         # Lambda function handlers
    auth/         #   Custom authorizer
    email/        #   Email sending
    events/       #   Event CRUD
    tickets/      #   Checkout, validation, listing
    users/        #   Profile management, post-confirmation trigger
  shared/         # Shared frontend libraries
    api-client/   #   API communication layer
    auth/         #   Authentication utilities
    types/        #   Shared TypeScript types
    ui/           #   React component library
    utils/        #   Utility functions
```

## Nx Commands

```bash
npx nx run infra:synth      # Synthesize CloudFormation templates
npx nx run infra:diff       # Preview infrastructure changes
npx nx run infra:deploy     # Build & deploy everything
npx nx run infra:destroy    # Tear down all stacks
npx nx graph                # Visualize project dependency graph
```

## Teardown

```bash
npx nx run infra:destroy
```

Note: The DynamoDB table and Cognito user pool use `RETAIN` removal policies and will not be deleted automatically. Remove them manually via the AWS Console if needed.
