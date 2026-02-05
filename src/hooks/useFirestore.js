import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';

// Hook to subscribe to a Collection (returns array of docs)
export const useFirestoreCollection = (collectionName, defaultValue = []) => {
    const [data, setData] = useState(defaultValue);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        // Subscribe to collection
        const unsubscribe = onSnapshot(collection(db, collectionName),
            (snapshot) => {
                const items = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setData(items);
                setLoading(false);
            },
            (err) => {
                console.error(`Error fetching collection ${collectionName}:`, err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [collectionName]);

    return { data, loading, error };
};

// Hook to subscribe to a Single Document (returns object)
export const useFirestoreDocument = (collectionName, docId, defaultValue = null) => {
    const [data, setData] = useState(defaultValue);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onSnapshot(doc(db, collectionName, docId),
            (docSnap) => {
                if (docSnap.exists()) {
                    setData({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setData(defaultValue);
                }
                setLoading(false);
            },
            (err) => {
                console.error(`Error fetching document ${collectionName}/${docId}:`, err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [collectionName, docId]);

    // Function to update this document
    const updateDocument = async (newData) => {
        try {
            await setDoc(doc(db, collectionName, docId), newData, { merge: true });
        } catch (err) {
            console.error("Error updating document:", err);
            alert("Error al guardar en la nube (Revisar conexión).");
        }
    };

    return { data, loading, error, updateDocument };
};
