import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

interface ApiStackProps extends cdk.StackProps {
  stageName: string;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  table: dynamodb.Table;
  emailIdentityArn: string;
  fromEmail: string;
  frontendUrls: {
    public: string;
    admin: string;
    greeter: string;
  };
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const libsRoot = path.join(__dirname, '..', '..', '..', '..', 'libs');

    // Secrets
    const stripeApiKey = new secretsmanager.Secret(this, 'StripeApiKey', {
      secretName: `${props.stageName}/event-tickets/stripe-api-key`,
      description: 'Stripe API Secret Key',
    });

    const stripeWebhookSecret = new secretsmanager.Secret(this, 'StripeWebhookSecret', {
      secretName: `${props.stageName}/event-tickets/stripe-webhook-secret`,
      description: 'Stripe Webhook Signing Secret',
    });

    const qrJwtSecret = new secretsmanager.Secret(this, 'QrJwtSecret', {
      secretName: `${props.stageName}/event-tickets/qr-jwt-secret`,
      description: 'JWT Secret for QR Code Signing',
      generateSecretString: {
        passwordLength: 64,
        excludePunctuation: true,
      },
    });

    // Build allowed origins list — CloudFront domains + localhost for dev
    const allowedOrigins = [
      props.frontendUrls.public,
      props.frontendUrls.admin,
      props.frontendUrls.greeter,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ];

    // Common Lambda environment
    const commonEnv: Record<string, string> = {
      TABLE_NAME: props.table.tableName,
      STAGE: props.stageName,
      USER_POOL_ID: props.userPool.userPoolId,
      USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
      FROM_EMAIL: props.fromEmail,
      STRIPE_API_KEY_SECRET_ARN: stripeApiKey.secretArn,
      STRIPE_WEBHOOK_SECRET_ARN: stripeWebhookSecret.secretArn,
      QR_JWT_SECRET_ARN: qrJwtSecret.secretArn,
      ALLOWED_ORIGINS: allowedOrigins.join(','),
    };

    // Common bundling options
    const bundlingOptions: lambdaNode.BundlingOptions = {
      minify: true,
      sourceMap: true,
      target: 'node20',
      format: lambdaNode.OutputFormat.ESM,
      mainFields: ['module', 'main'],
      externalModules: ['@aws-sdk/*'],
    };

