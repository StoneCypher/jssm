# Graviton CI benchmark — AWS setup (one-time)

The release workflow (`.github/workflows/nodejs.yml`, `release` job) fires
`graviton_perf.cjs --detached` after the npm publish. It launches one EC2
Graviton instance that runs the whole benchmark itself, pushes results to the
`perf_results` branch, and self-terminates — the workflow does not wait on it.

This needs three AWS objects + one GitHub repo secret. The script consumes them
by name (constants live in `src/scripts/graviton_perf.cjs`):

- SSM SecureString: `/jssm/perf-push-pat`  (constant `PERF_PUSH_PAT_SSM_PARAM`)
- IAM instance profile: `jssm-graviton-perf`  (constant `PERF_INSTANCE_PROFILE`)
- GitHub repo secret: `AWS_GRAVITON_OIDC_ROLE` = the OIDC role ARN

Until `AWS_GRAVITON_OIDC_ROLE` is set, the two release-job steps are skipped
(`if: env.AWS_GRAVITON_OIDC_ROLE != ''`) and both are `continue-on-error`, so the
release itself is never affected by the benchmark.

All examples below assume `us-east-1` (the region hard-coded in the workflow step
and the script default). `<acct>` is your 12-digit AWS account id.

## 1. SSM SecureString PAT

A fine-grained GitHub PAT with **Contents: read and write** on `StoneCypher/jssm`
only — used by the instance to push the `perf_results` branch:

```
aws ssm put-parameter --name /jssm/perf-push-pat --type SecureString \
  --value "<github-pat>" --region us-east-1
```

## 2. Instance profile (the identity the EC2 box assumes)

Role `jssm-graviton-perf-role` trusted by `ec2.amazonaws.com`, with one inline
policy granting read of just that one parameter:

```json
{ "Version": "2012-10-17", "Statement": [
  { "Effect": "Allow", "Action": "ssm:GetParameter",
    "Resource": "arn:aws:ssm:us-east-1:<acct>:parameter/jssm/perf-push-pat" } ] }
```

Then an instance profile **named `jssm-graviton-perf`** containing that role
(the name must match `PERF_INSTANCE_PROFILE`):

```
aws iam create-instance-profile --instance-profile-name jssm-graviton-perf
aws iam add-role-to-instance-profile --instance-profile-name jssm-graviton-perf \
  --role-name jssm-graviton-perf-role
```

## 3. OIDC role (the identity the GitHub runner assumes)

A role assumed via GitHub OIDC. Requires the GitHub OIDC provider
(`token.actions.githubusercontent.com`) to exist in the account first.

Trust policy:

```json
{ "Version": "2012-10-17", "Statement": [
  { "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<acct>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:StoneCypher/jssm:*" } } } ] }
```

Permissions policy:

```json
{ "Version": "2012-10-17", "Statement": [
  { "Effect": "Allow",
    "Action": ["ec2:RunInstances","ec2:CreateTags","ec2:DescribeSubnets","ec2:DescribeVpcs","ssm:GetParameter"],
    "Resource": "*" },
  { "Effect": "Allow", "Action": "iam:PassRole",
    "Resource": "arn:aws:iam::<acct>:role/jssm-graviton-perf-role" } ] }
```

(`iam:PassRole` is what lets `run-instances` attach the instance profile from
step 2; `ssm:GetParameter` here covers the public AL2023 ARM64 AMI alias the
script resolves; `ec2:DescribeSubnets`/`DescribeVpcs` cover subnet auto-detect.)

Finally, set the GitHub repo secret:

```
AWS_GRAVITON_OIDC_ROLE = arn:aws:iam::<acct>:role/<your-oidc-role-name>
```

## Notes

- The detached instance is **SSH-less**: no key pair, no inbound rule; it uses
  the subnet's default egress-only security group. It self-terminates via
  `shutdown -h now` plus a `shutdown -h +<minutes>` dead-man's-switch, with
  `DeleteOnTermination` on its only volume — so launching it is the sole billable
  action and it reaps itself even if anything fails.
- Results land on the `perf_results` branch at `c7g.medium/release-<version>/`
  (`scaling.json`, `construct.prof.txt`, `meta.json`). The publish is **guarded**
  on a produced `scaling.json`, so a failed build never writes a meta-only dir.
- Re-firing the same version is a no-op (the dedup sees `release-<version>/`); pass
  `--force` to re-measure.
- Reclaim a stuck/leaked run manually:
  `node src/scripts/graviton_perf.cjs --cleanup-only --region us-east-1`
  (optionally `--run-id <id>` to target one run).
- To test the launch path without spending anything:
  `node src/scripts/graviton_perf.cjs --detached --release 0.0.0 --commit <sha> --dry-run`
