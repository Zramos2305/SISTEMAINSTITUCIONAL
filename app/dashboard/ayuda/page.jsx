"use client";

import { useState } from "react";
import { helpCategories } from "@/lib/help-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LifeBuoy, Search, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AyudaPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar categorías y preguntas basadas en la búsqueda
  const filteredCategories = helpCategories.map((category) => {
    const filteredItems = category.items.filter((item) => 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...category, items: filteredItems };
  }).filter(category => category.items.length > 0);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <div className="mb-8 border-b pb-6">
        <h1 className="text-3xl font-black text-[#1e3a5f] flex items-center gap-3">
          <LifeBuoy className="h-8 w-8 text-[#ea580c]" />
          Centro de Ayuda y Soporte
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Encuentra soluciones rápidas y paso a paso sobre el uso del Sistema Institucional.
        </p>

        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
          <Input 
            type="text"
            placeholder="Buscar por palabra clave (Ej. Carnet, Asistencia, Contraseña...)"
            className="pl-10 h-12 text-base border-slate-300 focus-visible:ring-[#ea580c]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-10">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <section key={category.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{category.title}</h2>
              <p className="text-slate-500 mb-6">{category.description}</p>
              
              <Accordion type="multiple" className="w-full">
                {category.items.map((item, index) => (
                  <AccordionItem key={index} value={`${category.id}-${index}`} className="border-b last:border-0 border-slate-100">
                    <AccordionTrigger className="text-left font-semibold text-slate-700 hover:text-[#ea580c] py-4 text-base">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600 pb-4 whitespace-pre-wrap leading-relaxed text-sm bg-slate-50 p-4 rounded-xl mt-2">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-500 text-lg">No encontramos resultados para "{searchTerm}"</p>
            <p className="text-slate-400 text-sm mt-2">Intenta buscar con otras palabras o contacta a soporte.</p>
          </div>
        )}
      </div>

      <div className="mt-12 text-center p-8 bg-slate-50 rounded-2xl border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-2">¿Aún necesitas ayuda?</h3>
        <p className="text-slate-500 mb-6">Si no encontraste la solución a tu problema, nuestro equipo de soporte técnico está para ayudarte.</p>
        <a href="mailto:soporte@fundacionislacascajal.org" className="inline-block">
          <Button className="bg-[#1e3a5f] hover:bg-[#152843] text-white h-12 px-8 text-base">
            <Mail className="mr-2 h-5 w-5" />
            Contactar al Administrador
          </Button>
        </a>
      </div>
    </div>
  );
}
