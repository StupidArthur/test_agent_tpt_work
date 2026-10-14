param(
    [Parameter(Mandatory=$true)][string]$EnvironmentId,
    [Parameter(Mandatory=$true)][string]$OutputDirectory,
    [string]$ModuleRoot,
    [switch]$IncludeOptional
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'This adapter supports Windows only; use an OS-specific adapter' }
if ($PSVersionTable.PSVersion -lt [Version]'5.1') { throw 'This adapter requires PowerShell 5.1 or newer; older hosts are not validated' }
if (-not $EnvironmentId.Trim()) { throw 'EnvironmentId must not be empty' }
if (-not $ModuleRoot) { $ModuleRoot = Join-Path $PSScriptRoot '../ui-driver' }
$ModuleRoot = [IO.Path]::GetFullPath($ModuleRoot)
if (-not (Test-Path -LiteralPath $ModuleRoot -PathType Container)) { throw 'ModuleRoot must be an existing project directory' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$started = [DateTime]::UtcNow.ToString('o')
$checks = @()

function Hash-Text([string]$Text) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text)))).Replace('-','').ToLowerInvariant() }
    finally { $sha.Dispose() }
}
function Find-Program([string[]]$Names) {
    foreach ($name in $Names) {
        $cmd = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($cmd) { return $cmd.Source }
    }
    return $null
}
# Arguments are fixed probes, never arbitrary user shell code.
function Run-Probe([string]$Path, [string]$Arguments, [string]$WorkingDirectory=$ModuleRoot, [Text.Encoding]$OutputEncoding=[Text.Encoding]::UTF8) {
    $clock = [Diagnostics.Stopwatch]::StartNew()
    $process = New-Object Diagnostics.Process
    $process.StartInfo = New-Object Diagnostics.ProcessStartInfo
    $process.StartInfo.FileName = $Path
    $process.StartInfo.Arguments = $Arguments
    $process.StartInfo.WorkingDirectory = $WorkingDirectory
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.CreateNoWindow = $true
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    $process.StartInfo.StandardOutputEncoding = $OutputEncoding
    $process.StartInfo.StandardErrorEncoding = $OutputEncoding
    try {
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(10000)) {
            $process.Kill()
            return @{ status='timeout'; path=$Path; arguments=$Arguments; exit_code=$null; stdout=$null; stderr=$null; elapsed_ms=$clock.ElapsedMilliseconds }
        }
        return @{ status=$(if($process.ExitCode -eq 0){'ok'}else{'execution_error'}); path=$Path; arguments=$Arguments; exit_code=$process.ExitCode; stdout=$stdout.GetAwaiter().GetResult().Trim(); stderr=$stderr.GetAwaiter().GetResult().Trim(); elapsed_ms=$clock.ElapsedMilliseconds }
    } catch {
        return @{ status='execution_error'; path=$Path; arguments=$Arguments; exit_code=$null; stdout=$null; stderr=$_.Exception.Message; elapsed_ms=$clock.ElapsedMilliseconds }
    } finally { $clock.Stop(); $process.Dispose() }
}
function Check-Version([string]$Name,[string[]]$Candidates,[string]$Arguments,[string]$Pattern,[bool]$Required=$true,[Text.Encoding]$OutputEncoding=[Text.Encoding]::UTF8) {
    $path = Find-Program $Candidates
    if (-not $path) { return @{ name=$Name; required=$Required; status='missing'; path=$null; version=$null; evidence=$null } }
    $probe = Run-Probe $path $Arguments $ModuleRoot $OutputEncoding
    $version = $null
    if ($probe.status -eq 'ok') {
        $text = $probe.stdout + ' ' + $probe.stderr
        if ($text -match $Pattern) { $version=$Matches[1] }
        else { $probe.status='unrecognized_output' }
    }
    return @{ name=$Name; required=$Required; status=$probe.status; path=$path; version=$version; evidence=$probe }
}

