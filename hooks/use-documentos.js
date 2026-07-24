"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { ref, listAll, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export function useDocumentos() {
  const [documentos, setDocumentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const qDocs = query(collection(db, "documentos"), orderBy("fecha", "desc"));
    const qAfiliados = query(collection(db, "afiliados"), orderBy("fechaCreacion", "desc"));

    let dataDocs = [];
    let dataAfiliados = [];

    const mergeAndSort = () => {
      const combined = [...dataDocs, ...dataAfiliados];
      combined.sort((a, b) => {
        const dateA = new Date(a.fecha || a.fechaCreacion || 0);
        const dateB = new Date(b.fecha || b.fechaCreacion || 0);
        return dateB - dateA;
      });
      setDocumentos(combined);
      setIsLoading(false);
    };

    const unsubDocs = onSnapshot(qDocs, (snapshot) => {
      dataDocs = snapshot.docs.map((doc) => ({
        codigo: doc.id,
        ...doc.data(),
        id: doc.id,
        _collection: "documentos"
      }));
      mergeAndSort();
    }, () => setIsLoading(false));

    const unsubAfiliados = onSnapshot(qAfiliados, (snapshot) => {
      dataAfiliados = snapshot.docs.map((doc) => ({
        codigo: doc.id,
        ...doc.data(),
        id: doc.id,
        tipo: "afiliado",
        _collection: "afiliados"
      }));
      mergeAndSort();
    }, () => setIsLoading(false));

    return () => {
      unsubDocs();
      unsubAfiliados();
    };
  }, []);

  const eliminarDocumento = async (codigo, collectionName = "documentos") => {
    // 1. Intentar borrar los archivos de Storage (Soportes)
    try {
      const folderRef = ref(storage, `soportes/${codigo}`);
      const fileList = await listAll(folderRef);
      // Borrar cada archivo encontrado en la carpeta del usuario
      const deletePromises = fileList.items.map((fileRef) => deleteObject(fileRef));
      await Promise.all(deletePromises);
      console.log(`Archivos de Storage eliminados para: ${codigo}`);
    } catch (error) {
      console.warn(`No se pudieron borrar archivos de storage para ${codigo} (quizás no tenía):`, error);
    }

    // 2. Borrar el documento de Firestore
    await deleteDoc(doc(db, collectionName, codigo));
  };

  const actualizarEstado = async (codigo, nuevoEstado, extraData = {}, collectionName = "documentos") => {
    await updateDoc(doc(db, collectionName, codigo), {
      estado: nuevoEstado,
      ...extraData,
    });
  };

  return {
    documentos,
    isLoading,
    eliminarDocumento,
    actualizarEstado,
  };
}