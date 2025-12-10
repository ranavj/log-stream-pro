/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@spartan-ng/ui-core/hlm-tailwind-preset')], // 👈 ABHI KE LIYE COMMENT KARO
  darkMode: 'class', // <--- YE LINE ADD KAREIN (Important)
  content: [
    "./src/**/*.{html,ts}",
    "./libs/**/*.{html,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}