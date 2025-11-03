{
  lib,
  stdenvNoCC,
  nodejs_24,
  pnpm_10,
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
    pnpm.configHook
  ];

  pnpmDeps = pnpm.fetchDeps {
    inherit (finalAttrs) pname version src;
    fetcherVersion = 2;
    hash = "sha256-9+ZTmMsJwHeNm1FYMMW4gDJZTZ9caVBQ6P5EU8XqT6E=";
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
    license = lib.licenses.mit;
    maintainers = with lib.maintainers; [ ];
  };
})
