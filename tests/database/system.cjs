const { execFile, execFileSync } = require("node:child_process");
const { promisify } = require("node:util");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const run = promisify(execFile);
const container = process.env.SQL_TEST_CONTAINER || "mi-db-validation";
const args = [
  "exec",
  "-i",
  container,
  "psql",
  "-U",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
  "-At",
  "-c",
];
function sql(query) {
  return execFileSync("docker", [...args, query], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}
function authQuery(uid, query) {
  return `begin;set local role authenticated;select set_config('request.jwt.claim.sub','${uid}',true);${query};commit;`;
}
function lastJson(output) {
  return JSON.parse(
    output
      .trim()
      .split("\n")
      .findLast((line) => line.startsWith("{")),
  );
}
const date = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
const owner1 = randomUUID(),
  owner2 = randomUUID(),
  admin = randomUUID(),
  product = randomUUID();
const token1 = "a".repeat(64),
  token2 = "b".repeat(64);
const req1 = randomUUID(),
  req2 = randomUUID();
const input = {
  kind: "cart",
  method: "Retirada",
  date,
  time: "09:00",
  items: [{ id: product, quantity: 1 }],
  details: { notes: "Fixture exclusiva do banco temporário" },
};
const encoded = `'${JSON.stringify(input)}'::jsonb`;
const submit = (uid, req, token) =>
  authQuery(uid, `select public.submit_order(${encoded},'${req}','${token}')`);
(async () => {
  sql(
    `insert into auth.users(id) values('${owner1}'),('${owner2}'),('${admin}');insert into public.admins values('${admin}');insert into public.settings(id,max_fillings) values('main',2);insert into public.products(id,name,category,price) values('${product}','Fixture de teste','Categoria de teste',100);update public.commerce_settings set schedule='{"enabled":true,"daily_capacity":1,"notice_hours":0,"weekdays":[0,1,2,3,4,5,6],"slots":[{"time":"09:00","method":"Retirada","capacity":1},{"time":"10:00","method":"Retirada","capacity":1}],"category_limits":{},"complexity_capacity":null}';`,
  );
  const q = lastJson(
    sql(`set role anon;select public.quote_order(${encoded})`),
  );
  assert.equal(q.total, 100);
  const tampered = lastJson(
    sql(
      `set role anon;select public.quote_order('${JSON.stringify({ ...input, items: [{ id: product, quantity: 2, price: 0.01 }], total: 0.01 })}'::jsonb)`,
    ),
  );
  assert.equal(tampered.total, 200);
  console.log(
    "PASS orçamento calculado com preços do banco; valores enviados pelo cliente ignorados",
  );
  const attempts = await Promise.allSettled([
    run("docker", [...args, submit(owner1, req1, token1)]),
    run("docker", [...args, submit(owner2, req2, token2)]),
  ]);
  assert.equal(attempts.filter((a) => a.status === "fulfilled").length, 1);
  const failure = attempts.find((a) => a.status === "rejected");
  assert.match(failure.reason.stderr, /DATE_FULL|SLOT_FULL/);
  const winnerIndex = attempts[0].status === "fulfilled" ? 0 : 1;
  const winner = winnerIndex === 0 ? owner1 : owner2;
  const loser = winnerIndex === 0 ? owner2 : owner1;
  const winningToken = winnerIndex === 0 ? token1 : token2;
  const winningRequest = winnerIndex === 0 ? req1 : req2;
  const record = lastJson(attempts[winnerIndex].value.stdout);
  console.log(
    "PASS concorrência real: somente uma solicitação ocupa a última vaga",
  );
  const repeat = lastJson(sql(submit(winner, winningRequest, winningToken)));
  assert.equal(repeat.id, record.id);
  assert.equal(repeat.reused, true);
  console.log("PASS reenvio idempotente não duplica pedido");
  const mine = sql(authQuery(winner, "select count(*) from public.orders"))
    .split("\n")
    .filter((l) => /^\d+$/.test(l))
    .pop();
  const other = sql(authQuery(loser, "select count(*) from public.orders"))
    .split("\n")
    .filter((l) => /^\d+$/.test(l))
    .pop();
  assert.equal(mine, "1");
  assert.equal(other, "0");
  assert.throws(
    () => sql(`set role anon;select * from public.orders`),
    /permission denied/,
  );
  const settings = sql(
    authQuery(loser, "select count(*) from public.commerce_settings"),
  )
    .split("\n")
    .filter((l) => /^\d+$/.test(l))
    .pop();
  assert.equal(settings, "0");
  sql(
    authQuery(
      loser,
      `update public.orders set status='confirmado' where id='${record.id}'`,
    ),
  );
  assert.equal(
    sql(`select status from public.orders where id='${record.id}'`),
    "recebido",
  );
  assert.equal(
    lastJson(sql(`set role anon;select public.lookup_order('${winningToken}')`))
      .status,
    "recebido",
  );
  assert.throws(
    () => sql(`set role anon;select public.lookup_order('${"c".repeat(64)}')`),
    /ORDER_NOT_FOUND/,
  );
  console.log(
    "PASS RLS: cliente vê apenas o próprio pedido, público não lista pedidos; token privado exige correspondência",
  );
  assert.throws(
    () => sql(submit(winner, randomUUID(), "d".repeat(64))),
    /RATE_LIMIT/,
  );
  console.log("PASS limite de envio por sessão é aplicado no banco");
  assert.throws(
    () =>
      sql(
        authQuery(
          admin,
          `update public.orders set payment_status='pago',paid_amount=1,final_total=100 where id='${record.id}'`,
        ),
      ),
    /INVALID_PAYMENT/,
  );
  console.log("PASS pagamento incompatível é recusado");
  sql(
    authQuery(
      admin,
      `update public.orders set final_total=100,deposit_due=30,status='aguardando_pagamento' where id='${record.id}';update public.commerce_settings set pix_key='CHAVE_FIXTURE' where id='main'`,
    ),
  );
  assert.equal(
    lastJson(sql(`set role anon;select public.lookup_order('${winningToken}')`))
      .pix_key,
    "CHAVE_FIXTURE",
  );
  console.log(
    "PASS chave Pix somente em pedido privado com valor aprovado e aguardando pagamento",
  );
  sql(
    authQuery(
      admin,
      `update public.orders set status='cancelado' where id='${record.id}'`,
    ),
  );
  const next = lastJson(sql(submit(loser, randomUUID(), "e".repeat(64))));
  assert.ok(next.id);
  console.log("PASS cancelamento libera capacidade");
  sql(
    `insert into public.schedule_dates(date,blocked,internal_notes) values('${date}',true,'NOTA INTERNA PRIVADA');`,
  );
  const unavailable = lastJson(
    sql(`set role anon;select public.availability_window('${date}',1)`),
  );
  assert.equal(unavailable.days[0].available, false);
  assert.equal(JSON.stringify(unavailable).includes("NOTA INTERNA"), false);
  console.log(
    "PASS bloqueios e observações internas não aparecem na API pública",
  );
  assert.equal(sql("select count(*) from public.order_events"), "2");
  console.log("PASS alterações de status e valores geram trilha de auditoria");
  sql("truncate public.orders cascade;delete from public.schedule_dates;");
  const privateInput = { ...input, details: { name: "Não permitido" } };
  assert.throws(
    () =>
      sql(
        authQuery(
          loser,
          `select public.submit_order('${JSON.stringify(privateInput)}'::jsonb,'${randomUUID()}','${"f".repeat(64)}')`,
        ),
      ),
    /PERSONAL_DATA_NOT_ALLOWED/,
  );
  console.log("PASS solicitação recusa campos de dados pessoais");
  const fresh = randomUUID();
  sql(
    `insert into auth.users(id) values('${fresh}');update public.commerce_settings set schedule=jsonb_set(schedule,'{notice_hours}','1000');`,
  );
  assert.throws(
    () => sql(submit(fresh, randomUUID(), "1".repeat(64))),
    /NOTICE_REQUIRED/,
  );
  console.log("PASS antecedência mínima validada no servidor");
  sql(
    `update public.commerce_settings set schedule=jsonb_set(jsonb_set(schedule,'{notice_hours}','0'),'{category_limits}','{"Categoria de teste":0}');`,
  );
  assert.throws(
    () => sql(submit(fresh, randomUUID(), "2".repeat(64))),
    /CATEGORY_FULL/,
  );
  console.log("PASS limite por categoria");
  sql(
    `update public.commerce_settings set schedule=jsonb_set(jsonb_set(schedule,'{category_limits}','{}'),'{complexity_capacity}','1');update public.products set complexity_units=2 where id='${product}';`,
  );
  assert.throws(
    () => sql(submit(fresh, randomUUID(), "3".repeat(64))),
    /COMPLEXITY_FULL/,
  );
  console.log("PASS limite por complexidade");
  console.log("Todos os testes de banco passaram em PostgreSQL real.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
