{
  mkShell,
  callPackage,
  astro-language-server,
  typescript-language-server,
  tailwindcss-language-server,
  typescript,
  eslint_d,
  prettierd,
}:
let
  mainPkg = callPackage ./default.nix { };
in
mkShell {
  inputsFrom = [ mainPkg ];

  packages = [
    astro-language-server
    tailwindcss-language-server
    typescript-language-server
    typescript
    eslint_d
    prettierd
  ];

  shellHook = ''
    echo "Entered dev shell for ed-thomas.dev"
  '';
}
