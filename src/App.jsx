import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useFirestoreCollection, useFirestoreDocument } from './hooks/useFirestore';
import { doc, setDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

import SongLibrary from './components/SongLibrary';
import Setlist from './components/Setlist';

function App() {
  // --- Global State (Cloud Synced) ---

  // 1. Library: Fetched as a collection
  const { data: library, loading: loadingLibrary } = useFirestoreCollection('songs');

  // 2. Setlist: Fetched as a SINGLE SHARED DOCUMENT ('app_state/current_setlist')
  // We use a shared document so everyone sees the SAME active show.
  const { data: setlistDoc, loading: loadingSetlist, updateDocument: updateSetlistDoc } = useFirestoreDocument('app_state', 'current_setlist', { items: [] });
  const setlist = setlistDoc?.items || [];

  // 3. Presets: Fetched as a collection
  const { data: presets, loading: loadingPresets } = useFirestoreCollection('presets');


  // --- Actions (Write to Cloud) ---

  // Library Actions
  const setLibrary = async (newLibraryOrFn) => {
    // NOTE: SongLibrary expects 'setLibrary' to handle arrays or functions.
    // But with Firestore, we shouldn't "set the whole array". We should add/remove individual docs.
    // However, for compatibility with the existing component structure which passes 'setLibrary',
    // we might need to refactor SongLibrary to call 'addSong', 'updateSong', 'deleteSong' props instead.
    // FOR NOW: I will hack it. If SongLibrary calls setLibrary, I will try to detect the change.
    // BUT BETTER: Let's pass wrapper functions to SongLibrary.
    alert("Error de Desarrollo: SongLibrary intenta escribir todo el array. Necesitamos refactorizar para usar add/delete.");
  };

  const addSongToLibrary = async (song) => {
    // Use song.id as doc ID if present, else auto-id
    try {
      await setDoc(doc(db, 'songs', song.id), song);
    } catch (e) {
      console.error(e);
      alert("Error al guardar canción");
    }
  };

  const updateSongInLibrary = async (song) => {
    try {
      await setDoc(doc(db, 'songs', song.id), song, { merge: true });
    } catch (e) { console.error(e); }
  };

  const deleteSongFromLibrary = async (id) => {
    if (window.confirm("¿Borrar definitivamente de la nube?")) {
      try {
        await deleteDoc(doc(db, 'songs', id));
      } catch (e) { console.error(e); }
    }
  };


  // Setlist Actions
  const setSetlist = (newSetlistOrFn) => {
    // Handle functional update
    let newList;
    if (typeof newSetlistOrFn === 'function') {
      newList = newSetlistOrFn(setlist);
    } else {
      newList = newSetlistOrFn;
    }
    updateSetlistDoc({ items: newList });
  };

  const addToSetlist = (songId) => {
    const song = library.find(s => s.id === songId);
    if (!song) return;

    const newItem = {
      instanceId: uuidv4(),
      songId: song.id,
      overrideDuration: null
    };

    // Add to shared doc
    const newItems = [...setlist, newItem];
    updateSetlistDoc({ items: newItems });
  };

  // Preset Actions
  const setPresets = (newPresetsOrFn) => {
    // Presets are a collection, so 'setPresets' (array replacement) doesn't map 1:1.
    // We need 'addPreset' and 'deletePreset'.
    // Only used in Setlist.jsx for saving/deleting.
    console.warn("Direct setPresets not supported in cloud mode. Use add/delete.");
  };

  const addPreset = async (preset) => {
    try {
      // Use preset.id as doc ID
      await setDoc(doc(db, 'presets', preset.id), preset);
    } catch (e) { console.error(e); alert("Error al guardar preset"); }
  };

  const deletePreset = async (id) => {
    if (window.confirm("¿Borrar preset de la nube?")) {
      try {
        await deleteDoc(doc(db, 'presets', id));
      } catch (e) { console.error(e); }
    }
  };


  if (loadingLibrary || loadingSetlist) {
    return <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <h2>Cargando Nube... ☁️</h2>
    </div>;
  }

  return (
    <div className="app-container">
      <h1>Setlist Tiempo y Autores <span style={{ fontSize: '0.5em', color: 'gold' }}>CLOUD ☁️</span></h1>

      <div className="app-grid">
        {/* Left Column: Song Library */}
        <section>
          {/* We pass specific actions instead of generic setLibrary to handle Firestore CRUD */}
          <SongLibrary
            library={library}
            setLibrary={null} // Disable direct array set
            // Pass Custom CRUD handlers (Need to modify SongLibrary to receive these!)
            // Or easier: Create a wrapper 'setLibrary' that tries to guess the action? No, dangerous.
            // I will update SongLibrary props in next step.

            // Temporary Props to support refactor
            onAddSong={addSongToLibrary}
            onUpdateSong={updateSongInLibrary}
            onDeleteSong={deleteSongFromLibrary}

            addToSetlist={addToSetlist}
            isCloud={true}
          />
        </section>

        {/* Right Column: Active Setlist */}
        <section>
          <Setlist
            setlist={setlist}
            setSetlist={setSetlist} // logic handled above: updates single doc
            library={library}
            presets={presets}
            setPresets={null} // Disable array set
            onAddPreset={addPreset}
            onDeletePreset={deletePreset}
          />
        </section>
      </div>
    </div>
  );
}

export default App;
