/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f2ff",
          100: "#e0e5ff",
          500: "#667eea",
          600: "#5a6fd8",
          700: "#4c63d2",
        },
        secondary: {
          50: "#f8f9ff",
          100: "#f0f2ff",
          500: "#764ba2",
          600: "#6b4190",
        },
        success: {
          50: "#d4edda",
          100: "#c3e6cb",
          500: "#28a745",
          600: "#218838",
        },
        danger: {
          50: "#f8d7da",
          100: "#f5c6cb",
          500: "#dc3545",
          600: "#c82333",
        },
        warning: {
          50: "#fff3cd",
          100: "#ffeaa7",
          500: "#ffc107",
          600: "#e0a800",
        },
        info: {
          50: "#d1ecf1",
          100: "#bee5eb",
          500: "#17a2b8",
          600: "#138496",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          "sans-serif",
        ],
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "gradient-success": "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
      },
      animation: {
        spin: "spin 1s linear infinite",
        "fade-in": "fadeIn 0.5s ease-out",
      },
      keyframes: {
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
