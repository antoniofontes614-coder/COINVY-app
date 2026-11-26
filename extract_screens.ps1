Add-Type -AssemblyName System.Drawing

$sourcePath = 'C:\Users\Micro\.gemini\antigravity\brain\697e35b1-4fde-4ff4-ae1a-319f7287abe3\.user_uploaded\media_1795692857448_69019cdc.jpg'
$outputDir = 'C:\Users\Micro\APP GESTOR  FINANCEIRO\client\public\screens'

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$bmp = [System.Drawing.Bitmap]::FromFile($sourcePath)
Write-Output "Source Image: $($bmp.Width) x $($bmp.Height)"

# Coordinates for 10 screens
# Row 1 (y: 280 to 640), Row 2 (y: 655 to 1015)
# Width of each phone mockup is approx 180px, Height is approx 355px

$screens = @(
    @{ Name = "screen-1-dashboard.png"; X = 18;  Y = 286; W = 174; H = 352 },
    @{ Name = "screen-2-categories.png"; X = 206; Y = 286; W = 174; H = 352 },
    @{ Name = "screen-3-goals.png";      X = 394; Y = 286; W = 174; H = 352 },
    @{ Name = "screen-4-bills.png";      X = 582; Y = 286; W = 174; H = 352 },
    @{ Name = "screen-5-income.png";     X = 770; Y = 286; W = 174; H = 352 },
    @{ Name = "screen-6-expenses.png";   X = 18;  Y = 654; W = 174; H = 352 },
    @{ Name = "screen-7-budget.png";     X = 206; Y = 654; W = 174; H = 352 },
    @{ Name = "screen-8-reports.png";    X = 394; Y = 654; W = 174; H = 352 },
    @{ Name = "screen-9-profile.png";    X = 582; Y = 654; W = 174; H = 352 },
    @{ Name = "screen-10-splash.png";    X = 770; Y = 654; W = 174; H = 352 }
)

foreach ($s in $screens) {
    $rect = New-Object System.Drawing.Rectangle($s.X, $s.Y, $s.W, $s.H)
    $cropped = $bmp.Clone($rect, $bmp.PixelFormat)
    $dest = Join-Path $outputDir $s.Name
    $cropped.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    Write-Output "Saved $($s.Name)"
}

$bmp.Dispose()
Write-Output "All 10 screens extracted successfully!"
