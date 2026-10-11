$ErrorActionPreference='Stop'
function Can-Parse([string]$Text) {
    $tokens=$null; $errors=$null
    [void][Management.Automation.Language.Parser]::ParseInput($Text,[ref]$tokens,[ref]$errors)
    return ($errors.Count -eq 0)
}
@{
    version=$PSVersionTable.PSVersion.ToString()
    edition=$PSVersionTable.PSEdition
    capabilities=@{
        pipeline_chain_operators=(Can-Parse 'Write-Output a && Write-Output b')
        ternary_operator=(Can-Parse '$true ? 1 : 0')
    }
} | ConvertTo-Json -Depth 4 -Compress
