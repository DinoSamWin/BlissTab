
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, Edit2, Check, Trash2, GripHorizontal } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    DropAnimation,
    UniqueIdentifier,
    useDroppable
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { QuickLink } from '../types';
import GatewayEditModal from './GatewayEditModal';
import { getLocalLogoDataUrl, upsertLocalLogo } from '../services/gatewayLogoCacheService';
import { uploadGatewayLogo } from '../services/supabaseService';
import { canonicalizeUrl } from '../services/urlCanonicalService';

// --- Types ---
interface Props {
    links: QuickLink[];
    userId?: string;
    onUpdate: (links: QuickLink[]) => void;
}

// --- Droppable Group Container ---
function DroppableGroupContainer({ id, children, className, style }: { id: string, children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
    const { setNodeRef, isOver } = useDroppable({ id: `group-${id}`, data: { type: 'group', category: id } });

    return (
        <div ref={setNodeRef} style={style} className={`${className} ${isOver ? 'bg-blue-50/30 dark:bg-blue-900/10 rounded-xl transition-colors' : ''}`}>
            {children}
        </div>
    );
}

// --- Sortable Item Component ---
interface SortableLinkCardProps {
    link: QuickLink;
    isEditMode: boolean;
    onDelete?: (id: string) => void;
    onEdit?: (link: QuickLink) => void;
    index: number; // for staggering
}

function SortableLinkCard({ link, isEditMode, onDelete, onEdit, index }: SortableLinkCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: link.id, data: { link } });


    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1, // Make it slightly transparent when dragging
        animationDelay: `${index * 0.03 + 0.1}s`,
    };

    // ... (rest of component) ...

    // ... (In IntegrationGateways component) ...




    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
                relative group flex items-center gap-4 p-3 pr-5
                bg-white dark:bg-[#1A1A1A] 
                rounded-xl shadow-sm hover:shadow-md
                transition-all duration-200 
                ${!isEditMode && !isDragging ? 'hover:-translate-y-0.5' : ''}
                h-16 w-full
                ${!isDragging ? 'animate-enter-card' : ''}
                ${isEditMode ? 'cursor-grab active:cursor-grabbing animate-shake-infinite' : 'cursor-pointer'}
            `}
            onClick={(e) => {
                if (isEditMode) {
                    e.preventDefault();
                    onEdit?.(link);
                } else {
                    window.open(link.url, '_blank');
                }
            }}
        >
            {/* Icon Box */}
            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/5 shrink-0 pointer-events-none">
                {(link.customLogoUrl || link.customLogoSignedUrl || link.icon) ? (
                    <img
                        src={link.customLogoUrl || link.customLogoSignedUrl || link.icon || ''}
                        alt=""
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'block';
                        }}
                    />
                ) : null}
                <div
                    className="w-4 h-4 rounded-full"
                    style={{
                        backgroundColor: link.color,
                        display: (link.customLogoUrl || link.customLogoSignedUrl || link.icon) ? 'none' : 'block'
                    }}
                />
            </div>

            {/* Text */}
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate pointer-events-none">
                {link.customTitle || link.title}
            </span>

            {/* Edit Controls - Only Delete Button */}
            {isEditMode && (
                <button
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md hover:scale-110 transition-transform cursor-pointer z-20"
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(link.id);
                    }}
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

// --- New Group Drop Zone ---
function NewGroupDropZone({ activeId }: { activeId: UniqueIdentifier | null }) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'new-group-zone',
        data: { type: 'new-group' }
    });

    if (!activeId) return null;

    return (
        <div
            ref={setNodeRef}
            className={`
                mt-8 p-6 border-2 border-dashed rounded-[2rem] flex items-center justify-center
                transition-all duration-300
                ${isOver ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 scale-105' : 'border-gray-300 dark:border-white/10 opacity-60'}
            `}
        >
            <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Drop here to create a new group
            </p>
        </div>
    );
}


// --- Gateway Create Modal (Enhanced with Logo Upload & Category Select) ---
interface GatewayCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { url: string; title: string; logoFile: File | null; category: string }) => void;
    initialCategory: string;
    categories: string[];
}

function GatewayCreateModal({ isOpen, onClose, onSave, initialCategory, categories }: GatewayCreateModalProps) {
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [isNewGroup, setIsNewGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    useEffect(() => {
        if (isOpen) {
            setUrl('');
            setTitle('');
            setLogoFile(null);
            setSelectedCategory(initialCategory);
            setIsNewGroup(false);
            setNewGroupName('');
        }
    }, [isOpen, initialCategory]);

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

// --- Delete Confirmation Modal ---
interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm }: DeleteConfirmModalProps) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100020] flex items-center justify-center p-4 bg-black/20 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-sm rounded-[2rem] shadow-2xl border border-black/5 dark:border-white/10 p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Shortcut?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This action cannot be undone.</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase tracking-wide hover:bg-gray-200 dark:hover:bg-white/10">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold uppercase tracking-wide hover:bg-red-600 shadow-lg shadow-red-500/20">Delete</button>
                </div>
            </div>
        </div>
    )
}

/**
 * Helper function to upload a logo file and get all necessary metadata.
 * Handles: File -> DataURL conversion, hash generation, localStorage caching, Supabase upload.
 */
async function uploadLogoAndGetMetadata(
    logoFile: File,
    url: string,
    userId: string | undefined
): Promise<{
    customLogoUrl: string | null;
    customLogoSignedUrl: string | null;
    customLogoPath: string | null;
    customLogoHash: string;
    canonicalUrl: string;
}> {
    try {
        // 1. Canonicalize URL
        const canonicalUrl = canonicalizeUrl(url);

        // 2. Convert File to DataURL and generate hash
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(logoFile);
        });

        // 3. Generate hash from dataUrl (simple hash for now)
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl))
            .then(buffer => Array.from(new Uint8Array(buffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .substring(0, 16)); // Use first 16 chars

        // 4. Save to localStorage cache
        upsertLocalLogo(canonicalUrl, {
            dataUrl,
            hash,
            updatedAt: Date.now(),
        });

        console.log('[IntegrationGateways] Logo saved to local cache:', { canonicalUrl, hash });

        // 5. Upload to Supabase Storage (if userId available)
        if (userId) {
            try {
                const uploadResult = await uploadGatewayLogo({
                    userId,
                    canonicalUrl,
                    file: logoFile,
                    contentType: logoFile.type || 'image/webp',
                    hash,
                });

                if (uploadResult) {
                    console.log('[IntegrationGateways] Logo uploaded to Supabase:', uploadResult);
                    return {
                        customLogoUrl: uploadResult.publicUrl,
                        customLogoSignedUrl: uploadResult.signedUrl,
                        customLogoPath: uploadResult.path,
                        customLogoHash: hash,
                        canonicalUrl,
                    };
                }
            } catch (uploadError) {
                console.warn('[IntegrationGateways] Supabase upload failed, using local cache only:', uploadError);
            }
        } else {
            console.warn('[IntegrationGateways] No userId provided, skipping Supabase upload');
        }

        // Fallback: Return local cache metadata only
        return {
            customLogoUrl: null,
            customLogoSignedUrl: null,
            customLogoPath: null,
            customLogoHash: hash,
            canonicalUrl,
        };
    } catch (error) {
        console.error('[IntegrationGateways] Failed to process logo:', error);
        throw error;
    }
}

// --- Main Component ---
export default function IntegrationGateways({ links: propLinks, userId, onUpdate }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [elasticY, setElasticY] = useState(0);

    // Local state for immediate DnD feedback
    const [links, setLinks] = useState(propLinks);
    const linksRef = useRef(links);

    // Sync prop changes to local state (e.g. from DB updates)
    useEffect(() => {
        setLinks(propLinks);
        linksRef.current = propLinks;
    }, [propLinks]);

    // Keep ref in sync ensuring handleDragEnd has latest data
    useEffect(() => {
        linksRef.current = links;
    }, [links]);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
    const [editingCategory, setEditingCategory] = useState<string | null>(null); // For renaming groups

    // Modals State
    const [createModal, setCreateModal] = useState<{ isOpen: boolean; category: string }>({ isOpen: false, category: '' });
    const [editLink, setEditLink] = useState<QuickLink | null>(null); // For GatewayEditModal
    const [deleteId, setDeleteId] = useState<string | null>(null); // For Delete Confirmation

    const scrollAccumulator = useRef(0);
    const wheelTimeout = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement to start drag (prevents accidental drags on click)
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Grouping Logic
    const groupedGateways = useMemo(() => {
        const groups: Record<string, QuickLink[]> = {
            "快捷指令": [] // Default group always first
        };

        links.forEach(link => {
            let cat = link.category || "快捷指令";
            // Normalize Shortcuts to Chinese
            if (cat === 'Shortcuts') cat = '快捷指令';

            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(link);
        });
        return groups;
    }, [links]);

    // Enforce Category Order (Shortcuts First)
    const sortedCategories = useMemo(() => {
        return Object.keys(groupedGateways).sort((a, b) => {
            const isA = a === '快捷指令';
            const isB = b === '快捷指令';
            if (isA && !isB) return -1;
            if (!isA && isB) return 1;
            return 0;
        });
    }, [groupedGateways]);

    // DnD Handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id);
    };



    // ... inside IntegrationGateways ...

    // Combined Add Gateway Logic
    const handleAddGateway = async (data: { url: string; title: string, logoFile: File | null, category: string }) => {
        // Handle logo upload if file provided
        let logoMetadata: Partial<QuickLink> = {};
        if (data.logoFile) {
            try {
                const metadata = await uploadLogoAndGetMetadata(data.logoFile, data.url, userId);
                logoMetadata = {
                    customLogoUrl: metadata.customLogoUrl,
                    customLogoSignedUrl: metadata.customLogoSignedUrl,
                    customLogoPath: metadata.customLogoPath,
                    customLogoHash: metadata.customLogoHash,
                    canonicalUrl: metadata.canonicalUrl,
                };
                console.log('[IntegrationGateways] Logo metadata prepared for new gateway:', logoMetadata);
            } catch (error) {
                console.error('[IntegrationGateways] Failed to upload logo for new gateway:', error);
                // Continue without logo metadata
            }
        }

        // Prepare new link
        const newLink: QuickLink = {
            id: crypto.randomUUID(),
            title: data.title || new URL(data.url).hostname,
            url: data.url,
            icon: null, // Will be fetched in background
            color: '#cbd5e1',
            category: data.category,
            ...logoMetadata, // Spread logo metadata if uploaded
        };

        const newLinks = [...links, newLink];
        setLinks(newLinks);
        onUpdate(newLinks);
        setCreateModal({ isOpen: false, category: '' });

        // Background fetch for default icon (if no custom logo)
        if (!data.logoFile) {
            const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(data.url)}`;
            const img = new Image();
            img.src = faviconUrl;
            img.onload = () => {
                setLinks(prev => prev.map(l => l.id === newLink.id ? { ...l, icon: faviconUrl } : l));
            };
        }
    };

    // ... inside DragOver

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        // Check if over is a Group Container
        if (typeof overId === 'string' && overId.startsWith('group-')) {
            const overCategory = over.data.current?.category;
            const activeLink = links.find(l => l.id === activeId);

            if (activeLink && overCategory && activeLink.category !== overCategory) {
                setLinks((items) => {
                    return items.map(l =>
                        l.id === activeId ? { ...l, category: overCategory } : l
                    );
                });
            }
            return;
        }

        // ... (existing item-based logic) ...
        const activeLink = links.find(l => l.id === active.id);
        const overLink = links.find(l => l.id === overId);

        if (!activeLink || !overLink) return;

        const activeCategory = activeLink.category || "Shortcuts";
        const overCategory = overLink.category || "Shortcuts";

        if (activeCategory !== overCategory) {
            // Moving between groups via item hover
            const activeIndex = links.findIndex(l => l.id === active.id);
            const overIndex = links.findIndex(l => l.id === overId);

            let newLinks = [...links];
            newLinks[activeIndex] = { ...newLinks[activeIndex], category: overCategory };
            newLinks = arrayMove(newLinks, activeIndex, overIndex);
            setLinks(newLinks);
        } else {
            // Same group reordering
            const activeIndex = links.findIndex(l => l.id === active.id);
            const overIndex = links.findIndex(l => l.id === overId);
            if (activeIndex !== overIndex) {
                setLinks(arrayMove(links, activeIndex, overIndex));
            }
        }
    };



    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over) {
            onUpdate(linksRef.current);
            return;
        };

        // 1. Drop into "New Group" Zone
        if (over.id === 'new-group-zone') {
            const activeLink = links.find(l => l.id === active.id);
            if (!activeLink) return;

            const newGroupName = `New Group ${Object.keys(groupedGateways).length}`;
            const newLinks = links.map(l =>
                l.id === activeLink.id ? { ...l, category: newGroupName } : l
            );

            setLinks(newLinks);
            onUpdate(newLinks);
            setIsEditMode(true);
            setEditingCategory(newGroupName);
            return;
        }

        // 2. Standard Drop
        onUpdate(linksRef.current);
    };

    // Group Renaming
    const handleRenameGroup = (oldName: string, newName: string) => {
        if (!newName.trim() || oldName === newName) {
            setEditingCategory(null);
            return;
        }

        const newLinks = links.map(l =>
            (l.category === oldName || (!l.category && oldName === 'Shortcuts'))
                ? { ...l, category: newName }
                : l
        );
        setLinks(newLinks);
        onUpdate(newLinks);
        setEditingCategory(null);
    };



    // Edit Gateway Logic (Compatible with GatewayEditModal)
    const handleSaveEdit = async (params: { url: string; customTitle: string | null; logoFile: File | null; reset: boolean; category: string }) => {
        if (!editLink) return;

        // Handle logo upload if file provided
        let logoMetadata: Partial<QuickLink> = {};
        if (params.logoFile && !params.reset) {
            try {
                const metadata = await uploadLogoAndGetMetadata(params.logoFile, params.url, userId);
                logoMetadata = {
                    customLogoUrl: metadata.customLogoUrl,
                    customLogoSignedUrl: metadata.customLogoSignedUrl,
                    customLogoPath: metadata.customLogoPath,
                    customLogoHash: metadata.customLogoHash,
                    canonicalUrl: metadata.canonicalUrl,
                };
                console.log('[IntegrationGateways] Logo metadata prepared:', logoMetadata);
            } catch (error) {
                console.error('[IntegrationGateways] Failed to upload logo:', error);
                // Continue without logo metadata
            }
        }

        const updatedLinks = links.map(l => {
            if (l.id === editLink.id) {
                // Determine new properties
                if (params.reset) {
                    return {
                        ...l,
                        url: params.url,
                        customTitle: undefined,
                        customLogoUrl: undefined,
                        customLogoSignedUrl: undefined,
                        customLogoPath: undefined,
                        customLogoHash: undefined,
                        canonicalUrl: undefined,
                        category: params.category
                    };
                }
                return {
                    ...l,
                    url: params.url,
                    customTitle: params.customTitle || undefined,
                    ...logoMetadata, // Spread logo metadata if uploaded
                    category: params.category
                };
            }
            return l;
        });

        setLinks(updatedLinks);
        onUpdate(updatedLinks);
        setEditLink(null);
    };

    // Create New Group Logic (for Shortcuts action)
    const handleCreateNewGroup = () => {
        const newGroupName = `New Group ${Object.keys(groupedGateways).length}`;
        // Create a "Ghost" link to hold the group. 
        // We use a special scheme or ID convention to hide it in the UI.
        const ghostLink: QuickLink = {
            id: `ghost-${crypto.randomUUID()}`,
            title: 'Ghost Link',
            url: 'about:blank',
            icon: null,
            color: 'transparent',
            category: newGroupName,
        };

        const newLinks = [...links, ghostLink];
        setLinks(newLinks);
        onUpdate(newLinks);

        // Enter edit mode so they can rename it immediately
        setIsEditMode(true);
        setEditingCategory(newGroupName);
    };

    // Compact Mode Scroll Logic
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;
        const SCROLL_THRESHOLD = 150;
        const DAMPING = 0.25;
        const handleWheel = (e: WheelEvent) => {
            if (isExpanded) return;
            e.preventDefault();
            if (wheelTimeout.current) window.clearTimeout(wheelTimeout.current);
            scrollAccumulator.current += e.deltaY;
            if (scrollAccumulator.current < 0) scrollAccumulator.current = 0;
            if (scrollAccumulator.current > SCROLL_THRESHOLD) {
                setIsExpanded(true);
                setElasticY(0);
                scrollAccumulator.current = 0;
            } else {
                setElasticY(scrollAccumulator.current * DAMPING);
                wheelTimeout.current = window.setTimeout(() => {
                    setElasticY(0);
                    scrollAccumulator.current = 0;
                }, 150) as unknown as number;
            }
        };
        if (isHovered) element.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            element.removeEventListener('wheel', handleWheel);
            if (wheelTimeout.current) window.clearTimeout(wheelTimeout.current);
        };
    }, [isHovered, isExpanded]);

    // ESC to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (createModal.isOpen) setCreateModal({ ...createModal, isOpen: false });
                else if (editLink) setEditLink(null);
                else if (isEditMode) {
                    // Cleanup empty groups
                    const groupsToCheck = { ...groupedGateways };
                    const cleanLinks = links.filter(l => {
                        if (!l.id.startsWith('ghost-')) return true;
                        const catLinks = groupsToCheck[l.category || ''] || [];
                        const realLinksCount = catLinks.filter(cl => !cl.id.startsWith('ghost-')).length;
                        return realLinksCount > 0;
                    });
                    if (cleanLinks.length !== links.length) {
                        setLinks(cleanLinks);
                        onUpdate(cleanLinks);
                    }
                    setIsEditMode(false);
                }
                else if (isExpanded) setIsExpanded(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isExpanded, isEditMode, createModal.isOpen, editLink]);

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: { opacity: '0.4' },
            },
        }),
    };

    const activeLink = activeDragId ? links.find(l => l.id === activeDragId) : null;

    // Filter links for Compact View (Only Shortcuts)
    const shortcutsLinks = useMemo(() => {
        return links.filter(l => (l.category === 'Shortcuts' || l.category === '快捷指令' || !l.category) && !l.id.startsWith('ghost-'));
    }, [links]);

    return (
        <div className="w-full flex justify-center mb-10 relative z-10 font-sans px-8">
            <div className="w-full max-w-7xl">
                {/* --- Compact Interactive View (Bottom Trigger) --- */}
                <div
                    ref={containerRef}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => {
                        setIsHovered(false);
                        setElasticY(0);
                        scrollAccumulator.current = 0;
                    }}
                    className={`
                    relative group transition-all duration-300 ease-out
                    rounded-[2rem] bg-white dark:bg-[#111111] 
                    border border-gray-100 dark:border-white/5 
                    shadow-sm dark:shadow-none
                    ${isHovered ? 'shadow-lg border-blue-200/50 dark:border-blue-500/20' : ''}
                `}
                    style={{
                        transform: isHovered && elasticY > 0 ? `scale(${1 + (elasticY * 0.0005)})` : 'scale(1)'
                    }}
                    role="button"
                    onClick={() => setIsExpanded(true)}
                >
                    <div className="overflow-hidden h-[200px] px-6 py-6 md:px-8 md:py-8 relative rounded-[2rem]">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4"
                            style={{ transform: `translateY(${-elasticY}px)` }}>
                            {shortcutsLinks.slice(0, 18).map(link => (
                                <div key={link.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 h-[64px] w-full">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center border border-black/5 dark:border-white/5 flex-shrink-0">
                                        {(link.customLogoUrl || link.customLogoSignedUrl || link.icon) ? (
                                            <img src={link.customLogoUrl || link.customLogoSignedUrl || link.icon || ''} className="w-6 h-6 object-contain" />
                                        ) : <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: link.color }} />}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{link.customTitle || link.title}</span>
                                </div>
                            ))}
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-12 pointer-events-none rounded-b-[2rem] bg-gradient-to-t from-white via-white/60 dark:from-[#111111] dark:via-[#111111]/60 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}></div>
                        {/* Scroll Hint Pill */}
                        {links.length > 0 && (
                            <div className={`
                            absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none
                            transition-all duration-500 delay-100
                            ${isHovered && elasticY < 10 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                        `}>
                                <div className="bg-gray-900/90 dark:bg-white/90 backdrop-blur text-white dark:text-gray-900 text-[10px] font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 whitespace-nowrap border border-white/10 dark:border-black/5">
                                    <span>Expand</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Full Screen Dashboard (Portal) --- */}
            {isExpanded && createPortal(
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className="fixed inset-0 z-[100000] opacity-100 visible font-sans">
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-gray-200/95 dark:bg-black/95 backdrop-blur-3xl z-[100001]" onClick={() => !isEditMode && setIsExpanded(false)} />

                        {/* Top Gradient Mask - z index higher than content (100002) but lower than header (100004) */}
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-200 via-gray-200/95 to-transparent dark:from-black dark:via-black/95 dark:to-transparent z-[100003] pointer-events-none" />

                        {/* Header Controls */}
                        <div className="absolute top-8 left-8 right-8 z-[100004] flex items-center justify-end gap-4">
                            {/* Primary Actions (Moved to Right) */}
                            <button
                                onClick={handleCreateNewGroup}
                                className="bg-white/50 dark:bg-white/5 text-blue-600 dark:text-blue-400 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white dark:hover:bg-white/10 hover:shadow-lg transition-all flex items-center gap-2 border border-blue-200/50 dark:border-blue-500/20"
                            >
                                <Plus className="w-4 h-4" />
                                <span>New Group</span>
                            </button>
                            <button
                                onClick={() => setCreateModal({ isOpen: true, category: '快捷指令' })}
                                className="bg-white/50 dark:bg-white/5 text-orange-600 dark:text-orange-400 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white dark:hover:bg-white/10 hover:shadow-lg transition-all flex items-center gap-2 border border-orange-200/50 dark:border-orange-500/20"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Gateway</span>
                            </button>

                            <div className="w-px h-8 bg-black/5 dark:bg-white/5 mx-2"></div>

                            {/* Window Controls */}
                            <button
                                onClick={() => {
                                    if (isEditMode) {
                                        // Cleanup empty groups (remove ghost links if no real links exist in that category)
                                        const groupsToCheck = { ...groupedGateways };
                                        // const linksCopy = [...links]; // Not needed if we filter directly from state links which is available in closure
                                        const cleanLinks = links.filter(l => {
                                            if (!l.id.startsWith('ghost-')) return true;
                                            // It's a ghost link. Keep it ONLY if there are other real links in this category?
                                            // No, user said "If create empty group but no links, delete it".
                                            // So if a category has NO real links, we should remove its ghost link.
                                            // The groupedGateways includes the ghost link in the list.
                                            const catLinks = groupsToCheck[l.category || ''] || [];
                                            const realLinksCount = catLinks.filter(cl => !cl.id.startsWith('ghost-')).length;
                                            return realLinksCount > 0;
                                        });

                                        if (cleanLinks.length !== links.length) {
                                            setLinks(cleanLinks);
                                            onUpdate(cleanLinks);
                                        }
                                        setIsEditMode(false);
                                    } else {
                                        setIsEditMode(true);
                                    }
                                }}
                                className={`
                                    p-2.5 rounded-full transition-all flex items-center gap-2 px-5
                                    ${isEditMode
                                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg scale-105'
                                        : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 border border-gray-200/50 dark:border-white/5'}
                                `}
                            >
                                {isEditMode ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                <span className="font-bold text-[10px] tracking-widest">{isEditMode ? 'DONE' : 'EDIT'}</span>
                            </button>

                            <button
                                onClick={() => {
                                    // Cleanup logic if closing while in edit mode
                                    if (isEditMode) {
                                        const groupsToCheck = { ...groupedGateways };
                                        const cleanLinks = links.filter(l => {
                                            if (!l.id.startsWith('ghost-')) return true;
                                            const catLinks = groupsToCheck[l.category || ''] || [];
                                            const realLinksCount = catLinks.filter(cl => !cl.id.startsWith('ghost-')).length;
                                            return realLinksCount > 0;
                                        });

                                        if (cleanLinks.length !== links.length) {
                                            setLinks(cleanLinks);
                                            onUpdate(cleanLinks);
                                        }
                                        setIsEditMode(false);
                                    }
                                    setIsExpanded(false);
                                }}
                                className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-black/5 dark:hover:border-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="relative z-[100002] w-full h-full overflow-y-auto">
                            <div className="w-full max-w-[90%] mx-auto pt-24 pb-32 px-8">
                                <div className="space-y-12">
                                    {sortedCategories.map((category, groupIndex) => {
                                        const categoryLinks = groupedGateways[category];
                                        const isDefaultGroup = category === '快捷指令';

                                        const visibleLinks = categoryLinks?.filter(l => !l.id.startsWith('ghost-')) || [];

                                        if (!isEditMode && !isDefaultGroup && visibleLinks.length === 0) return null;

                                        return (
                                            <DroppableGroupContainer
                                                key={category}
                                                id={category}
                                                className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
                                                style={{ animationDelay: `${groupIndex * 0.05}s` }}
                                            >
                                                {/* Group Title */}
                                                <div className="mb-5 pl-1 group/title">
                                                    <div className="flex items-center gap-4">
                                                        {editingCategory === category && !isDefaultGroup ? (
                                                            <input
                                                                autoFocus
                                                                defaultValue={category}
                                                                onBlur={(e) => handleRenameGroup(category, e.currentTarget.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleRenameGroup(category, e.currentTarget.value);
                                                                }}
                                                                className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 outline-none text-gray-900 dark:text-white pb-1"
                                                            />
                                                        ) : (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-3">
                                                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white"
                                                                        onDoubleClick={() => isEditMode && !isDefaultGroup && setEditingCategory(category)}>
                                                                        {category === 'Shortcuts' ? '快捷指令' : category}
                                                                    </h3>
                                                                    {isEditMode && !isDefaultGroup && (
                                                                        <button onClick={() => setEditingCategory(category)} className="opacity-0 group-hover/title:opacity-100 p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-400 transition-opacity">
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {isDefaultGroup && (
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">常用快捷指令与工具集合</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Description removed for default group as per user request */}
                                                </div>

                                                <SortableContext
                                                    items={visibleLinks.map(l => l.id)}
                                                    strategy={rectSortingStrategy}
                                                >
                                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
                                                        {visibleLinks.map((link, i) => (
                                                            <React.Fragment key={link.id}>
                                                                <SortableLinkCard
                                                                    link={link}
                                                                    isEditMode={isEditMode}
                                                                    index={(groupIndex * 10) + i}
                                                                    onDelete={(id) => setDeleteId(id)}
                                                                    onEdit={(l) => setEditLink(l)}
                                                                />
                                                            </React.Fragment>
                                                        ))}

                                                        {/* Regular Add Button (Per Group) - Now shown for ALL groups including Default */}
                                                        {/* Style differentiated from header buttons: Dashed, simple icon */}
                                                        <button
                                                            onClick={() => setCreateModal({ isOpen: true, category: category === 'Shortcuts' ? '快捷指令' : category })}
                                                            className={`
                                                                flex items-center justify-center p-3
                                                                bg-white/50 dark:bg-white/5 border-2 border-dashed border-gray-300 dark:border-white/10
                                                                rounded-xl hover:bg-white dark:hover:bg-white/10 hover:border-orange-400 dark:hover:border-orange-500
                                                                transition-all h-16 w-full group
                                                                ${isEditMode ? 'opacity-40 pointer-events-none' : ''}
                                                            `}
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                                <Plus className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                                                            </div>
                                                        </button>
                                                    </div>
                                                </SortableContext>
                                            </DroppableGroupContainer>
                                        );
                                    })}

                                    {/* New Group Drop Zone (Only show in edit mode now) */}
                                    {isEditMode && <NewGroupDropZone activeId={activeDragId} />}
                                </div>
                            </div>
                        </div>

                        {/* Drag Overlay */}
                        <DragOverlay dropAnimation={dropAnimation}>
                            {activeLink ? (
                                <div className="opacity-90 scale-105 cursor-grabbing">
                                    <div className="flex items-center gap-4 p-3 pr-5 bg-white dark:bg-[#222] rounded-xl shadow-2xl border border-blue-500/30 h-16 w-[200px]">
                                        <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/5 shrink-0">
                                            {(activeLink.customLogoUrl || activeLink.icon) && <img src={activeLink.customLogoUrl || activeLink.icon || ''} className="w-6 h-6 object-contain" />}
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{activeLink.title}</span>
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>

                        {/* Create Modal */}
                        <GatewayCreateModal
                            isOpen={createModal.isOpen}
                            initialCategory={createModal.category}
                            categories={sortedCategories}
                            onClose={() => setCreateModal({ isOpen: false, category: '' })}
                            onSave={handleAddGateway}
                        />

                        {/* Edit Modal */}
                        <GatewayEditModal
                            isOpen={!!editLink}
                            link={editLink}
                            categories={sortedCategories}
                            onClose={() => setEditLink(null)}
                            onSave={handleSaveEdit}
                        />

                        {/* Delete Confirm Modal */}
                        <DeleteConfirmModal
                            isOpen={!!deleteId}
                            onClose={() => setDeleteId(null)}
                            onConfirm={() => {
                                if (deleteId) {
                                    const newLinks = links.filter(l => l.id !== deleteId);
                                    setLinks(newLinks);
                                    onUpdate(newLinks);
                                    setDeleteId(null);
                                }
                            }}
                        />

                    </div>
                </DndContext>,
                document.body
            )}
        </div>
    );
}