# Test the actual PowerShell host; no dependency on Node or Python for bootstrapping.
$psPath = [Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
$psProbe = Run-Probe $psPath ('-NoProfile -NonInteractive -File "' + (Join-Path $PSScriptRoot 'probe-powershell.ps1') + '"')
$psVersion = $null
$psCapabilities=$null
if ($psProbe.status -eq 'ok') {
    try {
        $psData=$psProbe.stdout | ConvertFrom-Json
        if ($psData.version -notmatch '^\d+\.\d+(?:\.\d+){0,2}$') { throw 'Unrecognized PowerShell version' }
        $psVersion=$psData.version; $psCapabilities=$psData.capabilities
    } catch { $psProbe.status='unrecognized_output' }
}
$checks += @{ name='powershell'; required=$true; status=$psProbe.status; path=$psPath; version=$psVersion; edition=$PSVersionTable.PSEdition; capabilities=$psCapabilities; evidence=$psProbe }
$cmdCandidates = @()
if ($env:ComSpec) { $cmdCandidates += $env:ComSpec }
$cmdCandidates += 'cmd.exe'
$checks += Check-Version 'cmd' $cmdCandidates '/d /u /c ver' '\[.*?([0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9]+)?)\]' $true ([Text.Encoding]::Unicode)
$node = Check-Version 'nodejs' @('node.exe','node') '--version' '^v([0-9]+\.[0-9]+\.[0-9]+)'
$checks += $node

# Probe fallback launchers too: an installed Windows Store alias is not proof of Python.
$attempts = @(); $python = $null
foreach ($candidate in @(@{name='python.exe';args='--version'},@{name='py.exe';args='-3 --version'},@{name='python3';args='--version'},@{name='python';args='--version'})) {
    $p = Check-Version 'python' @($candidate.name) $candidate.args 'Python\s+([0-9]+\.[0-9]+\.[0-9]+)'
    $attempts += $p
    if ($p.status -eq 'ok') { $python=$p; break }
}
if (-not $python) {
    $failed=@($attempts | Where-Object { $_.status -ne 'missing' })
    if ($failed.Count) { $python=$failed[0] } else { $python=$attempts[0] }
}
$python['attempts']=$attempts
$checks += $python

$pw = @{ name='nodejs-playwright'; required=$true; status='not_checked'; version=$null; path=$null; module_root=$ModuleRoot; evidence=$null; packages=@(); scope='Node package import and chromium.connectOverCDP API; no browser launched' }
if ($node.status -ne 'ok') { $pw.status='dependency_unavailable' }
else {
    $probeFile = Join-Path $PSScriptRoot 'probe-playwright.cjs'
    $probe = Run-Probe $node.path ('"' + $probeFile + '"')
    $pw.evidence=$probe
    if ($probe.status -ne 'ok') { $pw.status=$probe.status }
    else {
        try {
            $data = $probe.stdout | ConvertFrom-Json
            $pw.packages=@($data.packages)
            $selected=@($data.packages | Where-Object { $_.status -eq 'ok' }) | Select-Object -First 1
            if ($selected) { $pw.status='ok'; $pw.version=$selected.version; $pw.path=$selected.path; $pw['selected_package']=$selected.name; $pw['chromium_executable']=$selected.chromium_executable }
            else {
                $failed=@($data.packages | Where-Object { $_.status -ne 'missing' })
                $pw.status=$(if($failed.Count){'execution_error'}else{'missing'})
            }
        } catch { $pw.status='unrecognized_output'; $pw['parse_error']=$_.Exception.Message }
    }
}
$checks += $pw
if ($IncludeOptional) {
    $checks += Check-Version 'git' @('git.exe','git') '--version' 'git version\s+([0-9]+\.[0-9]+\.[0-9]+)' $false
    $checks += Check-Version 'ripgrep' @('rg.exe','rg') '--version' 'ripgrep\s+([0-9]+\.[0-9]+\.[0-9]+)' $false
}
$requiredFailures=@($checks | Where-Object { $_.required -and $_.status -ne 'ok' })
$windowsIdentity=@{status='unknown';source='HKLM Windows NT CurrentVersion';values=$null}
try {
    $os = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
    $windowsIdentity=@{status='ok';source='HKLM Windows NT CurrentVersion';values=@{product_name=$os.ProductName;edition_id=$os.EditionID;display_version=$os.DisplayVersion;build=$os.CurrentBuildNumber;update_build_revision=$os.UBR};note='ProductName can retain older branding; use build and actual capabilities, not name alone'}
} catch { $windowsIdentity['error']=$_.Exception.Message }
$result=@{
    schema_version=1; environment_id=$EnvironmentId; started_at_utc=$started; captured_at_utc=[DateTime]::UtcNow.ToString('o')
    host=@{ computer_name=[Environment]::MachineName; platform=[Environment]::OSVersion.Platform.ToString(); os_version=[Environment]::OSVersion.Version.ToString(); windows_identity=$windowsIdentity; dotnet_runtime_version=[Environment]::Version.ToString(); architecture=$env:PROCESSOR_ARCHITECTURE; user_fingerprint=(Hash-Text ([Environment]::UserDomainName+'\'+[Environment]::UserName)); path_fingerprint=(Hash-Text $env:PATH) }
    module_root=$ModuleRoot; checks=@($checks); required_ready=($requiredFailures.Count -eq 0)
    required_failures=@($requiredFailures | ForEach-Object { @{name=$_.name;status=$_.status} })
    reuse=@{ scope='same host, user, execution host and module root'; invalidate_on=@('new environment','tool install/remove/upgrade','PATH change','execution host or permission change','module root or dependency change','unexpected execution failure'); live_detection=$true }
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$id='ENV-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfff')+'-'+[Guid]::NewGuid().ToString('N').Substring(0,8)
$reportPath=Join-Path $OutputDirectory ($id+'.json')
$json=$result | ConvertTo-Json -Depth 16
[IO.File]::WriteAllText($reportPath,$json,(New-Object Text.UTF8Encoding($false)))
$guidePath=Join-Path $OutputDirectory ($id+'.usage.md')
$guide=@(
    '# 本环境工具使用指南', '',
    ('环境：'+$EnvironmentId+'；采集：'+$result.captured_at_utc),
    ('实际 PowerShell：'+$psPath+'；版本：'+$psVersion),
    ('Node 项目依赖范围：'+$ModuleRoot), '',
    ('系统构建：'+$windowsIdentity.values.build+'；更新号：'+$windowsIdentity.values.update_build_revision+'；系统采集状态：'+$windowsIdentity.status),
    '系统名称不决定PowerShell版本；powershell.exe和pwsh.exe是不同宿主，切换后需要更新对应能力。', '',
    '开始大型任务及编写系统命令前读取本页；后续复用。同一环境的版本和能力来自本次探测，不凭操作系统名称推断。', '',
    '## 已探测的 PowerShell 能力', '',
    ('- && / || 链式语法：'+$(if($null -eq $psCapabilities){'未验证'}else{[string]$psCapabilities.pipeline_chain_operators})),
    ('- 三元语法：'+$(if($null -eq $psCapabilities){'未验证'}else{[string]$psCapabilities.ternary_operator})), '',
    '## 本环境命令约定', '',
    '- 时间对齐与耗时分析由主控负责；执行端不另做UTC检测或单独取时。检测报告自动附带采集时间，仅用于证据追溯。',
    '- 当前调用确为 PowerShell 时才使用 PowerShell 语法；CMD 使用 /d /c，不能直接套用 $env:、管道对象和 PowerShell 引号规则。',
    '- PowerShell 能力为 False 时避免对应语法；能力未知时先用保守兼容写法，不当作支持。',
    '- Windows 中调用 npm、npx 等命令前确认解析目标；存在 .ps1/.cmd 多入口且需要 CMD 入口时显式用 npm.cmd/npx.cmd，避免误触脚本执行策略。本次没有放宽执行策略。',
    '- 文件路径作为独立参数或使用 -LiteralPath；不要把生成的文本直接拼成跨 shell 命令。',
    '- JSON 与证据文件显式指定 UTF-8；不要依赖当前主机的默认文本编码。',
    '- 无进程、无监听等合法空结果使用明确空数组；命令异常保留退出码、stderr 和未知值，不自动重试同一写法。',
    '- 不复制旧环境的绝对工具路径、端口或模块解析结果。', '',
    '## 就绪与限制', ''
)
foreach ($check in $checks) { $guide += ('- '+$check.name+'：'+$check.status+'；版本='+$check.version+'；路径='+$check.path) }
$guide += @('',
    '- Playwright 模块可导入和 connectOverCDP 可用，不代表独立浏览器能启动，也不代表目标 CDP 已连接。模块从上面的项目范围解析。',
    '- nodejs-playwright 为ok时复用已选包；playwright-core和playwright任一CDP接口可用即满足接入依赖，不再安装。单个playwright目录不存在不证明缺能力；只在missing且有授权时按项目声明准备依赖。其他失败先诊断，不用安装代替。',
    '- 未检测项目包括 npm/npx 实际运行、其他 shell、管理员权限、业务账号和产品运行状态；任务需要时定向检查。',
    '- 安装、升级、PATH、权限、宿主或项目依赖变化后更新本指南；命令出现兼容性异常时保留原失败，核对本指南并只补测相关能力。',
    '- 本指南的通用命令约定是使用建议；只有“已探测能力”及版本记录代表本轮实际检测结果。')
[IO.File]::WriteAllText($guidePath,($guide -join "`n"),(New-Object Text.UTF8Encoding($false)))
$sources=@($PSCommandPath,(Join-Path $PSScriptRoot 'probe-playwright.cjs'),(Join-Path $PSScriptRoot 'probe-powershell.ps1'))
$manifest=@{ report=@{path=$reportPath;sha256=(Get-FileHash -LiteralPath $reportPath -Algorithm SHA256).Hash.ToLowerInvariant()}; sources=@() }
$manifest['usage_guide']=@{path=$guidePath;sha256=(Get-FileHash -LiteralPath $guidePath -Algorithm SHA256).Hash.ToLowerInvariant()}
foreach ($source in $sources) {
    $hash=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
    $snapshot=Join-Path $OutputDirectory ($hash+[IO.Path]::GetExtension($source))
    if (-not (Test-Path -LiteralPath $snapshot)) { Copy-Item -LiteralPath $source -Destination $snapshot }
    $manifest.sources += @{path=$source;sha256=$hash;snapshot=$snapshot}
}
$manifestPath=Join-Path $OutputDirectory ($id+'.manifest.json')
[IO.File]::WriteAllText($manifestPath,($manifest | ConvertTo-Json -Depth 8),(New-Object Text.UTF8Encoding($false)))
@{environment_id=$EnvironmentId;required_ready=$result.required_ready;checks=@($checks | ForEach-Object { @{name=$_.name;status=$_.status;version=$_.version;required=$_.required} });report=$reportPath;usage_guide=$guidePath;next='Read usage_guide before writing commands; reuse within this environment';manifest=$manifestPath} | ConvertTo-Json -Depth 6
if ($requiredFailures.Count) { exit 2 }
