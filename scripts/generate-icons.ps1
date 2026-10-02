Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\ASUS\.gemini\antigravity-ide\brain\223f98e8-0f04-42fe-8a1b-9114f978512b\studio_emblem_icon_1790919550965.jpg"
if (-not (Test-Path $sourcePath)) {
    Write-Error "Source image not found: $sourcePath"
    exit 1
}

$srcImg = [System.Drawing.Bitmap]::FromFile($sourcePath)

function Resize-Image {
    param(
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height,
        [string]$DestinationPath,
        [double]$InnerScale = 1.0,
        [System.Drawing.Color]$BgColor = [System.Drawing.Color]::FromArgb(11, 18, 43)
    )
    
    $destBitmap = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $brush = New-Object System.Drawing.SolidBrush($BgColor)
    $graphics.FillRectangle($brush, 0, 0, $Width, $Height)

    if ($InnerScale -lt 1.0) {
        $targetW = [int]($Width * $InnerScale)
        $targetH = [int]($Height * $InnerScale)
        $targetX = [int](($Width - $targetW) / 2)
        $targetY = [int](($Height - $targetH) / 2)
        $graphics.DrawImage($Image, $targetX, $targetY, $targetW, $targetH)
    } else {
        $graphics.DrawImage($Image, 0, 0, $Width, $Height)
    }

    $graphics.Dispose()
    
    $dir = [System.IO.Path]::GetDirectoryName($DestinationPath)
    if (-not (Test-Path $dir)) {
        [System.IO.Directory]::CreateDirectory($dir) | Out-Null
    }

    $destBitmap.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBitmap.Dispose()
    Write-Host "Created: $DestinationPath ($Width x $Height)"
}

# 1. Standard PNGs
Resize-Image -Image $srcImg -Width 512 -Height 512 -DestinationPath "$PSScriptRoot\..\public\icons\icon-512.png"
Resize-Image -Image $srcImg -Width 192 -Height 192 -DestinationPath "$PSScriptRoot\..\public\icons\icon-192.png"
Resize-Image -Image $srcImg -Width 512 -Height 512 -DestinationPath "$PSScriptRoot\..\src\app\icon.png"

# 2. Maskable PNGs (safe padded zone for adaptive launcher icons on Android)
Resize-Image -Image $srcImg -Width 512 -Height 512 -InnerScale 0.80 -DestinationPath "$PSScriptRoot\..\public\icons\icon-maskable-512.png"
Resize-Image -Image $srcImg -Width 192 -Height 192 -InnerScale 0.80 -DestinationPath "$PSScriptRoot\..\public\icons\icon-maskable-192.png"

# 3. Apple Touch Icons (iOS Safari / iPad / Home Screen)
Resize-Image -Image $srcImg -Width 180 -Height 180 -DestinationPath "$PSScriptRoot\..\public\icons\apple-touch-icon.png"
Resize-Image -Image $srcImg -Width 180 -Height 180 -DestinationPath "$PSScriptRoot\..\src\app\apple-icon.png"
Resize-Image -Image $srcImg -Width 152 -Height 152 -DestinationPath "$PSScriptRoot\..\public\icons\apple-touch-icon-152.png"
Resize-Image -Image $srcImg -Width 120 -Height 120 -DestinationPath "$PSScriptRoot\..\public\icons\apple-touch-icon-120.png"

# 4. Favicons
Resize-Image -Image $srcImg -Width 32 -Height 32 -DestinationPath "$PSScriptRoot\..\public\icons\favicon-32x32.png"
Resize-Image -Image $srcImg -Width 16 -Height 16 -DestinationPath "$PSScriptRoot\..\public\icons\favicon-16x16.png"

# 5. Build standard Multi-resolution ICO (16, 32, 48)
function Build-Ico {
    param(
        [System.Drawing.Image]$Image,
        [string]$DestinationPath
    )
    
    $sizes = @(16, 32, 48)
    $pngStreams = @()
    
    foreach ($sz in $sizes) {
        $bmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(11, 18, 43))
        $g.FillRectangle($brush, 0, 0, $sz, $sz)
        $g.DrawImage($Image, 0, 0, $sz, $sz)
        $g.Dispose()
        
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        $pngStreams += $ms
    }

    $fs = [System.IO.File]::Create($DestinationPath)
    $writer = New-Object System.IO.BinaryWriter($fs)

    # ICONDIR
    $writer.Write([uint16]0) # Reserved
    $writer.Write([uint16]1) # Type 1 = ICO
    $writer.Write([uint16]$sizes.Count) # Count

    $offset = 6 + (16 * $sizes.Count)
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $sz = $sizes[$i]
        $bytes = $pngStreams[$i].ToArray()
        
        $writer.Write([byte]($sz -band 0xFF)) # Width
        $writer.Write([byte]($sz -band 0xFF)) # Height
        $writer.Write([byte]0)                # Colors
        $writer.Write([byte]0)                # Reserved
        $writer.Write([uint16]1)              # Color planes
        $writer.Write([uint16]32)             # Bits per pixel
        $writer.Write([uint32]$bytes.Length)  # Size of image data
        $writer.Write([uint32]$offset)        # Offset of image data
        
        $offset += $bytes.Length
    }

    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $bytes = $pngStreams[$i].ToArray()
        $writer.Write($bytes)
        $pngStreams[$i].Dispose()
    }

    $writer.Close()
    $fs.Close()
    Write-Host "Created Multi-Res ICO: $DestinationPath"
}

Build-Ico -Image $srcImg -DestinationPath "$PSScriptRoot\..\public\favicon.ico"
Build-Ico -Image $srcImg -DestinationPath "$PSScriptRoot\..\src\app\favicon.ico"

$srcImg.Dispose()
Write-Host "All icons generated successfully!"
