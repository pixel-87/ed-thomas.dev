{
  description  = "My hugo blog";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: {
    devShells.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.mkShell {
      buildInputs = [ 
        nixpkgs.legacyPackages.x86_64-linux.hugo
        nixpkgs.legacyPackages.x86_64-linux.git
        nixpkgs.legacyPackages.x86_64-linux.nodejs
        nixpkgs.legacyPackages.x86_64-linux.pandoc
      nixpkgs.legacyPackages.x86_64-linux.go
      ];
    };
  };
}