function numero(valor, fallback = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
}

function positivo(valor, fallback = 0.001) {
  return Math.max(numero(valor, fallback), fallback);
}

function formatar(valor, casas = 2) {
  if (!Number.isFinite(valor)) return 'nao definido';
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor);
}

function Item({ label, valor, unidade = '' }) {
  return (
    <div className="resultado-item">
      <span>{label}</span>
      <strong>{typeof valor === 'number' ? formatar(valor) : valor} <small>{unidade}</small></strong>
    </div>
  );
}

function Secao({ titulo, children }) {
  return <div className="secao-resultado"><h3>{titulo}</h3>{children}</div>;
}

function mostrar(valor, fallback = 'nao definido') {
  return valor ?? fallback;
}

function geometria(params, sufixo) {
  const comprimento = positivo(params[`comprimento${sufixo}`], sufixo === 'A' ? 1 : 0.7);
  const largura = positivo(params[`largura${sufixo}`], sufixo === 'A' ? 0.5 : 0.4);
  const altura = positivo(params[`altura${sufixo}`], sufixo === 'A' ? 0.5 : 0.4);

  return {
    comprimento,
    largura,
    altura,
    areaBase: comprimento * largura,
    areaLateral: altura * largura,
    volume: comprimento * largura * altura,
  };
}

function sentidoPista(params) {
  return params.sentidoForcaPista === 'paraTras' ? -1 : 1;
}

function tendenciaTexto(valor) {
  if (Math.abs(valor) < 1e-9) return 'equilibrio';
  return valor > 0 ? 'subir a rampa' : 'descer a rampa';
}

function movimentoPorForcas({ massa, forcaSemAtrito, atritoMaximo }) {
  const modulo = Math.abs(forcaSemAtrito);
  const parado = modulo <= atritoMaximo;
  const atritoAtuante = parado ? modulo : atritoMaximo;
  const resultanteModulo = parado ? 0 : modulo - atritoMaximo;
  const resultante = parado ? 0 : Math.sign(forcaSemAtrito) * resultanteModulo;

  return {
    atritoAtuante,
    forcaResultante: resultante,
    aceleracao: resultante / Math.max(massa, 0.001),
    estado: parado ? 'parado na rampa' : resultante > 0 ? 'sobe a rampa' : 'desce a rampa',
  };
}

function decomposicaoRampa(params, simulacao) {
  const g = positivo(params.gravidade, 9.81);
  const theta = (numero(simulacao.pista.angulo, 0) * Math.PI) / 180;
  const forcaAplicada = numero(params.forcaExternaPista, 0) * sentidoPista(params);
  const muA = Math.max(numero(params.coeficienteAtrito, 0), 0);
  const muB = Math.max(numero(params.coeficienteAtritoBsolo, muA), 0);

  function corpo(massa, mu) {
    const peso = massa * g;
    const pesoParalelo = -peso * Math.sin(theta);
    const pesoPerpendicular = peso * Math.cos(theta);
    const normal = pesoPerpendicular;
    const atritoMaximo = mu * normal;
    const forcaSemAtrito = forcaAplicada + pesoParalelo;
    const movimento = movimentoPorForcas({ massa, forcaSemAtrito, atritoMaximo });

    return {
      peso,
      pesoParalelo,
      pesoPerpendicular,
      normal,
      atritoMaximo,
      forcaAplicada,
      forcaSemAtrito,
      tendencia: tendenciaTexto(forcaSemAtrito),
      ...movimento,
    };
  }

  return {
    A: corpo(positivo(params.massa, 1), muA),
    B: corpo(positivo(params.massaB, 1), muB),
  };
}

