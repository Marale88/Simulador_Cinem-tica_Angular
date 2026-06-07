import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CenaMovimento from './components/CenaMovimento.jsx';
import CenaPistaSegmentada from './components/CenaPistaSegmentada.jsx';
import { PainelResultadosMovimento } from './components/PainelMovimento.jsx';
import PainelPistaSegmentada from './components/PainelPistaSegmentada.jsx';
import { calcularMecanica } from './utils/calculosMecanica.js';
import { simularMovimentoHorizontal, simularMovimentoPlanoInclinado } from './utils/cinematica.js';
import { simularMovimentoNaPista } from './utils/movimentoSegmentado.js';

const controlesA = [
  { key: 'massa', label: 'Massa do corpo A', unidade: 'kg', initial: 100, min: 1, max: 1000, step: 1 },
  { key: 'comprimentoA', label: 'Comprimento de A', unidade: 'm', initial: 1, min: 0.05, max: 10, step: 0.01 },
  { key: 'larguraA', label: 'Largura de A', unidade: 'm', initial: 0.5, min: 0.05, max: 5, step: 0.01 },
  { key: 'alturaA', label: 'Altura de A', unidade: 'm', initial: 0.5, min: 0.05, max: 5, step: 0.01 },
  { key: 'forcaAplicada', label: 'Módulo da força em A', labelPlano: 'Força aplicada paralela ao plano', unidade: 'N', initial: 500, min: 0, max: 10000, step: 10 },
  { key: 'anguloForcaA', label: 'Ângulo da força em A', unidade: '°', initial: 30, min: 0, max: 90, step: 1, somenteInclinada: true },
  { key: 'coeficienteAtrito', label: 'Coeficiente de atrito A-solo', unidade: '', initial: 0.4, min: 0, max: 1.5, step: 0.01 },
  { key: 'moduloElasticidade', label: 'Módulo de elasticidade de A', unidade: 'Pa', initial: 2000000000, min: 1000000, max: 210000000000, step: 1000000 },
  { key: 'gravidade', label: 'Gravidade', unidade: 'm/s²', initial: 9.81, min: 1, max: 20, step: 0.01 },
];

const controlesB = [
  { key: 'massaB', label: 'Massa de B', unidade: 'kg', initial: 50, min: 1, max: 1000, step: 1 },
  { key: 'comprimentoB', label: 'Comprimento de B', unidade: 'm', initial: 0.7, min: 0.05, max: 10, step: 0.01 },
  { key: 'larguraB', label: 'Largura de B', unidade: 'm', initial: 0.4, min: 0.05, max: 5, step: 0.01 },
  { key: 'alturaB', label: 'Altura de B', unidade: 'm', initial: 0.4, min: 0.05, max: 5, step: 0.01 },
  { key: 'coeficienteAtritoBsolo', label: 'Coeficiente de atrito B-solo', unidade: '', initial: 0.4, min: 0, max: 1.5, step: 0.01 },
  { key: 'coeficienteAtritoAB', label: 'Coeficiente de atrito entre A e B', unidade: '', initial: 0.4, min: 0, max: 1.5, step: 0.01 },
  { key: 'forcaAplicadaB', label: 'Força aplicada em B', unidade: 'N', initial: 0, min: 0, max: 10000, step: 10 },
];

const controlePlano = { key: 'anguloPlano', label: 'Ângulo do plano', unidade: '°', initial: 30, min: 0, max: 60, step: 1 };

const controlesCinematica = [
  { key: 'velocidadeInicial', label: 'Velocidade inicial', unidade: 'm/s', initial: 0, min: 0, max: 100, step: 0.1 },
  { key: 'posicaoInicial', label: 'Posição inicial', unidade: 'm', initial: 0, min: 0, max: 1000, step: 0.1 },
  { key: 'tempoSimulacao', label: 'Tempo de simulação', unidade: 's', initial: 5, min: 0.1, max: 60, step: 0.1 },
  { key: 'comprimentoSuperficie', label: 'Comprimento da superfície horizontal', unidade: 'm', initial: 10, min: 0.1, max: 1000, step: 0.1 },
  { key: 'comprimentoRampa', label: 'Comprimento da rampa', unidade: 'm', initial: 5, min: 0.1, max: 1000, step: 0.1, somentePlano: true },
  { key: 'comprimentoPlanoAposRampa', label: 'Trecho plano após a rampa', unidade: 'm', initial: 10, min: 0, max: 1000, step: 0.1, somentePlano: true },
];

const controlesPistaSegmentada = [
  { key: 'comprimentoRetaInferior', label: 'Comprimento da reta inferior', unidade: 'm', initial: 5, min: 0, max: 1000, step: 0.1 },
  { key: 'comprimentoRampa', label: 'Comprimento da rampa', unidade: 'm', initial: 5, min: 0.1, max: 1000, step: 0.1 },
  { key: 'comprimentoRetaSuperior', label: 'Comprimento da reta superior', unidade: 'm', initial: 5, min: 0, max: 1000, step: 0.1 },
  { key: 'forcaExternaPista', label: 'Forca externa ao longo da pista', unidade: 'N', initial: 0, min: 0, max: 10000, step: 10 },
  { key: 'velocidadeInicialA', label: 'Velocidade inicial de A', unidade: 'm/s', initial: 0, min: 0, max: 100, step: 0.1 },
  { key: 'sInicialA', label: 's personalizado de A', unidade: 'm', initial: 0, min: 0, max: 3000, step: 0.1 },
  { key: 'velocidadeInicialB', label: 'Velocidade inicial de B', unidade: 'm/s', initial: 0, min: 0, max: 100, step: 0.1 },
  { key: 'sInicialB', label: 's personalizado de B', unidade: 'm', initial: 0, min: 0, max: 3000, step: 0.1 },
];

const valoresIniciais = [...controlesA, ...controlesB, controlePlano, ...controlesCinematica, ...controlesPistaSegmentada].reduce(
  (acc, controle) => ({ ...acc, [controle.key]: controle.initial }),
  {
    cenario: 'horizontal',
    modoSimulacao: 'forcas',
    temaVisual: 'retro',
    blocoBAtivo: false,
    posicaoB: 'direita',
    modoForcaA: 'horizontal',
    tipoForcaA: 'horizontal',
    sentidoForcaA: 'direita',
    sentidoVerticalForcaA: 'cima',
    modoForcaB: 'semForca',
    anguloForcaB: 30,
    sentidoHorizontalForcaB: 'esquerda',
    sentidoVerticalForcaB: 'cima',
    sentidoForcaB: 'esquerda',
    sentidoForcaPlano: 'subindo',
    sentidoForcaBPlano: 'descendo',
    posicaoBPlano: 'acimaDeA',
    posicaoInicialTipoA: 'ponto2',
    posicaoInicialTipoB: 'ponto3',
    sentidoInicialA: 'paraFrente',
    sentidoInicialB: 'paraTras',
    sentidoForcaPista: 'paraFrente',
    mostrarComponentesNoDesenho: false,
    mostrarComponentesPesoPlano: false,
  },
);

function clamp(valor, min, max) {
  return Math.min(Math.max(valor, min), max);
}

