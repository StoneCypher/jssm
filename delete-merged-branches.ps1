<#
.SYNOPSIS
    Delete remote branches that are fully merged into origin/main.

.DESCRIPTION
    Generated 2026-05-12 from `git branch -r --merged origin/main`.

    Default is DRY-RUN: prints `git push --delete` commands without running
    them. Pass -Execute to actually delete the branches on origin.

    Branches are grouped into three tiers so you can review and run
    selectively:

      Tier 1: 2017 + 2022-era long tail (117 branches) - safest
      Tier 2: 4-11 month-old stale       (5 branches)
      Tier 3: Active-era, < 30 days old  (8 branches) - opt-in only

    Tier 3 is OFF by default because some of those branches may still be
    in flight even though their commits are reachable from main (e.g.,
    branches that were merged but you haven't deleted yet because you're
    still iterating on follow-ups).

.PARAMETER Execute
    Actually run the deletions. Without this switch, only prints what
    would happen.

.PARAMETER IncludeActiveEra
    Include Tier 3 (active-era branches). Off by default.

.PARAMETER SkipTier1
    Skip the 2017 + 2022 long tail.

.PARAMETER SkipTier2
    Skip the 4-11 month-old stale branches.

.EXAMPLE
    .\delete-merged-branches.ps1
    Dry-run Tier 1 + Tier 2. Recommended first step.

.EXAMPLE
    .\delete-merged-branches.ps1 -Execute
    Actually delete Tier 1 + Tier 2 (122 branches).

.EXAMPLE
    .\delete-merged-branches.ps1 -SkipTier1
    Dry-run only Tier 2.

.EXAMPLE
    .\delete-merged-branches.ps1 -Execute -IncludeActiveEra
    Delete all 130 merged branches (Tiers 1, 2, and 3).

.NOTES
    Squash-merged PRs will NOT appear here. `--merged` only catches
    branches whose original commits are reachable from main; squash-merge
    creates new SHAs, so the source branch looks "unmerged" to git even
    though its diff has landed.
#>
[CmdletBinding()]
param(
    [switch]$Execute,
    [switch]$IncludeActiveEra,
    [switch]$SkipTier1,
    [switch]$SkipTier2
)

# ---------------------------------------------------------------------------
# Tier 1: 2017 + 2022 long tail (117 branches)
# All older than 1.5 years. Hooks/themes/properties/docs experimentation
# era, plus a couple of 2017 cycle-grammar attempts.
# ---------------------------------------------------------------------------
$Tier1 = @(
    'ActiveAndTerminalState',
    'AddHistoryAndCircularBuffer',
    'AddHooksToReadme',
    'AddInlineStylesToResolver',
    'AddKitchenSinkBenchmark',
    'AddShootout',
    'AddUnicodeTestsForLabels',
    'AllowHooksToChangeData',
    'AllowsOverrideInCompiler',
    'ApiAllActionHook',
    'ApiEntryHooks',
    'ApiExitHooks',
    'ApiForcedTransitionHook',
    'ApiGlobalNamedHooks',
    'ApiStandardTransitionHook',
    'AttemptInterRepoGhaThroughCurl',
    'AttemptInterRepoGhaThroughCurl2',
    'AttemptToCaptureTestResults',
    'AttemptToCorrectQualityDrop',
    'AttemptToCorrectQualityDrop2',
    'AttemptToFixAstral',
    'BoldTheme',
    'BrowserFieldAndWhatAreSmTutScratch',
    'BumpCloc',
    'BumpTsAndTooling',
    'BumpTypedocAndBumpCiNodeVersion',
    'BundleEs6Export',
    'CleanUpTsConfig',
    'CleanupStuff',
    'CyclesAndStripes',
    'DisplayText',
    'DocArrUniqP',
    'DocCss',
    'DocFromSm',
    'DocIsFinalAndStateIsFinal',
    'DocStubs',
    'Doc_Action_Transition_ForceTransition',
    'Doc_Actions_ListStatesHavingAction',
    'Doc_ListEdges_ListTransitions_ListEntrances_ListExits',
    'Doc_State_States_HasState',
    'DocumentArrowDirection',
    'ErrorObject',
    'ExportFieldsForCdnPkg',
    'ExposeColors',
    'ExposeShapes',
    'ExposeThemesAndDirections',
    'ExtensionUpdates',
    'FinalizeDenoSupport',
    'FinishComparisonMatrix',
    'FirstStepsToOperatorAfter',
    'Fix1259PossibleDataLoss',
    'FixActionsOnActionlessStates',
    'FixCarryProblemInTimers',
    'FixChangelogAndAddCommunityPage',
    'FluentAllActionHook',
    'FluentEntryHooks',
    'FluentExitHooks',
    'FluentGlobalNamedHooks',
    'FluentTransitionHooks',
    'GateOffBranchDeploy',
    'GateOffBranchDeploy2',
    'HookActionsConvenienceApi',
    'HookAllTransitions',
    'HooksConvenienceApi',
    'ImproveBenchmark',
    'ImproveDocumentationLayout',
    'ImproveErrorsAndCreateInstanceNamesAndMakeFrom',
    'ImproveFlagGatingHooks',
    'ImproveGhActionsParallelism',
    'IntroducingTheKitchenSinkDragon',
    'LanguageReference',
    'MissingModuleTypeInPackage',
    'MoreComparisonChart',
    'MoreDocumentation',
    'MoreShootout',
    'MoreStabsAtTweeting',
    'MoreTryingToFixTwitterTweeter',
    'MovingToAbstractHooks',
    'NewGraphicAssets',
    'PostHooks',
    'PreventArrangeOfNonNodes',
    'Properties',
    'PropertiesInGrammar',
    'PropertiesSupportStringDefaults',
    'PullArrowsOutIntoModules',
    'PullCompilerOutIntoModule',
    'PullThemesOutIntoModule',
    'PutClocMetricsInReadme',
    'ReAddNode11and12',
    'ReattemptDenoSupport',
    'ReintroduceDisplayText',
    'RemoveNode11and12FromGhActions',
    'RemoveYmlEcho',
    'RenameParserAlready',
    'RequiredProperties',
    'Serialize',
    'SetHooksWithExplicitAction',
    'SetInitialState',
    'SpinUpThemes',
    'StartStateRefining',
    'StartTweetingInGha',
    'StillMoreShootout',
    'StrictProp',
    'SupportForStartAndEndStateStyling',
    'SynonymDoForAction',
    'SynonymGoForTransition',
    'ToolClocForReadme',
    'TrimTweet',
    'TryBenchingWithBenny',
    'TwitterStepAndLineRunRatio',
    'UnifyTransitionAndAction',
    'UnifyTransitionAndForceTransition',
    'UpdateTsAndTypeDocAndTsEslintPlugins',
    'UpdateWorkflowNodeVersions',
    'allows_override',
    'attempt-bump-jssm-viz',
    'next_data',
    'uses_forced_transitions'
)

