---
date: '2025-08-13T17:01:52+01:00'
draft: false 
title: 'My First Post'
---

# Why make a blog

I think it's nice to have a tiny part of the internet made how I want, while I'm not doing some crazy css or incredibly complex JS, being able to write what I want and for random people across the globe to find and read is a fun.

It's also weird when you start thinking of how many layers of abstraction there are to make all this possible.

I've seen some very cool sites from just random people I would never meet in my day to day life, so maybe someone else can get that experience one day reading something on here, if I remember to write anything ahahah.

As a comp sci student, my first job was planning how to build this whole site, figuring out what to post is a later job.

## Building The Blog

I'm not well versed in the world of static site generators, but have seen Hugo being recommend before, and there's no better way of finding out its pros and cons than just using it.

From what I've read, it is simple to use and fast, which sounds perfect.

I'm very familiar using markdown in my obsidian notes so it makes sense to continue using it.

## Web Server - Caddy

While I could of gone for a battle-tested web server like Nginx, Caddy is easier to get up and running, and handles things like HTTPS automatically out of the box.

## Nix

I've been trying to learn more about Nix and have been dual booting with nixos - although right now it's purely playing around with configs.

I'm trying to use Nix in more places in order to actually learn the language, so I've been using a dev shell for this repo to manage packages, and plan on trying to actually package this using Nix.

``` Nix
{
  description = "My hugo blog";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
    in {
      devShells.x86_64-linux.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          hugo
          git
          pandoc
          go
          caddy
        ];
      };
    };
}

```

## Hosting

I've already got a few things self-hosted like pihole and a minecraft server, so I don't really see the point in handing off the responsibility to another party.
My site doesn't need 100% uptime, won't get that much traffic, so doing everything myself is completely reasonable, and makes for a better learning experience.
