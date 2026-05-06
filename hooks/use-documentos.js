"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useDocumentos() {
  const [documentos, setDocumentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const qDocs = query(collection(db, "documentos"), orderBy("fecha", "desc"));
    const qAfiliados = query(collection(db, "afiliados"), orderBy("fechaIngreso", "desc"));

    let dataDocs = [];
    let dataAfiliados = [];

    const mergeAndSort = () => {
      const combined = [...dataDocs, ...dataAfiliados];
      combined.sort((a, b) => {
        const dateA = new Date(a.fecha || a.fechaIngreso || 0);
        const dateB = new Date(b.fecha || b.fechaIngreso || 0);
        return dateB - dateA;
      });
      setDocumentos(combined);
      setIsLoading(false);
    };

    const unsubDocs = onSnapshot(qDocs, (snapshot) => {
      dataDocs = snapshot.docs.map((doc) => ({
        codigo: doc.id,
        ...doc.data(),
        _collection: "documentos"
      }));
      mergeAndSort();
    }, () => setIsLoading(false));

    const unsubAfiliados = onSnapshot(qAfiliados, (snapshot) => {
      dataAfiliados = snapshot.docs.map((doc) => ({
        codigo: doc.id,
        ...doc.data(),
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