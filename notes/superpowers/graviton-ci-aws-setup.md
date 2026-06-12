# Graviton CI benchmark — AWS setup (one-time)

The release workflow (`.github/workflows/nodejs.yml`, `release` job) fires
`graviton_perf.cjs --detached` after the npm publish. It launches one EC2
Graviton instance that runs the whole benchmark itself, uploads results to an
S3 bucket, and self-terminates — the workflow does not wait on it. A nightly
workflow (`.github/workflows/perf_results_sync.yml`) drains the bucket onto
the `perf_results` branch and renders the chart.

**There is deliberately no GitHub credential anywhere in this pipeline.** The
predecessor design stored a contents:write PAT in SSM for the instance to push
with; that PAT went stale via a paste accident, leaked during the debugging,
and its failures were silent (2026-06-12). The S3 design replaces it: the
instance writes with its instance profile, the sync workflow reads with the
OIDC role and pushes with its own ephemeral `GITHUB_TOKEN`.

This needs three AWS objects + one GitHub repo secret. The script consumes them
by name (constants live in `src/scripts/graviton_perf.cjs`):

- S3 bucket: `jssm-perf-results-<acct>`  (constant `PERF_RESULTS_BUCKET`)
- IAM instance profile: `jssm-graviton-perf`  (constant `PERF_INSTANCE_PROFILE`)
- GitHub repo secret: `AWS_GRAVITON_OIDC_ROLE` = the OIDC role ARN

Until `AWS_GRAVITON_OIDC_ROLE` is set, the release-job steps and the nightly
sync skip themselves (`if: env.AWS_GRAVITON_OIDC_ROLE != ''`), so the release
itself is never affected by the benchmark.

All examples below assume `us-east-1` (the region hard-coded in the workflow step
and the script default). `<acct>` is your 12-digit AWS account id.

## 1. Results bucket

Private bucket, default encryption; the name must match `PERF_RESULTS_BUCKET`:

```
aws s3api create-bucket --bucket jssm-perf-results-<acct> --region us-east-1
aws s3api put-public-access-block --bucket jssm-perf-results-<acct> \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

The bucket is a buffer, not the system of record (`perf_results` is); objects
may be left in place — the nightly sync is idempotent — or expired with a
lifecycle rule after ~30 days.

## 2. Instance profile (the identity the EC2 box assumes)

Role `jssm-graviton-perf-role` trusted by `ec2.amazonaws.com`, with one inline
policy granting write of just the results prefix:

```json
{ "Version": "2012-10-17", "Statement": [
  { "Effect": "Allow", "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::jssm-perf-results-<acct>/*" } ] }
```

Then an instance profile **named `jssm-graviton-perf`** containing that role
(the name must match `PERF_INSTANCE_PROFILE`):

```
aws iam create-instance-profile --instance-profile-name jssm-graviton-perf
aws iam add-role-to-instance-profile --instance-profile-name jssm-graviton-perf \
  --role-name jssm-graviton-perf-role
```

(If migrating from the PAT design: the old `ssm:GetParameter` grant on
`/jssm/perf-push-pat` can be removed from this role, and the parameter itself
deleted.)

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

Permissions policy (the `s3:*` statement is what the nightly sync uses):

```json
{ "Version": "2012-10-17", "Statement": [
  { "Effect": "Allow",
    "Action": ["ec2:RunInstances","ec2:CreateTags","ec2:DescribeSubnets","ec2:DescribeVpcs","ssm:GetParameter"],
    "Resource": "*" },
  { "Effect": "Allow",
    "Action": ["s3:ListBucket"],
    "Resource": "arn:aws:s3:::jssm-perf-results-<acct>" },
  { "Effect": "Allow",
    "Action": ["s3:GetObject"],
    "Resource": "arn:aws:s3:::jssm-perf-results-<acct>/*" },
  { "Effect": "Allow", "Action": "iam:PassRole",
    "Resource": "arn:aws:iam::<acct>:role/jssm-graviton-perf-role" } ] }
```

(`iam:PassRole` is what lets `run-instances` attach the instance profile from
step 2; `ssm:GetParameter` here covers the public AL2023 ARM64 AMI alias the
script resolves; `ec2:DescribeSubnets`/`DescribeVpcs` cover subnet auto-detect;
`s3:ListBucket`/`GetObject` cover the nightly `aws s3 sync` pull.)

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
- Results land in the bucket at `c7g.medium/release-<version>/` (`scaling.json`,
  `construct.prof.txt`, `meta.json`) and on the `perf_results` branch at the
  nightly sync (~09:17 UTC; run it sooner with the workflow's manual dispatch).
  The upload is **guarded** on a produced `scaling.json`, so a failed build
  never writes a meta-only dir.
- Because `GITHUB_TOKEN` pushes never trigger workflows, the sync workflow runs
  the chart render itself after a successful sync; `perf_chart.yml`'s push
  trigger continues to serve operator-credential pushes from the SSH-driven PR
  runs.
- Re-firing the same version re-measures only within the pre-sync window (the
  dedup reads `perf_results`, which lags the bucket by up to a day); the
  duplicate upload overwrites the same keys harmlessly.
- Reclaim a stuck/leaked run manually:
  `node src/scripts/graviton_perf.cjs --cleanup-only --region us-east-1`
  (optionally `--run-id <id>` to target one run).
- To test the launch path without spending anything:
  `node src/scripts/graviton_perf.cjs --detached --release 0.0.0 --commit <sha> --dry-run`
