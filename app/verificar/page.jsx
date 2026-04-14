"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Spinner } from "@/components/ui/spinner";

function VerificarContent() {
  const searchParams = useSearchParams();
  const codigoRaw = searchParams.get("doc");

  const [estado, setEstado] = useState("loading");
  const [documento, setDocumento] = useState(null);

  useEffect(() => {
    if (!codigoRaw) {
      setEstado("no-code");
      return;
    }

    const codigo = codigoRaw.trim();

    const verificar = async () => {
      try {
        let docSnap;

        // 🔥 intenta 3 formas
        const intentos = [
          codigo,
          codigo.toUpperCase(),
          codigo.toLowerCase(),
        ];

        for (let intento of intentos) {
          const ref = doc(db, "documentos", intento);
          docSnap = await getDoc(ref);
          if (docSnap.exists()) break;
        }

        if (docSnap && docSnap.exists()) {
          const data = { codigo: docSnap.id, ...docSnap.data() };
          setDocumento(data);

          if (data.estado === "inactivo") {
            setEstado("inactive");
          } else {
            setEstado("valid");
          }
        } else {
          setEstado("invalid");
        }
      } catch (e) {
        console.error(e);
        setEstado("invalid");
      }
    };

    verificar();
  }, [codigoRaw]);

  if (estado === "loading") return <Spinner className="mt-10" />;
  if (estado === "invalid") return <p>Documento no válido</p>;
  if (estado === "inactive") return <p>Documento inactivo</p>;

  return (
    <div>
      <h2>Documento válido ✅</h2>
      <p>{documento?.nombre}</p>
      <p>{documento?.codigo}</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <VerificarContent />
    </Suspense>
  );
}