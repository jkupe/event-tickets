import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

interface FrontendStackProps extends cdk.StackProps {
  stageName: string;
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
}

export class FrontendStack extends cdk.Stack {
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

      new cdk.CfnOutput(this, `${appName}BucketName`, {
        value: bucket.bucketName,
        exportName: `${props.stageName}-${appName}-BucketName`,
      });

      new cdk.CfnOutput(this, `${appName}DistributionUrl`, {
        value: `https://${distribution.distributionDomainName}`,
        exportName: `${props.stageName}-${appName}-DistributionUrl`,
      });
    }
  }
}
