import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyGuidedCake,validateGuidedCakeStep,guidedCakeMessage} from '../lib/guided-cake';
test('guided builder validates fruit, weight and quantity without combination limits',()=>{
 const c={...emptyGuidedCake,category:'Tradicional',fillings:['Passas ao rum','Mousse de nata com frutas'],weight:'0,5',extras:['Brigadeiros ou beijinhos decorativos'],quantity:'2'};
 assert.match(validateGuidedCakeStep(1,c),/fruta/);
 assert.equal(validateGuidedCakeStep(1,{...c,nataFruit:'Figo'}),'');
 assert.equal(validateGuidedCakeStep(2,c),'');
 assert.match(validateGuidedCakeStep(2,{...c,quantity:'1.5'}),/quantidade/);
});
test('pickup message excludes stale address and delivery requires district',()=>{
 const c={...emptyGuidedCake,category:'Gourmet',fillings:['Laka'],weight:'2',method:'Retirada',district:'Centro',address:'Rua privada',date:'2026-10-18',period:'Tarde'};
 assert.equal(validateGuidedCakeStep(3,c),'');
 assert.ok(!guidedCakeMessage(c).includes('Rua privada'));
 assert.match(validateGuidedCakeStep(3,{...c,method:'Entrega',district:''}),/bairro/);
 assert.ok(guidedCakeMessage({...c,method:'Entrega'}).includes('Rua privada'));
});

test('estimate uses kg, unit quantities and minimum extras without delivery fees',async()=>{
 const {cakeEstimate}=await import('../lib/guided-cake');
 const c={...emptyGuidedCake,category:'Tradicional',weight:'2',quantity:'6',extras:['Flores','Glitter ou pó comestível','Frutas da época','Brigadeiros ou beijinhos decorativos','Nutella','KitKat','Topo personalizado']};
 const estimate=cakeEstimate(c)!;
 assert.equal(estimate.base,180);
 assert.equal(estimate.additional,184);
 assert.equal(estimate.total,364);
 assert.equal(estimate.minimum,true);
 assert.equal(cakeEstimate({...c,extras:[]})!.total,180);
 assert.equal(cakeEstimate({...c,weight:'2,5',extras:[]})!.total,225);
 assert.equal(cakeEstimate({...c,quantity:'1.5'}),null);
 assert.equal(cakeEstimate({...c,method:'Entrega'})!.total,364);
 assert.match(guidedCakeMessage({...c,method:'Entrega'}),/taxa de entrega não incluída/);
});
