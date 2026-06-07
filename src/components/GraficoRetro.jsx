function escala(valor, min, max) {
  if (!Number.isFinite(valor) || max <= min) return 0;
  return Math.min(Math.max((valor - min) / (max - min), 0), 1);
}

export default function GraficoRetro({ pontos, titulo = 'posicao x tempo', eixoY = 's', unidade = 'm' }) {
  const dados = pontos?.length ? pontos : [{ t: 0, [eixoY]: 0 }];
  const maxT = Math.max(...dados.map((ponto) => ponto.t), 1);
  const valoresY = dados.map((ponto) => (Number.isFinite(ponto[eixoY]) ? ponto[eixoY] : 0));
  const minY = Math.min(...valoresY, 0);
  const maxY = Math.max(...valoresY, 1);
  const amplitudeY = maxY - minY || 1;
  const polyline = dados
    .map((ponto) => {
      const x = 8 + escala(ponto.t, 0, maxT) * 84;
      const y = 86 - ((Number.isFinite(ponto[eixoY]) ? ponto[eixoY] : 0) - minY) / amplitudeY * 72;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div className="grafico-retro">
      <div className="grafico-topo">
        <strong>{titulo}</strong>
        <span>{unidade}</span>
      </div>
      <svg viewBox="0 0 100 100" role="img" aria-label={titulo}>
        <path className="grafico-grade" d="M8 14H92M8 32H92M8 50H92M8 68H92M8 86H92M8 14V86M29 14V86M50 14V86M71 14V86M92 14V86" />
        <path className="grafico-eixos" d="M8 14V86H92" />
        <polyline className="grafico-linha" points={polyline} />
      </svg>
    </div>
  );
}
