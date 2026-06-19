$modelsDir = "public\assets\models"

$modelos = @(
    "foocourt.glb",
    "loboBoy_optimized.glb",
    "monedero.glb",
    "toro2.glb",
    "foodLetrero.glb",
    "ichirakuRamen.glb",
    "geisha_optimized.glb",
    "perroCat.glb",
    "maquina.glb",
    "vestidor.glb",
    "yokaiOkiku.glb",
    "yokaiJorogumo.glb",
    "ramen.glb",
    "foodTable.glb",
    "fresco.glb",
    "plantaSakura.glb",
    "gatoNegroMov.glb",
    "farolaPrueba.glb",
    "guoba.glb",
    "luzNoche.glb",
    "stand.glb",
    "museo.glb"
)

Write-Host "Modelos a comprimir: $($modelos.Count)"

$totalAntes = 0
$totalDespues = 0
$procesados = 0
$errores = 0

foreach ($modelo in $modelos) {
    $ruta = Join-Path $modelsDir $modelo
    
    if (-not (Test-Path $ruta)) {
        Write-Host "no encontrado: $modelo"
        continue
    }
    
    $sizeAntes = (Get-Item $ruta).Length / 1MB
    $totalAntes += $sizeAntes
    $sizaAntesStr = [math]::Round($sizeAntes, 2)
    
    Write-Host "$modelo $sizaAntesStr MB"
    
    $resultado = npx @gltf-transform/cli optimize $ruta $ruta --compress meshopt --flatten false --join false 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $sizeDespues = (Get-Item $ruta).Length / 1MB
        $totalDespues += $sizeDespues
        $reduccion = [math]::Round((1 - $sizeDespues / $sizeAntes) * 100, 1)
        $sizeDespuesStr = [math]::Round($sizeDespues, 2)
        Write-Host " OK -> $sizeDespuesStr MB. reduccion: $reduccion%"
        $procesados++
    } else {
        Write-Host " Error al comprimir $modelo"
        $totalDespues += $sizeAntes
        $errores++
    }
}

Write-Host ""
Write-Host "Resumen"
Write-Host "Procesados: $procesados  Errores: $errores"
$totalAntesStr = [math]::Round($totalAntes, 2)
$totalDespuesStr = [math]::Round($totalDespues, 2)
Write-Host "Antes:   $totalAntesStr MB"
Write-Host "Despues: $totalDespuesStr MB"
if ($totalAntes -gt 0) {
    $reduccionTotal = [math]::Round((1 - $totalDespues / $totalAntes) * 100, 1)
    Write-Host "Reduccion total: $reduccionTotal%" 
}
