import React, { useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, Clock, Save, FolderOpen, Copy, Printer, X, Mic, Music } from 'lucide-react';
import { formatDurationInput, timeToSeconds, secondsToTime } from '../utils/time';
import { v4 as uuidv4 } from 'uuid';

// Sortable Item Component
const SortableItem = ({ id, item, song, index, onDelete, onDurationChange }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const [isEditingDur, setIsEditingDur] = useState(false);
    const [editDurVal, setEditDurVal] = useState('');

    const displayDuration = item.overrideDuration || song?.duration || "00:00";
    const isSpeech = song?.type === 'speech';

    const handleDoubleClick = () => {
        setEditDurVal(displayDuration);
        setIsEditingDur(true);
    };

    const handleDurBlur = () => {
        const formatted = formatDurationInput(editDurVal);
        onDurationChange(item.instanceId, formatted);
        setIsEditingDur(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleDurBlur();
    };

    return (
        <div
            ref={setNodeRef}
            className="glass-panel"
            style={{
                ...style,
                padding: '8px 12px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderLeft: isSpeech ? '4px solid gold' : '1px solid var(--color-border)'
            }}
        >
            <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--color-text-secondary)' }}>
                <GripVertical size={20} />
            </div>

            <div style={{ padding: '0 8px', color: 'var(--color-text-secondary)', minWidth: '24px' }}>
                {index + 1}.
            </div>

            <div style={{ color: isSpeech ? 'gold' : 'var(--color-text-secondary)' }}>
                {isSpeech ? <Mic size={18} /> : <Music size={18} />}
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: isSpeech ? '#ffd700' : 'inherit' }}>
                    {song ? song.title : 'Item Desconocido'}
                </div>
                {/* Hidden Authors: <div className="text-small">{song ? song.authors : ''}</div> */}
            </div>

            <div
                onDoubleClick={handleDoubleClick}
                title="Doble click para editar duración en este show"
                style={{
                    fontFamily: 'monospace',
                    color: item.overrideDuration ? 'var(--color-accent)' : 'var(--color-primary)',
                    cursor: 'pointer',
                    padding: '4px',
                    border: isEditingDur ? '1px solid var(--color-primary)' : '1px solid transparent',
                    borderRadius: '4px'
                }}
            >
                {isEditingDur ? (
                    <input
                        autoFocus
                        value={editDurVal}
                        onChange={(e) => setEditDurVal(e.target.value)}
                        onBlur={handleDurBlur}
                        onKeyDown={handleKeyDown}
                        style={{ width: '60px', padding: '2px', background: 'black', border: 'none', color: 'white' }}
                    />
                ) : (
                    displayDuration
                )}
            </div>

            <button onClick={() => onDelete(item.instanceId)} className="icon-btn danger" tabIndex={-1}>
                <Trash2 size={16} />
            </button>
        </div>
    );
};