# ---------------------------------------------------------------------------
# Tier 2: 4-11 month-old stale (5 branches)
# Older than current iteration, newer than the long tail.
# ---------------------------------------------------------------------------
$Tier2 = @(
    'AddAfterHooks',
    'ModernizeRollup',
    'VersionCheckDeserialize_1010',
    'add-claude-github-actions-1769662812820',
    'types-fixes-2'
)

# ---------------------------------------------------------------------------
# Tier 3: Active-era, < 30 days (7 branches) - OPT-IN
# These are recent. Even though `git branch --merged` says their commits
# are on main, you may still be iterating on follow-up work. Review each.
# ---------------------------------------------------------------------------
$Tier3 = @(
    'DescribeAndRepairGrammar',              # 22 hours ago
    'EmbraceJssmViz',                        # 8 days ago
    'GetSeriousAboutStochastics',            # 13 hours ago
    'SwitchToSwc',                           # 8 days ago
    'fix/duplicate-gamma-jsnumericliteral',  # 8 days ago
    'worktree-agent-a1ccd7b21aa5d435d',      # 9 hours ago
    'worktree-agent-a8f7f97a2228b321b'       # 9 hours ago
)

function Remove-RemoteBranch {
    param([string]$Branch)

    if ($Execute) {
        Write-Host "  Deleting origin/$Branch" -ForegroundColor Yellow
        git push origin --delete $Branch
        if (-not $?) {
            Write-Host "    ! Failed (continuing)" -ForegroundColor Red
        }
    } else {
        Write-Host "  [dry-run] git push origin --delete $Branch" -ForegroundColor Cyan
    }
}

function Invoke-Tier {
    param(
        [string]$Name,
        [string[]]$Branches,
        [string]$Color = 'Green'
    )
    Write-Host ""
    Write-Host "=== $Name ($($Branches.Count) branches) ===" -ForegroundColor $Color
    foreach ($b in $Branches) {
        Remove-RemoteBranch -Branch $b
    }
}

$mode = if ($Execute) { 'EXECUTE' } else { 'DRY-RUN' }
Write-Host ""
Write-Host "Mode: $mode" -ForegroundColor $(if ($Execute) { 'Red' } else { 'Cyan' })

$total = 0
if (-not $SkipTier1) {
    Invoke-Tier -Name 'Tier 1: 2017 + 2022 long tail' -Branches $Tier1
    $total += $Tier1.Count
}
if (-not $SkipTier2) {
    Invoke-Tier -Name 'Tier 2: 4-11 month stale' -Branches $Tier2
    $total += $Tier2.Count
}
if ($IncludeActiveEra) {
    Invoke-Tier -Name 'Tier 3: Active-era (OPT-IN)' -Branches $Tier3 -Color 'Yellow'
    $total += $Tier3.Count
}

$verb = if ($Execute) { 'deleted' } else { 'would delete' }
Write-Host ""
Write-Host "Total: $verb $total branches." -ForegroundColor Magenta
if (-not $Execute) {
    Write-Host "Re-run with -Execute to actually delete." -ForegroundColor Cyan
}
