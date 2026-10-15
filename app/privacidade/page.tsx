import Link from "next/link";
export const metadata = { title: "Privacidade" };
export default function Privacy() {
  return (
    <main className="section prose">
      <Link className="text-link" href="/">
        ← Bolos da Mi
      </Link>
      <h1>Seu pedido, seus dados.</h1>
      <p>
        No Monte Seu Bolo, não pedimos nome, telefone, CPF, endereço, e-mail
        ou dados bancários. Não criamos contas nem salvamos as escolhas ou
        pedidos em banco de dados. As escolhas ficam apenas na memória desta
        página durante a montagem; sair da página ou recarregá-la apaga a montagem.
      </p>
      <p>
        Nenhuma escolha da montagem é enviada a serviços externos antes de você
        clicar em “Pedir pelo WhatsApp”. Você revisa o resumo antes de abrir a
        conversa e decide quando enviar a mensagem.
      </p>
      <p>
        Nas outras áreas do site, o carrinho e os códigos privados de pedidos
        anteriormente registrados podem ser salvos neste navegador. Os recursos
        de encomendas dessas áreas, quando configurados, utilizam o Supabase
        para guardar solicitações e consultar seu andamento. Esses recursos não
        são utilizados pelo Monte Seu Bolo.
      </p>
      <p>
        Ao abrir o WhatsApp, você escolhe enviar as informações de orçamento.
        Essa conversa também é tratada conforme a política de privacidade do
        WhatsApp. O envio da mensagem não confirma encomenda ou pagamento.
      </p>
      <p>
        Para solicitar esclarecimentos ou exclusão de uma solicitação, converse
        com a Mi pelo WhatsApp +55 14 99148-1627 e informe o identificador do
        pedido. Registros financeiros podem precisar ser conservados para
        atender obrigações legais.
      </p>
      <p>
        Você pode remover os itens do carrinho e limpar os dados locais pelo
        navegador. Limpar esses dados não exclui um pedido já registrado no
        banco; guarde o código privado antes de limpar os dados se quiser
        continuar acompanhando o pedido.
      </p>
    </main>
  );
}
