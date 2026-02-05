import React, { useState, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Search, Plus, Trash2, Edit2, FolderInput, FolderOutput, Download, Upload, X, Database, Mic, Music, Filter } from 'lucide-react';
import { formatDurationInput, timeToSeconds } from '../utils/time';

import initialSongs from '../data/initial_songs.json';

const SongLibrary = ({
    library,
    setLibrary,
    addToSetlist,
    onAddSong,
    onUpdateSong,
    onDeleteSong,
    isCloud = false
}) => {
    // Form State
    const [form, setForm] = useState({
        title: '',
        authors: '',
        duration: '',
        type: 'song' // 'song' | 'speech'
    });

    // UI State
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('title'); // 'title' | 'duration'
    const [filterType, setFilterType] = useState('all'); // 'all' | 'song' | 'speech'

    const fileInputRef = useRef(null);

    // Handlers
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleDurationBlur = () => {
        const formatted = formatDurationInput(form.duration);
        setForm(prev => ({ ...prev, duration: formatted }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || timeToSeconds(form.duration) === 0) return;

        const formattedDuration = formatDurationInput(form.duration);

        if (editingId) {
            if (isCloud && onUpdateSong) {
                await onUpdateSong({ id: editingId, ...form, duration: formattedDuration });
            } else {
                // Local State Legacy
                setLibrary(prev => prev.map(song =>
                    song.id === editingId
                        ? { ...song, ...form, duration: formattedDuration }
                        : song
                ));
            }
            setEditingId(null);
        } else {
            // Add new
            const newSong = {
                id: uuidv4(),
                ...form,
                duration: formattedDuration
            };

            if (isCloud && onAddSong) {
                await onAddSong(newSong);
            } else {
                setLibrary(prev => [...prev, newSong]);
            }
        }

        // Reset form
        setForm({ title: '', authors: '', duration: '', type: 'song' });
    };

    const handleEditClick = (song) => {
        setForm({
            title: song.title,
            authors: song.authors,
            duration: song.duration,
            type: song.type || 'song'
        });
        setEditingId(song.id);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setForm({ title: '', authors: '', duration: '', type: 'song' });
    };

    const handleDelete = async (id) => {
        if (isCloud && onDeleteSong) {
            await onDeleteSong(id); // Window confirm logic is usually in parent for async safety, or here? Parent has it.
        } else {
            if (window.confirm('¿Borrar esta canción de la biblioteca?')) {
                setLibrary(prev => prev.filter(s => s.id !== id));
            }
        }
    };

    const handleClearLibrary = () => {
        if (isCloud) {
            alert("Por seguridad, el borrado masivo está deshabilitado en la nube.");
            return;
        }
        if (window.confirm('¿Estás seguro de BORRAR TODAS las canciones? Esto no se puede deshacer.')) {
            setLibrary([]);
        }
    };

    const handleExportLibrary = () => {
        const dataStr = JSON.stringify(library, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `repertorio_cloud_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleImportFile = (e) => {
        if (isCloud && !onAddSong) return;

        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    const valid = imported.every(s => s.title && s.duration);
                    if (!valid) {
                        alert('Formato inválido.');
                        return;
                    }

                    if (window.confirm(`¿Importar ${imported.length} canciones a la NUBE?`)) {
                        // In cloud, we must add one by one :( 
                        // Or write a batch function in parent.
                        // For now, simpler to loop.
                        let count = 0;
                        for (const s of imported) {
                            const newS = { ...s, id: s.id || uuidv4(), type: s.type || 'song' };
                            if (isCloud) await onAddSong(newS);
                            else setLibrary(prev => [...prev, newS]);
                            count++;
                        }
                        alert(`Importadas ${count} canciones.`);
                    }
                }
            } catch (err) {
                alert('Falló al leer el archivo JSON.');
            }
        };
        reader.readAsText(file);
        e.target.value = null; // reset
    };

    const handleLoadDemo = async () => {
        if (window.confirm(`¿Agregar ${initialSongs.length} canciones de ejemplo a la NUBE?`)) {
            for (const s of initialSongs) {
                const demoS = { ...s, id: uuidv4(), type: 'song' };
                if (isCloud && onAddSong) await onAddSong(demoS);
                else setLibrary(prev => [...prev, demoS]);
            }
        }
    };

    // Derived State
    const filteredLibrary = useMemo(() => {
        if (!library) return [];
        return library
            .filter(song => {
                const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    song.authors.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesType = filterType === 'all' ||
                    (filterType === 'speech' && song.type === 'speech') ||
                    (filterType === 'song' && song.type !== 'speech');

                return matchesSearch && matchesType;
            })
            .sort((a, b) => {
                if (sortBy === 'duration') {
                    return timeToSeconds(a.duration) - timeToSeconds(b.duration);
                }
                return a.title.localeCompare(b.title);
            });
    }, [library, searchTerm, sortBy, filterType]);

    return (
        <div className="flex-col" style={{ height: '100%' }}>
            {/* Add / Edit Form */}
            <div className="glass-panel">
                <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2>{editingId ? 'Editar en Nube' : 'Agregar a Nube'}</h2>
                    {editingId && (
                        <button onClick={handleCancelEdit} className="icon-btn">
                            <X size={18} />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSave} className="flex-col" style={{ gap: '12px' }}>
                    <div className="flex-row" style={{ gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 2 }}>
                            <input
                                name="title"
                                placeholder="Título"
                                value={form.title}
                                onChange={handleInputChange}
                                autoFocus={!editingId}
                            />
                        </div>
                        <div>
                            <select
                                name="type"
                                value={form.type}
                                onChange={handleInputChange}
                                style={{
                                    height: '42px',
                                    padding: '0 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--color-border)',
                                    background: 'rgba(0,0,0,0.2)',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="song">Canción</option>
                                <option value="speech">Discurso</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <input
                                name="duration"
                                placeholder="Dur (305 = 0:05)"
                                value={form.duration}
                                onChange={handleInputChange}
                                onBlur={handleDurationBlur}
                            />
                        </div>
                    </div>

                    {form.type === 'song' && (
                        <input
                            name="authors"
                            placeholder="Autores (ej. Lennon, McCartney)"
                            value={form.authors}
                            onChange={handleInputChange}
                        />
                    )}

                    <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
                        {editingId && <button type="button" onClick={handleCancelEdit}>Cancelar</button>}
                        <button type="submit" className="primary" disabled={!form.title || !form.duration}>
                            {editingId ? <><Edit2 size={16} /> Guardar</> : <><Plus size={16} /> Agregar</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Library List */}
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="flex-row" style={{ marginBottom: '1rem', justifyContent: 'space-between', gap: '8px' }}>
                    <div className="flex-row" style={{ flex: 1 }}>
                        <Search size={20} style={{ color: 'var(--color-text-secondary)' }} />
                        <input
                            placeholder="Buscar en Nube..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', border: 'none', padding: '0', color: 'white' }}
                        />
                    </div>

                    <div className="flex-row" style={{ gap: '8px' }}>
                        {/* Type Filter */}
                        <div className="flex-row" style={{
                            background: 'var(--color-bg-surface)',
                            borderRadius: '4px',
                            padding: '2px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <button
                                onClick={() => setFilterType('all')}
                                style={{
                                    background: filterType === 'all' ? 'var(--color-primary)' : 'transparent',
                                    color: filterType === 'all' ? 'white' : 'var(--color-text-secondary)',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '2px',
                                    fontSize: '0.8em',
                                    cursor: 'pointer'
                                }}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilterType('song')}
                                style={{
                                    background: filterType === 'song' ? 'var(--color-primary)' : 'transparent',
                                    color: filterType === 'song' ? 'white' : 'var(--color-text-secondary)',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '2px',
                                    fontSize: '0.8em',
                                    cursor: 'pointer'
                                }}
                            >
                                🎵
                            </button>
                            <button
                                onClick={() => setFilterType('speech')}
                                style={{
                                    background: filterType === 'speech' ? 'var(--color-primary)' : 'transparent',
                                    color: filterType === 'speech' ? 'white' : 'var(--color-text-secondary)',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '2px',
                                    fontSize: '0.8em',
                                    cursor: 'pointer'
                                }}
                            >
                                🎤
                            </button>
                        </div>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{ background: 'var(--color-bg-surface)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px' }}
                        >
                            <option value="title">A-Z</option>
                            <option value="duration">Duración</option>
                        </select>
                    </div>
                </div>

                <div className="scroll-container" style={{ flex: 1 }}>
                    {filteredLibrary.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            {library.length === 0 ? "¡Agregá tu primera canción a la Nube!" : "No se encontraron resultados."}
                        </div>
                    ) : (
                        filteredLibrary.map(song => (
                            <div key={song.id} className="flex-row" style={{
                                padding: '12px',
                                borderBottom: '1px solid var(--color-border)',
                                justifyContent: 'space-between',
                                background: editingId === song.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                                transition: 'background 0.2s',
                                alignItems: 'center',
                                borderLeft: song.type === 'speech' ? '3px solid gold' : '3px solid transparent'
                            }}>
                                <div style={{ marginRight: '8px', color: song.type === 'speech' ? 'gold' : 'var(--color-text-secondary)' }}>
                                    {song.type === 'speech' ? <Mic size={16} /> : <Music size={16} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, color: song.type === 'speech' ? '#ffd700' : 'inherit' }}>{song.title}</div>
                                    {/* Authors hidden in view */}
                                </div>
                                <div style={{ fontFamily: 'monospace', color: 'var(--color-primary)', minWidth: '50px', textAlign: 'right' }}>
                                    {song.duration}
                                </div>
                                <div className="flex-row" style={{ gap: '8px' }}>
                                    <button
                                        onClick={() => addToSetlist(song.id)}
                                        className="icon-btn primary"
                                        title="Agregar al Show"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleEditClick(song)}
                                        className="icon-btn"
                                        title="Editar"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(song.id)}
                                        className="icon-btn danger"
                                        title="Borrar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex-row" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', justifyContent: 'space-between' }}>
                    <div className="text-small">
                        {library.length} items (Cloud)
                    </div>
                    <div className="flex-row" style={{ gap: '8px' }}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept=".json"
                            onChange={handleImportFile}
                        />

                        {/* Demo Button */}
                        <button onClick={handleLoadDemo} className="icon-btn" title="Cargar Canciones Demo">
                            <Database size={16} />
                        </button>

                        <button onClick={handleExportLibrary} className="icon-btn" title="Exportar Librería">
                            <FolderOutput size={16} />
                        </button>
                        <button onClick={handleImportClick} className="icon-btn" title="Importar Librería">
                            <FolderInput size={16} />
                        </button>
                        {!isCloud && library.length > 0 && (
                            <button onClick={handleClearLibrary} className="danger text-small" style={{ padding: '4px 8px' }}>
                                Borrar Todo
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SongLibrary;
