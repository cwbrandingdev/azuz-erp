"use client";

// Seletor flutuante para comparar designs de uma tela na própria página.
// Trazido da Sensora e adaptado às cores do ATRIA: barra verde-escura fixa
// embaixo no centro, opção ativa em areia, linha "Design" e, opcionalmente,
// a linha "Posição" (Esquerda/Centro/Direita).
//
// Uso (numa página com variantes temporárias):
//
//   const [design, setDesign] = useState<Design>("a");
//   <div key={design}>...design escolhido...</div>
//   <DesignSwitcher designs={DESIGNS} design={design} onDesign={setDesign} />
//
// Depois da escolha, remover o seletor e as variantes da página — este
// arquivo fica aqui para as próximas rodadas.
//
// A linha de ações (Salvar este / Gerar +3 / Confirmar) copia o pedido
// pronto para colar no Claude, já com a página e o design ativo.
//
// O painel pode ser arrastado pela alça (duplo clique volta ao lugar
// padrão) e minimizado para uma pílula. Posição e estado ficam no
// localStorage deste navegador; sem ele, o painel só volta ao padrão.
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronUp, GripHorizontal, Minus } from "lucide-react";

const CHAVE_POSICAO = "atria-design-switcher-posicao";
const CHAVE_MINIMIZADO = "atria-design-switcher-minimizado";
const MARGEM = 8;

type Ponto = { x: number; y: number };

