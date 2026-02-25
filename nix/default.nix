{
  lib,
  stdenvNoCC,
  nodejs_24,
  pnpm_10,
  fetchPnpmDeps,
  pnpmConfigHook,
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
  ];

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    fetcherVersion = 2;
    hash = "sha256-WeDopap6rDSAPIylK61eaklOGvr92I8xnxAgKhi5u1w=";
  };

  env.ASTRO_TELEMETRY_DISABLED = 1;

  buildPhase = ''
    runHook preBuild
    pnpm run build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p "$out"
    # Astro outputs to `dist` by default; copy all contents (including dotfiles) to $out
    if [ -d dist ]; then
      cp -r dist/. "$out"
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
