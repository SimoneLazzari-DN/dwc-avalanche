# Esporta pitch/DWC-pitch.pptx in PDF usando PowerPoint (deve essere installato).
# Uso:  powershell -ExecutionPolicy Bypass -File pitch\export-pdf.ps1 [-PngDir <cartella>]
param([string]$PngDir = "")

$pptx = Join-Path $PSScriptRoot "DWC-pitch.pptx"
$pdf = Join-Path $PSScriptRoot "DWC-pitch.pdf"
if (-not (Test-Path $pptx)) { throw "Non trovo ${pptx}: prima esegui 'node build-pitch.js'" }

$app = New-Object -ComObject PowerPoint.Application
try {
    # ReadOnly, senza titolo, senza finestra
    $deck = $app.Presentations.Open($pptx, $true, $false, $false)
    $deck.SaveAs($pdf, 32)   # 32 = ppSaveAsPDF
    if ($PngDir) {
        New-Item -ItemType Directory -Force $PngDir | Out-Null
        foreach ($slide in $deck.Slides) {
            $slide.Export((Join-Path $PngDir ("slide-{0}.png" -f $slide.SlideIndex)), "PNG", 1600, 900)
        }
    }
    $deck.Close()
    Write-Output "Creato $pdf"
}
finally {
    $app.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
}
