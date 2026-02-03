
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface GatewayCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { url: string; title: string; logoFile: File | null; category: string }) => void;
    initialCategory: string;
    initialUrl?: string; // Support pre-filling URL (for extension)
    initialTitle?: string; // Support pre-filling Title (for extension)
    initialIcon?: string; // Support showing discovered icon
    categories: string[];
}

export default function GatewayCreateModal({
    isOpen,
    onClose,
    onSave,
    initialCategory,
    initialUrl = '',
    initialTitle = '',
    categories
}: GatewayCreateModalProps) {
    const [url, setUrl] = useState(initialUrl);
    const [title, setTitle] = useState(initialTitle);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [isNewGroup, setIsNewGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    useEffect(() => {
        if (isOpen) {
            setUrl(initialUrl);
            setTitle(initialTitle);
            setLogoFile(null);
            setSelectedCategory(initialCategory || (categories[0] || 'Shortcuts'));
            setIsNewGroup(false);
            setNewGroupName('');
        }
    }, [isOpen, initialCategory, initialUrl, initialTitle, categories]);

    const handleSave = () => {
        const finalCategory = isNewGroup ? newGroupName.trim() : selectedCategory;
        if (!finalCategory) return;
        onSave({ url, title, logoFile, category: finalCategory });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-black/20 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0F0F0F] w-full max-w-lg rounded-[2rem] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex items-start justify-between gap-6 mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add New Gateway</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Configure your new shortcut or tool.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* URL Input */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">URL</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="https://..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="mt-2 w-full bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800 dark:text-gray-100 placeholder-gray-400"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && url) handleSave();
                                }}
                            />
                        </div>

                        {/* Category Select */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Group</label>
                            <div className="mt-2 space-y-3">
                                {!isNewGroup ? (
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800 dark:text-gray-100 appearance-none"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => setIsNewGroup(true)}
                                            className="whitespace-nowrap px-4 bg-gray-100 dark:bg-white/5 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/10"
                                        >
                                            + New
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Enter new group name..."
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800 dark:text-gray-100"
                                        />
                                        <button
                                            onClick={() => setIsNewGroup(false)}
                                            className="whitespace-nowrap px-4 bg-gray-100 dark:bg-white/5 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/10"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Title Input */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Title (Optional)</label>
                            <input
                                type="text"
                                placeholder="Check News..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-2 w-full bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800 dark:text-gray-100 placeholder-gray-400"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && url) handleSave();
                                }}
                            />
                        </div>

                        {/* Logo Upload */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Custom Logo (Optional)</label>
                            <div className="mt-2 flex items-center gap-3">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                    className="flex-1 text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-full file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-[11px] file:font-bold file:uppercase file:tracking-widest file:text-gray-700 dark:file:bg-white/10 dark:file:text-gray-200"
                                />
                                {logoFile && (
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{logoFile.name}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={!url}
                            onClick={handleSave}
                            className={`px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${!url ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500' : 'bg-black dark:bg-white text-white dark:text-black hover:scale-105'}`}
                        >
                            Add Gateway
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
