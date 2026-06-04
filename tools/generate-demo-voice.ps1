param(
  [string]$OutputPath = "tmp\\quantra-app-demo-narration.wav",
  [int]$Rate = -1,
  [string]$VoiceName = "",
  [string]$TextPath = ""
)

if (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath = Join-Path (Get-Location) $OutputPath
}

$outputDir = Split-Path -Parent $OutputPath
if (-not [string]::IsNullOrWhiteSpace($outputDir)) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

if (-not [string]::IsNullOrWhiteSpace($TextPath) -and -not [System.IO.Path]::IsPathRooted($TextPath)) {
  $TextPath = Join-Path (Get-Location) $TextPath
}

$narration = if (-not [string]::IsNullOrWhiteSpace($TextPath) -and (Test-Path $TextPath)) {
  Get-Content -Raw -Path $TextPath
} else {
@"
Welcome to Quantra.

This walkthrough shows how a project moves from setup to a priced bill of quantities.

We start on the landing page, sign in to the workspace, and open the dashboard.
From there, a new project is created, the structure type is selected, and the bill items are picked before the BOQ workspace is generated.

Inside the workspace, each row stays simple: description, quantity, rate, and amount.
The detail panel on the right holds the item intelligence.

For quantity generation, Quantra opens the takeoff calculator matched to the item.
Enter the dimensions or count, add any allowance if required, and apply the measured result.
The quantity updates immediately, and the amount is recalculated.

For rate generation, Quantra can use the live benchmark as the default source.
That gives the team a fast market-based starting rate.

When a more defendable commercial build-up is needed, switch to manual and open the pricing studio.
Here the rate is generated from materials, labour, plant, transport, waste, site difficulty, overheads, and profit.

The detailed rate analysis then breaks the unit rate into its cost components and multiplies it by quantity to produce the BOQ amount.

After pricing, the same project can be reviewed in the price library, exported through documents and reports, checked against the calculations guide, adjusted in settings, and finally signed out.
"@
}

$voice = New-Object -ComObject SAPI.SpVoice
$stream = New-Object -ComObject SAPI.SpFileStream

try {
  if (-not [string]::IsNullOrWhiteSpace($VoiceName)) {
    try {
      $matchingVoice = $voice.GetVoices() | Where-Object {
        $_.GetDescription() -like "*$VoiceName*"
      } | Select-Object -First 1

      if ($matchingVoice) {
        $voice.Voice = $matchingVoice
      }
    }
    catch {
      Write-Warning "Could not select requested voice '$VoiceName'. Using the default installed voice."
    }
  }

  $stream.Open($OutputPath, 3, $false)
  $voice.AudioOutputStream = $stream
  $voice.Rate = $Rate
  $null = $voice.Speak($narration)
}
finally {
  try { $stream.Close() } catch { }
}

Write-Output $OutputPath
