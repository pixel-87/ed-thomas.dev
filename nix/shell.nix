{
  mkShellNoCC,
  callPackage,
  awscli2,
  astro-language-server,
  typescript-language-server,
  tailwindcss-language-server,
  terraform,
  terraform-ls,
  typescript,
  eslint_d,
  prettierd,
  nixfmt,
  vale,
}:
let
  mainPkg = callPackage ./default.nix { };
in
mkShellNoCC {
  inputsFrom = [ mainPkg ];

  packages = [
    awscli2
    astro-language-server
    tailwindcss-language-server
    terraform
    terraform-ls
    typescript-language-server
    typescript
    eslint_d
    prettierd
    nixfmt
    vale
  ];

  shellHook = ''
    echo "Entered dev shell for ed-thomas.dev"
  '';
}
