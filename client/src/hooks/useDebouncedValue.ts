import { useEffect, useState } from 'react';

export const useDebouncedValue = <T>(value: T, delay = 350): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [value, delay]);

    return debouncedValue;
};
