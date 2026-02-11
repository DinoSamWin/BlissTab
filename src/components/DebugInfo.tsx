import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface DebugInfoProps {
    currentUser: User | null;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ currentUser }) => {
    const [lsUser, setLsUser] = useState<string | null>(null);
    const [lsStateUser, setLsStateUser] = useState<string | null>(null);
    const [explicitSignOut, setExplicitSignOut] = useState<string | null>(null);

    useEffect(() => {
        const update = () => {
            setLsUser(localStorage.getItem('focus_tab_user'));
            const state = localStorage.getItem('focus_tab_state');
            if (state) {
                try {
                    const parsed = JSON.parse(state);
                    setLsStateUser(parsed.user ? JSON.stringify(parsed.user) : 'null');
                } catch (e) {
                    setLsStateUser('parse_error');
                }
            } else {
                setLsStateUser('null');
            }
            setExplicitSignOut(localStorage.getItem('focus_tab_explicit_signout'));
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    if (process.env.NODE_ENV === 'production') return null; // Hide in pure production unless enabled

    return (
        <div className="fixed top-2 right-2 p-2 bg-red-900/90 text-white text-[10px] font-mono rounded z-[9999] max-w-[200px] pointer-events-none shadow-xl border border-red-500">
            <h3 className="font-bold text-yellow-300 mb-1">Auth Debug</h3>
            <div className="space-y-0.5">
                <div>
                    <span className="text-gray-400">App User:</span>{' '}
                    <span className={currentUser ? 'text-green-400' : 'text-red-400'}>
                        {currentUser ? currentUser.email : 'null'}
                    </span>
                </div>
                <div>
                    <span className="text-gray-400">LS focus_tab_user:</span>{' '}
                    <span className="break-all">
                        {lsUser ? JSON.parse(lsUser).email : 'null'}
                    </span>
                </div>
                <div>
                    <span className="text-gray-400">LS explicit_signout:</span>{' '}
                    <span className="text-blue-400">{explicitSignOut || 'null'}</span>
                </div>
            </div>
        </div>
    );
};

export default DebugInfo;
