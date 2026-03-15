import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { CustomStatus } from '../../store/taskStore';

interface StatusPopoverProps {
    statusList: CustomStatus[];
    currentStatusId: string | null;
    onSelect: (statusId: string) => void;
    onClose: () => void;
    position?: { top: number; left: number };
}

export const StatusPopover: React.FC<StatusPopoverProps> = ({
    statusList,
    currentStatusId,
    onSelect,
    onClose,
    position
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Trigger mount animation
    useEffect(() => {
        requestAnimationFrame(() => setMounted(true));
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        closeTimerRef.current = setTimeout(() => onClose(), 150);
    }, [onClose]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                handleClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') handleClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [handleClose]);

    const doneStatusId = statusList.length > 0 ? statusList[statusList.length - 1].id : null;

    const handleSelect = (statusId: string) => {
        onSelect(statusId);
        handleClose();
    };

    return (
        <div
            ref={popoverRef}
            className={cn(
                "fixed z-[100] w-60 bg-surface-card/95 backdrop-blur-xl border border-border-subtle rounded-card shadow-modal overflow-hidden",
                isClosing ? "popover-exit" : "popover-enter",
                !mounted && "opacity-0"
            )}
            style={position ? { top: position.top, left: position.left } : {}}
        >
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-surface-2 to-surface-0/50 border-b border-border-subtle">
                <span className="text-[10px] font-black text-muted uppercase tracking-widest">
                    Mover para etapa
                </span>
            </div>

            {/* Status List */}
            <div className="py-1.5 px-1.5 max-h-64 overflow-y-auto">
                {statusList.map((status, index) => {
                    const isDone = status.id === doneStatusId;
                    const isCurrent = status.id === currentStatusId;

                    return (
                        <button
                            key={status.id}
                            onClick={() => handleSelect(status.id)}
                            className="stagger-item w-full"
                            style={{ animationDelay: `${index * 40}ms` }}
                        >
                            <div
                                className={cn(
                                    "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group",
                                    isDone
                                        ? "hover:bg-gradient-to-r hover:from-brand/10 hover:to-brand/5 text-brand font-semibold"
                                        : "hover:bg-surface-2 text-secondary",
                                    isCurrent && "bg-surface-0/80 ring-1 ring-gray-200/50",
                                    !isCurrent && !isDone && "active:scale-[0.97] active:bg-surface-0"
                                )}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className={cn(
                                            "w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-200",
                                            !isCurrent && "group-hover:scale-125"
                                        )}
                                        style={{
                                            backgroundColor: status.color || '#ccc',
                                            boxShadow: isDone ? `0 0 8px ${status.color}40` : 'none'
                                        }}
                                    />
                                    <span className={cn(
                                        "transition-colors duration-150",
                                        isDone && "text-brand font-bold"
                                    )}>
                                        {status.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {isCurrent ? (
                                        <Check size={14} className="text-muted" />
                                    ) : isDone ? (
                                        <Sparkles size={14} className="text-brand/40 group-hover:text-brand transition-colors duration-200" />
                                    ) : (
                                        <ChevronRight size={14} className="text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            {doneStatusId && (
                <div className="px-3.5 py-2 bg-gradient-to-r from-brand/5 to-brand/10 border-t border-brand/10">
                    <p className="text-[9px] text-brand/60 font-semibold tracking-wide">
                        ✨ Etapa final dispara celebração
                    </p>
                </div>
            )}
        </div>
    );
};