export default function PainelPistaSegmentada({ simulacao, params, resultadosPlano }) {
  const plano = resultadosPlano ?? {};
  const temB = params.blocoBAtivo && simulacao.corpoB;
  const geoA = geometria(params, 'A');
  const geoB = geometria(params, 'B');
  const rampa = decomposicaoRampa(params, simulacao);
  const areaContatoAB = Math.max(
    0.01,
    Math.min(geoA.altura, geoB.altura) * Math.min(geoA.largura, geoB.largura),
  );
  const tensaoBaseA = rampa.A.normal / geoA.areaBase;
  const deformacaoA =
    (Math.abs(rampa.A.forcaAplicada) * geoA.comprimento) /
    (geoA.areaLateral * positivo(params.moduloElasticidade, 2000000000));

  return (
    <aside className="painel resultados painel-pista">
      <p className="rotulo">Resultados V5.1</p>
      <h2>Pista segmentada</h2>
      <div className="lista-resultados">
        <Secao titulo="Pista">
          <Item label="Reta inferior" valor={simulacao.pista.L1} unidade="m" />
          <Item label="Rampa" valor={simulacao.pista.L2} unidade="m" />
          <Item label="Reta superior" valor={simulacao.pista.L3} unidade="m" />
          <Item label="Comprimento total" valor={simulacao.pista.sFimPista} unidade="m" />
          <Item label="Angulo" valor={simulacao.pista.angulo} unidade="graus" />
        </Secao>

        <Secao titulo="Movimento A">
          <Item label="s atual" valor={simulacao.corpoA.s} unidade="m" />
          <Item label="Trecho" valor={simulacao.corpoA.trecho} />
          <Item label="Velocidade" valor={simulacao.corpoA.v} unidade="m/s" />
          <Item label="Aceleracao" valor={simulacao.corpoA.a} unidade="m/s2" />
          <Item label="Estado" valor={simulacao.corpoA.estado} />
        </Secao>

        {temB ? (
          <Secao titulo="Movimento B">
            <Item label="s atual" valor={simulacao.corpoB.s} unidade="m" />
            <Item label="Trecho" valor={simulacao.corpoB.trecho} />
            <Item label="Velocidade" valor={simulacao.corpoB.v} unidade="m/s" />
            <Item label="Aceleracao" valor={simulacao.corpoB.a} unidade="m/s2" />
            <Item label="Estado" valor={simulacao.corpoB.estado} />
          </Secao>
        ) : null}

        <Secao titulo="Contato na pista">
          <Item label="Distancia A-B" valor={simulacao.distanciaAB} unidade="m" />
          <Item label="Distancia de contato" valor={simulacao.distanciaContato} unidade="m" />
          <Item label="Contato detectado" valor={simulacao.contatoDetectado ? 'sim' : 'nao'} />
          <Item label="Mensagem" valor={simulacao.mensagemContato} />
        </Secao>

        <Secao titulo="Dimensoes A">
          <Item label="Comprimento" valor={geoA.comprimento} unidade="m" />
          <Item label="Largura" valor={geoA.largura} unidade="m" />
          <Item label="Altura" valor={geoA.altura} unidade="m" />
          <Item label="Area da base" valor={geoA.areaBase} unidade="m2" />
          <Item label="Volume" valor={geoA.volume} unidade="m3" />
        </Secao>

        {params.blocoBAtivo ? (
          <Secao titulo="Dimensoes B">
            <Item label="Comprimento" valor={geoB.comprimento} unidade="m" />
            <Item label="Largura" valor={geoB.largura} unidade="m" />
            <Item label="Altura" valor={geoB.altura} unidade="m" />
            <Item label="Area da base" valor={geoB.areaBase} unidade="m2" />
            <Item label="Volume" valor={geoB.volume} unidade="m3" />
            <Item label="Area de contato A-B" valor={areaContatoAB} unidade="m2" />
          </Secao>
        ) : null}

        <Secao titulo="Decomposicao de A na rampa">
          <Item label="Peso A" valor={rampa.A.peso} unidade="N" />
          <Item label="P paralelo" valor={rampa.A.pesoParalelo} unidade="N" />
          <Item label="P perpendicular" valor={rampa.A.pesoPerpendicular} unidade="N" />
          <Item label="Forca aplicada na pista" valor={rampa.A.forcaAplicada} unidade="N" />
          <Item label="Forca sem atrito" valor={rampa.A.forcaSemAtrito} unidade="N" />
          <Item label="Tendencia" valor={rampa.A.tendencia} />
        </Secao>

        <Secao titulo="Atrito e normal A">
          <Item label="Coeficiente A-pista" valor={numero(params.coeficienteAtrito, 0)} />
          <Item label="Normal A na rampa" valor={rampa.A.normal} unidade="N" />
          <Item label="Atrito maximo A" valor={rampa.A.atritoMaximo} unidade="N" />
          <Item label="Atrito atuante A" valor={rampa.A.atritoAtuante} unidade="N" />
          <Item label="Forca resultante A" valor={rampa.A.forcaResultante} unidade="N" />
          <Item label="Aceleracao por forcas A" valor={rampa.A.aceleracao} unidade="m/s2" />
          <Item label="Estado por forcas A" valor={rampa.A.estado} />
        </Secao>

        {params.blocoBAtivo ? (
          <>
            <Secao titulo="Decomposicao de B na rampa">
              <Item label="Peso B" valor={rampa.B.peso} unidade="N" />
              <Item label="P paralelo" valor={rampa.B.pesoParalelo} unidade="N" />
              <Item label="P perpendicular" valor={rampa.B.pesoPerpendicular} unidade="N" />
              <Item label="Forca aplicada na pista" valor={rampa.B.forcaAplicada} unidade="N" />
              <Item label="Forca sem atrito" valor={rampa.B.forcaSemAtrito} unidade="N" />
              <Item label="Tendencia" valor={rampa.B.tendencia} />
            </Secao>
            <Secao titulo="Atrito e normal B">
              <Item label="Coeficiente B-pista" valor={numero(params.coeficienteAtritoBsolo, numero(params.coeficienteAtrito, 0))} />
              <Item label="Coeficiente A-B" valor={numero(params.coeficienteAtritoAB, 0)} />
              <Item label="Normal B na rampa" valor={rampa.B.normal} unidade="N" />
              <Item label="Atrito maximo B" valor={rampa.B.atritoMaximo} unidade="N" />
              <Item label="Atrito atuante B" valor={rampa.B.atritoAtuante} unidade="N" />
              <Item label="Forca resultante B" valor={rampa.B.forcaResultante} unidade="N" />
              <Item label="Aceleracao por forcas B" valor={rampa.B.aceleracao} unidade="m/s2" />
              <Item label="Estado por forcas B" valor={rampa.B.estado} />
            </Secao>
          </>
        ) : null}

        <Secao titulo="Tensoes e deformacao">
          <Item label="Tensao na base A" valor={tensaoBaseA} unidade="Pa" />
          <Item label="Deformacao elastica A" valor={deformacaoA} unidade="m" />
          {params.blocoBAtivo ? <Item label="Pressao contato A-B" valor={mostrar(plano.pressaoContatoAB, 0)} unidade="Pa" /> : null}
        </Secao>
      </div>
    </aside>
  );
}
