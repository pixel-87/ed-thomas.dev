{
  mkShell,
  callPackage,
  astro-language-server,
  typescript-language-server,
  tailwindcss-language-server,
  typescript,
  eslint_d,
  prettierd,
  nixfmt-rfc-style,
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
    nixfmt-rfc-style
  ];

  shellHook = ''
    echo "Entered dev shell for ed-thomas.dev"
  '';
}
