import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import { Construct } from 'constructs';

interface EmailStackProps extends cdk.StackProps {
  stageName: string;
  domainName: string;
}

export class EmailStack extends cdk.Stack {
  public readonly emailIdentityArn: string;
  public readonly fromEmail: string;

  constructor(scope: Construct, id: string, props: EmailStackProps) {
    super(scope, id, props);

    if (props.domainName) {
      const identity = new ses.EmailIdentity(this, 'DomainIdentity', {
        identity: ses.Identity.domain(props.domainName),
      });

      this.emailIdentityArn = `arn:aws:ses:${this.region}:${this.account}:identity/${props.domainName}`;
      this.fromEmail = `tickets@${props.domainName}`;

      new cdk.CfnOutput(this, 'EmailIdentityArn', {
        value: this.emailIdentityArn,
        exportName: `${props.stageName}-EmailIdentityArn`,
      });
    } else {
      // Fallback: no domain configured, use placeholder
      this.emailIdentityArn = '';
      this.fromEmail = '';
    }

    new cdk.CfnOutput(this, 'FromEmail', {
      value: this.fromEmail || 'NOT_CONFIGURED',
      exportName: `${props.stageName}-FromEmail`,
    });
  }
}
