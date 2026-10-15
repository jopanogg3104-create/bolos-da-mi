"use client";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./ui/accordion";
const questions = [
  ["Como faço minha encomenda?", "Escolha uma criação como referência ou personalize seu bolo em Monte seu bolo. Revise as escolhas e abra o WhatsApp para conversar com a Mi. A encomenda é confirmada no atendimento."],
  ["Posso escolher outros sabores ou uma decoração diferente?", "Sim, você pode indicar sua preferência. Nas etapas de massa e recheio, use a opção Outro para escrever o que deseja. Sabores, tamanho e decoração são combinados com a Mi, conforme a disponibilidade."],
  ["O site mostra o valor do bolo?", "O valor do bolo personalizado é informado pela Mi no WhatsApp, depois de combinar tamanho, sabores e decoração. Não há pagamento no configurador."],
  ["A data escolhida fica reservada?", "Não. A data escolhida está sujeita à confirmação da confeiteira. Consulte com alguns dias de antecedência, especialmente para comemorações no fim de semana."],
  ["Preciso criar uma conta para montar meu bolo?", "Não. A montagem não exige cadastro, nome ou telefone. Suas escolhas ficam apenas nesta página durante a montagem. Você revisa as informações antes de abrir o WhatsApp e decide quando enviar a mensagem."],
];
export function LandingFAQ() {
  return <section className="section landing-faq" aria-labelledby="faq-heading"><div className="faq-heading"><span className="eyebrow">ANTES DE ENCOMENDAR</span><h2 id="faq-heading">Uma boa conversa<br /><em>começa sem dúvidas.</em></h2><p>O essencial para transformar sua ideia em uma encomenda.</p></div><Accordion type="single" collapsible className="faq-list">{questions.map(([question, answer], index) => <AccordionItem key={question} value={`question-${index}`}><AccordionTrigger>{question}</AccordionTrigger><AccordionContent>{answer}</AccordionContent></AccordionItem>)}</Accordion></section>;
}
