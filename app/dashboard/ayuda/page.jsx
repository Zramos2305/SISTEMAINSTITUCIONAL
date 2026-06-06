"use client";

import { helpCategories } from "@/lib/help-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LifeBuoy } from "lucide-react";

export default function AyudaPage() {
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <div className="mb-8 border-b pb-6">
        <h1 className="text-3xl font-black text-[#1e3a5f] flex items-center gap-3">
          <LifeBuoy className="h-8 w-8 text-[#ea580c]" />
          Centro de Ayuda y Preguntas Frecuentes
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Encuentra soluciones paso a paso a las dudas más comunes sobre el uso del Sistema Institucional.
        </p>
      </div>

      <div className="space-y-12">
        {helpCategories.map((category) => (
          <section key={category.id} className="bg-white p-6 rounded-2xl shadow-sm border">
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
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-slate-400">
        <p>¿No encontraste lo que buscabas? Contacta al Administrador Principal del Sistema.</p>
      </div>
    </div>
  );
}
