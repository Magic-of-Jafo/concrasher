# Prisma Studio launcher.
# DATABASE_URL comes from .env.local — never hardcode credentials here;
# this file is tracked in a PUBLIC repo. To point Studio at another
# database, set $env:DATABASE_URL yourself before running this script.
if (-not $env:DATABASE_URL) {
    $line = Select-String -Path .env.local -Pattern '^DATABASE_URL=' | Select-Object -First 1
    if (-not $line) { Write-Error 'DATABASE_URL not set and not found in .env.local'; exit 1 }
    $env:DATABASE_URL = $line.Line -replace '^DATABASE_URL="?(.*?)"?$', '$1'
}
npx prisma studio
