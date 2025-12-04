/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Enable class-based dark mode
    theme: {
        extend: {
            colors: {
                // Using CSS variables for dynamic theming
                'app-bg': 'var(--color-app-bg)',
                /** @type {import('tailwindcss').Config} */
                export default {
                    content: [
                        "./index.html",
                        "./src/**/*.{js,ts,jsx,tsx}",
                    ],
                    darkMode: 'class', // Enable class-based dark mode
                    theme: {
                        extend: {
                            colors: {
                                // Using CSS variables for dynamic theming
                                'app-bg': 'var(--color-app-bg)',
                                'sidebar-bg': 'var(--color-sidebar-bg)',
                                'chat-bg': 'var(--color-chat-bg)',
                                'message-out': 'var(--color-message-out)',
                                'message-in': 'var(--color-message-in)',
                                'accent': 'var(--color-accent)',
                                'text-primary': 'var(--color-text-primary)',
                                'text-secondary': 'var(--color-text-secondary)',
                                'border-color': 'var(--color-border)',
                                'header-bg': 'var(--color-header-bg)',
                            },
                        },
                    },
                    plugins: [],
                }
