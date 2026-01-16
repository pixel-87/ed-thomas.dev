/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        maze: {
          light: "#5D3B8E",
          dark: "#cc6600",
        },
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": theme("colors.gray.700"),
            "--tw-prose-headings": theme("colors.gray.900"),
            "--tw-prose-links": theme("colors.blue.600"),
            "--tw-prose-quotes": theme("colors.gray.500"),
            "--tw-prose-quote-borders": theme("colors.gray.300"),
            "--tw-prose-captions": theme("colors.gray.500"),
            "--tw-prose-code": theme("colors.gray.900"),
            "--tw-prose-pre-code": theme("colors.gray.200"),
            "--tw-prose-pre-bg": theme("colors.gray.800"),
            "--tw-prose-th-borders": theme("colors.gray.300"),
            "--tw-prose-td-borders": theme("colors.gray.200"),
          },
        },
        invert: {
          css: {
            "--tw-prose-body": theme("colors.gray.300"),
            "--tw-prose-headings": theme("colors.gray.50"),
            "--tw-prose-links": theme("colors.blue.400"),
            "--tw-prose-quotes": theme("colors.gray.400"),
            "--tw-prose-quote-borders": theme("colors.gray.700"),
            "--tw-prose-captions": theme("colors.gray.400"),
            "--tw-prose-code": theme("colors.gray.50"),
            "--tw-prose-pre-code": theme("colors.gray.300"),
            "--tw-prose-pre-bg": theme("colors.gray.800"),
            "--tw-prose-th-borders": theme("colors.gray.700"),
            "--tw-prose-td-borders": theme("colors.gray.600"),
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
