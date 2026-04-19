{
  lib,
  stdenvNoCC,
  nodejs_24,
  pnpm_10,
  fetchPnpmDeps,
  pnpmConfigHook,
  pandoc,
}:
let
  nodejs = nodejs_24;
  pnpm = pnpm_10.override { inherit nodejs; };
in
stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "ed-thomas-dev";
  version = "0.1.0";

  # Build from the site/ directory which contains the Astro project
  src = ../site;

  nativeBuildInputs = [
    nodejs
    pnpm
    pnpmConfigHook
    pandoc
  ];

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    fetcherVersion = 2;
    hash = "sha256-C7uZFyHA7ecAJhUPPwbDFlbb3qZHgfYyrtt3x0SmUQU=";
  };

  env.ASTRO_TELEMETRY_DISABLED = 1;

  buildPhase = ''
    runHook preBuild
    pnpm run build

    echo "Converting HTML to Markdown for SWS --accept-markdown..."
    find dist -type f -name '*.html' | while read -r file; do
      pandoc -f html -t markdown "$file" -o "''${file%.html}.md" || true
    done

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p "$out"
    # Astro outputs to `dist` by default; copy all contents (including dotfiles) to $out
    if [ -d dist ]; then
      cp -r dist/. "$out"
      
      # Ensure .well-known is copied from public if Astro missed it
      if [ -d public/.well-known ]; then
        cp -r public/.well-known "$out/"
      fi
    else
      echo "Error: no dist directory found after build"
      exit 1
    fi

    runHook postInstall
  '';

  meta = {
    description = "Ed Thomas personal website (Astro)";
    homepage = "https://ed-thomas.dev";
    license = lib.licenses.gpl3Plus;
    maintainers = with lib.maintainers; [ pixel-87 ];
  };
})
