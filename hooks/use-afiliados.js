"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useAfiliados() {
  const [afiliados, setAfiliados] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Escuchar solo la colección de afiliados ordenados por fecha de creación
    // Es posible que algunos documentos no tengan fechaCreacion, si es así, caerán al final.
    const qAfiliados = query(collection(db, "afiliados"));

    const unsubAfiliados = onSnapshot(qAfiliados, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        codigo: doc.id,
        ...doc.data(),
        id: doc.id,
        tipo: "afiliado",
        _collection: "afiliados"
      }));
      
      // Ordenar manualmente para evitar requerir índices compuestos en Firestore inmediatamente
      data.sort((a, b) => {
        const dateA = new Date(a.fechaCreacion || a.fechaIngreso || 0);
        const dateB = new Date(b.fechaCreacion || b.fechaIngreso || 0);
        return dateB - dateA;
      });

      setAfiliados(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error cargando afiliados:", error);
      setIsLoading(false);
    });

    return () => {
      unsubAfiliados();
    };
  }, []);

  const eliminarAfiliado = async (id) => {
    await deleteDoc(doc(db, "afiliados", id));
  };

  const actualizarEstado = async (id, nuevoEstado) => {
    await updateDoc(doc(db, "afiliados", id), { estado: nuevoEstado });
  };

  return { afiliados, isLoading, eliminarAfiliado, actualizarEstado };
}