const Setlist = ({ setlist, setSetlist, library, presets, setPresets, onAddPreset, onDeletePreset }) => {
    const [showName, setShowName] = useState('');
    const [copyFeedback, setCopyFeedback] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setSetlist((items) => {
                const oldIndex = items.findIndex((item) => item.instanceId === active.id);
                const newIndex = items.findIndex((item) => item.instanceId === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const removeItem = (id) => {
        setSetlist(items => items.filter(i => i.instanceId !== id));
    };

    const updateDuration = (instanceId, newDuration) => {
        setSetlist(items => items.map(i =>
            i.instanceId === instanceId ? { ...i, overrideDuration: newDuration } : i
        ));
    };

    const handleSavePreset = async () => {
        if (!showName.trim()) {
            alert("Por favor ingresa un nombre para el show");
            return;
        }
        const newPreset = {
            id: uuidv4(),
            name: showName,
            items: setlist,
            savedAt: new Date().toISOString()
        };

        if (onAddPreset) {
            await onAddPreset(newPreset);
        } else if (setPresets) {
            setPresets(prev => [...prev, newPreset]);
        }

        setCopyFeedback('Preset Guardado ✅');
        setTimeout(() => setCopyFeedback(''), 3000);
    };

    const handleLoadPreset = (preset) => {
        if (window.confirm(`¿Cargar preset "${preset.name}"? Se reemplazará el setlist actual.`)) {
            setSetlist(preset.items);
            setShowName(preset.name); // Optional: load name too
        }
    };

    const handleDeletePreset = async (id) => {
        if (window.confirm('¿Borrar este preset?')) {
            if (onDeletePreset) {
                await onDeletePreset(id);
            } else if (setPresets) {
                setPresets(prev => prev.filter(p => p.id !== id));
            }
        }
    };

    // Calculations
    const totalSeconds = useMemo(() => {
        let total = 0;
        setlist.forEach(item => {
            const song = library.find(s => s.id === item.songId);
            const dur = item.overrideDuration || song?.duration || "00:00";
            total += timeToSeconds(dur);
        });
        // Add 10s between songs
        if (setlist.length > 1) {
            total += (setlist.length - 1) * 10;
        }
        return total;
    }, [setlist, library]);

    const copyToClipboard = (simple = false) => {
        let text = simple ? "" : `Show: ${showName || 'Setlist'}\n\n`;

        setlist.forEach((item, index) => {
            const song = library.find(s => s.id === item.songId);
            const title = song ? song.title : 'Desconocido';
            const author = song ? song.authors : '';
            const dur = item.overrideDuration || song?.duration || "00:00";
            const isSpeech = song?.type === 'speech';

            if (simple) {
                text += `${index + 1}. ${title}`;
            } else {
                text += `${index + 1}. ${title} ${!isSpeech && author ? '- ' + author : ''} [${dur}]`;
            }
            text += '\n';
        });

        if (!simple) {
            text += `\nTotal: ${secondsToTime(totalSeconds)}`;
            if (setlist.length > 1) text += `\n+10 seg. entre canciones`;
        } else {
            // Simple mode: No authors, No +10s note, BUT Yes Total Time
            text += `\nTotal: ${secondsToTime(totalSeconds)}`;
        }

        navigator.clipboard.writeText(text);
        setCopyFeedback('Copiado ✅');
        setTimeout(() => setCopyFeedback(''), 3000);
    };

    const handlePrint = () => {
        // Basic implementation: Open new window
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Construct HTML
        let rows = '';
        let runningTime = 0;
        setlist.forEach((item, idx) => {
            const song = library.find(s => s.id === item.songId);
            const dur = item.overrideDuration || song?.duration || "00:00";
            const sec = timeToSeconds(dur);
            const isSpeech = song?.type === 'speech';
            runningTime += sec;

            // Add pause after
            let pauseTxt = '';
            if (idx < setlist.length - 1) {
                runningTime += 10;
            }

            const rowStyle = isSpeech ? 'background-color: #fffce0;' : '';

            rows += `
            <tr style="border-bottom: 1px solid #ddd; ${rowStyle}">
                <td style="padding: 8px;">${idx + 1}</td>
                <td style="padding: 8px;">
                    ${isSpeech ? '🎤 ' : ''}<b>${song?.title}</b>
                </td>
                <td style="padding: 8px;">${song?.authors || ''}</td>
                <td style="padding: 8px; text-align: right;">${dur}</td>
            </tr>
        `;
        });

        const html = `
      <html>
        <head>
          <title>${showName || 'Setlist'}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: black; background: white; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { text-align: left; border-bottom: 2px solid #000; padding: 10px; }
            .total { font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 20px; border-top: 2px solid black; padding-top: 10px; }
            .pause-note { margin-top: 10px; font-style: italic; color: #555; }
          </style>
        </head>
        <body>
          <h1>${showName || 'Setlist'}</h1>
          <table>
            <thead>
                <tr>
                    <th width="5%">#</th>
                    <th width="40%">Título</th>
                    <th width="35%">Autor</th>
                    <th width="20%" style="text-align: right;">Duración</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
          </table>
          
          ${setlist.length > 1 ? '<div class="pause-note">+10 seg entre canciones incluido en el total</div>' : ''}
          
          <div class="total">
             Tiempo Total: ${secondsToTime(totalSeconds)}
          </div>
          
          <script>
            window.print();
          </script>
        </body>
      </html>
    `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="flex-col" style={{ height: '100%' }}>
            {/* Header / Meta */}
            <div className="glass-panel">
                <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2>Show Actual</h2>
                    <div style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '1.2em' }}>
                        {secondsToTime(totalSeconds)}
                    </div>
                </div>

                <div className="flex-row" style={{ gap: '8px' }}>
                    <input
                        placeholder="Nombre del Show (ej. Opera - 21hs)"
                        value={showName}
                        onChange={(e) => setShowName(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button onClick={handleSavePreset} title="Guardar Preset" disabled={!setlist.length}>
                        <Save size={18} />
                    </button>
                    <button onClick={() => setSetlist([])} className="danger" title="Limpiar Show" disabled={!setlist.length}>
                        <X size={18} />
                    </button>
                </div>
                {/* Show Presets UI if presets exist */}
                {presets.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                        <div className="text-small" style={{ marginBottom: '8px' }}>Presets Guardados:</div>
                        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
                            {presets.map(p => {
                                // Calculate preset duration on the fly
                                let totalSec = 0;
                                if (p.items && Array.isArray(p.items)) {
                                    p.items.forEach(item => {
                                        const song = library.find(s => s.id === item.songId);
                                        const dur = item.overrideDuration || song?.duration || "00:00";
                                        totalSec += timeToSeconds(dur);
                                    });
                                    if (p.items.length > 1) {
                                        totalSec += (p.items.length - 1) * 10;
                                    }
                                }
                                const durationStr = secondsToTime(totalSec);

                                return (
                                    <div key={p.id} className="glass-panel" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em' }}>
                                        <span style={{ cursor: 'pointer' }} onClick={() => handleLoadPreset(p)}>
                                            {p.name} <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85em' }}>({durationStr})</span>
                                        </span>
                                        <Trash2 size={14} className="danger" style={{ cursor: 'pointer' }} onClick={() => handleDeletePreset(p.id)} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Setlist Items */}
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="scroll-container" style={{ flex: 1 }}>
                    {setlist.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            Arrastrá canciones aquí o clickeá "+" en la librería.
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={setlist.map(i => i.instanceId)}
                                strategy={verticalListSortingStrategy}
                            >
                                {setlist.map((item, index) => (
                                    <SortableItem
                                        key={item.instanceId}
                                        id={item.instanceId}
                                        item={item}
                                        song={library.find(s => s.id === item.songId)}
                                        index={index}
                                        onDelete={removeItem}
                                        onDurationChange={updateDuration}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>

                {/* Footer / Calculation */}
                {setlist.length > 1 && (
                    <div style={{ textAlign: 'center', padding: '10px', color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '0.9em' }}>
                        +10 seg. entre canciones
                    </div>
                )}

                <div className="flex-row" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', justifyContent: 'space-between' }}>
                    <div className="text-small">{setlist.length} temas</div>
                    <div className="flex-row" style={{ gap: '8px' }}>
                        {copyFeedback && <span style={{ color: 'var(--color-primary)', fontSize: '0.9em' }}>{copyFeedback}</span>}

                        <div className="flex-row" style={{ gap: '4px' }}>
                            <button onClick={() => copyToClipboard(true)} title="Copiar Solo Nombres" className="icon-btn">
                                <Copy size={16} /> Básico
                            </button>
                            <button onClick={() => copyToClipboard(false)} title="Copiar Todo" className="icon-btn">
                                <Copy size={16} /> Full
                            </button>
                            <button onClick={handlePrint} title="Imprimir" className="icon-btn">
                                <Printer size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Setlist;
