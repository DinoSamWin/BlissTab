
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
import GatewayCreateModal from './GatewayCreateModal';

// --- Types ---
interface Props {
    links: QuickLink[];
    onUpdate: (links: QuickLink[]) => void;
    isAuthenticated: boolean;
    onLoginRequired: () => void;
    canAddMore: boolean;
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

// --- Main Component ---
export default function IntegrationGateways({ links: propLinks, onUpdate, isAuthenticated, onLoginRequired, canAddMore }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleOpenCreateModal = (category: string) => {
        if (!isAuthenticated) {
            onLoginRequired();
            return;
        }
        if (!canAddMore) {
            // If they are logged in but reached the limit, we can either alert or open the modal 
            // and handle it there. To be consistent with the popup, let's alert/toast via App.
            // But for simple UX, we'll just let the App handle the 'canAddMore' flag.
            alert("You've reached your gateway limit. Please upgrade to Pro for more.");
            return;
        }
        setCreateModal({ isOpen: true, category });
    };

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
    const handleAddGateway = (data: { url: string; title: string, logoFile: File | null, category: string }) => {
        // Prepare new link
        const newLink: QuickLink = {
            id: crypto.randomUUID(),
            title: data.title || new URL(data.url).hostname,
            url: data.url,
            icon: null, // Loading...
            color: '#cbd5e1',
            category: data.category,
            customLogoUrl: data.logoFile ? URL.createObjectURL(data.logoFile) : undefined
        };

        // ... (fetch favicon logic same as before, simplified here) ...
        // Fetch icon in background (omitted for brevity, assume existing logic handles it or we re-use it)
        // Actually I should copy the existing fetch logic if I'm replacing the function.
        // Let's assume I am REPLACING the handleAddGateway function completely.

        // Re-implementing fetch logic:
        const categoryLinks = groupedGateways[data.category] || [];
        const newLinks = [...links, newLink];
        setLinks(newLinks);
        onUpdate(newLinks);
        setCreateModal({ isOpen: false, category: '' });

        // Background fetch
        const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(data.url)}`;
        const img = new Image();
        img.src = faviconUrl;
        img.onload = () => {
            setLinks(prev => prev.map(l => l.id === newLink.id ? { ...l, icon: faviconUrl } : l));
        };
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
    const handleSaveEdit = (params: { url: string; customTitle: string | null; logoFile: File | null; reset: boolean; category: string }) => {
        if (!editLink) return;

        const updatedLinks = links.map(l => {
            if (l.id === editLink.id) {
                // Determine new properties
                if (params.reset) {
                    return {
                        ...l,
                        url: params.url,
                        customTitle: undefined,
                        customLogoUrl: undefined,
                        customLogoHash: undefined,
                        category: params.category
                    };
                }
                return {
                    ...l,
                    url: params.url,
                    customTitle: params.customTitle || undefined,
                    customLogoUrl: params.logoFile ? URL.createObjectURL(params.logoFile) : l.customLogoUrl,
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
                >
                    <div className="overflow-hidden h-[200px] px-6 py-6 md:px-8 md:py-8 relative rounded-[2rem]">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4"
                            style={{ transform: `translateY(${-elasticY}px)` }}>
                            {shortcutsLinks.slice(0, 18).map(link => (
                                <div
                                    key={link.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(link.url, '_blank');
                                    }}
                                    className="flex items-center gap-3 px-3 py-3 rounded-xl border border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 h-[64px] w-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                >
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
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsExpanded(true);
                                    }}
                                    className="bg-gray-900/90 dark:bg-white/90 backdrop-blur text-white dark:text-gray-900 text-[10px] font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 whitespace-nowrap border border-white/10 dark:border-black/5 pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 transition-all"
                                >
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
                                onClick={() => handleOpenCreateModal('快捷指令')}
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
                                                            onClick={() => handleOpenCreateModal(category === 'Shortcuts' ? '快捷指令' : category)}
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
