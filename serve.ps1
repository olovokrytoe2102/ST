param(
  [int]$Port = 8767,
  [string]$Root = ""
)

if ([string]::IsNullOrWhiteSpace($Root)) {
  $Root = $PSScriptRoot
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
$rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'

while ($listener.IsListening) {
  $context = $listener.GetContext()
  try {
    $relative = [System.Uri]::UnescapeDataString($context.Request.Url.LocalPath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
    $candidate = [System.IO.Path]::GetFullPath((Join-Path $Root ($relative -replace '/', '\')))

    if (-not $candidate.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase) -or
        -not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      $context.Response.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not found')
      $context.Response.ContentType = 'text/plain; charset=utf-8'
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($candidate)
    $types = @{
      '.html'  = 'text/html; charset=utf-8'
      '.css'   = 'text/css; charset=utf-8'
      '.js'    = 'text/javascript; charset=utf-8'
      '.svg'   = 'image/svg+xml'
      '.woff2' = 'font/woff2'
      '.woff'  = 'font/woff'
      '.otf'   = 'font/otf'
      '.ttf'   = 'font/ttf'
      '.mp4'   = 'video/mp4'
      '.png'   = 'image/png'
      '.ico'   = 'image/x-icon'
      '.json'  = 'application/json; charset=utf-8'
      '.md'    = 'text/markdown; charset=utf-8'
    }
    $ext = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
    $context.Response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    try { $context.Response.StatusCode = 500 } catch {}
  } finally {
    try { $context.Response.OutputStream.Close() } catch {}
    try { $context.Response.Close() } catch {}
  }
}