    const commonLambdaProps: Partial<lambdaNode.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: commonEnv,
      bundling: bundlingOptions,
    };

    // Helper to create Lambda functions
    const createFunction = (name: string, entry: string, extraEnv?: Record<string, string>): lambdaNode.NodejsFunction => {
      const fn = new lambdaNode.NodejsFunction(this, name, {
        ...commonLambdaProps,
        functionName: `${props.stageName}-event-tickets-${name}`,
        entry,
        environment: { ...commonEnv, ...extraEnv },
      } as lambdaNode.NodejsFunctionProps);
      props.table.grantReadWriteData(fn);
      return fn;
    };

    // Post-confirmation trigger
    const postConfirmation = createFunction(
      'post-confirmation',
      path.join(libsRoot, 'lambda', 'users', 'src', 'post-confirmation.ts')
    );
    props.userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmation);

    // Lambda Authorizer
    const authorizerFn = new lambdaNode.NodejsFunction(this, 'authorizer', {
      ...commonLambdaProps,
      functionName: `${props.stageName}-event-tickets-authorizer`,
      entry: path.join(libsRoot, 'lambda', 'auth', 'src', 'authorizer.ts'),
    } as lambdaNode.NodejsFunctionProps);

    // Event Lambdas
    const listEvents = createFunction('list-events', path.join(libsRoot, 'lambda', 'events', 'src', 'list-events.ts'));
    const getEvent = createFunction('get-event', path.join(libsRoot, 'lambda', 'events', 'src', 'get-event.ts'));
    const createEvent = createFunction('create-event', path.join(libsRoot, 'lambda', 'events', 'src', 'create-event.ts'));
    const updateEvent = createFunction('update-event', path.join(libsRoot, 'lambda', 'events', 'src', 'update-event.ts'));
    const deleteEvent = createFunction('delete-event', path.join(libsRoot, 'lambda', 'events', 'src', 'delete-event.ts'));

    // Ticket Lambdas
    const createCheckout = createFunction(
      'create-checkout',
      path.join(libsRoot, 'lambda', 'tickets', 'src', 'create-checkout.ts'),
      { ALLOWED_ORIGIN: props.frontendUrls.public }
    );
    stripeApiKey.grantRead(createCheckout);

    const stripeWebhook = createFunction(
      'stripe-webhook',
      path.join(libsRoot, 'lambda', 'tickets', 'src', 'stripe-webhook.ts')
    );
    stripeApiKey.grantRead(stripeWebhook);
    stripeWebhookSecret.grantRead(stripeWebhook);
    qrJwtSecret.grantRead(stripeWebhook);

    const listTicketsByEvent = createFunction(
      'list-tickets-by-event',
      path.join(libsRoot, 'lambda', 'tickets', 'src', 'list-tickets-by-event.ts')
    );

    const listTicketsByUser = createFunction(
      'list-tickets-by-user',
      path.join(libsRoot, 'lambda', 'tickets', 'src', 'list-tickets-by-user.ts')
    );

    const getTicket = createFunction(
      'get-ticket',
      path.join(libsRoot, 'lambda', 'tickets', 'src', 'get-ticket.ts')
    );

    const validateTicket = createFunction(
      'validate-ticket',
      path.join(libsRoot, 'lambda', 'tickets', 'src', 'validate-ticket.ts')
    );
    qrJwtSecret.grantRead(validateTicket);

    const issueCompTicket = createFunction(
      'issue-comp-ticket',
      path.join(libsRoot, 'lambda', 'tickets', 'src', 'issue-comp-ticket.ts')
    );
    qrJwtSecret.grantRead(issueCompTicket);

    // Email Lambda
    const sendEmail = createFunction(
      'send-email',
      path.join(libsRoot, 'lambda', 'email', 'src', 'send-email.ts')
    );
    if (props.emailIdentityArn) {
      sendEmail.addToRolePolicy(new iam.PolicyStatement({
        actions: ['ses:SendRawEmail', 'ses:SendEmail'],
        resources: ['*'],
      }));
    }

    // Grant email Lambda invoke to webhook and comp ticket handlers
    sendEmail.grantInvoke(stripeWebhook);
    sendEmail.grantInvoke(issueCompTicket);

    // Add email Lambda ARN to env
    stripeWebhook.addEnvironment('EMAIL_LAMBDA_ARN', sendEmail.functionArn);
    issueCompTicket.addEnvironment('EMAIL_LAMBDA_ARN', sendEmail.functionArn);

    // User Lambdas
    const getUserProfile = createFunction(
      'get-user-profile',
      path.join(libsRoot, 'lambda', 'users', 'src', 'get-user-profile.ts')
    );

    const updateUserProfile = createFunction(
      'update-user-profile',
      path.join(libsRoot, 'lambda', 'users', 'src', 'update-user-profile.ts')
    );

    // API Gateway
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${props.stageName}-event-tickets`,
      deployOptions: {
        stageName: 'v1',
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Custom authorizer
    const tokenAuthorizer = new apigateway.TokenAuthorizer(this, 'TokenAuthorizer', {
      handler: authorizerFn,
      resultsCacheTtl: cdk.Duration.seconds(300),
      identitySource: 'method.request.header.Authorization',
    });

    // Route helpers
    const publicIntegration = (fn: lambda.IFunction) =>
      new apigateway.LambdaIntegration(fn);

    const authIntegration = (fn: lambda.IFunction) => ({
      integration: new apigateway.LambdaIntegration(fn),
      authorizer: tokenAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Routes
    const v1 = api.root;
    const events = v1.addResource('events');
    const eventById = events.addResource('{eventId}');
    const checkout = eventById.addResource('checkout');
    const eventTickets = eventById.addResource('tickets');
    const compTickets = eventTickets.addResource('comp');
    const webhooks = v1.addResource('webhooks');
    const stripeWebhookResource = webhooks.addResource('stripe');
    const users = v1.addResource('users');
    const me = users.addResource('me');
    const myTickets = me.addResource('tickets');
    const tickets = v1.addResource('tickets');
    const ticketById = tickets.addResource('{ticketId}');
    const validateResource = ticketById.addResource('validate');

    // Public routes
    events.addMethod('GET', publicIntegration(listEvents));
    eventById.addMethod('GET', publicIntegration(getEvent));

    // Admin routes
    events.addMethod('POST', publicIntegration(createEvent), {
      authorizer: tokenAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    eventById.addMethod('PUT', publicIntegration(updateEvent), {
      authorizer: tokenAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    eventById.addMethod('DELETE', publicIntegration(deleteEvent), {
      authorizer: tokenAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    eventTickets.addMethod('GET', publicIntegration(listTicketsByEvent), {
      authorizer: tokenAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    compTickets.addMethod('POST', publicIntegration(issueCompTicket), {
      authorizer: tokenAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Authenticated routes
    checkout.addMethod('POST', publicIntegration(createCheckout), {
      authorizer: tokenAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    myTickets.addMethod('GET', publicIntegration(listTicketsByUser), {
      authorizer: tokenAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    ticketById.addMethod('GET', publicIntegration(getTicket), {
      authorizer: tokenAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    me.addMethod('GET', publicIntegration(getUserProfile), {
      authorizer: tokenAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    me.addMethod('PUT', publicIntegration(updateUserProfile), {
      authorizer: tokenAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Greeter routes
    validateResource.addMethod('POST', publicIntegration(validateTicket), {
      authorizer: tokenAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Stripe webhook (no auth - uses Stripe signature verification)
    stripeWebhookResource.addMethod('POST', publicIntegration(stripeWebhook));

    this.apiUrl = api.url;

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      exportName: `${props.stageName}-ApiUrl`,
    });
  }
}
