import { cakeCategories } from './cake-menu';
import { money } from './order';
import { dateNotice, validCakeDate } from './simple-cake';
export const cakeFruits = ['Morango', 'Abacaxi', 'Pêssego', 'Figo'];
export const extras = [
 {name:'Flores',price:'A partir de R$ 20,00', amount:20, basis:'fixed', minimum:true},
 {name:'Glitter ou pó comestível',price:'A partir de R$ 15,00/kg', amount:15, basis:'kg', minimum:true},
 {name:'Frutas da época',price:'A partir de R$ 18,00', amount:18, basis:'fixed', minimum:true},
 {name:'Brigadeiros ou beijinhos decorativos',price:'R$ 3,50 por unidade', amount:3.5, basis:'unit', minimum:false},
 {name:'Nutella',price:'R$ 20,00/kg', amount:20, basis:'kg', minimum:false}, {name:'KitKat',price:'R$ 15,00/kg', amount:15, basis:'kg', minimum:false},
 {name:'Topo personalizado',price:'A partir de R$ 25,00', amount:25, basis:'fixed', minimum:true},
];
export type GuidedCake = {category:string;batter:string;fillings:string[];nataFruit:string;ninhoOption:string;weight:string;extras:string[];quantity:string;notes:string;method:string;date:string;period:string;district:string;address:string;complement:string};
export const emptyGuidedCake:GuidedCake={category:'',batter:'',fillings:[],nataFruit:'',ninhoOption:'',weight:'',extras:[],quantity:'',notes:'',method:'',date:'',period:'',district:'',address:'',complement:''};
export function validateGuidedCakeStep(step:number,c:GuidedCake){
 if(step===0&&!cakeCategories.some(x=>x.name===c.category))return 'Escolha uma categoria de bolo.';
 if(step===1){
  if(!c.fillings.length||c.fillings.some(x=>!x.trim()))return 'Escolha pelo menos um recheio.';
  if(c.fillings.length>2)return 'Escolha no máximo dois recheios.';
  if(c.fillings.includes('Mousse de nata com frutas')&&!cakeFruits.includes(c.nataFruit))return 'Escolha a fruta para o mousse de nata.';
  if(c.fillings.includes('Mousse de leite Ninho')&&!['Com frutas','Sem frutas'].includes(c.ninhoOption))return 'Escolha o mousse de leite Ninho com ou sem frutas.';
 }
 if(step===2){
  if(!c.weight.trim()||!Number.isFinite(Number(c.weight.replace(',','.')))||Number(c.weight.replace(',','.'))<=0)return 'Informe um peso desejado válido em kg.';
  if(c.extras.includes('Brigadeiros ou beijinhos decorativos')&&(!/^\d+$/.test(c.quantity)||Number(c.quantity)<1))return 'Informe a quantidade de doces decorativos.';
 }
 if(step===3){
  if(!['Entrega','Retirada'].includes(c.method))return 'Escolha entrega ou retirada.';
  if(!validCakeDate(c.date))return 'Escolha uma data desejada válida.';
  if(!c.period)return 'Escolha o período preferido.';
  if(c.method==='Entrega'&&!c.district.trim())return 'Informe o bairro para consultar a entrega.';
 }
 return '';
}
export function guidedFillings(c:GuidedCake){return c.fillings.map(x=>x==='Mousse de nata com frutas'?`${x} (${c.nataFruit})`:x==='Mousse de leite Ninho'?`${x} (${c.ninhoOption.toLowerCase()})`:x);}
export function selectedExtras(c:GuidedCake){return c.extras.map(x=>x==='Brigadeiros ou beijinhos decorativos'?`${x} (${c.quantity} unidades)`:x).join(', ')||'Nenhum adicional';}
export function cakeEstimate(c:GuidedCake){
 const category=cakeCategories.find(x=>x.name===c.category);
 const weight=Number(c.weight.replace(',','.'));
 if(!category||!Number.isFinite(weight)||weight<=0)return null;
 const base=Math.round(category.price*weight*100)/100;
 const items=extras.filter(x=>c.extras.includes(x.name)).map(x=>({...x,cost:Math.round(x.amount*(x.basis==='kg'?weight:x.basis==='unit'?Number(c.quantity):1)*100)/100}));
 if(items.some(x=>!Number.isFinite(x.cost)||(x.basis==='unit'&&(!/^\d+$/.test(c.quantity)||Number(c.quantity)<1))))return null;
 const additional=Math.round(items.reduce((sum,x)=>sum+x.cost,0)*100)/100;
 const total=Math.round((base+additional)*100)/100;
 if(!Number.isFinite(total))return null;
 return {base,items,additional,total,minimum:items.some(x=>x.minimum)};
}
export function guidedCakeMessage(c:GuidedCake){
 const price=cakeCategories.find(x=>x.name===c.category)?.price;
 const estimate=cakeEstimate(c);
 return ['Olá, Mi! Gostaria de consultar um bolo personalizado.','',`Categoria: ${c.category}`,`Massa: ${c.batter || "A combinar com a Mi"}`,`Valor de referência: R$ ${price?.toFixed(2).replace('.',',')}/kg (valor final a confirmar)`,`Recheios: ${guidedFillings(c).join(' e ')}`,`Peso desejado: ${c.weight} kg`,`Adicionais: ${selectedExtras(c)}`,...(estimate?[`Bolo pelo peso: ${money(estimate.base)}`,`Adicionais estimados: ${money(estimate.additional)}`,`Total estimado: ${estimate.minimum?'a partir de ':''}${money(estimate.total)} (preço final a confirmar${c.method==='Entrega'?'; taxa de entrega não incluída':''})`]:[]),`Observações: ${c.notes||'Sem detalhes adicionais.'}`,`Modalidade: ${c.method}`,`Data desejada: ${c.date.split('-').reverse().join('/')}`,`Período preferido: ${c.period}`,...(c.method==='Entrega'?[`Bairro: ${c.district}`,...(c.address?[`Rua e número: ${c.address}`]:[]),...(c.complement?[`Complemento: ${c.complement}`]:[])]:['Endereço e horário da retirada a combinar pelo WhatsApp.']),'',`Gostaria de confirmar a disponibilidade, o valor final${c.method==='Entrega'?' e a taxa de entrega':''}.`,dateNotice,'Sabores sujeitos à confirmação da confeiteira. Bolo com duas camadas de recheio e três camadas de bolo.',...(c.method==='Entrega'?['Entrega sujeita à disponibilidade e confirmação da taxa pelo WhatsApp. O cardápio original informa apenas retirada.']:[])].join('\n');
}
