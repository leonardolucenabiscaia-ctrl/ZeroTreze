"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Slide {
  titulo: string;
  subtitulo: string;
  /** Opcional — sem ela, o slide usa só o gradiente preto/dourado da marca como fundo. */
  imagemUrl?: string;
}

const INTERVALO_MS = 5000;

export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [indice, setIndice] = React.useState(0);

  React.useEffect(() => {
    const intervalo = setInterval(() => {
      setIndice((atual) => (atual + 1) % slides.length);
    }, INTERVALO_MS);
    return () => clearInterval(intervalo);
  }, [slides.length]);

  const slide = slides[indice];

  return (
    <div className="relative flex h-[420px] w-full items-center overflow-hidden bg-gradient-to-br from-black via-neutral-900 to-black sm:h-[480px]">
      {slide.imagemUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- imagem de fundo, muda a cada slide
        <img
          key={slide.imagemUrl}
          src={slide.imagemUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_oklch(0.75_0.13_85_/_18%),_transparent_55%)]" />

      <AnimatePresence mode="wait">
        <motion.div
          key={indice}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 sm:px-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
            Zero Treze Transportes
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-white sm:text-5xl">
            {slide.titulo}
          </h1>
          <p className="max-w-xl text-base text-neutral-300 sm:text-lg">{slide.subtitulo}</p>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((s, i) => (
          <button
            key={s.titulo}
            type="button"
            aria-label={`Ver slide ${i + 1}`}
            onClick={() => setIndice(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === indice ? "w-8 bg-gold" : "w-4 bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