function formatarNumero(valor, casas = 2) {
  if (!Number.isFinite(valor)) return '0';
  const absoluto = Math.abs(valor);
  if (absoluto >= 1000000 || (absoluto > 0 && absoluto < 0.001)) return valor.toExponential(2);
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

function formatarEntrada(valor) {
  return Number.isInteger(valor) ? String(valor) : String(Number(valor.toFixed(6)));
}

function classeEstado(texto) {
  return String(texto || 'parado')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll(' ', '-')
    .toLowerCase();
}

function escalaVisual(valor, minPx, maxPx, minValor, maxValor) {
  const normalizado = (valor - minValor) / (maxValor - minValor);
  const limitado = Math.max(0, Math.min(1, normalizado));
  return minPx + limitado * (maxPx - minPx);
}

function ControleParametro({ controle, valor, onChange, labelOverride }) {
  const atualiza = (novoValor) => {
    const numerico = Number(novoValor);
    const seguro = Number.isFinite(numerico) ? clamp(numerico, controle.min, controle.max) : controle.min;
    onChange(controle.key, seguro);
  };

  return (
    <label className="controle">
      <span className="controle-topo">
        <span>{labelOverride || controle.label}</span>
        <strong>{formatarNumero(valor, controle.step < 1 ? 2 : 0)} {controle.unidade}</strong>
      </span>
      <input type="range" min={controle.min} max={controle.max} step={controle.step} value={valor} onChange={(event) => atualiza(event.target.value)} />
      <span className="controle-base">
        <small>{formatarNumero(controle.min, controle.step < 1 ? 2 : 0)}</small>
        <input type="number" min={controle.min} max={controle.max} step={controle.step} value={formatarEntrada(valor)} onChange={(event) => atualiza(event.target.value)} />
        <small>{formatarNumero(controle.max, controle.step < 1 ? 2 : 0)}</small>
      </span>
    </label>
  );
}

function GrupoRadio({ titulo, name, valor, opcoes, onChange }) {
  return (
    <fieldset className="grupo-radio">
      <legend>{titulo}</legend>
      <div>
        {opcoes.map((opcao) => (
          <label key={opcao.value}>
            <input type="radio" name={name} value={opcao.value} checked={valor === opcao.value} onChange={(event) => onChange(name, event.target.value)} />
            <span>{opcao.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Toggle({ checked, label, onChange }) {
  return (
    <label className="toggle-b">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Arrow({ className, label, style, hidden = false }) {
  if (hidden) return null;
  return <div className={`seta ${className}`} style={style}><span>{label}</span></div>;
}

function dimensoesVisuaisBloco(params, tipo) {
  const prefixo = tipo === 'a' ? 'A' : 'B';
  const comprimento = params[`comprimento${prefixo}`] || (tipo === 'a' ? 1 : 0.7);
  const altura = params[`altura${prefixo}`] || (tipo === 'a' ? 0.5 : 0.4);

  return {
    width: escalaVisual(comprimento, tipo === 'a' ? 120 : 95, tipo === 'a' ? 220 : 185, 0.05, 10),
    height: escalaVisual(altura, tipo === 'a' ? 62 : 52, tipo === 'a' ? 122 : 108, 0.05, 5),
  };
}

function estiloBloco(params, tipo) {
  const dimensoes = dimensoesVisuaisBloco(params, tipo);

  return {
    width: `${dimensoes.width}px`,
    height: `${dimensoes.height}px`,
  };
}

function Bloco({ tipo, texto = 'A', style }) {
  return <div className={`bloco bloco-${tipo}`} style={style}><span>{texto}</span></div>;
}

function MiniFormula({ titulo, itens }) {
  return (
    <div className="mini-formula">
      <h3>{titulo}</h3>
      {itens.map((item) => <p key={item}>{item}</p>)}
    </div>
  );
}

function normalizarVetor(vetor) {
  const modulo = Math.sqrt(vetor.x * vetor.x + vetor.y * vetor.y);
  if (modulo === 0) return { x: 0, y: 0 };
  return { x: vetor.x / modulo, y: vetor.y / modulo };
}

function deslocarPonto(ponto, vetor, distancia) {
  const unitario = normalizarVetor(vetor);
  return {
    x: ponto.x + unitario.x * distancia,
    y: ponto.y + unitario.y * distancia,
  };
}

function setaPorVetor({ start, vector, length, label, className, labelOffset = 8, labelNudge = { x: 0, y: 0 } }) {
  const unitario = normalizarVetor(vector);
  const end = {
    x: start.x + unitario.x * length,
    y: start.y + unitario.y * length,
  };
  const labelPosition = {
    x: end.x + unitario.x * labelOffset + labelNudge.x,
    y: end.y + unitario.y * labelOffset + labelNudge.y,
  };

  return { start, end, labelPosition, label, className };
}

function centroVisual(bloco) {
  if (!bloco) return null;
  return {
    x: bloco.x + bloco.width / 2,
    y: bloco.y + bloco.height / 2,
  };
}

function pontoFaceMedido(centro, tamanho, vetorEntrada, recuo = 0) {
  if (!centro || !tamanho) return centro;
  const unitario = normalizarVetor(vetorEntrada);
  const raioNaDirecao =
    Math.abs(unitario.x) * (tamanho.width / 2) +
    Math.abs(unitario.y) * (tamanho.height / 2);
  return {
    x: centro.x - unitario.x * (raioNaDirecao + recuo),
    y: centro.y - unitario.y * (raioNaDirecao + recuo),
  };
}

function pontoFace(bloco, vetor, recuo = 0.8) {
  if (!bloco) return null;
  const centro = centroVisual(bloco);
  const unitario = normalizarVetor(vetor);
  return {
    x: centro.x + unitario.x * (bloco.width / 2 + recuo),
    y: centro.y + unitario.y * (bloco.height / 2 + recuo),
  };
}

function pontoContatoPlano(bloco, normalOut, tangent, deslocamentoTangente = 0) {
  if (!bloco) return null;
  const centro = centroVisual(bloco);
  return deslocarPonto(
    deslocarPonto(centro, normalOut, -(bloco.height / 2 + 0.8)),
    tangent,
    deslocamentoTangente,
  );
}

function blocoPorCentro(centro, width = 18, height = 15) {
  return {
    x: centro.x - width / 2,
    y: centro.y - height / 2,
    width,
    height,
  };
}

function blocosPlanoVisual(params) {
  const posicao = params.posicaoBPlano;
  if (!params.blocoBAtivo) {
    return { a: blocoPorCentro({ x: 45, y: 51 }, 20, 16), b: null };
  }

  if (posicao === 'abaixoDeA') {
    return {
      a: blocoPorCentro({ x: 50, y: 45 }, 20, 16),
      b: blocoPorCentro({ x: 35, y: 58 }, 16, 13),
    };
  }

  if (posicao === 'emCimaDeA') {
    return {
      a: blocoPorCentro({ x: 43, y: 53 }, 20, 16),
      b: blocoPorCentro({ x: 40, y: 39 }, 16, 13),
    };
  }

  return {
    a: blocoPorCentro({ x: 37, y: 47 }, 20, 16),
    b: blocoPorCentro({ x: 52, y: 43 }, 16, 13),
  };
}

function centrosPlano(params) {
  const blocos = blocosPlanoVisual(params);
  return {
    a: centroVisual(blocos.a),
    b: centroVisual(blocos.b),
    blocos,
  };
}

function ForcasPlanoSvg({ resultados, params, centrosMedidos }) {
  const caixaSvg = centrosMedidos?.caixa || { width: 100, height: 100 };
  const escala = Math.max(0.75, Math.min(caixaSvg.width, caixaSvg.height) / 180);
  const escalarPonto = (ponto) => ({
    x: ponto.x * caixaSvg.width / 100,
    y: ponto.y * caixaSvg.height / 100,
  });
  const setaEscalada = (config) => setaPorVetor({
    ...config,
    length: config.length * escala,
    labelOffset: (config.labelOffset ?? 7) * escala,
    labelNudge: {
      x: (config.labelNudge?.x || 0) * escala,
      y: (config.labelNudge?.y || 0) * escala,
    },
  });
  const thetaRad = ((resultados.anguloPlano || 0) * Math.PI) / 180;
  const tangentUp = normalizarVetor({
    x: Math.cos(thetaRad),
    y: -Math.sin(thetaRad),
  });
  const tangentDown = normalizarVetor({
    x: -Math.cos(thetaRad),
    y: Math.sin(thetaRad),
  });
  const normalOut = normalizarVetor({
    x: -Math.sin(thetaRad),
    y: -Math.cos(thetaRad),
  });
  const normalIn = { x: -normalOut.x, y: -normalOut.y };
  const pesoDown = { x: 0, y: 1 };
  const centrosBase = centrosPlano(params);
  const centros = {
    a: centrosMedidos?.a || escalarPonto(centrosBase.a),
    b: centrosMedidos?.b || (centrosBase.b ? escalarPonto(centrosBase.b) : null),
  };
  const tamanhos = centrosMedidos?.tamanhos || {};
  const forcaPerpendicularA = resultados.forcaPerpendicularPlanoA || 0;
  const forcaPerpendicularB = resultados.forcaPerpendicularPlanoB || 0;
  const moduloForcaBPlano = Math.abs(resultados.forcaAplicadaBPlano ?? (params.modoForcaB !== 'semForca' ? params.forcaAplicadaB : 0));
  const fatVector = resultados.direcaoAtrito === 'subindo' ? tangentUp : tangentDown;
  const forcaAVector = resultados.forcaAplicadaPlano >= 0 ? tangentUp : tangentDown;
  const forcaBVector = resultados.forcaAplicadaBPlano >= 0 ? tangentUp : tangentDown;
  const setas = [
    setaEscalada({ start: centros.a, vector: pesoDown, length: 24, label: 'P_A', className: 'peso', labelOffset: 5, labelNudge: { x: -3, y: 2 } }),
    setaEscalada({ start: centros.a, vector: normalOut, length: 21, label: 'N_A', className: 'normal', labelOffset: 5, labelNudge: { x: -3, y: -1 } }),
  ];

  if (resultados.forcaAplicadaPlano || forcaPerpendicularA > 0) {
    const vetorAplicadoA = forcaPerpendicularA > 0 ? normalIn : forcaAVector;
    const origemForcaA = pontoFaceMedido(centros.a, tamanhos.a, vetorAplicadoA, 18);
    setas.push(
      setaEscalada({ start: origemForcaA, vector: vetorAplicadoA, length: 19, label: 'F_A', className: 'aplicada-a', labelOffset: 5, labelNudge: { x: -1, y: -2 } }),
    );
  }

  if (resultados.atritoAtuante > 0) {
    setas.push(
      setaEscalada({ start: centros.a, vector: fatVector, length: 17, label: params.blocoBAtivo ? 'Fat_A' : 'Fat', className: 'atrito', labelOffset: 5, labelNudge: { x: 0, y: 2 } }),
    );
  }

  if (params.blocoBAtivo && centros.b) {
    setas.push(
      setaEscalada({ start: centros.b, vector: pesoDown, length: 22, label: 'P_B', className: 'peso', labelOffset: 5, labelNudge: { x: 3, y: 2 } }),
      setaEscalada({ start: centros.b, vector: normalOut, length: 19, label: 'N_B', className: 'normal', labelOffset: 5, labelNudge: { x: 3, y: -2 } }),
    );

    if (moduloForcaBPlano > 0 || forcaPerpendicularB > 0) {
      const vetorAplicadoB = forcaPerpendicularB > 0 ? normalIn : forcaBVector;
      const origemForcaB = pontoFaceMedido(centros.b, tamanhos.b, vetorAplicadoB, 15);
      setas.push(
        setaEscalada({ start: origemForcaB, vector: vetorAplicadoB, length: 17, label: 'F_B', className: 'aplicada-b', labelOffset: 5, labelNudge: { x: 2, y: -2 } }),
      );
    }

    if (resultados.atritoMaximoB > 0 && resultados.submodoPlano === 'blocosEmContato') {
      setas.push(
        setaEscalada({ start: centros.b, vector: fatVector, length: 15, label: 'Fat_B', className: 'atrito-b', labelOffset: 5, labelNudge: { x: 3, y: 2 } }),
      );
    }
  }

  return (
    <svg className="forcas-plano-svg" viewBox={`0 0 ${caixaSvg.width} ${caixaSvg.height}`} aria-hidden="true">
      <defs>
        <marker id="arrow-normal" markerWidth="3" markerHeight="3" refX="2.7" refY="1.5" orient="auto">
          <path d="M0,0 L3,1.5 L0,3 Z" />
        </marker>
        <marker id="arrow-peso" markerWidth="3" markerHeight="3" refX="2.7" refY="1.5" orient="auto">
          <path d="M0,0 L3,1.5 L0,3 Z" />
        </marker>
        <marker id="arrow-aplicada" markerWidth="3" markerHeight="3" refX="2.7" refY="1.5" orient="auto">
          <path d="M0,0 L3,1.5 L0,3 Z" />
        </marker>
        <marker id="arrow-atrito" markerWidth="3" markerHeight="3" refX="2.7" refY="1.5" orient="auto">
          <path d="M0,0 L3,1.5 L0,3 Z" />
        </marker>
      </defs>
      {setas.map((seta) => (
        <g key={seta.label} className={`vetor-plano vetor-${seta.className}`}>
          <line x1={seta.start.x} y1={seta.start.y} x2={seta.end.x} y2={seta.end.y} />
          <text x={seta.labelPosition.x} y={seta.labelPosition.y}>{seta.label}</text>
        </g>
      ))}
    </svg>
  );
}

function CenaPlanoInclinado({ resultados, params }) {
  const estadoClasse = classeEstado(resultados.descricaoSistema);
  const angulo = resultados.anguloPlano;
  const sentidoF = resultados.forcaAplicadaPlano >= 0 ? 'subindo' : 'descendo';
  const sentidoFB = resultados.forcaAplicadaBPlano >= 0 ? 'subindo' : 'descendo';
  const sentidoFat = resultados.direcaoAtrito === 'subindo' ? 'subindo' : 'descendo';
  const temB = params.blocoBAtivo;
  const cenaRef = useRef(null);
  const [centrosMedidos, setCentrosMedidos] = useState(null);

  useLayoutEffect(() => {
    const cena = cenaRef.current;
    if (!cena) return undefined;

    const medirCentros = () => {
      const cenaRect = cena.getBoundingClientRect();
      const blocoA = cena.querySelector('.bloco-a');
      const blocoB = cena.querySelector('.bloco-b');
      const paraViewBox = (elemento) => {
        if (!elemento || cenaRect.width === 0 || cenaRect.height === 0) return null;
        const rect = elemento.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2 - cenaRect.left,
          y: rect.top + rect.height / 2 - cenaRect.top,
        };
      };
      const medirTamanho = (elemento) => {
        if (!elemento) return null;
        const rect = elemento.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
        };
      };

      setCentrosMedidos({
        caixa: {
          width: cenaRect.width,
          height: cenaRect.height,
        },
        a: paraViewBox(blocoA),
        b: paraViewBox(blocoB),
        tamanhos: {
          a: medirTamanho(blocoA),
          b: medirTamanho(blocoB),
        },
      });
    };

    medirCentros();
    const observer = new ResizeObserver(medirCentros);
    observer.observe(cena);
    cena.querySelectorAll('.bloco').forEach((bloco) => observer.observe(bloco));
    window.addEventListener('resize', medirCentros);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', medirCentros);
    };
  }, [params.blocoBAtivo, params.posicaoBPlano, params.comprimentoA, params.alturaA, params.comprimentoB, params.alturaB, angulo]);

  return (
    <section className="painel visual">
      <div className="visual-cabecalho">
        <div>
          <p className="rotulo">Cena física</p>
          <h2>Bloco A em plano inclinado</h2>
        </div>
        <span className={`estado estado-${estadoClasse}`}>{resultados.descricaoSistema}</span>
      </div>

      <div ref={cenaRef} className={`cena cena-plano estado-corpo-${estadoClasse}`}>
        <div className="rampa-wrap" style={{ transform: `rotate(${-angulo}deg)` }}>
          <div className="rampa-linha" />
          <div className="bloco-plano blocos-plano">
            {params.blocoBAtivo && params.posicaoBPlano === 'abaixoDeA' ? <Bloco tipo="b" texto="B" style={estiloBloco(params, 'b')} /> : null}
            <div className="pilha-plano">
              {params.blocoBAtivo && params.posicaoBPlano === 'emCimaDeA' ? <Bloco tipo="b" texto="B" style={estiloBloco(params, 'b')} /> : null}
              <Bloco tipo="a" texto="A" style={estiloBloco(params, 'a')} />
            </div>
            {params.blocoBAtivo && params.posicaoBPlano === 'acimaDeA' ? <Bloco tipo="b" texto="B" style={estiloBloco(params, 'b')} /> : null}
          </div>
          <Arrow className="seta-plano componente-peso paralelo" label="P∥" hidden={!params.mostrarComponentesPesoPlano} />
          <Arrow className="seta-plano componente-peso perpendicular" label="P⊥" hidden={!params.mostrarComponentesPesoPlano} />
        </div>
        <ForcasPlanoSvg resultados={resultados} params={params} centrosMedidos={centrosMedidos} />
        <div className="theta-plano">θ = {formatarNumero(angulo, 0)}°</div>
        <div className="base-plano" />
      </div>

      <p className="mensagem">{resultados.mensagemDidatica}</p>
      <div className="observacao">
        Este é um modelo didático simplificado. A decomposição vetorial, as tensões, os contatos e os atritos são tratados de forma média e idealizada. Uma análise real exigiria geometria detalhada, propriedades completas dos materiais, condições de contato mais precisas e métodos avançados, como elementos finitos.
      </div>
      <div className="observacao observacao-secundaria">
        No modo plano inclinado desta versão, o simulador considera apenas o Bloco A. A integração do Bloco B ao plano inclinado será feita em uma versão futura.
      </div>
    </section>
  );
}

function CenaHorizontal({ resultados, params }) {
  const estadoClasse = classeEstado(resultados.descricaoSistema || resultados.estado);
  const dimensoesA = dimensoesVisuaisBloco(params, 'a');
  const dimensoesB = dimensoesVisuaisBloco(params, 'b');
  const offsetA =
    params.blocoBAtivo && params.posicaoB === 'direita'
      ? -dimensoesB.width / 2
      : params.blocoBAtivo && params.posicaoB === 'esquerda'
        ? dimensoesB.width / 2
        : 0;
  const offsetB =
    params.blocoBAtivo && params.posicaoB === 'direita'
      ? dimensoesA.width / 2
      : params.blocoBAtivo && params.posicaoB === 'esquerda'
        ? -dimensoesA.width / 2
        : 0;
  const cenaStyle = {
    '--a-w': `${dimensoesA.width}px`,
    '--a-h': `${dimensoesA.height}px`,
    '--b-w': `${dimensoesB.width}px`,
    '--b-h': `${dimensoesB.height}px`,
    '--a-offset': `${offsetA}px`,
    '--b-offset': `${offsetB}px`,
    '--scene-h': '420px',
  };
  const maxReferencia = Math.max(params.forcaAplicada, Math.abs(resultados.forcaA_vetor || 0), Math.abs(resultados.forcaA_vertical || 0), resultados.atritoAtuante, resultados.pesoA, resultados.pesoB || 0, resultados.normal || 0, 1);
  const escalaHorizontal = 82 / maxReferencia;
  const escalaVertical = 68 / maxReferencia;
  const larguraFA = clamp(Math.abs(resultados.forcaA_vetor || params.forcaAplicada) * escalaHorizontal, 24, 96);
  const larguraFB = clamp(params.forcaAplicadaB * escalaHorizontal, 24, 96);
  const larguraFat = clamp(resultados.atritoAtuante * escalaHorizontal, 24, 96);
  const alturaFy = clamp(Math.abs(resultados.forcaA_vertical || 0) * escalaVertical, 24, 66);
  const alturaPesoA = clamp(resultados.pesoA * escalaVertical, 28, 76);
  const alturaPesoB = clamp((resultados.pesoB || 0) * escalaVertical, 28, 68);
  const alturaNormal = clamp((resultados.normal || resultados.normalA) * escalaVertical, 0, 80);
  const normalBVisual = resultados.normalB || resultados.normalAB || 0;
  const alturaNormalB = clamp(normalBVisual * escalaVertical, 0, 72);
  const direcaoFA = resultados.forcaA_vetor < 0 ? 'esquerda' : 'direita';
  const direcaoFy = resultados.forcaA_vertical < 0 ? 'baixo' : 'cima';
  const direcaoFB = params.sentidoForcaB === 'esquerda' ? 'esquerda' : 'direita';
  const direcaoFat = resultados.direcaoAtrito === 'direita' ? 'direita' : 'esquerda';
  const forcaAAtiva = resultados.forcaA?.ativa !== false && params.modoForcaA !== 'semForca';
  const forcaBAtiva = resultados.forcaB?.ativa === true && params.modoForcaB !== 'semForca';
  const mostrarInclinada = params.modoForcaA === 'inclinada';
  const mostrarInclinadaB = params.modoForcaB === 'inclinada';
  const mostrarPerpendicular = params.modoForcaA === 'perpendicular';
  const mostrarPerpendicularB = params.modoForcaB === 'perpendicular';
  const mostrarComponentes = forcaAAtiva && mostrarInclinada && params.mostrarComponentesNoDesenho;
  const anguloVisual = (params.sentidoForcaA === 'esquerda' ? 180 : 0) + (params.sentidoVerticalForcaA === 'baixo' ? params.anguloForcaA : -params.anguloForcaA);
  const anguloVisualB =
    (params.sentidoHorizontalForcaB === 'esquerda' ? 180 : 0) +
    (params.sentidoVerticalForcaB === 'baixo' ? params.anguloForcaB : -params.anguloForcaB);

  return (
    <section className="painel visual">
      <div className="visual-cabecalho">
        <div>
          <p className="rotulo">Cena física</p>
          <h2>{resultados.modo === 'empilhado' ? 'Bloco B sobre A' : resultados.modo === 'ladoALado' ? 'Blocos lado a lado' : 'Superfície horizontal'}</h2>
        </div>
        <span className={`estado estado-${estadoClasse}`}>{resultados.descricaoSistema}</span>
      </div>

      <div className={`cena cena-${resultados.modo} posicao-${params.posicaoB} estado-corpo-${estadoClasse}`} style={cenaStyle}>
        <Arrow className={`seta-forca-a seta-horizontal ${direcaoFA}`} label="F" style={{ width: `${larguraFA}px` }} hidden={mostrarInclinada || mostrarPerpendicular || !forcaAAtiva} />
        <Arrow className={`seta-forca-inclinada ${params.sentidoForcaA} ${params.sentidoVerticalForcaA}`} label="F" style={{ width: `${clamp(params.forcaAplicada * escalaHorizontal, 46, 118)}px`, transform: `rotate(${anguloVisual}deg)` }} hidden={!mostrarInclinada || !forcaAAtiva} />
        <Arrow className="seta-forca-perpendicular-a seta-vertical baixo" label="F" style={{ height: `${clamp(params.forcaAplicada * escalaVertical, 30, 78)}px` }} hidden={!mostrarPerpendicular || !forcaAAtiva} />
        <Arrow className={`seta-fx-a seta-horizontal ${direcaoFA}`} label="Fx" style={{ width: `${larguraFA}px` }} hidden={!mostrarComponentes} />
        <Arrow className={`seta-fy-a seta-vertical ${direcaoFy}`} label="Fy" style={{ height: `${alturaFy}px` }} hidden={!mostrarComponentes || Math.abs(resultados.forcaA_vertical) < 0.000001} />
        {mostrarComponentes ? <div className="angulo-theta">θ = {formatarNumero(params.anguloForcaA, 0)}°</div> : null}
        <Arrow className={`seta-forca-b seta-horizontal ${direcaoFB}`} label="F_B" style={{ width: `${larguraFB}px` }} hidden={!params.blocoBAtivo || !forcaBAtiva || mostrarInclinadaB || mostrarPerpendicularB} />
        <Arrow className={`seta-forca-b-inclinada ${params.sentidoHorizontalForcaB} ${params.sentidoVerticalForcaB}`} label="F_B" style={{ width: `${larguraFB}px`, transform: `rotate(${anguloVisualB}deg)` }} hidden={!params.blocoBAtivo || !forcaBAtiva || !mostrarInclinadaB} />
        <Arrow className="seta-forca-perpendicular-b seta-vertical baixo" label="F_B" style={{ height: `${clamp(params.forcaAplicadaB * escalaVertical, 28, 72)}px` }} hidden={!params.blocoBAtivo || !forcaBAtiva || !mostrarPerpendicularB} />
        <Arrow className={`seta-fat seta-horizontal ${direcaoFat}`} label="Fat" style={{ width: `${larguraFat}px` }} hidden={resultados.atritoAtuante <= 0} />
        <Arrow className="seta-normal seta-vertical cima" label="N" style={{ height: `${alturaNormal}px` }} hidden={alturaNormal <= 0} />
        <Arrow className="seta-normal-b seta-vertical cima" label="N_B" style={{ height: `${alturaNormalB}px` }} hidden={!params.blocoBAtivo || alturaNormalB <= 0} />
        <Arrow className="seta-peso-a seta-vertical baixo" label="P" style={{ height: `${alturaPesoA}px` }} />
        <Arrow className="seta-peso-b seta-vertical baixo" label="P_B" style={{ height: `${alturaPesoB}px` }} hidden={!params.blocoBAtivo} />

        <div className="movimento movimento-um" />
        <div className="movimento movimento-dois" />

        <div className="conjunto-blocos">
          {params.blocoBAtivo && params.posicaoB === 'esquerda' ? <Bloco tipo="b" texto="B" style={estiloBloco(params, 'b')} /> : null}
          <div className="pilha-a">
            {params.blocoBAtivo && params.posicaoB === 'emCima' ? <Bloco tipo="b" texto="B" style={estiloBloco(params, 'b')} /> : null}
            <Bloco tipo="a" texto="A" style={estiloBloco(params, 'a')} />
          </div>
          {params.blocoBAtivo && params.posicaoB === 'direita' ? <Bloco tipo="b" texto="B" style={estiloBloco(params, 'b')} /> : null}
        </div>
        <div className="superficie" />
      </div>

      <p className="mensagem">{mensagemDidaticaHorizontal(resultados)}</p>
      <div className="observacao">
        Este é um modelo didático simplificado. A decomposição vetorial, as tensões, os contatos e os atritos são tratados de forma média e idealizada. Uma análise real exigiria geometria detalhada, propriedades completas dos materiais, condições de contato mais precisas e métodos avançados, como elementos finitos.
      </div>
    </section>
  );
}

function mensagemDidaticaHorizontal(resultados) {
  if (resultados.modo === 'empilhado') return `${resultados.diagnosticoEmpilhado} ${resultados.diagnosticoForcaInclinada}`;
  if (resultados.modo === 'ladoALado') {
    const movimento = resultados.estadoSistema === 'deslizando' ? `O sistema desliza para a ${resultados.sentidoMovimento}.` : 'O conjunto não desliza sobre o solo.';
    return `${resultados.diagnosticoContato} ${movimento} ${resultados.diagnosticoForcaInclinada}`;
  }
  return `${resultados.estado === 'deslizando' ? 'A força horizontal resultante venceu o atrito.' : 'O atrito equilibra a tendência de movimento.'} ${resultados.diagnosticoForcaInclinada}`;
}

function CenaBloco({ resultados, params }) {
  if (resultados.modo === 'planoInclinado') return <CenaPlanoInclinado resultados={resultados} params={params} />;
  return <CenaHorizontal resultados={resultados} params={params} />;
}

function ResultadoItem({ label, valor, unidade, extra }) {
  return (
    <div className="resultado-item">
      <span>{label}</span>
      <strong>{valor} <small>{unidade}</small></strong>
      {extra ? <em>{extra}</em> : null}
    </div>
  );
}

function ResultadoTexto({ label, valor }) {
  return <div className="resultado-item resultado-texto"><span>{label}</span><strong>{valor}</strong></div>;
}

function SecaoResultado({ titulo, children }) {
  return <div className="secao-resultado"><h3>{titulo}</h3>{children}</div>;
}

function DimensoesTexto({ geo }) {
  if (!geo) return null;
  return `${formatarNumero(geo.comprimento, 2)} × ${formatarNumero(geo.largura, 2)} × ${formatarNumero(geo.altura, 2)} m`;
}

function ResultadosPlano({ resultados }) {
  const temB = resultados.blocoBAtivo;

  return (
    <>
      <SecaoResultado titulo="Geometria">
        <ResultadoTexto label="Dimensões de A" valor={<DimensoesTexto geo={resultados.geometriaA} />} />
        <ResultadoItem label="Área da base de A" valor={formatarNumero(resultados.areaBaseA)} unidade="m²" />
        <ResultadoItem label="Volume de A" valor={formatarNumero(resultados.volumeA)} unidade="m³" />
        {resultados.blocoBAtivo ? (
          <>
            <ResultadoTexto label="Dimensões de B" valor={<DimensoesTexto geo={resultados.geometriaB} />} />
            <ResultadoItem label="Área da base de B" valor={formatarNumero(resultados.areaBaseB)} unidade="m²" />
            <ResultadoItem label="Volume de B" valor={formatarNumero(resultados.volumeB)} unidade="m³" />
            <ResultadoItem label="Área de contato A-B" valor={formatarNumero(resultados.areaContatoAB)} unidade="m²" />
          </>
        ) : null}
      </SecaoResultado>
      <SecaoResultado titulo="Bloco A">
        <ResultadoItem label="Peso de A" valor={formatarNumero(resultados.pesoA)} unidade="N" />
        <ResultadoItem label="Normal de A" valor={formatarNumero(resultados.normalA)} unidade="N" />
        <ResultadoItem label="Atrito máximo de A" valor={formatarNumero(resultados.atritoMaximoA)} unidade="N" />
        <ResultadoItem label="Atrito atuante" valor={formatarNumero(resultados.atritoAtuante)} unidade="N" />
      </SecaoResultado>
      {temB ? (
        <SecaoResultado titulo="Bloco B no plano">
          <ResultadoItem label="Peso de B" valor={formatarNumero(resultados.pesoB)} unidade="N" />
          <ResultadoItem label="Normal de B" valor={formatarNumero(resultados.normalB || resultados.normalAB || 0)} unidade="N" />
          <ResultadoItem label="Atrito máximo de B" valor={formatarNumero(resultados.atritoMaximoB || resultados.atritoMaximoAB || 0)} unidade="N" />
          {Number.isFinite(resultados.normalAB) ? <ResultadoItem label="Normal entre A e B" valor={formatarNumero(resultados.normalAB)} unidade="N" /> : null}
          {Number.isFinite(resultados.pesoTotal) ? <ResultadoItem label="Peso total" valor={formatarNumero(resultados.pesoTotal)} unidade="N" /> : null}
          {Number.isFinite(resultados.normalSoloA) ? <ResultadoItem label="Normal do conjunto" valor={formatarNumero(resultados.normalSoloA)} unidade="N" /> : null}
        </SecaoResultado>
      ) : null}
      <SecaoResultado titulo="Plano inclinado">
        <ResultadoItem label="Ângulo do plano" valor={formatarNumero(resultados.anguloPlano, 0)} unidade="°" />
        <ResultadoItem label="P paralelo" valor={formatarNumero(resultados.pesoParalelo)} unidade="N" extra="P∥ = P · sen(θ), com sinal negativo descendo" />
        <ResultadoItem label="P perpendicular" valor={formatarNumero(resultados.pesoPerpendicular)} unidade="N" extra="P⊥ = P · cos(θ)" />
        {resultados.blocoBAtivo ? (
          <>
            <ResultadoItem label="P paralelo de A" valor={formatarNumero(resultados.pesoParaleloA)} unidade="N" />
            <ResultadoItem label="P perpendicular de A" valor={formatarNumero(resultados.pesoPerpendicularA)} unidade="N" />
            <ResultadoItem label="P paralelo de B" valor={formatarNumero(resultados.pesoParaleloB)} unidade="N" />
            <ResultadoItem label="P perpendicular de B" valor={formatarNumero(resultados.pesoPerpendicularB)} unidade="N" />
          </>
        ) : null}
        <ResultadoItem label="Força aplicada paralela" valor={formatarNumero(resultados.forcaAplicadaPlano)} unidade="N" />
        {resultados.blocoBAtivo ? <ResultadoItem label="Força de B na rampa" valor={formatarNumero(resultados.forcaAplicadaBPlano)} unidade="N" /> : null}
        <ResultadoItem label="Força sem atrito" valor={formatarNumero(resultados.forcaSemAtrito)} unidade="N" />
        <ResultadoTexto label="Tendência antes do atrito" valor={resultados.sentidoTendencia} />
      </SecaoResultado>
      {resultados.blocoBAtivo ? (
        <SecaoResultado titulo="Contato no plano">
          <ResultadoTexto label="Diagnóstico" valor={resultados.diagnosticoContatoPlano} />
          <ResultadoItem label="Força de contato A-B" valor={formatarNumero(resultados.forcaContatoAB || 0)} unidade="N" />
          <ResultadoItem label="Pressão média A-B" valor={formatarNumero(resultados.pressaoContatoAB || 0)} unidade="Pa" extra={`${formatarNumero((resultados.pressaoContatoAB || 0) / 1000)} kPa`} />
          {resultados.estadoRelativoAB ? <ResultadoTexto label="Estado relativo" valor={resultados.estadoRelativoAB} /> : null}
          {Number.isFinite(resultados.forcaAtritoNecessariaAB) ? <ResultadoItem label="Atrito necessário A-B" valor={formatarNumero(resultados.forcaAtritoNecessariaAB)} unidade="N" /> : null}
        </SecaoResultado>
      ) : null}
      <SecaoResultado titulo="Movimento">
        <ResultadoItem label="Força resultante" valor={formatarNumero(resultados.forcaResultante)} unidade="N" />
        <ResultadoItem label="Aceleração" valor={formatarNumero(resultados.aceleracao, 3)} unidade="m/s²" />
        <ResultadoTexto label="Sentido do movimento" valor={resultados.sentidoMovimento} />
        <ResultadoTexto label="Estado" valor={resultados.descricaoSistema} />
      </SecaoResultado>
      <SecaoResultado titulo="Decomposição do peso">
        <ResultadoTexto label="Peso" valor="P = m · g" />
        <ResultadoTexto label="Paralela" valor="P∥ = P · sen(θ)" />
        <ResultadoTexto label="Perpendicular" valor="P⊥ = P · cos(θ)" />
        <ResultadoTexto label="Normal" valor="N = P⊥" />
        <ResultadoTexto label="Atrito máximo" valor="Fat,max = μ · N" />
      </SecaoResultado>
      <SecaoResultado titulo="Tensões e deformação">
        <ResultadoItem label="Tensão na base" valor={formatarNumero(resultados.tensaoBase)} unidade="Pa" extra={`${formatarNumero(resultados.tensaoBase / 1000)} kPa`} />
        <ResultadoItem label="Deformação elástica" valor={formatarNumero(resultados.deformacaoElastica, 6)} unidade="m" extra={`${formatarNumero(resultados.deformacaoElasticaMm, 4)} mm`} />
      </SecaoResultado>
    </>
  );
}

function ResultadosHorizontal({ resultados, params }) {
  return (
    <>
      <SecaoResultado titulo="Geometria">
        <ResultadoTexto label="Dimensões de A" valor={<DimensoesTexto geo={resultados.geometriaA} />} />
        <ResultadoItem label="Área da base de A" valor={formatarNumero(resultados.areaBaseA)} unidade="m²" />
        <ResultadoItem label="Área lateral de A" valor={formatarNumero(resultados.areaLateralA)} unidade="m²" />
        <ResultadoItem label="Volume de A" valor={formatarNumero(resultados.volumeA)} unidade="m³" />
        {params.blocoBAtivo ? (
          <>
            <ResultadoTexto label="Dimensões de B" valor={<DimensoesTexto geo={resultados.geometriaB} />} />
            <ResultadoItem label="Área de contato A-B" valor={formatarNumero(resultados.areaContatoAB)} unidade="m²" />
          </>
        ) : null}
      </SecaoResultado>
      <SecaoResultado titulo="Bloco A">
        <ResultadoItem label="Massa" valor={formatarNumero(params.massa, 0)} unidade="kg" />
        <ResultadoItem label="Peso" valor={formatarNumero(resultados.pesoA)} unidade="N" />
        <ResultadoItem label="Normal" valor={formatarNumero(resultados.normalA)} unidade="N" />
        <ResultadoItem label="Atrito máximo" valor={formatarNumero(resultados.atritoMaximoA)} unidade="N" />
        <ResultadoItem label="Atrito atuante" valor={formatarNumero(resultados.atritoAtuante)} unidade="N" />
      </SecaoResultado>
      <SecaoResultado titulo="Decomposição da força">
        <ResultadoTexto label="Força em A" valor={params.modoForcaA === 'semForca' ? 'sem aplicação de força' : params.modoForcaA} />
        {params.modoForcaA !== 'semForca' ? (
          <>
            <ResultadoItem label="F_A" valor={formatarNumero(resultados.moduloForcaA)} unidade="N" />
            <ResultadoItem label="Fx_A" valor={formatarNumero(resultados.forcaA_vetor)} unidade="N" />
            <ResultadoItem label="Fy_A" valor={formatarNumero(resultados.forcaA_vertical)} unidade="N" />
            <ResultadoItem label="θ_A" valor={formatarNumero(resultados.anguloForcaA, 0)} unidade="°" />
          </>
        ) : null}
        <ResultadoTexto label="Efeito na normal" valor={resultados.efeitoComponenteVertical} />
        {params.blocoBAtivo ? (
          <>
            <ResultadoTexto label="Força em B" valor={params.modoForcaB === 'semForca' ? 'sem aplicação de força' : params.modoForcaB} />
            {params.modoForcaB !== 'semForca' ? (
              <>
                <ResultadoItem label="F_B" valor={formatarNumero(resultados.moduloForcaB)} unidade="N" />
                <ResultadoItem label="Fx_B" valor={formatarNumero(resultados.forcaB_vetor)} unidade="N" />
                <ResultadoItem label="Fy_B" valor={formatarNumero(resultados.forcaB_vertical)} unidade="N" />
                <ResultadoItem label="θ_B" valor={formatarNumero(resultados.anguloForcaB, 0)} unidade="°" />
              </>
            ) : null}
          </>
        ) : null}
      </SecaoResultado>
      <SecaoResultado titulo="Movimento">
        <ResultadoItem label="Força resultante" valor={formatarNumero(resultados.forcaResultante)} unidade="N" />
        <ResultadoItem label="Aceleração" valor={formatarNumero(resultados.aceleracaoSistema, 3)} unidade="m/s²" />
        <ResultadoTexto label="Estado" valor={resultados.descricaoSistema} />
        <ResultadoTexto label="Sentido" valor={resultados.sentidoMovimento} />
      </SecaoResultado>
      <SecaoResultado titulo="Tensões e deformação">
        <ResultadoItem label="Tensão lateral" valor={formatarNumero(resultados.tensaoLateral)} unidade="Pa" extra={`${formatarNumero(resultados.tensaoLateral / 1000)} kPa`} />
        <ResultadoItem label="Tensão na base" valor={formatarNumero(resultados.tensaoBase)} unidade="Pa" extra={`${formatarNumero(resultados.tensaoBase / 1000)} kPa`} />
        <ResultadoItem label="Tensão cisalhante" valor={formatarNumero(resultados.tensaoCisalhante)} unidade="Pa" extra={`${formatarNumero(resultados.tensaoCisalhante / 1000)} kPa`} />
        <ResultadoItem label="Deformação elástica" valor={formatarNumero(resultados.deformacaoElastica, 6)} unidade="m" extra={`${formatarNumero(resultados.deformacaoElasticaMm, 4)} mm`} />
      </SecaoResultado>
      {params.blocoBAtivo ? <SecaoResultado titulo="Bloco B">
        <ResultadoItem label="Peso de B" valor={formatarNumero(resultados.pesoB)} unidade="N" />
        <ResultadoItem label="Normal de B" valor={formatarNumero(resultados.normalB || resultados.normalAB || resultados.pesoB)} unidade="N" />
        <ResultadoItem label="Atrito máximo B-solo" valor={formatarNumero(resultados.atritoMaximoB || 0)} unidade="N" />
        <ResultadoTexto label="Sentido da força em B" valor={params.sentidoForcaB} />
      </SecaoResultado> : null}
      {resultados.modo === 'ladoALado' ? <SecaoResultado titulo="Interação lateral">
        <ResultadoItem label="Atrito máximo total" valor={formatarNumero(resultados.atritoMaximoTotal)} unidade="N" />
        <ResultadoItem label="Força de contato A-B" valor={formatarNumero(resultados.forcaContatoAB)} unidade="N" />
        <ResultadoTexto label="Diagnóstico" valor={resultados.diagnosticoContato} />
      </SecaoResultado> : null}
      {resultados.modo === 'empilhado' ? <SecaoResultado titulo="Blocos empilhados">
        <ResultadoItem label="Normal entre A e B" valor={formatarNumero(resultados.normalAB)} unidade="N" />
        <ResultadoItem label="Atrito máximo A-B" valor={formatarNumero(resultados.atritoMaximoAB)} unidade="N" />
        <ResultadoTexto label="Estado relativo" valor={resultados.estadoRelativoAB} />
      </SecaoResultado> : null}
    </>
  );
}

function PainelResultados({ resultados, params }) {
  return (
    <aside className="painel resultados">
      <p className="rotulo">Resultados</p>
      <h2>Grandezas calculadas</h2>
      <div className="lista-resultados">
        {resultados.modo === 'planoInclinado' ? <ResultadosPlano resultados={resultados} /> : <ResultadosHorizontal resultados={resultados} params={params} />}
      </div>
    </aside>
  );
}

export default function App() {
  const [params, setParams] = useState(valoresIniciais);
  const [simulando, setSimulando] = useState(false);
  const [tempoAtual, setTempoAtual] = useState(0);
  const animacaoRef = useRef(null);
  const ultimoFrameRef = useRef(null);
  const pistaSegmentadaAtiva = params.cenario === 'pistaSegmentada';
  const resultados = useMemo(
    () => calcularMecanica(pistaSegmentadaAtiva ? { ...params, cenario: 'planoInclinado' } : params),
    [params, pistaSegmentadaAtiva],
  );
  const planoAtivo = params.cenario === 'planoInclinado';
  const movimentoAtivo = params.modoSimulacao === 'movimento';
  const movimentoPista = useMemo(
    () => simularMovimentoNaPista(params, tempoAtual),
    [params, tempoAtual],
  );
  const movimento = useMemo(
    () => (
      planoAtivo
        ? simularMovimentoPlanoInclinado({ params, resultados, tempoAtual })
        : simularMovimentoHorizontal({ params, resultados, tempoAtual })
    ),
    [params, resultados, tempoAtual, planoAtivo],
  );
  const avisoBlocoBMovimento = movimentoAtivo && params.blocoBAtivo && !pistaSegmentadaAtiva
    ? 'Nesta V5 inicial, a simulação no tempo considera apenas o Corpo A. O Bloco B continua disponível na análise de forças.'
    : '';

  useEffect(() => {
    if (!simulando) {
      ultimoFrameRef.current = null;
      return undefined;
    }

    const avancar = (agora) => {
      if (ultimoFrameRef.current === null) ultimoFrameRef.current = agora;
      const delta = (agora - ultimoFrameRef.current) / 1000;
      ultimoFrameRef.current = agora;
      setTempoAtual((atual) => {
        const proximo = Math.min(params.tempoSimulacao, atual + delta);
        if (proximo >= params.tempoSimulacao) setSimulando(false);
        return proximo;
      });
      animacaoRef.current = requestAnimationFrame(avancar);
    };

    animacaoRef.current = requestAnimationFrame(avancar);
    return () => {
      if (animacaoRef.current) cancelAnimationFrame(animacaoRef.current);
    };
  }, [simulando, params.tempoSimulacao]);

  useEffect(() => {
    if (pistaSegmentadaAtiva && movimentoAtivo && movimentoPista.contatoDetectado) {
      setSimulando(false);
    }
  }, [pistaSegmentadaAtiva, movimentoAtivo, movimentoPista.contatoDetectado]);

  const alterarParametro = (key, valor) => {
    setParams((atuais) => ({ ...atuais, [key]: valor }));
    if (
      controlesCinematica.some((controle) => controle.key === key) ||
      controlesPistaSegmentada.some((controle) => controle.key === key) ||
      ['cenario', 'modoSimulacao', 'posicaoInicialTipoA', 'posicaoInicialTipoB', 'sentidoInicialA', 'sentidoInicialB', 'sentidoForcaPista'].includes(key)
    ) {
      setTempoAtual(0);
      setSimulando(false);
    }
  };
  const reiniciarMovimento = () => {
    setTempoAtual(0);
    setSimulando(false);
  };
  const iniciarMovimento = () => {
    setTempoAtual((atual) => (atual >= params.tempoSimulacao ? 0 : atual));
    setSimulando(true);
  };
  const salvarPdf = () => window.print();

  return (
    <main className={`app tema-${params.temaVisual}`}>
      <header className="topo">
        <div>
          <p className="rotulo">Simulador de Mecânica V5</p>
          <h1>Blocos, Forças, Atrito e Movimento no Tempo</h1>
        </div>
        <div className="acoes-topo">
          <button className="botao-imprimir" type="button" onClick={salvarPdf}>
            Salvar em PDF
          </button>
          <div className="resumo-estado">
            <span>Estado atual</span>
            <strong>{movimentoAtivo ? (pistaSegmentadaAtiva ? movimentoPista.estadoMovimento : movimento.estadoMovimento) : resultados.descricaoSistema}</strong>
          </div>
        </div>
      </header>

      <div className="layout">
        <aside className="painel controles">
          <p className="rotulo">Entradas</p>
          <h2>Cenário físico</h2>
          <div className="controles-lista">
            <GrupoRadio
              titulo="Modo"
              name="modoSimulacao"
              valor={params.modoSimulacao}
              onChange={alterarParametro}
              opcoes={[
                { value: 'forcas', label: 'Análise de forças' },
                { value: 'movimento', label: 'Movimento no tempo' },
              ]}
            />
            <GrupoRadio
              titulo="Tema visual"
              name="temaVisual"
              valor={params.temaVisual}
              onChange={alterarParametro}
              opcoes={[
                { value: 'moderno', label: 'Claro moderno' },
                { value: 'retro', label: 'Laboratório retrô' },
              ]}
            />
            <GrupoRadio
              titulo="Cenário"
              name="cenario"
              valor={params.cenario}
              onChange={alterarParametro}
              opcoes={[
                { value: 'horizontal', label: 'Superfície horizontal' },
                { value: 'planoInclinado', label: 'Plano inclinado' },
                { value: 'pistaSegmentada', label: 'Pista segmentada' },
              ]}
            />
          </div>

          {movimentoAtivo ? (
            <>
              <div className="divisor" />
              <h2>Movimento no tempo</h2>
              <div className="controles-lista">
                {controlesCinematica
                  .filter((controle) => {
                    if (pistaSegmentadaAtiva) return controle.key === 'tempoSimulacao';
                    return planoAtivo ? controle.key !== 'comprimentoSuperficie' : !controle.somentePlano;
                  })
                  .map((controle) => (
                    <ControleParametro key={controle.key} controle={controle} valor={params[controle.key]} onChange={alterarParametro} />
                  ))}
              </div>
              {avisoBlocoBMovimento ? <p className="nota-controle">{avisoBlocoBMovimento}</p> : null}
            </>
          ) : null}

          {pistaSegmentadaAtiva ? (
            <>
              <div className="divisor" />
              <h2>Pista segmentada</h2>
              <div className="controles-lista">
                {controlesPistaSegmentada
                  .filter((controle) => {
                    if (controle.key === 'sInicialA') return params.posicaoInicialTipoA === 'personalizada';
                    if (controle.key === 'sInicialB') return params.blocoBAtivo && params.posicaoInicialTipoB === 'personalizada';
                    if (controle.key === 'velocidadeInicialB') return params.blocoBAtivo;
                    return !['sInicialB'].includes(controle.key);
                  })
                  .map((controle) => <ControleParametro key={controle.key} controle={controle} valor={params[controle.key]} onChange={alterarParametro} />)}
                <ControleParametro controle={controlePlano} valor={params.anguloPlano} onChange={alterarParametro} />
                <GrupoRadio
                  titulo="Sentido da força na pista"
                  name="sentidoForcaPista"
                  valor={params.sentidoForcaPista}
                  onChange={alterarParametro}
                  opcoes={[
                    { value: 'paraFrente', label: 'Para frente' },
                    { value: 'paraTras', label: 'Para trás' },
                  ]}
                />
              </div>
            </>
          ) : null}

          {planoAtivo ? (
            <>
              <div className="divisor" />
              <h2>Plano inclinado</h2>
              <div className="controles-lista">
                <ControleParametro controle={controlePlano} valor={params.anguloPlano} onChange={alterarParametro} />
                <GrupoRadio
                  titulo="Força em A no plano"
                  name="modoForcaA"
                  valor={params.modoForcaA}
                  onChange={alterarParametro}
                  opcoes={[
                    { value: 'semForca', label: 'Sem aplicação de força' },
                    { value: 'horizontal', label: 'Paralela ao plano' },
                    { value: 'perpendicular', label: 'Perpendicular por cima' },
                  ]}
                />
                {params.modoForcaA !== 'semForca' && params.modoForcaA !== 'perpendicular' ? (
                  <GrupoRadio
                    titulo="Sentido da força aplicada"
                    name="sentidoForcaPlano"
                    valor={params.sentidoForcaPlano}
                    onChange={alterarParametro}
                    opcoes={[
                      { value: 'subindo', label: 'Subindo o plano' },
                      { value: 'descendo', label: 'Descendo o plano' },
                    ]}
                  />
                ) : null}
                <Toggle checked={params.mostrarComponentesPesoPlano} label="Mostrar componentes do peso no desenho" onChange={(valor) => alterarParametro('mostrarComponentesPesoPlano', valor)} />
              </div>
            </>
          ) : null}

          <div className="divisor" />
          <h2>Bloco A</h2>
          <div className="controles-lista">
            {pistaSegmentadaAtiva ? (
              <>
                <GrupoRadio
                  titulo="Posição inicial de A"
                  name="posicaoInicialTipoA"
                  valor={params.posicaoInicialTipoA}
                  onChange={alterarParametro}
                  opcoes={[
                    { value: 'ponto1', label: 'Ponto 1 - reta inferior' },
                    { value: 'ponto2', label: 'Ponto 2 - rampa' },
                    { value: 'ponto3', label: 'Ponto 3 - reta superior' },
                    { value: 'personalizada', label: 's personalizado' },
                  ]}
                />
                <GrupoRadio
                  titulo="Sentido inicial de A"
                  name="sentidoInicialA"
                  valor={params.sentidoInicialA}
                  onChange={alterarParametro}
                  opcoes={[
                    { value: 'paraFrente', label: 'Para frente' },
                    { value: 'paraTras', label: 'Para trás' },
                  ]}
                />
              </>
            ) : null}
            {!planoAtivo && !pistaSegmentadaAtiva ? (
              <>
                <GrupoRadio
                  titulo="Força em A"
                  name="modoForcaA"
                  valor={params.modoForcaA}
                  onChange={(key, valor) => {
                    alterarParametro(key, valor);
                    alterarParametro('tipoForcaA', valor === 'semForca' ? 'horizontal' : valor);
                  }}
                  opcoes={[
                    { value: 'semForca', label: 'Sem aplicação de força' },
                    { value: 'horizontal', label: 'Horizontal' },
                    { value: 'inclinada', label: 'Inclinada' },
                    { value: 'perpendicular', label: 'Perpendicular por cima' },
                  ]}
                />
                {params.modoForcaA !== 'semForca' ? (
                  <>
                    <GrupoRadio
                      titulo="Sentido horizontal da força em A"
                      name="sentidoForcaA"
                      valor={params.sentidoForcaA}
                      onChange={alterarParametro}
                      opcoes={[
                        { value: 'direita', label: 'Direita' },
                        { value: 'esquerda', label: 'Esquerda' },
                      ]}
                    />
                    {params.modoForcaA === 'inclinada' ? (
                      <>
                        <GrupoRadio
                          titulo="Sentido vertical da força em A"
                          name="sentidoVerticalForcaA"
                          valor={params.sentidoVerticalForcaA}
                          onChange={alterarParametro}
                          opcoes={[
                            { value: 'cima', label: 'Para cima' },
                            { value: 'baixo', label: 'Para baixo' },
                          ]}
                        />
                        <Toggle checked={params.mostrarComponentesNoDesenho} label="Mostrar componentes no desenho" onChange={(valor) => alterarParametro('mostrarComponentesNoDesenho', valor)} />
                      </>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
            {controlesA
              .filter((controle) => {
                if (pistaSegmentadaAtiva && !['massa', 'comprimentoA', 'larguraA', 'alturaA', 'coeficienteAtrito', 'moduloElasticidade', 'gravidade'].includes(controle.key)) return false;
                if (controle.key === 'forcaAplicada' && !planoAtivo && params.modoForcaA === 'semForca') return false;
                if (controle.key === 'forcaAplicada' && planoAtivo && params.modoForcaA === 'semForca') return false;
                return !controle.somenteInclinada || (!planoAtivo && params.modoForcaA === 'inclinada');
              })
              .map((controle) => (
                <ControleParametro
                  key={controle.key}
                  controle={controle}
                  valor={params[controle.key]}
                  onChange={alterarParametro}
                  labelOverride={planoAtivo && controle.labelPlano ? controle.labelPlano : undefined}
                />
              ))}
          </div>

          <div className="divisor" />
          <h2>Bloco B</h2>
          <Toggle checked={params.blocoBAtivo} label="Ativar Bloco B" onChange={(valor) => alterarParametro('blocoBAtivo', valor)} />
          {params.blocoBAtivo ? (
            <div className="controles-lista">
              {pistaSegmentadaAtiva ? (
                <>
                  <GrupoRadio
                    titulo="Posição inicial de B"
                    name="posicaoInicialTipoB"
                    valor={params.posicaoInicialTipoB}
                    onChange={alterarParametro}
                    opcoes={[
                      { value: 'ponto1', label: 'Ponto 1 - reta inferior' },
                      { value: 'ponto2', label: 'Ponto 2 - rampa' },
                      { value: 'ponto3', label: 'Ponto 3 - reta superior' },
                      { value: 'personalizada', label: 's personalizado' },
                    ]}
                  />
                  <GrupoRadio
                    titulo="Sentido inicial de B"
                    name="sentidoInicialB"
                    valor={params.sentidoInicialB}
                    onChange={alterarParametro}
                    opcoes={[
                      { value: 'paraFrente', label: 'Para frente' },
                      { value: 'paraTras', label: 'Para trás' },
                    ]}
                  />
                </>
              ) : !planoAtivo ? (
                <>
                  <GrupoRadio
                    titulo="Força em B"
                    name="modoForcaB"
                    valor={params.modoForcaB}
                    onChange={alterarParametro}
                    opcoes={[
                      { value: 'semForca', label: 'Sem aplicação de força' },
                      { value: 'horizontal', label: 'Horizontal' },
                      { value: 'inclinada', label: 'Inclinada' },
                      { value: 'perpendicular', label: 'Perpendicular por cima' },
                    ]}
                  />
                  <GrupoRadio
                    titulo="Posição do Bloco B"
                    name="posicaoB"
                    valor={params.posicaoB}
                    onChange={alterarParametro}
                    opcoes={[
                      { value: 'direita', label: 'À direita de A' },
                      { value: 'esquerda', label: 'À esquerda de A' },
                      { value: 'emCima', label: 'Em cima de A' },
                    ]}
                  />
                  {params.modoForcaB !== 'semForca' ? (
                    <>
                      <GrupoRadio
                        titulo="Sentido horizontal da força em B"
                        name="sentidoHorizontalForcaB"
                        valor={params.sentidoHorizontalForcaB}
                        onChange={(key, valor) => {
                          alterarParametro(key, valor);
                          alterarParametro('sentidoForcaB', valor);
                        }}
                        opcoes={[
                          { value: 'direita', label: 'Direita' },
                          { value: 'esquerda', label: 'Esquerda' },
                        ]}
                      />
                      {params.modoForcaB === 'inclinada' ? (
                        <>
                          <GrupoRadio
                            titulo="Sentido vertical da força em B"
                            name="sentidoVerticalForcaB"
                            valor={params.sentidoVerticalForcaB}
                            onChange={alterarParametro}
                            opcoes={[
                              { value: 'cima', label: 'Para cima' },
                              { value: 'baixo', label: 'Para baixo' },
                            ]}
                          />
                          <ControleParametro
                            controle={{ key: 'anguloForcaB', label: 'Ângulo da força em B', unidade: '°', min: 0, max: 90, step: 1 }}
                            valor={params.anguloForcaB}
                            onChange={alterarParametro}
                          />
                        </>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <GrupoRadio
                    titulo="Força em B no plano"
                    name="modoForcaB"
                    valor={params.modoForcaB}
                    onChange={alterarParametro}
                  opcoes={[
                    { value: 'semForca', label: 'Sem aplicação de força' },
                    { value: 'horizontal', label: 'Aplicar paralela ao plano' },
                    { value: 'perpendicular', label: 'Perpendicular por cima' },
                  ]}
                />
                  <GrupoRadio
                    titulo="Posição do Bloco B no plano"
                    name="posicaoBPlano"
                    valor={params.posicaoBPlano}
                    onChange={alterarParametro}
                    opcoes={[
                      { value: 'acimaDeA', label: 'Acima de A na rampa' },
                      { value: 'abaixoDeA', label: 'Abaixo de A na rampa' },
                      { value: 'emCimaDeA', label: 'Em cima de A' },
                    ]}
                  />
                  {params.modoForcaB !== 'semForca' && params.modoForcaB !== 'perpendicular' ? (
                    <GrupoRadio
                      titulo="Sentido da força em B na rampa"
                      name="sentidoForcaBPlano"
                      valor={params.sentidoForcaBPlano}
                      onChange={alterarParametro}
                      opcoes={[
                        { value: 'subindo', label: 'Subindo o plano' },
                        { value: 'descendo', label: 'Descendo o plano' },
                      ]}
                    />
                  ) : null}
                </>
              )}
              {controlesB
                .filter((controle) => {
                  if (pistaSegmentadaAtiva && !['massaB', 'comprimentoB', 'larguraB', 'alturaB', 'coeficienteAtritoBsolo', 'coeficienteAtritoAB'].includes(controle.key)) return false;
                  return !(controle.key === 'forcaAplicadaB' && params.modoForcaB === 'semForca');
                })
                .map((controle) => <ControleParametro key={controle.key} controle={controle} valor={params[controle.key]} onChange={alterarParametro} />)}
            </div>
          ) : null}
          {planoAtivo ? (
            <p className="nota-controle">Nesta V4, o plano inclinado é uma análise de forças e tendência de movimento. Percurso, tempo e distância ficam para a V5.</p>
          ) : null}
        </aside>

        {movimentoAtivo && pistaSegmentadaAtiva ? (
          <CenaPistaSegmentada
            simulacao={movimentoPista}
            params={params}
            simulando={simulando}
            onPlay={iniciarMovimento}
            onPause={() => setSimulando(false)}
            onReset={reiniciarMovimento}
          />
        ) : movimentoAtivo ? (
          <CenaMovimento
            movimento={movimento}
            params={params}
            avisoBlocoB={avisoBlocoBMovimento}
            simulando={simulando}
            onPlay={iniciarMovimento}
            onPause={() => setSimulando(false)}
            onReset={reiniciarMovimento}
          />
        ) : (
          <CenaBloco resultados={resultados} params={params} />
        )}
        {movimentoAtivo && pistaSegmentadaAtiva ? (
          <PainelPistaSegmentada simulacao={movimentoPista} params={params} resultadosPlano={resultados} />
        ) : movimentoAtivo ? (
          <PainelResultadosMovimento movimento={movimento} params={params} />
        ) : (
          <PainelResultados resultados={resultados} params={params} />
        )}
      </div>
    </main>
  );
}
