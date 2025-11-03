export default {
  plugins: {
    // Tailwind v4 moved the PostCSS plugin into a separate package.
    // Use the @tailwindcss/postcss entry so PostCSS loads the correct plugin.
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
