/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Dòng này cực kỳ quan trọng để nút bấm Sáng/Tối hoạt động
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}