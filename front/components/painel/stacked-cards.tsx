'use client';

import { Negociacao } from '@/lib/types/negociacoes';
import { NegociacaoCard } from './negociacao-card';
import { useMemo, useEffect, useState } from 'react';

interface StackedCardsProps {
  negociacoes: Negociacao[];
}

// Função para calcular o offset dinâmico baseado no número de cartas
// O espaçamento diminui conforme aumenta a quantidade de cartas
// Retorna um valor em pixels que será usado com unidades proporcionais
function getCardOffsetStyle(numCards: number): string {
  if (numCards <= 1) return '0px';
  
  // Usar unidades proporcionais baseadas em viewport height
  // Para poucas cartas: espaçamento maior
  // Para muitas cartas: espaçamento menor, mas sempre proporcional
  if (numCards <= 2) {
    return 'clamp(20px, 2.5vh, 30px)';
  } else if (numCards <= 4) {
    return 'clamp(12px, 1.8vh, 20px)';
  } else if (numCards <= 6) {
    return 'clamp(8px, 1.2vh, 12px)';
  } else if (numCards <= 10) {
    return 'clamp(5px, 0.8vh, 8px)';
  } else {
    // Para muitas cartas, usar espaçamento mínimo proporcional
    return 'clamp(3px, 0.5vh, 5px)';
  }
}

export function StackedCards({ negociacoes }: StackedCardsProps) {
  // Rastrear IDs anteriores para detectar mudanças
  const [previousIds, setPreviousIds] = useState<Set<string>>(new Set());
  const [previousNegociacoes, setPreviousNegociacoes] = useState<Negociacao[]>([]);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [enteringIds, setEnteringIds] = useState<Set<string>>(new Set());

  // Ordenar: primeiro a carta "now", depois as outras
  const sortedNegociacoes = useMemo(() => {
    const nowCard = negociacoes.find((neg) => neg.isNow === true);
    const otherCards = negociacoes.filter((neg) => neg.isNow !== true);
    return nowCard ? [nowCard, ...otherCards] : negociacoes;
  }, [negociacoes]);

  // Incluir cards que estão saindo temporariamente para animação
  const cardsToRender = useMemo(() => {
    const currentIds = new Set(sortedNegociacoes.map((neg) => neg.id));
    const exitingCards: Negociacao[] = [];
    
    // Encontrar cards que estão saindo mas ainda precisam ser renderizados para animação
    previousIds.forEach((id) => {
      if (!currentIds.has(id) && exitingIds.has(id)) {
        // Buscar o card completo nas negociações anteriores
        const exitingCard = previousNegociacoes.find((neg) => neg.id === id);
        if (exitingCard) {
          exitingCards.push(exitingCard);
        }
      }
    });

    return [...sortedNegociacoes, ...exitingCards];
  }, [sortedNegociacoes, exitingIds, previousIds, previousNegociacoes]);

  // Inicializar IDs na primeira renderização
  useEffect(() => {
    if (isInitialMount) {
      setPreviousIds(new Set(sortedNegociacoes.map((neg) => neg.id)));
      setPreviousNegociacoes(sortedNegociacoes);
      setIsInitialMount(false);
      return;
    }
  }, [sortedNegociacoes, isInitialMount]);

  // Detectar mudanças nas negociações para animar entrada/saída
  useEffect(() => {
    if (isInitialMount) return;

    const currentIds = new Set(sortedNegociacoes.map((neg) => neg.id));
    
    // Encontrar IDs que saíram
    const newExiting = new Set<string>();
    previousIds.forEach((id) => {
      if (!currentIds.has(id)) {
        newExiting.add(id);
      }
    });

    // Encontrar IDs que entraram
    const newEntering = new Set<string>();
    currentIds.forEach((id) => {
      if (!previousIds.has(id)) {
        newEntering.add(id);
      }
    });

    if (newExiting.size > 0 || newEntering.size > 0) {
      setExitingIds(newExiting);
      setEnteringIds(newEntering);

      // Limpar animação de entrada após a animação completar
      const enterTimeout = setTimeout(() => {
        setEnteringIds(new Set());
      }, 300); // Duração da animação de entrada (0.3s)

      // Limpar animação de saída após a animação completar
      const exitTimeout = setTimeout(() => {
        setExitingIds(new Set());
      }, 250); // Duração da animação de saída (0.25s)

      setPreviousIds(currentIds);
      setPreviousNegociacoes(sortedNegociacoes);

      return () => {
        clearTimeout(enterTimeout);
        clearTimeout(exitTimeout);
      };
    } else {
      setPreviousIds(currentIds);
      setPreviousNegociacoes(sortedNegociacoes);
    }
  }, [sortedNegociacoes, previousIds, isInitialMount]);

  if (cardsToRender.length === 0 && sortedNegociacoes.length === 0) {
    return null;
  }

  // Obter estilo de offset proporcional baseado no número de cartas
  // Usar apenas as cartas atuais (não as que estão saindo) para calcular offset
  const cardOffsetStyle = getCardOffsetStyle(sortedNegociacoes.length);
  // Altura proporcional baseada na viewport - mesma para todos os cards
  // Usando uma altura que se adapta ao tamanho da tela mas mantém proporção
  const cardHeight = 'clamp(180px, 28vh, 260px)';
  const cardWidth = '100%'; // Largura sempre 100% do container

  return (
    <div 
      className="relative w-full h-full flex items-start"
      style={{
        '--card-offset': cardOffsetStyle,
        '--card-height': cardHeight,
        '--card-width': cardWidth,
      } as React.CSSProperties & { 
        '--card-offset': string;
        '--card-height': string;
        '--card-width': string;
      }}
    >
      {/* Container interno sempre com 100% da altura do pai para garantir alinhamento */}
      <div 
        className="relative w-full h-full"
        style={{
          overflow: 'hidden', // Esconder cards que estão saindo
        }}
      >
        {cardsToRender.map((negociacao, index) => {
          // O primeiro card sempre começa no topo (top: 0px) para garantir alinhamento
          // Os cards subsequentes são deslocados proporcionalmente
          // Para cards que estão saindo, usar o índice original baseado apenas nas cartas atuais
          const currentIndex = sortedNegociacoes.findIndex((neg) => neg.id === negociacao.id);
          const displayIndex = currentIndex >= 0 ? currentIndex : sortedNegociacoes.length;
          const offsetCalc = displayIndex > 0 ? `calc(var(--card-offset) * ${displayIndex})` : '0px';
          
          const isExiting = exitingIds.has(negociacao.id);
          const isEntering = enteringIds.has(negociacao.id);
          
          return (
            <div
              key={negociacao.id}
              className="absolute"
              style={{
                top: offsetCalc,
                left: 0,
                width: 'var(--card-width)',
                height: 'var(--card-height)',
                zIndex: isEntering 
                  ? sortedNegociacoes.length + 10 // Card entrando fica acima
                  : isExiting
                  ? 0 // Card saindo fica atrás
                  : sortedNegociacoes.length - displayIndex, // Carta do topo tem maior z-index
                animation: isEntering 
                  ? 'cardEnter 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'
                  : isExiting
                  ? 'cardExit 0.25s cubic-bezier(0.55, 0.06, 0.68, 0.19) forwards'
                  : undefined,
                transition: !isExiting && !isEntering ? 'all 0.3s ease' : undefined,
                transformOrigin: 'center center',
                opacity: isExiting ? 0 : 1,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                }}
              >
                <NegociacaoCard negociacao={negociacao} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
