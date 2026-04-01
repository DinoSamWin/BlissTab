/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Instrument Serif', 'serif'],
            },
            animation: {
                'breathing-slow': 'breathing 15s ease-in-out infinite',
                'lunar-drift': 'lunarDrift 30s ease-in-out infinite',
                'reveal': 'reveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'float': 'float 6s ease-in-out infinite',
                'shake': 'shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
            },
            keyframes: {
                breathing: {
                    '0%, 100%': { transform: 'scale(1)', opacity: '0.4' },
                    '50%': { transform: 'scale(1.05)', opacity: '0.6' },
                },
                lunarDrift: {
                    '0%, 100%': { opacity: '0.3', transform: 'translate(0, 0)' },
                    '50%': { opacity: '0.5', transform: 'translate(20px, -10px)' },
                },
                reveal: {
                    '0%': { opacity: '0', transform: 'translateY(20px)', filter: 'blur(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
                    '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
                }
            }
        },
    },
    plugins: [],
}
