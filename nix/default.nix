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
  pname = "ed-thomas-site";
  version = "0.1.0";

  # Build from the site/ directory which contains the Astro project
  src = ../site;

  nativeBuildInputs = [
    nodejs
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
    # Astro outputs to `dist` by default; copy its contents to $out
    if [ -d dist ]; then
      cp -r dist/* "$out"
    else
      echo "Warning: no dist directory found after build"
    fi

    runHook postInstall
  '';

  meta = {
    description = "Ed Thomas personal website (Astro)";
    homepage = "https://ed-thomas.dev";
    license = lib.licenses.gpl3Plus;
    maintainers = with lib.maintainers; [ ];
  };
})
