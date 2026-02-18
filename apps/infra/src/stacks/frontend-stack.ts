import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

interface FrontendStackProps extends cdk.StackProps {
  stageName: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly distributionUrls: Record<string, string> = {};
  public readonly buckets: Record<string, s3.Bucket> = {};
  public readonly distributions: Record<string, cloudfront.Distribution> = {};

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const apps = ['public', 'admin', 'greeter'] as const;

    for (const appName of apps) {
      const bucket = new s3.Bucket(this, `${appName}Bucket`, {
        bucketName: `${props.stageName}-event-tickets-${appName}-${this.account}`,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      });

      const oac = new cloudfront.S3OriginAccessControl(this, `${appName}OAC`, {
        signing: cloudfront.Signing.SIGV4_NO_OVERRIDE,
      });

      const distribution = new cloudfront.Distribution(this, `${appName}Distribution`, {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(bucket, {
            originAccessControl: oac,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        defaultRootObject: 'index.html',
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.seconds(0),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.seconds(0),
          },
        ],
      });

      const distributionUrl = `https://${distribution.distributionDomainName}`;
      this.distributionUrls[appName] = distributionUrl;
      this.buckets[appName] = bucket;
      this.distributions[appName] = distribution;

      new cdk.CfnOutput(this, `${appName}BucketName`, {
        value: bucket.bucketName,
        exportName: `${props.stageName}-${appName}-BucketName`,
      });

      new cdk.CfnOutput(this, `${appName}DistributionUrl`, {
        value: distributionUrl,
        exportName: `${props.stageName}-${appName}-DistributionUrl`,
      });
    }
  }

}

interface ConfigDeployStackProps extends cdk.StackProps {
  stageName: string;
  frontendStack: FrontendStack;
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  stripePublishableKey: string;
}

export class ConfigDeployStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ConfigDeployStackProps) {
    super(scope, id, props);

    const region = this.region;
    const apps = ['public', 'admin', 'greeter'] as const;

    for (const appName of apps) {
      const config: Record<string, string> = {
        apiUrl: props.apiUrl,
        userPoolId: props.userPoolId,
        userPoolClientId: props.userPoolClientId,
        region,
      };
      if (appName === 'public' && props.stripePublishableKey) {
        config['stripePublishableKey'] = props.stripePublishableKey;
      }

      new s3deploy.BucketDeployment(this, `${appName}ConfigDeploy`, {
        sources: [s3deploy.Source.jsonData('config.json', config)],
        destinationBucket: props.frontendStack.buckets[appName],
        distribution: props.frontendStack.distributions[appName],
        distributionPaths: ['/config.json'],
        prune: false,
      });
    }
  }
}
