// Envia os avisos pendentes da tabela notificacoes para os celulares inscritos.
// Quem chama é o agendador do banco (pg_cron), uma vez por minuto, com o
// segredo combinado no cabeçalho. Não é uma função aberta: sem o segredo, nada.
//
// Publicar:  supabase functions deploy enviar-push --no-verify-jwt --project-ref <ref>
// As chaves ficam no Vault do banco (fwcrm_vapid_privada, fwcrm_vapid_publica
// e fwcrm_push_segredo) e nascem sozinhas na primeira execução.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { enviarPush, paraBase64Url } from "./push.ts";

const URL_PROJETO = Deno.env.get("SUPABASE_URL")!;
const SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ASSUNTO = Deno.env.get("VAPID_ASSUNTO") ?? "mailto:fwengemar@gmail.com";

const banco = createClient(URL_PROJETO, SERVICO, { auth: { persistSession: false } });

const segredo = async (nome: string) => {
  const { data } = await banco.rpc("segredo_push", { nome });
  return (data as string | null) ?? "";
};

// As chaves VAPID nascem aqui, na primeira execução, e ficam no Vault. A
// pública também vai para push_config, que é o que o navegador lê para se
// inscrever. A privada nunca sai do Supabase.
async function chavesVapid() {
  const [privada, publica] = await Promise.all([
    segredo("fwcrm_vapid_privada"),
    segredo("fwcrm_vapid_publica"),
  ]);
  if (privada && publica) return { privada, publica, assunto: ASSUNTO };

  const par = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const nova = {
    publica: paraBase64Url(new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey))),
    privada: (await crypto.subtle.exportKey("jwk", par.privateKey)).d as string,
    assunto: ASSUNTO,
  };
  await banco.rpc("guardar_segredo_push", { nome: "fwcrm_vapid_privada", valor: nova.privada });
  await banco.rpc("guardar_segredo_push", { nome: "fwcrm_vapid_publica", valor: nova.publica });
  await banco.from("push_config").update({ chave_publica: nova.publica, atualizado_em: new Date().toISOString() }).eq("id", true);
  return nova;
}

// o que aparece na tela do celular, por tipo de aviso
function montar(n: Record<string, unknown>, autor: string | null) {
  const titulo = String(n.titulo ?? "Tarefa");
  const texto = n.texto ? String(n.texto) : "";
  if (n.tipo === "hora") return { titulo: "⏰ " + titulo, corpo: "A hora marcada chegou." };
  if (n.tipo === "atribuida") return { titulo: "Nova tarefa para você", corpo: titulo };
  if (n.tipo === "resposta") return { titulo: (autor || "Alguém") + " respondeu na tarefa", corpo: titulo + (texto ? " — " + texto.slice(0, 90) : "") };
  return { titulo: (autor || "Alguém") + " chamou você", corpo: titulo + (texto ? " — " + texto.slice(0, 90) : "") };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("método não suportado", { status: 405 });
  const esperado = await segredo("fwcrm_push_segredo");
  if (!esperado || req.headers.get("x-fwcrm-segredo") !== esperado) {
    return new Response("não autorizado", { status: 401 });
  }
  const VAPID = await chavesVapid();
  if (!VAPID.publica || !VAPID.privada) {
    return Response.json({ erro: "não consegui preparar as chaves VAPID" }, { status: 500 });
  }

  const { data: pendentes } = await banco
    .from("notificacoes")
    .select("id, perfil_id, autor_id, titulo, texto, tarefa_id, contrato_id, tipo")
    .is("enviada_em", null)
    .gt("criado_em", new Date(Date.now() - 2 * 3600 * 1000).toISOString())
    .order("criado_em")
    .limit(200);

  if (!pendentes?.length) return Response.json({ enviados: 0, pendentes: 0 });

  const perfis = [...new Set(pendentes.map((n) => n.perfil_id))];
  const [{ data: inscricoes }, { data: nomes }] = await Promise.all([
    banco.from("push_inscricoes").select("*").in("perfil_id", perfis),
    banco.from("perfis").select("id, nome"),
  ]);
  const nomeDe = (id: string | null) => nomes?.find((p) => p.id === id)?.nome ?? null;

  let enviados = 0;
  const mortas: string[] = [];
  const falhas: number[] = [];

  for (const n of pendentes) {
    const minhas = (inscricoes ?? []).filter((i) => i.perfil_id === n.perfil_id);
    const { titulo, corpo } = montar(n, nomeDe(n.autor_id as string));
    for (const i of minhas) {
      const r = await enviarPush(i, {
        titulo,
        corpo,
        // a mesma etiqueta do aviso que a aba aberta mostra: não duplica na tela
        tag: "fwcrm-" + (n.tarefa_id ?? n.id),
        url: n.tarefa_id ? "/?tarefa=" + n.tarefa_id : n.contrato_id ? "/?contrato=" + n.contrato_id : "/",
      }, VAPID);
      if (r.ok) enviados++;
      else { falhas.push(r.status); if (r.morta) mortas.push(i.endpoint); }
    }
  }

  // marca como enviadas mesmo sem inscrição: senão a fila cresce para sempre
  await banco.from("notificacoes").update({ enviada_em: new Date().toISOString() })
    .in("id", pendentes.map((n) => n.id));

  // aparelho que desinstalou ou limpou o site sai da lista
  if (mortas.length) await banco.from("push_inscricoes").delete().in("endpoint", mortas);

  // os códigos das falhas ajudam a ver de longe se é chave errada (401/403)
  // ou aparelho que sumiu (404/410)
  return Response.json({ avisos: pendentes.length, enviados, falhas, inscricoes_removidas: mortas.length });
});