function ler<T>(chave: string): T | null {
  try {
    const valor = window.localStorage.getItem(chave);
    return valor ? (JSON.parse(valor) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    if (valor === null) window.localStorage.removeItem(chave);
    else window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Sem armazenamento: o painel só não lembra a posição.
  }
}

export type Posicao = "esquerda" | "centro" | "direita";

export const POSICOES: { id: Posicao; label: string }[] = [
  { id: "esquerda", label: "Esquerda" },
  { id: "centro", label: "Centro" },
  { id: "direita", label: "Direita" },
];

function Pilula<T extends string>({
  opcoes,
  valor,
  onChange,
  rotulo,
}: {
  opcoes: { id: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="hidden px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60 sm:inline">
        {rotulo}
      </span>
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-semibold transition-colors ${
            valor === o.id
              ? "bg-[#E8C39E] text-[#003535]"
              : "text-white/80 hover:bg-white/10"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function DesignSwitcher<D extends string>({
  designs,
  design,
  onDesign,
  posicao,
  onPosicao,
  rotuloPosicao = "Posição",
  mostrarPosicao = true,
}: {
  designs: { id: D; label: string }[];
  design: D;
  onDesign: (v: D) => void;
  posicao?: Posicao;
  onPosicao?: (v: Posicao) => void;
  rotuloPosicao?: string;
  mostrarPosicao?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const painel = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ inicio: Ponto; origem: Ponto } | null>(null);
  // null = lugar padrão (embaixo, no centro).
  const [ponto, setPonto] = useState<Ponto | null>(null);
  const [minimizado, setMinimizado] = useState(false);
  // O painel vai direto para o <body> (portal): dentro de uma seção com
  // transform, "fixed" deixaria de ser relativo à tela.
  const [montado, setMontado] = useState(false);

  // Mantém o painel dentro da tela.
  function limitar(p: Ponto): Ponto {
    const caixa = painel.current?.getBoundingClientRect();
    const largura = caixa?.width ?? 0;
    const altura = caixa?.height ?? 0;
    return {
      x: Math.min(Math.max(p.x, MARGEM), window.innerWidth - largura - MARGEM),
      y: Math.min(Math.max(p.y, MARGEM), window.innerHeight - altura - MARGEM),
    };
  }

  // Restaura o que ficou salvo no primeiro quadro após a montagem (ler no
  // estado inicial divergiria do HTML do servidor).
  useEffect(() => {
    const quadro = window.requestAnimationFrame(() => {
      setMontado(true);
      const salvo = ler<Ponto>(CHAVE_POSICAO);
      if (salvo) setPonto(salvo);
      if (ler<boolean>(CHAVE_MINIMIZADO)) setMinimizado(true);
    });
    return () => window.cancelAnimationFrame(quadro);
  }, []);

  // Ao mudar de tamanho (janela ou minimizar/expandir), volta para dentro.
  useEffect(() => {
    if (!ponto) return;
    function ajustar() {
      setPonto((atual) => (atual ? limitar(atual) : atual));
    }
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minimizado, ponto === null]);

  function iniciarArraste(event: PointerEvent<HTMLButtonElement>) {
    const caixa = painel.current?.getBoundingClientRect();
    if (!caixa) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    arraste.current = {
      inicio: { x: event.clientX, y: event.clientY },
      origem: { x: caixa.left, y: caixa.top },
    };
  }

  function moverArraste(event: PointerEvent<HTMLButtonElement>) {
    const atual = arraste.current;
    if (!atual) return;
    setPonto(
      limitar({
        x: atual.origem.x + event.clientX - atual.inicio.x,
        y: atual.origem.y + event.clientY - atual.inicio.y,
      }),
    );
  }

  function soltarArraste() {
    if (!arraste.current) return;
    arraste.current = null;
    setPonto((atual) => {
      gravar(CHAVE_POSICAO, atual);
      return atual;
    });
  }

  function voltarAoPadrao() {
    setPonto(null);
    gravar(CHAVE_POSICAO, null);
  }

  function alternarMinimizado() {
    setMinimizado((atual) => {
      gravar(CHAVE_MINIMIZADO, !atual || null);
      return !atual;
    });
  }

  const nomeDesign = (
    designs.find((d) => d.id === design)?.label ?? design
  ).replace("★ ", "");

  async function copiarPedido(pedido: string) {
    await navigator.clipboard.writeText(
      `Em ${window.location.pathname}: ${pedido}`,
    );
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const acoes = [
    { label: "★ Salvar este", pedido: `deixe salvo "${nomeDesign}".` },
    { label: "Gerar +3", pedido: "gere outros 3 designs." },
    {
      label: "✓ Confirmar este",
      pedido: `vamos usar "${nomeDesign}", remova os outros e o seletor.`,
    },
  ];

  const alca = (
    <button
      type="button"
      onPointerDown={iniciarArraste}
      onPointerMove={moverArraste}
      onPointerUp={soltarArraste}
      onPointerCancel={soltarArraste}
      onDoubleClick={voltarAoPadrao}
      aria-label="Arrastar o painel (duplo clique volta ao lugar padrão)"
      title="Arraste para mover · duplo clique volta ao lugar padrão"
      className="flex h-7 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white active:cursor-grabbing"
    >
      <GripHorizontal className="h-4 w-4" />
    </button>
  );

  if (!montado) return null;

  return createPortal(
    <div
      ref={painel}
      // Arrastado: posição explícita no lugar do "embaixo, no centro".
      style={
        ponto
          ? { left: ponto.x, top: ponto.y, bottom: "auto", translate: "none" }
          : undefined
      }
      className="fixed bottom-4 left-1/2 z-100 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col gap-1 rounded-3xl bg-[#003535] p-1.5 shadow-[0_8px_30px_rgba(0,30,30,0.4)] ring-1 ring-white/10"
    >
      {minimizado ? (
        <div className="flex items-center gap-1">
          {alca}
          <button
            type="button"
            onClick={alternarMinimizado}
            aria-label="Expandir o painel de designs"
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white/90 transition-colors hover:bg-white/10"
          >
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/50">
              Design
            </span>
            <span className="rounded-full bg-[#E8C39E] px-2.5 py-0.5 text-[#003535]">
              {nomeDesign}
            </span>
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-white/10 pb-1">
            {alca}
            <button
              type="button"
              onClick={alternarMinimizado}
              aria-label="Minimizar o painel de designs"
              title="Minimizar"
              className="flex h-7 w-9 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <Pilula
              rotulo="Design"
              opcoes={designs}
              valor={design}
              onChange={onDesign}
            />
          </div>
          {mostrarPosicao && posicao && onPosicao && (
            <div className="flex justify-center border-t border-white/10 pt-1">
              <Pilula
                rotulo={rotuloPosicao}
                opcoes={POSICOES}
                valor={posicao}
                onChange={onPosicao}
              />
            </div>
          )}
          <div className="flex items-center justify-center gap-1 border-t border-white/10 pt-1">
            {copiado ? (
              <span className="px-3 py-2 text-[11px] font-semibold text-[#E8C39E]">
                Pedido copiado! Cole no Claude
              </span>
            ) : (
              acoes.map((acao) => (
                <button
                  key={acao.label}
                  type="button"
                  onClick={() => void copiarPedido(acao.pedido)}
                  className="whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/10"
                >
                  {acao.label}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
