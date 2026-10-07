# Bolada — plataforma de bolões esportivos

Demonstração feita para uma vaga de desenvolvimento de plataforma de bolões:
cadastro, criação de bolões, convite por link, custódia do valor das apostas até
o fim das partidas, comissão da plataforma e três painéis (apostador, dono do
bolão e administrador).

Nenhum pagamento acontece aqui. Entrada, comissão, prêmio e devolução são
lançamentos no extrato de cada bolão, e é esse extrato que fecha em zero quando
o bolão é liquidado.

## A decisão que sustenta o resto

**Todo valor é inteiro, em centavos.** Não existe um `number` representando
reais em lugar nenhum do sistema; a conversão para "R$ 29,90" acontece uma vez
só, na hora de imprimir. Num produto que segura dinheiro de terceiros, basta um
`0,1 + 0,2` para o caixa não fechar e ninguém descobrir qual aposta quebrou.

Disso saem três regras que a demonstração mostra funcionando:

**O centavo que sobra tem dono.** R$ 188,37 divididos entre dois vencedores não
dão R$ 94,18 para cada um com um centavo evaporando. Dão R$ 94,19 e R$ 94,18, e
quem fica com o centavo é quem entrou primeiro no bolão — critério que cabe no
regulamento e que qualquer um pode conferir. O bolão encerrado da demonstração
termina empatado de propósito, para que esse caso apareça na tela e não só no
código.

**A comissão arredonda para baixo.** R$ 157,50 a 11% dão R$ 17,325: a plataforma
retém R$ 17,32, não R$ 17,33. O centavo fica com os apostadores. É uma escolha, e
é a que não precisa ser explicada para ninguém depois.

**Bolão sem vencedor devolve tudo, sem comissão.** Se ninguém pontuou, não é
"todos ganharam": as cotas voltam inteiras. A plataforma só ganha quando entrega
um resultado. O mesmo vale para cancelamento.

## A trava das apostas

É o relógio, não um campo no banco. Guardar "fechado" como estado significaria
depender de alguém passar e atualizar, e apostas continuariam abertas depois do
apito enquanto ninguém passasse.

O fechamento de um bolão cola no início da **partida mais cedo**, não na primeira
da lista que o dono digitou. E cada palpite é verificado também contra o apito da
sua própria partida: num bolão com jogos em dias diferentes, a segunda ainda não
começou quando a primeira já acabou.

## Os três painéis

| Quem | Onde | O que faz |
|---|---|---|
| Apostador | `/`, `/bolao/:id` | vê seus bolões, dá e corrige palpites, acompanha a classificação e o caixa |
| Dono do bolão | aba **Gerir** em `/bolao/:id` | configura, copia o link de convite, lança placares, vê a prévia da liquidação, liquida ou cancela |
| Administrador | `/admin` | todos os usuários, todos os bolões, o consolidado financeiro e a conferência de que nada ficou fora do zero |

Acesso restrito é levado ao pé da letra: sem sessão não se vê nada, conta
desativada não entra, e quem não está num bolão não vê o conteúdo daquele bolão
mesmo com o endereço na mão.

## Contas para testar

| Papel | E-mail | Senha |
|---|---|---|
| Apostador | `thiago.camargo@exemplo.com.br` | `aposta123` |
| Dono de bolão | `rafaela.nogueira@exemplo.com.br` | `dono123` |
| Administrador | `marcelo.dantas@exemplo.com.br` | `admin123` |

Os botões na tela de entrada preenchem o formulário. Para voltar ao estado
inicial, o ícone de restaurar no topo.

## Stack

Vite, React 19, TypeScript, Tailwind v4, React Router v6, Zustand, Lucide,
Sonner. Os componentes de interface são próprios, sobre `<dialog>` nativo. O
estado vive em `localStorage` atrás de uma API assíncrona em `src/lib/api.ts`,
com atraso de 200–600 ms, e trocar isso por um backend de verdade é editar esse
arquivo.

    npm install
    npm run dev

## Verificação

8.493 asserções sobre o núcleo, rodadas no Node contra `src/lib/*`, e 82
asserções de navegador contra a build, a 1280px e a 390px. Sem erros de console.

O método: depois de a bateria passar, rodar versões deliberadamente ingênuas do
código ao lado e conferir se as asserções realmente quebram. Seis foram testadas
assim — rateio com `Math.round`, comissão para cima, "todo mundo com zero ponto
venceu", ordem das regras de pontuação invertida, trava na primeira partida da
lista, e login sem checar se o cadastro está ativo. Cinco quebraram na hora.

A sexta, a comissão arredondando para cima, **passou**, e isso valeu por toda a
bateria: a asserção estava escrita de um jeito que era verdade de qualquer
forma, e os números da semente eram todos redondos, então aquele caminho nunca
era executado. Foram as duas coisas corrigidas — a asserção e os dados — e só
então o teste passou a ter dente.

Outras quatro coisas que a verificação encontrou: o zero negativo imprimindo
"-R$ 0,00" num extrato onde os lançamentos se anulam; um campo de placar
ocupando a linha inteira no telefone porque `w-16` não vencia o `w-full` do
componente sem `tailwind-merge`; um bolão aberto com R$ 175,00 dentro anunciando
"comissão prevista R$ 0,00", porque a prévia de liquidação devolve zero enquanto
nenhuma partida terminou; e o prazo das apostas, que era lido do relógio durante
o render e por isso não vencia sozinho — com a página aberta às 15h29, o apito
das 15h30 só fechava o formulário se alguma outra coisa provocasse um render.
O relógio virou estado, e o teste que prova isso adianta o relógio do navegador
em três dias sem navegar nem recarregar.

Justin Gnoh · outubro de 2026
