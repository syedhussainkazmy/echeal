import { type ReactNode } from 'react';

export function ModalShell({ children }: { children: ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            {children}
        </div>
    );
}
