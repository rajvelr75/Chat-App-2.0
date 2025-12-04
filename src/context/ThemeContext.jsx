import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Enforce the single theme
    const theme = 'glass';

    useEffect(() => {
        const root = window.document.documentElement;
        // Remove old classes if any
        root.classList.remove('light', 'dark', 'gold');
        root.classList.add('glass');
    }, []);

    // No-op functions for compatibility if components still call them
    const toggleTheme = () => { };
    const setTheme = () => { };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
